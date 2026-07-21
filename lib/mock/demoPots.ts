// Frontend-only demo fixtures for the /pots surface.
//
// Mirrors the conventions of lib/mock/demoBuildFlow.ts: hardcoded id constants,
// `isDemoXxxId` predicate guards, and synchronous `getDemoXxx()` getters that
// return the exact response shapes the real PotService methods produce. Three
// demo pots (Potpie, Redis, Kafka) are merged into the pots list for every
// account (see lib/hooks/usePots.ts) so the surface always has something to
// show. PotService and EventStreamService short-circuit to these getters when
// they see a demo pot / event id, so clicking a demo pot renders end-to-end
// without ever hitting the backend.
//
// This data is intentionally illustrative — the team refines the copy later;
// the wiring is what matters. Nothing here is persisted or mutated on the
// server: mutating actions on a demo pot resolve to synthetic no-op responses.

import type {
  ContextAnswerEnvelope,
  ContextGraphQuery,
  ContextGraphResult,
  ContextSearchResult,
  GraphCategoryRow,
  GraphEdgeRow,
  GraphLabelRow,
  GraphOverview,
  Pot,
  PotEvent,
  PotEventPage,
  PotIngestPipeline,
  PotIngestionConfig,
  PotIntegration,
  PotInvitation,
  PotMember,
  PotRepository,
  PotRole,
  PotSource,
  PotTimeline,
  PotTimelineOptions,
  PredicateFamilyRow,
  ProjectGraph,
  ProjectGraphEdge,
  ProjectGraphNode,
  RawIngestionResult,
  TimelineActivity,
  TimelineEntityRef,
  TopEntityRow,
} from "@/services/PotService";
import type { ConnectedIntegration } from "@/services/IntegrationService";
import {
  POTPIE_GRAPH_EDGES,
  POTPIE_GRAPH_NODES,
  POTPIE_GRAPH_STATS,
} from "./potpieGraph";
import {
  REDIS_GRAPH_EDGES,
  REDIS_GRAPH_NODES,
  REDIS_GRAPH_STATS,
} from "./redisGraph";

// ---- Identity constants -----------------------------------------------------

export const DEMO_POTPIE_POT_ID = "e7c9a4b1-2f3d-4a6e-9b8c-1d0e5f6a7b20";
export const DEMO_REDIS_POT_ID = "b2d4f6a8-1c3e-4d5f-8a9b-0c1d2e3f4a50";
export const DEMO_KAFKA_POT_ID = "a1c3e5f7-9b8d-4c6a-b2e4-f6a8c0d2e480";

const DEMO_OWNER_USER_ID = "demo-user-owner-0001";

const DEMO_POT_IDS: ReadonlySet<string> = new Set([
  DEMO_POTPIE_POT_ID,
  DEMO_REDIS_POT_ID,
  DEMO_KAFKA_POT_ID,
]);

// Populated lazily as the event fixtures are built so `isDemoEventId` is an
// exact-match membership test (collision-free) rather than a prefix heuristic.
const DEMO_EVENT_IDS = new Set<string>();

// ---- Time helpers -----------------------------------------------------------
// Computed once at module load so the demo reads "live" (e.g. "2h ago") without
// re-randomising on every render.

const NOW = Date.now();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

// ---- Per-pot configuration --------------------------------------------------

type DemoPotConfig = {
  id: string;
  slug: string;
  displayName: string;
  primaryRepo: string; // owner/repo
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
  blurb: string;
  services: string[];
  features: Array<{ key: string; name: string }>;
  people: Array<{ id: string; name: string; email: string; login: string }>;
  linearTeam: { id: string; name: string; key: string };
  extraRepos: Array<{ full: string; branch: string }>;
  scale: number; // scales graph counts so the three pots differ
  createdMsAgo: number;
  // Connected providers. Defaults to DEFAULT_INTEGRATIONS when omitted; the
  // Potpie pot overrides it to show a fully wired workspace.
  integrations?: DemoIntegrationSeed[];
  // Per-pot event fixtures. Defaults to the config-templated seeds in
  // `defaultEventSeeds` when omitted.
  eventSeeds?: DemoEventSeed[];
};

type DemoIntegrationSeed = {
  type: string;
  name: string;
  instance: string;
  host?: string;
  status?: "active" | "error" | "connecting";
  lastSync?: string;
  errorMessage?: string;
};

const DEFAULT_INTEGRATIONS = (cfg: DemoPotConfig): DemoIntegrationSeed[] => [
  { type: "github", name: "GitHub", instance: cfg.repoOwner, host: "github.com" },
  { type: "linear", name: "Linear", instance: cfg.linearTeam.name },
  { type: "slack", name: "Slack", instance: `${cfg.repoOwner}-workspace` },
  { type: "sentry", name: "Sentry", instance: cfg.repoOwner },
];

// The Potpie pot is the flagship demo, so its event stream is hand-written
// against the real potpie-ai PR/issue history rather than templated off the
// config. Ordering here is display order; `minsAgo` drives the timestamps.
const POTPIE_EVENT_SEEDS: DemoEventSeed[] = [
  {
    suffix: "recon-split",
    status: "processing",
    ingestion_kind: "agent_reconciliation",
    source_system: "context_engine_raw",
    source_channel: "agent",
    title: "Reconciling the product / engine / core split (#1018)",
    minsAgo: 3,
  },
  {
    suffix: "pr-1020",
    status: "done",
    ingestion_kind: "github_merged_pr",
    source_system: "github",
    source_channel: "github",
    title: "Merged #1020 · fix(deps): upgrade torch past CVE-2025-3000",
    event_type: "pull_request",
    action: "closed",
    minsAgo: 18,
  },
  {
    suffix: "linear-1974",
    status: "queued",
    ingestion_kind: "raw_episode",
    source_system: "linear",
    source_channel: "linear",
    title: "POT-1974 · GitLab connector OAuth refresh failing",
    minsAgo: 5,
  },
  {
    suffix: "issue-1008",
    status: "done",
    ingestion_kind: "raw_episode",
    source_system: "github",
    source_channel: "github",
    title: "Issue #1008 · MCP: naive as_of crashes context_resolve",
    event_type: "issues",
    action: "opened",
    minsAgo: 47,
  },
  {
    suffix: "pr-1019",
    status: "done",
    ingestion_kind: "github_merged_pr",
    source_system: "github",
    source_channel: "github",
    title: "Opened #1019 · refactor(daemon): move daemon into root, drop MCP",
    event_type: "pull_request",
    action: "opened",
    minsAgo: 96,
  },
  {
    suffix: "cli-baseline",
    status: "done",
    ingestion_kind: "raw_episode",
    source_system: "cli",
    source_channel: "cli",
    title: "potpie source add repo potpie-ai/pie — baseline ingestion",
    minsAgo: 140,
  },
  {
    suffix: "recon-pie",
    status: "done",
    ingestion_kind: "agent_reconciliation",
    source_system: "context_engine_raw",
    source_channel: "agent",
    title: "Backfilled potpie-ai/pie · 9 release-gate journeys",
    minsAgo: 175,
  },
  {
    suffix: "slack-embed",
    status: "done",
    ingestion_kind: "raw_episode",
    source_system: "slack",
    source_channel: "slack",
    title: "#eng-context · embedded FalkorDB vs hosted Neo4j default",
    minsAgo: 210,
  },
  {
    suffix: "pr-1002",
    status: "done",
    ingestion_kind: "github_merged_pr",
    source_system: "github",
    source_channel: "github",
    title: "Opened #1002 · fix embedded-FalkorDB claim read invisibility",
    event_type: "pull_request",
    action: "opened",
    minsAgo: 300,
  },
  {
    suffix: "sentry-spike",
    status: "done",
    ingestion_kind: "raw_episode",
    source_system: "webhook",
    source_channel: "webhook",
    title: "Sentry · error-rate spike on /api/v1/context/resolve",
    minsAgo: 355,
  },
  {
    suffix: "pr-ui-437",
    status: "done",
    ingestion_kind: "github_merged_pr",
    source_system: "github",
    source_channel: "github",
    title: "Merged potpie-ui#437 · remediate CVE-2026-53550 in js-yaml",
    event_type: "pull_request",
    action: "closed",
    minsAgo: 420,
  },
  {
    suffix: "gitlab-fail",
    status: "failed",
    ingestion_kind: "raw_episode",
    source_system: "gitlab",
    source_channel: "webhook",
    title: "GitLab issue sync rejected — token expired",
    minsAgo: 460,
    error:
      "401 Unauthorized from gitlab.com: OAuth token expired. Reconnect the integration to resume sync.",
  },
  {
    suffix: "recon-ontology",
    status: "done",
    ingestion_kind: "agent_reconciliation",
    source_system: "context_engine_raw",
    source_channel: "agent",
    title: "Reconciled ontology.py — 24 labels, 26 predicates",
    minsAgo: 520,
  },
  {
    suffix: "pr-999",
    status: "done",
    ingestion_kind: "github_merged_pr",
    source_system: "github",
    source_channel: "github",
    title: "Merged #999 · fix infra topology query-sensitive ranking",
    event_type: "pull_request",
    action: "closed",
    minsAgo: 610,
  },
  {
    suffix: "notion-rfc",
    status: "done",
    ingestion_kind: "raw_episode",
    source_system: "notion",
    source_channel: "notion",
    title: "RFC · three-layer distribution split (product / engine / core)",
    minsAgo: 700,
  },
  {
    suffix: "pr-wf-65",
    status: "done",
    ingestion_kind: "github_merged_pr",
    source_system: "github",
    source_channel: "github",
    title: "Merged potpie-workflows#65 · QA defaults to multi-batch",
    event_type: "pull_request",
    action: "closed",
    minsAgo: 810,
  },
  {
    suffix: "incident-cert",
    status: "done",
    ingestion_kind: "raw_episode",
    source_system: "webhook",
    source_channel: "webhook",
    title: "Incident resolved · workflows route TLS cert not issued",
    minsAgo: 960,
  },
  {
    suffix: "issue-997",
    status: "done",
    ingestion_kind: "raw_episode",
    source_system: "github",
    source_channel: "github",
    title: "Issue #997 · [Feature] Add GitLab CLI integration",
    event_type: "issues",
    action: "opened",
    minsAgo: 1150,
  },
  {
    suffix: "jira-migration",
    status: "done",
    ingestion_kind: "raw_episode",
    source_system: "jira",
    source_channel: "jira",
    title: "POT-1930 · remediate high-severity dependency alerts",
    minsAgo: 1320,
  },
  {
    suffix: "recon-ui",
    status: "done",
    ingestion_kind: "agent_reconciliation",
    source_system: "context_engine_raw",
    source_channel: "agent",
    title: "Backfilled potpie-ai/potpie-ui · 437 PRs, 431 issues",
    minsAgo: 1500,
  },
  {
    suffix: "pr-ui-424",
    status: "done",
    ingestion_kind: "github_merged_pr",
    source_system: "github",
    source_channel: "github",
    title: "Merged potpie-ui#424 · close open redirect & token leak in sign-in",
    event_type: "pull_request",
    action: "closed",
    minsAgo: 1720,
  },
  {
    suffix: "confluence-runbook",
    status: "done",
    ingestion_kind: "raw_episode",
    source_system: "confluence",
    source_channel: "confluence",
    title: "Runbook · draining the ingestion backlog on Celery",
    minsAgo: 2100,
  },
  {
    suffix: "deploy-aks",
    status: "done",
    ingestion_kind: "raw_episode",
    source_system: "cli",
    source_channel: "cli",
    title: "Deploy · context-engine v1.5 to AKS production",
    minsAgo: 2400,
  },
  {
    suffix: "webhook-unsupported",
    status: "failed",
    ingestion_kind: "raw_episode",
    source_system: "webhook",
    source_channel: "webhook",
    title: "Rejected payload: unsupported content type",
    minsAgo: 2900,
    error: "Unsupported media type: expected application/json",
  },
];

