"use client";

import React, { useState } from "react";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DefItem,
  DefList,
  MonoChip,
} from "@/app/(main)/pots/components/kit";
import type { Pot } from "@/services/PotService";

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

/**
 * Identity metadata for the pot. The section header above the tabs already
 * shows name, avatar, role and archived state — this only adds what's new.
 */
export default function PotOverview({ pot }: { pot: Pot }) {
  return (
    <DefList columns={2}>
      <DefItem label="Primary repository">
        {pot.primary_repo_name ? (
          <span
            className="block truncate font-mono text-xs"
            title={pot.primary_repo_name}
          >
            {pot.primary_repo_name}
          </span>
        ) : (
          <span className="text-muted-foreground">No repository attached</span>
        )}
      </DefItem>
      <DefItem label="Created">{formatDate(pot.created_at)}</DefItem>
      <DefItem label="Updated">{formatDate(pot.updated_at)}</DefItem>
      <DefItem label="Pot id">
        <span className="inline-flex max-w-full" title={pot.id}>
          <MonoChip className="max-w-full">{pot.id}</MonoChip>
        </span>
      </DefItem>
      {pot.archived_at ? (
        <DefItem label="Archived">{formatDate(pot.archived_at)}</DefItem>
      ) : null}
    </DefList>
  );
}

/**
 * Quiet danger zone for the bottom of the overview page: one row with the
 * consequence copy and a destructive-outline archive button, guarded by a
 * confirm dialog. Renders nothing for non-owners or already-archived pots.
 */
export function PotDangerZone({
  pot,
  isOwner,
  onArchive,
}: {
  pot: Pot;
  isOwner: boolean;
  onArchive: (potId: string) => void | Promise<void>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  if (!isOwner || pot.archived_at) return null;

  const handleConfirmArchive = async () => {
    setArchiving(true);
    try {
      await onArchive(pot.id);
      setConfirmOpen(false);
    } finally {
      setArchiving(false);
    }
  };

  const potLabel = pot.slug || pot.id;

  return (
    <div className="border-t border-border/60 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="text-[13px] text-muted-foreground">
          Archiving hides this pot from the list and stops ingestion for its
          sources.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
        >
          <Archive className="mr-1.5 h-4 w-4" />
          Archive this pot
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="pot-theme">
          <DialogHeader>
            <DialogTitle>Archive this pot?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 text-sm">
            <p>
              Archiving <span className="font-medium">{potLabel}</span> will
              hide it from the list and stop ingestion for its attached
              sources.
            </p>
            <p className="text-muted-foreground">
              You can unarchive it later from the API if needed.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={archiving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmArchive}
              disabled={archiving}
            >
              {archiving ? "Archiving…" : "Archive pot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
