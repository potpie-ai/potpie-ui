"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronRight,
  Database,
  Plus,
  RefreshCw,
} from "lucide-react";
import PotService from "@/services/PotService";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import {
  usePots,
  usePotsDegraded,
  useInvalidatePots,
} from "@/lib/hooks/usePots";
import { PotInvitationBanner } from "@/app/(main)/pots/components/PotInvitationBanner";
import {
  EmptyState,
  MonoChip,
  PageHeader,
  PotAvatar,
  PotPage,
  StatusDot,
  potRowClass,
} from "@/app/(main)/pots/components/kit";

export default function PotsPage() {
  const router = useRouter();
  const { data: pots, isLoading, isFetching, refetch } = usePots();
  const potsDegraded = usePotsDegraded();
  const invalidatePots = useInvalidatePots();

  const [createOpen, setCreateOpen] = useState(false);
  const [slugInput, setSlugInput] = useState("");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [creating, setCreating] = useState(false);

  const slug = useMemo(() => slugifyPotSlug(slugInput), [slugInput]);

  useEffect(() => {
    setSlugAvailable(null);
    if (!slug || slug.length < 1) {
      setCheckingSlug(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      setCheckingSlug(true);
      try {
        const out = await PotService.checkSlugAvailability(slug);
        setSlugAvailable(out.available);
      } catch {
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [slug]);

  const handleCreate = async () => {
    if (!slug) {
      toast.error("Enter a pot slug.");
      return;
    }
    if (slugAvailable === false) {
      toast.error("That slug is already taken.");
      return;
    }
    setCreating(true);
    try {
      const availability = await PotService.checkSlugAvailability(slug);
      if (!availability.available) {
        setSlugAvailable(false);
        toast.error("That slug is already taken.");
        return;
      }
      const pot = await PotService.createPot({
        slug: availability.slug,
      });
      toast.success("Pot created.");
      invalidatePots();
      setCreateOpen(false);
      setSlugInput("");
      setSlugAvailable(null);
      router.push(`/pots/${pot.slug || pot.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create pot");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="pot-theme min-h-svh flex-1 overflow-y-auto bg-background text-foreground">
      <PotPage>
        <PageHeader
          title="Pots"
          description="Each pot holds one project's durable memory — pick one to open it."
          actions={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New pot
            </Button>
          }
        />

        {potsDegraded ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="min-w-0 flex-1 text-[13px] text-amber-700 dark:text-amber-400">
              {"Couldn't load your pots — showing demo pots only."}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 px-2 text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={cn("mr-1 h-3.5 w-3.5", isFetching && "animate-spin")}
              />
              {isFetching ? "Retrying…" : "Retry"}
            </Button>
          </div>
        ) : null}

        <div className="mt-6">
          {isLoading ? (
            <PotListSkeleton />
          ) : !pots || pots.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No pots yet"
              description="A pot collects a project's repositories, members, and history so your agents can draw on it. Start with one project."
            >
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Create your first pot
              </Button>
            </EmptyState>
          ) : (
            <div className="divide-y divide-border/60">
              {pots.map((pot) => {
                const label = pot.display_name || pot.slug || pot.id;
                const hrefId = pot.slug || pot.id;
                return (
                  <div key={pot.id}>
                    <Link
                      href={`/pots/${hrefId}`}
                      className={cn(potRowClass, "group")}
                    >
                      <PotAvatar seed={pot.slug || pot.id} />
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span
                          className="truncate text-sm font-medium"
                          title={label}
                        >
                          {label}
                        </span>
                        {pot.primary_repo_name ? (
                          <span
                            className="hidden min-w-0 shrink sm:inline-flex"
                            title={pot.primary_repo_name}
                          >
                            <MonoChip className="max-w-[240px]">
                              {pot.primary_repo_name}
                            </MonoChip>
                          </span>
                        ) : (
                          <span className="hidden shrink-0 text-xs text-muted-foreground/60 sm:inline">
                            No repository
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                        {pot.role}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
                    </Link>
                    {pot.pending_invitation ? (
                      <div className="pb-3.5 sm:pl-12">
                        <PotInvitationBanner
                          invitation={pot.pending_invitation}
                          potLabel={label}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PotPage>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="pot-theme sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a pot</DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              Pick a short, URL-safe name for the project. You can connect
              repositories from Sources right after.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="pot-slug">Slug</Label>
            <Input
              id="pot-slug"
              autoFocus
              placeholder="my-project"
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value)}
              className="h-9 font-mono text-sm"
            />
            <div className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
              {!slug ? (
                <span>Lowercase letters, numbers, and hyphens.</span>
              ) : checkingSlug ? (
                <>
                  <StatusDot tone="busy" pulse />
                  <span className="inline-flex min-w-0 items-center gap-1">
                    Checking <MonoChip>{slug}</MonoChip>…
                  </span>
                </>
              ) : slugAvailable === true ? (
                <>
                  <StatusDot tone="ok" />
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MonoChip>{slug}</MonoChip> is available.
                  </span>
                </>
              ) : slugAvailable === false ? (
                <>
                  <StatusDot tone="error" />
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MonoChip>{slug}</MonoChip> is taken — try another.
                  </span>
                </>
              ) : (
                <span className="inline-flex min-w-0 items-center gap-1">
                  Will be created as <MonoChip>{slug}</MonoChip>
                </span>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                creating || checkingSlug || !slug || slugAvailable === false
              }
            >
              {creating ? "Creating…" : "Create pot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const SKELETON_WIDTHS = ["w-40", "w-28", "w-48", "w-36"];

function PotListSkeleton() {
  return (
    <div className="divide-y divide-border/60">
      {SKELETON_WIDTHS.map((width, i) => (
        <div key={i} className="flex items-center gap-3 py-3.5">
          <Skeleton className="h-9 w-9 rounded-lg bg-muted" />
          <Skeleton className={cn("h-4 bg-muted", width)} />
          <div className="flex-1" />
          <Skeleton className="h-5 w-14 rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}

function slugifyPotSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
}
