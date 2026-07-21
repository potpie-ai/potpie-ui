"use client";

// Full-bleed graph workspace for a pot. The force-graph canvas fills the whole
// area below the tab rail; every piece of chrome (search, filters, legend,
// stats, node inspector) floats over it as a GlassPanel, and the schema /
// relationship tables live in a slide-over details sheet so nothing ever
// pushes the canvas around.
//
// Exploration model
// - Search (toolbar, "/" or Cmd+K): typeahead over every loaded node; typing
//   dims non-matches live, picking a result reveals the node if needed and
//   animates the canvas to it.
// - Type filters (Filters popover + clickable legend): client-side visibility
//   by node label and relationship type — instant, no refetch.
// - Edge density (stats panel toggle): "key" rests on the structural backbone
//   only — selecting a node paints all of its edges and a grey badge counts
//   the hidden ones; "all" paints every edge.
// - Load scope (Filters popover): include groups / repo / PR / limit — the
//   server-side knobs that decide what gets fetched at all.
// - Timeline panel (toolbar toggle, or arriving with ?panel=timeline): a
//   docked activity feed sharing the Timeline tab's query. Selecting a node
//   scopes the feed to events involving it; clicking an event flies the
//   canvas to the matching node.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import type { PotGraphEdge, PotGraphNode } from "./graph/PotGraphCanvas";
import {
  AlertTriangle,
  CalendarClock,
  RefreshCw,
  Shrink,
  Tags,
  Waypoints,
} from "lucide-react";

import PotService, {
  GraphOverview,
  ProjectGraph,
  ProjectGraphNode,
} from "@/services/PotService";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, GlassPanel } from "@/app/(main)/pots/components/kit";
import { cn } from "@/lib/utils";

import {
  CATEGORY_ORDER,
  CORE_RENDER_LIMIT,
  DEFAULT_INCLUDE_GROUPS,
  DEFAULT_NODE_LIMIT,
  OTHER_CATEGORY,
  PROJECT_GRAPH_INCLUDE_GROUPS,
  buildEdgeColorMap,
  categoryForLabels,
  categoryHex,
  edgeFallbackColor,
  frontierNodeColor,
} from "./graph/ontology";
import GraphSearch, { type GraphSearchResult } from "./graph/GraphSearch";
import GraphFilters, {
  type EdgeTypeFacet,
  type LabelFacet,
  type NodeTypeGroup,
} from "./graph/GraphFilters";
import GraphLegend, { type LegendCategory } from "./graph/GraphLegend";
import GraphStatsPanel from "./graph/GraphStatsPanel";
import NodeInspectorPanel from "./graph/NodeInspectorPanel";
import GraphDetailsSheet from "./graph/GraphDetailsSheet";
import TimelineSidePanel from "./timeline/TimelineSidePanel";

// The canvas is pure browser territory (pointer capture, ResizeObserver,
// d3-force layout), so it is loaded client-side only.
const PotGraphCanvas = dynamic(() => import("./graph/PotGraphCanvas"), {
  ssr: false,
  loading: () => <CanvasSkeleton />,
});

type Props = { potId: string };

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

export default function PotGraphExplorer({ potId }: Props) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
    error: overviewErrorObj,
    refetch: refetchOverview,
    isRefetching: overviewRefetching,
  } = useQuery<GraphOverview>({
    queryKey: ["pot-graph-overview", potId],
    queryFn: () => PotService.getGraphOverview(potId),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (overviewError && overviewErrorObj) {
      toast.error(
        overviewErrorObj instanceof Error
          ? overviewErrorObj.message
          : "Failed to load graph overview",
      );
    }
  }, [overviewError, overviewErrorObj]);

  const handleRefreshOverview = useCallback(() => {
    void refetchOverview();
  }, [refetchOverview]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      {overviewLoading ? (
        <WorkspaceSkeleton />
      ) : !overview ? (
        <div className="flex h-full items-center justify-center">
          <EmptyState
            icon={Waypoints}
            title="Graph not built yet"
            description="We couldn't load a graph overview for this pot — it may still be building, or the graph backend is unreachable."
          >
            <Button variant="outline" size="sm" onClick={handleRefreshOverview}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
            </Button>
          </EmptyState>
        </div>
      ) : (
        <GraphWorkspace
          potId={potId}
          overview={overview}
          dark={dark}
          overviewRefreshing={overviewRefetching}
          onRefreshOverview={handleRefreshOverview}
        />
      )}
    </div>
  );
}

