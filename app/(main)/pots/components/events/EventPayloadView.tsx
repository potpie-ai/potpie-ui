"use client";

// Renders the variable-shape event payload. Three payload families:
//   - Raw episodes: episode_body holds the actual ingested text.
//   - Decision/record: payload.record nests the agent's structured facts.
//   - Anything else: raw JSON.
// Everything renders flat — labels + mono blocks with copy buttons, no
// nested boxes.

import React, { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PotEvent } from "@/services/PotService";
import { DefItem, DefList, MonoChip } from "../kit";
import { formatDate, stringifyPayload } from "./format";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    void navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }, [text]);
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
      onClick={handleCopy}
      aria-label={label}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : label}
    </Button>
  );
}

function MonoBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <pre
      className={
        "max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 font-mono text-xs leading-5 text-foreground " +
        (className ?? "")
      }
    >
      {children}
    </pre>
  );
}

export function EventPayloadView({ event }: { event: PotEvent }) {
  const payload = (event.payload ?? {}) as Record<string, unknown>;

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

  const rawText = stringifyPayload(event.payload);
  const hasRaw = rawText.length > 0 && rawText !== "{}";

  if (!episodeBody && !record && !sourceDescription && !referenceTime && !hasRaw) {
    return (
      <p className="text-[13px] text-muted-foreground">
        No payload recorded for this event.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {sourceDescription || referenceTime ? (
        <DefList columns={2}>
          {sourceDescription ? (
            <DefItem label="Source" mono>
              {sourceDescription}
            </DefItem>
          ) : null}
          {referenceTime ? (
            <DefItem label="Reference time">{formatDate(referenceTime)}</DefItem>
          ) : null}
        </DefList>
      ) : null}

      {record ? <RecordBlock record={record} /> : null}

      {episodeBody ? (
        <section>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Episode body
            </h3>
            <CopyButton text={episodeBody} />
          </div>
          <MonoBlock className="mt-1.5">{episodeBody}</MonoBlock>
        </section>
      ) : null}

      {hasRaw ? (
        <section>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Raw payload
            </h3>
            <CopyButton text={rawText} />
          </div>
          <MonoBlock className="mt-1.5 max-h-72">{rawText}</MonoBlock>
        </section>
      ) : null}
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

  const detailEntries = details
    ? Object.entries(details).filter(
        ([, v]) => typeof v === "string" && (v as string).length > 0,
      )
    : [];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {recordType ? (
          <MonoChip className="capitalize">{recordType}</MonoChip>
        ) : null}
        {visibility ? (
          <MonoChip className="capitalize">{visibility}</MonoChip>
        ) : null}
        {confidence != null ? (
          <MonoChip>confidence {Math.round(confidence * 100)}%</MonoChip>
        ) : null}
      </div>
      {summary ? (
        <p className="text-sm font-medium leading-snug text-foreground">
          {summary}
        </p>
      ) : null}
      {detailEntries.length > 0 ? (
        <DefList columns={1} className="gap-y-3">
          {detailEntries.map(([k, v]) => (
            <DefItem key={k} label={k}>
              {String(v)}
            </DefItem>
          ))}
        </DefList>
      ) : null}
      {sourceRefs.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {sourceRefs.map((ref) => (
            <MonoChip key={ref}>{ref}</MonoChip>
          ))}
        </div>
      ) : null}
    </section>
  );
}
