"use client";

import React from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import type { PotPendingInvitation } from "@/services/PotService";
import { usePotInvitationActions } from "@/lib/hooks/usePotInvitation";

/**
 * Accept / Decline banner shown on a pot the user was invited to but has not
 * answered yet. The pot is already visible (auto-added on invite); this lets
 * them keep it (accept) or be removed (decline).
 */
export function PotInvitationBanner({
  invitation,
  potLabel,
  className,
}: {
  invitation: PotPendingInvitation;
  potLabel: string;
  className?: string;
}) {
  const { accept, decline } = usePotInvitationActions();
  const busy = accept.isPending || decline.isPending;

  const stop = (e: React.MouseEvent) => {
    // Banners can sit inside a clickable pot card — don't navigate.
    e.preventDefault();
    e.stopPropagation();
  };

  const onAccept = (e: React.MouseEvent) => {
    stop(e);
    accept.mutate(invitation.token, {
      onSuccess: () => toast.success(`Joined ${potLabel}.`),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not accept invitation",
        ),
    });
  };

  const onDecline = (e: React.MouseEvent) => {
    stop(e);
    decline.mutate(invitation.token, {
      onSuccess: () => toast.success(`Declined invitation to ${potLabel}.`),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not decline invitation",
        ),
    });
  };

  return (
    <div
      className={
        "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 " +
        (className ?? "")
      }
    >
      <div className="flex items-center gap-2 min-w-0">
        <Mail className="h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs text-foreground/80">
          You&apos;ve been invited to{" "}
          <span className="font-medium">{potLabel}</span>.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" disabled={busy} onClick={onDecline}>
          {decline.isPending ? "Declining…" : "Decline"}
        </Button>
        <Button size="sm" disabled={busy} onClick={onAccept}>
          {accept.isPending ? "Accepting…" : "Accept"}
        </Button>
      </div>
    </div>
  );
}
