"use client";

import { useMemo, useState } from "react";
import { Clock, Filter, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PotActivityItem } from "@/services/PotService";
import { formatDate, formatRelative } from "../events/format";
import {
  DEFAULT_WINDOW,
  VERB_CLASSES,
  WINDOW_OPTIONS,
  verbClassColor,
  verbClassLabel,
} from "./constants";
import { useActivityTimeline, type TimelineFilters } from "./useActivityTimeline";

function itemTitle(item: PotActivityItem): string {
  if (item.title && item.title.trim()) return item.title;
  const subject = item.activity_key || item.subject_key || "activity";
  const object = item.object_key ? ` → ${item.object_key}` : "";
  return `${subject}${object}`;
}

function sortByRecency(items: PotActivityItem[]): PotActivityItem[] {
  return [...items].sort((a, b) => {
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return tb - ta;
  });
}

export default function PotTimelinePanel({ potId }: { potId: string }) {
  const [filters, setFilters] = useState<TimelineFilters>({
    service: "",
    window: DEFAULT_WINDOW,
    verbClasses: [],
  });

  const { data, isLoading, isError, error, refetch, isFetching } =
    useActivityTimeline(potId, filters);

  const items = useMemo(() => sortByRecency(data?.items ?? []), [data]);

  const toggleKind = (kind: string) =>
    setFilters((f) => ({
      ...f,
      verbClasses: f.verbClasses.includes(kind)
        ? f.verbClasses.filter((k) => k !== kind)
        : [...f.verbClasses, kind],
    }));

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent activity</CardTitle>
            <p className="text-sm text-muted-foreground">
              What changed in this pot — newest first.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCcw
              className={cn("h-4 w-4 mr-1.5", isFetching && "animate-spin")}
            />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Select
              value={filters.window}
              onValueChange={(v) => setFilters((f) => ({ ...f, window: v }))}
            >
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WINDOW_OPTIONS.map((w) => (
                  <SelectItem key={w.value} value={w.value}>
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            value={filters.service}
            onChange={(e) =>
              setFilters((f) => ({ ...f, service: e.target.value }))
            }
            placeholder="Filter by service (e.g. checkout-api)"
            className="h-8 w-[240px] text-xs"
          />

          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {VERB_CLASSES.map((kind) => {
                const active = filters.verbClasses.includes(kind);
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => toggleKind(kind)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                      active
                        ? verbClassColor(kind)
                        : "border-border/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {verbClassLabel(kind)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading activity…
          </p>
        ) : isError ? (
          <p className="py-8 text-center text-sm text-red-600">
            {error?.message || "Failed to load activity."}
          </p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No activity in this window
            {filters.service ? ` for "${filters.service}"` : ""}.
          </p>
        ) : (
          <ScrollArea className="h-[60vh] pr-3">
            <ul className="space-y-1">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-3 rounded-md border border-transparent px-2 py-2 hover:border-border/60 hover:bg-muted/40"
                >
                  <div className="w-24 shrink-0 pt-0.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        verbClassColor(item.verb_class),
                      )}
                    >
                      {verbClassLabel(item.verb_class)}
                    </Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{itemTitle(item)}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {item.object_key ?? item.subject_key ?? ""}
                      {item.source_system ? ` · ${item.source_system}` : ""}
                    </p>
                  </div>
                  <div
                    className="shrink-0 text-xs text-muted-foreground"
                    title={formatDate(item.timestamp)}
                  >
                    {formatRelative(item.timestamp)}
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
        {data?.coverage && items.length > 0 ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            {items.length} event{items.length === 1 ? "" : "s"} · confidence:{" "}
            {data.coverage}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
