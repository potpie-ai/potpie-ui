"use client";

import React, { useState } from "react";
import { FileText, Link as LinkIcon, Send, Tag } from "lucide-react";
import PotService from "@/services/PotService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";

type Props = { potId: string };

export default function PotAddContextPanel({ potId }: Props) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Add a short title");
      return;
    }
    const trimmedContent = content.trim();
    const trimmedUrl = url.trim();
    if (!trimmedContent && !trimmedUrl) {
      toast.error("Provide content or a URL");
      return;
    }
    setSubmitting(true);
    try {
      const out = await PotService.submitRawIngestion(potId, {
        name: trimmedName,
        content: trimmedContent || undefined,
        url: trimmedUrl || undefined,
      });
      toast.success(`Submitted — event ${out.event_id.slice(0, 8)} is ${out.status}`);
      setName("");
      setContent("");
      setUrl("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-base font-semibold">Add context manually</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Paste a note, markdown snippet, or a URL to ingest into this pot. Both owners and members
          can submit; track progress on the Events tab.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            Title
          </CardTitle>
          <CardDescription className="text-xs">
            A short label to identify this context entry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="e.g. Auth design decisions"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Content
          </CardTitle>
          <CardDescription className="text-xs">
            Paste notes, a decision log, code snippets, or any markdown you want ingested.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={10}
            placeholder="Paste your notes or markdown here…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="resize-y font-mono text-sm"
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" />
        <span>or</span>
        <Separator className="flex-1" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            URL
          </CardTitle>
          <CardDescription className="text-xs">
            Submit a link for agent-assisted ingestion instead of pasting content directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
          <Send className="h-3.5 w-3.5" />
          {submitting ? "Submitting…" : "Submit"}
        </Button>
      </div>
    </div>
  );
}