const POTPIE_CONFIG: DemoPotConfig = {
  id: DEMO_POTPIE_POT_ID,
  slug: "potpie",
  displayName: "Potpie",
  primaryRepo: "potpie-ai/potpie",
  repoOwner: "potpie-ai",
  repoName: "potpie",
  defaultBranch: "main",
  blurb: "Durable project memory for coding agents — Potpie, graphed by Potpie.",
  services: ["context-engine", "context-core", "graph-workbench", "ingestion-worker"],
  features: [
    { key: "context-graph", name: "Context Graph" },
    { key: "graph-ingestion", name: "Graph Ingestion" },
    { key: "agent-skills", name: "Agent Skills" },
    { key: "semantic-search", name: "Semantic Search" },
  ],
  people: [
    { id: "demo-user-owner-0001", name: "Nandan", email: "nandan@potpie.ai", login: "nndn" },
    { id: "demo-user-potpie-02", name: "Deeptendu Santra", email: "deeptendu@potpie.ai", login: "Dsantra92" },
    { id: "demo-user-potpie-03", name: "Shambhavi Shinde", email: "shambhavi@potpie.ai", login: "shmbhvi101" },
    { id: "demo-user-potpie-04", name: "Yash Krishan", email: "yash@potpie.ai", login: "yashkrishan" },
    { id: "demo-user-potpie-05", name: "Deepesh Genani", email: "deepesh@potpie.ai", login: "ASCE-D" },
    { id: "demo-user-potpie-06", name: "Bharath Kumar K", email: "bharath@potpie.ai", login: "BrhKmr23" },
    { id: "demo-user-potpie-07", name: "Dhiren Mathur", email: "dhiren@potpie.ai", login: "dhirenmathur" },
    { id: "demo-user-potpie-08", name: "Jagadeesh Yaberi", email: "jagadeesh@potpie.ai", login: "jdyaberi-pp" },
  ],
  linearTeam: { id: "demo-team-core", name: "Core", key: "POT" },
  // The whole potpie-ai estate, so the pot reads like a real multi-repo org.
  extraRepos: [
    { full: "potpie-ai/potpie-ui", branch: "staging" },
    { full: "potpie-ai/potpie-workflows", branch: "main" },
    { full: "potpie-ai/pie", branch: "main" },
    { full: "potpie-ai/potpie-vscode-extension", branch: "main" },
    { full: "potpie-ai/potpie-slack", branch: "main" },
    { full: "potpie-ai/mintlify-docs", branch: "main" },
    { full: "potpie-ai/potpie-k8s-deployments", branch: "main" },
  ],
  integrations: [
    { type: "github", name: "GitHub", instance: "potpie-ai", host: "github.com" },
    { type: "linear", name: "Linear", instance: "Potpie · POT" },
    { type: "slack", name: "Slack", instance: "potpie-ai.slack.com" },
    { type: "notion", name: "Notion", instance: "Potpie HQ" },
    { type: "jira", name: "Jira", instance: "potpie.atlassian.net" },
    { type: "confluence", name: "Confluence", instance: "potpie.atlassian.net/wiki" },
    { type: "sentry", name: "Sentry", instance: "potpie-ai" },
    { type: "posthog", name: "PostHog", instance: "potpie-ai" },
    { type: "langfuse", name: "Langfuse", instance: "potpie-enterprise" },
    {
      type: "gitlab",
      name: "GitLab",
      instance: "gitlab.com/potpie",
      status: "error",
      lastSync: "3 days ago",
      errorMessage: "OAuth token expired — reconnect to resume issue sync (POT-1974).",
    },
  ],
  eventSeeds: POTPIE_EVENT_SEEDS,
  scale: 1,
  createdMsAgo: 120 * DAY,
};

const REDIS_CONFIG: DemoPotConfig = {
  id: DEMO_REDIS_POT_ID,
  slug: "redis-oss",
  displayName: "Redis",
  primaryRepo: "redis/redis",
  repoOwner: "redis",
  repoName: "redis",
  defaultBranch: "unstable",
  blurb: "In-memory data structure store — streams, DLQ, and cluster bus.",
  services: ["stream-engine", "replication", "cluster-bus", "aof-writer"],
  features: [
    { key: "streams-dlq", name: "Streams DLQ" },
    { key: "keyspace-notifications", name: "Keyspace Notifications" },
    { key: "xadd-pipeline", name: "XADD Pipeline" },
    { key: "cluster-failover", name: "Cluster Failover" },
  ],
  people: [
    { id: "demo-user-redis-01", name: "Salvatore Greco", email: "salvatore@redis.dev", login: "sgreco" },
    { id: "demo-user-redis-02", name: "Yuki Tanaka", email: "yuki@redis.dev", login: "ytanaka" },
    { id: "demo-user-redis-03", name: "Elena Novak", email: "elena@redis.dev", login: "enovak" },
  ],
  linearTeam: { id: "demo-team-redis", name: "Redis OSS", key: "ROSS" },
  extraRepos: [{ full: "redis/redis-doc", branch: "master" }],
  scale: 1.35,
  createdMsAgo: 90 * DAY,
};

const KAFKA_CONFIG: DemoPotConfig = {
  id: DEMO_KAFKA_POT_ID,
  slug: "apache-kafka",
  displayName: "Kafka",
  primaryRepo: "apache/kafka",
  repoOwner: "apache",
  repoName: "kafka",
  defaultBranch: "trunk",
  blurb: "Distributed event streaming platform — brokers, KRaft, and Connect.",
  services: ["broker", "controller", "connect", "streams-runtime"],
  features: [
    { key: "kraft", name: "KRaft Mode" },
    { key: "tiered-storage", name: "Tiered Storage" },
    { key: "exactly-once", name: "Exactly-Once Semantics" },
    { key: "quotas", name: "Client Quotas" },
  ],
  people: [
    { id: "demo-user-kafka-01", name: "Aisha Khan", email: "aisha@kafka.dev", login: "akhan" },
    { id: "demo-user-kafka-02", name: "Tomas Berg", email: "tomas@kafka.dev", login: "tberg" },
    { id: "demo-user-kafka-03", name: "Lin Chen", email: "lin@kafka.dev", login: "lchen" },
  ],
  linearTeam: { id: "demo-team-streaming", name: "Streaming", key: "STRM" },
  extraRepos: [{ full: "apache/kafka-site", branch: "asf-site" }],
  scale: 1.7,
  createdMsAgo: 150 * DAY,
};

const DEMO_POT_CONFIGS: DemoPotConfig[] = [
  POTPIE_CONFIG,
  REDIS_CONFIG,
  KAFKA_CONFIG,
];

function configFor(potId: string): DemoPotConfig {
  return DEMO_POT_CONFIGS.find((c) => c.id === potId) ?? POTPIE_CONFIG;
}

// ---- The pots themselves ----------------------------------------------------

function makePot(cfg: DemoPotConfig): Pot {
  return {
    id: cfg.id,
    display_name: cfg.displayName,
    slug: cfg.slug,
    primary_repo_name: cfg.primaryRepo,
    created_by_user_id: DEMO_OWNER_USER_ID,
    created_at: iso(cfg.createdMsAgo),
    updated_at: iso(2 * HOUR),
    archived_at: null,
    role: "owner",
    pending_invitation: null,
  };
}

export const DEMO_POTS: Pot[] = DEMO_POT_CONFIGS.map(makePot);

// Resolve a demo pot by id or slug (the detail layout matches on either).
export function getDemoPot(ref: string): Pot | null {
  return (
    DEMO_POTS.find((p) => p.id === ref || p.slug === ref) ?? null
  );
}

// Synthetic no-op for `patchPot`: apply the requested fields to the demo pot
// without persisting anything.
export function getDemoPatchedPot(
  potId: string,
  body: { display_name?: string; slug?: string; archived?: boolean },
): Pot {
  const base = getDemoPot(potId) ?? DEMO_POTS[0];
  return {
    ...base,
    display_name: body.display_name ?? base.display_name,
    slug: body.slug ?? base.slug,
    archived_at: body.archived ? new Date().toISOString() : base.archived_at,
    updated_at: new Date().toISOString(),
  };
}

// ---- Predicates -------------------------------------------------------------

// Match demo pots by their fixed UUIDs only — never by slug. A demo pot's
// section pages always resolve to (and pass) its UUID, so a UUID test is
// sufficient here. Matching on slug too would let a demo pot shadow a real
// pot that happens to use one of the demo slugs (e.g. "potpie"), suppressing
// that real pot's backend calls.
export function isDemoPotId(potId?: string | null): boolean {
  if (!potId) return false;
  return DEMO_POT_IDS.has(potId);
}

