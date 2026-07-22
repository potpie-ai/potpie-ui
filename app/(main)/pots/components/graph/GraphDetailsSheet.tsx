"use client";

// Slide-over sheet with the full graph telemetry: a completeness summary
// (cardinality, missing ontology slots, quality flags), schema health per
// ontology category, relationship/edge coverage, and the most connected
// entities. Lives behind the "Details" action so none of these tables ever
// push the canvas around.

import React, { useMemo, useState } from "react";
import { CheckCircle2, Search } from "lucide-react";
import type {
  GraphEdgeRow,
  GraphLabelRow,
  GraphOverview,
} from "@/services/PotService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MonoChip,
  SectionHeader,
  StatusDot,
  type StatusTone,
} from "@/app/(main)/pots/components/kit";
import { cn } from "@/lib/utils";
import { CATEGORY_ORDER, categoryMeta } from "./ontology";

// ---- Small presentational helpers ------------------------------------------

function Bar({
  value,
  max,
  className,
  fillClassName,
}: {
  value: number;
  max: number;
  className?: string;
  fillClassName?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary transition-all",
          fillClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-lg font-semibold leading-tight",
          valueClassName,
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function formatPct(ratio: number): string {
  if (!Number.isFinite(ratio)) return "—";
  return `${Math.round(ratio * 100)}%`;
}

// Rounded percentage that never reports a false 0% or 100% at the extremes.
function formatShare(part: number, whole: number): string {
  if (whole <= 0) return "—";
  const pct = (part / whole) * 100;
  if (pct > 0 && pct < 1) return "<1%";
  if (pct > 99 && pct < 100) return ">99%";
  return `${Math.round(pct)}%`;
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
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={cn(
            "shrink-0 font-mono text-xs",
            drift
              ? "text-amber-700 dark:text-amber-400"
              : "text-foreground",
            row.count === 0 && "text-muted-foreground",
          )}
        >
          {row.edge_type}
        </span>
        {row.predicate_family ? (
          <MonoChip className="shrink-0">{row.predicate_family}</MonoChip>
        ) : null}
        {row.description ? (
          <span
            className="truncate text-[11px] text-muted-foreground"
            title={row.description}
          >
            {row.description}
          </span>
        ) : null}
      </div>
      <Bar
        value={row.count}
        max={Math.max(1, max)}
        className="w-24 shrink-0"
        fillClassName={drift ? "bg-amber-500" : undefined}
      />
      <span className="w-10 shrink-0 text-right font-mono text-xs">
        {row.count}
      </span>
    </div>
  );
}

// ---- Stats band -------------------------------------------------------------

function StatsBand({ overview }: { overview: GraphOverview }) {
  const { totals, schema_coverage } = overview;
  const openConflictCount = overview.open_conflicts?.length ?? 0;
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
      <Stat
        label="Entities"
        value={totals.entities.toLocaleString()}
        hint={`${totals.canonical_entities.toLocaleString()} canonical`}
      />
      <Stat
        label="Edges"
        value={totals.edges.toLocaleString()}
        hint={`${totals.canonical_edges.toLocaleString()} canonical`}
      />
      <Stat
        label="Label coverage"
        value={`${schema_coverage.populated_labels}/${schema_coverage.total_labels}`}
        hint={formatPct(schema_coverage.coverage_ratio)}
      />
      <Stat
        label="Drift"
        value={formatPct(schema_coverage.drift_ratio)}
        hint={`${totals.drift_edges} drift edges · ${totals.entities_without_canonical_label} unlabeled`}
        valueClassName={
          schema_coverage.drift_ratio > 0.25
            ? "text-amber-600 dark:text-amber-400"
            : undefined
        }
      />
      <Stat
        label="Open conflicts"
        value={openConflictCount}
        hint="Predicate-family contradictions"
        valueClassName={
          openConflictCount > 0
            ? "text-rose-600 dark:text-rose-400"
            : undefined
        }
      />
    </div>
  );
}

