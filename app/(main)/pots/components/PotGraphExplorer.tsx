"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import type { GraphEdge, GraphNode } from "reagraph";
import { iconKeyForNode, nodeIconDataUri } from "./graph/nodeIcons";
import { AlertTriangle, Loader2, RefreshCw, Info, X } from "lucide-react";

import PotService, {
  ProjectGraph,
  ProjectGraphNode,
} from "@/services/PotService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ---- Ontology category palette ---------------------------------------------
// Matches entity `category` values declared in
// app/src/context-engine/domain/ontology.py (topology-minimal ontology).

type CategoryKey = "topology" | "people" | "evidence" | "hygiene";

const CATEGORY_ORDER: CategoryKey[] = [
  "topology",
  "people",
  "evidence",
  "hygiene",
];

const CATEGORY_META: Record<
  CategoryKey,
  { label: string; blurb: string; dot: string; bg: string; border: string }
> = {
  topology: {
    label: "Topology",
    blurb:
      "Repositories, services, environments, data stores, clusters — the project skeleton and how it connects.",
    dot: "bg-sky-500",
    bg: "bg-sky-50",
    border: "border-sky-500",
  },
  people: {
    label: "People & Ownership",
    blurb: "Teams and people who own services and repositories.",
    dot: "bg-teal-500",
    bg: "bg-teal-50",
    border: "border-teal-500",
  },
  evidence: {
    label: "Evidence",
    blurb:
      "Documents and observations — generic captures the ingestion falls back to when nothing more specific fits.",
    dot: "bg-indigo-500",
    bg: "bg-indigo-50",
    border: "border-indigo-500",
  },
  hygiene: {
    label: "Quality & Hygiene",
    blurb:
      "Internal markers recording ontology downgrades and schema-quality issues.",
    dot: "bg-slate-500",
    bg: "bg-slate-50",
    border: "border-slate-500",
  },
};

function categoryMeta(cat: string) {
  return CATEGORY_META[cat as CategoryKey] ?? {
    label: cat,
    blurb: "",
    dot: "bg-neutral-400",
    bg: "bg-neutral-50",
    border: "border-neutral-400",
  };
}

// Static label -> ontology category map, mirroring ENTITY_TYPES in
// app/src/context-engine/domain/ontology.py (topology-minimal ontology). The
// graph-overview reader that previously supplied this map was removed with
// Graphiti; the canonical labels are stable, so we bake them into the client
// for node colouring rather than fetching a now-unsupported overview leg.
const LABEL_CATEGORY: Record<string, CategoryKey> = {
  Repository: "topology",
  Service: "topology",
  Environment: "topology",
  DataStore: "topology",
  Cluster: "topology",
  Team: "people",
  Person: "people",
  Document: "evidence",
  Observation: "evidence",
  Activity: "evidence",
  Period: "evidence",
  QualityIssue: "hygiene",
};

// ---- Main explorer ----------------------------------------------------------

type Props = { potId: string };

export default function PotGraphExplorer({ potId }: Props) {
  return <GraphVisualizationPanel potId={potId} />;
}

// ---- Graph visualization ---------------------------------------------------

// The graph is served by the single `infra_topology` reader, which returns the
// whole topology + ownership neighbourhood in one shot. These groups are
// CLIENT-SIDE filters over the rendered nodes (by ontology label) — not backend
// include keys anymore.
const PROJECT_GRAPH_INCLUDE_GROUPS: Array<{ key: string; label: string }> = [
  { key: "repos", label: "Repositories" },
  { key: "service_map", label: "Services" },
  { key: "environments", label: "Environments" },
  { key: "datastores", label: "Data stores" },
  { key: "clusters", label: "Clusters" },
  { key: "owners", label: "Owners" },
];

// Each filter group → the canonical labels it reveals.
const INCLUDE_FAMILY_LABELS: Record<string, string[]> = {
  repos: ["Repository"],
  service_map: ["Service"],
  environments: ["Environment"],
  datastores: ["DataStore"],
  clusters: ["Cluster"],
  owners: ["Team", "Person"],
};

function categoryForLabels(
  labels: string[],
  labelCategoryMap: Record<string, CategoryKey>,
): CategoryKey | null {
  for (const lbl of labels) {
    const c = labelCategoryMap[lbl];
    if (c) return c;
  }
  return null;
}

function cssFromTailwindBorder(tw: string): string {
  const map: Record<string, string> = {
    "border-sky-500": "#0ea5e9",
    "border-violet-500": "#8b5cf6",
    "border-amber-500": "#f59e0b",
    "border-emerald-500": "#10b981",
    "border-rose-500": "#f43f5e",
    "border-indigo-500": "#6366f1",
    "border-teal-500": "#14b8a6",
    "border-slate-500": "#64748b",
  };
  return map[tw] ?? "#94a3b8";
}

