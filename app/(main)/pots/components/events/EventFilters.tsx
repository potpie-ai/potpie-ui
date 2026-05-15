"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  expanded: boolean;
  onExpandedChange: (v: boolean) => void;
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

export function EventFilters({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  expanded,
  onExpandedChange,
}: Props) {
  const active = isFiltersActive(filters);
  const update = <K extends keyof EventsFilters>(k: K, v: EventsFilters[K]) =>
    onFiltersChange({ ...filters, [k]: v });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search events…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
              type="button"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onExpandedChange(!expanded)}
          className={cn(
            "gap-1.5 text-xs",
            (expanded || active) && "bg-muted text-foreground",
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {active && (
            <span className="rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0 leading-4">
              !
            </span>
          )}
        </Button>
      </div>

      {expanded && (
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1 min-w-[120px]">
            <span className="text-[11px] text-muted-foreground font-medium">Status</span>
            <Select value={filters.status} onValueChange={(v) => update("status", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="done">Processed</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 min-w-[150px]">
            <span className="text-[11px] text-muted-foreground font-medium">Source</span>
            <Select value={filters.source} onValueChange={(v) => update("source", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="ui_raw_ingest">Added from UI</SelectItem>
                <SelectItem value="github">GitHub</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground font-medium">From</span>
            <Input
              type="datetime-local"
              value={filters.fromDate}
              onChange={(e) => update("fromDate", e.target.value)}
              className="h-8 text-xs w-[175px]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground font-medium">To</span>
            <Input
              type="datetime-local"
              value={filters.toDate}
              onChange={(e) => update("toDate", e.target.value)}
              className="h-8 text-xs w-[175px]"
            />
          </div>

          {active && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onFiltersChange(defaultFilters())}
              className="h-8 text-xs gap-1 self-end"
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