// ---- Completeness tab ---------------------------------------------------------

// Position within CATEGORY_ORDER, with unknown categories sorted last.
function categoryRank(category: string): number {
  const i = CATEGORY_ORDER.indexOf(category as (typeof CATEGORY_ORDER)[number]);
  return i === -1 ? CATEGORY_ORDER.length : i;
}

function CompletenessTab({ overview }: { overview: GraphOverview }) {
  const { totals, schema_coverage, edge_coverage } = overview;

  const edgeStats = useMemo(() => {
    const rows = edge_coverage.canonical;
    const missing = rows.filter((r) => !(r.populated ?? r.count > 0));
    return {
      total: rows.length,
      populated: rows.length - missing.length,
      missing,
    };
  }, [edge_coverage.canonical]);

  const missingByCategory = useMemo(
    () =>
      schema_coverage.by_category
        .map((cat) => ({
          category: cat.category,
          labels: cat.labels.filter((l) => !l.populated),
        }))
        .filter((c) => c.labels.length > 0)
        .sort((a, b) => categoryRank(a.category) - categoryRank(b.category)),
    [schema_coverage.by_category],
  );

  const categoryRows = useMemo(
    () =>
      [...schema_coverage.by_category].sort(
        (a, b) => categoryRank(a.category) - categoryRank(b.category),
      ),
    [schema_coverage.by_category],
  );
  const maxCategoryEntities = categoryRows.reduce(
    (m, r) => Math.max(m, r.entity_count),
    1,
  );

  const missingLabelCount = missingByCategory.reduce(
    (n, c) => n + c.labels.length,
    0,
  );
  const gapCount = missingLabelCount + edgeStats.missing.length;

  // "Ontology slots" = entity labels + canonical edge types. Completeness is
  // the share of slots with at least one instance — transparent, no weighting.
  const totalSlots = schema_coverage.total_labels + edgeStats.total;
  const populatedSlots = schema_coverage.populated_labels + edgeStats.populated;
  const overallRatio = totalSlots > 0 ? populatedSlots / totalSlots : 0;

  const unknownLabels = schema_coverage.unknown_labels ?? {};
  const unknownKinds = Object.keys(unknownLabels).length;
  const unknownEntityCount = Object.values(unknownLabels).reduce(
    (a, b) => a + b,
    0,
  );
  const openConflictCount = overview.open_conflicts?.length ?? 0;
  const meanDegree =
    totals.entities > 0
      ? ((2 * totals.edges) / totals.entities).toFixed(1)
      : "—";

  const attention: Array<{ tone: StatusTone; text: string }> = [];
  if (totals.drift_edges > 0) {
    attention.push({
      tone: "warn",
      text: `${totals.drift_edges.toLocaleString()} drift ${
        totals.drift_edges === 1 ? "edge uses" : "edges use"
      } non-canonical predicates — see Relationships → Drift edges.`,
    });
  }
  if (totals.entities_without_canonical_label > 0) {
    attention.push({
      tone: "warn",
      text: `${totals.entities_without_canonical_label.toLocaleString()} ${
        totals.entities_without_canonical_label === 1
          ? "entity carries"
          : "entities carry"
      } no canonical ontology label.`,
    });
  }
  if (unknownKinds > 0) {
    attention.push({
      tone: "warn",
      text: `${unknownKinds} unexpected ${
        unknownKinds === 1 ? "label" : "labels"
      } on ${unknownEntityCount.toLocaleString()} entities — outside the ontology, worth a drift review.`,
    });
  }
  if (openConflictCount > 0) {
    attention.push({
      tone: "error",
      text: `${openConflictCount} open predicate-family ${
        openConflictCount === 1 ? "conflict" : "conflicts"
      } awaiting resolution.`,
    });
  }

  return (
    <div className="space-y-7">
      <section>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-3xl font-semibold leading-none tracking-tight">
            {formatPct(overallRatio)}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {schema_coverage.populated_labels}/{schema_coverage.total_labels}{" "}
            entity labels · {edgeStats.populated}/{edgeStats.total} edge types
            populated
          </p>
        </div>
        <Bar
          value={populatedSlots}
          max={Math.max(1, totalSlots)}
          className="mt-3"
        />
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Share of ontology slots — entity labels plus canonical edge types —
          holding at least one instance.
        </p>
      </section>

      <section>
        <SectionHeader
          title="Cardinality"
          description="Size and shape of the graph beyond the headline counts."
        />
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Stat
            label="Mean degree"
            value={meanDegree}
            hint="edges per entity"
          />
          <Stat
            label="Canonical entities"
            value={formatShare(totals.canonical_entities, totals.entities)}
            hint={`${totals.canonical_entities.toLocaleString()} of ${totals.entities.toLocaleString()}`}
          />
          <Stat
            label="Canonical edges"
            value={formatShare(totals.canonical_edges, totals.edges)}
            hint={`${totals.canonical_edges.toLocaleString()} of ${totals.edges.toLocaleString()}`}
          />
          <Stat
            label="Entity kinds"
            value={`${schema_coverage.populated_labels}/${schema_coverage.total_labels}`}
            hint="ontology labels in use"
          />
          <Stat
            label="Edge kinds"
            value={`${edgeStats.populated}/${edgeStats.total}`}
            hint="canonical edge types in use"
          />
          <Stat
            label="Unexpected labels"
            value={unknownKinds}
            hint={
              unknownKinds > 0
                ? `${unknownEntityCount.toLocaleString()} entities outside the ontology`
                : "all labels canonical"
            }
            valueClassName={
              unknownKinds > 0
                ? "text-amber-600 dark:text-amber-400"
                : undefined
            }
          />
        </div>
      </section>

      <section>
        <SectionHeader
          title="Entities by category"
          description="Where the graph's mass sits across the ontology areas."
        />
        <div className="mt-3 space-y-2">
          {categoryRows.map((row) => {
            const meta = categoryMeta(row.category);
            return (
              <div
                key={row.category}
                className="flex items-center gap-3 text-sm"
              >
                <span
                  className={cn("h-2.5 w-2.5 shrink-0 rounded-full", meta.dot)}
                />
                <span className="w-44 truncate" title={meta.label}>
                  {meta.label}
                </span>
                <Bar
                  value={row.entity_count}
                  max={maxCategoryEntities}
                  className="flex-1"
                />
                <span className="w-12 shrink-0 text-right font-mono text-xs">
                  {row.entity_count.toLocaleString()}
                </span>
                <span
                  className={cn(
                    "w-20 shrink-0 text-right text-[11px]",
                    row.populated_label_count < row.label_count
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground",
                  )}
                >
                  {row.populated_label_count}/{row.label_count} labels
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHeader
          title={gapCount > 0 ? `Missing items (${gapCount})` : "Missing items"}
          description="Ontology slots with zero instances — knowledge not ingested yet."
        />
        {gapCount === 0 ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            Nothing missing — every entity label and canonical edge type has at
            least one instance.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {missingByCategory.map(({ category, labels }) => {
              const meta = categoryMeta(category);
              return (
                <div key={category}>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)}
                    />
                    <p className="text-[13px] font-medium">{meta.label}</p>
                    <span className="text-[11px] text-muted-foreground">
                      {labels.length} missing
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {labels.map((l) => (
                      <span key={l.label} title={l.description}>
                        <MonoChip>{l.label}</MonoChip>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {edgeStats.missing.length > 0 ? (
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
                  <p className="text-[13px] font-medium">Edge types</p>
                  <span className="text-[11px] text-muted-foreground">
                    {edgeStats.missing.length} never emitted
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {edgeStats.missing.map((r) => (
                    <span key={r.edge_type} title={r.description}>
                      <MonoChip>{r.edge_type}</MonoChip>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section>
        <SectionHeader
          title="Needs attention"
          description="Signals that reduce trust in the graph even where slots are populated."
        />
        {attention.length === 0 ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            No drift, unlabeled entities, unexpected labels, or open conflicts.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {attention.map((a) => (
              <li key={a.text} className="flex items-start gap-2.5 text-sm">
                <StatusDot tone={a.tone} className="mt-1.5" />
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---- Schema tab -------------------------------------------------------------

function SchemaTab({ overview }: { overview: GraphOverview }) {
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          Empty labels in muted rows mean that kind of knowledge has not been
          ingested yet.
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            placeholder="Filter labels"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 w-52 pl-8 text-[13px] placeholder:text-muted-foreground/70"
          />
        </div>
      </div>

      <Accordion
        type="multiple"
        defaultValue={CATEGORY_ORDER.filter((c) =>
          (categoriesByKey[c] ?? []).some((l) => l.count > 0),
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
                  <span
                    className={cn("h-2.5 w-2.5 shrink-0 rounded-full", meta.dot)}
                  />
                  <span className="text-sm font-medium">{meta.label}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {populated}/{total} populated ·{" "}
                    {totalEntities.toLocaleString()} entities
                  </span>
                  <Bar
                    value={populated}
                    max={total}
                    className="ml-auto w-28 shrink-0"
                  />
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <p className="mb-1 text-xs text-muted-foreground">
                  {meta.blurb}
                </p>
                <div className="divide-y divide-border/60">
                  {filtered.map((row) => (
                    <div key={row.label} className="flex items-start gap-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              !row.populated && "text-muted-foreground",
                            )}
                          >
                            {row.label}
                          </span>
                          {row.populated ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                          {row.description}
                        </p>
                        {row.required_properties.length > 0 ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {row.required_properties.map((p) => (
                              <MonoChip key={p}>{p}</MonoChip>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex w-24 shrink-0 flex-col items-end gap-1.5 pt-0.5">
                        <span
                          className={cn(
                            "font-mono text-xs",
                            !row.populated && "text-muted-foreground",
                          )}
                        >
                          {row.count}
                        </span>
                        <Bar
                          value={row.count}
                          max={Math.max(1, maxLabelCount)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {unknownEntries.length > 0 ? (
        <div className="border-t border-border/60 pt-4">
          <SectionHeader
            title={`Unexpected labels (${unknownEntries.length})`}
            description="Labels outside the canonical ontology — often code-graph labels (FILE, FUNCTION) or extractor-emitted tags. Worth reviewing for schema drift."
          />
          <div className="mt-3 flex flex-wrap gap-1">
            {unknownEntries.map(([label, count]) => (
              <MonoChip key={label}>
                {label} · {count}
              </MonoChip>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---- Relationships tab ------------------------------------------------------

function RelationshipsTab({ overview }: { overview: GraphOverview }) {
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
  const canonicalShown = canonical.filter((r) =>
    showZero ? true : r.count > 0,
  );
  const lifecycleEntries = Object.entries(lifecycle).sort(
    (a, b) => b[1] - a[1],
  );
  const maxLifecycle = lifecycleEntries.reduce((m, [, v]) => Math.max(m, v), 1);

  return (
    <div className="space-y-7">
      <section>
        <SectionHeader
          title="Canonical edges"
          description="Relationships your ingestion is emitting, sorted by volume."
          actions={
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[13px]"
              onClick={() => setShowZero((v) => !v)}
            >
              {showZero ? "Hide empty" : "Show all"}
            </Button>
          }
        />
        <div className="mt-2 divide-y divide-border/60">
          {canonicalShown.map((row) => (
            <EdgeRow key={row.edge_type} row={row} max={maxCanonical} />
          ))}
          {canonicalShown.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              No canonical edges populated yet.
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <SectionHeader
          title="Predicate families"
          description="Edges bucketed by contradiction family — used for auto-supersession on conflicting facts."
        />
        <div className="mt-2 divide-y divide-border/60">
          {families.map((fam) => (
            <div key={fam.family} className="py-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{fam.family}</p>
                <span className="font-mono text-xs">{fam.count}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {fam.members.map((m) => (
                  <MonoChip key={m}>{m}</MonoChip>
                ))}
              </div>
            </div>
          ))}
          {families.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              No predicate families yet.
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <SectionHeader
          title="Drift edges"
          description="Non-canonical edge types — the extractor fell back to a generic predicate. High RELATED_TO counts mean relationships aren't being named specifically enough."
        />
        {nonCanonical.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No drift edges detected. Ingestion is using canonical predicates.
          </p>
        ) : (
          <div className="mt-2 divide-y divide-border/60">
            {nonCanonical.slice(0, 12).map((row) => (
              <EdgeRow key={row.edge_type} row={row} max={maxDrift} drift />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader
          title="Lifecycle distribution"
          description="lifecycle_status stamped on edges at extraction time."
        />
        {lifecycleEntries.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No lifecycle stamps yet.
          </p>
        ) : (
          <div className="mt-2 space-y-1.5">
            {lifecycleEntries.map(([status, count]) => (
              <div key={status} className="flex items-center gap-3 text-sm">
                <span className="w-28 truncate" title={status}>
                  {status}
                </span>
                <Bar value={count} max={maxLifecycle} className="flex-1" />
                <span className="w-10 text-right font-mono text-xs">
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---- Top entities tab -------------------------------------------------------

function TopEntitiesTab({
  topEntities,
  onPickEntity,
}: {
  topEntities: GraphOverview["top_entities_by_degree"];
  onPickEntity: (entityKey: string) => void;
}) {
  return (
    <div>
      <p className="text-[13px] text-muted-foreground">
        The most connected nodes in this pot. Pick one to inspect it on the
        canvas.
      </p>
      {topEntities.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No connected entities yet.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border/60">
          {topEntities.map((t) => (
            <li key={t.entity_key}>
              <button
                type="button"
                onClick={() => onPickEntity(t.entity_key)}
                className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {t.name || t.entity_key}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {t.labels.slice(0, 2).join(" · ")}
                  </span>
                </span>
                <span
                  className="shrink-0 font-mono text-xs text-muted-foreground"
                  title={`${t.degree} connections`}
                >
                  {t.degree}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- Sheet ------------------------------------------------------------------

export type GraphDetailsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overview: GraphOverview;
  /** Select an entity on the canvas (also closes the sheet). */
  onPickEntity: (entityKey: string) => void;
};

export default function GraphDetailsSheet({
  open,
  onOpenChange,
  overview,
  onPickEntity,
}: GraphDetailsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="pot-theme flex w-full flex-col gap-0 bg-background p-0 text-foreground sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 border-b border-border/60 px-6 py-4 pr-12">
          <SheetTitle className="text-base font-semibold">
            Graph details
          </SheetTitle>
          <SheetDescription className="text-[13px]">
            Ontology {overview.ontology_version} · how well ingestion is
            populating the schema and its relationships.
          </SheetDescription>
        </SheetHeader>

        <div className="shrink-0 border-b border-border/60 px-6 py-4">
          <StatsBand overview={overview} />
        </div>

        <Tabs
          defaultValue="completeness"
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="mx-6 mt-3 w-fit shrink-0">
            <TabsTrigger value="completeness">Completeness</TabsTrigger>
            <TabsTrigger value="schema">Schema health</TabsTrigger>
            <TabsTrigger value="edges">Relationships</TabsTrigger>
            <TabsTrigger value="top">Top entities</TabsTrigger>
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="completeness" className="mt-0">
              <CompletenessTab overview={overview} />
            </TabsContent>
            <TabsContent value="schema" className="mt-0">
              <SchemaTab overview={overview} />
            </TabsContent>
            <TabsContent value="edges" className="mt-0">
              <RelationshipsTab overview={overview} />
            </TabsContent>
            <TabsContent value="top" className="mt-0">
              <TopEntitiesTab
                topEntities={overview.top_entities_by_degree}
                onPickEntity={onPickEntity}
              />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