// Stable colour per relationship type so edges of the same kind read the same
// across the graph (and against the inspector's relationship list). Sky
// (#0ea5e9) is intentionally omitted — it is the canvas active/selection colour
// and would be ambiguous as a default edge tint.
const EDGE_PALETTE = [
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

const EDGE_FALLBACK_COLOR = "#94a3b8"; // slate-400, also used for frontier edges

// Assign palette colours by the type's position in the sorted set of distinct
// relationship types present. This is deterministic for a given dataset and
// collision-free until the type count exceeds the palette (then it wraps),
// unlike a hash which can collide on common types like "uses"/"implements".
function buildEdgeColorMap(types: Iterable<string>): Map<string, string> {
  const sorted = Array.from(new Set(types)).sort();
  const map = new Map<string, string>();
  sorted.forEach((t, i) => map.set(t, EDGE_PALETTE[i % EDGE_PALETTE.length]));
  return map;
}

// Reagraph renders through WebGL and cannot be server-rendered in the Next.js
// app router, so the canvas is loaded client-side only.
const PotGraphCanvas = dynamic(() => import("./graph/PotGraphCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Initialising graph…
    </div>
  ),
});

function GraphVisualizationPanel({ potId }: { potId: string }) {
  const [include, setInclude] = useState<Set<string>>(
    () =>
      new Set([
        "repos",
        "service_map",
        "environments",
        "datastores",
        "clusters",
        "owners",
      ]),
  );
  const [limit, setLimit] = useState(25);
  const [rawMode, setRawMode] = useState(false);
  const [selectedEntityKey, setSelectedEntityKey] = useState<string | null>(
    null,
  );

  const projectGraph = useQuery<ProjectGraph>({
    queryKey: ["pot-project-graph", potId, limit, rawMode],
    queryFn: () => PotService.getProjectGraph(potId, { limit, raw: rawMode }),
    staleTime: 30_000,
  });

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [labelMode, setLabelMode] = useState<"auto" | "all">("auto");

  const loadedKeys = useMemo(
    () => new Set((projectGraph.data?.nodes ?? []).map((n) => n.entity_key)),
    [projectGraph.data],
  );

  // One colour per relationship type, derived from every type in the dataset
  // (graph edges + per-node relationship metadata) so the graph and the
  // inspector's relationship list stay in sync.
  const edgeColorMap = useMemo(() => {
    const types: string[] = [];
    for (const e of projectGraph.data?.edges ?? []) types.push(e.type);
    for (const n of projectGraph.data?.nodes ?? [])
      for (const r of n.relationships ?? []) types.push(r.type);
    return buildEdgeColorMap(types);
  }, [projectGraph.data]);

  const nodeName = useCallback((n: ProjectGraphNode) => {
    const p = n.properties ?? {};
    return (
      (p.name as string | undefined) ||
      (p.title as string | undefined) ||
      (p.statement as string | undefined) ||
      n.entity_key
    );
  }, []);

  // Build the Reagraph model from the loaded neighbourhood plus, for any nodes
  // the user has expanded, a "frontier" ring synthesised from the relationship
  // metadata each node already carries. Growing the graph one hop at a time
  // needs no extra fetch — see `onExpand` for what double-click does.
  const { graphNodes, graphEdges } = useMemo(() => {
    const data = projectGraph.data;
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, GraphEdge>();

    const addNode = (
      key: string,
      labels: string[],
      name: string,
      frontier: boolean,
    ) => {
      const existing = nodes.get(key);
      if (existing && !(existing.data as { frontier?: boolean })?.frontier) {
        return; // never downgrade a loaded node back to a frontier stub
      }
      const cat = categoryForLabels(labels, LABEL_CATEGORY);
      const color = cat
        ? cssFromTailwindBorder(categoryMeta(cat).border)
        : "#94a3b8";
      nodes.set(key, {
        id: key,
        label: name || key,
        fill: frontier ? "#cbd5e1" : color,
        // Loaded nodes keep their category-coloured sphere with a white type
        // icon composited inside (see renderNode in PotGraphCanvas); frontier
        // stubs stay plain grey spheres so "grey = unloaded" still reads.
        icon: frontier
          ? undefined
          : nodeIconDataUri(iconKeyForNode(labels, key), "#ffffff"),
        data: { frontier, category: cat, labels },
      });
    };

    const addEdge = (
      source: string,
      type: string,
      target: string,
      frontier: boolean,
    ) => {
      const id = `${source}|${type}|${target}`;
      if (edges.has(id)) return;
      edges.set(id, {
        id,
        source,
        target,
        label: type.replaceAll("_", " ").toLowerCase(),
        fill: frontier
          ? EDGE_FALLBACK_COLOR
          : edgeColorMap.get(type) ?? EDGE_FALLBACK_COLOR,
        data: { frontier },
      });
    };

    if (data) {
      const dataNodes = Array.isArray(data.nodes) ? data.nodes : [];
      const dataEdges = Array.isArray(data.edges) ? data.edges : [];
      for (const n of dataNodes) {
        addNode(n.entity_key, n.labels, nodeName(n), false);
      }
      for (const e of dataEdges) {
        if (loadedKeys.has(e.from) && loadedKeys.has(e.to)) {
          addEdge(e.from, e.type, e.to, false);
        }
      }
      // One-hop frontier ring for every node the user expanded.
      for (const n of dataNodes) {
        if (!expanded.has(n.entity_key)) continue;
        for (const rel of n.relationships ?? []) {
          if (rel.direction === "out") {
            const tk = rel.target_key;
            if (!tk) continue;
            const known = loadedKeys.has(tk);
            if (!known) {
              addNode(tk, rel.target_labels ?? [], rel.target_name || tk, true);
            }
            addEdge(n.entity_key, rel.type, tk, !known);
          } else {
            const sk = rel.source_key;
            if (!sk) continue;
            const known = loadedKeys.has(sk);
            if (!known) {
              addNode(sk, rel.source_labels ?? [], rel.source_name || sk, true);
            }
            addEdge(sk, rel.type, n.entity_key, !known);
          }
        }
      }
    }

    return {
      graphNodes: Array.from(nodes.values()),
      graphEdges: Array.from(edges.values()),
    };
  }, [
    projectGraph.data,
    expanded,
    loadedKeys,
    nodeName,
    edgeColorMap,
  ]);

  // The family chips filter the rendered graph client-side (one reader returns
  // the whole topology). A node shows if any of its labels is in an active
  // family; edges show only when both endpoints survive.
  const visible = useMemo(() => {
    // Raw mode shows the whole partition as-is — the topology family chips
    // don't apply to generic / non-topology nodes.
    if (rawMode) return { nodes: graphNodes, edges: graphEdges };
    const activeLabels = new Set<string>();
    for (const fam of include) {
      for (const l of INCLUDE_FAMILY_LABELS[fam] ?? []) activeLabels.add(l);
    }
    const nodes = graphNodes.filter((n) => {
      const labels =
        (n.data as { labels?: string[] } | undefined)?.labels ?? [];
      if (labels.length === 0) return true;
      return labels.some((l) => activeLabels.has(l));
    });
    const keep = new Set(nodes.map((n) => n.id));
    const edges = graphEdges.filter(
      (e) => keep.has(e.source) && keep.has(e.target),
    );
    return { nodes, edges };
  }, [graphNodes, graphEdges, include, rawMode]);

  const onExpand = useCallback(
    (key: string) => {
      if (loadedKeys.has(key)) {
        // Loaded node → reveal its one-hop frontier from embedded relations.
        setExpanded((prev) => {
          if (prev.has(key)) return prev;
          const next = new Set(prev);
          next.add(key);
          return next;
        });
        return;
      }
      // Frontier stub → there is no node-anchored backend reader, so pull a
      // wider slice of the graph; the stub usually resolves to a real node.
      setLimit((l) => Math.min(50, l + 15));
    },
    [loadedKeys],
  );

  const selectedNode = useMemo<ProjectGraphNode | null>(() => {
    if (!selectedEntityKey) return null;
    const loaded = (projectGraph.data?.nodes ?? []).find(
      (n) => n.entity_key === selectedEntityKey,
    );
    if (loaded) return loaded;
    // Synthesise a minimal record for frontier stubs so the inspector still
    // shows the name/labels we know from the relationship metadata.
    const stub = graphNodes.find((n) => n.id === selectedEntityKey);
    if (!stub) return null;
    const meta = stub.data as { labels?: string[] } | undefined;
    return {
      id: selectedEntityKey,
      entity_key: selectedEntityKey,
      labels: meta?.labels ?? [],
      properties: { name: stub.label ?? selectedEntityKey },
      relationships: [],
    };
  }, [selectedEntityKey, projectGraph.data, graphNodes]);

  const toggleInclude = (key: string) => {
    setInclude((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Structural subgraph
              </CardTitle>
              <CardDescription className="text-xs">
                Force-directed view of the canonical project map. Node color is
                the ontology category; click to inspect, double-click to expand
                a node&apos;s neighbours, drag to rearrange.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="number"
                min={1}
                max={50}
                value={limit}
                onChange={(e) => setLimit(Math.max(1, Math.min(50, Number(e.target.value) || 25)))}
                className="h-8 w-20"
                title="Node limit"
              />
              <Button
                variant={rawMode ? "default" : "outline"}
                size="sm"
                onClick={() => setRawMode((m) => !m)}
                title="Topology = typed canonical edges only. Raw = the whole canonical partition incl. generic RELATED_TO and soft-downgraded data."
              >
                {rawMode ? "Raw graph" : "Topology"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setLabelMode((m) => (m === "auto" ? "all" : "auto"))
                }
                title="Toggle edge/node label density"
              >
                Labels: {labelMode === "auto" ? "Auto" : "All"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpanded(new Set())}
                disabled={expanded.size === 0}
                title="Collapse all expanded neighbourhoods"
              >
                Collapse
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => projectGraph.refetch()}
              >
                {projectGraph.isFetching ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-4 w-4" />
                )}
                Reload
              </Button>
            </div>
          </div>
          {rawMode ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Raw graph: the full canonical partition for this pot — every
              entity and <code>:RELATES_TO</code> edge, including generic
              <code> RELATED_TO</code> and soft-downgraded data the typed
              readers don&apos;t surface.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1">
              {PROJECT_GRAPH_INCLUDE_GROUPS.map((g) => {
                const active = include.has(g.key);
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => toggleInclude(g.key)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          )}
          <CategoryLegend />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-300 align-middle" />
            Grey nodes are unloaded neighbours — double-click to pull them in.
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[560px] w-full rounded-md border bg-muted/20">
            {projectGraph.isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
                subgraph…
              </div>
            ) : projectGraph.isError ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                <p className="text-sm font-medium">
                  Failed to load project graph
                </p>
                <p className="max-w-md text-xs text-muted-foreground">
                  {projectGraph.error instanceof Error
                    ? projectGraph.error.message
                    : "Unknown error"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => projectGraph.refetch()}
                >
                  <RefreshCw className="mr-1 h-4 w-4" /> Retry
                </Button>
              </div>
            ) : visible.nodes.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                <Info className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No entities match the current filters. Try toggling more
                  include groups or clearing the repo filter.
                </p>
              </div>
            ) : (
              <div className="relative h-full w-full">
                <PotGraphCanvas
                  nodes={visible.nodes}
                  edges={visible.edges}
                  selectedId={selectedEntityKey}
                  onSelect={setSelectedEntityKey}
                  onExpand={onExpand}
                  labelType={labelMode}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <NodeInspector
        node={selectedNode}
        onClose={() => setSelectedEntityKey(null)}
        edgeColorMap={edgeColorMap}
      />
    </div>
  );
}

function CategoryLegend() {
  return (
    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
      {CATEGORY_ORDER.map((c) => (
        <span key={c} className="inline-flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", CATEGORY_META[c].dot)} />
          {CATEGORY_META[c].label}
        </span>
      ))}
    </div>
  );
}

