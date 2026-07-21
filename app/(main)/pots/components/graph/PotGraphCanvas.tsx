"use client";

// Neo4j-browser-style force graph for the pot ontology, rendered as plain SVG
// driven by d3-force. Flat category-coloured discs with a darker rim, captions
// wrapped inside the disc, relationship-type labels along the edges, and
// arrowheads at the target end. The SVG background stays transparent so the
// page's `pot-dots` texture shows through, exactly like the old WebGL canvas.
//
// Layout: hub-and-ring via a spanning-forest backbone. The OSS explorer's
// ring look is a property of its data — satellites there carry a single
// edge, so d3's default physics pins each one at link distance from its hub.
// A pot graph is dense (hundreds of nodes, ~6 edges each), and with six
// links tugging every node toward six different places all distances
// equalise into a hairball no matter the constants. So the simulation is fed
// a tree even though every edge still renders: each node picks ONE parent —
// the smallest neighbour that is still a clear hub (≥2× its degree), falling
// back to its nearest-bigger neighbour (adopting the *biggest* neighbour
// instead collapses the forest into a single star around the global
// maximum) — and only that link is stiff. Every other edge keeps ~zero
// strength: visible, but no pull.
//
// Each cluster is then laid out as a balloon tree: depth-d nodes share ring
// d around the cluster root, ring radii grow with each generation's seat
// demand, and every subtree owns an angular wedge so branches never cross.
// Cluster roots are circle-packed by their computed footprint so clusters
// never spawn entangled. The stiff backbone link pins each child at its
// seeded distance from its hub while local-only charge spreads ring-mates
// apart, so the composition settles into hubs wearing rings instead of a
// uniform-density soup.
//
// Rendering strategy: React owns the *structure* (which nodes/edges exist)
// and mounts each element once; everything per-frame or per-interaction is
// written straight into the DOM through element refs. That covers simulation
// ticks and pan/zoom (positions) but also selection emphasis, fades and
// label visibility — routing a click through React means reconciling every
// disc and edge (~1.3k memoised components) and repainting them together,
// which read as a visible blink on dense pots. A click now costs plain
// attribute writes and lets the CSS opacity transitions do the fading.
//
// Interactions
// - drag background / wheel: pan + zoom (double-click background re-fits)
// - drag node: reposition; the node stays pinned where you drop it (Neo4j
//   behaviour) and the simulation reflows around it
// - click node: select — its edges light up in their relationship colour and
//   everything outside the one-hop neighbourhood fades
// - click edge: select — the edge and its two endpoints light up
// - double-click node: expand neighbours
// - edges are neutral grey until a selection involves them (no hover effects)
// - a "+N" badge marks nodes with hidden neighbours (double-click reveals)

import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationNodeDatum,
} from "d3-force";

// Graph model handed over by PotGraphExplorer. Mirrors the shape the explorer
// used to build for reagraph so the data pipeline stays untouched.
export type PotGraphNode = {
  id: string;
  label: string;
  /** Ontology-category fill (grey for unloaded frontier stubs). */
  fill: string;
  data?: {
    frontier?: boolean;
    category?: string | null;
    labels?: string[];
    /** Loaded neighbours currently not rendered — drawn as a "+N" badge. */
    hiddenCount?: number;
  };
};

export type PotGraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  /** Relationship-type colour — only painted while the edge is highlighted. */
  fill: string;
  data?: { frontier?: boolean };
};

export type PotGraphCanvasProps = {
  nodes: PotGraphNode[];
  edges: PotGraphEdge[];
  /** Currently inspected node (drives selection halo + neighbourhood fade). */
  selectedId: string | null;
  /** Single click selects a node (opens the inspector). */
  onSelect: (entityKey: string | null) => void;
  /** Double click expands a node's neighborhood. */
  onExpand: (entityKey: string) => void;
  /** "auto" shows edge labels on selection/zoom; "all" shows every label. */
  labelType?: "auto" | "all";
  /** Match the pot theme's dark surface (chrome colours only). */
  dark?: boolean;
};

type SimNode = SimulationNodeDatum & {
  id: string;
  label: string;
  fill: string;
  frontier: boolean;
  r: number;
  degree: number;
  hidden: number;
  /** Caption geometry is fixed per data build, so it is computed once here. */
  fontSize: number;
  lines: string[];
};

type SimEdge = {
  id: string;
  source: SimNode;
  target: SimNode;
  label: string;
  fill: string;
  frontier: boolean;
  /** Perpendicular arc offset so parallel edges fan out instead of stacking. */
  bend: number;
  /** Stiff spanning-forest link (node → its hub); everything else is slack. */
  backbone: boolean;
  /** Rest length for the link force (ring radius for backbone links). */
  dist: number;
};

type ViewTransform = { k: number; x: number; y: number };

/** DOM handles for one edge so ticks/highlights can restyle it without React. */
type EdgeEls = {
  g: SVGGElement | null;
  path: SVGPathElement | null;
  loop: SVGCircleElement | null;
  arrow: SVGPathElement | null;
  hit: SVGPathElement | null;
  labelG: SVGGElement | null;
  labelText: SVGTextElement | null;
};

/** DOM handles for one node disc (group + always-mounted selection halo). */
type NodeEls = {
  g: SVGGElement | null;
  halo: SVGCircleElement | null;
};