export function isDemoEventId(eventId?: string | null): boolean {
  if (!eventId) return false;
  return DEMO_EVENT_IDS.has(eventId);
}

// Demo invitation tokens all carry the "demo-token-" sentinel prefix (see
// `getDemoInvitations` / `getDemoInvitation`). The join flow takes a bare
// token, so this predicate lets accept/decline short-circuit instead of
// firing a real (404ing) backend call for a demo invite link.
export function isDemoInviteToken(token?: string | null): boolean {
  if (!token) return false;
  return token.startsWith("demo-token-");
}

// ---- Repositories -----------------------------------------------------------

export function getDemoRepositories(potId: string): PotRepository[] {
  const cfg = configFor(potId);
  const primary: PotRepository = {
    id: `demo-repo-${cfg.slug}-primary`,
    repo_name: cfg.primaryRepo,
    owner: cfg.repoOwner,
    repo: cfg.repoName,
    provider: "github",
    provider_host: "github.com",
    default_branch: cfg.defaultBranch,
    remote_url: `https://github.com/${cfg.primaryRepo}`,
    external_repo_id: `demo-ext-${cfg.slug}`,
    added_by_user_id: DEMO_OWNER_USER_ID,
    created_at: iso(cfg.createdMsAgo),
  };
  const extras: PotRepository[] = cfg.extraRepos.map((r, idx) => {
    const [owner, repo] = r.full.split("/", 2);
    return {
      id: `demo-repo-${cfg.slug}-${idx}`,
      repo_name: r.full,
      owner,
      repo,
      provider: "github",
      provider_host: "github.com",
      default_branch: r.branch,
      remote_url: `https://github.com/${r.full}`,
      external_repo_id: `demo-ext-${cfg.slug}-${idx}`,
      added_by_user_id: DEMO_OWNER_USER_ID,
      created_at: iso(cfg.createdMsAgo - DAY),
    };
  });
  return [primary, ...extras];
}

// ---- Members & invitations --------------------------------------------------

export function getDemoMembers(potId: string): PotMember[] {
  const cfg = configFor(potId);
  return cfg.people.map((p, idx) => ({
    user_id: p.id,
    role: idx === 0 ? "owner" : "user",
    email: p.email,
    display_name: p.name,
    invited_by_user_id: idx === 0 ? null : DEMO_OWNER_USER_ID,
    created_at: iso(cfg.createdMsAgo - idx * DAY),
    updated_at: iso(3 * DAY),
  }));
}

export function getDemoInvitations(potId: string): PotInvitation[] {
  const cfg = configFor(potId);
  return [
    {
      id: `demo-invite-${cfg.slug}-1`,
      pot_id: cfg.id,
      email: `newteammate@${cfg.repoOwner}.dev`,
      role: "user",
      status: "pending",
      invited_by_user_id: DEMO_OWNER_USER_ID,
      accepted_by_user_id: null,
      expires_at: new Date(NOW + 12 * DAY).toISOString(),
      created_at: iso(2 * DAY),
      accepted_at: null,
      token: `demo-token-${cfg.slug}`,
    },
  ];
}

// ---- Sources ----------------------------------------------------------------

function repoSource(
  cfg: DemoPotConfig,
  idSuffix: string,
  full: string,
  branch: string,
  overrides: Partial<PotSource> = {},
): PotSource {
  const [owner, repo] = full.split("/", 2);
  return {
    id: `demo-src-${cfg.slug}-${idSuffix}`,
    pot_id: cfg.id,
    integration_id: `demo-int-${cfg.slug}-github`,
    provider: "github",
    source_kind: "repository",
    scope: {
      owner,
      repo,
      default_branch: branch,
      remote_url: `https://github.com/${full}`,
    },
    sync_enabled: true,
    sync_mode: "webhook",
    webhook_status: "healthy",
    last_sync_at: iso(35 * MIN),
    last_error: null,
    health_score: "0.98",
    added_by_user_id: DEMO_OWNER_USER_ID,
    created_at: iso(cfg.createdMsAgo),
    updated_at: iso(35 * MIN),
    ...overrides,
  };
}

export function getDemoSources(potId: string): PotSource[] {
  const cfg = configFor(potId);
  const sources: PotSource[] = [
    repoSource(cfg, "primary", cfg.primaryRepo, cfg.defaultBranch),
    ...cfg.extraRepos.map((r, idx) =>
      repoSource(cfg, `extra-${idx}`, r.full, r.branch, {
        last_sync_at: iso(2 * HOUR),
        health_score: "0.94",
      }),
    ),
    {
      id: `demo-src-${cfg.slug}-linear`,
      pot_id: cfg.id,
      integration_id: `demo-int-${cfg.slug}-linear`,
      provider: "linear",
      source_kind: "issue_tracker_team",
      scope: {
        team_id: cfg.linearTeam.id,
        team_name: cfg.linearTeam.name,
        team_key: cfg.linearTeam.key,
      },
      sync_enabled: true,
      sync_mode: "poll",
      webhook_status: null,
      last_sync_at: iso(18 * MIN),
      last_error: null,
      health_score: "0.91",
      added_by_user_id: DEMO_OWNER_USER_ID,
      created_at: iso(cfg.createdMsAgo - 5 * DAY),
      updated_at: iso(18 * MIN),
    },
  ];
  return sources;
}

export function getDemoSourcePatched(
  potId: string,
  sourceId: string,
  body: { sync_enabled?: boolean },
): PotSource {
  const existing =
    getDemoSources(potId).find((s) => s.id === sourceId) ??
    getDemoSources(potId)[0];
  return {
    ...existing,
    sync_enabled: body.sync_enabled ?? existing.sync_enabled,
    updated_at: new Date().toISOString(),
  };
}

// ---- Integrations -----------------------------------------------------------

export function getDemoIntegrations(potId: string): PotIntegration[] {
  const cfg = configFor(potId);
  const base = {
    provider_host: null as string | null,
    external_account_id: cfg.repoOwner,
    created_by_user_id: DEMO_OWNER_USER_ID,
    created_at: iso(cfg.createdMsAgo),
    updated_at: iso(6 * HOUR),
  };
  return (cfg.integrations ?? DEFAULT_INTEGRATIONS(cfg)).map((p) => ({
    id: `demo-int-${cfg.slug}-${p.type}`,
    integration_type: p.type,
    provider: p.type,
    ...base,
    provider_host: p.host ?? null,
    external_account_id: p.instance,
  }));
}

// The user-global connected-integrations list (IntegrationService shape), used
// by PotSourcesPanel to gate non-GitHub source types. That call is NOT
// pot-scoped, so the panel short-circuits to this getter for demo pots to keep
// the add-source picker consistent with the demo's attached sources (e.g. the
// Linear option shows as available) without any backend traffic.
export function getDemoConnectedIntegrations(
  potId: string,
): ConnectedIntegration[] {
  const cfg = configFor(potId);
  return (cfg.integrations ?? DEFAULT_INTEGRATIONS(cfg)).map(
    (p): ConnectedIntegration => ({
      id: `demo-int-${cfg.slug}-${p.type}`,
      integration_id: `demo-int-${cfg.slug}-${p.type}`,
      name: p.name,
      type: p.type,
      instanceName: p.instance,
      status: p.status ?? "active",
      lastSync: p.lastSync ?? "Just now",
      errorMessage: p.errorMessage,
      config: { org_slug: cfg.repoOwner, installation_id: `demo-${cfg.slug}` },
      orgSlug: cfg.repoOwner,
      installationId: `demo-${cfg.slug}`,
      uniqueIdentifier: `demo-${cfg.slug}-${p.type}`,
      createdAt: iso(cfg.createdMsAgo),
      updatedAt: iso(6 * HOUR),
      linkedPotsCount: 1,
    }),
  );
}

// ---- Events -----------------------------------------------------------------

type DemoEventSeed = {
  suffix: string;
  status: "done" | "processing" | "queued" | "failed";
  ingestion_kind: string;
  source_system: string;
  source_channel: string;
  title: string;
  event_type?: string;
  action?: string;
  minsAgo: number;
  error?: string | null;
};

function defaultEventSeeds(cfg: DemoPotConfig): DemoEventSeed[] {
  return [
    {
      suffix: "pr-merge",
      status: "done",
      ingestion_kind: "github_merged_pr",
      source_system: "github",
      source_channel: "github",
      title: `Merge PR: ${cfg.features[0].name} groundwork`,
      event_type: "pull_request",
      action: "closed",
      minsAgo: 22,
    },
    {
      suffix: "agent-recon",
      status: "processing",
      ingestion_kind: "agent_reconciliation",
      source_system: "context_engine_raw",
      source_channel: "agent",
      title: `Reconciling ${cfg.services[0]} service map`,
      minsAgo: 4,
    },
    {
      suffix: "raw-note",
      status: "done",
      ingestion_kind: "raw_episode",
      source_system: "context_engine_raw",
      source_channel: "ui_raw_ingest",
      title: `Design note: ${cfg.features[1].name}`,
      minsAgo: 90,
    },
    {
      suffix: "linear-issue",
      status: "queued",
      ingestion_kind: "raw_episode",
      source_system: "linear",
      source_channel: "linear",
      title: `${cfg.linearTeam.key}-142 · flaky test in ${cfg.services[1]}`,
      minsAgo: 2,
    },
    {
      suffix: "pr-open",
      status: "done",
      ingestion_kind: "github_merged_pr",
      source_system: "github",
      source_channel: "github",
      title: `Merge PR: harden ${cfg.services[2]} persistence`,
      event_type: "pull_request",
      action: "closed",
      minsAgo: 6 * 60,
    },
    {
      suffix: "cli-ingest",
      status: "done",
      ingestion_kind: "raw_episode",
      source_system: "cli",
      source_channel: "cli",
      title: `Runbook: on-call rotation for ${cfg.displayName}`,
      minsAgo: 26 * 60,
    },
    {
      suffix: "webhook-fail",
      status: "failed",
      ingestion_kind: "raw_episode",
      source_system: "webhook",
      source_channel: "webhook",
      title: "Rejected payload: unsupported content type",
      minsAgo: 3 * 60,
      error: "Unsupported media type: expected application/json",
    },
  ];
}

