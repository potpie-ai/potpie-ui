"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Inbox, Link as LinkIcon, RefreshCcw, Send } from "lucide-react";
import PotService, { PotEvent } from "@/services/PotService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";

type Props = {
  potId: string;
};

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-yellow-500/15 text-yellow-700 border-yellow-400/40",
  processing: "bg-blue-500/15 text-blue-700 border-blue-400/40",
  done: "bg-green-500/15 text-green-700 border-green-400/40",
  error: "bg-red-500/15 text-red-700 border-red-400/40",
};

export default function PotIngestionPanel({ potId }: Props) {
  const [events, setEvents] = useState<PotEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitName, setSubmitName] = useState("");
  const [submitContent, setSubmitContent] = useState("");
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const page = await PotService.listEvents(potId, {
        limit: 50,
        status: statusFilter ? [statusFilter] : undefined,
      });
      setEvents(page.items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [potId, statusFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSubmit = async () => {
    const name = submitName.trim();
    if (!name) {
      toast.error("Add a short title");
      return;
    }
    const content = submitContent.trim();
    const url = submitUrl.trim();
    if (!content && !url) {
      toast.error("Provide content or a URL");
      return;
    }
    setSubmitting(true);
    try {
      const out = await PotService.submitRawIngestion(potId, {
        name,
        content: content || undefined,
        url: url || undefined,
      });
      toast.success(`Event ${out.event_id.slice(0, 8)} ${out.status}`);
      setSubmitName("");
      setSubmitContent("");
      setSubmitUrl("");
      setSubmitOpen(false);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Add context</CardTitle>
          <Button size="sm" onClick={() => setSubmitOpen(true)}>
            <Send className="h-3.5 w-3.5 mr-1" />
            Submit
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Paste a note, markdown snippet, or a link to ingest into this pot. Both owners and
            users can submit; the event status appears below.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Recent events</CardTitle>
            <Button size="sm" variant="ghost" onClick={refresh}>
              <RefreshCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1 text-xs">
            {["all", "queued", "processing", "done", "error"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s === "all" ? null : s)}
                className={cn(
                  "px-2 py-1 rounded capitalize",
                  (statusFilter ?? "all") === s
                    ? "bg-muted font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : events.length === 0 ? (
            <div className="py-8 text-center">
              <Inbox className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground italic">No ingestion events yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((ev, idx) => (
                <div
                  key={`${ev.event_id ?? "noid"}-${idx}`}
                  className="rounded-lg border border-border/60 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {ev.ingestion_kind}{" "}
                        {ev.action ? (
                          <span className="text-muted-foreground">· {ev.action}</span>
                        ) : null}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground font-mono">
                        {ev.event_id}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] capitalize",
                        STATUS_COLORS[ev.status] ?? ""
                      )}
                    >
                      {ev.status}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                    {ev.repo_name ? <span>{ev.repo_name}</span> : null}
                    {ev.source_system ? <span>· {ev.source_system}</span> : null}
                    {ev.submitted_at ? (
                      <span>· {new Date(ev.submitted_at).toLocaleString()}</span>
                    ) : null}
                  </div>
                  {ev.error ? (
                    <p className="mt-1 text-[11px] text-red-600 truncate">{ev.error}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add context</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                placeholder="Short, descriptive label"
                value={submitName}
                onChange={(e) => setSubmitName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Content (text or markdown)</Label>
              <Textarea
                rows={8}
                placeholder="Paste notes, a decision log, or any context you want ingested…"
                value={submitContent}
                onChange={(e) => setSubmitContent(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>
                <LinkIcon className="inline h-3.5 w-3.5 mr-1" />
                Or a URL (submitted for agent-assisted ingestion)
              </Label>
              <Input
                placeholder="https://…"
                value={submitUrl}
                onChange={(e) => setSubmitUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
