"use client";

// Neo4j-browser-style graph for the pot ontology, built to render EVERY loaded
// node efficiently: nodes are SVG (crisp captions, DOM hit-testing, CSS
// fades) while all edges are drawn on a single 2D <canvas> underneath. A
// dense pot (~800 nodes / ~2.4k edges) carries ~5k DOM elements instead of
// the ~20k a full-SVG scene needs, and pan/zoom repaints one canvas plus a
// much smaller vector layer.
//
// Layout is computed ONCE per structure change and then frozen. d3-force is
// used purely as a headless solver — synchronous ticks at build time, then
// discarded — so there is no live simulation, no post-settle animation and
// no reheat when data changes. Dragging a node simply moves it (and pins it
// there); its edges follow via a canvas repaint while the rest of the
// composition stays put.
//
// Layout shape: hub-and-ring via a spanning-forest backbone. A pot graph is
// dense (~6 edges per node), and with six links tugging every node toward six
// different places all distances equalise into a hairball no matter the
// constants. So the solver is fed a tree even though every edge still
// renders: each node picks ONE parent — the smallest neighbour that is still
// a clear hub (≥2× its degree), falling back to its nearest-bigger neighbour
// (adopting the *biggest* neighbour instead collapses the forest into a
// single star around the global maximum) — and only that link is stiff.
// Every other edge keeps ~zero strength: visible, but no pull.
//
// Each cluster is then laid out as a balloon tree: depth-d nodes share ring
// d around the cluster root, ring radii grow with each generation's seat
// demand, and every subtree owns an angular wedge so branches never cross.
// Cluster roots are circle-packed by their computed footprint so clusters
// never spawn entangled. The synchronous settle only relaxes residual
// overlap — the first (and only) paint is already rings-around-hubs.
//
// Rendering strategy
// - <canvas> (bottom): every edge — quadratic curves, arrowheads,
//   relationship labels, selection emphasis, frontier dashes — redrawn as a
//   whole on pan/zoom/selection. Redraws are rAF-batched and land in the
//   same frame as the SVG transform write, so the two layers never shear.
//   Edges outside the viewport are culled per draw.
// - <svg> (top): node discs only (disc + type icon + caption). React mounts
//   them once per structure; drag positions and selection styling are written
//   straight to the DOM through element refs, never via re-render. Icons and
//   captions hide below a zoom threshold where they would rasterise
//   unreadably small anyway.
// - Pan/zoom never repaints the node layer mid-gesture: the world transform
//   is only committed into the root <g> attribute (an SVG repaint of every
//   disc) at gesture end, while the live delta rides on a composited CSS
//   transform on the <svg> element itself — a pure GPU move. The svg bleeds
//   BLEED px beyond the container so a pan has real pixels to reveal, and
//   the raster is re-committed early if a gesture outruns the bleed or
//   scales far enough for layer blur to show. The canvas below always draws
//   at true resolution, so edges stay crisp even mid-zoom.
// - Edge hit-testing is analytic (distance to the sampled curve) on click —
//   no invisible fat hit paths in the DOM.
//
// Edge density: a dense pot's cross-links bury the composition, so by default
// (edgeMode "key") only the spanning-forest backbone — the same skeleton the
// layout is built around — plus frontier links is painted at rest. Every
// other edge stays data-only until a selection involves it: selecting a node
// paints ALL of its edges in their relationship colour. A small grey badge
// (bottom-left of the disc) counts a node's undrawn edges so the density is
// never silently hidden; edgeMode "all" paints everything all the time.
// Hidden edges are also skipped by click hit-testing.
//
// Interactions
// - drag background / wheel: pan + zoom (double-click background re-fits)
// - drag node: reposition; the node stays pinned where you drop it (Neo4j
//   behaviour); nothing else reflows
// - hover node: after a short dwell a floating card shows quick details
//   (name, type, category, connections, expand hints); any gesture hides it
// - click node: select — every one of its edges (including resting-hidden
//   ones) lights up in its relationship colour and everything outside the
//   one-hop neighbourhood fades
// - click edge: select — the edge and its two endpoints light up
// - double-click node: expand neighbours
// - edges are neutral grey until a selection involves them (no hover effects)
// - a "+N" badge marks nodes with hidden neighbours (double-click reveals);
//   a grey "N" badge counts edges not drawn at rest (click to show them)

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
  type SimulationNodeDatum,
} from "d3-force";
import type { LucideIcon } from "lucide-react";

import { GlassPanel } from "@/app/(main)/pots/components/kit";
import { cn } from "@/lib/utils";
import { categoryDisplay } from "./ontology";
import { iconForNode } from "./nodeIcons";

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
  data?: { frontier?: boolean; type?: string };
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
  /**
   * "key" (default) paints only the structural backbone at rest — a node's
   * remaining edges appear while it is selected, and a grey badge counts
   * them. "all" paints every edge all the time.
   */
  edgeMode?: "key" | "all";
  /** Match the pot theme's dark surface (chrome colours only). */
  dark?: boolean;
  /**
   * Live search emphasis: while non-null, nodes in the set stay lit and
   * everything else (and every edge not connecting two matches) fades.
   * Takes precedence over the selection fade.
   */
  searchIds?: Set<string> | null;
  /**
   * Animated centering request. A new nonce pans/zooms the view to the node;
   * if the node isn't in the current structure yet, the request stays pending
   * until the next rebuild delivers it.
   */
  focusRequest?: { id: string; nonce: number } | null;
};

type LayoutNode = SimulationNodeDatum & {
  id: string;
  label: string;
  fill: string;
  frontier: boolean;
  r: number;
  degree: number;
  hidden: number;
  /** Incident edges not drawn at rest in "key" mode — the grey badge count. */
  extraEdges: number;
  /** Caption geometry is fixed per data build, so it is computed once here. */
  fontSize: number;
  lines: string[];
  /** Ontology node labels + category — drive the type icon and hover card. */
  labels: string[];
  category: string | null;
  icon: LucideIcon;
};