// ---- Loading states ---------------------------------------------------------

function CanvasSkeleton() {
  // Shimmer where the graph will appear: a loose cluster of node-shaped
  // skeletons over the dot grid.
  return (
    <div className="absolute inset-0 grid place-items-center" aria-hidden>
      <div className="relative h-48 w-64">
        <Skeleton className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted" />
        <Skeleton className="absolute left-4 top-3 h-9 w-9 rounded-full bg-muted" />
        <Skeleton className="absolute right-6 top-6 h-11 w-11 rounded-full bg-muted" />
        <Skeleton className="absolute bottom-4 left-10 h-8 w-8 rounded-full bg-muted" />
        <Skeleton className="absolute bottom-2 right-12 h-7 w-7 rounded-full bg-muted" />
      </div>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="relative h-full">
      <div className="pot-dots absolute inset-0" aria-hidden />
      <div className="absolute left-3 top-3 z-10">
        <Skeleton className="h-11 w-[min(420px,60vw)] rounded-xl bg-muted" />
      </div>
      <div className="absolute right-3 top-3 z-10">
        <Skeleton className="h-11 w-64 rounded-xl bg-muted" />
      </div>
      <div className="absolute bottom-3 left-3 z-10">
        <Skeleton className="h-24 w-72 rounded-xl bg-muted" />
      </div>
      <CanvasSkeleton />
    </div>
  );
}

// ---- Workspace --------------------------------------------------------------