function buildEvents(cfg: DemoPotConfig): PotEvent[] {
  const seeds: DemoEventSeed[] = cfg.eventSeeds ?? defaultEventSeeds(cfg);

  return seeds.map((s, idx) => {
    const eventId = `demo-evt-${cfg.slug}-${s.suffix}`;
    DEMO_EVENT_IDS.add(eventId);
    const receivedAt = iso(s.minsAgo * MIN);
    const completedAt =
      s.status === "done" || s.status === "failed"
        ? iso((s.minsAgo - 1) * MIN)
        : null;
    const isRecon = s.ingestion_kind === "agent_reconciliation";
    return {
      id: `demo-evt-row-${cfg.slug}-${idx}`,
      event_id: eventId,
      status: s.status,
      lifecycle_status: s.status,
      stage: s.status === "processing" ? "reconciling" : null,
      ingestion_kind: s.ingestion_kind,
      source_system: s.source_system,
      source_channel: s.source_channel,
      event_type: s.event_type ?? null,
      action: s.action ?? null,
      repo_name: s.source_system === "github" ? cfg.primaryRepo : null,
      provider: s.source_system,
      received_at: receivedAt,
      submitted_at: receivedAt,
      completed_at: completedAt,
      error: s.error ?? null,
      payload: { name: s.title, source: s.source_channel },
      metadata: { demo: true },
      step_total: s.status === "processing" ? 6 : undefined,
      step_done: s.status === "processing" ? 3 : undefined,
      step_error: 0,
      episode_steps: isRecon
        ? [
            {
              sequence: 1,
              step_kind: "read_context",
              status: "done",
              attempt_count: 1,
              applied_at: iso((s.minsAgo + 1) * MIN),
              error: null,
            },
            {
              sequence: 2,
              step_kind: "apply_graph_mutations",
              status: "processing",
              attempt_count: 1,
              applied_at: null,
              error: null,
            },
          ]
        : undefined,
      reconciliation_runs: isRecon
        ? [
            {
              id: `demo-run-${cfg.slug}-${idx}`,
              attempt_number: 1,
              status: "processing",
              agent_name: "reconciliation-agent",
              agent_version: "2026.07.1",
              toolset_version: "12",
              plan_summary: `Update the ${cfg.services[0]} service map and link the new feature nodes.`,
              episode_count: 2,
              entity_mutation_count: 9,
              edge_mutation_count: 14,
              error: null,
              started_at: iso((s.minsAgo + 2) * MIN),
              completed_at: null,
              work_events: [
                {
                  id: `demo-we-${cfg.slug}-${idx}-1`,
                  sequence: 1,
                  event_kind: "tool_call",
                  title: "Searched the graph",
                  body: `context_search("${cfg.features[0].name}")`,
                  payload: { tool: "context_search" },
                  created_at: iso((s.minsAgo + 2) * MIN),
                },
                {
                  id: `demo-we-${cfg.slug}-${idx}-2`,
                  sequence: 2,
                  event_kind: "tool_call",
                  title: "Updated the graph",
                  body: "apply_graph_mutations(entities=9, edges=14)",
                  payload: { tool: "apply_graph_mutations" },
                  created_at: iso((s.minsAgo + 1) * MIN),
                },
              ],
            },
          ]
        : undefined,
    };
  });
}

// Build event fixtures eagerly so `DEMO_EVENT_IDS` is populated before any
// `isDemoEventId` check runs.
const DEMO_EVENTS_BY_POT: Record<string, PotEvent[]> = {
  [DEMO_POTPIE_POT_ID]: buildEvents(POTPIE_CONFIG),
  [DEMO_REDIS_POT_ID]: buildEvents(REDIS_CONFIG),
  [DEMO_KAFKA_POT_ID]: buildEvents(KAFKA_CONFIG),
};

export function getDemoEventPage(potId: string): PotEventPage {
  return {
    items: DEMO_EVENTS_BY_POT[potId] ?? DEMO_EVENTS_BY_POT[DEMO_POTPIE_POT_ID],
    next_cursor: null,
  };
}

export function getDemoEvent(eventId: string): PotEvent {
  for (const events of Object.values(DEMO_EVENTS_BY_POT)) {
    const match = events.find((e) => e.event_id === eventId);
    if (match) return match;
  }
  return DEMO_EVENTS_BY_POT[DEMO_POTPIE_POT_ID][0];
}

// ---- Ingestion config + pipeline -------------------------------------------

export function getDemoIngestionConfig(potId: string): PotIngestionConfig {
  return {
    pot_id: potId,
    mode: "windowed",
    window_minutes: 5,
    min_batch_size: null,
  };
}

export function getDemoIngestPipeline(potId: string): PotIngestPipeline {
  return {
    pot_id: potId,
    mode: "windowed",
    window_minutes: 5,
    min_batch_size: null,
    open_batch: {
      batch_id: `demo-batch-${potId.slice(0, 8)}`,
      created_at: iso(90_000),
      event_count: 2,
      window_deadline: new Date(NOW + 3 * MIN).toISOString(),
    },
    queued_event_count: 2,
  };
}

// ---- Graph overview ---------------------------------------------------------

type LabelSeed = [
  label: string,
  category: string,
  description: string,
  baseCount: number,
  requiredProps: string[],
];

const LABEL_SEEDS: LabelSeed[] = [
  ["Pot", "scope_identity", "The context pot itself.", 1, ["slug"]],
  ["Repository", "scope_identity", "Source repositories attached to the pot.", 2, ["repo_name"]],
  ["Service", "scope_identity", "Deployable services and modules.", 4, ["name"]],
  ["Environment", "scope_identity", "Runtime environments.", 3, []],
  ["Feature", "product_architecture", "Product capabilities and features.", 4, ["name"]],
  ["Component", "product_architecture", "Internal components.", 14, ["name"]],
  ["Interface", "product_architecture", "APIs and contracts.", 9, []],
  ["DataStore", "product_architecture", "Datastores and queues.", 4, ["name"]],
  ["PullRequest", "change_decision", "Merged and open pull requests.", 38, ["number"]],
  ["Commit", "change_decision", "Ingested commits.", 120, ["sha"]],
  ["Decision", "change_decision", "Architectural decisions.", 7, ["statement"]],
  ["Issue", "change_decision", "Tracked issues and tickets.", 22, ["title"]],
  ["Document", "knowledge_evidence", "Docs, runbooks, and design notes.", 18, ["title"]],
  ["Conversation", "knowledge_evidence", "Chat and PR discussions.", 26, []],
  ["Episode", "knowledge_evidence", "Ingestion episodes.", 64, []],
  ["Person", "team_ownership", "Contributors.", 9, ["name"]],
  ["Team", "team_ownership", "Owning teams.", 3, ["name"]],
  ["Deployment", "delivery_operations", "Deployments and releases.", 0, []],
  ["Runbook", "delivery_operations", "Operational runbooks.", 0, []],
  ["Alert", "delivery_operations", "Alerts wired to services.", 0, []],
  ["BugPattern", "debugging_reliability", "Recurring bug patterns.", 4, []],
  ["Fix", "debugging_reliability", "Prior fixes.", 11, []],
  ["Investigation", "debugging_reliability", "Debugging investigations.", 5, []],
  ["QualityIssue", "quality_drift", "Graph quality issues.", 2, []],
];

const CATEGORY_ORDER: string[] = [
  "scope_identity",
  "product_architecture",
  "change_decision",
  "knowledge_evidence",
  "team_ownership",
  "delivery_operations",
  "debugging_reliability",
  "quality_drift",
];

function scaled(base: number, scale: number): number {
  if (base === 0) return 0;
  return Math.max(1, Math.round(base * scale));
}

// ---- Redis pot: dataset-derived overview ------------------------------------
// The Redis demo pot renders a hand-authored (agent-extracted) graph of the
// actual redis/redis source tree (see ./redisGraph). Its overview is computed
// from that dataset so schema tables, counts, and top entities agree with what
// the canvas shows; the other demo pots keep the scale-generated overview.

const REDIS_LABEL_META: Record<
  string,
  { category: string; description: string; required: string[] }
> = {
  Repository: { category: "scope_identity", description: "Source repositories attached to the pot.", required: ["repo_name"] },
  Service: { category: "scope_identity", description: "Runnable binaries: redis-server, sentinel, cli, benchmark.", required: ["name"] },
  Environment: { category: "scope_identity", description: "Runtime environments the server ships to.", required: [] },
  Cluster: { category: "scope_identity", description: "Cloud clusters hosting environments.", required: [] },
  Component: { category: "product_architecture", description: "Source-level subsystems (event loop, dict, t_stream, ...).", required: ["name"] },
  Interface: { category: "product_architecture", description: "Wire protocols and API surfaces (RESP3, PSYNC2, module API).", required: [] },
  Feature: { category: "product_architecture", description: "User-facing capabilities, incl. the in-progress Streams DLQ.", required: ["name"] },
  DataStore: { category: "product_architecture", description: "Persistent artifacts: AOF log, RDB snapshots.", required: ["name"] },
  Dependency: { category: "product_architecture", description: "Vendored third-party libraries under deps/.", required: [] },
  Adapter: { category: "product_architecture", description: "Swappable backends: ae multiplexers, allocator, TLS, zstd.", required: [] },
  PullRequest: { category: "change_decision", description: "Merged and in-flight pull requests.", required: ["number"] },
  Issue: { category: "change_decision", description: "Tracked issues, incl. the DLQ ask redis#7386.", required: ["title"] },
  Decision: { category: "change_decision", description: "Evidenced design decisions with statement and rationale.", required: ["statement"] },
  Preference: { category: "change_decision", description: "Standing engineering policies (vendoring, encodings, tests).", required: [] },
  Document: { category: "knowledge_evidence", description: "In-repo docs, plans, and operator references.", required: ["title"] },
  Conversation: { category: "knowledge_evidence", description: "Design threads and rollout reviews.", required: [] },
  Person: { category: "team_ownership", description: "Maintainer personas with domain ownership.", required: ["name"] },
  Team: { category: "team_ownership", description: "Owning teams.", required: ["name"] },
  Deployment: { category: "delivery_operations", description: "Rollouts of redis-server builds per environment.", required: [] },
  Runbook: { category: "delivery_operations", description: "Operational runbooks (AOF pressure, resharding, failover).", required: [] },
  Alert: { category: "delivery_operations", description: "Monitors wired to subsystems.", required: [] },
  ConfigVariable: { category: "delivery_operations", description: "Load-bearing redis.conf directives.", required: ["name"] },
  BugPattern: { category: "debugging_reliability", description: "Recurring failure patterns with searchable symptoms.", required: [] },
  Fix: { category: "debugging_reliability", description: "Fix observations, incl. one failed attempt kept for memory.", required: [] },
  Investigation: { category: "debugging_reliability", description: "Debugging investigations tied to bug patterns.", required: [] },
};

