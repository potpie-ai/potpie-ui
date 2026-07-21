"use client";

import React, { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  FileSearch,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { MonoChip, SectionHeader } from "@/app/(main)/pots/components/kit";
import PotService, {
  ContextAnswerEnvelope,
  ContextGraphResult,
  ContextSearchResult,
} from "@/services/PotService";

type Props = {
  potId: string;
};

type QueryMode = "answer" | "retrieve" | "agentic";
type QueryResult =
  | ContextGraphResult<ContextAnswerEnvelope>
  | ContextGraphResult<ContextSearchResult[]>;

// Mirrors backend DEFAULT_INTENT_INCLUDES / CONTEXT_RESOLVE_RECIPES
// (app/src/context-engine/domain/agent_context_port.py). Keep in sync.
const INTENT_INCLUDE: Record<string, string[]> = {
  feature: [
    "purpose",
    "feature_map",
    "service_map",
    "docs",
    "tickets",
    "decisions",
    "recent_changes",
    "owners",
    "preferences",
    "source_status",
  ],
  debugging: [
    "prior_fixes",
    "diagnostic_signals",
    "incidents",
    "alerts",
    "causal_chain",
    "recent_changes",
    "config",
    "deployments",
    "owners",
    "source_status",
  ],
  review: [
    "artifact",
    "discussions",
    "owners",
    "recent_changes",
    "decisions",
    "preferences",
    "source_status",
  ],
  operations: [
    "deployments",
    "runbooks",
    "alerts",
    "incidents",
    "scripts",
    "config",
    "owners",
    "source_status",
  ],
  planning: [
    "purpose",
    "feature_map",
    "service_map",
    "docs",
    "tickets",
    "decisions",
    "recent_changes",
    "source_status",
  ],
  docs: ["docs", "decisions", "source_status"],
  onboarding: [
    "purpose",
    "repo_map",
    "service_map",
    "docs",
    "local_workflows",
    "agent_instructions",
    "source_status",
  ],
  refactor: [
    "service_map",
    "repo_map",
    "recent_changes",
    "decisions",
    "owners",
    "source_status",
  ],
  test: [
    "recent_changes",
    "decisions",
    "local_workflows",
    "scripts",
    "source_status",
  ],
  security: [
    "service_map",
    "docs",
    "decisions",
    "incidents",
    "config",
    "owners",
    "source_status",
  ],
  unknown: ["semantic_search", "recent_changes", "decisions", "source_status"],
};

const MODES: Array<{
  value: QueryMode;
  label: string;
  icon: LucideIcon;
  hint: string;
}> = [
  {
    value: "answer",
    label: "Resolve",
    icon: Sparkles,
    hint: "One-shot answer assembled from the graph",
  },
  {
    value: "agentic",
    label: "Agentic",
    icon: Bot,
    hint: "An agent investigates with graph tools before answering",
  },
  {
    value: "retrieve",
    label: "Evidence",
    icon: FileSearch,
    hint: "Raw semantic search results, no synthesis",
  },
];

const IDLE_SUGGESTIONS = [
  "What changed recently?",
  "Which decisions shaped the current architecture?",
  "Who owns the ingestion pipeline?",
];

function compactJson(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value, null, 2);
}

