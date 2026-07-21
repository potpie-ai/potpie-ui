"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePots, useInvalidatePots } from "@/lib/hooks/usePots";
import { isDemoPotId } from "@/lib/mock/demoPots";
import { PotInvitationBanner } from "@/app/(main)/pots/components/PotInvitationBanner";
import { EmptyState } from "@/app/(main)/pots/components/kit";
import { Skeleton } from "@/components/ui/skeleton";
import { PotContextProvider } from "./PotContext";

const SECTIONS = [
  { slug: "overview", label: "Overview" },
  { slug: "graph", label: "Graph" },
  { slug: "timeline", label: "Timeline" },
  { slug: "sources", label: "Sources" },
  { slug: "events", label: "Events" },
  { slug: "agent", label: "Agent setup" },
  { slug: "users", label: "Members" },
  { slug: "add-context", label: "Add context" },
] as const;

export default function PotLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ potId: string }>();
  const pathname = usePathname();
  const potRef = params?.potId;

  const { data: pots, isLoading, isError, isPlaceholderData } = usePots();
  const invalidatePots = useInvalidatePots();

  const pot = useMemo(() => {
    if (!pots || !potRef) return null;
    // An exact id match always wins. On a slug match a real pot takes
    // precedence over a demo pot (demo pots are prepended in `usePots`), so a
    // real pot whose slug collides with a reserved demo slug (e.g. "potpie")
    // is never shadowed by the frontend-only demo pot.
    const byId = pots.find((p) => p.id === potRef);
    if (byId) return byId;
    const bySlug = pots.filter((p) => p.slug === potRef);
    return bySlug.find((p) => !isDemoPotId(p.id)) ?? bySlug[0] ?? null;
  }, [pots, potRef]);

  // While `usePots` is serving its demo placeholder, the real pots haven't
  // loaded yet — a missing pot here means "still fetching", not "not found".
  // Keep showing the skeleton so a cold deep-link to a real pot doesn't flash
  // the "Pot not found" state before the real fetch settles.
  if (isLoading || (isPlaceholderData && !pot)) {
    return (
      <div className="pot-theme flex h-svh flex-col bg-background text-foreground">
        <div className="shrink-0 space-y-4 px-6 pt-6 md:px-8">
          <Skeleton className="h-4 w-24 bg-muted" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg bg-muted" />
            <Skeleton className="h-6 w-48 bg-muted" />
          </div>
          <div className="flex gap-6 border-b border-border/70 pb-3">
            {SECTIONS.slice(0, 5).map((s) => (
              <Skeleton key={s.slug} className="h-4 w-16 bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !pot) {
    return (
      <div className="pot-theme flex h-svh flex-col bg-background text-foreground">
        <EmptyState
          className="my-auto"
          title="Pot not found"
          description="This pot doesn't exist or you don't have access to it."
        >
          <Link
            href="/pots"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to pots
          </Link>
        </EmptyState>
      </div>
    );
  }

  const potLabel = pot.slug || pot.id;
  const isOwner = pot.role === "owner";

  return (
    <div className="pot-theme flex h-svh flex-col bg-background text-foreground">
      <header className="shrink-0 px-6 pt-5 md:px-8">
        <nav className="flex items-center gap-1 text-[13px] text-muted-foreground">
          <Link
            href="/pots"
            className="transition-colors hover:text-foreground"
          >
            Pots
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="font-medium text-foreground">{potLabel}</span>
        </nav>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{potLabel}</h1>
          <span className="rounded-full border border-border/80 px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
            {pot.role}
          </span>
          {pot.archived_at ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Archived
            </span>
          ) : null}
        </div>

        {pot.pending_invitation ? (
          <PotInvitationBanner
            className="mt-4"
            invitation={pot.pending_invitation}
            potLabel={potLabel}
          />
        ) : null}

        <SectionTabs potPath={pot.slug || pot.id} pathname={pathname} />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <PotContextProvider
          value={{ pot, isOwner, refetchPots: invalidatePots }}
        >
          {children}
        </PotContextProvider>
      </div>
    </div>
  );
}

/**
 * Underline tab rail. Scrolls horizontally at narrow widths with the scrollbar
 * hidden, so edge fades appear whenever more tabs exist in that direction —
 * without them the trailing tabs would be invisibly clipped.
 */
function SectionTabs({
  potPath,
  pathname,
}: {
  potPath: string;
  pathname: string | null;
}) {
  const railRef = useRef<HTMLElement>(null);
  const [fade, setFade] = useState({ left: false, right: false });

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const update = () => {
      const left = rail.scrollLeft > 1;
      const right = rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 1;
      setFade((prev) =>
        prev.left === left && prev.right === right ? prev : { left, right }
      );
    };
    update();
    rail.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(rail);
    return () => {
      rail.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative mt-4">
      <nav
        ref={railRef}
        className="flex gap-1 overflow-x-auto no-scrollbar border-b border-border/70"
      >
        {SECTIONS.map((s) => {
          const href = `/pots/${potPath}/${s.slug}`;
          const active = pathname === href;
          return (
            <Link
              key={s.slug}
              href={href}
              className={cn(
                "relative inline-flex h-9 items-center whitespace-nowrap px-3 text-[13px] font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
              {active ? (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </Link>
          );
        })}
      </nav>
      {fade.left ? (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-px left-0 top-0 w-10 bg-gradient-to-r from-background to-transparent"
        />
      ) : null}
      {fade.right ? (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-px right-0 top-0 w-10 bg-gradient-to-l from-background to-transparent"
        />
      ) : null}
    </div>
  );
}
