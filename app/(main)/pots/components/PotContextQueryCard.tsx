"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Bot, Loader2, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import PotService, {
  ContextAnswerEnvelope,
  ContextGraphResult,
} from "@/services/PotService";

type Props = {
  potId: string;
};

// Resolve = deterministic resolve_context + synthesis (goal=answer).
// Agentic = the read-side agent loop over the 4 read tools (goal=investigate).
// The old "Evidence" (goal=retrieve, include=[semantic_search]) mode was
// dropped: the semantic_search reader was removed with Graphiti.
type QueryMode = "answer" | "agentic";
type QueryResult = ContextGraphResult<ContextAnswerEnvelope>;

// Mirrors the live reader-backed DEFAULT_INTENT_INCLUDES in
// app/src/context-engine/domain/agent_context_port.py. Includes resolve through
// the P9 readers (coding_preferences / infra_topology / timeline / prior_bugs);
// owners / decisions / docs are in the vocabulary but not yet reader-backed, so
// they degrade to `unsupported_include` rather than erroring. Keep in sync with
// the backend. (Sending an empty include + the intent lets the backend expand
// these itself; we mirror them here only to show the user what is fetched.)
const INTENT_INCLUDE: Record<string, string[]> = {
  feature: ["coding_preferences", "infra_topology", "decisions", "owners", "docs"],
  debugging: ["prior_bugs", "infra_topology", "timeline"],
  operations: ["infra_topology", "timeline", "owners"],
  onboarding: ["infra_topology", "coding_preferences", "docs", "owners"],
  review: ["coding_preferences", "decisions", "timeline", "owners"],
};

function compactJson(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value, null, 2);
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

  const include = useMemo(() => INTENT_INCLUDE[intent] ?? [], [intent]);

  const handleQuery = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    try {
      const scope = repoName.trim() ? { repo_name: repoName.trim() } : {};
      const data = await PotService.queryContextGraph<ContextAnswerEnvelope>({
        pot_id: potId,
        query: q,
        // Agentic drives its own retrieval loop (more budget); Resolve is a
        // single-shot deterministic resolve + synthesis.
        goal: mode === "agentic" ? "investigate" : "answer",
        strategy: mode === "agentic" ? "auto" : "hybrid",
        intent,
        include,
        source_policy: sourcePolicy,
        scope,
        limit,
        consumer_hint: "potpie-ui",
        budget: {
          max_items: limit,
          timeout_ms: mode === "agentic" ? 30000 : 8000,
          freshness: "prefer_fresh",
        },
      });
      setResult(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to query context");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Context query
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Runs the unified context graph read API for this pot.
            </p>
          </div>
          <div className="inline-flex rounded-md border bg-background p-1">
            <ModeButton active={mode === "answer"} onClick={() => setMode("answer")}>
              <Sparkles className="h-3.5 w-3.5" />
              Resolve
            </ModeButton>
            <ModeButton active={mode === "agentic"} onClick={() => setMode("agentic")}>
              <Bot className="h-3.5 w-3.5" />
              Agentic
            </ModeButton>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_150px_170px_120px]">
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
          />
          <Select value={intent} onValueChange={setIntent}>
            <SelectTrigger className="h-10">
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
            <SelectTrigger className="h-10">
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
          <Button onClick={handleQuery} disabled={loading || !query.trim()}>
            {loading ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-1 h-4 w-4" />
            )}
            Run
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_120px]">
          <Input
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            placeholder="Optional repo_name scope, e.g. potpie-ai/potpie"
            disabled={loading}
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
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {include.slice(0, 9).map((item) => (
            <Badge key={item} variant="secondary" className="text-[10px] font-normal">
              {item}
            </Badge>
          ))}
        </div>

        {result ? <QueryResultView result={result} /> : null}
      </CardContent>
    </Card>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function QueryResultView({ result }: { result: QueryResult }) {
  const metaFallbacks = Array.isArray(result.meta?.fallbacks)
    ? result.meta?.fallbacks
    : [];

  const envelope = result.result as ContextAnswerEnvelope;
  const evidence = Array.isArray(envelope?.evidence) ? envelope.evidence : [];
  const sourceRefs = Array.isArray(envelope?.source_refs)
    ? envelope.source_refs
    : [];
  const agent = envelope?.agent;
  const fallbackReason =
    typeof result.meta?.fallback === "string"
      ? (result.meta.fallback as string)
      : null;

  return (
    <div className="rounded-md border bg-background p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{result.kind}</Badge>
        {envelope?.coverage?.status ? (
          <Badge variant="secondary">Coverage {envelope.coverage.status}</Badge>
        ) : null}
        {envelope?.quality?.status ? (
          <Badge variant="secondary">Quality {envelope.quality.status}</Badge>
        ) : null}
        {typeof envelope?.confidence !== "undefined" ? (
          <Badge variant="secondary">Confidence {String(envelope.confidence)}</Badge>
        ) : null}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
        {envelope?.answer?.summary || "No answer summary returned."}
      </p>

      {fallbackReason ? (
        <p className="mt-2 text-xs text-amber-700">
          Agent unavailable ({fallbackReason}) — fell back to the
          deterministic resolve path.
        </p>
      ) : null}

      {agent ? <AgentTrace agent={agent} /> : null}

      <Separator className="my-3" />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <CountTile label="Changes" value={envelope?.answer?.recent_changes} />
        <CountTile label="Decisions" value={envelope?.answer?.decisions} />
        <CountTile label="Owners" value={envelope?.answer?.owners} />
        <CountTile label="Evidence" value={evidence} />
      </div>

      <EvidenceList items={evidence} />

      {sourceRefs.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground">Source refs</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {sourceRefs.slice(0, 12).map((ref, idx) => (
              <Badge
                key={sourceRefKey(ref, idx)}
                variant="outline"
                className="max-w-full truncate font-mono text-[10px]"
                title={compactJson(ref)}
              >
                {sourceRefLabel(ref)}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <Fallbacks fallbacks={[...metaFallbacks, ...(envelope?.fallbacks ?? [])]} />
    </div>
  );
}

function CountTile({ label, value }: { label: string; value: unknown }) {
  const count = Array.isArray(value) ? value.length : value ? 1 : 0;
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-semibold">{count}</p>
    </div>
  );
}

