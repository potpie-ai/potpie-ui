"use client";

import React, { useMemo, useState } from "react";
import { Send } from "lucide-react";
import PotService from "@/services/PotService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { SharedMarkdown } from "@/components/chat/SharedMarkdown";

type Props = { potId: string };

const URL_ONLY_REGEX = /^https?:\/\/\S+$/i;

function deriveTitle(content: string): string {
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const stripped = line.replace(/^#{1,6}\s+/, "").trim();
    if (stripped) return stripped.slice(0, 80);
  }
  return "Untitled note";
}

export default function PotAddContextPanel({ potId }: Props) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const trimmed = body.trim();
  const isUrlOnly = useMemo(() => URL_ONLY_REGEX.test(trimmed), [trimmed]);

  const handleSubmit = async () => {
    if (!trimmed) {
      toast.error("Add some content or a URL");
      return;
    }
    setSubmitting(true);
    try {
      const out = await PotService.submitRawIngestion(potId, {
        name: deriveTitle(trimmed),
        content: isUrlOnly ? undefined : trimmed,
        url: isUrlOnly ? trimmed : undefined,
      });
      toast.success(`Submitted — event ${out.event_id.slice(0, 8)} is ${out.status}`);
      setBody("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="text-base font-semibold">Add context manually</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Paste notes, markdown, or a URL. Anything you drop here gets ingested into this pot —
          track progress on the Events tab.
        </p>
      </div>

      <Tabs defaultValue="write" className="w-full">
        <TabsList>
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview" disabled={!trimmed}>
            Preview
          </TabsTrigger>
        </TabsList>
        <TabsContent value="write" className="mt-3">
          <Textarea
            rows={18}
            placeholder={"# Auth design decisions\n\nNotes, markdown, or a URL — paste anything…"}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="resize-y font-mono text-sm min-h-[360px]"
          />
        </TabsContent>
        <TabsContent value="preview" className="mt-3">
          <div className="rounded-md border bg-background p-4 min-h-[360px] text-sm">
            {trimmed ? (
              <SharedMarkdown content={trimmed} />
            ) : (
              <p className="text-muted-foreground">Nothing to preview yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {isUrlOnly
            ? "Detected URL — will be submitted for agent-assisted ingestion."
            : "Markdown supported. The first heading or line becomes the title."}
        </p>
        <Button onClick={handleSubmit} disabled={submitting || !trimmed} className="gap-2">
          <Send className="h-3.5 w-3.5" />
          {submitting ? "Submitting…" : "Submit"}
        </Button>
      </div>
    </div>
  );
}
