"use client";

// Inline filter toolbar for the events console. One row: search, a ghost
// segmented status control, a ghost source select, and a date-range popover.
// Pure presentation — filter state lives in the parent.

import { CalendarRange, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { EventsFilters } from "./useEventsQuery";

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  filters: EventsFilters;
  onFiltersChange: (f: EventsFilters) => void;
};

const DEFAULT_FILTERS: EventsFilters = {
  status: "all",
  source: "all",
  fromDate: "",
  toDate: "",
  search: "",
};

export function isFiltersActive(f: EventsFilters): boolean {
  return (
    f.status !== "all" ||
    f.source !== "all" ||
    !!f.fromDate ||
    !!f.toDate
  );
}

export function defaultFilters(): EventsFilters {
  return { ...DEFAULT_FILTERS };
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "done", label: "Processed" },
  { value: "error", label: "Error" },
] as const;

function shortDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function EventFilters({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
}: Props) {
  const active = isFiltersActive(filters);
  const update = <K extends keyof EventsFilters>(k: K, v: EventsFilters[K]) =>
    onFiltersChange({ ...filters, [k]: v });

  const hasDates = !!filters.fromDate || !!filters.toDate;
  const dateLabel = hasDates
    ? [
        filters.fromDate ? shortDate(filters.fromDate) : "Start",
        filters.toDate ? shortDate(filters.toDate) : "now",
      ].join(" – ")
    : "Any time";

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {/* Search */}
      <div className="relative w-full sm:w-60">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search events"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 border-border/70 bg-transparent pl-9 pr-8 text-sm shadow-none"
        />
        {search ? (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Clear search"
            type="button"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {/* Status — ghost segmented control */}
      <div
        className="flex h-9 items-center gap-0.5 rounded-lg bg-muted p-0.5"
        role="group"
        aria-label="Filter by status"
      >
        {STATUS_OPTIONS.map((opt) => {
          const selected = filters.status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("status", opt.value)}
              aria-pressed={selected}
              className={cn(
                "rounded-md px-2.5 py-1 text-[13px] transition-colors",
                selected
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Source — ghost select */}
      <Select value={filters.source} onValueChange={(v) => update("source", v)}>
        <SelectTrigger
          aria-label="Filter by source"
          className={cn(
            "h-9 w-auto gap-1.5 border-0 bg-transparent px-2.5 text-[13px] shadow-none transition-colors hover:bg-muted/60 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/60",
            filters.source === "all"
              ? "text-muted-foreground"
              : "font-medium text-foreground",
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="pot-theme">
          <SelectItem value="all">All sources</SelectItem>
          <SelectItem value="ui_raw_ingest">Added from UI</SelectItem>
          <SelectItem value="github">GitHub</SelectItem>
          <SelectItem value="manual">Manual</SelectItem>
        </SelectContent>
      </Select>

      {/* Date range — ghost trigger + popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 gap-1.5 px-2.5 text-[13px] font-normal",
              hasDates
                ? "font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            <CalendarRange className="h-3.5 w-3.5" />
            {dateLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          // The shared PopoverContent defaults to bg-primary/text-black —
          // repaint with the pot-theme popover tokens.
          className="pot-theme w-auto space-y-3 bg-popover p-4 text-popover-foreground"
        >
          <div className="space-y-1.5">
            <label
              className="text-[13px] font-medium text-foreground"
              htmlFor="events-filter-from"
            >
              From
            </label>
            <Input
              id="events-filter-from"
              type="datetime-local"
              value={filters.fromDate}
              onChange={(e) => update("fromDate", e.target.value)}
              className="h-9 w-[215px] text-[13px]"
            />
          </div>
          <div className="space-y-1.5">
            <label
              className="text-[13px] font-medium text-foreground"
              htmlFor="events-filter-to"
            >
              To
            </label>
            <Input
              id="events-filter-to"
              type="datetime-local"
              value={filters.toDate}
              onChange={(e) => update("toDate", e.target.value)}
              className="h-9 w-[215px] text-[13px]"
            />
          </div>
          {hasDates ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-full text-[13px] text-muted-foreground hover:text-foreground"
              onClick={() =>
                onFiltersChange({ ...filters, fromDate: "", toDate: "" })
              }
            >
              Clear dates
            </Button>
          ) : null}
        </PopoverContent>
      </Popover>

      {active ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange(defaultFilters())}
          className="h-9 gap-1 px-2.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Reset
        </Button>
      ) : null}
    </div>
  );
}
