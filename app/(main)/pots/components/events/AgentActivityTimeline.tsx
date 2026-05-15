// Renders the agent reconciliation history for an event.
// In Phase 1 this becomes the live-streaming surface; for Phase 0 it stays a
// faithful render of whatever the detail endpoint returned.

import type {
  PotEvent,
  PotReconciliationRun,
  PotReconciliationWorkEvent,
} from "@/services/PotService";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WORK_EVENT_LABELS } from "./constants";
import {
  formatDate,
  getWorkEventTitle,
  stringifyPayload,
} from "./format";

type Props = {
  event?: PotEvent;
  loading?: boolean;
};

export function AgentActivityTimeline({ event, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2 rounded-md border border-border/50 bg-muted/20 px-3 py-3">
        <div className="h-3 w-28 rounded bg-muted animate-pulse" />
        <div className="h-2.5 w-2/3 rounded bg-muted/70 animate-pulse" />
        <div className="h-2.5 w-1/2 rounded bg-muted/70 animate-pulse" />
      </div>
    );
  }
  if (!event) return null;
  const runs = event.reconciliation_runs ?? [];
  const steps = event.episode_steps ?? [];
  if (runs.length === 0 && steps.length === 0) {
    return (
      <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-3 text-[11px] text-muted-foreground">
        No agent activity recorded for this event yet.
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-border/50 bg-muted/15 px-3 py-3">
      {runs.length > 0 ? (
        <div className="space-y-3">
          {runs.map((run) => (
            <RunBlock key={run.id} run={run} />
          ))}
        </div>
      ) : null}
      {steps.length > 0 ? (
        <div className="border-t border-border/50 pt-2">
          <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
            Episode steps
          </p>
          <div className="flex flex-wrap gap-1.5">
            {steps.map((step) => (
              <Badge
                key={`${step.sequence}-${step.step_kind}`}
                variant="outline"
                className="max-w-full text-[10px]"
              >
                {step.sequence}. {step.step_kind} · {step.status}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RunBlock({ run }: { run: PotReconciliationRun }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          Attempt {run.attempt_number}
        </Badge>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] capitalize",
            run.status === "succeeded"
              ? "bg-green-500/15 text-green-700 border-green-400/40"
              : run.status === "failed"
                ? "bg-red-500/15 text-red-700 border-red-400/40"
                : "bg-blue-500/15 text-blue-700 border-blue-400/40",
          )}
        >
          {run.status}
        </Badge>
        {run.agent_name ? (
          <span className="text-[11px] text-muted-foreground">{run.agent_name}</span>
        ) : null}
        {run.started_at ? (
          <span className="text-[11px] text-muted-foreground">
            {formatDate(run.started_at)}
          </span>
        ) : null}
      </div>
      {run.plan_summary ? (
        <p className="text-xs text-foreground">{run.plan_summary}</p>
      ) : null}
      {run.error ? (
        <p className="text-[11px] text-red-600">{run.error}</p>
      ) : null}
      {Array.isArray(run.work_events) && run.work_events.length > 0 ? (
        <div className="space-y-1.5">
          {run.work_events.map((we) => (
            <WorkEventRow key={we.id} workEvent={we} />
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          No agent work events captured for this run.
        </p>
      )}
    </div>
  );
}

function WorkEventRow({ workEvent }: { workEvent: PotReconciliationWorkEvent }) {
  const payloadText = stringifyPayload(workEvent.payload);
  const hasPayload = payloadText.length > 0 && payloadText !== "{}";
  const body = workEvent.body?.trim();

  return (
    <div className="rounded-md border border-border/40 bg-background/70 px-2.5 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] text-muted-foreground">
          #{workEvent.sequence}
        </span>
        <Badge variant="outline" className="text-[10px]">
          {WORK_EVENT_LABELS[workEvent.event_kind] ?? workEvent.event_kind}
        </Badge>
        <span className="min-w-0 flex-1 truncate text-xs font-medium">
          {getWorkEventTitle(workEvent)}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {formatDate(workEvent.created_at)}
        </span>
      </div>
      {body ? (
        <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-2 text-[11px] leading-4 text-foreground">
          {body}
        </pre>
      ) : null}
      {hasPayload ? (
        <details className="mt-1.5">
          <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground hover:text-foreground">
            Payload
          </summary>
          <pre className="mt-1.5 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-2 text-[11px] leading-4 text-foreground">
            {payloadText}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