/** Single-line JSON for truncating inline spans (pretty JSON goes in title). */
function inlineJson(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function titleForEvidence(item: Record<string, unknown>, fallback: string) {
  return (
    String(item.name ?? item.title ?? item.uuid ?? item.entity_key ?? fallback)
  );
}

function summaryForEvidence(item: Record<string, unknown>) {
  return String(
    item.summary ??
      item.fact ??
      item.statement ??
      item.description ??
      item.content ??
      "",
  );
}

function sourceRefLabel(ref: string | Record<string, unknown>) {
  if (typeof ref === "string") return ref;
  const value =
    ref.ref ??
    ref.uri ??
    ref.retrieval_uri ??
    ref.title ??
    ref.external_id ??
    ref.source_system ??
    compactJson(ref);
  return String(value);
}

function sourceRefKey(ref: string | Record<string, unknown>, idx: number) {
  if (typeof ref === "string") return `${ref}-${idx}`;
  const value = ref.ref ?? ref.uri ?? ref.external_id ?? ref.title;
  return `${String(value ?? "source-ref")}-${idx}`;
}

export default function PotContextQueryCard({ potId }: Props) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<QueryMode>("answer");
  const [intent, setIntent] = useState("feature");
  const [sourcePolicy, setSourcePolicy] = useState("references_only");
  const [repoName, setRepoName] = useState("");
  const [limit, setLimit] = useState(12);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const include = useMemo(() => INTENT_INCLUDE[intent] ?? [], [intent]);

  const handleQuery = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const scope = repoName.trim() ? { repo_name: repoName.trim() } : {};
      let data: QueryResult;
      if (mode === "retrieve") {
        data = await PotService.queryContextGraph<ContextSearchResult[]>({
          pot_id: potId,
          query: q,
          goal: "retrieve",
          strategy: "semantic",
          include: ["semantic_search"],
          source_policy: sourcePolicy,
          scope,
          limit,
          consumer_hint: "potpie-ui",
          budget: { max_items: limit },
        });
      } else if (mode === "agentic") {
        // The read-side agent drives its own retrieval loop, so it needs a
        // larger budget than the single-shot resolve path.
        data = await PotService.queryContextGraph<ContextAnswerEnvelope>({
          pot_id: potId,
          query: q,
          goal: "investigate",
          strategy: "auto",
          intent,
          include,
          source_policy: sourcePolicy,
          scope,
          limit,
          consumer_hint: "potpie-ui",
          budget: {
            max_items: limit,
            timeout_ms: 30000,
            freshness: "prefer_fresh",
          },
        });
      } else {
        data = await PotService.queryContextGraph<ContextAnswerEnvelope>({
          pot_id: potId,
          query: q,
          goal: "answer",
          strategy: "hybrid",
          intent,
          include,
          source_policy: sourcePolicy,
          scope,
          limit,
          consumer_hint: "potpie-ui",
          budget: {
            max_items: limit,
            timeout_ms: 8000,
            freshness: "prefer_fresh",
          },
        });
      }
      setResult(data);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to query context";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Query this pot's memory"
        description="Ask the context graph what this pot knows — decisions, fixes, owners, recent changes."
        actions={
          <div
            role="group"
            aria-label="Query mode"
            className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5"
          >
            {MODES.map(({ value, label, icon: Icon, hint }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                title={hint}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                  mode === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        }
      />

      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleQuery();
              }
            }}
            placeholder="Ask about decisions, fixes, owners, or project context"
            disabled={loading}
            className="h-9"
          />
          <Button
            onClick={handleQuery}
            disabled={loading || !query.trim()}
            className="h-9 shrink-0"
          >
            {loading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-1.5 h-4 w-4" />
            )}
            Run
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={intent}
            onValueChange={setIntent}
            disabled={mode === "retrieve"}
          >
            <SelectTrigger
              aria-label="Intent"
              title="Intent — picks which context sections the answer draws from"
              className="h-8 w-[130px] text-xs"
            >
              <SelectValue placeholder="Intent" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(INTENT_INCLUDE).map((item) => (
                <SelectItem key={item} value={item} className="capitalize">
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourcePolicy} onValueChange={setSourcePolicy}>
            <SelectTrigger
              aria-label="Source policy"
              title="Source policy — how much source content is returned with results"
              className="h-8 w-[150px] text-xs"
            >
              <SelectValue placeholder="Source policy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="references_only">References only</SelectItem>
              <SelectItem value="summary">Summary</SelectItem>
              <SelectItem value="snippets">Snippets</SelectItem>
              <SelectItem value="verify">Verify</SelectItem>
              <SelectItem value="deep">Deep</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            placeholder="Scope to repo, e.g. potpie-ai/potpie"
            disabled={loading}
            className="h-8 w-64 font-mono text-xs"
          />
          <Input
            type="number"
            min={1}
            max={50}
            value={limit}
            onChange={(e) =>
              setLimit(Math.max(1, Math.min(50, Number(e.target.value) || 12)))
            }
            disabled={loading}
            title="Max items"
            aria-label="Max items"
            className="h-8 w-20 font-mono text-xs"
          />
        </div>

        {mode !== "retrieve" ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground/80">
            <span className="font-medium">Includes</span>{" "}
            <span className="font-mono">
              {include.slice(0, 9).join(" · ")}
              {include.length > 9 ? ` · +${include.length - 9} more` : ""}
            </span>
          </p>
        ) : null}
      </div>

      <div className="border-t border-border/60 pt-5">
        {loading ? (
          <ResultSkeleton />
        ) : error ? (
          <QueryError message={error} onRetry={handleQuery} />
        ) : result ? (
          <QueryResultView result={result} />
        ) : (
          <QueryIdle onPick={setQuery} />
        )}
      </div>
    </section>
  );
}

function ResultSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-5 w-24 rounded-md" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="space-y-2 pt-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

function QueryError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="border-l-2 border-rose-400/80 pl-3">
      <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
        Query failed
      </p>
      <p className="mt-0.5 text-[13px] text-muted-foreground">{message}</p>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRetry}
        className="mt-2 h-7 px-2 text-xs"
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        Try again
      </Button>
    </div>
  );
}

function QueryIdle({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground">
        Results appear here. Try one of these to see what the pot remembers:
      </p>
      <div className="flex flex-wrap gap-2">
        {IDLE_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onPick(suggestion)}
            className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

function SourceRefChips({
  refs,
  max,
}: {
  refs: Array<string | Record<string, unknown>>;
  max: number;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {refs.slice(0, max).map((ref, idx) => (
        <span
          key={sourceRefKey(ref, idx)}
          title={compactJson(ref)}
          className="inline-flex max-w-full"
        >
          <MonoChip className="max-w-full">{sourceRefLabel(ref)}</MonoChip>
        </span>
      ))}
    </div>
  );
}

function QueryResultView({ result }: { result: QueryResult }) {
  const metaFallbacks = Array.isArray(result.meta?.fallbacks)
    ? result.meta?.fallbacks
    : [];

  if (result.goal === "answer" || result.goal === "investigate") {
    const envelope = result.result as ContextAnswerEnvelope;
    const evidence = Array.isArray(envelope.evidence) ? envelope.evidence : [];
    const sourceRefs = Array.isArray(envelope.source_refs)
      ? envelope.source_refs
      : [];
    const agent = envelope.agent;
    const fallbackReason =
      typeof result.meta?.fallback === "string"
        ? (result.meta.fallback as string)
        : null;

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <MonoChip>{result.kind}</MonoChip>
          {envelope.coverage?.status ? (
            <MonoChip>coverage {envelope.coverage.status}</MonoChip>
          ) : null}
          {envelope.quality?.status ? (
            <MonoChip>quality {envelope.quality.status}</MonoChip>
          ) : null}
          {typeof envelope.confidence !== "undefined" ? (
            <MonoChip>confidence {String(envelope.confidence)}</MonoChip>
          ) : null}
        </div>

        <p className="whitespace-pre-wrap text-sm leading-6">
          {envelope.answer?.summary || "No answer summary returned."}
        </p>

        {fallbackReason ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Agent unavailable ({fallbackReason}) — fell back to the
            deterministic resolve path.
          </p>
        ) : null}

        {agent ? <AgentTrace agent={agent} /> : null}

        <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          <CountStat label="changes" value={envelope.answer?.recent_changes} />
          <CountStat label="decisions" value={envelope.answer?.decisions} />
          <CountStat label="owners" value={envelope.answer?.owners} />
          <CountStat label="evidence" value={evidence} />
        </p>

        <EvidenceList items={evidence} />

        {sourceRefs.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Source refs
            </p>
            <SourceRefChips refs={sourceRefs} max={12} />
          </div>
        ) : null}

        <Fallbacks
          fallbacks={[...metaFallbacks, ...(envelope.fallbacks ?? [])]}
        />
      </div>
    );
  }

  const rows = Array.isArray(result.result)
    ? (result.result as ContextSearchResult[])
    : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <MonoChip>{result.kind}</MonoChip>
        <span className="font-mono text-[11px] text-muted-foreground">
          {rows.length} result{rows.length === 1 ? "" : "s"}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="py-2">
          <p className="text-sm text-muted-foreground">
            No matching graph evidence returned.
          </p>
          <p className="mt-0.5 text-[13px] text-muted-foreground/80">
            Try a broader query, raise the limit, or drop the repo scope.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map((row, idx) => {
            const body = row.fact || row.summary;
            return (
              <li key={row.uuid || idx} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p
                    className="min-w-0 truncate text-sm font-medium"
                    title={row.name || row.uuid}
                  >
                    {row.name || row.uuid}
                  </p>
                  {typeof row.score === "number" ? (
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {row.score.toFixed(2)}
                    </span>
                  ) : null}
                </div>
                {body ? (
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                    {body}
                  </p>
                ) : null}
                {row.source_refs?.length ? (
                  <div className="mt-2">
                    <SourceRefChips refs={row.source_refs} max={4} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <Fallbacks fallbacks={metaFallbacks} />
    </div>
  );
}

function CountStat({ label, value }: { label: string; value: unknown }) {
  const count = Array.isArray(value) ? value.length : value ? 1 : 0;
  return (
    <span>
      <span className="font-mono text-xs font-semibold text-foreground">
        {count}
      </span>{" "}
      {label}
    </span>
  );
}

function EvidenceList({ items }: { items: Array<Record<string, unknown>> }) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">Evidence</p>
      <ul className="mt-1 divide-y divide-border/60">
        {items.slice(0, 6).map((item, idx) => {
          const title = titleForEvidence(item, `Evidence ${idx + 1}`);
          const summary = summaryForEvidence(item);
          return (
            <li key={`${title}-${idx}`} className="py-2.5">
              <p className="truncate text-sm font-medium" title={title}>
                {title}
              </p>
              {summary ? (
                <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                  {summary}
                </p>
              ) : (
                <pre className="mt-1 max-h-28 overflow-auto font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {compactJson(item)}
                </pre>
              )}
            </li>
          );
        })}
      </ul>
      {items.length > 6 ? (
        <p className="mt-1 text-[11px] text-muted-foreground/70">
          Showing 6 of {items.length} evidence items.
        </p>
      ) : null}
    </div>
  );
}

function AgentTrace({
  agent,
}: {
  agent: NonNullable<ContextAnswerEnvelope["agent"]>;
}) {
  const steps = Array.isArray(agent.steps) ? agent.steps : [];
  const calls = agent.iterations ?? steps.length;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Agent trace</p>
        <span className="font-mono text-[11px] text-muted-foreground">
          {calls} tool call{calls === 1 ? "" : "s"}
        </span>
      </div>
      {steps.length === 0 ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          The agent answered without calling any tools.
        </p>
      ) : (
        <ol className="mt-2 space-y-1.5 border-l border-border/60 pl-3">
          {steps.map((step, idx) => (
            <li
              key={`${step.tool}-${idx}`}
              className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs"
            >
              <span className="font-mono text-[11px] text-muted-foreground/70">
                {idx + 1}
              </span>
              <span className="font-medium">{step.tool}</span>
              {step.arguments && Object.keys(step.arguments).length > 0 ? (
                <span
                  className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground"
                  title={compactJson(step.arguments)}
                >
                  {inlineJson(step.arguments)}
                </span>
              ) : null}
              <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                {step.result_kind ?? "result"} · {step.result_count ?? 0}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Fallbacks({ fallbacks }: { fallbacks: unknown[] }) {
  if (!fallbacks.length) return null;
  return (
    <div className="border-l-2 border-amber-400/70 pl-3">
      <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
        Fallbacks
      </p>
      <pre className="mt-1 max-h-28 overflow-auto font-mono text-[11px] leading-relaxed text-muted-foreground">
        {compactJson(fallbacks)}
      </pre>
    </div>
  );
}
