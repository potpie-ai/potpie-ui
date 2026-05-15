"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Database, Plus } from "lucide-react";
import PotService from "@/services/PotService";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { usePots, useInvalidatePots } from "@/lib/hooks/usePots";
import { PotInvitationBanner } from "@/app/(main)/pots/components/PotInvitationBanner";

export default function PotsPage() {
  const router = useRouter();
  const { data: pots, isLoading } = usePots();
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
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Pots</h1>
            <p className="text-sm text-muted-foreground">
              Manage the pots you own or have been invited to.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New pot
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : !pots || pots.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Database className="h-8 w-8 text-muted-foreground/60" />
            <h2 className="text-xl font-semibold">No pots yet</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Create your first pot to start managing members, sources,
              integrations, and ingestion.
            </p>
            <Button className="mt-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create your first pot
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pots.map((pot) => {
              const label = pot.display_name || pot.slug || pot.id;
              const hrefId = pot.slug || pot.id;
              return (
                <div key={pot.id} className="flex flex-col gap-2">
                  {pot.pending_invitation ? (
                    <PotInvitationBanner
                      invitation={pot.pending_invitation}
                      potLabel={label}
                    />
                  ) : null}
                  <Link
                    href={`/pots/${hrefId}`}
                    className="group flex flex-col rounded-xl border border-border bg-card hover:border-border/80 hover:shadow-sm transition-all"
                  >
                  <div className="flex-1 px-4 pt-4 pb-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Database className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <p className="truncate text-sm font-semibold">{label}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {pot.role}
                      </span>
                    </div>
                    {pot.primary_repo_name ? (
                      <p className="truncate text-xs text-muted-foreground pl-6">
                        {pot.primary_repo_name}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/50 italic pl-6">No primary repo</p>
                    )}
                  </div>
                    <div className="flex items-center justify-end px-4 py-2 border-t border-border/50 bg-muted/20 rounded-b-xl">
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1">
                        Open <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Pot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Slug</Label>
              <Input
                placeholder="my-project"
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {slug
                  ? checkingSlug
                    ? "Checking availability..."
                    : slugAvailable === false
                      ? "This slug is already taken."
                      : slugAvailable === true
                        ? `${slug} is available.`
                        : "Use lowercase letters, numbers, and hyphens."
                  : "Use lowercase letters, numbers, and hyphens."}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              You can attach GitHub repositories from the Sources tab after
              it&apos;s created.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || checkingSlug || !slug || slugAvailable === false}
            >
              {creating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