const REDIS_EDGE_META: Record<
  string,
  { description: string; family: string | null }
> = {
  DEFINED_IN: { description: "Service code lives in a repository.", family: "composition" },
  PART_OF: { description: "Component belongs to a service or parent component.", family: "composition" },
  IMPLEMENTS: { description: "Component or PR implements an interface or feature.", family: "composition" },
  IMPLEMENTED_IN: { description: "Feature's code lives in a component.", family: "composition" },
  EXPOSES: { description: "Service exposes a wire protocol.", family: "composition" },
  PROVIDES: { description: "Service provides a feature.", family: "composition" },
  DEPENDS_ON: { description: "Component depends on another component.", family: "dependency" },
  USES: { description: "Component uses a datastore or vendored dependency.", family: "dependency" },
  USES_ADAPTER: { description: "Component selects a swappable backend.", family: "dependency" },
  CONFIGURES: { description: "redis.conf directive tunes a component.", family: "delivery" },
  DEPLOYED_TO: { description: "Service runs in an environment.", family: "delivery" },
  HOSTED_ON: { description: "Environment runs on a cluster.", family: "delivery" },
  DEPLOYS: { description: "Deployment ships a service.", family: "delivery" },
  WATCHES: { description: "Alert monitors a component.", family: "delivery" },
  OWNED_BY: { description: "Entity has a durable owner.", family: "ownership" },
  MEMBER_OF: { description: "Person belongs to a team.", family: "ownership" },
  AUTHORED: { description: "Person authored a PR, decision, or investigation.", family: "authorship" },
  PARTICIPATED_IN: { description: "Person took part in a conversation.", family: "authorship" },
  TOUCHED: { description: "PR changed a component.", family: "change" },
  RESOLVES: { description: "PR or fix resolves an issue or bug pattern.", family: "change" },
  DELIVERS: { description: "PR delivers a fix.", family: "change" },
  SUPERSEDES: { description: "Decision replaces an earlier decision.", family: "change" },
  AFFECTS: { description: "Decision constrains components or features.", family: "change" },
  POLICY_APPLIES_TO: { description: "Standing preference governs a component.", family: "governance" },
  REPRODUCES: { description: "Bug pattern manifests in a component.", family: "debugging" },
  ATTEMPTED_FIX_FAILED: { description: "Fix attempt that did not resolve the bug.", family: "debugging" },
  VERIFIED: { description: "Person independently verified a fix.", family: "debugging" },
  INVESTIGATES: { description: "Investigation targets a bug pattern.", family: "debugging" },
  DOCUMENTS: { description: "Doc or runbook covers an entity.", family: "evidence" },
  MENTIONS: { description: "Issue or conversation references an entity.", family: "evidence" },
  RELATED_TO: { description: "Generic association (drift).", family: null },
};

// ---- Potpie pot: the shipped ontology, populated -----------------------------
// The Potpie pot is Potpie's own engineering org graphed by Potpie, so unlike
// the Redis fixture it is authored against the real catalog in
// potpie/context-core/src/potpie_context_core/ontology.py: the 24 canonical
// entity labels and the 25 public predicates + RELATED_TO. Descriptions below
// are the ontology's own, so the schema table on the graph screen reads as the
// live contract rather than demo copy. Note there is no PullRequest / Issue /
// Commit / Deployment label — Activity is the ontology's single timeline
// collapse point and carries an `activity_type` property instead.

const POTPIE_LABEL_META: Record<
  string,
  { category: string; description: string; required: string[] }
> = {
  Repository: { category: "scope_identity", description: "A source code repository.", required: ["repo_name"] },
  Service: { category: "scope_identity", description: "A deployable/runnable unit — service, worker, cronjob, frontend, gateway, library.", required: ["name"] },
  Environment: { category: "scope_identity", description: "A named runtime target (prod, staging, preview, local).", required: ["name"] },
  Cluster: { category: "scope_identity", description: "The cloud account / cluster / region an environment runs on.", required: ["name"] },
  Feature: { category: "product_architecture", description: "A capability a repository or service provides.", required: ["name"] },
  APIContract: { category: "product_architecture", description: "One operation in an OpenAPI / RPC spec — a (path, method) pair.", required: ["http_method", "path"] },
  Adapter: { category: "product_architecture", description: "A runtime or integration adapter a service selects.", required: ["adapter_kind"] },
  DataStore: { category: "product_architecture", description: "A stateful backing resource (postgres, redis, falkordb, blob).", required: ["name"] },
  CodeAsset: { category: "product_architecture", description: "A repository code anchor: file, module, class, function, symbol.", required: ["path"] },
  Dependency: { category: "product_architecture", description: "A third-party package a service depends on.", required: ["package_name"] },
  Activity: { category: "change_decision", description: "A timestamped event — PR, commit, issue, deploy, incident, discussion. The unit of the timeline.", required: ["occurred_at"] },
  Decision: { category: "change_decision", description: "An ADR-style decision with statement, rationale, alternatives rejected.", required: ["statement"] },
  Preference: { category: "change_decision", description: "A coding preference with a scope-qualified prescription.", required: ["prescription"] },
  Policy: { category: "change_decision", description: "A named project-wide policy.", required: ["prescription"] },
  DeploymentTarget: { category: "delivery_operations", description: "A concrete deploy mechanism — k8s workload, container app, serverless function.", required: ["name"] },
  ConfigVariable: { category: "delivery_operations", description: "A named env/config value selecting behavior for a service or adapter.", required: ["name"] },
  BugPattern: { category: "debugging_reliability", description: "A reproducible failure pattern — the symptom side of a fix.", required: ["symptom_signature"] },
  Fix: { category: "debugging_reliability", description: "A bug-fix observation retrievable by symptom, carrying verification status.", required: ["verification_status"] },
  Document: { category: "knowledge_evidence", description: "Docs, RFCs, runbooks, and skill definitions.", required: ["title"] },
  Observation: { category: "knowledge_evidence", description: "A generic observation or signal the graph accumulated.", required: [] },
  Period: { category: "knowledge_evidence", description: "A timeline bucket anchoring activities for windowed queries.", required: ["period_kind"] },
  Person: { category: "team_ownership", description: "An individual contributor / owner.", required: ["name"] },
  Team: { category: "team_ownership", description: "An owning group / squad.", required: ["name"] },
  QualityIssue: { category: "quality_drift", description: "Marker the soft-fail path attaches to record an ontology downgrade.", required: [] },
};

const POTPIE_EDGE_META: Record<
  string,
  { description: string; family: string | null }
> = {
  // topology (11)
  DEFINED_IN: { description: "Service code lives in a repository.", family: "topology" },
  DEPLOYED_TO: { description: "Service runs in an environment.", family: "deployment_target" },
  DEPENDS_ON: { description: "Service depends on another service.", family: "topology" },
  USES: { description: "Service uses a datastore or third-party package.", family: "datastore_binding" },
  USES_ADAPTER: { description: "Service selects a runtime or integration adapter.", family: "adapter_binding" },
  CONFIGURES: { description: "Service or adapter is configured by a config variable.", family: "config_binding" },
  DEPLOYED_WITH: { description: "Service ships via a concrete deployment target.", family: "deployment_mechanism" },
  EXPOSES: { description: "Service exposes an API operation.", family: "topology" },
  HOSTED_ON: { description: "Environment or deployment target runs on a cluster.", family: "deployment_target" },
  PROVIDES: { description: "Repository or service provides a feature — the spine of 'what does this repo do'.", family: "topology" },
  IMPLEMENTED_IN: { description: "Feature's code lives in a repo, service, or code asset.", family: "topology" },
  // ownership (1) — the only singleton predicate
  OWNED_BY: { description: "Entity has exactly one durable owner.", family: "owner_binding" },
  // people (1)
  MEMBER_OF: { description: "Person belongs to a team.", family: "people" },
  // timeline (5)
  TOUCHED: { description: "Activity changed a scope or code asset — the spine of 'what changed in X'.", family: "timeline" },
  PERFORMED: { description: "Actor performed an activity.", family: "timeline" },
  AUTHORED: { description: "Actor originated an activity, which may differ from who performed it.", family: "timeline" },
  IN_PERIOD: { description: "Activity falls in a timeline bucket.", family: "timeline" },
  MENTIONS: { description: "Activity references any entity — the link that keeps timeline recall from falling through.", family: "timeline" },
  // memory (7)
  POLICY_APPLIES_TO: { description: "A preference or policy governs a scope or code asset.", family: "policy_binding" },
  REPRODUCES: { description: "Bug pattern manifests in a scope or code asset.", family: "debugging" },
  RESOLVED: { description: "Fix resolved a bug pattern.", family: "fix_outcome" },
  ATTEMPTED_FIX_FAILED: { description: "Fix attempt that did not resolve the bug — kept so agents avoid repeating it.", family: "fix_outcome" },
  VERIFIED: { description: "A person, team, or activity independently verified a fix.", family: "debugging" },
  DECIDED: { description: "Decision binds to a scope.", family: "decisions" },
  AFFECTS: { description: "Decision constrains an entity — looser than DECIDED.", family: "decisions" },
  // system
  SUPERSEDES: { description: "Decision replaces an earlier decision.", family: "decisions" },
  // generic fallback — counted as drift
  RELATED_TO: { description: "Generic association (soft-fail downgrade target).", family: null },
};

// Shared by every hand-authored dataset pot (Redis, Potpie): derive the whole
// overview from the dataset's own stats so the schema tables, edge coverage and
// top-entity list agree with what the canvas actually renders. The scale-
// generated path below is only for pots without a real dataset.
type DatasetGraphStats = {
  nodeCount: number;
  edgeCount: number;
  labelCounts: Readonly<Record<string, number>>;
  edgeTypeCounts: Readonly<Record<string, number>>;
  topEntities: ReadonlyArray<{
    entity_key: string;
    labels: readonly string[];
    name: string;
    degree: number;
  }>;
};

