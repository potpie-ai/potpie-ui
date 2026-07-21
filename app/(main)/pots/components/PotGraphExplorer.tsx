"use client";

// Full-bleed graph workspace for a pot. The force-graph canvas fills the whole
// area below the tab rail; every piece of chrome (search/filters, legend,
// stats, node inspector) floats over it as a GlassPanel, and the schema /
// relationship tables live in a slide-over details sheet so nothing ever
// pushes the canvas around.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import type {
  PotGraphEdge,
  PotGraphNode,
} from "./graph/PotGraphCanvas";
import { AlertTriangle, RefreshCw, Waypoints } from "lucide-react";

import PotService, {
  GraphOverview,
  ProjectGraph,
  ProjectGraphNode,
} from "@/services/PotService";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, GlassPanel } from "@/app/(main)/pots/components/kit";

import {
  CORE_RENDER_LIMIT,
  DEFAULT_INCLUDE_GROUPS,
  DEFAULT_NODE_LIMIT,
  buildEdgeColorMap,
  categoryForLabels,
  categoryHex,
  edgeFallbackColor,
  frontierNodeColor,
} from "./graph/ontology";
import GraphControls from "./graph/GraphControls";
import GraphLegend from "./graph/GraphLegend";
import GraphStatsPanel from "./graph/GraphStatsPanel";
import NodeInspectorPanel from "./graph/NodeInspectorPanel";
import GraphDetailsSheet from "./graph/GraphDetailsSheet";

// The canvas is pure browser territory (pointer capture, ResizeObserver,
// d3-force layout), so it is loaded client-side only.
const PotGraphCanvas = dynamic(() => import("./graph/PotGraphCanvas"), {
  ssr: false,
  loading: () => <CanvasSkeleton />,
});

type Props = { potId: string };

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
  // a subset of this — see the visibility memo below.
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
          : edgeColorMap.get(type) ?? frontierEdgeFill,
        data: { frontier },
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

  // Progressive disclosure: a few hundred loaded nodes render as an unreadable
  // (and slow) hairball, so by default only the highest-degree core is drawn.
  // Everything else stays data-only until revealed — double-click a node to
  // pull in its hidden neighbours, or "show all" to drop the cap.
  const { graphNodes, graphEdges } = useMemo(() => {
    const trimmed = !showAll && allNodes.length > CORE_RENDER_LIMIT * 1.5;
    if (!trimmed) return { graphNodes: allNodes, graphEdges: allEdges };

    const degree = (key: string) => adjacency.get(key)?.size ?? 0;
    const visible = new Set<string>();
    allNodes
      .filter((n) => !n.data?.frontier)
      .sort((a, b) => degree(b.id) - degree(a.id))
      .slice(0, CORE_RENDER_LIMIT)
      .forEach((n) => visible.add(n.id));
    for (const key of revealed) visible.add(key);
    // Frontier stubs only exist for expanded parents, which are always
    // visible themselves, so keep the whole ring.
    for (const n of allNodes) if (n.data?.frontier) visible.add(n.id);

    const nodes = allNodes
      .filter((n) => visible.has(n.id))
      .map((n) => {
        let hidden = 0;
        for (const nb of adjacency.get(n.id) ?? []) {
          if (!visible.has(nb)) hidden += 1;
        }
        return hidden === 0
          ? n
          : { ...n, data: { ...n.data, hiddenCount: hidden } };
      });
    return {
      graphNodes: nodes,
      graphEdges: allEdges.filter(
        (e) => visible.has(e.source) && visible.has(e.target),
      ),
    };
  }, [allNodes, allEdges, adjacency, revealed, showAll]);

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
  }, []);

  const refreshAll = useCallback(() => {
    onRefreshOverview();
    void projectGraph.refetch();
  }, [onRefreshOverview, projectGraph]);

  const refreshing = overviewRefreshing || projectGraph.isFetching;
  const neo4jDown = Boolean(
    overview.message && overview.message !== "ok",
  );

  const canvasState = projectGraph.isLoading
    ? "loading"
    : projectGraph.isError
      ? "error"
      : graphNodes.length === 0
        ? "empty"
        : "ready";

  return (
    <div className="relative h-full">
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
              description="No entities match the current filters. Toggle more include groups or clear the repo filter."
            >
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
            onSelect={setSelectedEntityKey}
            onExpand={onExpand}
            labelType={labelMode}
            dark={dark}
          />
        )}
      </div>

      {/* Left rail: controls + backend notice (top), legend (bottom) */}
      <div className="pointer-events-none absolute bottom-3 left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-col items-start justify-between gap-3">
        <div className="flex max-w-full flex-col items-start gap-3">
          <GraphControls
            className="pointer-events-auto max-w-full"
            repoName={repoName}
            onRepoNameChange={setRepoName}
            prNumber={prNumber}
            onPrNumberChange={setPrNumber}
            limit={limit}
            onLimitChange={setLimit}
            include={include}
            onToggleInclude={toggleInclude}
            labelMode={labelMode}
            onToggleLabelMode={() =>
              setLabelMode((m) => (m === "auto" ? "all" : "auto"))
            }
            expandedCount={expanded.size + revealed.size}
            onCollapseExpanded={() => {
              setExpanded(new Set());
              setRevealed(new Set());
            }}
            onResetFilters={resetFilters}
          />
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
        <GraphLegend className="pointer-events-auto hidden sm:block" />
      </div>

      {/* Right rail: stats (top) + inspector (fills the rest when open) */}
      <div className="pointer-events-none absolute bottom-3 right-3 top-3 z-20 flex w-[min(21rem,calc(100vw-1.5rem))] flex-col items-end gap-3">
        <GraphStatsPanel
          className="pointer-events-auto"
          nodeCount={graphNodes.length}
          edgeCount={graphEdges.length}
          totalNodeCount={allNodes.length}
          totalEdgeCount={allEdges.length}
          trimmable={allNodes.length > CORE_RENDER_LIMIT * 1.5}
          showingAll={showAll}
          onToggleShowAll={() => setShowAll((v) => !v)}
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
          setSelectedEntityKey(key);
          // Make sure the picked entity is actually on the canvas.
          setRevealed((prev) =>
            prev.has(key) ? prev : new Set(prev).add(key),
          );
          setDetailsOpen(false);
        }}
      />
    </div>
  );
}
