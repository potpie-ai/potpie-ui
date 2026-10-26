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
// discarded — so there is no live simulation and no reheat when data
// changes. Dragging a node simply moves it (and pins it there); its edges
// follow via a canvas repaint while the rest of the composition stays put.
//
// Motion layer: on top of the frozen layout every disc carries a render-only
// offset (ox/oy) that is never fed back into the layout. It sums a slow
// per-node float (each disc drifts a few screen px on its own phase, hubs
// less than leaves) and a damped spring (neighbours lean after a dragged node
// and ripple outward from a click, then settle back to their seats). One rAF
// loop owns it: it writes the offset into each disc's inner float <g> and
// repaints the edge canvas in the same frame, so edges stay attached. The
// float pauses while a pan/zoom rides the composited layer (its clock stops,
// so nothing jumps on resume), and prefers-reduced-motion turns the whole
// layer off.
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
//   Edges outside the viewport are culled per draw, and resting edges are
//   batched into one path per tint, so a redraw is a handful of strokes.
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
// - drag background / wheel: pan + zoom (double-click background re-fits);
//   the dot grid behind the graph pans at a fraction of the speed (parallax)
// - drag node: the disc lifts and repositions; the node stays pinned where
//   you drop it (Neo4j behaviour); neighbours only lean after it on springs
//   and settle back, nothing reflows
// - hover node: the disc lifts and every one of its edges previews in its
//   relationship colour; after a short dwell a floating card shows quick
//   details (name, type, category, connections, expand hints); any gesture
//   hides the card
// - click node: select — every one of its edges (including resting-hidden
//   ones) lights up in its relationship colour with particles flowing
//   source → target, everything outside the one-hop neighbourhood fades, a
//   ring pings around the disc and its neighbours ripple outward
// - click edge: select — the edge and its two endpoints light up
// - double-click node: expand neighbours (newcomers pop in)
// - resting edges carry a faint tint of their leaf end's category colour
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
  /** Render-only motion offset (float + spring); never fed into the layout. */
  ox: number;
  oy: number;
  /** Float phase (radians) and amplitude factor — hubs drift less. */
  phase: number;
  amp: number;
  /** Entrance pop delay (ms); the disc reads it once, when it mounts. */
  enterDelay: number;
};

/** Damped spring displacement (world units) behind tug and ripple motion. */
type Spring = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Rest target — the drag tug moves it; 0,0 means "settle home". */
  tx: number;
  ty: number;
  /** Pending ripple kick, applied once performance.now() reaches `at`. */
  at: number;
  kx: number;
  ky: number;
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
  /** Offset (0-1) so flow particles on sibling edges don't march in step. */
  phase: number;
  /** Resting tint: the leaf end's category colour (the child, on backbone). */
  rest: string;
};

type ViewTransform = { k: number; x: number; y: number };

/**
 * DOM handles for one node disc: the outer group (layout position + fades),
 * the inner float group (motion offset), the selection halo and the
 * edge-count hint.
 */