type LayoutEdge = {
  id: string;
  source: LayoutNode;
  target: LayoutNode;
  label: string;
  fill: string;
  frontier: boolean;
  /** Perpendicular arc offset so parallel edges fan out instead of stacking. */
  bend: number;
  /** Stiff spanning-forest link (node → its hub); everything else is slack. */
  backbone: boolean;
  /** Painted with no selection in "key" mode (backbone + frontier links). */
  resting: boolean;
  /** Rest length for the link force (ring radius for backbone links). */
  dist: number;
};

type ViewTransform = { k: number; x: number; y: number };

/** DOM handles for one node disc (group, selection halo, edge-count hint). */
type NodeEls = {
  g: SVGGElement | null;
  halo: SVGCircleElement | null;
  hint: SVGGElement | null;
};

/** Hover card anchor: node + its screen-space centre/radius at hover time. */
type HoverState = { node: LayoutNode; x: number; y: number; rk: number };

const MIN_ZOOM = 0.12;
const MAX_ZOOM = 3;
/** Never fit-zoom past this — small graphs should not blow up to fill space. */
const FIT_MAX_ZOOM = 1.1;
/** Zoom level past which "auto" mode shows every relationship label. */
const LABEL_ZOOM = 1.05;
/** Below this zoom node captions rasterise unreadably small — hide them. */
const CAPTION_ZOOM = 0.4;
/** Extra px the node layer is rasterised beyond the container per side. */
const BLEED = 350;
/** Re-commit the raster once the composited layer scales past these. */
const RASTER_SCALE_MAX = 1.6;
const RASTER_SCALE_MIN = 0.625;
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
const EDGE_LABEL_FONT =
  '7.5px ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

// Chrome colours the theme tokens can't reach (canvas/SVG paint raw hex).
// Node fills always arrive per-element from the ontology palette; edges rest
// in neutral grey and only take their relationship colour while highlighted.
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

// One shared computation used by the canvas painter and the click hit-test,
// so the drawn curve and the clickable curve can never drift apart.
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
      sx: number;
      sy: number;
      cpx: number;
      cpy: number;
      ex: number;
      ey: number;
      tipX: number;
      tipY: number;
      /** Unit direction of the curve at the target end (for the arrowhead). */
      u1x: number;
      u1y: number;
      labelX: number;
      labelY: number;
      labelAngle: number;
    };

function edgeGeometry(edge: LayoutEdge): EdgeGeo {
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
    sx: startX,
    sy: startY,
    cpx,
    cpy,
    ex: endX,
    ey: endY,
    tipX,
    tipY,
    u1x,
    u1y,
    labelX: midX,
    labelY: midY - 4,
    labelAngle: angle,
  };
}