function datasetGraphOverview(
  potId: string,
  stats: DatasetGraphStats,
  labelMeta: Record<
    string,
    { category: string; description: string; required: string[] }
  >,
  edgeMeta: Record<string, { description: string; family: string | null }>,
  ontologyVersion: string,
): GraphOverview {
  const byLabel: GraphLabelRow[] = Object.entries(
    stats.labelCounts as Record<string, number>,
  ).map(([label, count]) => {
    const meta = labelMeta[label];
    return {
      label,
      category: meta?.category ?? "product_architecture",
      description: meta?.description ?? "",
      count,
      required_properties: meta?.required ?? [],
      lifecycle_states: ["active"],
      populated: count > 0,
    };
  });

  const byCategory: GraphCategoryRow[] = CATEGORY_ORDER.map((category) => {
    const labels = byLabel.filter((l) => l.category === category);
    return {
      category,
      label_count: labels.length,
      populated_label_count: labels.filter((l) => l.populated).length,
      entity_count: labels.reduce((acc, l) => acc + l.count, 0),
      labels,
    };
  }).filter((row) => row.label_count > 0);

  const canonical: GraphEdgeRow[] = [];
  const nonCanonical: GraphEdgeRow[] = [];
  for (const [type, count] of Object.entries(
    stats.edgeTypeCounts as Record<string, number>,
  ).sort((a, b) => b[1] - a[1])) {
    const meta = edgeMeta[type];
    const row: GraphEdgeRow = {
      edge_type: type,
      count,
      description: meta?.description,
      predicate_family: meta?.family ?? null,
      populated: count > 0,
    };
    (meta?.family ? canonical : nonCanonical).push(row);
  }

  const familyTotals = new Map<string, { members: string[]; count: number }>();
  for (const row of canonical) {
    const family = row.predicate_family as string;
    const entry = familyTotals.get(family) ?? { members: [], count: 0 };
    entry.members.push(row.edge_type);
    entry.count += row.count;
    familyTotals.set(family, entry);
  }
  const predicateFamilies: PredicateFamilyRow[] = Array.from(
    familyTotals.entries(),
    ([family, { members, count }]) => ({ family, members, count }),
  );

  const canonicalEdgeCount = canonical.reduce((a, r) => a + r.count, 0);
  const driftEdgeCount = nonCanonical.reduce((a, r) => a + r.count, 0);
  const totalEdges = canonicalEdgeCount + driftEdgeCount;
  const totalLabels = byLabel.length;
  const supersededEdges =
    (stats.edgeTypeCounts as Record<string, number>).SUPERSEDES ?? 0;

  return {
    pot_id: potId,
    message: "ok",
    ontology_version: ontologyVersion,
    totals: {
      entities: stats.nodeCount,
      edges: totalEdges,
      entities_without_canonical_label: 0,
      canonical_entities: stats.nodeCount,
      canonical_edges: canonicalEdgeCount,
      drift_edges: driftEdgeCount,
    },
    schema_coverage: {
      populated_labels: byLabel.filter((l) => l.populated).length,
      total_labels: totalLabels,
      coverage_ratio: byLabel.filter((l) => l.populated).length / totalLabels,
      drift_ratio: totalEdges > 0 ? driftEdgeCount / totalEdges : 0,
      by_category: byCategory,
      by_label: byLabel,
      unknown_labels: {},
    },
    edge_coverage: {
      canonical,
      non_canonical: nonCanonical,
      predicate_families: predicateFamilies,
    },
    lifecycle_distribution: {
      active: totalEdges - supersededEdges,
      superseded: supersededEdges,
    },
    top_entities_by_degree: stats.topEntities.map((t) => ({
      entity_key: t.entity_key,
      labels: [...t.labels],
      name: t.name,
      degree: t.degree,
    })),
    open_conflicts: [],
  };
}

export function getDemoGraphOverview(potId: string): GraphOverview {
  if (potId === DEMO_REDIS_POT_ID) {
    return datasetGraphOverview(
      potId,
      REDIS_GRAPH_STATS,
      REDIS_LABEL_META,
      REDIS_EDGE_META,
      "2026-06-graph",
    );
  }
  if (potId === DEMO_POTPIE_POT_ID) {
    return datasetGraphOverview(
      potId,
      POTPIE_GRAPH_STATS,
      POTPIE_LABEL_META,
      POTPIE_EDGE_META,
      "2026-06-graph",
    );
  }
  const cfg = configFor(potId);
  const scale = cfg.scale;

  const byLabel: GraphLabelRow[] = LABEL_SEEDS.map(
    ([label, category, description, baseCount, requiredProps]) => {
      const count = scaled(baseCount, scale);
      return {
        label,
        category,
        description,
        count,
        required_properties: requiredProps,
        lifecycle_states: ["active"],
        populated: count > 0,
      };
    },
  );

  const byCategory: GraphCategoryRow[] = CATEGORY_ORDER.map((category) => {
    const labels = byLabel.filter((l) => l.category === category);
    return {
      category,
      label_count: labels.length,
      populated_label_count: labels.filter((l) => l.populated).length,
      entity_count: labels.reduce((acc, l) => acc + l.count, 0),
      labels,
    };
  }).filter((row) => row.label_count > 0);

  const totalEntities = byLabel.reduce((acc, l) => acc + l.count, 0);
  const populatedLabels = byLabel.filter((l) => l.populated).length;
  const totalLabels = byLabel.length;

  const canonical: GraphEdgeRow[] = [
    { edge_type: "DEPENDS_ON", count: scaled(42, scale), description: "Service depends on service.", predicate_family: "dependency", populated: true },
    { edge_type: "IMPLEMENTS", count: scaled(31, scale), description: "Component implements feature.", predicate_family: "composition", populated: true },
    { edge_type: "PART_OF", count: scaled(48, scale), description: "Component is part of a service.", predicate_family: "composition", populated: true },
    { edge_type: "OWNS", count: scaled(18, scale), description: "Person or team owns an entity.", predicate_family: "ownership", populated: true },
    { edge_type: "AUTHORED", count: scaled(120, scale), description: "Person authored a commit or PR.", predicate_family: "authorship", populated: true },
    { edge_type: "MODIFIES", count: scaled(96, scale), description: "PR modifies a component.", predicate_family: "change", populated: true },
    { edge_type: "DOCUMENTS", count: scaled(22, scale), description: "Document describes a feature.", predicate_family: "evidence", populated: true },
    { edge_type: "RESOLVES", count: scaled(14, scale), description: "PR resolves an issue.", predicate_family: "change", populated: true },
    { edge_type: "DEPLOYS", count: 0, description: "Deployment ships a service.", predicate_family: "delivery", populated: false },
  ];
  const nonCanonical: GraphEdgeRow[] = [
    { edge_type: "RELATED_TO", count: scaled(9, scale), description: "Generic association (drift).", predicate_family: null, populated: true },
    { edge_type: "MENTIONS", count: scaled(6, scale), description: "Conversation mentions an entity.", predicate_family: null, populated: true },
  ];
  const canonicalEdgeCount = canonical.reduce((a, r) => a + r.count, 0);
  const driftEdgeCount = nonCanonical.reduce((a, r) => a + r.count, 0);
  const totalEdges = canonicalEdgeCount + driftEdgeCount;

  const predicateFamilies: PredicateFamilyRow[] = [
    { family: "dependency", members: ["DEPENDS_ON", "USES"], count: scaled(42, scale) },
    { family: "ownership", members: ["OWNS", "MAINTAINS"], count: scaled(18, scale) },
    { family: "change", members: ["MODIFIES", "RESOLVES", "REVERTS"], count: scaled(110, scale) },
    { family: "composition", members: ["PART_OF", "IMPLEMENTS"], count: scaled(79, scale) },
  ];

  const topEntities: TopEntityRow[] = [
    { entity_key: `service:${cfg.services[0]}`, labels: ["Service"], name: cfg.services[0], degree: scaled(24, scale) },
    { entity_key: `repository:${cfg.primaryRepo}`, labels: ["Repository"], name: cfg.primaryRepo, degree: scaled(21, scale) },
    { entity_key: `feature:${cfg.features[0].key}`, labels: ["Feature"], name: cfg.features[0].name, degree: scaled(17, scale) },
    { entity_key: `service:${cfg.services[1]}`, labels: ["Service"], name: cfg.services[1], degree: scaled(15, scale) },
    { entity_key: `person:${cfg.people[0].login}`, labels: ["Person"], name: cfg.people[0].name, degree: scaled(12, scale) },
    { entity_key: `feature:${cfg.features[1].key}`, labels: ["Feature"], name: cfg.features[1].name, degree: scaled(10, scale) },
  ];

  return {
    pot_id: potId,
    message: "ok",
    ontology_version: "2026.07",
    totals: {
      entities: totalEntities,
      edges: totalEdges,
      entities_without_canonical_label: scaled(3, scale),
      canonical_entities: totalEntities - scaled(3, scale),
      canonical_edges: canonicalEdgeCount,
      drift_edges: driftEdgeCount,
    },
    schema_coverage: {
      populated_labels: populatedLabels,
      total_labels: totalLabels,
      coverage_ratio: populatedLabels / totalLabels,
      drift_ratio: totalEdges > 0 ? driftEdgeCount / totalEdges : 0,
      by_category: byCategory,
      by_label: byLabel,
      unknown_labels: { FILE: scaled(52, scale), FUNCTION: scaled(140, scale) },
    },
    edge_coverage: {
      canonical,
      non_canonical: nonCanonical,
      predicate_families: predicateFamilies,
    },
    lifecycle_distribution: {
      active: scaled(totalEdges - 12, scale),
      deprecated: scaled(8, scale),
      superseded: scaled(4, scale),
    },
    top_entities_by_degree: topEntities,
    open_conflicts: [],
  };
}

// ---- Project graph ----------------------------------------------------------

