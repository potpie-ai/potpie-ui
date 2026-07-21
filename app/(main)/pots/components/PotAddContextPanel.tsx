"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Link as LinkIcon, Send } from "lucide-react";
import PotService from "@/services/PotService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { SharedMarkdown } from "@/components/chat/SharedMarkdown";
import { cn } from "@/lib/utils";
import {
  MonoChip,
  PotPage,
  SectionHeader,
  StatusDot,
  type StatusTone,
} from "./kit";

type Props = { potId: string };

const URL_ONLY_REGEX = /^https?:\/\/\S+$/i;

const STATUS_TONES: Record<string, StatusTone> = {
  queued: "warn",
  processing: "busy",
  done: "ok",
  error: "error",
};

type SubmitResult =
  | { kind: "success"; eventId: string; status: string }
  | { kind: "error"; message: string };

function deriveTitle(content: string): string {
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const stripped = line.replace(/^#{1,6}\s+/, "").trim();
    if (stripped) return stripped.slice(0, 80);
  }
  return "Untitled note";
}

export default function PotAddContextPanel({ potId }: Props) {
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<SubmitResult | null>(null);

  const trimmed = body.trim();
  const isUrlOnly = useMemo(() => URL_ONLY_REGEX.test(trimmed), [trimmed]);

  const handleSubmit = async () => {
    if (!trimmed) {
      toast.error("Add some content or a URL");
      return;
    }
    setSubmitting(true);
    try {
      const out = await PotService.submitRawIngestion(potId, {
        name: deriveTitle(trimmed),
        content: isUrlOnly ? undefined : trimmed,
        url: isUrlOnly ? trimmed : undefined,
      });
      toast.success(`Submitted — event ${out.event_id.slice(0, 8)} is ${out.status}`);
      setLastResult({ kind: "success", eventId: out.event_id, status: out.status });
      setBody("");
      setMode("write");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to submit";
      toast.error(message);
      setLastResult({ kind: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PotPage width="reading">
      <div className="space-y-5">
        <SectionHeader
          title="Add context"
          description="Notes, markdown, or a URL — anything you paste here is ingested into this pot's memory."
          actions={
            <div
              role="tablist"
              aria-label="Editor mode"
              className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5"
            >
              {(["write", "preview"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  disabled={m === "preview" && !trimmed}
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs capitalize transition-colors",
                    mode === m
                      ? "bg-background font-medium text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                    m === "preview" && !trimmed && "cursor-not-allowed opacity-50"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          }
        />

        {mode === "write" ? (
          <Textarea
            rows={8}
            placeholder={"# Auth design decisions\n\nNotes, markdown, or a URL — paste anything…"}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (lastResult) setLastResult(null);
            }}
            className="min-h-[10rem] resize-y text-sm leading-relaxed placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        ) : (
          <div className="min-h-[10rem] overflow-x-auto rounded-md border border-input bg-card px-3 py-2 text-sm">
            {trimmed ? (
              <SharedMarkdown content={trimmed} />
            ) : (
              <p className="text-[13px] text-muted-foreground">
                Nothing to preview yet.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {isUrlOnly ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <LinkIcon className="h-3.5 w-3.5 shrink-0" />
              URL detected — an agent will fetch and ingest the page.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Markdown supported. The first heading or line becomes the title.
            </p>
          )}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !trimmed}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Submitting…" : "Add to pot"}
          </Button>
        </div>

        {lastResult ? (
          <div className="border-t border-border/60 pt-4">
            {lastResult.kind === "success" ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
                <StatusDot
                  tone={STATUS_TONES[lastResult.status] ?? "idle"}
                  pulse={
                    lastResult.status === "queued" ||
                    lastResult.status === "processing"
                  }
                />
                <span title={lastResult.eventId}>
                  Submitted — event{" "}
                  <MonoChip>{lastResult.eventId.slice(0, 8)}</MonoChip> is{" "}
                  {lastResult.status}.
                </span>
                <Link
                  href={`/pots/${potId}/events`}
                  className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Track it on events
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <p className="text-[13px] text-rose-600 dark:text-rose-400">
                {lastResult.message}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </PotPage>
  );
}
