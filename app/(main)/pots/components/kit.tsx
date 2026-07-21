"use client";

/**
 * Shared visual primitives for the pots workspace.
 *
 * Every pots screen composes these instead of ad-hoc Card wrappers so the
 * whole section reads as one system: hierarchy comes from type, whitespace,
 * and hairline dividers — not from boxes. Tokens come from `.pot-theme`
 * (applied by the pot layout / index page roots).
 */

import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------- widths */

const PAGE_WIDTHS = {
  reading: "max-w-3xl",
  content: "max-w-4xl",
  wide: "max-w-6xl",
  full: "max-w-none",
} as const;

export type PotPageWidth = keyof typeof PAGE_WIDTHS;

/** Standard content column for a pot section page. */
export function PotPage({
  width = "content",
  className,
  children,
}: {
  width?: PotPageWidth;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6 py-8 md:px-8",
        PAGE_WIDTHS[width],
        className
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ headers */

/** Top-of-page header: large title, optional description and actions. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-3",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

/** In-page section header: small title, optional description and actions. */
export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-2",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- def lists */

/** Key–value metadata grid. Children are `DefItem`s. */
export function DefList({
  className,
  children,
  columns = 2,
}: {
  className?: string;
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
}) {
  const cols = {
    1: "sm:grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-4",
  }[columns];
  return (
    <dl className={cn("grid grid-cols-1 gap-x-8 gap-y-5", cols, className)}>
      {children}
    </dl>
  );
}

export function DefItem({
  label,
  children,
  mono = false,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  /** Render the value in the mono data face (ids, slugs, refs). */
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-sm text-foreground",
          mono && "font-mono text-xs"
        )}
      >
        {children}
      </dd>
    </div>
  );
}

/* -------------------------------------------------------------- data bits */

/** Small mono chip for ids, slugs, branch names, counts of things. */
export function MonoChip({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center truncate rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

export type StatusTone = "ok" | "busy" | "warn" | "error" | "idle";

const DOT_TONES: Record<StatusTone, string> = {
  ok: "bg-emerald-500",
  busy: "bg-accent",
  warn: "bg-amber-500",
  error: "bg-rose-500",
  idle: "bg-muted-foreground/40",
};

/** Tiny status dot; `pulse` for live/in-flight states. */
export function StatusDot({
  tone,
  pulse = false,
  className,
}: {
  tone: StatusTone;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex h-2 w-2", className)}>
      {pulse ? (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
            DOT_TONES[tone]
          )}
        />
      ) : null}
      <span
        className={cn(
          "relative inline-flex h-2 w-2 rounded-full",
          DOT_TONES[tone]
        )}
      />
    </span>
  );
}

/* ---------------------------------------------------------------- avatar */

const AVATAR_HUES: Array<[number, number]> = [
  [161, 200], // pine → teal-blue
  [175, 130], // teal → moss
  [200, 161], // blue → pine
  [88, 161], // lime → pine
  [161, 88], // pine → lime
  [210, 175], // blue → teal
];

function hashSeed(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

const AVATAR_SIZES = {
  sm: "h-6 w-6 rounded-md text-[10px]",
  md: "h-9 w-9 rounded-lg text-xs",
  lg: "h-12 w-12 rounded-xl text-sm",
} as const;

/**
 * Deterministic gradient identity tile for a pot — same slug, same gradient,
 * everywhere. The one place gradients are allowed outside hero moments.
 */
export function PotAvatar({
  seed,
  size = "md",
  className,
}: {
  seed: string;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
}) {
  const h = hashSeed(seed || "pot");
  const [h1, h2] = AVATAR_HUES[h % AVATAR_HUES.length];
  const angle = 100 + (h % 140);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center font-semibold uppercase text-white/90 shadow-sm ring-1 ring-black/5",
        AVATAR_SIZES[size],
        className
      )}
      style={{
        backgroundImage: `linear-gradient(${angle}deg, hsl(${h1} 45% 32%), hsl(${h2} 55% 45%))`,
      }}
    >
      {(seed || "?").slice(0, 1)}
    </span>
  );
}

/* ------------------------------------------------------------ empty state */

/** Centered empty state on a fading dot-grid — no boxes. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pot-dots pot-dots-fade flex flex-col items-center justify-center px-6 py-20 text-center",
        className
      )}
    >
      {Icon ? (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children ? (
        <div className="mt-5 flex items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ glass panel */

/**
 * Floating translucent panel for layering UI over canvases (graph screen).
 * The only sanctioned "card-like" surface; reserved for overlay contexts.
 */
export function GlassPanel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-background/85 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_12px_32px_-12px_rgb(0_0_0/0.18)] backdrop-blur-md",
        className
      )}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------- row list */

/**
 * Class for full-width interactive rows in list screens (replaces card
 * grids). Apply to a Next `Link` or button inside a `divide-y` list; the
 * hover wash bleeds slightly past the text column for a native feel.
 */
export const potRowClass =
  "-mx-3 flex items-center gap-3 rounded-lg px-3 py-3.5 transition-colors hover:bg-muted/60";