function GraphWorkspace({
  potId,
  overview,
  dark,
  overviewRefreshing,
  onRefreshOverview,
}: {
  potId: string;
  overview: GraphOverview;
  dark: boolean;
  overviewRefreshing: boolean;
  onRefreshOverview: () => void;
}) {
  // Build label -> category map from overview for node coloring.
  const labelCategoryMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const row of overview.schema_coverage.by_label) {
      m[row.label] = row.category;
    }
    return m;
  }, [overview.schema_coverage.by_label]);

  // ---- Load scope (server-side query knobs) --------------------------------
  const [include, setInclude] = useState<Set<string>>(
    () => new Set(DEFAULT_INCLUDE_GROUPS),
  );
  const [repoName, setRepoName] = useState("");
  const [limit, setLimit] = useState(DEFAULT_NODE_LIMIT);
  const [prNumber, setPrNumber] = useState("");
  const [selectedEntityKey, setSelectedEntityKey] = useState<string | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  // Deep-link target (?focus=<key>) waiting for the graph data to arrive.
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);

  // Consume ?focus= / ?panel=timeline once — the Timeline tab links here with
  // both to land on an event's node with the activity panel already open.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const focus = sp.get("focus");
    if (sp.get("panel") === "timeline") setTimelineOpen(true);
    if (focus) setPendingFocus(focus);
    if (focus || sp.get("panel")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const projectGraph = useQuery<ProjectGraph>({
    queryKey: [
      "pot-project-graph",
      potId,
      Array.from(include).sort().join(","),
      repoName,
      limit,
      prNumber,
    ],
    queryFn: () =>
      PotService.getProjectGraph(potId, {
        include: Array.from(include),
        repo_name: repoName.trim() || undefined,
        limit,
        pr_number: prNumber ? Number(prNumber) : undefined,
      }),
    staleTime: 30_000,
  });

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Nodes the user pulled onto the canvas beyond the high-degree core (via
  // double-click expansion or picking an entity in the details sheet).
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  // Render every loaded node by default; "Focus" trims to the high-degree
  // core with double-click-to-reveal expansion for very dense pots.
  const [showAll, setShowAll] = useState(true);
  const [labelMode, setLabelMode] = useState<"auto" | "all">("auto");
  // Edge density on the canvas: "key" draws only structural edges at rest
  // (a node's full edges appear on selection), "all" draws every edge.
  const [edgeMode, setEdgeMode] = useState<"key" | "all">("key");

  // ---- Client-side exploration state ---------------------------------------
  const [query, setQuery] = useState("");
  // True while the search input is focused with a query — drives canvas dim.
  const [searchActive, setSearchActive] = useState(false);
  /** Node labels currently hidden from the canvas. */
  const [hiddenLabels, setHiddenLabels] = useState<Set<string>>(new Set());
  /** Relationship types currently hidden from the canvas. */
  const [hiddenEdgeTypes, setHiddenEdgeTypes] = useState<Set<string>>(
    new Set(),
  );
  // Search/details picks land here: pinned nodes render regardless of type
  // filters and focus trimming, so "jump to node" always has a node to show.
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [focusRequest, setFocusRequest] = useState<{
    id: string;
    nonce: number;
  } | null>(null);
  const focusNonceRef = useRef(0);

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
    return buildEdgeColorMap(types, dark);
  }, [projectGraph.data, dark]);

  const nodeName = useCallback((n: ProjectGraphNode) => {
    const p = n.properties ?? {};
    return (
      (p.name as string | undefined) ||
      (p.title as string | undefined) ||
      (p.statement as string | undefined) ||
      n.entity_key
    );
  }, []);

  // Build the *full* canvas model from the loaded neighbourhood plus, for any
  // nodes the user has expanded, a "frontier" ring synthesised from the
  // relationship metadata each node already carries. What actually renders is
  // a subset of this — see the type-filter and visibility memos below.
  const { allNodes, allEdges } = useMemo(() => {
    const data = projectGraph.data;
    const nodes = new Map<string, PotGraphNode>();
    const edges = new Map<string, PotGraphEdge>();
    const frontierFill = frontierNodeColor(dark);
    const frontierEdgeFill = edgeFallbackColor(dark);

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
      const cat = categoryForLabels(labels, labelCategoryMap);
      const color = categoryHex(cat, dark);
      nodes.set(key, {
        id: key,
        label: name || key,
        // Frontier stubs stay grey (dashed disc on the canvas) so
        // "grey = unloaded" still reads against the category palette.
        fill: frontier ? frontierFill : color,
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
          ? frontierEdgeFill
          : (edgeColorMap.get(type) ?? frontierEdgeFill),
        data: { frontier, type },
      });
    };

    if (data) {
      for (const n of data.nodes) {
        addNode(n.entity_key, n.labels, nodeName(n), false);
      }
      for (const e of data.edges) {
        if (loadedKeys.has(e.from) && loadedKeys.has(e.to)) {
          addEdge(e.from, e.type, e.to, false);
        }
      }
      // One-hop frontier ring for every node the user expanded.
      for (const n of data.nodes) {
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
      // Fallback so a sparse pot still shows seeds to start expanding from.
      if (data.nodes.length === 0) {
        for (const t of overview.top_entities_by_degree) {
          addNode(t.entity_key, t.labels, t.name || t.entity_key, true);
        }
      }
    }

    return {
      allNodes: Array.from(nodes.values()),
      allEdges: Array.from(edges.values()),
    };
  }, [
    projectGraph.data,
    labelCategoryMap,
    expanded,
    loadedKeys,
    nodeName,
    edgeColorMap,
    overview.top_entities_by_degree,
    dark,
  ]);

  // Loaded-graph adjacency (graph edges + per-node relationship metadata that
  // points at other loaded nodes). Drives degree ranking for the core view,
  // the "+N hidden neighbours" badges, and what double-click reveals.
  const adjacency = useMemo(() => {
    const adj = new Map<string, Set<string>>();
    const link = (a: string, b: string) => {
      if (a === b) return;
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a)!.add(b);
      adj.get(b)!.add(a);
    };
    const data = projectGraph.data;
    if (data) {
      for (const e of data.edges) {
        if (loadedKeys.has(e.from) && loadedKeys.has(e.to)) link(e.from, e.to);
      }
      for (const n of data.nodes) {
        for (const rel of n.relationships ?? []) {
          const other =
            rel.direction === "out" ? rel.target_key : rel.source_key;
          if (other && loadedKeys.has(other)) link(n.entity_key, other);
        }
      }
    }
    return adj;
  }, [projectGraph.data, loadedKeys]);

  // ---- Type filters (client-side, instant) ----------------------------------

  // A node is label-hidden only when EVERY one of its labels is hidden, so a
  // multi-label node survives while any of its types is still shown. Pinned
  // nodes (search/details picks) always survive.
  const { eligibleNodes, eligibleEdges } = useMemo(() => {
    if (hiddenLabels.size === 0 && hiddenEdgeTypes.size === 0) {
      return { eligibleNodes: allNodes, eligibleEdges: allEdges };
    }
    const nodes =
      hiddenLabels.size === 0
        ? allNodes
        : allNodes.filter((n) => {
            if (pinned.has(n.id)) return true;
            const labels = n.data?.labels ?? [];
            return !(
              labels.length > 0 && labels.every((l) => hiddenLabels.has(l))
            );
          });
    const ids = new Set(nodes.map((n) => n.id));
    const edges = allEdges.filter((e) => {
      if (!ids.has(e.source) || !ids.has(e.target)) return false;
      const type = e.data?.type;
      return !(type && hiddenEdgeTypes.has(type));
    });
    return { eligibleNodes: nodes, eligibleEdges: edges };
  }, [allNodes, allEdges, hiddenLabels, hiddenEdgeTypes, pinned]);

  // Progressive disclosure: a few hundred loaded nodes render as an unreadable
  // (and slow) hairball, so by default only the highest-degree core is drawn.
  // Everything else stays data-only until revealed — double-click a node to
  // pull in its hidden neighbours, or "show all" to drop the cap.
  const { graphNodes, graphEdges } = useMemo(() => {
    const trimmed = !showAll && eligibleNodes.length > CORE_RENDER_LIMIT * 1.5;
    if (!trimmed)
      return { graphNodes: eligibleNodes, graphEdges: eligibleEdges };

    const eligibleIds = new Set(eligibleNodes.map((n) => n.id));
    const degree = (key: string) => adjacency.get(key)?.size ?? 0;
    const visible = new Set<string>();
    eligibleNodes
      .filter((n) => !n.data?.frontier)
      .sort((a, b) => degree(b.id) - degree(a.id))
      .slice(0, CORE_RENDER_LIMIT)
      .forEach((n) => visible.add(n.id));
    for (const key of revealed) if (eligibleIds.has(key)) visible.add(key);
    for (const key of pinned) if (eligibleIds.has(key)) visible.add(key);
    // Frontier stubs only exist for expanded parents, which are always
    // visible themselves, so keep the whole ring.
    for (const n of eligibleNodes) if (n.data?.frontier) visible.add(n.id);

    const nodes = eligibleNodes
      .filter((n) => visible.has(n.id))
      .map((n) => {
        // Count only type-eligible hidden neighbours: double-click reveals
        // those, while filtered-out ones stay hidden either way.
        let hidden = 0;
        for (const nb of adjacency.get(n.id) ?? []) {
          if (eligibleIds.has(nb) && !visible.has(nb)) hidden += 1;
        }
        return hidden === 0
          ? n
          : { ...n, data: { ...n.data, hiddenCount: hidden } };
      });
    return {
      graphNodes: nodes,
      graphEdges: eligibleEdges.filter(
        (e) => visible.has(e.source) && visible.has(e.target),
      ),
    };
  }, [eligibleNodes, eligibleEdges, adjacency, revealed, pinned, showAll]);

  const visibleIds = useMemo(
    () => new Set(graphNodes.map((n) => n.id)),
    [graphNodes],
  );

  // A filter change can pull the inspected node off the canvas — drop the
  // selection rather than inspecting something invisible.
  useEffect(() => {
    if (selectedEntityKey && !visibleIds.has(selectedEntityKey)) {
      setSelectedEntityKey(null);
    }
  }, [visibleIds, selectedEntityKey]);

  // ---- Facets for the filter UI ---------------------------------------------

  const nodeTypeGroups = useMemo<NodeTypeGroup[]>(() => {
    const counts = new Map<string, number>();
    for (const n of allNodes) {
      for (const l of n.data?.labels ?? []) {
        counts.set(l, (counts.get(l) ?? 0) + 1);
      }
    }
    const byCat = new Map<string, LabelFacet[]>();
    for (const [label, count] of counts) {
      const cat = labelCategoryMap[label] ?? OTHER_CATEGORY;
      const facet = { label, count };
      const arr = byCat.get(cat);
      if (arr) arr.push(facet);
      else byCat.set(cat, [facet]);
    }
    const groups: NodeTypeGroup[] = [];
    for (const cat of [...CATEGORY_ORDER, OTHER_CATEGORY]) {
      const labels = byCat.get(cat);
      if (!labels) continue;
      labels.sort(
        (a, b) => b.count - a.count || a.label.localeCompare(b.label),
      );
      groups.push({
        category: cat,
        total: labels.reduce((s, f) => s + f.count, 0),
        labels,
      });
    }
    return groups;
  }, [allNodes, labelCategoryMap]);

  const edgeTypeFacets = useMemo<EdgeTypeFacet[]>(() => {
    const counts = new Map<string, number>();
    for (const e of allEdges) {
      const type = e.data?.type;
      if (type) counts.set(type, (counts.get(type) ?? 0) + 1);
    }
    return Array.from(counts, ([type, count]) => ({
      type,
      count,
      color: edgeColorMap.get(type) ?? edgeFallbackColor(dark),
    })).sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  }, [allEdges, edgeColorMap, dark]);

  const legendCategories = useMemo<LegendCategory[]>(
    () =>
      nodeTypeGroups.map((g) => {
        const hiddenCount = g.labels.filter((l) =>
          hiddenLabels.has(l.label),
        ).length;
        return {
          key: g.category,
          count: g.total,
          state:
            hiddenCount === 0
              ? "on"
              : hiddenCount === g.labels.length
                ? "off"
                : "partial",
        };
      }),
    [nodeTypeGroups, hiddenLabels],
  );

  const toggleLabelHidden = useCallback((label: string) => {
    setHiddenLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const toggleEdgeTypeHidden = useCallback((type: string) => {
    setHiddenEdgeTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const toggleCategoryHidden = useCallback(
    (category: string) => {
      const group = nodeTypeGroups.find((g) => g.category === category);
      if (!group || group.labels.length === 0) return;
      setHiddenLabels((prev) => {
        const next = new Set(prev);
        const allHidden = group.labels.every((l) => next.has(l.label));
        for (const l of group.labels) {
          if (allHidden) next.delete(l.label);
          else next.add(l.label);
        }
        return next;
      });
    },
    [nodeTypeGroups],
  );

  const clearTypeFilters = useCallback(() => {
    setHiddenLabels(new Set());
    setHiddenEdgeTypes(new Set());
  }, []);

  // ---- Bulk / solo filter actions -------------------------------------------

  const allLabelList = useMemo(
    () => nodeTypeGroups.flatMap((g) => g.labels.map((l) => l.label)),
    [nodeTypeGroups],
  );
  const allEdgeTypeList = useMemo(
    () => edgeTypeFacets.map((f) => f.type),
    [edgeTypeFacets],
  );

  const showAllLabels = useCallback(() => setHiddenLabels(new Set()), []);
  const hideAllLabels = useCallback(
    () => setHiddenLabels(new Set(allLabelList)),
    [allLabelList],
  );

  // Solo = hide everything else. Soloing the current solo restores all.
  const soloLabel = useCallback(
    (label: string) => {
      setHiddenLabels((prev) => {
        const target = new Set(allLabelList.filter((l) => l !== label));
        return setsEqual(prev, target) ? new Set() : target;
      });
    },
    [allLabelList],
  );

  const soloCategory = useCallback(
    (category: string) => {
      const group = nodeTypeGroups.find((g) => g.category === category);
      if (!group) return;
      const keep = new Set(group.labels.map((l) => l.label));
      setHiddenLabels((prev) => {
        const target = new Set(allLabelList.filter((l) => !keep.has(l)));
        return setsEqual(prev, target) ? new Set() : target;
      });
    },
    [allLabelList, nodeTypeGroups],
  );

  const showAllEdgeTypes = useCallback(() => setHiddenEdgeTypes(new Set()), []);
  const hideAllEdgeTypes = useCallback(
    () => setHiddenEdgeTypes(new Set(allEdgeTypeList)),
    [allEdgeTypeList],
  );
  const soloEdgeType = useCallback(
    (type: string) => {
      setHiddenEdgeTypes((prev) => {
        const target = new Set(allEdgeTypeList.filter((t) => t !== type));
        return setsEqual(prev, target) ? new Set() : target;
      });
    },
    [allEdgeTypeList],
  );

  const includeAll = useCallback(
    () => setInclude(new Set(PROJECT_GRAPH_INCLUDE_GROUPS.map((g) => g.key))),
    [],
  );
  const includeNone = useCallback(() => setInclude(new Set()), []);

  // ---- Search ---------------------------------------------------------------

  const searchIndex = useMemo(
    () =>
      allNodes.map((n) => {
        const labels = n.data?.labels ?? [];
        return {
          id: n.id,
          name: n.label,
          labels,
          category: n.data?.category ?? null,
          frontier: Boolean(n.data?.frontier),
          degree: adjacency.get(n.id)?.size ?? 0,
          lowerName: n.label.toLowerCase(),
          lowerKey: n.id.toLowerCase(),
          lowerLabels: labels.join(" ").toLowerCase(),
        };
      }),
    [allNodes, adjacency],
  );

  // Ranked: exact name > name prefix > word start > name substring > key/type
  // substring; ties broken by connectivity.
  const searchMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const scored: Array<{ item: (typeof searchIndex)[number]; score: number }> =
      [];
    for (const item of searchIndex) {
      const idx = item.lowerName.indexOf(q);
      let score: number | null = null;
      if (idx === 0) score = item.lowerName === q ? 0 : 1;
      else if (idx > 0)
        score = /[\s\-_/.:]/.test(item.lowerName[idx - 1]) ? 2 : 3;
      else if (item.lowerKey.includes(q) || item.lowerLabels.includes(q))
        score = 4;
      if (score !== null) scored.push({ item, score });
    }
    scored.sort(
      (a, b) =>
        a.score - b.score ||
        b.item.degree - a.item.degree ||
        a.item.name.localeCompare(b.item.name),
    );
    return scored.map((s) => s.item);
  }, [query, searchIndex]);

  const matchedIds = useMemo(
    () => (searchMatches ? new Set(searchMatches.map((m) => m.id)) : null),
    [searchMatches],
  );

  const toSearchResult = useCallback(
    (item: (typeof searchIndex)[number]): GraphSearchResult => ({
      id: item.id,
      name: item.name,
      labels: item.labels,
      category: item.category,
      degree: item.degree,
      frontier: item.frontier,
      offCanvas: !visibleIds.has(item.id),
    }),
    [visibleIds],
  );

  const searchResults = useMemo(
    () => (searchMatches ? searchMatches.map(toSearchResult) : null),
    [searchMatches, toSearchResult],
  );

  const searchSuggestions = useMemo(
    () =>
      searchIndex
        .filter((i) => !i.frontier)
        .sort((a, b) => b.degree - a.degree)
        .slice(0, 12)
        .map(toSearchResult),
    [searchIndex, toSearchResult],
  );

  // Jump-to-node: make sure it renders (pin past filters and trimming), open
  // its inspector, and let the canvas animate to it.
  const revealAndFocus = useCallback(
    (key: string) => {
      if (!visibleIds.has(key)) {
        setPinned((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
        setRevealed((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
      }
      setSelectedEntityKey(key);
      focusNonceRef.current += 1;
      setFocusRequest({ id: key, nonce: focusNonceRef.current });
    },
    [visibleIds],
  );

  // Apply a deep-linked focus target once the graph model exists.
  useEffect(() => {
    if (!pendingFocus || !projectGraph.data) return;
    revealAndFocus(pendingFocus);
    setPendingFocus(null);
  }, [pendingFocus, projectGraph.data, revealAndFocus]);

  // ---- Timeline panel bridge ------------------------------------------------

  const nodeById = useMemo(
    () => new Map(allNodes.map((n) => [n.id, n])),
    [allNodes],
  );
  const knownKeys = useMemo(
    () => new Set(allNodes.map((n) => n.id)),
    [allNodes],
  );
  const selectedName = selectedEntityKey
    ? (nodeById.get(selectedEntityKey)?.label ?? null)
    : null;

  // Picking an activity node reads as "tell me about this event" — surface
  // the timeline panel alongside the inspector so the event's story shows up.
  const handleSelect = useCallback(
    (key: string | null) => {
      setSelectedEntityKey(key);
      if (key && nodeById.get(key)?.data?.labels?.includes("Activity")) {
        setTimelineOpen(true);
      }
    },
    [nodeById],
  );

  // ---- Expansion / selection ------------------------------------------------

  const onExpand = useCallback(
    (key: string) => {
      if (loadedKeys.has(key)) {
        // Loaded node → reveal its hidden loaded neighbours and its one-hop
        // frontier ring from embedded relations.
        setExpanded((prev) => {
          if (prev.has(key)) return prev;
          const next = new Set(prev);
          next.add(key);
          return next;
        });
        setRevealed((prev) => {
          let changed = !prev.has(key);
          const next = new Set(prev);
          next.add(key);
          for (const nb of adjacency.get(key) ?? []) {
            if (!next.has(nb)) {
              next.add(nb);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
        return;
      }
      // Frontier stub → there is no node-anchored backend reader, so pull a
      // wider slice of the graph; the stub usually resolves to a real node.
      // Marking it revealed keeps it on the canvas once it loads.
      setRevealed((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
      setLimit((l) => Math.min(50, l + 15));
    },
    [loadedKeys, adjacency],
  );

  const selectedNode = useMemo<ProjectGraphNode | null>(() => {
    if (!selectedEntityKey) return null;
    const loaded = projectGraph.data?.nodes.find(
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

  const toggleInclude = useCallback((key: string) => {
    setInclude((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setInclude(new Set(DEFAULT_INCLUDE_GROUPS));
    setRepoName("");
    setPrNumber("");
    setLimit(DEFAULT_NODE_LIMIT);
    setExpanded(new Set());
    setRevealed(new Set());
    setShowAll(true);
    setEdgeMode("key");
    setHiddenLabels(new Set());
    setHiddenEdgeTypes(new Set());
    setPinned(new Set());
    setQuery("");
  }, []);

  const collapseExpanded = useCallback(() => {
    setExpanded(new Set());
    setRevealed(new Set());
    setPinned(new Set());
  }, []);

  const refreshAll = useCallback(() => {
    onRefreshOverview();
    void projectGraph.refetch();
  }, [onRefreshOverview, projectGraph]);

  const refreshing = overviewRefreshing || projectGraph.isFetching;
  const neo4jDown = Boolean(overview.message && overview.message !== "ok");

  const includeChanged =
    include.size !== DEFAULT_INCLUDE_GROUPS.length ||
    DEFAULT_INCLUDE_GROUPS.some((k) => !include.has(k));
  const typeFilterCount = hiddenLabels.size + hiddenEdgeTypes.size;
  const filterBadgeCount =
    typeFilterCount +
    (repoName.trim() ? 1 : 0) +
    (prNumber ? 1 : 0) +
    (includeChanged ? 1 : 0);
  const expandedCount = expanded.size + revealed.size + pinned.size;

  const canvasState = projectGraph.isLoading
    ? "loading"
    : projectGraph.isError
      ? "error"
      : graphNodes.length === 0
        ? "empty"
        : "ready";

  return (
    <div className="flex h-full">
      {/* Canvas column — the docked timeline panel steals width from it. The
          overflow clip stops the canvas's absolutely-positioned layers from
          painting over the (static-positioned) panel. */}
      <div className="relative min-w-0 flex-1 overflow-hidden">
        {/* Base dot grid behind the canvas; the error/empty states bring their
          own faded grid via EmptyState, so skip it there. */}
        {canvasState === "loading" || canvasState === "ready" ? (
          <div className="pot-dots absolute inset-0" aria-hidden />
        ) : null}

        {/* Edge-to-edge canvas layer */}
        <div className="absolute inset-0">
          {canvasState === "loading" ? (
            <CanvasSkeleton />
          ) : canvasState === "error" ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={AlertTriangle}
                title="Couldn't load the graph"
                description={
                  projectGraph.error instanceof Error
                    ? projectGraph.error.message
                    : "Something went wrong while fetching the project graph."
                }
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => projectGraph.refetch()}
                >
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
                </Button>
              </EmptyState>
            </div>
          ) : canvasState === "empty" ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={Waypoints}
                title="Nothing to show yet"
                description={
                  typeFilterCount > 0
                    ? "Every loaded entity is hidden by the current type filters."
                    : "No entities match the current filters. Toggle more include groups or clear the repo filter."
                }
              >
                {typeFilterCount > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearTypeFilters}
                  >
                    Show all types
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Reset filters
                </Button>
              </EmptyState>
            </div>
          ) : (
            <PotGraphCanvas
              nodes={graphNodes}
              edges={graphEdges}
              selectedId={selectedEntityKey}
              onSelect={handleSelect}
              onExpand={onExpand}
              labelType={labelMode}
              edgeMode={edgeMode}
              dark={dark}
              searchIds={searchActive && matchedIds ? matchedIds : null}
              focusRequest={focusRequest}
            />
          )}
        </div>

        {/* Left rail: search + filters toolbar and backend notice (top), the
          clickable legend (bottom). Sits above the right rail so the search
          dropdown never slides under the stats panel on narrow screens. */}
        <div className="pointer-events-none absolute bottom-3 left-3 top-3 z-30 flex max-w-[calc(100%-1.5rem)] flex-col items-start justify-between gap-3">
          <div className="flex max-w-full flex-col items-start gap-3">
            <GlassPanel className="pointer-events-auto flex max-w-full items-center gap-0.5 p-1.5">
              <GraphSearch
                query={query}
                onQueryChange={setQuery}
                results={searchResults}
                suggestions={searchSuggestions}
                totalMatches={searchMatches?.length ?? 0}
                onPick={revealAndFocus}
                onActiveChange={setSearchActive}
              />

              <span aria-hidden className="mx-1 h-5 w-px bg-border/70" />

              <GraphFilters
                nodeTypeGroups={nodeTypeGroups}
                hiddenLabels={hiddenLabels}
                onToggleLabel={toggleLabelHidden}
                onToggleCategory={toggleCategoryHidden}
                onSoloLabel={soloLabel}
                onSoloCategory={soloCategory}
                onShowAllLabels={showAllLabels}
                onHideAllLabels={hideAllLabels}
                edgeTypeFacets={edgeTypeFacets}
                hiddenEdgeTypes={hiddenEdgeTypes}
                onToggleEdgeType={toggleEdgeTypeHidden}
                onSoloEdgeType={soloEdgeType}
                onShowAllEdgeTypes={showAllEdgeTypes}
                onHideAllEdgeTypes={hideAllEdgeTypes}
                include={include}
                onToggleInclude={toggleInclude}
                onIncludeAll={includeAll}
                onIncludeNone={includeNone}
                repoName={repoName}
                onRepoNameChange={setRepoName}
                prNumber={prNumber}
                onPrNumberChange={setPrNumber}
                limit={limit}
                onLimitChange={setLimit}
                badgeCount={filterBadgeCount}
                onResetFilters={resetFilters}
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setLabelMode((m) => (m === "auto" ? "all" : "auto"))
                }
                className="h-8 gap-1.5 px-2 text-[13px] font-medium"
                title={
                  labelMode === "auto"
                    ? "Relationship labels appear on hover and zoom — click to show all"
                    : "All relationship labels shown — click for automatic density"
                }
              >
                <Tags className="h-3.5 w-3.5" />
                {labelMode === "auto" ? "Auto" : "All"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTimelineOpen((v) => !v)}
                aria-pressed={timelineOpen}
                className={cn(
                  "h-8 gap-1.5 px-2 text-[13px] font-medium",
                  timelineOpen && "bg-muted text-foreground",
                )}
                title={
                  timelineOpen
                    ? "Hide the timeline panel"
                    : "Show pot activity beside the graph"
                }
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Timeline
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={collapseExpanded}
                disabled={expandedCount === 0}
                className="h-8 w-8"
                title="Collapse all expanded neighbourhoods"
                aria-label="Collapse all expanded neighbourhoods"
              >
                <Shrink className="h-4 w-4" />
              </Button>
            </GlassPanel>

            {neo4jDown ? (
              <GlassPanel className="pointer-events-auto flex max-w-sm items-start gap-2.5 px-3.5 py-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">
                    Graph backend not reachable
                  </p>
                  <p
                    className="truncate text-[11px] text-muted-foreground"
                    title={overview.message}
                  >
                    {overview.message}
                  </p>
                </div>
              </GlassPanel>
            ) : null}
          </div>
          <GraphLegend
            className="pointer-events-auto hidden sm:block"
            categories={legendCategories}
            onToggleCategory={toggleCategoryHidden}
            onSoloCategory={soloCategory}
          />
        </div>

        {/* Right rail: stats (top) + inspector (fills the rest when open) */}
        <div className="pointer-events-none absolute bottom-3 right-3 top-3 z-20 flex w-[min(21rem,calc(100vw-1.5rem))] flex-col items-end gap-3">
          <GraphStatsPanel
            className="pointer-events-auto"
            nodeCount={graphNodes.length}
            edgeCount={graphEdges.length}
            totalNodeCount={eligibleNodes.length}
            totalEdgeCount={eligibleEdges.length}
            trimmable={eligibleNodes.length > CORE_RENDER_LIMIT * 1.5}
            showingAll={showAll}
            onToggleShowAll={() => setShowAll((v) => !v)}
            edgeMode={edgeMode}
            onToggleEdgeMode={() =>
              setEdgeMode((m) => (m === "key" ? "all" : "key"))
            }
            refreshing={refreshing}
            onRefresh={refreshAll}
            onOpenDetails={() => setDetailsOpen(true)}
          />
          {selectedNode ? (
            <NodeInspectorPanel
              className="pointer-events-auto min-h-0 w-full flex-1"
              node={selectedNode}
              onClose={() => setSelectedEntityKey(null)}
              edgeColorMap={edgeColorMap}
              edgeFallback={edgeFallbackColor(dark)}
            />
          ) : null}
        </div>

        <GraphDetailsSheet
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          overview={overview}
          onPickEntity={(key) => {
            revealAndFocus(key);
            setDetailsOpen(false);
          }}
        />
      </div>

      {timelineOpen ? (
        <TimelineSidePanel
          potId={potId}
          dark={dark}
          scopeKey={selectedEntityKey}
          scopeName={selectedName}
          knownKeys={knownKeys}
          onFocusEvent={revealAndFocus}
          onClose={() => setTimelineOpen(false)}
        />
      ) : null}
    </div>
  );
}