function NodeInspector({
  node,
  onClose,
  edgeColorMap,
}: {
  node: ProjectGraphNode | null;
  onClose: () => void;
  edgeColorMap: Map<string, string>;
}) {
  if (!node) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Inspector</CardTitle>
          <CardDescription className="text-xs">
            Click a node in the graph to inspect its properties and
            relationships. Double-click a node to expand its neighbours.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const props = node.properties ?? {};
  const displayName =
    (props.name as string | undefined) ||
    (props.title as string | undefined) ||
    (props.statement as string | undefined) ||
    node.entity_key;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base font-semibold">
              {displayName}
            </CardTitle>
            <div className="mt-1 flex flex-wrap gap-1">
              {node.labels.map((l) => (
                <Badge key={l} variant="secondary" className="text-[10px] font-normal">
                  {l}
                </Badge>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Entity key
          </p>
          <p className="mt-0.5 break-all font-mono text-xs">{node.entity_key}</p>
        </div>
        <Separator />
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Properties
          </p>
          <ScrollArea className="mt-1 h-48 rounded-md border bg-muted/30 p-2">
            <dl className="space-y-1 text-xs">
              {Object.entries(props)
                .filter(([k]) => !k.startsWith("_"))
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[100px_1fr] gap-2">
                    <dt className="truncate text-muted-foreground">{k}</dt>
                    <dd className="break-all font-mono">
                      {typeof v === "object" ? JSON.stringify(v) : String(v)}
                    </dd>
                  </div>
                ))}
            </dl>
          </ScrollArea>
        </div>
        {node.relationships && node.relationships.length > 0 ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Relationships ({node.relationships.length})
            </p>
            <ScrollArea className="mt-1 min-h-0 flex-1 rounded-md border bg-muted/30 p-2">
              <ul className="space-y-1 text-xs">
                {node.relationships.map((rel, idx) => {
                  const color =
                    edgeColorMap.get(rel.type) ?? EDGE_FALLBACK_COLOR;
                  return (
                    <li key={idx} className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[10px] font-normal"
                        style={{ color, borderColor: color }}
                      >
                        {rel.direction === "out" ? "→" : "←"} {rel.type}
                      </Badge>
                      <span className="truncate">
                        {rel.direction === "out"
                          ? rel.target_name || rel.target_key
                          : rel.source_name || rel.source_key}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
