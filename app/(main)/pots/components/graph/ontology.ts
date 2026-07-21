// Ontology category palette + edge colour system for the pot graph screen.
//
// Categories match those declared in app/src/context-engine/domain/ontology.py.
// The palette is semantic: the same hue must read identically in the canvas
// node fills, the floating legend, and the details sheet. Light/dark variants
// exist because the graph canvas paints raw hex (no CSS tokens).

export type CategoryKey =
  | "scope_identity"
  | "product_architecture"
  | "change_decision"
  | "delivery_operations"
  | "debugging_reliability"
  | "knowledge_evidence"
  | "team_ownership"
  | "quality_drift";

export const CATEGORY_ORDER: CategoryKey[] = [
  "scope_identity",
  "product_architecture",
  "change_decision",
  "knowledge_evidence",
  "team_ownership",
  "delivery_operations",
  "debugging_reliability",
  "quality_drift",
];

export type CategoryMeta = {
  label: string;
  blurb: string;
  /** Tailwind classes for legend/accordion dots (light + dark). */
  dot: string;
  /** Canvas node fill on the light surface. */
  hex: string;
  /** Canvas node fill on the dark surface (one step brighter). */
  hexDark: string;
};

export const CATEGORY_META: Record<CategoryKey, CategoryMeta> = {
  scope_identity: {
    label: "Scope & identity",
    blurb: "Pot, repository, system, service, environment — the skeleton.",
    dot: "bg-sky-500 dark:bg-sky-400",
    hex: "#0ea5e9",
    hexDark: "#38bdf8",
  },
  product_architecture: {
    label: "Product architecture",
    blurb: "Capability, feature, component, interface, data store.",
    dot: "bg-violet-500 dark:bg-violet-400",
    hex: "#8b5cf6",
    hexDark: "#a78bfa",
  },
  change_decision: {
    label: "Change & decision",
    blurb: "PRs, commits, issues, decisions, constraints, preferences.",
    dot: "bg-amber-500 dark:bg-amber-400",
    hex: "#f59e0b",
    hexDark: "#fbbf24",
  },
  delivery_operations: {
    label: "Delivery & operations",
    blurb: "Deployments, runbooks, scripts, config, alerts, incidents.",
    dot: "bg-emerald-500 dark:bg-emerald-400",
    hex: "#10b981",
    hexDark: "#34d399",
  },
  debugging_reliability: {
    label: "Debugging & reliability",
    blurb: "Bug patterns, investigations, fixes, diagnostic signals.",
    dot: "bg-rose-500 dark:bg-rose-400",
    hex: "#f43f5e",
    hexDark: "#fb7185",
  },
  knowledge_evidence: {
    label: "Knowledge & evidence",
    blurb: "Documents, conversations, episodes, source references.",
    dot: "bg-indigo-500 dark:bg-indigo-400",
    hex: "#6366f1",
    hexDark: "#818cf8",
  },
  team_ownership: {
    label: "Team & ownership",
    blurb: "Persons, teams, agents, roles — who owns what.",
    dot: "bg-teal-500 dark:bg-teal-400",
    hex: "#14b8a6",
    hexDark: "#2dd4bf",
  },
  quality_drift: {
    label: "Quality & drift",
    blurb: "Quality issues, maintenance jobs, materialized paths.",
    dot: "bg-slate-500 dark:bg-slate-400",
    hex: "#64748b",
    hexDark: "#94a3b8",
  },
};

const UNKNOWN_CATEGORY_META: CategoryMeta = {
  label: "Other",
  blurb: "",
  dot: "bg-neutral-400 dark:bg-neutral-500",
  hex: "#94a3b8",
  hexDark: "#94a3b8",
};

export function categoryMeta(cat: string): CategoryMeta {
  return CATEGORY_META[cat as CategoryKey] ?? {
    ...UNKNOWN_CATEGORY_META,
    label: cat,
  };
}

/** First label that maps to a known ontology category wins. */
export function categoryForLabels(
  labels: string[],
  labelCategoryMap: Record<string, string>,
): CategoryKey | null {
  for (const lbl of labels) {
    const c = labelCategoryMap[lbl];
    if (c) return c as CategoryKey;
  }
  return null;
}