/** Squared-distance-free point-to-segment distance. */
function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq
    ? clamp(((px - ax) * dx + (py - ay) * dy) / lenSq, 0, 1)
    : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export default function PotGraphCanvas({
  nodes,
  edges,
  selectedId,
  onSelect,
  onExpand,
  labelType = "auto",
  edgeMode = "key",
  dark = false,
  searchIds = null,
  focusRequest = null,
}: PotGraphCanvasProps) {
  const chrome = dark ? CHROME.dark : CHROME.light;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rootGRef = useRef<SVGGElement | null>(null);

  const layoutNodesRef = useRef<LayoutNode[]>([]);
  const layoutEdgesRef = useRef<LayoutEdge[]>([]);
  const sizeRef = useRef({ w: 0, h: 0 });
  const needsFitRef = useRef(true);
  /** Once the user pans/zooms/drags we stop auto-fitting on data changes. */
  const userMovedRef = useRef(false);
  // Positions survive across structure rebuilds even for nodes that leave and
  // re-enter (type filters toggling off/on), so filtering never scrambles the
  // composition the user has learned.
  const posCacheRef = useRef(
    new Map<
      string,
      { x?: number; y?: number; fx?: number | null; fy?: number | null }
    >(),
  );

  // Element registry the drag/highlight updaters write through (nodes only —
  // edges have no DOM at all).
  const nodeElsRef = useRef(new Map<string, NodeEls>());

  // Pan/zoom lives in a ref; the canvas repaint is rAF-batched — rAF runs
  // before the next paint, so both layers land in the same frame.
  const viewRef = useRef<ViewTransform>({ k: 1, x: 0, y: 0 });
  /** View the root <g> attribute was last rasterised at (commitRaster). */
  const rasterRef = useRef<ViewTransform>({ k: 1, x: 0, y: 0 });
  const wheelCommitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captionsVisibleRef = useRef(true);

  // Bumped when the layout arrays are rebuilt so React re-renders the node
  // structure; positions are final by then and never pass through state. Also
  // gates the first-paint fade-in of the settled composition.
  const [structureVersion, setStructureVersion] = useState(0);

  // Edge selection is canvas-local (there is no edge inspector); node
  // selection lives with the explorer via selectedId/onSelect.
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Latest-value mirrors so the painters stay referentially stable while
  // always reading the current selection / theme / label mode.
  const selectedIdRef = useRef<string | null>(selectedId);
  const selectedEdgeIdRef = useRef<string | null>(null);
  const chromeRef = useRef(chrome);
  const labelTypeRef = useRef(labelType);
  const edgeModeRef = useRef(edgeMode);
  const searchRef = useRef<Set<string> | null>(null);
  // Render-phase mirror so the structure effect (which runs in the same
  // commit as a reveal-and-focus pick) can see the pending request and skip
  // the auto-fit that would otherwise fight the focus animation.
  const focusReqRef = useRef(focusRequest);
  focusReqRef.current = focusRequest;
  /** Nonce of the last focusRequest that actually ran. */
  const handledFocusRef = useRef(0);

  useEffect(() => {
    if (selectedId) setSelectedEdgeId(null);
  }, [selectedId]);

  const dragRef = useRef<{
    node: LayoutNode;
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

  // ---- Hover card -----------------------------------------------------------

  // Quick-details card for the disc under the cursor, shown after a short
  // dwell. Its position is captured once at show time; every gesture that
  // would move the anchor (pan, zoom, drag, focus animation) hides the card
  // instead, so it never has to track a live transform.
  const [hover, setHover] = useState<HoverState | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHover = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHover((h) => (h ? null : h));
  }, []);

  const onNodeHoverStart = useCallback((node: LayoutNode) => {
    if (dragRef.current || panRef.current) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      hoverTimerRef.current = null;
      if (dragRef.current || panRef.current) return;
      const t = viewRef.current;
      setHover({
        node,
        x: (node.x ?? 0) * t.k + t.x,
        y: (node.y ?? 0) * t.k + t.y,
        rk: node.r * t.k,
      });
    }, 180);
  }, []);

  useEffect(
    () => () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    },
    [],
  );

  // ---- Canvas edge painter --------------------------------------------------

  /**
   * Repaint every (visible) edge. Selection emphasis, fades, frontier dashes
   * and relationship labels are all decided here per draw, so a repaint is
   * the single answer to "anything edge-related changed".
   */
  const drawEdges = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { w, h } = sizeRef.current;
    if (!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const t = viewRef.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pw, ph);
    ctx.setTransform(dpr * t.k, 0, 0, dpr * t.k, dpr * t.x, dpr * t.y);

    // World-space viewport (padded) for culling.
    const pad = 80;
    const vx0 = -t.x / t.k - pad;
    const vy0 = -t.y / t.k - pad;
    const vx1 = (w - t.x) / t.k + pad;
    const vy1 = (h - t.y) / t.k + pad;

    // Selection emphasis: node selection lights its whole neighbourhood, edge
    // selection lights just that edge. An active search overrides both fades.
    const nodeId = selectedIdRef.current;
    const edgeId = selectedEdgeIdRef.current;
    const search = searchRef.current;
    const hasFocus = nodeId !== null || edgeId !== null;
    const palette = chromeRef.current;
    const drawAll = edgeModeRef.current === "all";
    const labelsEverywhere =
      labelTypeRef.current === "all" || t.k >= LABEL_ZOOM;

    ctx.lineJoin = "round";
    ctx.font = EDGE_LABEL_FONT;
    ctx.textAlign = "center";

    for (const e of layoutEdgesRef.current) {
      const emphasized =
        edgeId === e.id ||
        (nodeId !== null &&
          (e.source.id === nodeId || e.target.id === nodeId));
      // "key" mode: an edge outside the resting set only paints while a
      // selection involves it (before geometry — this is the hot skip).
      if (!drawAll && !e.resting && !emphasized) continue;

      const geo = edgeGeometry(e);

      if (geo.loop) {
        if (
          geo.cx + LOOP_R < vx0 ||
          geo.cx - LOOP_R > vx1 ||
          geo.cy + LOOP_R < vy0 ||
          geo.cy - LOOP_R > vy1
        )
          continue;
      } else {
        if (
          Math.max(geo.sx, geo.ex, geo.cpx) < vx0 ||
          Math.min(geo.sx, geo.ex, geo.cpx) > vx1 ||
          Math.max(geo.sy, geo.ey, geo.cpy) < vy0 ||
          Math.min(geo.sy, geo.ey, geo.cpy) > vy1
        )
          continue;
      }

      const stroke = emphasized ? e.fill : palette.edge;

      let alpha = 1;
      if (search) {
        alpha =
          search.has(e.source.id) && search.has(e.target.id) ? 1 : 0.06;
      } else if (hasFocus && !emphasized) {
        alpha = 0.12;
      }
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = emphasized ? 2.4 : 1.3;
      ctx.setLineDash(e.frontier ? [4, 4] : []);

      if (geo.loop) {
        ctx.beginPath();
        ctx.arc(geo.cx, geo.cy, LOOP_R, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(geo.sx, geo.sy);
        ctx.quadraticCurveTo(geo.cpx, geo.cpy, geo.ex, geo.ey);
        ctx.stroke();
        // Arrowhead at the target rim.
        ctx.setLineDash([]);
        ctx.fillStyle = stroke;
        ctx.beginPath();
        ctx.moveTo(geo.tipX, geo.tipY);
        ctx.lineTo(
          geo.ex - geo.u1y * ARROW_HALF_WIDTH,
          geo.ey + geo.u1x * ARROW_HALF_WIDTH,
        );
        ctx.lineTo(
          geo.ex + geo.u1y * ARROW_HALF_WIDTH,
          geo.ey - geo.u1x * ARROW_HALF_WIDTH,
        );
        ctx.closePath();
        ctx.fill();
      }

      // Skip label paint for near-invisible edges (search/selection fades).
      if ((labelsEverywhere || emphasized) && alpha > 0.5) {
        ctx.save();
        ctx.translate(geo.labelX, geo.labelY);
        ctx.rotate((geo.labelAngle * Math.PI) / 180);
        ctx.setLineDash([]);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = palette.halo;
        ctx.strokeText(e.label, 0, 0);
        ctx.fillStyle = emphasized ? e.fill : palette.edgeLabel;
        ctx.fillText(e.label, 0, 0);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }, []);

  const rafRef = useRef(0);
  const scheduleDraw = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      drawEdges();
    });
  }, [drawEdges]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // Reset so a remount (StrictMode dev double-mount) can schedule again.
      rafRef.current = 0;
    },
    [],
  );

  // ---- Node styling (imperative) --------------------------------------------

  // Selection emphasis and fades for the SVG node layer, written straight
  // through the element registry — a click never reconciles the discs. The
  // matching edge styling happens inside drawEdges, so this always schedules
  // a repaint too.
  const applyHighlight = useCallback(() => {
    const nodeId = selectedIdRef.current;
    const edgeId = selectedEdgeIdRef.current;
    const search = searchRef.current;

    const activeNodes = new Set<string>();
    let edgeSelected = false;
    if (nodeId) {
      activeNodes.add(nodeId);
      for (const e of layoutEdgesRef.current) {
        if (e.source.id === nodeId || e.target.id === nodeId) {
          activeNodes.add(e.source.id);
          activeNodes.add(e.target.id);
        }
      }
    } else if (edgeId) {
      const edge = layoutEdgesRef.current.find((e) => e.id === edgeId);
      if (edge) {
        edgeSelected = true;
        activeNodes.add(edge.source.id);
        activeNodes.add(edge.target.id);
      }
    }
    const hasFocus = nodeId !== null || edgeSelected;

    const nodeEls = nodeElsRef.current;
    for (const n of layoutNodesRef.current) {
      const els = nodeEls.get(n.id);
      if (!els) continue;
      const selected = n.id === nodeId;
      const emphasized = edgeSelected && activeNodes.has(n.id);
      if (els.g) {
        let opacity = "1";
        if (search) opacity = search.has(n.id) ? "1" : "0.12";
        else if (hasFocus && !activeNodes.has(n.id)) opacity = "0.16";
        els.g.style.opacity = opacity;
      }
      if (els.halo) {
        els.halo.style.display = selected || emphasized ? "" : "none";
        els.halo.setAttribute("opacity", selected ? "0.3" : "0.18");
      }
      // The selected node is showing every edge, so its hidden-edge count
      // would be a lie while the selection lasts.
      if (els.hint) els.hint.style.display = selected ? "none" : "";
    }
    scheduleDraw();
  }, [scheduleDraw]);

  // Caption level-of-detail: one attribute flip, CSS does the rest.
  const applyCaptionLod = useCallback(() => {
    const captionsVisible = viewRef.current.k >= CAPTION_ZOOM;
    if (captionsVisible !== captionsVisibleRef.current) {
      captionsVisibleRef.current = captionsVisible;
      svgRef.current?.setAttribute(
        "data-captions",
        captionsVisible ? "on" : "off",
      );
    }
  }, []);

  /**
   * Rasterise the node layer at the current view: bake the world transform
   * into the root <g> attribute (this is the expensive SVG repaint of every
   * disc) and clear the composited CSS delta. Runs at gesture end — never
   * per pan/zoom frame.
   */
  const commitRaster = useCallback(() => {
    const t = viewRef.current;
    rasterRef.current = { ...t };
    rootGRef.current?.setAttribute(
      "transform",
      `translate(${t.x + BLEED},${t.y + BLEED}) scale(${t.k})`,
    );
    const svg = svgRef.current;
    if (svg) svg.style.transform = "";
    applyCaptionLod();
    scheduleDraw();
  }, [applyCaptionLod, scheduleDraw]);

  /**
   * Live view update: express the delta between the current view and the
   * last raster as a CSS transform on the <svg> element — a composited GPU
   * move, no SVG repaint. Falls back to an immediate re-raster when the
   * gesture outruns the bleed margin or the layer scale would look mushy.
   */
  const applyView = useCallback(() => {
    const t = viewRef.current;
    const r = rasterRef.current;
    const s = t.k / r.k;
    // CSS transform (origin at the svg's top-left O = (-BLEED,-BLEED) in
    // container coords) mapping the rasterised layer onto the current view.
    // A rastered content point sits at c = w·r.k + r; the CSS transform
    // moves it to O + T + s·(c − O), and equating with the target w·t.k + t
    // gives T = t − s·r + (s−1)·O, i.e. minus (s−1)·BLEED on each axis.
    const tx = t.x - s * r.x - (s - 1) * BLEED;
    const ty = t.y - s * r.y - (s - 1) * BLEED;
    if (
      s > RASTER_SCALE_MAX ||
      s < RASTER_SCALE_MIN ||
      Math.abs(tx) > BLEED * 0.8 ||
      Math.abs(ty) > BLEED * 0.8
    ) {
      commitRaster();
      return;
    }
    const svg = svgRef.current;
    if (svg) svg.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    applyCaptionLod();
    scheduleDraw();
  }, [applyCaptionLod, commitRaster, scheduleDraw]);

  const fitToView = useCallback(() => {
    const { w, h } = sizeRef.current;
    const layoutNodes = layoutNodesRef.current;
    if (!w || !h || layoutNodes.length === 0) return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of layoutNodes) {
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
    commitRaster();
  }, [commitRaster]);

  // ---- Animated focus (search / details-sheet picks) ------------------------

  const focusAnimRef = useRef(0);
  const cancelFocusAnim = useCallback(() => {
    if (focusAnimRef.current) {
      cancelAnimationFrame(focusAnimRef.current);
      focusAnimRef.current = 0;
    }
  }, []);

  /** Ease the view to a target transform; any user gesture cancels it. */
  const animateViewTo = useCallback(
    (target: ViewTransform) => {
      cancelFocusAnim();
      clearHover();
      const from = { ...viewRef.current };
      const start = performance.now();
      const DURATION = 340;
      const step = (now: number) => {
        const u = clamp((now - start) / DURATION, 0, 1);
        const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
        viewRef.current = {
          k: from.k + (target.k - from.k) * e,
          x: from.x + (target.x - from.x) * e,
          y: from.y + (target.y - from.y) * e,
        };
        if (u < 1) {
          applyView();
          focusAnimRef.current = requestAnimationFrame(step);
        } else {
          focusAnimRef.current = 0;
          commitRaster();
        }
      };
      focusAnimRef.current = requestAnimationFrame(step);
    },
    [applyView, cancelFocusAnim, clearHover, commitRaster],
  );

  useEffect(() => cancelFocusAnim, [cancelFocusAnim]);

  // ---- Structure + one-shot layout ------------------------------------------

  useEffect(() => {
    // The rebuild replaces every LayoutNode object, so a visible hover card
    // would be anchored to a stale (possibly removed) node.
    clearHover();
    // Fold the outgoing structure's positions into the persistent cache so
    // nodes that leave (filters) and later return keep their spot.
    const cache = posCacheRef.current;
    for (const n of layoutNodesRef.current) {
      cache.set(n.id, { x: n.x, y: n.y, fx: n.fx, fy: n.fy });
    }
    const firstBuild = cache.size === 0;

    const degree = new Map<string, number>();
    for (const e of edges) {
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    }

    const layoutNodes: LayoutNode[] = nodes.map((n) => {
      const old = cache.get(n.id);
      const frontier = Boolean(n.data?.frontier);
      const d = degree.get(n.id) ?? 0;
      // Hubs grow markedly bigger than satellites so the hierarchy reads at a
      // glance (Potpie-explorer style).
      const r = frontier ? 13 : clamp(16 + Math.sqrt(d) * 3.4, 16, 40);
      const fontSize = frontier ? FRONTIER_CAPTION_FONT : CAPTION_FONT;
      const maxChars = Math.max(3, Math.floor((r * 2 - 8) / (fontSize * 0.56)));
      const labels = n.data?.labels ?? [];
      const category = n.data?.category ?? null;
      return {
        id: n.id,
        label: n.label,
        fill: n.fill,
        frontier,
        r,
        degree: d,
        hidden: n.data?.hiddenCount ?? 0,
        extraEdges: 0,
        fontSize,
        // One line fewer than the icon-less layout used: the type icon now
        // owns the top of the disc and the hover card carries the full name.
        // Every connected node (r ≥ 19) keeps two lines; only degree-0 discs
        // and frontier stubs are too small for icon + two lines.
        lines: wrapCaption(n.label, maxChars, r >= 19 ? 2 : 1),
        labels,
        category,
        icon: iconForNode(labels, category),
        x: old?.x,
        y: old?.y,
        fx: old?.fx ?? undefined,
        fy: old?.fy ?? undefined,
      };
    });

    const byId = new Map(layoutNodes.map((n) => [n.id, n]));

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
    const outranks = (a: LayoutNode, b: LayoutNode) =>
      a.degree > b.degree || (a.degree === b.degree && a.id > b.id);
    // Prefer the smallest neighbour that is still a clear hub (≥2× degree):
    // pure nearest-bigger parenting lets near-peer intermediates steal
    // satellites into long chains, leaving even degree-60 hubs with a handful
    // of adopted children and no visible ring. Skipping to a decisively
    // bigger parent halves the tree depth and fills the rings back out.
    const parentOf = new Map<string, LayoutNode>();
    for (const n of layoutNodes) {
      let best: LayoutNode | undefined;
      let hub: LayoutNode | undefined;
      for (const id of neighbours.get(n.id) ?? []) {
        const m = byId.get(id)!;
        if (!outranks(m, n)) continue;
        if (!best || outranks(best, m)) best = m;
        if (m.degree >= 2 * n.degree && (!hub || outranks(hub, m))) hub = m;
      }
      const parent = hub ?? best;
      if (parent) parentOf.set(n.id, parent);
    }
    const childrenOf = new Map<string, LayoutNode[]>();
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
    const seatArc = (n: LayoutNode) => 2 * (n.r + 16);
    const roots = layoutNodes.filter((n) => !parentOf.has(n.id));
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
      const levels: LayoutNode[][] = [[root]];
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
    // a fixed-pitch spiral would seed small clusters inside big ones.
    // Rebuilds keep existing positions; only newcomers are packed.
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
    // pre-settle composition is already rings-around-hubs and the synchronous
    // solve only has to relax residual overlap.
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
    const layoutEdges: LayoutEdge[] = edges
      .filter((e) => byId.has(e.source) && byId.has(e.target))
      .map((e) => {
        const s = byId.get(e.source)!;
        const t = byId.get(e.target)!;
        let child: LayoutNode | null = null;
        let hub: LayoutNode | null = null;
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
        const frontier = Boolean(e.data?.frontier);
        return {
          id: e.id,
          source: s,
          target: t,
          label: e.label,
          fill: e.fill,
          frontier,
          bend: bendFor(e),
          backbone,
          // Frontier links always paint — they only exist because the user
          // expanded that node, so hiding them would undo the gesture.
          resting: backbone || frontier,
          dist: backbone
            ? (seatOf.get(child!.id)?.dist ?? CROSS_LINK_DISTANCE)
            : CROSS_LINK_DISTANCE,
        };
      });

    // Resting coverage: a childless local maximum has no backbone edge at all
    // (no parent, and no neighbour adopted it), which would strand it looking
    // disconnected while edges exist. Give every such node its strongest link
    // — the edge to its highest-degree neighbour — as a resting edge.
    const restingTouched = new Set<string>();
    const looseIncident = new Map<string, LayoutEdge[]>();
    for (const e of layoutEdges) {
      if (e.resting) {
        restingTouched.add(e.source.id);
        restingTouched.add(e.target.id);
      } else if (e.source.id !== e.target.id) {
        for (const end of [e.source.id, e.target.id]) {
          const arr = looseIncident.get(end);
          if (arr) arr.push(e);
          else looseIncident.set(end, [e]);
        }
      }
    }
    for (const n of layoutNodes) {
      if (restingTouched.has(n.id)) continue;
      const candidates = looseIncident.get(n.id);
      if (!candidates?.length) continue;
      let best = candidates[0];
      let bestDegree = -1;
      for (const e of candidates) {
        const other = e.source.id === n.id ? e.target : e.source;
        if (other.degree > bestDegree) {
          bestDegree = other.degree;
          best = e;
        }
      }
      best.resting = true;
      restingTouched.add(best.source.id);
      restingTouched.add(best.target.id);
    }
    // The grey per-node hint counts what "key" mode keeps hidden at rest
    // (self-loops count once — they belong to a single disc).
    for (const e of layoutEdges) {
      if (e.resting) continue;
      e.source.extraEdges += 1;
      if (e.target.id !== e.source.id) e.target.extraEdges += 1;
    }

    layoutNodesRef.current = layoutNodes;
    layoutEdgesRef.current = layoutEdges;

    // One-shot headless solve: same force recipe as the old live simulation —
    // only the backbone is stiff, hubs repel in proportion to their ring
    // size, collide keeps captioned discs apart — but run synchronously via
    // tick() and then discarded. Positions are frozen after this; nothing
    // ever animates or reheats. Rebuilds solve from a lower alpha so the
    // existing composition shifts as little as possible while newcomers
    // settle in. User-pinned nodes (fx/fy from drags) stay pinned.
    const solver = forceSimulation<LayoutNode>(layoutNodes)
      .stop()
      .alphaDecay(layoutNodes.length > 160 ? 0.035 : 0.0228)
      .velocityDecay(0.42)
      .force(
        "link",
        forceLink<LayoutNode, LayoutEdge>(layoutEdges)
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
        forceManyBody<LayoutNode>()
          .strength((n) => {
            const kids = childrenOf.get(n.id)?.length ?? 0;
            return kids > 0 ? Math.max(-1500, -(520 + kids * 36)) : -260;
          })
          .distanceMax(1400),
      )
      .force(
        "collide",
        forceCollide<LayoutNode>()
          .radius((d) => d.r + 10)
          .iterations(2),
      )
      .force("center", forceCenter<LayoutNode>(0, 0));
    if (firstBuild) {
      solver.tick(layoutNodes.length > 160 ? 130 : 200);
    } else {
      solver.alpha(0.5);
      solver.tick(60);
    }
    // Drop the solver's internal handles so nothing keeps ticking state alive.
    solver.force("link", null).force("charge", null).force("collide", null);

    if (firstBuild) needsFitRef.current = true;
    else if (!userMovedRef.current) needsFitRef.current = true;
    // A pending focus request owns the camera: skip the auto-fit so the
    // reveal-and-focus pick animates straight to its node instead of
    // refitting the whole graph first.
    if (
      focusReqRef.current &&
      focusReqRef.current.nonce !== handledFocusRef.current
    ) {
      needsFitRef.current = false;
    }
    if (needsFitRef.current) fitToView();
    setStructureVersion((v) => v + 1);
  }, [nodes, edges, fitToView, clearHover]);

  // Run (or retry) a pending focus request. structureVersion is a dependency
  // because a pick can target a node that only exists after the rebuild the
  // same commit triggers.
  useEffect(() => {
    const req = focusRequest;
    if (!req || req.nonce === handledFocusRef.current) return;
    const node = layoutNodesRef.current.find((n) => n.id === req.id);
    if (!node) return; // not in the structure yet — the rebuild re-runs this
    const { w, h } = sizeRef.current;
    if (!w || !h) return;
    handledFocusRef.current = req.nonce;
    userMovedRef.current = true;
    needsFitRef.current = false;
    // Zoom in to a readable level when far out, never zoom out.
    const k = clamp(Math.max(viewRef.current.k, 0.9), MIN_ZOOM, MAX_ZOOM);
    animateViewTo({
      k,
      x: w / 2 - k * (node.x ?? 0),
      y: h / 2 - k * (node.y ?? 0),
    });
  }, [focusRequest, structureVersion, animateViewTo]);

  // Restyle when the selection, theme or label mode changes — and after every
  // structure rebuild (structureVersion), because freshly mounted elements
  // carry neutral attributes. Layout effect so the styling lands before
  // paint: child registration also runs in layout effects, and React runs
  // children before parents, so the registry is complete here.
  useLayoutEffect(() => {
    void structureVersion;
    selectedIdRef.current = selectedId;
    selectedEdgeIdRef.current = selectedEdgeId;
    chromeRef.current = dark ? CHROME.dark : CHROME.light;
    labelTypeRef.current = labelType;
    edgeModeRef.current = edgeMode;
    searchRef.current = searchIds ?? null;
    applyHighlight();
  }, [
    selectedId,
    selectedEdgeId,
    labelType,
    edgeMode,
    dark,
    searchIds,
    structureVersion,
    applyHighlight,
  ]);

  // Track container size; the first measurement triggers the pending fit.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      sizeRef.current = { w: cr.width, h: cr.height };
      if (needsFitRef.current) fitToView();
      else scheduleDraw();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitToView, scheduleDraw]);

  // Wheel zoom around the cursor. React's synthetic onWheel is passive, so the
  // listener is attached manually to be able to preventDefault page scroll.
  // Each event only moves the composited layer; the raster is re-committed
  // (crisp discs) shortly after the wheel goes quiet.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelFocusAnim();
      clearHover();
      userMovedRef.current = true;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0016);
      const t = viewRef.current;
      const k = clamp(t.k * factor, MIN_ZOOM, MAX_ZOOM);
      const kr = k / t.k;
      viewRef.current = { k, x: px - (px - t.x) * kr, y: py - (py - t.y) * kr };
      applyView();
      if (wheelCommitRef.current) clearTimeout(wheelCommitRef.current);
      wheelCommitRef.current = setTimeout(commitRaster, 160);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      svg.removeEventListener("wheel", onWheel);
      if (wheelCommitRef.current) clearTimeout(wheelCommitRef.current);
    };
  }, [applyView, commitRaster, cancelFocusAnim, clearHover]);

  // ---- Edge hit-testing -----------------------------------------------------

  /**
   * Nearest edge within a click-tolerance of the world point, or null. The
   * curve is sampled into segments — 2.4k edges × a dozen distance checks is
   * far below a millisecond, and it only runs on click.
   */
  const hitTestEdge = useCallback((wx: number, wy: number): string | null => {
    const k = viewRef.current.k;
    // Constant *screen* tolerance (~10px) regardless of zoom.
    const tolerance = Math.max(9, 10 / k);
    // Mirror the draw-time visibility: an edge "key" mode isn't painting
    // (not resting, not part of the current selection) is not clickable.
    const nodeId = selectedIdRef.current;
    const edgeId = selectedEdgeIdRef.current;
    const drawAll = edgeModeRef.current === "all";
    let best: string | null = null;
    let bestD = tolerance;
    for (const e of layoutEdgesRef.current) {
      if (
        !drawAll &&
        !e.resting &&
        e.id !== edgeId &&
        !(
          nodeId !== null &&
          (e.source.id === nodeId || e.target.id === nodeId)
        )
      )
        continue;
      const geo = edgeGeometry(e);
      if (geo.loop) {
        const d = Math.abs(Math.hypot(wx - geo.cx, wy - geo.cy) - LOOP_R);
        if (d < bestD) {
          bestD = d;
          best = e.id;
        }
        continue;
      }
      if (
        wx < Math.min(geo.sx, geo.ex, geo.cpx) - tolerance ||
        wx > Math.max(geo.sx, geo.ex, geo.cpx) + tolerance ||
        wy < Math.min(geo.sy, geo.ey, geo.cpy) - tolerance ||
        wy > Math.max(geo.sy, geo.ey, geo.cpy) + tolerance
      )
        continue;
      let ax = geo.sx;
      let ay = geo.sy;
      const SAMPLES = 12;
      for (let i = 1; i <= SAMPLES; i++) {
        const s = i / SAMPLES;
        const u = 1 - s;
        const bx = u * u * geo.sx + 2 * u * s * geo.cpx + s * s * geo.ex;
        const by = u * u * geo.sy + 2 * u * s * geo.cpy + s * s * geo.ey;
        const d = distToSegment(wx, wy, ax, ay, bx, by);
        if (d < bestD) {
          bestD = d;
          best = e.id;
        }
        ax = bx;
        ay = by;
      }
    }
    return best;
  }, []);

  // ---- Pointer interactions -------------------------------------------------

  const onNodePointerDown = useCallback(
    (node: LayoutNode, e: React.PointerEvent<SVGGElement>) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      cancelFocusAnim();
      clearHover();
      e.currentTarget.setPointerCapture(e.pointerId);
      // Container rect, not the svg's — the svg bleeds past the container
      // and rides a CSS transform during gestures.
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      dragRef.current = {
        node,
        startX: e.clientX,
        startY: e.clientY,
        rect,
        moved: false,
      };
    },
    [cancelFocusAnim, clearHover],
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
      drag.moved = true;
      userMovedRef.current = true;
      const t = viewRef.current;
      const x = (e.clientX - drag.rect.left - t.x) / t.k;
      const y = (e.clientY - drag.rect.top - t.y) / t.k;
      // Move the node and pin it (fx/fy survive future rebuild solves).
      drag.node.x = x;
      drag.node.y = y;
      drag.node.fx = x;
      drag.node.fy = y;
      nodeElsRef.current
        .get(drag.node.id)
        ?.g?.setAttribute("transform", `translate(${x},${y})`);
      scheduleDraw();
    },
    [scheduleDraw],
  );

  const onNodePointerUp = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
      // A press that never travelled is a click: select. A real drag leaves
      // fx/fy set so the node stays pinned where it was dropped.
      if (!drag.moved) onSelect(drag.node.id);
    },
    [onSelect],
  );

  const onBackgroundPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      cancelFocusAnim();
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
    [cancelFocusAnim],
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
        // A stationary press selects the edge under the cursor (analytic
        // hit-test — edges have no DOM), or clears both selections.
        const rect = containerRef.current?.getBoundingClientRect();
        const t = viewRef.current;
        const hit = rect
          ? hitTestEdge(
              (e.clientX - rect.left - t.x) / t.k,
              (e.clientY - rect.top - t.y) / t.k,
            )
          : null;
        setSelectedEdgeId(hit);
        onSelect(null);
      } else {
        // Gesture over: bake the pan into the node-layer raster.
        commitRaster();
      }
    },
    [onSelect, hitTestEdge, commitRaster],
  );

  // ---- Element registry -----------------------------------------------------

  const registerNode = useCallback((id: string, els: NodeEls | null) => {
    if (els) nodeElsRef.current.set(id, els);
    else nodeElsRef.current.delete(id);
  }, []);

  const raster = rasterRef.current;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full cursor-grab active:cursor-grabbing"
      // The first structure commit fades the pre-settled composition in
      // instead of popping a fully-formed graph onto the screen.
      style={{
        opacity: structureVersion > 0 ? 1 : 0,
        transition: "opacity 400ms ease",
      }}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      />
      <svg
        ref={svgRef}
        className="absolute select-none"
        // Bled past the container so mid-gesture CSS pans reveal real pixels
        // instead of a clipped void; willChange keeps the layer composited.
        // Width/height are explicit because an abs-positioned replaced
        // element won't stretch between opposing insets — it collapses to
        // its intrinsic 300x150 instead.
        style={{
          top: -BLEED,
          left: -BLEED,
          width: `calc(100% + ${BLEED * 2}px)`,
          height: `calc(100% + ${BLEED * 2}px)`,
          touchAction: "none",
          transformOrigin: "0 0",
          willChange: "transform",
        }}
        data-captions={captionsVisibleRef.current ? "on" : "off"}
        data-edgehints={edgeMode === "all" ? "off" : "on"}
        role="img"
        aria-label="Project knowledge graph"
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onBackgroundPointerMove}
        onPointerUp={onBackgroundPointerUp}
        onDoubleClick={fitToView}
      >
        <g
          ref={rootGRef}
          transform={`translate(${raster.x + BLEED},${raster.y + BLEED}) scale(${raster.k})`}
        >
          {layoutNodesRef.current.map((node) => (
            <NodeDisc
              key={node.id}
              node={node}
              captionFallback={chrome.caption}
              captionOnFill={chrome.captionOnFill}
              halo={chrome.halo}
              edgeChrome={chrome.edge}
              register={registerNode}
              onPointerDown={onNodePointerDown}
              onPointerMove={onNodePointerMove}
              onPointerUp={onNodePointerUp}
              onExpand={onExpand}
              onHoverStart={onNodeHoverStart}
              onHoverEnd={clearHover}
            />
          ))}
        </g>
      </svg>
      {hover ? (
        // Keyed by node so moving between discs re-runs the entry animation.
        <NodeHoverCard
          key={hover.node.id}
          hover={hover}
          containerW={sizeRef.current.w}
          edgeMode={edgeMode}
        />
      ) : null}
      <style>{`
        svg[data-captions="off"] .gc-caption { display: none; }
        svg[data-captions="off"] .gc-edgehint { display: none; }
        svg[data-edgehints="off"] .gc-edgehint { display: none; }
      `}</style>
    </div>
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
  edgeChrome,
  register,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onExpand,
  onHoverStart,
  onHoverEnd,
}: {
  node: LayoutNode;
  captionFallback: string;
  captionOnFill: string;
  halo: string;
  /** Resting edge grey — strokes the hidden-edge hint badge. */
  edgeChrome: string;
  register: (id: string, els: NodeEls | null) => void;
  onPointerDown: (node: LayoutNode, e: React.PointerEvent<SVGGElement>) => void;
  onPointerMove: (e: React.PointerEvent<SVGGElement>) => void;
  onPointerUp: (e: React.PointerEvent<SVGGElement>) => void;
  onExpand: (id: string) => void;
  onHoverStart: (node: LayoutNode) => void;
  onHoverEnd: () => void;
}) {
  const els = useRef<NodeEls>({ g: null, halo: null, hint: null }).current;

  // Layout effect: the canvas restyles in a layout effect right after
  // structure changes and needs the registry full by then.
  useLayoutEffect(() => {
    register(node.id, els);
    return () => register(node.id, null);
  }, [node.id, els, register]);

  const rim = shadeHex(node.fill, 0.76);
  // Light discs (frontier grey, amber…) need dark captions; saturated ones
  // carry white, exactly like Neo4j's caption contrast rule.
  const captionColor =
    luminance(node.fill) > 168 ? captionFallback : captionOnFill;

  // Type icon above the caption, the pair centred as one block in the disc.
  const TypeIcon = node.icon;
  const iconSize = node.frontier ? 9 : clamp(Math.round(node.r * 0.5), 10, 18);
  const iconGap = node.frontier ? 1 : 1.5;
  const lineHeight = node.fontSize * 1.1;
  const contentTop =
    -(iconSize + iconGap + node.lines.length * lineHeight) / 2;
  const firstDy = contentTop + iconSize + iconGap + lineHeight / 2;
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
      onPointerEnter={() => onHoverStart(node)}
      onPointerLeave={onHoverEnd}
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
      {/* gc-caption: hides with the captions below the readability zoom. */}
      <TypeIcon
        x={-iconSize / 2}
        y={contentTop}
        width={iconSize}
        height={iconSize}
        strokeWidth={2.25}
        color={captionColor}
        aria-hidden
        className="gc-caption pointer-events-none"
      />
      <text
        textAnchor="middle"
        fontSize={node.fontSize}
        fontWeight={600}
        fill={captionColor}
        className="gc-caption pointer-events-none"
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
      {/* Grey twin of the neighbour badge: edges "key" mode isn't drawing.
          applyHighlight hides it while this node is selected; CSS hides it in
          "all" mode and below caption zoom. */}
      {node.extraEdges > 0 ? (
        <g
          ref={(el) => {
            els.hint = el;
          }}
          transform={`translate(${-badgeOffset},${badgeOffset})`}
          className="gc-edgehint pointer-events-none"
        >
          <circle r={8} fill={halo} stroke={edgeChrome} strokeWidth={1.25} />
          <text
            textAnchor="middle"
            dy="0.35em"
            fontSize={7}
            fontWeight={600}
            fill={captionFallback}
            opacity={0.75}
            className="font-mono"
          >
            {node.extraEdges > 99 ? "99+" : node.extraEdges}
          </text>
        </g>
      ) : null}
    </g>
  );
});

