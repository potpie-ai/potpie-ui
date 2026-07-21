// Renders the persisted agent reconciliation history for an event as a
// vertical line + dot timeline (matching LiveActivityTimeline). A faithful
// render of whatever the detail endpoint returned — no data logic here.

import type {
  PotEvent,
  PotReconciliationRun,
  PotReconciliationWorkEvent,
} from "@/services/PotService";
import { Skeleton } from "@/components/ui/skeleton";
import { MonoChip, StatusDot, type StatusTone } from "../kit";
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

const RUN_TONES: Record<string, StatusTone> = {
  succeeded: "ok",
  failed: "error",
  running: "busy",
};

export function AgentActivityTimeline({ event, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2.5">
        <Skeleton className="h-3.5 w-28 rounded bg-muted" />
        <Skeleton className="h-3 w-2/3 rounded bg-muted" />
        <Skeleton className="h-3 w-1/2 rounded bg-muted" />
      </div>
    );
  }
  if (!event) return null;
  const runs = event.reconciliation_runs ?? [];
  const steps = event.episode_steps ?? [];
  if (runs.length === 0 && steps.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground">
        No agent activity recorded for this event yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {runs.map((run) => (
        <RunBlock key={run.id} run={run} />
      ))}
      {steps.length > 0 ? (
        <div className={runs.length > 0 ? "border-t border-border/60 pt-4" : ""}>
          <h4 className="text-sm font-semibold text-foreground">
            Episode steps
          </h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {steps.map((step) => (
              <MonoChip key={`${step.sequence}-${step.step_kind}`}>
                {step.sequence}. {step.step_kind} · {step.status}
              </MonoChip>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RunBlock({ run }: { run: PotReconciliationRun }) {
  const tone = RUN_TONES[run.status] ?? "busy";
  return (
    <section className="space-y-2.5">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h4 className="text-sm font-semibold text-foreground">
          Attempt {run.attempt_number}
        </h4>
        <span className="inline-flex items-baseline gap-1.5 text-[13px] capitalize text-muted-foreground">
          <StatusDot
            tone={tone}
            pulse={tone === "busy"}
            className="self-center"
          />
          {run.status}
        </span>
        {run.agent_name ? (
          <span className="text-[13px] text-muted-foreground">
            {run.agent_name}
          </span>
        ) : null}
        {run.started_at ? (
          <span className="font-mono text-xs text-muted-foreground">
            {formatDate(run.started_at)}
          </span>
        ) : null}
      </div>
      {run.plan_summary ? (
        <p className="text-sm leading-relaxed text-foreground">
          {run.plan_summary}
        </p>
      ) : null}
      {run.error ? (
        <p className="text-[13px] text-rose-600 dark:text-rose-400">
          {run.error}
        </p>
      ) : null}
      {Array.isArray(run.work_events) && run.work_events.length > 0 ? (
        <div className="relative">
          <div
            aria-hidden
            className="absolute bottom-2 left-[3.5px] top-2 w-px bg-border/70"
          />
          <div className="space-y-3.5">
            {run.work_events.map((we) => (
              <WorkEventRow key={we.id} workEvent={we} />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          No agent work events captured for this run.
        </p>
      )}
    </section>
  );
}

function WorkEventRow({ workEvent }: { workEvent: PotReconciliationWorkEvent }) {
  const payloadText = stringifyPayload(workEvent.payload);
  const hasPayload = payloadText.length > 0 && payloadText !== "{}";
  const body = workEvent.body?.trim();
  const tone: StatusTone = workEvent.event_kind === "error" ? "error" : "idle";

  return (
    <div className="relative pl-5">
      <span aria-hidden className="absolute left-0 top-[5px]">
        <StatusDot tone={tone} />
      </span>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-xs font-medium text-muted-foreground">
          {WORK_EVENT_LABELS[workEvent.event_kind] ?? workEvent.event_kind}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {getWorkEventTitle(workEvent)}
        </span>
        <span className="font-mono text-xs text-muted-foreground/60">
          #{workEvent.sequence}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {formatDate(workEvent.created_at)}
        </span>
      </div>
      {body ? (
        <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-2.5 font-mono text-xs leading-5 text-foreground">
          {body}
        </pre>
      ) : null}
      {hasPayload ? (
        <details className="mt-1.5">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            Payload
          </summary>
          <pre className="mt-1.5 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-2.5 font-mono text-xs leading-5 text-foreground">
            {payloadText}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