type NodeEls = {
  g: SVGGElement | null;
  float: SVGGElement | null;
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
// Motion layer (render-only offsets on top of the frozen layout).
/** Float amplitude in *screen* px, so the drift reads the same at any zoom. */
const FLOAT_AMP = 3.2;
/** Seconds per float cycle (each node runs at its own phase). */
const FLOAT_PERIOD = 6.5;
/**
 * Float ticks run at ~12fps: the drift moves well under half a pixel per
 * tick, so more frames would buy nothing but repaints of the node layer.
 */
const FLOAT_FRAME_MS = 80;
/** Springs, particles and the fade-in are capped at ~60fps. */
const BUSY_FRAME_MS = 15;
/** The float settles after this long without a pointer over the graph. */
const FLOAT_IDLE_MS = 45_000;
/** Screen-px margin around the container that still floats. */
const FLOAT_MARGIN = 60;
// Underdamped spring (ζ ≈ 0.55): one soft overshoot, then it settles.
const SPRING_K = 170;
const SPRING_DAMP = 14;
/** Share of a drag's travel a degree-0 neighbour leans after it. */
const TUG = 0.18;
/** Cap on the tug lean (world px) so a long drag never yanks a ring apart. */
const TUG_MAX = 70;
/** Click ripple kick (screen px/s) and its spread delay (ms per world px). */
const RIPPLE_KICK = 120;
const RIPPLE_DELAY = 0.45;
/** Flow particle speed along emphasised edges (world px/s). */
const PARTICLE_SPEED = 95;
/** Resting edges fade in over this window after the first paint (ms). */
const EDGE_FADE_IN = [200, 900] as const;
/** The dot grid pans at this fraction of the graph's speed (depth cue). */
const PARALLAX = 0.35;
const DOT_GAP = 22;

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
    /** Opacity of the leaf-colour tint on resting edges. */
    restAlpha: 0.34,
  },
  dark: {
    halo: "#0b1516",
    caption: "#f2f7f5",
    captionOnFill: "#ffffff",
    edge: "#475569",
    edgeLabel: "#94a3b8",
    restAlpha: 0.42,
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

/** Stable 0-1 hash of a string (FNV-1a) — seeds per-node motion phases. */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/** SVG id for the per-fill shadow gradient (fills are #rrggbb). */
function shadowId(fill: string): string {
  return `pgc-shadow-${fill.replace(/[^a-z0-9]/gi, "")}`;
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
  // Rendered positions: layout plus the motion offset, so edges stay pinned
  // to the floating discs.
  const sx = (edge.source.x ?? 0) + edge.source.ox;
  const sy = (edge.source.y ?? 0) + edge.source.oy;
  const tx = (edge.target.x ?? 0) + edge.target.ox;
  const ty = (edge.target.y ?? 0) + edge.target.oy;

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

/** Append an edge's curve (or self-loop) and its arrowhead to the paths. */
function traceEdge(line: Path2D, tips: Path2D, geo: EdgeGeo) {
  if (geo.loop) {
    line.moveTo(geo.cx + LOOP_R, geo.cy);
    line.arc(geo.cx, geo.cy, LOOP_R, 0, Math.PI * 2);
    return;
  }
  line.moveTo(geo.sx, geo.sy);
  line.quadraticCurveTo(geo.cpx, geo.cpy, geo.ex, geo.ey);
  // Arrowhead at the target rim.
  tips.moveTo(geo.tipX, geo.tipY);
  tips.lineTo(
    geo.ex - geo.u1y * ARROW_HALF_WIDTH,
    geo.ey + geo.u1x * ARROW_HALF_WIDTH,
  );
  tips.lineTo(
    geo.ex + geo.u1y * ARROW_HALF_WIDTH,
    geo.ey - geo.u1x * ARROW_HALF_WIDTH,
  );
  tips.closePath();
}

/** Point at parameter u along a non-loop edge's quadratic curve. */
function curvePoint(
  geo: Extract<EdgeGeo, { loop: false }>,
  u: number,
): [number, number] {
  const v = 1 - u;
  return [
    v * v * geo.sx + 2 * v * u * geo.cpx + u * u * geo.ex,
    v * v * geo.sy + 2 * v * u * geo.cpy + u * u * geo.ey,
  ];
}

/** The node's spring, created at rest (so it starts with no visible jump). */
function springFor(springs: Map<LayoutNode, Spring>, n: LayoutNode): Spring {
  let s = springs.get(n);
  if (!s) {
    s = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, at: 0, kx: 0, ky: 0 };
    springs.set(n, s);
  }
  return s;
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
  /** Lit edges, particles and the selection ping, above the resting edges. */
  const fxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rootGRef = useRef<SVGGElement | null>(null);
  const dotsRef = useRef<HTMLDivElement | null>(null);

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

  // Motion layer state (see the header). Springs are keyed by node object and
  // dropped on rebuild; neighbours come from every edge, not just the backbone.
  const reducedMotionRef = useRef(false);
  const springsRef = useRef(new Map<LayoutNode, Spring>());
  const neighboursRef = useRef(new Map<string, LayoutNode[]>());
  /** Disc under the cursor — its edges preview in relationship colour. */
  const hoverIdRef = useRef<string | null>(null);
  /** A disc just dropped from a drag — eased back into its float by a spring. */
  const releasedRef = useRef<LayoutNode | null>(null);
  /** While a selection/search fade is up, only these discs keep floating. */
  const floatOnlyRef = useRef<Set<string> | null>(null);
  /** Last pointer activity over the graph — an unattended graph stops drifting. */
  const lastActiveRef = useRef(0);
  /** performance.now() of the first visible build (drives the edge fade-in). */
  const enteredAtRef = useRef(0);

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
    /** Layout position at press — the tug leans neighbours by the travel. */
    x0: number;
    y0: number;
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
        x: ((node.x ?? 0) + node.ox) * t.k + t.x,
        y: ((node.y ?? 0) + node.oy) * t.k + t.y,
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
   * Repaint one edge layer. "base" holds every resting edge (batched by
   * tint) plus frontier dashes and their labels; "fx", stacked above it,
   * holds the lit edges (selection + hover) with their flow particles and
   * the selection ping. Selection emphasis, fades and relationship labels
   * are all decided here per draw, so a repaint of both layers is the single
   * answer to "anything edge-related changed" — while the motion loop can
   * replay just "fx" every frame to animate particles cheaply.
   */
  const paintEdges = useCallback((layer: "base" | "fx") => {
    const canvas = layer === "base" ? canvasRef.current : fxCanvasRef.current;
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
    // A hovered (or dragged) disc previews its edges in relationship colour
    // without fading anything else.
    const nodeId = selectedIdRef.current;
    const edgeId = selectedEdgeIdRef.current;
    const hoverId =
      hoverIdRef.current ??
      (dragRef.current?.moved ? dragRef.current.node.id : null);
    const search = searchRef.current;
    const hasFocus = nodeId !== null || edgeId !== null;
    const palette = chromeRef.current;
    const drawAll = edgeModeRef.current === "all";
    const labelsEverywhere =
      labelTypeRef.current === "all" || t.k >= LABEL_ZOOM;
    const motion = !reducedMotionRef.current;
    const now = performance.now();
    const fadeIn = motion
      ? clamp(
          (now - enteredAtRef.current - EDGE_FADE_IN[0]) / EDGE_FADE_IN[1],
          0,
          1,
        )
      : 1;
    // Particles stay a readable screen size at any zoom.
    const particleR = clamp(2.2 / Math.sqrt(t.k), 1.6, 5);

    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.font = EDGE_LABEL_FONT;
    ctx.textAlign = "center";

    // Resting edges are batched into one path per (tint, alpha) pair, so a
    // dense pot strokes a handful of paths instead of thousands, and spokes
    // converging on a hub don't stack their opacity. Frontier and lit edges
    // paint individually on top of them; labels go last, over everything.
    const batches = new Map<
      string,
      { color: string; alpha: number; line: Path2D; tips: Path2D }
    >();
    const singles: {
      e: LayoutEdge;
      geo: EdgeGeo;
      alpha: number;
      lit: boolean;
      emphasized: boolean;
    }[] = [];
    const labels: typeof singles = [];

    for (const e of layoutEdgesRef.current) {
      const emphasized =
        edgeId === e.id ||
        (nodeId !== null &&
          (e.source.id === nodeId || e.target.id === nodeId));
      const hovered =
        !emphasized &&
        hoverId !== null &&
        (e.source.id === hoverId || e.target.id === hoverId);
      const lit = emphasized || hovered;
      // Each edge belongs to exactly one layer (before geometry — the hot
      // skip). "key" mode: an unlit edge outside the resting set never
      // paints.
      if ((layer === "fx") !== lit) continue;
      if (!drawAll && !e.resting && !lit) continue;

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

      let alpha = 1;
      if (search) {
        alpha =
          search.has(e.source.id) && search.has(e.target.id) ? 1 : 0.06;
      } else if (hasFocus && !emphasized) {
        alpha = hovered ? 0.7 : 0.12;
      }
      alpha *= fadeIn;

      // Lit edges take their relationship colour and frontier links stay
      // dashed grey; everything else rests as a faint tint of its leaf
      // end's category colour.
      if (lit || e.frontier) {
        singles.push({ e, geo, alpha, lit, emphasized });
      } else {
        const a = alpha * palette.restAlpha;
        const key = `${e.rest}|${a.toFixed(3)}`;
        let batch = batches.get(key);
        if (!batch) {
          batch = {
            color: e.rest,
            alpha: a,
            line: new Path2D(),
            tips: new Path2D(),
          };
          batches.set(key, batch);
        }
        traceEdge(batch.line, batch.tips, geo);
      }
      // Skip label paint for near-invisible edges (search/selection fades).
      if ((labelsEverywhere || emphasized) && alpha > 0.5)
        labels.push({ e, geo, alpha, lit, emphasized });
    }

    ctx.lineWidth = 1.3;
    for (const batch of batches.values()) {
      ctx.globalAlpha = batch.alpha;
      ctx.strokeStyle = batch.color;
      ctx.fillStyle = batch.color;
      ctx.stroke(batch.line);
      ctx.fill(batch.tips);
    }

    for (const { e, geo, alpha, lit, emphasized } of singles) {
      const stroke = lit ? e.fill : palette.edge;
      const line = new Path2D();
      const tips = new Path2D();
      traceEdge(line, tips, geo);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = stroke;
      ctx.fillStyle = stroke;
      ctx.lineWidth = emphasized ? 2.4 : lit ? 1.9 : 1.3;
      ctx.setLineDash(e.frontier ? [4, 4] : []);
      ctx.stroke(line);
      ctx.setLineDash([]);
      ctx.fill(tips);

      // Flow particles: lit edges show their direction as soft dots
      // travelling source → target, fading in and out at the rims.
      if (lit && motion && alpha > 0.5 && !geo.loop) {
        const len = Math.hypot(geo.ex - geo.sx, geo.ey - geo.sy);
        const count = len > 320 ? 2 : 1;
        const travel = (now / 1000) * (PARTICLE_SPEED / Math.max(len, 60));
        for (let i = 0; i < count; i++) {
          const u = (travel + e.phase + i / count) % 1;
          const [px, py] = curvePoint(geo, u);
          const fade = alpha * Math.sin(Math.PI * u);
          ctx.globalAlpha = fade * 0.22;
          ctx.beginPath();
          ctx.arc(px, py, particleR * 2.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = fade;
          ctx.beginPath();
          ctx.arc(px, py, particleR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    for (const { e, geo, alpha, emphasized } of labels) {
      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.translate(geo.labelX, geo.labelY);
      ctx.rotate((geo.labelAngle * Math.PI) / 180);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = palette.halo;
      ctx.strokeText(e.label, 0, 0);
      ctx.fillStyle = emphasized ? e.fill : palette.edgeLabel;
      ctx.fillText(e.label, 0, 0);
      ctx.restore();
    }

    // Selection ping: a ring that keeps expanding off the selected disc.
    // It lives here, not in the SVG, so it never repaints the node layer.
    if (layer === "fx" && nodeId !== null && motion) {
      const n = layoutNodesRef.current.find((m) => m.id === nodeId);
      if (n) {
        const u = (now % 1900) / 1900;
        const grow = 1 - (1 - Math.min(1, u / 0.75)) ** 3;
        ctx.globalAlpha = 0.55 * (1 - grow);
        ctx.strokeStyle = n.fill;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          (n.x ?? 0) + n.ox,
          (n.y ?? 0) + n.oy,
          (n.r + 3) * (1 + 0.7 * grow),
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }, []);

  /** Repaint both edge layers. */
  const drawEdges = useCallback(() => {
    paintEdges("base");
    paintEdges("fx");
  }, [paintEdges]);

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

  // Hover preview: the disc's edges light up on entry (no dwell); the
  // details card keeps its own dwell timer.
  const onNodeEnter = useCallback(
    (node: LayoutNode) => {
      hoverIdRef.current = node.id;
      scheduleDraw();
      onNodeHoverStart(node);
    },
    [scheduleDraw, onNodeHoverStart],
  );

  const onNodeLeave = useCallback(() => {
    hoverIdRef.current = null;
    scheduleDraw();
    clearHover();
  }, [scheduleDraw, clearHover]);

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
    // A faded disc's drift is barely visible, and moving it re-rasters its
    // opacity group — so under a fade only the lit discs keep floating.
    floatOnlyRef.current = search ?? (hasFocus ? activeNodes : null);

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

  // Parallax dot grid: pans at a fraction of the graph's speed and zooms
  // more gently than it, so the graph reads as floating above the surface.
  // The pan rides a composited transform; only a zoom repaints the pattern.
  const dotGapRef = useRef(DOT_GAP);
  const applyParallax = useCallback(() => {
    const el = dotsRef.current;
    if (!el) return;
    const t = viewRef.current;
    const gap = DOT_GAP * clamp(t.k ** 0.4, 0.7, 1.4);
    if (Math.abs(gap - dotGapRef.current) > 0.25) {
      dotGapRef.current = gap;
      el.style.backgroundSize = `${gap}px ${gap}px`;
    }
    const g = dotGapRef.current;
    const sx = (((t.x * PARALLAX) % g) + g) % g;
    const sy = (((t.y * PARALLAX) % g) + g) % g;
    el.style.transform = `translate3d(${sx - g}px, ${sy - g}px, 0)`;
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
    applyParallax();
    scheduleDraw();
  }, [applyCaptionLod, applyParallax, scheduleDraw]);

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
    applyParallax();
    scheduleDraw();
  }, [applyCaptionLod, applyParallax, commitRaster, scheduleDraw]);

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
    // Discs that stay mounted keep their DOM float offset, so their new
    // layout nodes start from it (edges stay attached until the next tick).
    const mounted = new Map(layoutNodesRef.current.map((n) => [n.id, n]));

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
        ox: mounted.get(n.id)?.ox ?? 0,
        oy: mounted.get(n.id)?.oy ?? 0,
        phase: hash01(n.id) * Math.PI * 2,
        // Hubs are heavier: they drift about half as far as a leaf does.
        amp: frontier ? 1.1 : clamp(1.25 - (r - 16) / 36, 0.55, 1.2),
        enterDelay: 0,
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
    // The motion layer's tug and ripple reach every linked disc.
    springsRef.current.clear();
    releasedRef.current = null;
    neighboursRef.current = new Map(
      Array.from(neighbours, ([id, set]) => [
        id,
        Array.from(set, (m) => byId.get(m)!),
      ]),
    );
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
          phase: hash01(e.id),
          rest: (child ?? (s.degree <= t.degree ? s : t)).fill,
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

    // Entrance: the first visible build blooms outward from its centre (the
    // stagger follows distance, so rings open after their hubs); later
    // newcomers — expands, filter toggles — just pop in with a small jitter.
    // Discs read the delay once, at mount, so it never replays.
    if (nodeElsRef.current.size === 0) {
      enteredAtRef.current = performance.now();
      let cx = 0;
      let cy = 0;
      for (const n of layoutNodes) {
        cx += n.x ?? 0;
        cy += n.y ?? 0;
      }
      cx /= layoutNodes.length || 1;
      cy /= layoutNodes.length || 1;
      let maxD = 1;
      for (const n of layoutNodes)
        maxD = Math.max(maxD, Math.hypot((n.x ?? 0) - cx, (n.y ?? 0) - cy));
      for (const n of layoutNodes) {
        const d = Math.hypot((n.x ?? 0) - cx, (n.y ?? 0) - cy);
        n.enterDelay = Math.round((d / maxD) * 650 + hash01(`${n.id}~`) * 90);
      }
    } else {
      for (const n of layoutNodes)
        n.enterDelay = Math.round(hash01(`${n.id}~`) * 120);
    }

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
    // Anything that restyles the graph (selection, search, new structure)
    // counts as activity and wakes a settled float.
    lastActiveRef.current = performance.now();
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

  // ---- Motion loop ----------------------------------------------------------

  // Drives the float, the springs, the edge fade-in and the flow particles.
  // Each frame writes the changed offsets and repaints the edge canvas in
  // that same frame, so edges never trail their discs. The float ticks at
  // ~12fps; springs, particles and the fade-in at up to ~60fps.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    lastActiveRef.current = performance.now();
    const onMotionPref = () => {
      reducedMotionRef.current = mq.matches;
      scheduleDraw();
    };
    mq.addEventListener("change", onMotionPref);

    const omega = (2 * Math.PI) / FLOAT_PERIOD;
    let raf = 0;
    let last = performance.now();
    let lastFloat = last;
    /** Float clock — stands still while a gesture holds the view. */
    let floatT = 0;
    /** Zoom the float amplitude follows, eased so a zoom never snaps it. */
    let ampK = viewRef.current.k;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const nodes = layoutNodesRef.current;
      const reduced = reducedMotionRef.current;
      const springs = springsRef.current;
      if (reduced) springs.clear();
      const lit =
        selectedIdRef.current !== null ||
        selectedEdgeIdRef.current !== null ||
        hoverIdRef.current !== null ||
        Boolean(dragRef.current?.moved);
      const entering =
        now - enteredAtRef.current < EDGE_FADE_IN[0] + EDGE_FADE_IN[1];
      const busy = springs.size > 0 || (!reduced && (lit || entering));
      // An unattended graph settles (no repaints, no battery); the next
      // pointer move picks the drift up where it stopped.
      const floatTick =
        now - lastFloat >= FLOAT_FRAME_MS &&
        now - lastActiveRef.current < FLOAT_IDLE_MS;
      const busyTick = busy && now - last >= BUSY_FRAME_MS;
      if (!nodes.length || (!floatTick && !busyTick)) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const t = viewRef.current;
      const r = rasterRef.current;
      if (floatTick) {
        // A pan/zoom in flight rides the composited layer; offset writes
        // would force the re-raster it exists to avoid, so the clock holds.
        if (t.k === r.k && t.x === r.x && t.y === r.y)
          floatT += Math.min(0.1, (now - lastFloat) / 1000);
        lastFloat = now;
        ampK += (t.k - ampK) * 0.25;
      }
      const amp = reduced ? 0 : FLOAT_AMP / Math.max(ampK, 0.25);

      for (const [n, s] of springs) {
        if (s.at && now >= s.at) {
          s.vx += s.kx;
          s.vy += s.ky;
          s.at = 0;
        }
        s.vx += (SPRING_K * (s.tx - s.x) - SPRING_DAMP * s.vx) * dt;
        s.vy += (SPRING_K * (s.ty - s.y) - SPRING_DAMP * s.vy) * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (
          !s.at &&
          !s.tx &&
          !s.ty &&
          Math.abs(s.x) + Math.abs(s.y) < 0.05 &&
          Math.abs(s.vx) + Math.abs(s.vy) < 0.5
        )
          springs.delete(n);
      }

      // Only discs on screen float: every moved disc repaints the node layer,
      // so the bleed margin stays still (its discs keep their last offset,
      // and the canvas reads the same values, so edges stay attached).
      const { w, h } = sizeRef.current;
      const pad = FLOAT_MARGIN / t.k;
      const x0 = -t.x / t.k - pad;
      const y0 = -t.y / t.k - pad;
      const x1 = (w - t.x) / t.k + pad;
      const y1 = (h - t.y) / t.k + pad;
      const dragged = dragRef.current?.moved ? dragRef.current.node : null;
      const floatOnly = floatOnlyRef.current;
      const els = nodeElsRef.current;
      let wrote = false;
      for (const n of nodes) {
        const s = springs.get(n);
        if (!floatTick && !s && n !== releasedRef.current) continue;
        if (floatOnly && !floatOnly.has(n.id) && !s) continue;
        const x = n.x ?? 0;
        const y = n.y ?? 0;
        if (!s && (x < x0 || x > x1 || y < y0 || y > y1)) continue;
        let ox = 0;
        let oy = 0;
        if (n !== dragged) {
          const a = amp * n.amp;
          ox = a * 0.65 * Math.sin(omega * 0.77 * floatT + n.phase);
          oy = a * Math.sin(omega * floatT + n.phase * 1.618);
          if (n === releasedRef.current) {
            // Dropped disc: absorb the gap to its float into a spring so it
            // eases back into the drift instead of snapping.
            releasedRef.current = null;
            const rs = springFor(springs, n);
            rs.x = n.ox - ox;
            rs.y = n.oy - oy;
          }
          const sp = springs.get(n);
          if (sp) {
            ox += sp.x;
            oy += sp.y;
          }
        }
        if (Math.abs(ox - n.ox) < 0.02 && Math.abs(oy - n.oy) < 0.02) continue;
        n.ox = ox;
        n.oy = oy;
        els
          .get(n.id)
          ?.float?.setAttribute(
            "transform",
            `translate(${ox.toFixed(2)},${oy.toFixed(2)})`,
          );
        wrote = true;
      }

      if (wrote || springs.size > 0 || (entering && !reduced)) {
        // This frame's repaint supersedes any draw already queued for it.
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = 0;
        }
        drawEdges();
      } else if (busyTick) {
        // Nothing moved: only the particles and the ping need a new frame.
        paintEdges("fx");
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      mq.removeEventListener("change", onMotionPref);
    };
  }, [drawEdges, paintEdges, scheduleDraw]);

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
        x0: node.x ?? 0,
        y0: node.y ?? 0,
        rect,
        moved: false,
      };
    },
    [cancelFocusAnim, clearHover],
  );

  /** Kick every neighbour outward on a spring, delayed by distance (a wave). */
  const rippleFrom = useCallback((node: LayoutNode) => {
    if (reducedMotionRef.current) return;
    const kick = RIPPLE_KICK / viewRef.current.k;
    const now = performance.now();
    for (const m of neighboursRef.current.get(node.id) ?? []) {
      const dx = (m.x ?? 0) - (node.x ?? 0);
      const dy = (m.y ?? 0) - (node.y ?? 0);
      const d = Math.hypot(dx, dy) || 1;
      // Heavier hubs barely budge; leaves bounce.
      const v = kick / (1 + m.degree / 10);
      const s = springFor(springsRef.current, m);
      s.at = now + d * RIPPLE_DELAY;
      s.kx = (dx / d) * v;
      s.ky = (dy / d) * v;
    }
  }, []);

  const onNodePointerMove = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (
        !drag.moved &&
        Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 4
      )
        return;
      const g = nodeElsRef.current.get(drag.node.id)?.g;
      // The disc lifts while it is carried (CSS keys off data-drag).
      if (!drag.moved) g?.setAttribute("data-drag", "");
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
      g?.setAttribute("transform", `translate(${x},${y})`);
      // Neighbours lean after it on springs — a share of the travel, less for
      // heavier hubs, capped — and settle home on release. Their layout
      // positions never change.
      if (!reducedMotionRef.current) {
        const dx = x - drag.x0;
        const dy = y - drag.y0;
        const len = Math.hypot(dx, dy) || 1;
        for (const m of neighboursRef.current.get(drag.node.id) ?? []) {
          const lean =
            Math.min((len * TUG) / (1 + m.degree / 6), TUG_MAX) / len;
          const s = springFor(springsRef.current, m);
          s.tx = dx * lean;
          s.ty = dy * lean;
        }
      }
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
      // A press that never travelled is a click: select (and ripple the
      // neighbourhood). A real drag leaves fx/fy set so the node stays
      // pinned where it was dropped; its neighbours spring home and the disc
      // itself eases back into its float.
      if (!drag.moved) {
        onSelect(drag.node.id);
        rippleFrom(drag.node);
        return;
      }
      nodeElsRef.current.get(drag.node.id)?.g?.removeAttribute("data-drag");
      for (const m of neighboursRef.current.get(drag.node.id) ?? []) {
        const s = springsRef.current.get(m);
        if (s) {
          s.tx = 0;
          s.ty = 0;
        }
      }
      releasedRef.current = drag.node;
    },
    [onSelect, rippleFrom],
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
  // The first structure commit fades the pre-settled composition in (under
  // the discs' own pop-in) instead of popping a fully-formed graph onto the
  // screen. The dot grid sits outside the fade so the surface never blinks.
  const fade: React.CSSProperties = {
    opacity: structureVersion > 0 ? 1 : 0,
    transition: "opacity 400ms ease",
  };
  // One soft shadow gradient per category colour: a tinted drop shadow on
  // light surfaces, a glow in the disc's own colour on dark ones.
  const fills = Array.from(new Set(layoutNodesRef.current.map((n) => n.fill)));

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full cursor-grab active:cursor-grabbing"
      onPointerMove={() => {
        lastActiveRef.current = performance.now();
      }}
    >
      <div
        ref={dotsRef}
        aria-hidden
        className="pot-dots pointer-events-none absolute"
        style={{ inset: -64, willChange: "transform" }}
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={fade}
        aria-hidden
      />
      <canvas
        ref={fxCanvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={fade}
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
          ...fade,
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
        <defs>
          {/* Top-left sheen: one shared overlay that turns the flat discs
              into soft spheres without touching their category colour. */}
          <radialGradient id="pgc-sheen" cx="0.36" cy="0.3" r="0.72">
            <stop offset="0" stopColor="#fff" stopOpacity={dark ? 0.2 : 0.34} />
            <stop offset="0.55" stopColor="#fff" stopOpacity={0.05} />
            <stop offset="1" stopColor="#fff" stopOpacity={0} />
          </radialGradient>
          {fills.map((fill) => {
            const color = dark ? fill : shadeHex(fill, 0.45);
            return (
              <radialGradient key={fill} id={shadowId(fill)}>
                <stop
                  offset="0.55"
                  stopColor={color}
                  stopOpacity={dark ? 0.34 : 0.24}
                />
                <stop offset="1" stopColor={color} stopOpacity={0} />
              </radialGradient>
            );
          })}
        </defs>
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
              onHoverStart={onNodeEnter}
              onHoverEnd={onNodeLeave}
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
        /* Disc micro-motion. .gc-lift scales about the disc centre (its
           parent's origin); the shadow stays behind on the layout position,
           so a lifted or floating disc visibly rises off it. */
        @media (prefers-reduced-motion: no-preference) {
          .gc-lift {
            transition: transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
            animation: gc-pop 560ms cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
            animation-delay: var(--gc-delay, 0ms);
          }
          .gc-shadow {
            transition: transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 260ms ease;
            animation: gc-fade 700ms ease-out backwards;
            animation-delay: var(--gc-delay, 0ms);
          }
          .gc-node:hover .gc-lift { transform: scale(1.1); }
          .gc-node:hover .gc-shadow { transform: scale(1.14); opacity: 0.8; }
          .gc-node:active .gc-lift {
            transform: scale(0.94);
            transition-duration: 90ms;
          }
          .gc-node[data-drag] .gc-lift { transform: scale(1.14); }
          .gc-node[data-drag] .gc-shadow { transform: scale(1.26); opacity: 0.65; }
        }
        @keyframes gc-pop { from { transform: scale(0.15); opacity: 0; } }
        @keyframes gc-fade { from { opacity: 0; } }
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
  const els = useRef<NodeEls>({
    g: null,
    float: null,
    halo: null,
    hint: null,
  }).current;
  // Captured at mount: a rebuild hands this disc a new delay, but its pop-in
  // has already played and must not replay.
  const enterDelay = useRef(node.enterDelay).current;

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
      className="gc-node cursor-pointer transition-opacity duration-150"
      style={{ "--gc-delay": `${enterDelay}ms` } as React.CSSProperties}
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
      {/* Soft shadow, pinned to the layout position (outside the float). */}
      <circle
        r={node.r * 1.32}
        cy={node.r * 0.22}
        fill={`url(#${shadowId(node.fill)})`}
        className="gc-shadow pointer-events-none"
      />
      {/* Float group: the motion loop writes the drift/spring offset here. */}
      <g
        ref={(el) => {
          els.float = el;
        }}
      >
        {/* Lift group: CSS pop-in, hover lift, press and carry scale. */}
        <g className="gc-lift">
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
            strokeWidth={1.5}
            strokeDasharray={node.frontier ? "3.5 3" : undefined}
          />
          <circle
            r={node.r}
            fill="url(#pgc-sheen)"
            className="pointer-events-none"
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
              <circle
                r={8}
                fill={halo}
                stroke={edgeChrome}
                strokeWidth={1.25}
              />
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
      </g>
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
