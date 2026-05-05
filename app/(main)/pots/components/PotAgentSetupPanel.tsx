"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, KeyRound, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import type { Pot } from "@/services/PotService";

type Props = {
  pot: Pot;
};

function CodeBlock({
  snippet,
  label,
}: {
  snippet: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(snippet)
      .then(() => {
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => toast.error("Unable to copy"));
  };

  return (
    <div className="group relative rounded-md border border-border/60 bg-muted/40">
      {label ? (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <button
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground",
              copied && "text-green-600"
            )}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : (
        <button
          onClick={handleCopy}
          className={cn(
            "absolute right-2 top-2 flex items-center gap-1 rounded bg-background/60 px-2 py-0.5 text-[11px] text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:text-foreground group-hover:opacity-100",
            copied && "opacity-100 text-green-600"
          )}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      )}
      <pre className="overflow-x-auto px-3 py-2 text-xs font-mono leading-relaxed text-foreground">
        {snippet}
      </pre>
    </div>
  );
}

export default function PotAgentSetupPanel({ pot }: Props) {
  const apiBase = useMemo(() => {
    const env = process.env.NEXT_PUBLIC_BASE_URL;
    if (env) return env.replace(/\/+$/, "");
    if (typeof window !== "undefined") return window.location.origin;
    return "http://localhost:8001";
  }, []);

  const potId = pot.id;
  const potRef = pot.slug || pot.id;
  const repoName = pot.primary_repo_name || "owner/repo";

  const cliSetup = [
    `# 1. One-time login (see Key management for your API key)`,
    `potpie login sk-your-api-key-here`,
    ``,
    `# 2. Make this pot the default for the current shell`,
    `potpie pot use ${potRef}`,
    ``,
    `# 3. Drop AGENTS.md + skills into the repo`,
    `potpie init-agent`,
    ``,
    `# 4. Verify everything is wired up`,
    `potpie doctor`,
  ].join("\n");

  const ingestSnippet = [
    `# Ingest a raw note into this pot`,
    `potpie ingest \\`,
    `  --name "Design decision" \\`,
    `  --episode-body "We chose Postgres for the ledger." \\`,
    `  --source cli`,
  ].join("\n");

  const mcpEnv = [
    `# Point your MCP-capable agent (Cursor, Claude Code, etc.)`,
    `# at this Potpie instance and scope it to this pot.`,
    `export POTPIE_API_BASE_URL="${apiBase}"`,
    `export POTPIE_API_KEY="sk-your-api-key-here"`,
    `export CONTEXT_ENGINE_POTS='{"${potId}":"${repoName}"}'`,
    ``,
    `# Start the MCP server over stdio`,
    `uv run potpie-mcp`,
  ].join("\n");

  const httpIngest = [
    `curl -X POST "${apiBase}/api/v2/context/ingest" \\`,
    `  -H "X-API-Key: sk-your-api-key-here" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{`,
    `    "pot_id": "${potId}",`,
    `    "name": "Release note",`,
    `    "episode_body": "v1.2 shipped.",`,
    `    "source_description": "ci"`,
    `  }'`,
  ].join("\n");

  const httpSearch = [
    `curl -X POST "${apiBase}/api/v2/context/search" \\`,
    `  -H "X-API-Key: sk-your-api-key-here" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{`,
    `    "pot_id": "${potId}",`,
    `    "query": "ledger schema changes",`,
    `    "limit": 8`,
    `  }'`,
  ].join("\n");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Connect an agent to this pot
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Pick the path that fits your agent. All three route through this pot id.
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] break-all">
              {potId}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <div className="min-w-0">
              <p className="font-medium flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                You&apos;ll need a Potpie API key
              </p>
              <p className="text-xs text-muted-foreground">
                Generate one once and reuse it across CLI, MCP, and HTTP.
              </p>
            </div>
            <Link href="/key-management">
              <Button variant="outline" size="sm">
                Manage keys
                <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Option A · Potpie CLI
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Recommended for agents that live in your editor/terminal. Installs
            <code className="mx-1">AGENTS.md</code> + skills and remembers this pot.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <CodeBlock label="Shell" snippet={cliSetup} />
          <CodeBlock label="Ingest a note" snippet={ingestSnippet} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Option B · MCP server</CardTitle>
          <p className="text-xs text-muted-foreground">
            For MCP-capable agents like Claude Code and Cursor. Expose
            <code className="mx-1">context_search</code>, <code>context_resolve</code>, and{" "}
            <code>context_record</code> tools scoped to this pot.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <CodeBlock label="Env + launch" snippet={mcpEnv} />
          <p className="text-xs text-muted-foreground">
            Add <code>potpie-mcp</code> as a server in your agent&apos;s MCP config
            (stdio transport) — the env above scopes it to this pot.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Option C · Raw HTTP</CardTitle>
          <p className="text-xs text-muted-foreground">
            For CI jobs, webhooks, or any language without an MCP client. Use the v2 API with
            your <code>X-API-Key</code>.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <CodeBlock label="Ingest" snippet={httpIngest} />
          <CodeBlock label="Search" snippet={httpSearch} />
        </CardContent>
      </Card>
    </div>
  );
}
