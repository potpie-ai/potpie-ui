"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Copy, Mail, Plus, Send, Trash2 } from "lucide-react";
import PotService, { PotInvitation, PotMember } from "@/services/PotService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";

type Props = {
  potId: string;
  isOwner: boolean;
};

export default function PotMembersPanel({ potId, isOwner }: Props) {
  const [members, setMembers] = useState<PotMember[]>([]);
  const [invitations, setInvitations] = useState<PotInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [justInvited, setJustInvited] = useState<PotInvitation | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [m, inv] = await Promise.all([
        PotService.listMembers(potId),
        PotService.listInvitations(potId),
      ]);
      setMembers(m);
      setInvitations(inv);
    } catch (e) {
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Members</CardTitle>
          {isOwner ? (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Invite by email
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No members yet.</p>
          ) : (
            members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {m.display_name || m.email || m.user_id}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.email || m.user_id}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize text-xs">
                    {m.role}
                  </Badge>
                  {isOwner && m.role !== "owner" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pendingAction === m.user_id}
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Pending invitations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : pendingInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No pending invitations.</p>
          ) : (
            pendingInvites.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    <Mail className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    {i.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expires{" "}
                    {i.expires_at ? new Date(i.expires_at).toLocaleString() : "—"}
                  </p>
                </div>
                {isOwner ? (
                  <div className="flex items-center gap-1">
                    {i.token ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Copy invite link"
                        onClick={() => copyInviteLink(i)}
                        className="text-muted-foreground"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Resend invite email"
                      disabled={pendingAction === i.id}
                      onClick={() => handleResendInvite(i.id)}
                      className="text-muted-foreground"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pendingAction === i.id}
                      onClick={() => handleRevokeInvite(i.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      Revoke
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite someone by email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                placeholder="teammate@example.com"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The invite expires in 14 days. Invited users join with the <code>user</code> role.
            </p>

            {justInvited?.token ? (
              <div className="rounded-lg border border-border/60 p-3 bg-muted/30 space-y-2">
                <p className="text-xs font-medium">Share this link with {justInvited.email}:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate text-xs bg-background rounded px-2 py-1 border border-border/60">
                    {`/pots/join?token=${justInvited.token?.slice(0, 12)}…`}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copyInviteLink(justInvited)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setInviteOpen(false);
                setJustInvited(null);
              }}
            >
              Close
            </Button>
            <Button onClick={handleInvite} disabled={inviting}>
              {inviting ? "Sending…" : "Send invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
