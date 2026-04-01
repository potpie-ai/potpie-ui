"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import ELK from "elkjs/lib/elk.bundled.js";
import {
  Background,
  Controls,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "reactflow";
import { GitCommitHorizontal, GitPullRequest, RefreshCw } from "lucide-react";

import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type ProjectOption = {
  id: string;
  repo_name: string;
  branch_name?: string;
  status: string;
};

type GraphNodeRecord = {
  id: string;
  type:
    | "pull_request"
    | "commit"
    | "decision"
    | "file"
    | "code_node"
    | "issue"
    | "developer"
    | "integration";
  data: Record<string, unknown> & { label: string };
};

type GraphEdgeRecord = {
  id: string;
  source: string;
  target: string;
  type: string;
  data?: Record<string, unknown>;
};

type GraphResponse = {
  nodes: GraphNodeRecord[];
  edges: GraphEdgeRecord[];
  stats: Record<string, number>;
  integration_stats?: Record<string, number>;
  selected_pr_number?: number | null;
};

const elk = new ELK();

const nodePalette: Record<GraphNodeRecord["type"], string> = {
  pull_request: "#e7f0ff",
  commit: "#fff0da",
  decision: "#f4e8ff",
  file: "#e8fff1",
  code_node: "#fff4e8",
  issue: "#ffe8e8",
  developer: "#e8faff",
  integration: "#f5f5f5",
};

const borderPalette: Record<GraphNodeRecord["type"], string> = {
  pull_request: "#3b82f6",
  commit: "#f59e0b",
  decision: "#8b5cf6",
  file: "#10b981",
  code_node: "#f97316",
  issue: "#ef4444",
  developer: "#06b6d4",
  integration: "#6b7280",
};

async function layoutGraph(
  graphNodes: GraphNodeRecord[],
  graphEdges: GraphEdgeRecord[]
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const layouted = await elk.layout({
    id: "context-graph",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "140",
      "elk.spacing.nodeNode": "60",
    },
    children: graphNodes.map((node) => ({
      id: node.id,
      width: node.type === "pull_request" ? 260 : 220,
      height: node.type === "decision" ? 120 : 100,
    })),
    edges: graphEdges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  });

  const positionedNodes: Node[] = graphNodes.map((node) => {
    const layoutNode = layouted.children?.find((item) => item.id === node.id);
    return {
      id: node.id,
      position: { x: layoutNode?.x ?? 0, y: layoutNode?.y ?? 0 },
      data: node.data,
      type: "default",
      style: {
        width: node.type === "pull_request" ? 260 : 220,
        borderRadius: 16,
        border: `1.5px solid ${borderPalette[node.type]}`,
        background: nodePalette[node.type],
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
        padding: 12,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });

  const positionedEdges: Edge[] = graphEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
    animated: edge.type === "has_review_decision",
    label: edge.type.replaceAll("_", " "),
    style: {
      stroke:
        edge.type === "has_review_decision"
          ? "#8b5cf6"
          : edge.type === "modified_in"
            ? "#f97316"
            : "#64748b",
      strokeWidth: 1.5,
    },
    labelStyle: { fill: "#475569", fontSize: 11 },
    data: edge.data,
  }));

  return { nodes: positionedNodes, edges: positionedEdges };
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className={cn("rounded-xl border px-3 py-2", tone)}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function ProjectContextGraphExplorer({
  projects,
  loadingProjects,
}: {
  projects: ProjectOption[];
  loadingProjects: boolean;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [graphLimit, setGraphLimit] = useState<number>(12);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [enabledNodeTypes, setEnabledNodeTypes] = useState<Set<string>>(new Set());
  const [enabledEdgeTypes, setEnabledEdgeTypes] = useState<Set<string>>(new Set());
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const selectedNode = useMemo(
    () => graph?.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [graph, selectedNodeId]
  );

  const loadGraph = useCallback(async (projectId: string) => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = (await BranchAndRepositoryService.getProjectContextGraph(projectId, {
        limit: graphLimit,
      })) as GraphResponse;
      setGraph(data);
      setEnabledNodeTypes(new Set(data.nodes.map((node) => node.type)));
      setEnabledEdgeTypes(new Set(data.edges.map((edge) => edge.type)));
      const layouted = await layoutGraph(data.nodes, data.edges);
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
      setSelectedNodeId(data.nodes[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load context graph.");
      setGraph(null);
      setNodes([]);
      setEdges([]);
      setSelectedNodeId(null);
    } finally {
      setLoading(false);
    }
  }, [graphLimit]);

  useEffect(() => {
    if (selectedProjectId) {
      void loadGraph(selectedProjectId);
    }
  }, [selectedProjectId, loadGraph]);

  const handleRefresh = () => {
    void loadGraph(selectedProjectId);
  };

  const filteredNodeIds = useMemo(() => {
    if (!graph) return new Set<string>();
    const search = searchTerm.trim().toLowerCase();
    const visibleNodes = graph.nodes.filter((node) => {
      if (!enabledNodeTypes.has(node.type)) return false;
      if (!search) return true;
      const content = `${node.data.label} ${Object.values(node.data).join(" ")}`.toLowerCase();
      return content.includes(search);
    });
    return new Set(visibleNodes.map((node) => node.id));
  }, [graph, enabledNodeTypes, searchTerm]);

  const filteredEdges = useMemo(
    () =>
      edges.filter(
        (edge) =>
          enabledEdgeTypes.has(edge.type ?? "") &&
          filteredNodeIds.has(edge.source) &&
          filteredNodeIds.has(edge.target)
      ),
    [edges, enabledEdgeTypes, filteredNodeIds]
  );

  const filteredNodes = useMemo(
    () => nodes.filter((node) => filteredNodeIds.has(node.id)),
    [nodes, filteredNodeIds]
  );

  const stats = graph?.stats ?? {
    pull_requests: 0,
    commits: 0,
    decisions: 0,
    files: 0,
    code_nodes: 0,
    issues: 0,
    developers: 0,
    integrations: 0,
  };

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="gap-4">
        <div className="grid w-full gap-2 md:grid-cols-4">
          <Select
            value={selectedProjectId}
            onValueChange={(value) => {
              setSelectedProjectId(value);
            }}
            disabled={loadingProjects || projects.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.repo_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(graphLimit)}
            onValueChange={(value) => setGraphLimit(Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="PR depth" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Latest 5 PRs</SelectItem>
              <SelectItem value="12">Latest 12 PRs</SelectItem>
              <SelectItem value="20">Latest 20 PRs</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Button onClick={handleRefresh} disabled={!selectedProjectId || loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh graph
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-8">
          <StatChip label="PRs" value={stats.pull_requests ?? 0} tone="bg-blue-50" />
          <StatChip label="Commits" value={stats.commits ?? 0} tone="bg-amber-50" />
          <StatChip label="Decisions" value={stats.decisions ?? 0} tone="bg-violet-50" />
          <StatChip label="Files" value={stats.files ?? 0} tone="bg-emerald-50" />
          <StatChip label="Code Nodes" value={stats.code_nodes ?? 0} tone="bg-orange-50" />
          <StatChip label="Issues" value={stats.issues ?? 0} tone="bg-rose-50" />
          <StatChip label="Developers" value={stats.developers ?? 0} tone="bg-cyan-50" />
          <StatChip
            label="Integrations"
            value={stats.integrations ?? 0}
            tone="bg-slate-100"
          />
        </div>
        {graph?.integration_stats && Object.keys(graph.integration_stats).length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-muted-foreground">Integration coverage:</span>
            {Object.entries(graph.integration_stats).map(([name, count]) => (
              <Badge key={name} variant="secondary">
                {name}: {count}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="bg-blue-50">Pull request</Badge>
          <Badge variant="outline" className="bg-amber-50">Commit</Badge>
          <Badge variant="outline" className="bg-violet-50">Decision</Badge>
          <Badge variant="outline" className="bg-emerald-50">File</Badge>
          <Badge variant="outline" className="bg-orange-50">Code node</Badge>
          {selectedProject ? (
            <span className="ml-2">
              Viewing project: <span className="font-medium text-foreground">{selectedProject.repo_name}</span>
            </span>
          ) : null}
        </div>
        {graph ? (
          <div className="grid gap-3 rounded-xl border bg-muted/20 p-3 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Node Types
              </p>
              <div className="flex flex-wrap gap-3">
                {Array.from(new Set(graph.nodes.map((node) => node.type))).map((type) => (
                  <label key={type} className="flex items-center gap-2 text-xs text-foreground">
                    <Checkbox
                      checked={enabledNodeTypes.has(type)}
                      onCheckedChange={(checked) =>
                        setEnabledNodeTypes((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(type);
                          else next.delete(type);
                          return next;
                        })
                      }
                    />
                    {type.replaceAll("_", " ")}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Edge Types
              </p>
              <div className="flex flex-wrap gap-3">
                {Array.from(new Set(graph.edges.map((edge) => edge.type))).map((type) => (
                  <label key={type} className="flex items-center gap-2 text-xs text-foreground">
                    <Checkbox
                      checked={enabledEdgeTypes.has(type)}
                      onCheckedChange={(checked) =>
                        setEnabledEdgeTypes((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(type);
                          else next.delete(type);
                          return next;
                        })
                      }
                    />
                    {type.replaceAll("_", " ")}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-[760px] overflow-hidden rounded-2xl border bg-muted/10">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading context graph...
              </div>
            ) : filteredNodes.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                No nodes match current filters/search. Adjust filters or refresh graph.
              </div>
            ) : (
              <ReactFlow
                nodes={filteredNodes}
                edges={filteredEdges}
                fitView
                proOptions={{ hideAttribution: true }}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              >
                <Background gap={20} size={1} />
                <MiniMap
                  pannable
                  zoomable
                  nodeStrokeWidth={3}
                  nodeColor={(node) =>
                    nodePalette[(graph?.nodes.find((item) => item.id === node.id)?.type ??
                      "pull_request") as GraphNodeRecord["type"]]
                  }
                />
                <Controls />
              </ReactFlow>
            )}
          </div>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-base">Evidence Inspector</CardTitle>
              <CardDescription>
                Click a node in the graph to inspect the underlying context and linked evidence.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[640px] px-6 pb-6">
                {!selectedNode ? (
                  <p className="pt-2 text-sm text-muted-foreground">
                    No node selected yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{selectedNode.type.replaceAll("_", " ")}</Badge>
                        {selectedNode.type === "pull_request" ? (
                          <GitPullRequest className="h-4 w-4 text-blue-600" />
                        ) : null}
                        {selectedNode.type === "commit" ? (
                          <GitCommitHorizontal className="h-4 w-4 text-amber-600" />
                        ) : null}
                      </div>
                      <h3 className="text-lg font-semibold">
                        {String(selectedNode.data.label ?? selectedNode.id)}
                      </h3>
                      <p className="text-xs text-muted-foreground break-all">{selectedNode.id}</p>
                    </div>
                    <Separator />
                    {Object.entries(selectedNode.data)
                      .filter(([key, value]) => key !== "label" && value !== null && value !== "")
                      .map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {key.replaceAll("_", " ")}
                          </p>
                          {Array.isArray(value) ? (
                            <div className="flex flex-wrap gap-2">
                              {value.map((item) => (
                                <Badge key={String(item)} variant="outline">
                                  {String(item)}
                                </Badge>
                              ))}
                            </div>
                          ) : typeof value === "string" && value.length > 240 ? (
                            <pre className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs">
                              {value}
                            </pre>
                          ) : (
                            <p className="text-sm text-foreground break-words">{String(value)}</p>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