// ---- Hover card --------------------------------------------------------------

// Floating quick-details card anchored to the hovered disc. Pure HTML over
// the canvas (same GlassPanel chrome as the rest of the graph overlays), so
// the pot theme tokens style it on both surfaces. pointer-events-none keeps
// it from ever stealing the hover it describes.
function NodeHoverCard({
  hover,
  containerW,
  edgeMode,
}: {
  hover: HoverState;
  containerW: number;
  edgeMode: "key" | "all";
}) {
  const { node, x, y, rk } = hover;
  const meta = categoryDisplay(node.category);
  const TypeIcon = node.icon;

  // Above the disc by default; below when there's no headroom, and never
  // hard against the container's left/right edge.
  const below = y - rk < 150;
  const left = clamp(x, 100, Math.max(100, containerW - 100));

  const hint = node.frontier
    ? "Not loaded yet — double-click to pull it in"
    : node.hidden > 0
      ? `${node.hidden} hidden neighbour${node.hidden === 1 ? "" : "s"} — double-click to reveal`
      : edgeMode === "key" && node.extraEdges > 0
        ? `${node.extraEdges} more edge${node.extraEdges === 1 ? "" : "s"} — click to show them`
        : null;

  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{
        left,
        top: below ? y + rk + 12 : y - rk - 12,
        transform: below ? "translateX(-50%)" : "translate(-50%, -100%)",
      }}
    >
      <GlassPanel className="w-max max-w-[19rem] overflow-hidden duration-150 animate-in fade-in zoom-in-95">
        <div className="flex items-start gap-2.5 px-3 py-2.5">
          <span
            aria-hidden
            className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg"
            style={{ backgroundColor: `${node.fill}24`, color: node.fill }}
          >
            <TypeIcon className="h-4 w-4" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="line-clamp-2 text-[13px] font-medium leading-snug">
              {node.label}
            </p>
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
              {node.labels.slice(0, 3).join(" · ") || node.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span
              aria-hidden
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                meta.dot,
                node.frontier && "opacity-40",
              )}
            />
            <span className="truncate">{meta.label}</span>
          </span>
          <span aria-hidden className="text-border">
            ·
          </span>
          <span className="shrink-0 font-mono text-[10px]">
            {node.degree} connection{node.degree === 1 ? "" : "s"}
          </span>
        </div>
        {hint ? (
          <p className="border-t border-border/60 px-3 py-1.5 text-[10px] leading-snug text-muted-foreground/80">
            {hint}
          </p>
        ) : null}
      </GlassPanel>
    </div>
  );
}