export function getDemoProjectGraph(potId: string): ProjectGraph {
  // The Redis pot returns the full hand-authored dataset (see ./redisGraph);
  // the include/limit knobs are a real-backend concern the demo ignores.
  if (potId === DEMO_REDIS_POT_ID) {
    return {
      pot_id: potId,
      pr_number: null,
      limit: REDIS_GRAPH_NODES.length,
      nodes: REDIS_GRAPH_NODES,
      edges: REDIS_GRAPH_EDGES,
      message: "ok",
    };
  }
  if (potId === DEMO_POTPIE_POT_ID) {
    return {
      pot_id: potId,
      pr_number: null,
      limit: POTPIE_GRAPH_NODES.length,
      nodes: POTPIE_GRAPH_NODES,
      edges: POTPIE_GRAPH_EDGES,
      message: "ok",
    };
  }
  const cfg = configFor(potId);
  const nodes: ProjectGraphNode[] = [];
  const edges: ProjectGraphEdge[] = [];

  const repoKey = `repository:${cfg.primaryRepo}`;
  nodes.push({
    id: repoKey,
    entity_key: repoKey,
    labels: ["Repository"],
    properties: { name: cfg.primaryRepo, repo_name: cfg.primaryRepo, default_branch: cfg.defaultBranch },
    relationships: [],
  });

  cfg.services.forEach((svc) => {
    const key = `service:${svc}`;
    nodes.push({
      id: key,
      entity_key: key,
      labels: ["Service"],
      properties: { name: svc, repo_name: cfg.primaryRepo },
      relationships: [
        { type: "PART_OF", direction: "out", target_key: repoKey, target_labels: ["Repository"], target_name: cfg.primaryRepo },
      ],
    });
    edges.push({ from: key, type: "PART_OF", to: repoKey, properties: {} });
  });

  cfg.features.forEach((feat, idx) => {
    const key = `feature:${feat.key}`;
    const owningService = `service:${cfg.services[idx % cfg.services.length]}`;
    nodes.push({
      id: key,
      entity_key: key,
      labels: ["Feature"],
      properties: { name: feat.name },
      relationships: [
        { type: "IMPLEMENTS", direction: "in", source_key: owningService, source_labels: ["Service"], source_name: cfg.services[idx % cfg.services.length] },
      ],
    });
    edges.push({ from: owningService, type: "IMPLEMENTS", to: key, properties: {} });
  });

  cfg.people.forEach((p, idx) => {
    const key = `person:${p.login}`;
    const owned = `service:${cfg.services[idx % cfg.services.length]}`;
    nodes.push({
      id: key,
      entity_key: key,
      labels: ["Person"],
      properties: { name: p.name, email: p.email },
      relationships: [
        { type: "OWNS", direction: "out", target_key: owned, target_labels: ["Service"], target_name: cfg.services[idx % cfg.services.length] },
      ],
    });
    edges.push({ from: key, type: "OWNS", to: owned, properties: {} });
  });

  // A merged PR that modifies the first service and resolves a decision.
  const prKey = `pull_request:${cfg.repoName}-8421`;
  const decisionKey = `decision:${cfg.features[0].key}-design`;
  nodes.push({
    id: prKey,
    entity_key: prKey,
    labels: ["PullRequest"],
    properties: { name: `#8421 ${cfg.features[0].name} groundwork`, number: 8421, repo_name: cfg.primaryRepo },
    relationships: [
      { type: "MODIFIES", direction: "out", target_key: `service:${cfg.services[0]}`, target_labels: ["Service"], target_name: cfg.services[0] },
    ],
  });
  edges.push({ from: prKey, type: "MODIFIES", to: `service:${cfg.services[0]}`, properties: {} });

  nodes.push({
    id: decisionKey,
    entity_key: decisionKey,
    labels: ["Decision"],
    properties: { name: `Adopt ${cfg.features[0].name} approach`, statement: `Adopt ${cfg.features[0].name} approach` },
    relationships: [
      { type: "RELATES_TO", direction: "out", target_key: `feature:${cfg.features[0].key}`, target_labels: ["Feature"], target_name: cfg.features[0].name },
    ],
  });
  edges.push({ from: decisionKey, type: "RELATES_TO", to: `feature:${cfg.features[0].key}`, properties: {} });

  const docKey = `document:${cfg.features[0].key}-spec`;
  nodes.push({
    id: docKey,
    entity_key: docKey,
    labels: ["Document"],
    properties: { name: `${cfg.features[0].name} design doc`, title: `${cfg.features[0].name} design doc` },
    relationships: [
      { type: "DOCUMENTS", direction: "out", target_key: `feature:${cfg.features[0].key}`, target_labels: ["Feature"], target_name: cfg.features[0].name },
    ],
  });
  edges.push({ from: docKey, type: "DOCUMENTS", to: `feature:${cfg.features[0].key}`, properties: {} });

  // Cross-service dependency for a bit of structure.
  if (cfg.services.length >= 2) {
    edges.push({
      from: `service:${cfg.services[0]}`,
      type: "DEPENDS_ON",
      to: `service:${cfg.services[1]}`,
      properties: {},
    });
  }

  return {
    pot_id: potId,
    pr_number: null,
    limit: nodes.length,
    nodes,
    edges,
    message: "ok",
  };
}

// ---- Activity timeline ------------------------------------------------------

function entityRef(
  key: string,
  byKey: Map<string, ProjectGraphNode>,
): TimelineEntityRef {
  const node = byKey.get(key);
  const name =
    (node?.properties?.name as string | undefined) ||
    key.slice(key.indexOf(":") + 1);
  return { key, name, labels: node?.labels ?? [] };
}

/**
 * Derive rich timeline items from a mock project graph. Activity nodes (the
 * potpie pot) carry the full event shape; graphs without Activity nodes (the
 * Redis pot's older ontology) fall back to merged PullRequest nodes so every
 * hand-authored dataset still yields a timeline.
 */
function deriveTimelineFromGraph(
  nodes: ProjectGraphNode[],
  edges: ProjectGraphEdge[],
): TimelineActivity[] {
  const byKey = new Map(nodes.map((n) => [n.entity_key, n]));

  // One pass over the edges: actor (person -PERFORMED/AUTHORED-> activity),
  // touched and mentioned entities (activity -TOUCHED/MENTIONS-> entity).
  const actorByActivity = new Map<string, string>();
  const touchedByActivity = new Map<string, string[]>();
  const mentionsByActivity = new Map<string, string[]>();
  for (const e of edges) {
    if (e.type === "PERFORMED" || e.type === "AUTHORED") {
      if (!actorByActivity.has(e.to)) actorByActivity.set(e.to, e.from);
    } else if (e.type === "TOUCHED") {
      const arr = touchedByActivity.get(e.from);
      if (arr) arr.push(e.to);
      else touchedByActivity.set(e.from, [e.to]);
    } else if (e.type === "MENTIONS") {
      const arr = mentionsByActivity.get(e.from);
      if (arr) arr.push(e.to);
      else mentionsByActivity.set(e.from, [e.to]);
    }
  }

  const items: TimelineActivity[] = [];
  const hasActivities = nodes.some((n) => n.labels.includes("Activity"));
  for (const n of nodes) {
    const p = n.properties ?? {};
    let timestamp: string | null = null;
    let verb: string | null = null;
    if (n.labels.includes("Activity")) {
      timestamp = (p.occurred_at as string | undefined) ?? null;
      verb = (p.verb_class as string | undefined) ?? null;
    } else if (!hasActivities && n.labels.includes("PullRequest") && p.merged_at) {
      timestamp = p.merged_at as string;
      verb = "pr_merged";
    } else {
      continue;
    }
    if (!timestamp) continue;
    const actorKey = actorByActivity.get(n.entity_key);
    items.push({
      id: n.entity_key,
      activity_key: n.entity_key,
      timestamp,
      verb_class: verb,
      title: (p.name as string | undefined) ?? n.entity_key,
      activity_type: (p.activity_type as string | undefined) ?? null,
      summary: (p.summary as string | undefined) ?? null,
      description: (p.description as string | undefined) ?? null,
      actor: actorKey ? entityRef(actorKey, byKey) : null,
      repo_name: (p.repo_name as string | undefined) ?? null,
      url: (p.url as string | undefined) ?? null,
      number: (p.number as number | undefined) ?? null,
      state: (p.state as string | undefined) ?? null,
      touched: (touchedByActivity.get(n.entity_key) ?? []).map((k) =>
        entityRef(k, byKey),
      ),
      mentions: (mentionsByActivity.get(n.entity_key) ?? []).map((k) =>
        entityRef(k, byKey),
      ),
      source_system: "github",
      evidence_strength: 0.9,
    });
  }
  items.sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""));
  return items;
}

/** Synthesized recent activity for pots without a hand-authored graph. */
function buildGenericTimeline(cfg: DemoPotConfig): TimelineActivity[] {
  const mk = (
    idx: number,
    msAgo: number,
    verb: string,
    activityType: string,
    title: string,
    summary: string,
    personIdx: number,
  ): TimelineActivity => ({
    id: `activity:demo:${cfg.slug}-${idx}`,
    activity_key: `activity:demo:${cfg.slug}-${idx}`,
    timestamp: iso(msAgo),
    verb_class: verb,
    title,
    activity_type: activityType,
    summary,
    actor: {
      key: `person:${cfg.people[personIdx % cfg.people.length].login}`,
      name: cfg.people[personIdx % cfg.people.length].name,
      labels: ["Person"],
    },
    repo_name: cfg.primaryRepo,
    touched: [
      {
        key: `repository:${cfg.primaryRepo}`,
        name: cfg.primaryRepo,
        labels: ["Repository"],
      },
    ],
    mentions: [],
    source_system: "github",
    evidence_strength: 0.9,
  });
  return [
    mk(1, 5 * HOUR, "pr_opened", "pull_request", `#8424 ${cfg.features[2].name} follow-ups`, `Opens the follow-up work planned after the ${cfg.features[2].name} rollout.`, 2),
    mk(2, 22 * HOUR, "deploy_succeeded", "deployment", `Deploy ${cfg.services[0]} · production`, `Rolled out the ${cfg.features[0].name} groundwork to production.`, 0),
    mk(3, DAY + 6 * HOUR, "pr_merged", "pull_request", `#8421 ${cfg.features[0].name} groundwork`, `Merged the groundwork PR behind a feature flag in ${cfg.services[0]}.`, 0),
    mk(4, 2 * DAY, "pr_review_approved", "review", `Review #8421 · approved`, `Approved after a pass over the ${cfg.services[0]} persistence changes.`, 1),
    mk(5, 3 * DAY, "github_issue_opened", "issue", `Flaky ${cfg.services[2]} integration test`, `Intermittent timeout in the ${cfg.services[2]} suite under parallel runs.`, 3),
    mk(6, 5 * DAY, "discussion_posted", "discussion", `RFC: ${cfg.features[1].name} rollout plan`, `Thread on sequencing the ${cfg.features[1].name} rollout across environments.`, 1),
    mk(7, 8 * DAY, "alert_fired", "alert", `Latency alert · ${cfg.services[1]}`, `p95 latency crossed the alert threshold for ${cfg.services[1]}; auto-resolved after rollback.`, 2),
    mk(8, 12 * DAY, "release_published", "release", `${cfg.slug} v2.4.0`, `Cut the v2.4.0 release including the ${cfg.features[0].name} groundwork.`, 0),
  ];
}

