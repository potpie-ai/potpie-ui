"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import type { Pot } from "@/services/PotService";
import {
  MonoChip,
  PageHeader,
  PotPage,
  SectionHeader,
} from "@/app/(main)/pots/components/kit";

type Props = {
  pot: Pot;
};

/** Inline mono token for command/tool names inside prose. */
function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground/80">
      {children}
    </code>
  );
}

/**
 * Mono command block with a ghost copy button. Optional `label` renders a
 * quiet caption above the block.
 */
function CodeBlock({ snippet, label }: { snippet: string; label?: string }) {
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
    <div className="space-y-1.5">
      {label ? (
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      ) : null}
      <div className="relative rounded-lg bg-muted">
        <pre className="overflow-x-auto px-4 py-3 pr-12 font-mono text-xs leading-relaxed text-foreground">
          {snippet}
        </pre>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy to clipboard"}
          className={cn(
            "absolute right-1.5 top-1.5 h-7 w-7 text-muted-foreground hover:text-foreground",
            copied && "text-emerald-600 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-400"
          )}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

/** One quiet numbered step: mono numeral in a muted circle, no boxes. */
function Step({
  index,
  title,
  children,
}: {
  index: number;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-4 py-5 first:pt-0 last:pb-0">
      <span className="mt-px flex h-6 w-6 shrink-0 select-none items-center justify-center rounded-full bg-muted font-mono text-[11px] text-muted-foreground">
        {index}
      </span>
      <div className="min-w-0 flex-1 space-y-2.5">
        <p className="text-sm font-medium leading-6 text-foreground">{title}</p>
        {children}
      </div>
    </li>
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

  const ingestSnippet = [
    `potpie ingest \\`,
    `  --name "Design decision" \\`,
    `  --episode-body "We chose Postgres for the ledger." \\`,
    `  --source cli`,
  ].join("\n");

  const mcpEnv = [
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
    <PotPage width="reading">
      <PageHeader
        title="Connect an agent"
        description={
          <>
            Point any coding agent at this pot over the CLI, MCP, or plain
            HTTP. Every snippet below is already scoped to{" "}
            <span title={potId}>
              <MonoChip>{potId}</MonoChip>
            </span>
            .
          </>
        }
      />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-border/60 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium">
              You&apos;ll need a Potpie API key
            </p>
            <p className="text-[13px] text-muted-foreground">
              Create one in key management, then reuse it across all three
              paths below.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href="/key-management">
            Manage keys
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="divide-y divide-border/60">
        <section className="py-10">
          <SectionHeader
            title="Potpie CLI"
            description="Best for agents that live in your editor or terminal — installs AGENTS.md and skills, and remembers this pot."
          />
          <ol className="mt-5 divide-y divide-border/60">
            <Step index={1} title="Log in once with your API key">
              <CodeBlock snippet="potpie login sk-your-api-key-here" />
            </Step>
            <Step index={2} title="Make this pot the default for the current shell">
              <CodeBlock snippet={`potpie pot use ${potRef}`} />
            </Step>
            <Step index={3} title="Drop AGENTS.md and skills into the repo">
              <CodeBlock snippet="potpie init-agent" />
            </Step>
            <Step index={4} title="Verify everything is wired up">
              <CodeBlock snippet="potpie doctor" />
            </Step>
          </ol>
          <div className="mt-6 space-y-2">
            <p className="text-[13px] text-muted-foreground">
              Once connected, your agent can record raw notes straight from the
              shell:
            </p>
            <CodeBlock label="Ingest a note" snippet={ingestSnippet} />
          </div>
        </section>

        <section className="py-10">
          <SectionHeader
            title="MCP server"
            description={
              <>
                For MCP-capable agents like Claude Code and Cursor — exposes{" "}
                <InlineCode>context_search</InlineCode>,{" "}
                <InlineCode>context_resolve</InlineCode>, and{" "}
                <InlineCode>context_record</InlineCode> tools scoped to this
                pot.
              </>
            }
          />
          <div className="mt-5 space-y-3">
            <CodeBlock label="Environment + launch" snippet={mcpEnv} />
            <p className="text-[13px] text-muted-foreground">
              Then add <InlineCode>potpie-mcp</InlineCode> as a server in your
              agent&apos;s MCP config (stdio transport) — the environment above
              scopes it to this pot.
            </p>
          </div>
        </section>

        <section className="pt-10">
          <SectionHeader
            title="Raw HTTP"
            description={
              <>
                For CI jobs, webhooks, or any language without an MCP client —
                call the v2 API with your <InlineCode>X-API-Key</InlineCode>{" "}
                header.
              </>
            }
          />
          <div className="mt-5 space-y-4">
            <CodeBlock label="Ingest an episode" snippet={httpIngest} />
            <CodeBlock label="Search the pot" snippet={httpSearch} />
          </div>
        </section>
      </div>
    </PotPage>
  );
}