const MIN_ZOOM = 0.12;
const MAX_ZOOM = 3;
/** Never fit-zoom past this — small graphs should not blow up to fill space. */
const FIT_MAX_ZOOM = 1.1;
/** Zoom level past which "auto" mode shows every relationship label. */
const LABEL_ZOOM = 1.05;
// Backbone physics: each node keeps one stiff link — to its hub — and all
// other edges go nearly slack. Rings form because a hub's satellites share
// the same rest length while charge spreads them around the rim.
const BACKBONE_STRENGTH = 0.9;
const CROSS_LINK_STRENGTH = 0.01;
const CROSS_LINK_DISTANCE = 520;
const CAPTION_FONT = 10;
const FRONTIER_CAPTION_FONT = 8.5;
const ARROW_LENGTH = 7;
const ARROW_HALF_WIDTH = 3;
const LOOP_R = 13;

// Chrome colours the theme tokens can't reach (SVG paints raw hex). Node fills
// always arrive per-element from the ontology palette; edges rest in neutral
// grey and only take their relationship colour while highlighted.
const CHROME = {
  light: {
    halo: "#fafcfb",
    caption: "#0f172a",
    captionOnFill: "#ffffff",
    edge: "#cbd5e1",
    edgeLabel: "#94a3b8",
  },
  dark: {
    halo: "#0b1516",
    caption: "#f2f7f5",
    captionOnFill: "#ffffff",
    edge: "#475569",
    edgeLabel: "#94a3b8",
  },
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Multiply an #rrggbb colour's channels (f < 1 darkens). */
function shadeHex(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return hex;
  const ch = (shift: number) =>
    clamp(Math.round(((n >> shift) & 0xff) * f), 0, 255);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

/** Perceived luminance (0-255) of an #rrggbb colour. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return 0;
  return (
    0.299 * ((n >> 16) & 0xff) + 0.587 * ((n >> 8) & 0xff) + 0.114 * (n & 0xff)
  );
}

// Greedy word-wrap for the caption inside a disc: up to `maxLines` lines of at
// most `maxChars` characters, breaking on whitespace/underscores/hyphens and
// hard-slicing tokens that still don't fit. The last line gets an ellipsis
// when the caption is cut short (Neo4j truncates the same way).
function wrapCaption(
  text: string,
  maxChars: number,
  maxLines: number,
): string[] {
  const words = text.split(/[\s_]+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (let word of words) {
    while (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }
      lines.push(word.slice(0, maxChars));
      word = word.slice(maxChars);
    }
    if (!word) continue;
    if (!current) current = word;
    else if (current.length + 1 + word.length <= maxChars)
      current += ` ${word}`;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    cut[maxLines - 1] =
      cut[maxLines - 1].slice(0, Math.max(1, maxChars - 1)) + "…";
    return cut;
  }
  return lines;
}

// ---- Edge geometry ----------------------------------------------------------

// One shared computation used both by the JSX render (initial attributes) and
// the per-tick imperative updater, so the two can never drift apart.
type EdgeGeo =
  | {
      loop: true;
      cx: number;
      cy: number;
      labelX: number;
      labelY: number;
      labelAngle: number;
    }
  | {
      loop: false;
      d: string;
      arrowD: string;
      labelX: number;
      labelY: number;
      labelAngle: number;
    };

function edgeGeometry(edge: SimEdge): EdgeGeo {
  const sx = edge.source.x ?? 0;
  const sy = edge.source.y ?? 0;
  const tx = edge.target.x ?? 0;
  const ty = edge.target.y ?? 0;

  if (edge.source.id === edge.target.id) {
    // Self-loop: a small circle hung off the node's top-right.
    const r = edge.source.r;
    const cx = sx + (r + LOOP_R) * 0.85;
    const cy = sy - (r + LOOP_R) * 0.85;
    return {
      loop: true,
      cx,
      cy,
      labelX: cx,
      labelY: cy - LOOP_R - 4,
      labelAngle: 0,
    };
  }

  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist;
  const ny = dx / dist;
  // Quadratic control point placed so the curve's midpoint sits `bend` off the
  // straight line between the discs.
  const cpx = (sx + tx) / 2 + nx * edge.bend * 2;
  const cpy = (sy + ty) / 2 + ny * edge.bend * 2;

  // Trim both ends back to the disc rims (plus arrow room at the target) along
  // the curve's local direction.
  const d0 = Math.hypot(cpx - sx, cpy - sy) || 1;
  const u0x = (cpx - sx) / d0;
  const u0y = (cpy - sy) / d0;
  const startX = sx + u0x * (edge.source.r + 1);
  const startY = sy + u0y * (edge.source.r + 1);

  const d1 = Math.hypot(tx - cpx, ty - cpy) || 1;
  const u1x = (tx - cpx) / d1;
  const u1y = (ty - cpy) / d1;
  const tipX = tx - u1x * (edge.target.r + 1);
  const tipY = ty - u1y * (edge.target.r + 1);
  const endX = tipX - u1x * ARROW_LENGTH;
  const endY = tipY - u1y * ARROW_LENGTH;

  const midX = 0.25 * startX + 0.5 * cpx + 0.25 * endX;
  const midY = 0.25 * startY + 0.5 * cpy + 0.25 * endY;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle > 90 || angle < -90) angle += 180;

  return {
    loop: false,
    d: `M ${startX} ${startY} Q ${cpx} ${cpy} ${endX} ${endY}`,
    arrowD: `M ${tipX} ${tipY} L ${endX + -u1y * ARROW_HALF_WIDTH} ${endY + u1x * ARROW_HALF_WIDTH} L ${endX + u1y * ARROW_HALF_WIDTH} ${endY - u1x * ARROW_HALF_WIDTH} Z`,
    labelX: midX,
    labelY: midY - 4,
    labelAngle: angle,
  };
}

export default function PotGraphCanvas({
  nodes,
  edges,
  selectedId,
  onSelect,
  onExpand,
  labelType = "auto",
  dark = false,
}: PotGraphCanvasProps) {
  const chrome = dark ? CHROME.dark : CHROME.light;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rootGRef = useRef<SVGGElement | null>(null);

  const simRef = useRef<Simulation<SimNode, SimEdge> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const simEdgesRef = useRef<SimEdge[]>([]);
  const sizeRef = useRef({ w: 0, h: 0 });
  const needsFitRef = useRef(true);
  /** Once the user pans/zooms/drags we stop auto-fitting on data changes. */
  const userMovedRef = useRef(false);

  // Element registries the tick/highlight updaters write through.
  const nodeElsRef = useRef(new Map<string, NodeEls>());
  const edgeElsRef = useRef(new Map<string, EdgeEls>());

  // Pan/zoom lives in a ref and is applied to the root <g> imperatively; even
  // the "zoomed in enough for edge labels" flip restyles through the
  // registries, so zooming never re-renders React either.
  const viewRef = useRef<ViewTransform>({ k: 1, x: 0, y: 0 });
  const labelsVisibleRef = useRef(false);

  // Bumped when the sim node/edge arrays are rebuilt so React re-renders the
  // element structure; positions never pass through state. Also gates the
  // first-paint fade-in of the settled composition.
  const [structureVersion, setStructureVersion] = useState(0);

  // Edge selection is canvas-local (there is no edge inspector); node
  // selection lives with the explorer via selectedId/onSelect.
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  // Edge whose hit area was under the pointer when the current press started;
  // resolved to a selection on release if the press never became a pan.
  const pendingEdgeRef = useRef<string | null>(null);

  // Latest-value mirrors so applyHighlight stays referentially stable while
  // always reading the current selection / theme / label mode.
  const selectedIdRef = useRef<string | null>(selectedId);
  const selectedEdgeIdRef = useRef<string | null>(null);
  const chromeRef = useRef(chrome);
  const labelTypeRef = useRef(labelType);

  useEffect(() => {
    if (selectedId) setSelectedEdgeId(null);
  }, [selectedId]);

  const dragRef = useRef<{
    node: SimNode;
    startX: number;
    startY: number;
    rect: DOMRect;
    moved: boolean;
  } | null>(null);
  const panRef = useRef<{
    startX: number;
    startY: number;
    ox: number;
    oy: number;
    moved: boolean;
  } | null>(null);

  // Selection emphasis, fades and label visibility written straight through
  // the element registries — the styling twin of applyPositions. Runs on
  // selection changes, label-zoom threshold crossings and after structure
  // rebuilds; never through a React re-render.
  const applyHighlight = useCallback(() => {
    const nodeId = selectedIdRef.current;
    const edgeId = selectedEdgeIdRef.current;
    const palette = chromeRef.current;

    const activeNodes = new Set<string>();
    const activeEdges = new Set<string>();
    if (nodeId) {
      activeNodes.add(nodeId);
      for (const e of simEdgesRef.current) {
        if (e.source.id === nodeId || e.target.id === nodeId) {
          activeEdges.add(e.id);
          activeNodes.add(e.source.id);
          activeNodes.add(e.target.id);
        }
      }
    } else if (edgeId) {
      const edge = simEdgesRef.current.find((e) => e.id === edgeId);
      if (edge) {
        activeEdges.add(edge.id);
        activeNodes.add(edge.source.id);
        activeNodes.add(edge.target.id);
      }
    }
    const hasFocus = nodeId !== null || activeEdges.size > 0;
    const labelsEverywhere =
      labelTypeRef.current === "all" || labelsVisibleRef.current;

    const edgeEls = edgeElsRef.current;
    for (const e of simEdgesRef.current) {
      const els = edgeEls.get(e.id);
      if (!els) continue;
      const emphasized = activeEdges.has(e.id);
      const stroke = emphasized ? e.fill : palette.edge;
      const width = emphasized ? "2.4" : "1.3";
      if (els.g) els.g.style.opacity = hasFocus && !emphasized ? "0.12" : "1";
      els.path?.setAttribute("stroke", stroke);
      els.path?.setAttribute("stroke-width", width);
      els.loop?.setAttribute("stroke", stroke);
      els.loop?.setAttribute("stroke-width", width);
      els.arrow?.setAttribute("fill", stroke);
      if (els.labelG)
        els.labelG.style.display = labelsEverywhere || emphasized ? "" : "none";
      els.labelText?.setAttribute(
        "fill",
        emphasized ? e.fill : palette.edgeLabel,
      );
    }

    const nodeEls = nodeElsRef.current;
    for (const n of simNodesRef.current) {
      const els = nodeEls.get(n.id);
      if (!els) continue;
      const selected = n.id === nodeId;
      const emphasized =
        nodeId === null && activeEdges.size > 0 && activeNodes.has(n.id);
      if (els.g)
        els.g.style.opacity = hasFocus && !activeNodes.has(n.id) ? "0.16" : "1";
      if (els.halo) {
        els.halo.style.display = selected || emphasized ? "" : "none";
        els.halo.setAttribute("opacity", selected ? "0.3" : "0.18");
      }
    }
  }, []);

  const applyView = useCallback(() => {
    const t = viewRef.current;
    rootGRef.current?.setAttribute(
      "transform",
      `translate(${t.x},${t.y}) scale(${t.k})`,
    );
    const labelsVisible = t.k >= LABEL_ZOOM;
    if (labelsVisible !== labelsVisibleRef.current) {
      labelsVisibleRef.current = labelsVisible;
      applyHighlight();
    }
  }, [applyHighlight]);

  /** Write current simulation positions straight into the DOM. */
  const applyPositions = useCallback(() => {
    const nodeEls = nodeElsRef.current;
    for (const n of simNodesRef.current) {
      nodeEls
        .get(n.id)
        ?.g?.setAttribute("transform", `translate(${n.x ?? 0},${n.y ?? 0})`);
    }
    const edgeEls = edgeElsRef.current;
    for (const e of simEdgesRef.current) {
      const els = edgeEls.get(e.id);
      if (!els) continue;
      const geo = edgeGeometry(e);
      if (geo.loop) {
        els.loop?.setAttribute("cx", String(geo.cx));
        els.loop?.setAttribute("cy", String(geo.cy));
      } else {
        els.path?.setAttribute("d", geo.d);
        els.hit?.setAttribute("d", geo.d);
        els.arrow?.setAttribute("d", geo.arrowD);
      }
      els.labelG?.setAttribute(
        "transform",
        `translate(${geo.labelX},${geo.labelY}) rotate(${geo.labelAngle})`,
      );
    }
  }, []);

  const fitToView = useCallback(() => {
    const { w, h } = sizeRef.current;
    const simNodes = simNodesRef.current;
    if (!w || !h || simNodes.length === 0) return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of simNodes) {
      minX = Math.min(minX, (n.x ?? 0) - n.r);
      maxX = Math.max(maxX, (n.x ?? 0) + n.r);
      minY = Math.min(minY, (n.y ?? 0) - n.r);
      maxY = Math.max(maxY, (n.y ?? 0) + n.r);
    }
    const pad = 48;
    const k = clamp(
      Math.min((w - pad * 2) / (maxX - minX), (h - pad * 2) / (maxY - minY)),
      MIN_ZOOM,
      FIT_MAX_ZOOM,
    );
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    viewRef.current = { k, x: w / 2 - k * cx, y: h / 2 - k * cy };
    needsFitRef.current = false;
    applyView();
  }, [applyView]);

  // ---- Simulation lifecycle -------------------------------------------------

  useEffect(() => {
    const prev = new Map(simNodesRef.current.map((n) => [n.id, n]));
    const firstBuild = prev.size === 0;

    const degree = new Map<string, number>();
    for (const e of edges) {
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    }

    const simNodes: SimNode[] = nodes.map((n) => {
      const old = prev.get(n.id);
      const frontier = Boolean(n.data?.frontier);
      const d = degree.get(n.id) ?? 0;
      // Hubs grow markedly bigger than satellites so the hierarchy reads at a
      // glance (Potpie-explorer style).
      const r = frontier ? 13 : clamp(16 + Math.sqrt(d) * 3.4, 16, 40);
      const fontSize = frontier ? FRONTIER_CAPTION_FONT : CAPTION_FONT;
      const maxChars = Math.max(3, Math.floor((r * 2 - 8) / (fontSize * 0.56)));
      return {
        id: n.id,
        label: n.label,
        fill: n.fill,
        frontier,
        r,
        degree: d,
        hidden: n.data?.hiddenCount ?? 0,
        fontSize,
        lines: wrapCaption(n.label, maxChars, r >= 24 ? 3 : 2),
        x: old?.x,
        y: old?.y,
        vx: old?.vx,
        vy: old?.vy,
        fx: old?.fx,
        fy: old?.fy,
      };
    });

    const byId = new Map(simNodes.map((n) => [n.id, n]));

    // ---- Spanning-forest backbone ------------------------------------------
    // Each node adopts its nearest-bigger neighbour as parent hub: of the
    // neighbours that strictly outrank it (higher degree, ids break ties),
    // the SMALLEST one wins. Ranks strictly climb along parent chains so the
    // forest is acyclic, and preferring the local hub over the global one is
    // what yields many rings — a mega-hub adjacent to everything would
    // otherwise adopt the whole graph as one giant ring. Local maxima become
    // cluster roots.
    const neighbours = new Map<string, Set<string>>();
    const addNeighbour = (a: string, b: string) => {
      let set = neighbours.get(a);
      if (!set) {
        set = new Set();
        neighbours.set(a, set);
      }
      set.add(b);
    };
    for (const e of edges) {
      if (e.source === e.target) continue;
      if (!byId.has(e.source) || !byId.has(e.target)) continue;
      addNeighbour(e.source, e.target);
      addNeighbour(e.target, e.source);
    }
    const outranks = (a: SimNode, b: SimNode) =>
      a.degree > b.degree || (a.degree === b.degree && a.id > b.id);
    // Prefer the smallest neighbour that is still a clear hub (≥2× degree):
    // pure nearest-bigger parenting lets near-peer intermediates steal
    // satellites into long chains, leaving even degree-60 hubs with a handful
    // of adopted children and no visible ring. Skipping to a decisively
    // bigger parent halves the tree depth and fills the rings back out.
    const parentOf = new Map<string, SimNode>();
    for (const n of simNodes) {
      let best: SimNode | undefined;
      let hub: SimNode | undefined;
      for (const id of neighbours.get(n.id) ?? []) {
        const m = byId.get(id)!;
        if (!outranks(m, n)) continue;
        if (!best || outranks(best, m)) best = m;
        if (m.degree >= 2 * n.degree && (!hub || outranks(hub, m))) hub = m;
      }
      const parent = hub ?? best;
      if (parent) parentOf.set(n.id, parent);
    }
    const childrenOf = new Map<string, SimNode[]>();
    parentOf.forEach((p, childId) => {
      const child = byId.get(childId)!;
      const arr = childrenOf.get(p.id);
      if (arr) arr.push(child);
      else childrenOf.set(p.id, [child]);
    });
    // ---- Radial-wedge cluster layout ---------------------------------------
    // Each cluster is a balloon tree around its root: depth-d nodes share
    // ring d, whose radius grows with that generation's total seat demand (a
    // crowded generation widens its ring) and never less than a minimum gap.
    // Every subtree owns an angular wedge — children split their parent's
    // wedge by leaf weight, floored so a disc never gets a sliver — which
    // keeps branches angularly separated by construction and makes growth
    // linear in depth. (Modelling each subtree as a circle to orbit around
    // explodes exponentially on the hub chains real pots produce.) Seats are
    // stored relative to the parent so rebuild newcomers bloom out of their
    // already-on-canvas parent.
    const seatOf = new Map<string, { dx: number; dy: number; dist: number }>();
    const clusterR = new Map<string, number>();
    const seatArc = (n: SimNode) => 2 * (n.r + 16);
    const roots = simNodes.filter((n) => !parentOf.has(n.id));
    for (const root of roots) {
      // Leaf weight per subtree (children precede parents in reverse order).
      const order = [root];
      for (let i = 0; i < order.length; i++)
        for (const k of childrenOf.get(order[i].id) ?? []) order.push(k);
      const weight = new Map<string, number>();
      for (let i = order.length - 1; i >= 0; i--) {
        const n = order[i];
        const kids = childrenOf.get(n.id);
        weight.set(
          n.id,
          kids?.length ? kids.reduce((s, k) => s + weight.get(k.id)!, 0) : 1,
        );
      }
      // Ring radii from per-depth seat demand.
      const levels: SimNode[][] = [[root]];
      const depthOf = new Map<string, number>([[root.id, 0]]);
      for (let d = 0; d < levels.length; d++) {
        for (const n of levels[d]) {
          for (const k of childrenOf.get(n.id) ?? []) {
            depthOf.set(k.id, d + 1);
            (levels[d + 1] ??= []).push(k);
          }
        }
      }
      const radius = [0];
      for (let d = 1; d < levels.length; d++) {
        const demand = levels[d].reduce((s, n) => s + seatArc(n), 0);
        const floor = d === 1 ? root.r + 78 : radius[d - 1] + 110;
        radius[d] = Math.max(floor, demand / (2 * Math.PI));
      }
      // Walk the wedges outward.
      let footprint = root.r;
      const wedgeOf = new Map<
        string,
        { x: number; y: number; a0: number; a1: number }
      >([[root.id, { x: 0, y: 0, a0: 0, a1: 2 * Math.PI }]]);
      const stack = [root];
      while (stack.length) {
        const p = stack.pop()!;
        const pw = wedgeOf.get(p.id)!;
        const kids = childrenOf.get(p.id);
        if (!kids?.length) continue;
        const wedge = pw.a1 - pw.a0;
        const ringR = radius[depthOf.get(kids[0].id)!];
        const spans = kids.map((k) =>
          Math.max(
            (wedge * weight.get(k.id)!) / weight.get(p.id)!,
            seatArc(k) / ringR,
          ),
        );
        const scale = wedge / spans.reduce((s, v) => s + v, 0);
        let a = pw.a0;
        kids.forEach((k, i) => {
          stack.push(k);
          const span = spans[i] * scale;
          const mid = a + span / 2;
          const x = Math.cos(mid) * ringR;
          const y = Math.sin(mid) * ringR;
          wedgeOf.set(k.id, { x, y, a0: a, a1: a + span });
          seatOf.set(k.id, {
            dx: x - pw.x,
            dy: y - pw.y,
            dist: Math.hypot(x - pw.x, y - pw.y),
          });
          footprint = Math.max(footprint, ringR + k.r);
          a += span;
        });
      }
      clusterR.set(root.id, footprint + 30);
    }
    roots.sort((a, b) => (clusterR.get(b.id) ?? 0) - (clusterR.get(a.id) ?? 0));

    // Circle-pack the cluster roots: biggest at the origin, each next one
    // walked along a spiral until it clears every footprint already placed —
    // the old fixed-pitch spiral seeded small clusters inside big ones and
    // the springs kept them entangled forever. Rebuilds keep existing
    // positions; only newcomers are packed.
    const placedRoots: { x: number; y: number; R: number }[] = [];
    roots.forEach((root, i) => {
      const R = clusterR.get(root.id) ?? root.r;
      if (root.x != null) {
        placedRoots.push({ x: root.x, y: root.y ?? 0, R });
        return;
      }
      let x = 0;
      let y = 0;
      if (placedRoots.length > 0) {
        const phase = i * 2.39996; // golden offset varies each cluster's approach
        for (let theta = 0.4; ; theta += Math.max(0.1, 70 / (24 * theta))) {
          const rc = 24 * theta;
          x = Math.cos(theta + phase) * rc;
          y = Math.sin(theta + phase) * rc;
          if (
            placedRoots.every((q) => Math.hypot(x - q.x, y - q.y) >= q.R + R + 90)
          )
            break;
        }
      }
      root.x = x;
      root.y = y;
      placedRoots.push({ x, y, R });
    });

    // Deterministic seeding: every newcomer lands exactly on its seat, so the
    // first paint is already rings-around-hubs and the simulation only has to
    // relax residual overlap.
    const queue = [...roots];
    while (queue.length) {
      const p = queue.shift()!;
      for (const k of childrenOf.get(p.id) ?? []) {
        queue.push(k);
        if (k.x == null) {
          const seat = seatOf.get(k.id);
          k.x = (p.x ?? 0) + (seat?.dx ?? 68);
          k.y = (p.y ?? 0) + (seat?.dy ?? 0);
        }
      }
    }

    // Fan parallel edges apart with alternating arc offsets. The canonical
    // (sorted-pair) orientation keeps an A→B / B→A pair mirrored.
    const pairCounts = new Map<string, PotGraphEdge[]>();
    for (const e of edges) {
      const key = [e.source, e.target].sort().join("|");
      const group = pairCounts.get(key);
      if (group) group.push(e);
      else pairCounts.set(key, [e]);
    }
    const bendFor = (e: PotGraphEdge) => {
      const key = [e.source, e.target].sort().join("|");
      const group = pairCounts.get(key)!;
      if (group.length === 1) return 0;
      const idx = group.indexOf(e);
      const spread = (idx - (group.length - 1) / 2) * 22;
      return e.source <= e.target ? spread : -spread;
    };

    // Exactly one stiff link per child even when parallel edges duplicate the
    // child↔parent pair — extra copies stay slack so strengths don't stack.
    const backboneClaimed = new Set<string>();
    const simEdges: SimEdge[] = edges
      .filter((e) => byId.has(e.source) && byId.has(e.target))
      .map((e) => {
        const s = byId.get(e.source)!;
        const t = byId.get(e.target)!;
        let child: SimNode | null = null;
        let hub: SimNode | null = null;
        if (parentOf.get(s.id)?.id === t.id) {
          child = s;
          hub = t;
        } else if (parentOf.get(t.id)?.id === s.id) {
          child = t;
          hub = s;
        }
        const backbone =
          child !== null && hub !== null && !backboneClaimed.has(child.id);
        if (backbone) backboneClaimed.add(child!.id);
        return {
          id: e.id,
          source: s,
          target: t,
          label: e.label,
          fill: e.fill,
          frontier: Boolean(e.data?.frontier),
          bend: bendFor(e),
          backbone,
          dist: backbone
            ? (seatOf.get(child!.id)?.dist ?? CROSS_LINK_DISTANCE)
            : CROSS_LINK_DISTANCE,
        };
      });

    simNodesRef.current = simNodes;
    simEdgesRef.current = simEdges;

    let sim = simRef.current;
    if (!sim) {
      sim = forceSimulation<SimNode>().on("tick", applyPositions);
      simRef.current = sim;
    }
    // Only the backbone is stiff — every satellite is pinned at its hub's
    // ring radius while the remaining edges pull almost nothing, so the tree
    // structure (not the dense edge soup) decides the layout. Hubs repel in
    // proportion to their ring size, pushing whole clusters apart; satellites
    // repel mildly, which is what spreads them evenly around the rim.
    // Collide keeps captioned discs from overlapping; forceCenter re-centres
    // the composition without squeezing it.
    sim
      .alphaDecay(simNodes.length > 160 ? 0.035 : 0.0228)
      .velocityDecay(0.42)
      .nodes(simNodes)
      .force(
        "link",
        forceLink<SimNode, SimEdge>(simEdges)
          .id((d) => d.id)
          .distance((l) => l.dist)
          .strength((l) =>
            l.backbone ? BACKBONE_STRENGTH : CROSS_LINK_STRENGTH,
          ),
      )
      .force(
        "charge",
        // distanceMax keeps repulsion local: satellites spread around their
        // own rim without distant clusters pumping the whole composition into
        // a uniform-density gas (which is what erased the ring structure).
        forceManyBody<SimNode>()
          .strength((n) => {
            const kids = childrenOf.get(n.id)?.length ?? 0;
            return kids > 0 ? Math.max(-1500, -(520 + kids * 36)) : -260;
          })
          .distanceMax(1400),
      )
      .force(
        "collide",
        forceCollide<SimNode>()
          .radius((d) => d.r + 10)
          .iterations(2),
      )
      .force("center", forceCenter<SimNode>(0, 0));

    if (firstBuild) {
      // Settle synchronously so the first paint is already composed, then let
      // a small residual alpha breathe the layout into place.
      sim.alpha(1);
      sim.tick(simNodes.length > 160 ? 110 : 180);
      needsFitRef.current = true;
      sim.alpha(0.06).restart();
    } else {
      sim.alpha(0.5).restart();
      if (!userMovedRef.current) needsFitRef.current = true;
    }
    if (needsFitRef.current) fitToView();
    setStructureVersion((v) => v + 1);
  }, [nodes, edges, fitToView, applyPositions]);

  // Restyle when the selection, theme or label mode changes — and after every
  // structure rebuild (structureVersion), because freshly mounted elements
  // carry neutral attributes. Layout effect so the styling lands before
  // paint: child registration also runs in layout effects, and React runs
  // children before parents, so the registries are complete here.
  useLayoutEffect(() => {
    void structureVersion;
    selectedIdRef.current = selectedId;
    selectedEdgeIdRef.current = selectedEdgeId;
    chromeRef.current = dark ? CHROME.dark : CHROME.light;
    labelTypeRef.current = labelType;
    applyHighlight();
  }, [
    selectedId,
    selectedEdgeId,
    labelType,
    dark,
    structureVersion,
    applyHighlight,
  ]);

  useEffect(
    () => () => {
      simRef.current?.stop();
    },
    [],
  );

  // Track container size; the first measurement triggers the pending fit.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      sizeRef.current = { w: cr.width, h: cr.height };
      if (needsFitRef.current) fitToView();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitToView]);

  // Wheel zoom around the cursor. React's synthetic onWheel is passive, so the
  // listener is attached manually to be able to preventDefault page scroll.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      userMovedRef.current = true;
      const rect = svg.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0016);
      const t = viewRef.current;
      const k = clamp(t.k * factor, MIN_ZOOM, MAX_ZOOM);
      const kr = k / t.k;
      viewRef.current = { k, x: px - (px - t.x) * kr, y: py - (py - t.y) * kr };
      applyView();
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [applyView]);

  // ---- Pointer interactions -------------------------------------------------

  const onNodePointerDown = useCallback(
    (node: SimNode, e: React.PointerEvent<SVGGElement>) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      dragRef.current = {
        node,
        startX: e.clientX,
        startY: e.clientY,
        rect,
        moved: false,
      };
    },
    [],
  );

  const onNodePointerMove = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (
        !drag.moved &&
        Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 4
      )
        return;
      if (!drag.moved) {
        drag.moved = true;
        userMovedRef.current = true;
        simRef.current?.alphaTarget(0.25).restart();
      }
      const t = viewRef.current;
      drag.node.fx = (e.clientX - drag.rect.left - t.x) / t.k;
      drag.node.fy = (e.clientY - drag.rect.top - t.y) / t.k;
    },
    [],
  );

  const onNodePointerUp = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
      simRef.current?.alphaTarget(0);
      // A press that never travelled is a click: select. A real drag leaves
      // fx/fy set so the node stays pinned where it was dropped.
      if (!drag.moved) onSelect(drag.node.id);
    },
    [onSelect],
  );

  /** An edge press registers a candidate; the background pointerup decides. */
  const onEdgePress = useCallback((id: string) => {
    pendingEdgeRef.current = id;
  }, []);

  const onBackgroundPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const t = viewRef.current;
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        ox: t.x,
        oy: t.y,
        moved: false,
      };
    },
    [],
  );

  const onBackgroundPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const pan = panRef.current;
      if (!pan) return;
      const dx = e.clientX - pan.startX;
      const dy = e.clientY - pan.startY;
      if (!pan.moved && Math.hypot(dx, dy) < 4) return;
      pan.moved = true;
      userMovedRef.current = true;
      viewRef.current = {
        ...viewRef.current,
        x: pan.ox + dx,
        y: pan.oy + dy,
      };
      applyView();
    },
    [applyView],
  );

  const onBackgroundPointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const pan = panRef.current;
      if (!pan) return;
      panRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
      if (!pan.moved) {
        // A stationary press that started on an edge hit-area selects that
        // edge; anywhere else it clears both selections.
        const candidate = pendingEdgeRef.current;
        setSelectedEdgeId(candidate);
        onSelect(null);
      }
      pendingEdgeRef.current = null;
    },
    [onSelect],
  );

  // ---- Element registries ---------------------------------------------------

  const registerNode = useCallback((id: string, els: NodeEls | null) => {
    if (els) nodeElsRef.current.set(id, els);
    else nodeElsRef.current.delete(id);
  }, []);

  const registerEdge = useCallback((id: string, els: EdgeEls | null) => {
    if (els) edgeElsRef.current.set(id, els);
    else edgeElsRef.current.delete(id);
  }, []);

  const view = viewRef.current;

  return (
    <div
      ref={containerRef}
      className="h-full w-full cursor-grab active:cursor-grabbing"
    >
      <svg
        ref={svgRef}
        className="h-full w-full select-none"
        // The first structure commit fades the pre-settled composition in
        // instead of popping a fully-formed graph onto the screen.
        style={{
          touchAction: "none",
          opacity: structureVersion > 0 ? 1 : 0,
          transition: "opacity 400ms ease",
        }}
        role="img"
        aria-label="Project knowledge graph"
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onBackgroundPointerMove}
        onPointerUp={onBackgroundPointerUp}
        onDoubleClick={fitToView}
      >
        <g
          ref={rootGRef}
          transform={`translate(${view.x},${view.y}) scale(${view.k})`}
        >
          <g>
            {simEdgesRef.current.map((edge) => (
              <EdgePath
                key={edge.id}
                edge={edge}
                halo={chrome.halo}
                muted={chrome.edge}
                mutedLabel={chrome.edgeLabel}
                register={registerEdge}
                onPress={onEdgePress}
              />
            ))}
          </g>
          <g>
            {simNodesRef.current.map((node) => (
              <NodeDisc
                key={node.id}
                node={node}
                captionFallback={chrome.caption}
                captionOnFill={chrome.captionOnFill}
                halo={chrome.halo}
                register={registerNode}
                onPointerDown={onNodePointerDown}
                onPointerMove={onNodePointerMove}
                onPointerUp={onNodePointerUp}
                onExpand={onExpand}
              />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}

// ---- Edge ------------------------------------------------------------------

// Renders with resting styles only (grey stroke, hidden label, full opacity);
// applyHighlight owns everything selection-dependent, so this memo never
// re-renders after mount unless the edge itself is rebuilt.
const EdgePath = memo(function EdgePath({
  edge,
  halo,
  muted,
  mutedLabel,
  register,
  onPress,
}: {
  edge: SimEdge;
  halo: string;
  /** Resting stroke — every edge is this grey until highlighted. */
  muted: string;
  mutedLabel: string;
  register: (id: string, els: EdgeEls | null) => void;
  onPress: (id: string) => void;
}) {
  // Stable record the ref callbacks write into; ticks read it via the registry.
  const els = useRef<EdgeEls>({
    g: null,
    path: null,
    loop: null,
    arrow: null,
    hit: null,
    labelG: null,
    labelText: null,
  }).current;

  // Layout effect (not passive): the canvas re-applies highlight styling in
  // its own layout effect right after a structure change, and children must
  // already be registered when it runs.
  useLayoutEffect(() => {
    register(edge.id, els);
    return () => register(edge.id, null);
  }, [edge.id, els, register]);

  const geo = edgeGeometry(edge);

  if (geo.loop) {
    return (
      <g
        ref={(el) => {
          els.g = el;
        }}
        className="transition-opacity duration-150"
      >
        <circle
          ref={(el) => {
            els.loop = el;
          }}
          cx={geo.cx}
          cy={geo.cy}
          r={LOOP_R}
          fill="none"
          stroke={muted}
          strokeWidth={1.3}
          className="cursor-pointer"
          onPointerDown={(e) => {
            if (e.button === 0) onPress(edge.id);
          }}
        />
        <EdgeLabel geo={geo} label={edge.label} fill={mutedLabel} halo={halo} els={els} />
      </g>
    );
  }

  return (
    <g
      ref={(el) => {
        els.g = el;
      }}
      className="transition-opacity duration-150"
    >
      <path
        ref={(el) => {
          els.path = el;
        }}
        d={geo.d}
        fill="none"
        stroke={muted}
        strokeWidth={1.3}
        strokeDasharray={edge.frontier ? "4 4" : undefined}
      />
      <path
        ref={(el) => {
          els.arrow = el;
        }}
        d={geo.arrowD}
        fill={muted}
      />
      {/* Fat invisible hit area so the thin edge is comfortably clickable. */}
      <path
        ref={(el) => {
          els.hit = el;
        }}
        d={geo.d}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        className="cursor-pointer"
        onPointerDown={(e) => {
          if (e.button === 0) onPress(edge.id);
        }}
      />
      <EdgeLabel geo={geo} label={edge.label} fill={mutedLabel} halo={halo} els={els} />
    </g>
  );
});

// Always mounted but hidden by default; applyHighlight flips `display` when
// the zoom, label mode or a selection wants the label visible. Keeping it in
// the DOM means showing a label never triggers a React mount.
function EdgeLabel({
  geo,
  label,
  fill,
  halo,
  els,
}: {
  geo: EdgeGeo;
  label: string;
  fill: string;
  halo: string;
  els: EdgeEls;
}) {
  return (
    <g
      ref={(el) => {
        els.labelG = el;
      }}
      transform={`translate(${geo.labelX},${geo.labelY}) rotate(${geo.labelAngle})`}
      style={{ display: "none" }}
      className="pointer-events-none"
    >
      <text
        ref={(el) => {
          els.labelText = el;
        }}
        textAnchor="middle"
        className="font-mono"
        fontSize={7.5}
        fill={fill}
        stroke={halo}
        strokeWidth={2.5}
        paintOrder="stroke"
      >
        {label}
      </text>
    </g>
  );
}

// ---- Node ------------------------------------------------------------------

// Renders with resting styles only; opacity fades and the selection halo are
// applied imperatively by applyHighlight, so clicks never reconcile discs.
const NodeDisc = memo(function NodeDisc({
  node,
  captionFallback,
  captionOnFill,
  halo,
  register,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onExpand,
}: {
  node: SimNode;
  captionFallback: string;
  captionOnFill: string;
  halo: string;
  register: (id: string, els: NodeEls | null) => void;
  onPointerDown: (node: SimNode, e: React.PointerEvent<SVGGElement>) => void;
  onPointerMove: (e: React.PointerEvent<SVGGElement>) => void;
  onPointerUp: (e: React.PointerEvent<SVGGElement>) => void;
  onExpand: (id: string) => void;
}) {
  const els = useRef<NodeEls>({ g: null, halo: null }).current;

  // Layout effect for the same reason as EdgePath: the canvas restyles in a
  // layout effect right after structure changes and needs the registry full.
  useLayoutEffect(() => {
    register(node.id, els);
    return () => register(node.id, null);
  }, [node.id, els, register]);

  const rim = shadeHex(node.fill, 0.76);
  // Light discs (frontier grey, amber…) need dark captions; saturated ones
  // carry white, exactly like Neo4j's caption contrast rule.
  const captionColor =
    luminance(node.fill) > 168 ? captionFallback : captionOnFill;

  const lineHeight = node.fontSize * 1.1;
  const firstDy = -((node.lines.length - 1) / 2) * lineHeight;
  const badgeOffset = node.r * 0.75;

  return (
    <g
      ref={(el) => {
        els.g = el;
      }}
      transform={`translate(${node.x ?? 0},${node.y ?? 0})`}
      className="cursor-pointer transition-opacity duration-150"
      onPointerDown={(e) => onPointerDown(node, e)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onExpand(node.id);
      }}
    >
      {/* Selection / edge-endpoint halo — applyHighlight toggles it. */}
      <circle
        ref={(el) => {
          els.halo = el;
        }}
        r={node.r + 7}
        fill={node.fill}
        opacity={0.3}
        style={{ display: "none" }}
      />
      <circle
        r={node.r}
        fill={node.fill}
        stroke={rim}
        strokeWidth={2}
        strokeDasharray={node.frontier ? "3.5 3" : undefined}
      />
      <text
        textAnchor="middle"
        fontSize={node.fontSize}
        fontWeight={600}
        fill={captionColor}
        className="pointer-events-none"
      >
        {node.lines.map((line, i) => (
          <tspan key={i} x={0} y={firstDy + i * lineHeight} dy="0.35em">
            {line}
          </tspan>
        ))}
      </text>
      {node.hidden > 0 ? (
        <g
          transform={`translate(${badgeOffset},${badgeOffset})`}
          className="pointer-events-none"
        >
          <circle r={8.5} fill={halo} stroke={rim} strokeWidth={1.25} />
          <text
            textAnchor="middle"
            dy="0.35em"
            fontSize={7.5}
            fontWeight={700}
            fill={captionFallback}
            className="font-mono"
          >
            +{node.hidden > 99 ? "99" : node.hidden}
          </text>
        </g>
      ) : null}
      <title>
        {node.hidden > 0
          ? `${node.label} — ${node.hidden} hidden neighbour${node.hidden === 1 ? "" : "s"} (double-click to reveal)`
          : node.label}
      </title>
    </g>
  );
});