const demoTimelineCache = new Map<string, TimelineActivity[]>();

function demoTimelineItems(potId: string): TimelineActivity[] {
  const cached = demoTimelineCache.get(potId);
  if (cached) return cached;
  let items: TimelineActivity[];
  if (potId === DEMO_POTPIE_POT_ID) {
    items = deriveTimelineFromGraph(POTPIE_GRAPH_NODES, POTPIE_GRAPH_EDGES);
  } else if (potId === DEMO_REDIS_POT_ID) {
    items = deriveTimelineFromGraph(REDIS_GRAPH_NODES, REDIS_GRAPH_EDGES);
  } else {
    items = buildGenericTimeline(configFor(potId));
  }
  demoTimelineCache.set(potId, items);
  return items;
}

const WINDOW_MS: Record<string, number> = {
  "24h": DAY,
  "7d": 7 * DAY,
  "14d": 14 * DAY,
  "30d": 30 * DAY,
  "90d": 90 * DAY,
  "180d": 180 * DAY,
};

export function getDemoPotTimeline(
  potId: string,
  options: PotTimelineOptions = {},
): PotTimeline {
  // Same resolution rules as the backend endpoint: explicit `since` wins,
  // otherwise the relative window applies ("all" and unknown windows are
  // unbounded). The result-size `limit` is deliberately ignored — the demo
  // pots exist to be explored.
  let since: string | null = options.since ?? null;
  if (!since && options.window && WINDOW_MS[options.window]) {
    since = iso(WINDOW_MS[options.window]);
  }
  const until = options.until ?? null;
  const verbs = options.verbClasses?.length
    ? new Set(options.verbClasses)
    : null;
  const items = demoTimelineItems(potId).filter((it) => {
    if (!it.timestamp) return false;
    if (since && it.timestamp < since) return false;
    if (until && it.timestamp > until) return false;
    if (verbs && (!it.verb_class || !verbs.has(it.verb_class))) return false;
    return true;
  });
  return { pot_id: potId, items, window: { since, until } };
}

// ---- Context query (Resolve / Agentic / Evidence) ---------------------------

function demoSearchResults(cfg: DemoPotConfig, query: string): ContextSearchResult[] {
  return [
    {
      uuid: `demo-fact-${cfg.slug}-1`,
      name: `${cfg.features[0].name} design`,
      summary: `${cfg.features[0].name} was introduced to ${cfg.blurb.toLowerCase()} The rollout landed behind a feature flag in ${cfg.services[0]}.`,
      fact: null,
      source_refs: [`github:${cfg.primaryRepo}#8421`, `doc:${cfg.features[0].key}-spec`],
      score: 0.92,
      created_at: iso(30 * DAY),
      valid_at: iso(30 * DAY),
    },
    {
      uuid: `demo-fact-${cfg.slug}-2`,
      name: `${cfg.services[1]} ownership`,
      summary: `${cfg.people[0].name} owns ${cfg.services[1]} and reviews changes to the ${cfg.features[1].name} path.`,
      fact: null,
      source_refs: [`${cfg.linearTeam.key}-142`],
      score: 0.81,
      created_at: iso(12 * DAY),
      valid_at: iso(12 * DAY),
    },
    {
      uuid: `demo-fact-${cfg.slug}-3`,
      name: `Recent change · ${query || cfg.features[2].name}`,
      summary: `The most recent merged PR hardened ${cfg.services[2]} persistence and added regression tests.`,
      fact: null,
      source_refs: [`github:${cfg.primaryRepo}#8390`],
      score: 0.74,
      created_at: iso(2 * DAY),
      valid_at: iso(2 * DAY),
    },
  ];
}

function demoAnswerEnvelope(
  cfg: DemoPotConfig,
  query: string,
  investigate: boolean,
): ContextAnswerEnvelope {
  const evidence = demoSearchResults(cfg, query).map((r) => ({
    name: r.name,
    summary: r.summary,
    source_refs: r.source_refs,
  }));
  const envelope: ContextAnswerEnvelope = {
    ok: true,
    answer: {
      summary: `Based on this pot's context: ${cfg.features[0].name} is implemented in ${cfg.services[0]} and owned by ${cfg.people[0].name}. ${cfg.blurb} Recent work has focused on ${cfg.features[2].name} and hardening ${cfg.services[2]}.`,
      recent_changes: [
        { title: `Merge #8421 · ${cfg.features[0].name} groundwork`, repo_name: cfg.primaryRepo },
        { title: `Harden ${cfg.services[2]} persistence`, repo_name: cfg.primaryRepo },
      ],
      decisions: [
        { statement: `Adopt ${cfg.features[0].name} approach`, rationale: "Lowest blast radius for the rollout." },
      ],
      owners: [{ name: cfg.people[0].name, area: cfg.services[0] }],
    },
    evidence,
    source_refs: [`github:${cfg.primaryRepo}#8421`, `doc:${cfg.features[0].key}-spec`, `${cfg.linearTeam.key}-142`],
    confidence: "high",
    as_of: iso(HOUR),
    coverage: { status: "good", gaps: [] },
    quality: { status: "healthy", recommended_maintenance: [] },
    recommended_next_actions: [
      `Review the ${cfg.features[1].name} rollout plan`,
      `Check open ${cfg.linearTeam.key} issues on ${cfg.services[1]}`,
    ],
  };
  if (investigate) {
    envelope.agent = {
      iterations: 3,
      steps: [
        { tool: "context_search", arguments: { query }, result_kind: "facts", result_count: 3 },
        { tool: "context_recent_changes", arguments: { repo_name: cfg.primaryRepo }, result_kind: "changes", result_count: 2 },
        { tool: "context_file_owners", arguments: { service: cfg.services[0] }, result_kind: "owners", result_count: 1 },
      ],
      usage: { input_tokens: 4200, output_tokens: 680 },
    };
  }
  return envelope;
}

export function getDemoContextGraphResult<T = unknown>(
  body: ContextGraphQuery,
): ContextGraphResult<T> {
  const cfg = configFor(body.pot_id);
  const goal = body.goal ?? "answer";
  const query = body.query ?? "";

  if (goal === "retrieve") {
    return {
      kind: "semantic_search",
      goal,
      strategy: body.strategy ?? "semantic",
      result: demoSearchResults(cfg, query) as unknown as T,
      meta: { demo: true, fallbacks: [] },
    };
  }

  const investigate = goal === "investigate";
  return {
    kind: "context_answer",
    goal,
    strategy: body.strategy ?? (investigate ? "auto" : "hybrid"),
    result: demoAnswerEnvelope(cfg, query, investigate) as unknown as T,
    meta: { demo: true, fallbacks: [] },
  };
}

// ---- Mutations (synthetic no-ops, never hit the backend) --------------------

export function getDemoRawIngestionResult(potId: string): RawIngestionResult {
  return {
    event_id: `demo-evt-adhoc-${Math.random().toString(36).slice(2, 10)}`,
    status: "queued",
    pot_id: potId,
    error: null,
  };
}

export function getDemoInvitation(
  potId: string,
  email: string,
): PotInvitation {
  const cfg = configFor(potId);
  return {
    id: `demo-invite-${cfg.slug}-${Math.random().toString(36).slice(2, 8)}`,
    pot_id: potId,
    email,
    role: "user",
    status: "pending",
    invited_by_user_id: DEMO_OWNER_USER_ID,
    accepted_by_user_id: null,
    expires_at: new Date(NOW + 14 * DAY).toISOString(),
    created_at: new Date().toISOString(),
    accepted_at: null,
    token: `demo-token-${Math.random().toString(36).slice(2, 14)}`,
  };
}

// Resolve the pot a demo invite link points at from its "demo-token-<slug>"
// token, falling back to the first demo pot for the random-suffix tokens
// minted by `getDemoInvitation`.
function demoPotForToken(token: string): Pot {
  const slug = token.replace(/^demo-token-/, "");
  return DEMO_POTS.find((p) => p.slug === slug) ?? DEMO_POTS[0];
}

export function getDemoAcceptedInvitation(
  token: string,
): { ok: boolean; pot_id: string; role: PotRole } {
  return { ok: true, pot_id: demoPotForToken(token).id, role: "user" };
}

export function getDemoDeclinedInvitation(
  token: string,
): { ok: boolean; pot_id: string; declined: boolean } {
  return { ok: true, pot_id: demoPotForToken(token).id, declined: true };
}

// ---- Streams (no network; keep the Events tab "Live" and clean) -------------

type DemoStreamOptions = {
  signal?: AbortSignal;
  onOpen?: () => void;
};

// Report the stream as connected, then idle until aborted — a promise that
// only settles on abort. No fetch is made, so the consumer's reconnect loop
// parks here (instead of spinning against 404s) and the Events tab shows a
// steady green "Live" with zero backend traffic. Used for both the per-pot
// status stream and the per-event activity stream; the latter simply falls
// back to the event's persisted reconciliation runs for its timeline.
export function streamDemoPotStatus(options: DemoStreamOptions): Promise<void> {
  return new Promise<void>((resolve) => {
    if (options.signal?.aborted) {
      resolve();
      return;
    }
    options.onOpen?.();
    options.signal?.addEventListener("abort", () => resolve(), { once: true });
  });
}

export function streamDemoEventActivity(
  options: DemoStreamOptions,
): Promise<void> {
  return streamDemoPotStatus(options);
}
