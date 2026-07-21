"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Copy,
  Send,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import PotService, { PotInvitation, PotMember } from "@/services/PotService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { EmptyState, MonoChip, SectionHeader, StatusDot } from "./kit";

type Props = {
  potId: string;
  isOwner: boolean;
};

type ConfirmTarget =
  | { kind: "remove-member"; member: PotMember }
  | { kind: "revoke-invite"; invite: PotInvitation };

/** Muted initial circle for people — distinct from PotAvatar (pots only). */
function InitialTile({
  seed,
  invited = false,
}: {
  seed: string;
  invited?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full text-sm font-medium uppercase",
        invited
          ? "border border-dashed border-border text-muted-foreground/80"
          : "bg-muted text-muted-foreground"
      )}
    >
      {(seed.trim() || "?").slice(0, 1)}
    </span>
  );
}

const iconButtonClass =
  "h-8 w-8 text-muted-foreground transition-colors hover:bg-muted/60";

export default function PotMembersPanel({ potId, isOwner }: Props) {
  const [members, setMembers] = useState<PotMember[]>([]);
  const [invitations, setInvitations] = useState<PotInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [justInvited, setJustInvited] = useState<PotInvitation | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(
    null
  );
  const inviteInputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [m, inv] = await Promise.all([
        PotService.listMembers(potId),
        PotService.listInvitations(potId),
      ]);
      setMembers(m);
      setInvitations(inv);
      setLoadFailed(false);
    } catch (e) {
      setLoadFailed(true);
      const msg = e instanceof Error ? e.message : "Failed to load members";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [potId]);

  const pendingInvites = useMemo(
    () => invitations.filter((i) => i.status === "pending"),
    [invitations]
  );

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      toast.error("Enter an email address");
      return;
    }
    setInviting(true);
    try {
      const invite = await PotService.inviteByEmail(potId, { email });
      toast.success(`Invitation sent to ${invite.email}`);
      setJustInvited(invite);
      setInviteEmail("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setPendingAction(userId);
    try {
      await PotService.removeMember(potId, userId);
      toast.success("Member removed.");
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove member");
    } finally {
      setPendingAction(null);
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    setPendingAction(invitationId);
    try {
      await PotService.revokeInvitation(potId, invitationId);
      toast.success("Invitation revoked.");
      setInvitations((prev) =>
        prev.map((i) => (i.id === invitationId ? { ...i, status: "revoked" } : i))
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to revoke");
    } finally {
      setPendingAction(null);
    }
  };

  const handleResendInvite = async (invitationId: string) => {
    setPendingAction(invitationId);
    try {
      await PotService.resendInvitation(potId, invitationId);
      toast.success("Invitation email resent.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resend invite");
    } finally {
      setPendingAction(null);
    }
  };

  const copyInviteLink = (invite: PotInvitation) => {
    if (!invite.token) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/pots/join?token=${encodeURIComponent(invite.token)}`;
    void navigator.clipboard.writeText(link).then(
      () => toast.success("Invite link copied."),
      () => toast.error("Unable to copy link.")
    );
  };

  const confirmDestructive = () => {
    if (!confirmTarget) return;
    if (confirmTarget.kind === "remove-member") {
      void handleRemoveMember(confirmTarget.member.user_id);
    } else {
      void handleRevokeInvite(confirmTarget.invite.id);
    }
    setConfirmTarget(null);
  };

  const onlySelf = members.length <= 1 && pendingInvites.length === 0;

  return (
    <div className="space-y-5">
      <SectionHeader
        title={
          <span className="inline-flex items-baseline gap-2">
            Members
            {!loading && !loadFailed ? (
              <span className="font-mono text-xs font-normal text-muted-foreground">
                {members.length}
              </span>
            ) : null}
          </span>
        }
        description={
          isOwner
            ? "Invites expire in 14 days — new members join with the user role."
            : undefined
        }
        actions={
          isOwner ? (
            <form
              noValidate
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void handleInvite();
              }}
            >
              <Input
                ref={inviteInputRef}
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@example.com"
                aria-label="Email to invite"
                className="h-9 w-56 placeholder:text-muted-foreground"
              />
              <Select value="user">
                <SelectTrigger
                  aria-label="Invite role"
                  className="h-9 w-[96px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" size="sm" disabled={inviting}>
                {inviting ? "Sending…" : "Send invite"}
              </Button>
            </form>
          ) : undefined
        }
      />

      {justInvited?.token ? (
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
          <span className="min-w-0 truncate">
            Invite link for {justInvited.email}
          </span>
          <MonoChip>{`/pots/join?token=${justInvited.token.slice(0, 12)}…`}</MonoChip>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:bg-muted/60"
            onClick={() => copyInviteLink(justInvited)}
          >
            <Copy className="mr-1 h-3.5 w-3.5" />
            Copy link
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Dismiss"
            className="h-7 w-7 text-muted-foreground hover:bg-muted/60"
            onClick={() => setJustInvited(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="divide-y divide-border/60 border-t border-border/60">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="h-9 w-9 rounded-full bg-muted" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-44 max-w-full bg-muted" />
                <Skeleton className="h-3 w-60 max-w-full bg-muted" />
              </div>
              <Skeleton className="hidden h-3 w-24 bg-muted sm:block" />
            </div>
          ))}
        </div>
      ) : loadFailed && members.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="Couldn't load members"
          description="Something went wrong while fetching this pot's members. Try again in a moment."
        >
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Try again
          </Button>
        </EmptyState>
      ) : onlySelf ? (
        <EmptyState
          icon={Users}
          title="Just you in this pot"
          description={
            isOwner
              ? "Invite a teammate by email — they get shared access to this pot's memory and history."
              : "Only the pot owner can invite new members."
          }
        >
          {isOwner ? (
            <Button onClick={() => inviteInputRef.current?.focus()}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              Invite a teammate
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <div className="divide-y divide-border/60 border-t border-border/60">
          {members.map((m) => {
            const name = m.display_name || m.email || m.user_id;
            const secondary =
              m.email && m.email !== name
                ? m.email
                : m.user_id !== name
                  ? m.user_id
                  : null;
            return (
              <div key={m.user_id} className="flex items-center gap-3 py-3">
                <InitialTile seed={name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={name}>
                    {name}
                  </p>
                  {secondary ? (
                    <p
                      className="truncate text-xs text-muted-foreground"
                      title={secondary}
                    >
                      {secondary}
                    </p>
                  ) : null}
                </div>
                <span className="w-14 shrink-0 text-[13px] capitalize text-muted-foreground">
                  {m.role}
                </span>
                <span className="flex w-20 shrink-0 items-center gap-1.5">
                  <StatusDot tone="ok" />
                  <span className="text-xs text-muted-foreground">Active</span>
                </span>
                {isOwner ? (
                  <div className="flex w-24 shrink-0 items-center justify-end gap-0.5">
                    {m.role !== "owner" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Remove from pot"
                        disabled={pendingAction === m.user_id}
                        onClick={() =>
                          setConfirmTarget({ kind: "remove-member", member: m })
                        }
                        className={cn(iconButtonClass, "hover:text-destructive")}
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}

          {pendingInvites.map((i) => {
            const expires = i.expires_at
              ? new Date(i.expires_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : null;
            return (
              <div key={i.id} className="flex items-center gap-3 py-3">
                <InitialTile seed={i.email} invited />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={i.email}>
                    {i.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {expires ? `Invite expires ${expires}` : "Invite pending"}
                  </p>
                </div>
                <span className="w-14 shrink-0 text-[13px] capitalize text-muted-foreground">
                  {i.role}
                </span>
                <span className="flex w-20 shrink-0 items-center gap-1.5">
                  <StatusDot tone="warn" pulse />
                  <span className="text-xs text-muted-foreground">Invited</span>
                </span>
                {isOwner ? (
                  <div className="flex w-24 shrink-0 items-center justify-end gap-0.5">
                    {i.token ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Copy invite link"
                        onClick={() => copyInviteLink(i)}
                        className={iconButtonClass}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Resend invite email"
                      disabled={pendingAction === i.id}
                      onClick={() => void handleResendInvite(i.id)}
                      className={iconButtonClass}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Revoke invitation"
                      disabled={pendingAction === i.id}
                      onClick={() =>
                        setConfirmTarget({ kind: "revoke-invite", invite: i })
                      }
                      className={cn(iconButtonClass, "hover:text-destructive")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={confirmTarget !== null}
        onOpenChange={(open) => (!open ? setConfirmTarget(null) : null)}
      >
        <DialogContent className="pot-theme text-foreground">
          <DialogHeader>
            <DialogTitle>
              {confirmTarget?.kind === "remove-member"
                ? "Remove member?"
                : "Revoke invitation?"}
            </DialogTitle>
          </DialogHeader>
          {confirmTarget ? (
            <div className="space-y-2 py-2 text-sm">
              {confirmTarget.kind === "remove-member" ? (
                <>
                  <p>
                    You&apos;re about to remove{" "}
                    <strong>
                      {confirmTarget.member.display_name ||
                        confirmTarget.member.email ||
                        confirmTarget.member.user_id}
                    </strong>{" "}
                    from this pot.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    They lose access immediately. You can invite them again
                    later.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    You&apos;re about to revoke the invitation for{" "}
                    <strong>{confirmTarget.invite.email}</strong>.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Their invite link stops working right away.
                  </p>
                </>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmDestructive}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {confirmTarget?.kind === "remove-member" ? "Remove" : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
