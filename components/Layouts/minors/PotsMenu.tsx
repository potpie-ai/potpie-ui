"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database } from "lucide-react";

import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

import { usePots } from "@/lib/hooks/usePots";

const DEFAULT_VISIBLE = 3;

export default function PotsMenu() {
  const pathname = usePathname();
  const { data: pots } = usePots();

  const [showAll, setShowAll] = useState(false);

  const isPotsRootActive = pathname === "/pots";
  const activePotId = useMemo(() => {
    if (!pathname?.startsWith("/pots/")) return null;
    const rest = pathname.slice("/pots/".length).split("/")[0];
    if (!rest || rest === "join") return null;
    return rest;
  }, [pathname]);

  const visiblePots = useMemo(() => {
    if (!pots) return [];
    return showAll ? pots : pots.slice(0, DEFAULT_VISIBLE);
  }, [pots, showAll]);

  const hiddenCount = (pots?.length ?? 0) - DEFAULT_VISIBLE;
  const hasPots = !!pots && pots.length > 0;

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isPotsRootActive}>
          <Link href="/pots" className="flex gap-2 items-center w-full">
            <Database className="size-5 shrink-0" />
            <span>Context Pots</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      {hasPots && (
        <SidebarMenuSub>
          {visiblePots.map((pot) => {
            const label = pot.slug || pot.id;
            const hrefId = pot.slug || pot.id;
            const active = pot.id === activePotId || pot.slug === activePotId;
            return (
              <SidebarMenuSubItem key={pot.id}>
                <SidebarMenuSubButton asChild isActive={active}>
                  <Link
                    href={`/pots/${hrefId}`}
                    className="truncate"
                    title={label}
                  >
                    <span className="text-muted-foreground">-</span>
                    <span className="truncate">{label}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}

          {hiddenCount > 0 && showAll && (
            <SidebarMenuSubItem>
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className="flex h-7 w-full items-center px-2 text-xs text-muted-foreground hover:text-sidebar-accent-foreground"
              >
                Show less
              </button>
            </SidebarMenuSubItem>
          )}

          {hiddenCount > 0 && !showAll && (
            <SidebarMenuSubItem>
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="flex h-7 w-full items-center justify-center rounded-md bg-blue-600 px-2 text-xs font-medium text-white hover:bg-blue-700"
              >
                View all ({pots!.length})
              </button>
            </SidebarMenuSubItem>
          )}
        </SidebarMenuSub>
      )}
    </>
  );
}
