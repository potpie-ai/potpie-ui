"use client";

import React, { useState } from "react";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Pot } from "@/services/PotService";

type Props = {
  pot: Pot;
  isOwner: boolean;
  onArchive: (potId: string) => void | Promise<void>;
};

export default function PotOverview({ pot, isOwner, onArchive }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold">
              {pot.slug || pot.id}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground font-mono break-all">{pot.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {pot.role}
            </Badge>
            {pot.archived_at ? <Badge variant="secondary">Archived</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Slug</p>
            <p>{pot.slug || <span className="text-muted-foreground italic">—</span>}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Primary repository
            </p>
            <p>
              {pot.primary_repo_name || (
                <span className="text-muted-foreground italic">No repository attached</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Created</p>
            <p>{pot.created_at ? new Date(pot.created_at).toLocaleString() : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Updated</p>
            <p>{pot.updated_at ? new Date(pot.updated_at).toLocaleString() : "—"}</p>
          </div>
        </div>

        {isOwner && !pot.archived_at ? (
          <div className="flex items-center justify-end pt-2 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Archive className="h-4 w-4 mr-1" />
              Archive pot
            </Button>
          </div>
        ) : null}
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive this pot?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 text-sm">
            <p>
              Archiving <span className="font-medium">{potLabel}</span> will hide it from the
              list and stop ingestion for its attached sources.
            </p>
            <p className="text-muted-foreground">
              You can unarchive it later from the API if needed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={archiving}>
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
    </Card>
  );
}
