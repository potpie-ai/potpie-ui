"use client";

// Typeahead search over every node the explorer has loaded (rendered or not).
// Owns only input/dropdown mechanics — the explorer computes the ranked
// results and decides what picking one does (reveal + select + focus).
//
// While the input is focused with a non-empty query the explorer dims every
// non-matching node on the canvas, so typing doubles as a live filter.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Search, X } from "lucide-react";
import { GlassPanel } from "@/app/(main)/pots/components/kit";
import { cn } from "@/lib/utils";
import { categoryDisplay } from "./ontology";

export type GraphSearchResult = {
  id: string;
  name: string;
  labels: string[];
  category: string | null;
  degree: number;
  /** Unloaded frontier stub (grey on the canvas). */
  frontier: boolean;
  /** Loaded but currently not rendered (trimmed or type-filtered). */
  offCanvas: boolean;
};

export type GraphSearchProps = {
  query: string;
  onQueryChange: (query: string) => void;
  /** Ranked matches for the current query; null while the query is empty. */
  results: GraphSearchResult[] | null;
  /** Shown under "Most connected" when focused with an empty query. */
  suggestions: GraphSearchResult[];
  totalMatches: number;
  onPick: (id: string) => void;
  /** True while the search should drive the canvas dim (focused + query). */
  onActiveChange: (active: boolean) => void;
  className?: string;
};

const MAX_ROWS = 24;

export default function GraphSearch({
  query,
  onQueryChange,
  results,
  suggestions,
  totalMatches,
  onPick,
  onActiveChange,
  className,
}: GraphSearchProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const [focused, setFocused] = useState(false);
  const [cursor, setCursor] = useState(0);

  const hasQuery = query.trim().length > 0;
  const rows = useMemo(
    () => (hasQuery ? (results ?? []) : suggestions).slice(0, MAX_ROWS),
    [hasQuery, results, suggestions],
  );
  // Stay open on zero matches so "no matches" is said rather than implied.
  const open = focused && (rows.length > 0 || hasQuery);

  // The canvas dim tracks "focused with a query", never a blurred leftover.
  useEffect(() => {
    onActiveChange(focused && hasQuery);
  }, [focused, hasQuery, onActiveChange]);

  useEffect(() => {
    setCursor(0);
  }, [query, rows.length]);

  const pick = useCallback(
    (id: string) => {
      onPick(id);
      onQueryChange("");
      inputRef.current?.blur();
    },
    [onPick, onQueryChange],
  );

  // "/" or Cmd/Ctrl+K jumps to search from anywhere on the screen.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isSlash = e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey;
      const isCmdK = e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey);
      if (!isSlash && !isCmdK) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (rows.length === 0) return;
        setCursor((c) => {
          const next =
            e.key === "ArrowDown"
              ? (c + 1) % rows.length
              : (c - 1 + rows.length) % rows.length;
          listRef.current
            ?.querySelector(`[data-index="${next}"]`)
            ?.scrollIntoView({ block: "nearest" });
          return next;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        const row = rows[cursor] ?? rows[0];
        if (row) pick(row.id);
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (hasQuery) onQueryChange("");
        else inputRef.current?.blur();
      }
    },
    [rows, cursor, pick, hasQuery, onQueryChange],
  );

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onInputKeyDown}
          placeholder="Search nodes"
          aria-label="Search graph nodes"
          role="combobox"
          aria-expanded={open}
          aria-controls="pot-graph-search-results"
          className="h-8 w-48 rounded-lg bg-transparent pl-8 pr-8 text-[13px] outline-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-ring/40 md:w-64"
        />
        {hasQuery ? (
          <button
            type="button"
            // mousedown, so the input never blurs before the clear lands
            onMouseDown={(e) => {
              e.preventDefault();
              onQueryChange("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/70 hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : !focused ? (
          <kbd
            aria-hidden
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border/70 bg-muted px-1.5 font-mono text-[10px] text-muted-foreground"
          >
            /
          </kbd>
        ) : null}
      </div>

      {open ? (
        // mousedown is swallowed so clicking the list never blurs the input
        // before the pick handler runs.
        <div
          className="absolute left-0 top-full z-30 mt-2 w-[26rem] max-w-[calc(100vw-2rem)]"
          onMouseDown={(e) => e.preventDefault()}
        >
        <GlassPanel className="overflow-hidden">
          {!hasQuery ? (
            <p className="border-b border-border/60 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">
              Most connected
            </p>
          ) : null}
          {rows.length === 0 ? (
            <p className="px-3 py-2.5 text-[13px] text-muted-foreground">
              No nodes match &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : null}
          <ul
            ref={listRef}
            id="pot-graph-search-results"
            role="listbox"
            className={cn(
              "max-h-[min(50vh,380px)] overflow-y-auto",
              rows.length > 0 && "p-1",
            )}
          >
            {rows.map((row, i) => {
              const meta = categoryDisplay(row.category);
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    data-index={i}
                    role="option"
                    aria-selected={i === cursor}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => pick(row.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left",
                      i === cursor && "bg-muted/70",
                    )}
                  >
                    <span
                      aria-hidden
                      title={meta.label}
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 rounded-full",
                        meta.dot,
                        row.frontier && "opacity-40",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">
                        {row.name}
                      </span>
                      <span className="mt-px block truncate font-mono text-[10px] text-muted-foreground">
                        {row.labels.slice(0, 2).join(" · ") || row.id}
                      </span>
                    </span>
                    {row.frontier ? (
                      <span className="shrink-0 rounded-md border border-dashed border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        unloaded
                      </span>
                    ) : row.offCanvas ? (
                      <span className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        off-canvas
                      </span>
                    ) : null}
                    <span
                      className="shrink-0 font-mono text-[11px] text-muted-foreground"
                      title={`${row.degree} connections`}
                    >
                      {row.degree}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {hasQuery && totalMatches > rows.length ? (
            <p className="border-t border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground">
              {rows.length} of {totalMatches} matches — keep typing to narrow
            </p>
          ) : null}
        </GlassPanel>
        </div>
      ) : null}
    </div>
  );
}
