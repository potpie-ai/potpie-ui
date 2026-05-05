"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Database } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

  const isPotsRootActive = pathname === "/pots";
  const activePotId = useMemo(() => {
    if (!pathname?.startsWith("/pots/")) return null;
    const rest = pathname.slice("/pots/".length).split("/")[0];
    if (!rest || rest === "join") return null;
    return rest;
  }, [pathname]);

  const isPotsSection = pathname?.startsWith("/pots") ?? false;
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (isPotsSection) setOpen(true);
  }, [isPotsSection]);

  const visiblePots = useMemo(() => {
    if (!pots) return [];
    return showAll ? pots : pots.slice(0, DEFAULT_VISIBLE);
  }, [pots, showAll]);

  const hiddenCount = (pots?.length ?? 0) - DEFAULT_VISIBLE;
  const hasPots = !!pots && pots.length > 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <SidebarMenuItem>
        <div className="flex w-full items-center">
          <SidebarMenuButton
            asChild
            isActive={isPotsRootActive}
            tooltip="Context Pots"
            className="flex-1"
          >
            <Link href="/pots" className="flex gap-2 items-center w-full overflow-hidden">
              <Database className="size-5 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden truncate">Context Pots</span>
            </Link>
          </SidebarMenuButton>
          {hasPots && (
            <CollapsibleTrigger asChild>
              <button
                type="button"
                aria-label={open ? "Collapse Context Pots" : "Expand Context Pots"}
                className="flex h-8 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden"
              >
                <ChevronDown
                  className={`size-4 transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
                />
              </button>
            </CollapsibleTrigger>
          )}
        </div>

        {hasPots && (
          <CollapsibleContent>
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
                    className="flex h-7 w-full items-center px-2 text-xs text-muted-foreground hover:text-sidebar-accent-foreground"
                  >
                    View all ({pots!.length})
                  </button>
                </SidebarMenuSubItem>
              )}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
}
