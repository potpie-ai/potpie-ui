"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePots, useInvalidatePots } from "@/lib/hooks/usePots";
import { PotInvitationBanner } from "@/app/(main)/pots/components/PotInvitationBanner";
import { PotContextProvider } from "./PotContext";

const SECTIONS = [
  { slug: "overview", label: "Overview" },
  { slug: "graph", label: "Graph" },
  { slug: "agent", label: "Agent setup" },
  { slug: "users", label: "Users" },
  { slug: "sources", label: "Sources" },
  { slug: "events", label: "Events" },
  { slug: "add-context", label: "Add Context" },
] as const;

export default function PotLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ potId: string }>();
  const pathname = usePathname();
  const potRef = params?.potId;

  const { data: pots, isLoading, isError } = usePots();
  const invalidatePots = useInvalidatePots();

  const pot = useMemo(
    () => pots?.find((p) => p.id === potRef || p.slug === potRef) ?? null,
    [pots, potRef]
  );

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <p className="text-muted-foreground">Loading pot…</p>
        </div>
      </div>
    );
  }

  if (isError || !pot) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Pot not found</h1>
          <p className="text-sm text-muted-foreground">
            This pot doesn&apos;t exist or you don&apos;t have access to it.
          </p>
        </div>
      </div>
    );
  }

  const potLabel = pot.slug || pot.id;
  const isOwner = pot.role === "owner";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{potLabel}</h1>
          <p className="text-sm text-muted-foreground">
            Manage members, sources, integrations, and ingestion for this pot.
          </p>
        </div>

        {pot.pending_invitation ? (
          <PotInvitationBanner
            invitation={pot.pending_invitation}
            potLabel={potLabel}
          />
        ) : null}

        <nav className="flex gap-1 border-b border-border/60">
          {SECTIONS.map((s) => {
            const href = `/pots/${pot.slug || pot.id}/${s.slug}`;
            const active = pathname === href;
            return (
              <Link
                key={s.slug}
                href={href}
                className={cn(
                  "inline-flex h-9 items-center whitespace-nowrap rounded-t-md px-3 text-sm font-medium transition-colors",
                  "hover:text-foreground",
                  active
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>

        <div className="pt-2">
          <PotContextProvider
            value={{ pot, isOwner, refetchPots: invalidatePots }}
          >
            {children}
          </PotContextProvider>
        </div>
      </div>
    </div>
  );
}