/** Canvas fill for a category on the current surface. */
export function categoryHex(cat: CategoryKey | null, dark: boolean): string {
  if (!cat) return "#94a3b8";
  const meta = categoryMeta(cat);
  return dark ? meta.hexDark : meta.hex;
}

/** Grey used for unloaded frontier stubs (legend chip: "unloaded"). */
export function frontierNodeColor(dark: boolean): string {
  return dark ? "#475569" : "#cbd5e1"; // slate-600 / slate-300
}

// Stable colour per relationship type so edges of the same kind read the same
// across the graph (and against the inspector's relationship list). Sky
// (#0ea5e9 / #38bdf8) is intentionally omitted — it is the canvas
// active/selection colour and would be ambiguous as a default edge tint.
const EDGE_PALETTE_LIGHT = [
  "#dc2626", // red-600
  "#ea580c", // orange-600
  "#ca8a04", // yellow-600
  "#65a30d", // lime-600
  "#16a34a", // green-600
  "#047857", // emerald-700
  "#0d9488", // teal-600
  "#0891b2", // cyan-600
  "#2563eb", // blue-600
  "#4f46e5", // indigo-600
  "#7c3aed", // violet-600
  "#9333ea", // purple-600
  "#c026d3", // fuchsia-600
  "#db2777", // pink-600
  "#e11d48", // rose-600
  "#b45309", // amber-700
  "#57534e", // stone-600
  "#475569", // slate-600
];

// Same hues one step brighter so they carry against the dark canvas.
const EDGE_PALETTE_DARK = [
  "#f87171", // red-400
  "#fb923c", // orange-400
  "#facc15", // yellow-400
  "#a3e635", // lime-400
  "#4ade80", // green-400
  "#10b981", // emerald-500
  "#2dd4bf", // teal-400
  "#22d3ee", // cyan-400
  "#60a5fa", // blue-400
  "#818cf8", // indigo-400
  "#a78bfa", // violet-400
  "#c084fc", // purple-400
  "#e879f9", // fuchsia-400
  "#f472b6", // pink-400
  "#fb7185", // rose-400
  "#f59e0b", // amber-500
  "#a8a29e", // stone-400
  "#94a3b8", // slate-400
];

/** Muted grey for unmapped/frontier edges. */
export function edgeFallbackColor(dark: boolean): string {
  return dark ? "#64748b" : "#94a3b8"; // slate-500 / slate-400
}

// Assign palette colours by the type's position in the sorted set of distinct
// relationship types present. This is deterministic for a given dataset and
// collision-free until the type count exceeds the palette (then it wraps),
// unlike a hash which can collide on common types like "uses"/"implements".
export function buildEdgeColorMap(
  types: Iterable<string>,
  dark: boolean,
): Map<string, string> {
  const palette = dark ? EDGE_PALETTE_DARK : EDGE_PALETTE_LIGHT;
  const sorted = Array.from(new Set(types)).sort();
  const map = new Map<string, string>();
  sorted.forEach((t, i) => map.set(t, palette[i % palette.length]));
  return map;
}

// ---- Project-graph fetch config ---------------------------------------------

export const PROJECT_GRAPH_INCLUDE_GROUPS: Array<{
  key: string;
  label: string;
}> = [
  { key: "purpose", label: "Purpose" },
  { key: "repo_map", label: "Repositories" },
  { key: "service_map", label: "Services" },
  { key: "feature_map", label: "Features" },
  { key: "deployments", label: "Deployments" },
  { key: "owners", label: "Owners" },
  { key: "docs", label: "Docs" },
  { key: "runbooks", label: "Runbooks" },
  { key: "local_workflows", label: "Workflows" },
  { key: "scripts", label: "Scripts" },
  { key: "config", label: "Config" },
  { key: "preferences", label: "Preferences" },
  { key: "agent_instructions", label: "Agent instructions" },
];

export const DEFAULT_INCLUDE_GROUPS = [
  "service_map",
  "feature_map",
  "owners",
  "deployments",
] as const;

export const DEFAULT_NODE_LIMIT = 25;

// The backend limit is per label bucket, so a pot can easily come back with a
// few hundred loaded nodes. Everything renders by default; the opt-in "Focus"
// view trims to the highest-degree core and grows exploratively —
// double-click reveals a node's hidden neighbours.
export const CORE_RENDER_LIMIT = 40;
