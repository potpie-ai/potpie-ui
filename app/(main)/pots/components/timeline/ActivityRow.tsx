"use client";

// One event on the timeline. The collapsed row is a single scannable line
// (icon disc · title · actor/verb/repo · time); clicking expands the full
// story inline — summary, description, metadata and linked entities — so the
// reading flow never leaves the list.

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowUpRight, ChevronDown, Waypoints } from "lucide-react";
import type { TimelineActivity, TimelineEntityRef } from "@/services/PotService";
import { DefItem, DefList, MonoChip } from "@/app/(main)/pots/components/kit";
import { cn } from "@/lib/utils";
import { categoryTint, verbMeta } from "./ontology";
import { formatTimeOfDay, shortRepo } from "./format";

function EntityChips({
  label,
  refs,
}: {
  label: string;
  refs: TimelineEntityRef[];
}) {
  if (refs.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">
        {label}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {refs.map((r) => (
          <span key={r.key} title={r.key} className="max-w-full">
            <MonoChip className="max-w-[16rem]">{r.name}</MonoChip>
          </span>
        ))}
      </div>
    </div>
  );
}

export type ActivityRowProps = {
  item: TimelineActivity;
  expanded: boolean;
  onToggle: () => void;
};

export default function ActivityRow({
  item,
  expanded,
  onToggle,
}: ActivityRowProps) {
  const params = useParams<{ potId: string }>();
  const potRef = params?.potId;
  const meta = verbMeta(item.verb_class);
  const tint = categoryTint(meta.category);
  const Icon = meta.icon;

  const touched = item.touched ?? [];
  const mentions = item.mentions ?? [];

  return (
    <li className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          "group -mx-3 flex w-[calc(100%+1.5rem)] items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
          expanded ? "bg-muted/50" : "hover:bg-muted/60",
        )}
      >
        {/* Icon disc sits on the day rail; solid bg masks the line under it. */}
        <span
          className={cn(
            "relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background",
            tint.disc,
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", tint.icon)} strokeWidth={1.75} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span
              className="truncate text-[13px] font-medium text-foreground"
              title={item.title ?? undefined}
            >
              {item.title ?? item.activity_key}
            </span>
            {item.state ? (
              <MonoChip className="shrink-0 uppercase">{item.state}</MonoChip>
            ) : null}
          </span>
          <span className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
            {item.actor ? (
              <span className="font-medium text-foreground/80">
                {item.actor.name}
              </span>
            ) : null}
            <span>{meta.label}</span>
            {item.repo_name ? (
              <>
                <span aria-hidden className="text-muted-foreground/50">
                  ·
                </span>
                <span className="font-mono text-[11px]">
                  {shortRepo(item.repo_name)}
                  {item.number ? `#${item.number}` : ""}
                </span>
              </>
            ) : null}
          </span>
        </span>

        <span className="ml-2 flex shrink-0 items-center gap-1.5 pt-0.5">
          {item.timestamp ? (
            <time
              dateTime={item.timestamp}
              className="font-mono text-[11px] text-muted-foreground"
            >
              {formatTimeOfDay(item.timestamp)}
            </time>
          ) : null}
          <ChevronDown
            aria-hidden
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground/50 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </span>
      </button>

      {expanded ? (
        <div className="space-y-4 pb-4 pl-10 pr-1 pt-1">
          {item.summary ? (
            <p className="text-[13px] leading-relaxed text-foreground">
              {item.summary}
            </p>
          ) : null}
          {item.description && item.description !== item.summary ? (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          ) : null}

          <DefList columns={3}>
            <DefItem label="Kind">
              {item.activity_type
                ? item.activity_type.replaceAll("_", " ")
                : meta.label}
            </DefItem>
            {item.repo_name ? (
              <DefItem label="Repository" mono>
                {item.repo_name}
              </DefItem>
            ) : null}
            {item.source_system ? (
              <DefItem label="Source">{item.source_system}</DefItem>
            ) : null}
            {typeof item.evidence_strength === "number" ? (
              <DefItem label="Evidence" mono>
                {item.evidence_strength.toFixed(2)}
              </DefItem>
            ) : null}
            <DefItem label="Activity key" mono className="col-span-full">
              <span className="break-all">{item.activity_key}</span>
            </DefItem>
          </DefList>

          <EntityChips label="Touched" refs={touched} />
          <EntityChips label="Mentions" refs={mentions} />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {potRef ? (
              <Link
                href={`/pots/${potRef}/graph?focus=${encodeURIComponent(
                  item.activity_key,
                )}&panel=timeline`}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-primary underline-offset-4 hover:underline"
              >
                View in graph
                <Waypoints className="h-3.5 w-3.5" />
              </Link>
            ) : null}
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-primary underline-offset-4 hover:underline"
              >
                {item.url.includes("github.com")
                  ? "Open on GitHub"
                  : "Open source link"}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}
