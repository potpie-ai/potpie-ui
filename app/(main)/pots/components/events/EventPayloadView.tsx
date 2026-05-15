// Renders the variable-shape event payload. Three payload families:
//   - Raw episodes: episode_body holds the actual ingested text.
//   - Decision/record: payload.record nests the agent's structured facts.
//   - Anything else: collapsed raw JSON.

import React from "react";
import { Badge } from "@/components/ui/badge";
import type { PotEvent } from "@/services/PotService";
import { formatDate, stringifyPayload } from "./format";

export function EventPayloadView({ event }: { event: PotEvent }) {
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  const fields: Array<{ label: string; value: React.ReactNode }> = [];

  const episodeBody =
    typeof payload.episode_body === "string" ? payload.episode_body : null;
  const sourceDescription =
    typeof payload.source_description === "string"
      ? payload.source_description
      : null;
  const referenceTime =
    typeof payload.reference_time === "string" ? payload.reference_time : null;
  const record =
    payload.record && typeof payload.record === "object"
      ? (payload.record as Record<string, unknown>)
      : null;

  if (sourceDescription) {
    fields.push({
      label: "Source",
      value: (
        <span className="font-mono text-[11px]">{sourceDescription}</span>
      ),
    });
  }
  if (referenceTime) {
    fields.push({
      label: "Reference time",
      value: (
        <span className="text-[11px] text-muted-foreground">
          {formatDate(referenceTime)}
        </span>
      ),
    });
  }

  const recordBlock = record ? <RecordBlock record={record} /> : null;
  const hasContent = !!episodeBody || !!recordBlock || fields.length > 0;
  if (!hasContent) return null;

  return (
    <div className="space-y-2 rounded-md border border-border/50 bg-muted/15 px-3 py-3">
      {fields.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {fields.map((f) => (
            <span key={f.label} className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {f.label}
              </span>
              {f.value}
            </span>
          ))}
        </div>
      ) : null}
      {recordBlock}
      {episodeBody ? (
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Episode body
          </p>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded bg-background/70 p-3 text-[11px] leading-5 text-foreground">
            {episodeBody}
          </pre>
        </div>
      ) : null}
      <details>
        <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground hover:text-foreground">
          Raw payload
        </summary>
        <pre className="mt-1.5 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-background/70 p-2 text-[11px] leading-4 text-foreground">
          {stringifyPayload(event.payload)}
        </pre>
      </details>
    </div>
  );
}

function RecordBlock({ record }: { record: Record<string, unknown> }) {
  const summary = typeof record.summary === "string" ? record.summary : null;
  const recordType = typeof record.type === "string" ? record.type : null;
  const visibility =
    typeof record.visibility === "string" ? record.visibility : null;
  const confidence =
    typeof record.confidence === "number" ? record.confidence : null;
  const details =
    record.details && typeof record.details === "object"
      ? (record.details as Record<string, unknown>)
      : null;
  const sourceRefs = Array.isArray(record.source_refs)
    ? record.source_refs.filter(
        (s): s is string => typeof s === "string" && s.length > 0,
      )
    : [];

  return (
    <div className="space-y-2 rounded-md border border-border/50 bg-background/60 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {recordType ? (
          <Badge variant="secondary" className="text-[10px] capitalize">
            {recordType}
          </Badge>
        ) : null}
        {visibility ? (
          <Badge variant="outline" className="text-[10px] capitalize">
            {visibility}
          </Badge>
        ) : null}
        {confidence != null ? (
          <Badge variant="outline" className="text-[10px]">
            confidence {Math.round(confidence * 100)}%
          </Badge>
        ) : null}
      </div>
      {summary ? (
        <p className="text-sm font-medium leading-snug">{summary}</p>
      ) : null}
      {details
        ? Object.entries(details)
            .filter(([, v]) => typeof v === "string" && v.length > 0)
            .map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {k}
                </p>
                <p className="text-xs leading-snug">{String(v)}</p>
              </div>
            ))
        : null}
      {sourceRefs.length > 0 ? (
        <div className="flex flex-wrap gap-1 pt-1">
          {sourceRefs.map((ref) => (
            <Badge
              key={ref}
              variant="outline"
              className="font-mono text-[10px] font-normal"
            >
              {ref}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
