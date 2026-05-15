"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import type { GraphEdge, GraphNode } from "reagraph";
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Loader2,
  RefreshCw,
  Info,
  X,
} from "lucide-react";

import PotService, {
  GraphOverview,
  ProjectGraph,
  ProjectGraphNode,
  GraphLabelRow,
  GraphEdgeRow,
} from "@/services/PotService";
import { toast } from "@/components/ui/sonner";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ---- Ontology category palette ---------------------------------------------
// Matches categories declared in app/src/context-engine/domain/ontology.py.

type CategoryKey =
  | "scope_identity"
  | "product_architecture"
  | "change_decision"
  | "delivery_operations"
  | "debugging_reliability"
  | "knowledge_evidence"
  | "team_ownership"
  | "quality_drift";

const CATEGORY_ORDER: CategoryKey[] = [
  "scope_identity",
  "product_architecture",
  "change_decision",
  "knowledge_evidence",
  "team_ownership",
  "delivery_operations",
  "debugging_reliability",
  "quality_drift",
];

const CATEGORY_META: Record<
  CategoryKey,
  { label: string; blurb: string; dot: string; bg: string; border: string }
> = {
  scope_identity: {
    label: "Scope & Identity",
    blurb: "Pot, repository, system, service, environment — the skeleton.",
    dot: "bg-sky-500",
    bg: "bg-sky-50",
    border: "border-sky-500",
  },
  product_architecture: {
    label: "Product Architecture",
    blurb: "Capability, feature, component, interface, data store.",
    dot: "bg-violet-500",
    bg: "bg-violet-50",
    border: "border-violet-500",
  },
  change_decision: {
    label: "Change & Decision",
    blurb: "PRs, commits, issues, decisions, constraints, preferences.",
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-500",
  },
  delivery_operations: {
    label: "Delivery & Operations",
    blurb: "Deployments, runbooks, scripts, config, alerts, incidents.",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-500",
  },
  debugging_reliability: {
    label: "Debugging & Reliability",
    blurb: "Bug patterns, investigations, fixes, diagnostic signals.",
    dot: "bg-rose-500",
    bg: "bg-rose-50",
    border: "border-rose-500",
  },
  knowledge_evidence: {
    label: "Knowledge & Evidence",
    blurb: "Documents, conversations, episodes, source references.",
    dot: "bg-indigo-500",
    bg: "bg-indigo-50",
    border: "border-indigo-500",
  },
  team_ownership: {
    label: "Team & Ownership",
    blurb: "Persons, teams, agents, roles — who owns what.",
    dot: "bg-teal-500",
    bg: "bg-teal-50",
    border: "border-teal-500",
  },
  quality_drift: {
    label: "Quality & Drift",
    blurb: "Quality issues, maintenance jobs, materialized paths.",
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

// ---- Small presentational helpers ------------------------------------------

function Bar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full bg-primary transition-all", className)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = "",
  hint,
}: {
  label: string;
  value: React.ReactNode;
  tone?: string;
  hint?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-background p-3", tone)}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-semibold leading-tight">{value}</p>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function formatPct(ratio: number): string {
  if (!Number.isFinite(ratio)) return "—";
  return `${Math.round(ratio * 100)}%`;
}

// ---- Main explorer ----------------------------------------------------------

type Props = { potId: string };

export default function PotGraphExplorer({ potId }: Props) {
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

  const handleRefresh = useCallback(() => {
    void refetchOverview();
  }, [refetchOverview]);

  if (overviewLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading graph overview…
      </div>
    );
  }

  if (!overview) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between py-6">
          <p className="text-sm text-muted-foreground">
            Could not load graph overview for this pot.
          </p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-1 h-4 w-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const neo4jDown = overview.message && overview.message !== "ok";

  return (
    <div className="space-y-4">
      <OverviewHeader
        overview={overview}
        onRefresh={handleRefresh}
        refreshing={overviewRefetching}
      />

      {neo4jDown ? (
        <Card>
          <CardContent className="flex items-start gap-3 py-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
            <div>
              <p className="font-medium">Graph backend not reachable</p>
              <p className="text-muted-foreground">{overview.message}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="schema" className="w-full">
        <TabsList>
          <TabsTrigger value="schema">Schema health</TabsTrigger>
          <TabsTrigger value="edges">Relationships</TabsTrigger>
          <TabsTrigger value="graph">Graph</TabsTrigger>
        </TabsList>
        <TabsContent value="schema" className="pt-2">
          <SchemaHealthPanel overview={overview} />
        </TabsContent>
        <TabsContent value="edges" className="pt-2">
          <RelationshipsPanel overview={overview} />
        </TabsContent>
        <TabsContent value="graph" className="pt-2">
          <GraphVisualizationPanel potId={potId} overview={overview} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---- Header -----------------------------------------------------------------

function OverviewHeader({
  overview,
  onRefresh,
  refreshing,
}: {
  overview: GraphOverview;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const { totals, schema_coverage } = overview;
  const openConflictCount = overview.open_conflicts?.length ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
        <div>
          <CardTitle className="text-base font-semibold">
            Custom schema coverage
          </CardTitle>
          <CardDescription className="text-xs">
            Ontology {overview.ontology_version} · measures how well your
            ingestion is populating the {schema_coverage.total_labels} entity
            types and their relationships.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-4 w-4" />
          )}
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <StatTile
            label="Entities"
            value={totals.entities.toLocaleString()}
            hint={`${totals.canonical_entities} canonical`}
          />
          <StatTile
            label="Edges"
            value={totals.edges.toLocaleString()}
            hint={`${totals.canonical_edges} canonical`}
          />
          <StatTile
            label="Label coverage"
            value={`${schema_coverage.populated_labels}/${schema_coverage.total_labels}`}
            hint={formatPct(schema_coverage.coverage_ratio)}
          />
          <StatTile
            label="Drift"
            value={formatPct(schema_coverage.drift_ratio)}
            hint={`${totals.drift_edges} drift edges · ${totals.entities_without_canonical_label} unlabeled`}
            tone={
              schema_coverage.drift_ratio > 0.25
                ? "border-amber-400 bg-amber-50"
                : ""
            }
          />
          <StatTile
            label="Open conflicts"
            value={openConflictCount}
            hint="predicate-family contradictions"
            tone={openConflictCount > 0 ? "border-rose-400 bg-rose-50" : ""}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Schema health panel ----------------------------------------------------

function SchemaHealthPanel({ overview }: { overview: GraphOverview }) {
  const categoriesByKey = useMemo(() => {
    const m: Record<string, GraphLabelRow[]> = {};
    for (const row of overview.schema_coverage.by_category) {
      m[row.category] = row.labels;
    }
    return m;
  }, [overview.schema_coverage.by_category]);

  const maxLabelCount = useMemo(() => {
    let m = 0;
    for (const r of overview.schema_coverage.by_label) {
      if (r.count > m) m = r.count;
    }
    return m;
  }, [overview.schema_coverage.by_label]);

  const unknownEntries = Object.entries(
    overview.schema_coverage.unknown_labels ?? {},
  ).sort((a, b) => b[1] - a[1]);

  const [filter, setFilter] = useState("");
  const search = filter.trim().toLowerCase();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Entity-type coverage
            </CardTitle>
            <CardDescription className="text-xs">
              Click a category to expand. Empty labels in muted rows mean that
              type of knowledge has not been ingested yet.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter labels…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-8 w-60"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Accordion
          type="multiple"
          defaultValue={CATEGORY_ORDER.filter(
            (c) => (categoriesByKey[c] ?? []).some((l) => l.count > 0),
          )}
        >
          {CATEGORY_ORDER.map((category) => {
            const rows = categoriesByKey[category] ?? [];
            if (rows.length === 0) return null;
            const meta = categoryMeta(category);
            const populated = rows.filter((r) => r.populated).length;
            const total = rows.length;
            const totalEntities = rows.reduce((acc, r) => acc + r.count, 0);
            const filtered = search
              ? rows.filter(
                  (r) =>
                    r.label.toLowerCase().includes(search) ||
                    r.description.toLowerCase().includes(search),
                )
              : rows;
            if (search && filtered.length === 0) return null;
            return (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger className="py-3">
                  <div className="flex flex-1 items-center gap-3 pr-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
                    <span className="text-sm font-medium">{meta.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {populated}/{total} labels populated · {totalEntities.toLocaleString()} entities
                    </span>
                    <div className="ml-auto w-40">
                      <Bar value={populated} max={total} />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2 text-xs text-muted-foreground">
                    {meta.blurb}
                  </p>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Label</th>
                          <th className="px-3 py-2 text-right font-medium">Count</th>
                          <th className="px-3 py-2 text-left font-medium">Required properties</th>
                          <th className="w-36 px-3 py-2 text-left font-medium">Fill</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((row) => (
                          <tr
                            key={row.label}
                            className={cn(
                              "border-b last:border-b-0",
                              !row.populated && "text-muted-foreground",
                            )}
                          >
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{row.label}</span>
                                {row.populated ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                ) : null}
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {row.description}
                              </p>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-xs">
                              {row.count}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {row.required_properties.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">—</span>
                                ) : (
                                  row.required_properties.map((p) => (
                                    <Badge
                                      key={p}
                                      variant="secondary"
                                      className="text-[10px] font-normal"
                                    >
                                      {p}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <Bar value={row.count} max={Math.max(1, maxLabelCount)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {unknownEntries.length > 0 ? (
          <>
            <Separator className="my-3" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Unexpected labels observed ({unknownEntries.length})
              </p>
              <p className="text-[11px] text-muted-foreground">
                Labels outside the canonical ontology. Often code-graph labels
                (FILE, FUNCTION) or extractor-emitted tags — worth reviewing
                for schema drift.
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {unknownEntries.map(([label, count]) => (
                  <Badge
                    key={label}
                    variant="outline"
                    className="text-[11px] font-normal"
                  >
                    {label} · {count}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ---- Relationships panel ----------------------------------------------------

function RelationshipsPanel({ overview }: { overview: GraphOverview }) {
  const canonical = overview.edge_coverage.canonical;
  const nonCanonical = overview.edge_coverage.non_canonical;
  const families = overview.edge_coverage.predicate_families;
  const lifecycle = overview.lifecycle_distribution;

  const maxCanonical = useMemo(
    () => canonical.reduce((m, r) => Math.max(m, r.count), 1),
    [canonical],
  );
  const maxDrift = useMemo(
    () => nonCanonical.reduce((m, r) => Math.max(m, r.count), 1),
    [nonCanonical],
  );
  const [showZero, setShowZero] = useState(false);
  const canonicalShown = canonical.filter((r) => (showZero ? true : r.count > 0));
  const lifecycleEntries = Object.entries(lifecycle).sort((a, b) => b[1] - a[1]);
  const maxLifecycle = lifecycleEntries.reduce((m, [, v]) => Math.max(m, v), 1);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold">
                Canonical edges
              </CardTitle>
              <CardDescription className="text-xs">
                Relationships your ingestion is emitting, sorted by volume.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowZero((v) => !v)}
            >
              {showZero ? "Hide empty" : "Show all"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[420px] pr-2">
            <div className="space-y-1.5">
              {canonicalShown.map((row) => (
                <EdgeRow key={row.edge_type} row={row} max={maxCanonical} />
              ))}
              {canonicalShown.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No canonical edges populated yet.
                </p>
              ) : null}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Predicate families
            </CardTitle>
            <CardDescription className="text-xs">
              Edges bucketed by contradiction family — used for auto-supersession
              on conflicting facts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {families.map((fam) => (
              <div
                key={fam.family}
                className="rounded-md border bg-background px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{fam.family}</p>
                  <span className="text-xs font-mono">{fam.count}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                  {fam.members.map((m) => (
                    <Badge
                      key={m}
                      variant="secondary"
                      className="text-[10px] font-normal"
                    >
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Drift edges
            </CardTitle>
            <CardDescription className="text-xs">
              Non-canonical edge types — a signal that your extractor fell back
              to a generic predicate. High counts of{" "}
              <code className="rounded bg-muted px-1">RELATED_TO</code> mean
              the ingestion is not naming relationships specifically enough.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {nonCanonical.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No drift edges detected. Ingestion is using canonical predicates.
              </p>
            ) : (
              <div className="space-y-1.5">
                {nonCanonical.slice(0, 12).map((row) => (
                  <EdgeRow key={row.edge_type} row={row} max={maxDrift} drift />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Lifecycle distribution
            </CardTitle>
            <CardDescription className="text-xs">
              <code className="rounded bg-muted px-1">lifecycle_status</code>{" "}
              stamped on edges at extraction time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lifecycleEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No lifecycle stamps yet.
              </p>
            ) : (
              <div className="space-y-1.5">
                {lifecycleEntries.map(([status, count]) => (
                  <div key={status} className="flex items-center gap-3 text-sm">
                    <span className="w-28 truncate">{status}</span>
                    <div className="flex-1">
                      <Bar value={count} max={maxLifecycle} />
                    </div>
                    <span className="w-10 text-right font-mono text-xs">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EdgeRow({
  row,
  max,
  drift = false,
}: {
  row: GraphEdgeRow;
  max: number;
  drift?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={cn(
            "font-mono text-xs",
            drift ? "text-amber-700" : "text-foreground",
            row.count === 0 ? "text-muted-foreground" : "",
          )}
        >
          {row.edge_type}
        </span>
        {row.predicate_family ? (
          <Badge variant="outline" className="text-[10px] font-normal">
            {row.predicate_family}
          </Badge>
        ) : null}
        {row.description ? (
          <span className="truncate text-[11px] text-muted-foreground">
            — {row.description}
          </span>
        ) : null}
      </div>
      <div className="w-40">
        <Bar value={row.count} max={Math.max(1, max)} className={drift ? "bg-amber-500" : ""} />
      </div>
      <span className="w-10 text-right font-mono text-xs">{row.count}</span>
    </div>
  );
}

// ---- Graph visualization ---------------------------------------------------

const PROJECT_GRAPH_INCLUDE_GROUPS: Array<{ key: string; label: string }> = [
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

function categoryForLabels(
  labels: string[],
  labelCategoryMap: Record<string, string>,
): CategoryKey | null {
  for (const lbl of labels) {
    const c = labelCategoryMap[lbl];
    if (c) return c as CategoryKey;
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

function GraphVisualizationPanel({
  potId,
  overview,
}: {
  potId: string;
  overview: GraphOverview;
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
    () => new Set(["service_map", "feature_map", "owners", "deployments"]),
  );
  const [repoName, setRepoName] = useState("");
  const [limit, setLimit] = useState(25);
  const [prNumber, setPrNumber] = useState("");
  const [selectedEntityKey, setSelectedEntityKey] = useState<string | null>(
    null,
  );

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
  const [labelMode, setLabelMode] = useState<"auto" | "all">("auto");

  const loadedKeys = useMemo(
    () => new Set((projectGraph.data?.nodes ?? []).map((n) => n.entity_key)),
    [projectGraph.data],
  );

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
      const cat = categoryForLabels(labels, labelCategoryMap);
      nodes.set(key, {
        id: key,
        label: name || key,
        subLabel: labels[0],
        fill: frontier
          ? "#cbd5e1"
          : cat
            ? cssFromTailwindBorder(CATEGORY_META[cat].border)
            : "#94a3b8",
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
        fill: frontier ? "#e2e8f0" : undefined,
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
      graphNodes: Array.from(nodes.values()),
      graphEdges: Array.from(edges.values()),
    };
  }, [
    projectGraph.data,
    labelCategoryMap,
    expanded,
    loadedKeys,
    nodeName,
    overview.top_entities_by_degree,
  ]);

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
                placeholder="repo_name filter"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className="h-8 w-44"
              />
              <Input
                placeholder="pr_number"
                value={prNumber}
                onChange={(e) => setPrNumber(e.target.value.replace(/[^0-9]/g, ""))}
                className="h-8 w-28"
              />
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
            ) : graphNodes.length === 0 ? (
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
                  nodes={graphNodes}
                  edges={graphEdges}
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
        topEntities={overview.top_entities_by_degree}
        onPickTopEntity={(key) => setSelectedEntityKey(key)}
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
  topEntities,
  onPickTopEntity,
}: {
  node: ProjectGraphNode | null;
  onClose: () => void;
  topEntities: GraphOverview["top_entities_by_degree"];
  onPickTopEntity: (entityKey: string) => void;
}) {
  if (!node) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Top entities by degree
          </CardTitle>
          <CardDescription className="text-xs">
            Click one to inspect. These are the most connected nodes in the pot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topEntities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No connected entities yet.
            </p>
          ) : (
            <ScrollArea className="h-[560px] pr-2">
              <ul className="space-y-1.5">
                {topEntities.map((t) => (
                  <li key={t.entity_key}>
                    <button
                      type="button"
                      onClick={() => onPickTopEntity(t.entity_key)}
                      className="flex w-full items-center justify-between gap-2 rounded-md border bg-background px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted/50"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-medium">
                          {t.name || t.entity_key}
                        </span>
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          {t.labels.slice(0, 2).join(" · ")}
                        </span>
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {t.degree}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
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
    <Card>
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
      <CardContent className="space-y-3">
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
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Relationships ({node.relationships.length})
            </p>
            <ScrollArea className="mt-1 h-40 rounded-md border bg-muted/30 p-2">
              <ul className="space-y-1 text-xs">
                {node.relationships.map((rel, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Badge
                      variant={rel.direction === "out" ? "default" : "secondary"}
                      className="text-[10px] font-normal"
                    >
                      {rel.direction === "out" ? "→" : "←"} {rel.type}
                    </Badge>
                    <span className="truncate">
                      {rel.direction === "out"
                        ? rel.target_name || rel.target_key
                        : rel.source_name || rel.source_key}
                    </span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