function EvidenceList({ items }: { items: Array<Record<string, unknown>> }) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-3 space-y-2">
      {items.slice(0, 6).map((item, idx) => {
        const title = titleForEvidence(item, `Evidence ${idx + 1}`);
        const summary = summaryForEvidence(item);
        return (
          <li key={`${title}-${idx}`} className="rounded-md border bg-muted/20 p-3">
            <p className="truncate text-sm font-medium" title={title}>
              {title}
            </p>
            {summary ? (
              <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                {summary}
              </p>
            ) : (
              <pre className="mt-1 max-h-28 overflow-auto text-xs text-muted-foreground">
                {compactJson(item)}
              </pre>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function AgentTrace({
  agent,
}: {
  agent: NonNullable<ContextAnswerEnvelope["agent"]>;
}) {
  const steps = Array.isArray(agent.steps) ? agent.steps : [];
  return (
    <div className="mt-3 rounded-md border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Agent trace
        </p>
        <Badge variant="secondary" className="text-[10px]">
          {agent.iterations ?? steps.length} tool call
          {(agent.iterations ?? steps.length) === 1 ? "" : "s"}
        </Badge>
      </div>
      {steps.length === 0 ? (
        <p className="mt-2 text-xs italic text-muted-foreground">
          The agent answered without calling any tools.
        </p>
      ) : (
        <ol className="mt-2 space-y-1.5">
          {steps.map((step, idx) => (
            <li
              key={`${step.tool}-${idx}`}
              className="flex flex-wrap items-center gap-1.5 text-xs"
            >
              <Badge variant="outline" className="font-mono text-[10px]">
                {idx + 1}
              </Badge>
              <span className="font-medium">{step.tool}</span>
              {step.arguments && Object.keys(step.arguments).length > 0 ? (
                <span
                  className="truncate font-mono text-[10px] text-muted-foreground"
                  title={compactJson(step.arguments)}
                >
                  {compactJson(step.arguments)}
                </span>
              ) : null}
              <span className="ml-auto text-[10px] text-muted-foreground">
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
    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-medium text-amber-900">Fallbacks</p>
      <pre className="mt-1 max-h-28 overflow-auto text-xs text-amber-900">
        {compactJson(fallbacks)}
      </pre>
    </div>
  );
}
