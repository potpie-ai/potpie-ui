"use client";

// Right-side slide-over inspector for the selected graph node. Rendered only
// while a node is selected; floats over the canvas as a GlassPanel.

import React from "react";
import { X } from "lucide-react";
import type { ProjectGraphNode } from "@/services/PotService";
import { Button } from "@/components/ui/button";
import { GlassPanel, MonoChip } from "@/app/(main)/pots/components/kit";
import { cn } from "@/lib/utils";

export type NodeInspectorPanelProps = {
  node: ProjectGraphNode;
  onClose: () => void;
  /** Colour per relationship type — must match the canvas edge colours. */
  edgeColorMap: Map<string, string>;
  edgeFallback: string;
  className?: string;
};

export default function NodeInspectorPanel({
  node,
  onClose,
  edgeColorMap,
  edgeFallback,
  className,
}: NodeInspectorPanelProps) {
  const props = node.properties ?? {};
  const displayName =
    (props.name as string | undefined) ||
    (props.title as string | undefined) ||
    (props.statement as string | undefined) ||
    node.entity_key;

  const propertyEntries = Object.entries(props).filter(
    ([k]) => !k.startsWith("_"),
  );
  const relationships = node.relationships ?? [];

  return (
    <GlassPanel
      className={cn(
        "flex min-h-0 flex-col overflow-hidden duration-200 animate-in fade-in slide-in-from-right-4",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2
            className="truncate text-sm font-semibold"
            title={String(displayName)}
          >
            {displayName}
          </h2>
          {node.labels.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {node.labels.map((l) => (
                <MonoChip key={l}>{l}</MonoChip>
              ))}
            </div>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="-mr-1 -mt-0.5 h-7 w-7 shrink-0"
          aria-label="Close inspector"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <section>
          <h3 className="text-sm font-semibold">Entity key</h3>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
            {node.entity_key}
          </p>
        </section>

        <section>
          <h3 className="text-sm font-semibold">Properties</h3>
          {propertyEntries.length === 0 ? (
            <p className="mt-1 text-[13px] text-muted-foreground">
              No properties on this node.
            </p>
          ) : (
            <dl className="mt-1 divide-y divide-border/60">
              {propertyEntries.map(([k, v]) => (
                <div
                  key={k}
                  className="grid grid-cols-[96px_1fr] gap-2 py-1.5 text-xs"
                >
                  <dt
                    className="truncate font-mono text-muted-foreground"
                    title={k}
                  >
                    {k}
                  </dt>
                  <dd className="break-all font-mono">
                    {typeof v === "object" ? JSON.stringify(v) : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        {relationships.length > 0 ? (
          <section>
            <h3 className="text-sm font-semibold">
              Relationships
              <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">
                {relationships.length}
              </span>
            </h3>
            <ul className="mt-1 divide-y divide-border/60">
              {relationships.map((rel, idx) => {
                const color = edgeColorMap.get(rel.type) ?? edgeFallback;
                const otherName =
                  rel.direction === "out"
                    ? rel.target_name || rel.target_key
                    : rel.source_name || rel.source_key;
                return (
                  <li key={idx} className="flex items-center gap-2 py-1.5">
                    <span
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px]"
                      style={{ color, borderColor: color }}
                    >
                      {rel.direction === "out" ? "→" : "←"} {rel.type}
                    </span>
                    <span
                      className="min-w-0 truncate text-xs"
                      title={otherName ?? undefined}
                    >
                      {otherName}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </GlassPanel>
  );
}
