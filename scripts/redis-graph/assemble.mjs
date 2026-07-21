// Deterministic assembler: merges the survey/narrative JSONs produced by the
// redis-context-graph workflow into a ProjectGraph-shaped dataset and emits
// potpie-ui/lib/mock/redisGraph.ts. Validates slug references, dedupes edges,
// reports orphans. Run: node assemble.mjs [--dry]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = new URL(".", import.meta.url).pathname;
const OUT_TS = "/Users/nandan/Desktop/Dev/potpie-ui/lib/mock/redisGraph.ts";
const DRY = process.argv.includes("--dry");

// ---- load ------------------------------------------------------------------
const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
const surveys = [];
let narrative = null;
let history = null;
for (const f of files) {
  let raw = readFileSync(join(DIR, f), "utf8").replace(/^﻿/, "").trim();
  if (raw.startsWith("```")) raw = raw.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (e) {
    console.error(`PARSE FAIL ${f}: ${e.message}`);
    process.exitCode = 1;
    continue;
  }
  if (f === "narrative.json") narrative = doc;
  else if (f === "history.json") history = doc;
  else surveys.push(doc);
}
if (!narrative) throw new Error("narrative.json missing");

const warnings = [];
const warn = (m) => warnings.push(m);

// ---- curation --------------------------------------------------------------
// The fleet over-emits; keep the graph balanced and demo-legible.
const CONFIG_KEEP = new Set([
  "maxmemory", "maxmemory-policy", "activedefrag", "lazyfree-lazy-eviction",
  "latency-monitor-threshold", "appendonly", "appendfsync", "save",
  "aof-use-rdb-preamble", "auto-aof-rewrite-percentage", "repl-diskless-sync",
  "repl-diskless-load", "repl-backlog-size", "repl-compression",
  "repl-compression-max-latency", "io-threads", "hz", "client-output-buffer-limit",
  "cluster-enabled", "cluster-node-timeout", "cluster-slot-migration-handoff-max-lag-bytes",
  "notify-keyspace-events", "tracking-table-max-keys", "slowlog-log-slower-than",
  "aclfile", "tls-port", "busy-reply-threshold", "stream-node-max-entries",
  "stream-node-max-bytes", "stream-idmp-duration", "hash-max-listpack-entries",
  "zset-max-listpack-entries", "active-expire-effort",
]);
const DECISION_KEEP = new Set([
  // narrative spine
  "streams-dlq-design", "repl-zstd-compression", "atomic-slot-migration",
  "migrate-restore-resharding", "single-threaded-event-loop", "io-threads-for-network",
  "listpack-over-ziplist", "ziplist-encoding", "rdb-aof-hybrid-persistence",
  "jemalloc-default-allocator", "kvstore-per-slot-dicts", "resp3-protocol-decision",
  // survey keepers
  "resp2-invalidation-via-redirect-only", "unblocked-clients-beforesleep",
  "crc16-16384-slots", "gossip-fanout-tenth",
  "compile-time-multiplexer-selection", "connection-type-vtable",
  "json-generated-command-table", "resp-parser-trusted-input-only",
  "zset-dual-structure", "hll-as-string", "kvobj-embedded-key-metadata", "hfe-two-level-expiry",
  "siphash12-over-siphash24", "dict-resize-avoid-during-cow", "chk-cuckoo-heavy-keeper-adoption",
  "approximate-lru-eviction-pool", "exclude-buffers-from-maxmemory",
  "gcra-deterministic-replication", "lazyfree-effort-threshold",
  "mpaof-base-incr-history", "everysec-fsync-on-bio-thread", "diskless-eof-mark-framing",
  "dual-replid-history", "zstd-end-frame-flush",
  "script-effects-replication-only", "lua-dedicated-jemalloc-arena", "vector-sets-bundled-in-tree",
  "dlq-distinct-from-xnack", "dlq-replay-preserves-entry-id", "pel-time-ordered-list-nack-zone",
  "lua-pinned-5-1", "jemalloc-defrag-contract",
]);
const FEATURE_DROP = new Set([
  "hotkeys-topk-tracking", "batch-memory-prefetching", "fork-bgsave-cow",
  "aofrw", "cli-key-analytics",
]);
// Dropped-slug aliases so cross-references keep resolving.
const ALIASES = new Map([
  ["hotkeys-topk-tracking", "feature:hotkey-detection"],
  ["io-threads-no-command-execution", "decision:io-threads-for-network"],
  ["listpack-supersedes-ziplist", "decision:listpack-over-ziplist"],
  ["asm-dual-channel-handoff", "decision:atomic-slot-migration"],
  ["kvstore-fenwick-cumulative-counts", "decision:kvstore-per-slot-dicts"],
  ["zstd-optin-noop-fallback", "decision:repl-zstd-compression"],
  ["vendor-deps-in-tree", "preference:no-external-runtime-deps"],
  ["dlq-group-scoped-not-side-stream", "decision:streams-dlq-design"],
  ["rdb-preamble-aof-base", "decision:rdb-aof-hybrid-persistence"],
  ["feature:fork-bgsave-cow", "component:rdb-persistence"],
]);

// ---- node store ------------------------------------------------------------
const nodes = new Map(); // key -> {id, entity_key, labels, properties}
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ""));

function addNode(key, label, props, { mergeOk = true } = {}) {
  const existing = nodes.get(key);
  if (existing) {
    if (!mergeOk) warn(`duplicate node ${key}`);
    // keep the longer description / merge missing props
    const a = existing.properties, b = clean(props);
    for (const [k, v] of Object.entries(b)) {
      if (a[k] === undefined) a[k] = v;
      else if (k === "description" && typeof v === "string" && v.length > String(a[k]).length) a[k] = v;
    }
    return existing;
  }
  const node = { id: key, entity_key: key, labels: [label], properties: clean(props) };
  nodes.set(key, node);
  return node;
}

// ---- edge store ------------------------------------------------------------
const edges = new Map(); // "from|type|to" -> edge
function addEdge(from, type, to, properties = {}) {
  if (from === to) return warn(`self-edge dropped: ${from} -${type}-> ${to}`);
  const id = `${from}|${type}|${to}`;
  if (edges.has(id)) return;
  edges.set(id, { from, type, to, properties: clean(properties) });
}

// ---- slug resolution -------------------------------------------------------
const PREFIX_ORDER = ["component", "feature", "interface", "adapter", "datastore", "dependency", "config", "service", "bug_pattern", "decision", "document", "person", "team", "environment"];
function resolveRef(ref, ctx) {
  if (!ref || typeof ref !== "string") return null;
  if (ALIASES.has(ref)) ref = ALIASES.get(ref);
  if (ref.includes(":")) {
    if (nodes.has(ref)) return ref;
    warn(`unresolved full ref "${ref}" (${ctx})`);
    return null;
  }
  for (const p of PREFIX_ORDER) {
    const key = `${p}:${ref}`;
    if (nodes.has(key)) return key;
  }
  warn(`unresolved slug "${ref}" (${ctx})`);
  return null;
}

// =============================================================================
// PASS 1 — create all nodes
// =============================================================================

// Repositories + fixed services
addNode("repository:redis/redis", "Repository", {
  name: "redis/redis", repo_name: "redis/redis", default_branch: "unstable",
  summary: "Primary Redis source repository.",
  description: "Main redis/redis source tree (branch unstable): server, data types, streams, persistence, replication, cluster, scripting, modules, tcl test suite. The pot's primary code scope.",
});
addNode("repository:redis/redis-doc", "Repository", {
  name: "redis/redis-doc", repo_name: "redis/redis-doc", default_branch: "master",
  summary: "Companion documentation repository.",
  description: "redis/redis-doc: command reference and topic documentation published to redis.io; companion docs scope for the redis/redis code repository.",
});
const SERVICES = {
  "service:redis-server": ["redis-server", "The Redis server itself — single-threaded core with I/O threads, persistence, replication, cluster.", "redis-server binary: event-loop driven in-memory data structure server. Runs standalone, replica, sentinel-monitored, or cluster mode; persists via RDB snapshots and AOF; entry point for every data-path subsystem in this graph."],
  "service:redis-sentinel": ["redis-sentinel", "High-availability monitor: failure detection, leader election, automatic failover.", "redis-sentinel (sentinel.c, runs as redis-server --sentinel): monitors masters/replicas with SDOWN/ODOWN quorum agreement, elects a leader sentinel and promotes replicas on master failure. Searchable as 'failover', 'sentinel quorum', 'master promotion'."],
  "service:redis-cli": ["redis-cli", "Interactive command-line client, cluster admin tool, and latency/bigkeys analyzer.", "redis-cli: interactive REPL with linenoise, --cluster admin subcommands (create/reshard/atomic slot migration), --latency/--bigkeys/--memkeys analyzers, RESP3 support, TLS. First tool an operator reaches for."],
  "service:redis-benchmark": ["redis-benchmark", "Load-generation and throughput/latency measurement tool.", "redis-benchmark: configurable parallel-connection load generator with pipelining, RESP3, cluster support and hdr_histogram-based latency percentile reporting. Searchable as 'throughput test', 'ops/sec benchmark'."],
};
for (const [key, [name, summary, description]] of Object.entries(SERVICES)) {
  addNode(key, "Service", { name, summary, description, repo_name: "redis/redis" });
  addEdge(key, "DEFINED_IN", "repository:redis/redis", { truth: "authoritative_fact" });
}
addEdge("repository:redis/redis-doc", "RELATED_TO", "repository:redis/redis", { note: "companion docs repo" });

// Survey sections → nodes
const componentMeta = new Map(); // slug -> survey component (for pass 2)
for (const s of surveys) {
  for (const c of s.components ?? []) {
    const key = `component:${c.slug}`;
    addNode(key, "Component", {
      name: c.name, summary: c.summary, description: c.description,
      path: (c.paths ?? []).join(", "), loc: c.loc, repo_name: "redis/redis",
    });
    componentMeta.set(c.slug, c);
  }
  for (const i of s.interfaces ?? []) addNode(`interface:${i.slug}`, "Interface", { name: i.name, summary: i.summary, description: i.description });
  for (const a of s.adapters ?? []) addNode(`adapter:${a.slug}`, "Adapter", { name: a.name, summary: a.summary, description: a.description });
  for (const d of s.datastores ?? []) addNode(`datastore:${d.slug}`, "DataStore", { name: d.name, summary: d.summary, description: d.description });
  for (const d of s.dependencies ?? []) addNode(`dependency:${d.slug}`, "Dependency", { name: d.name ?? d.slug, summary: d.summary, description: d.description });
  for (const v of s.config_vars ?? []) {
    if (!CONFIG_KEEP.has(v.name)) continue;
    addNode(`config:${v.name}`, "ConfigVariable", { name: v.name, summary: v.summary, description: v.description, default: v.default });
  }
  for (const f of s.features ?? []) {
    if (FEATURE_DROP.has(f.slug)) continue;
    addNode(`feature:${f.slug}`, "Feature", { name: f.name, summary: f.summary, description: f.description, lifecycle: f.lifecycle ?? "active" });
  }
  for (const d of s.decisions ?? []) {
    if (!DECISION_KEEP.has(d.slug)) continue;
    addNode(`decision:${d.slug}`, "Decision", { name: d.title, statement: d.statement, rationale: d.rationale, summary: d.summary, description: d.description, evidence: d.evidence, lifecycle: "accepted" });
  }
  for (const d of s.documents ?? []) addNode(`document:${d.slug}`, "Document", { name: d.title, title: d.title, path: d.path, summary: d.summary, description: d.description });
}

// Narrative → nodes
const n = narrative;
for (const t of n.teams ?? []) addNode(`team:${t.slug}`, "Team", { name: t.name, summary: t.summary, description: t.description });
for (const p of n.people ?? []) addNode(`person:${p.slug}`, "Person", { name: p.name, email: p.email, role: p.role, summary: p.summary, description: p.description });
for (const e of n.environments ?? []) addNode(`environment:${e.slug}`, "Environment", { name: e.name, summary: e.summary, description: e.description });
for (const c of n.clusters ?? []) addNode(`cluster:${c.slug}`, "Cluster", { name: c.name, summary: c.summary, description: c.description });
for (const pr of n.prs ?? []) {
  addNode(`pull_request:redis-${pr.number}`, "PullRequest", {
    name: `#${pr.number} ${pr.title}`, number: pr.number, state: pr.state, kind: pr.kind,
    merged_at: pr.merged_date, summary: pr.summary, description: pr.description,
    url: `https://github.com/redis/redis/pull/${pr.number}`, repo_name: "redis/redis",
  });
}
for (const is of n.issues ?? []) {
  addNode(`issue:${is.slug}`, "Issue", {
    name: is.number ? `#${is.number} ${is.title}` : is.title, title: is.title, number: is.number,
    state: is.state, summary: is.summary, description: is.description,
    url: is.number ? `https://github.com/redis/redis/issues/${is.number}` : undefined,
  });
}
for (const d of n.decisions ?? []) addNode(`decision:${d.slug}`, "Decision", { name: d.title, statement: d.statement, rationale: d.rationale, lifecycle: d.lifecycle, summary: d.summary, description: d.description, decided_at: d.date });
for (const p of n.preferences ?? []) addNode(`preference:${p.slug}`, "Preference", { name: p.name, policy_kind: p.policy_kind, prescription: p.prescription, summary: p.summary, description: p.description });
for (const b of n.bug_patterns ?? []) addNode(`bug_pattern:${b.slug}`, "BugPattern", { name: b.name, symptom_signature: b.symptom_signature, summary: b.summary, description: b.description, first_seen: b.first_seen });
for (const f of n.fixes ?? []) addNode(`fix:${f.slug}`, "Fix", { name: f.name, fix_steps: f.fix_steps, verification_status: f.verification_status, summary: f.summary, description: f.description });
for (const i of n.investigations ?? []) addNode(`investigation:${i.slug}`, "Investigation", { name: i.name, status: i.status, summary: i.summary, description: i.description });
for (const d of n.deployments ?? []) addNode(`deployment:${d.slug}`, "Deployment", { name: d.name, date: d.date, environment: d.environment, summary: d.summary, description: d.description });
for (const r of n.runbooks ?? []) addNode(`runbook:${r.slug}`, "Runbook", { name: r.title, title: r.title, summary: r.summary, description: r.description });
for (const a of n.alerts ?? []) addNode(`alert:${a.slug}`, "Alert", { name: a.name, summary: a.summary, description: a.description });
for (const c of n.conversations ?? []) addNode(`conversation:${c.slug}`, "Conversation", { name: c.title, title: c.title, summary: c.summary, description: c.description });
for (const d of n.documents ?? []) addNode(`document:${d.slug}`, "Document", { name: d.title, title: d.title, summary: d.summary, description: d.description });

// =============================================================================
// PASS 2 — edges (all refs now resolvable)
// =============================================================================

for (const s of surveys) {
  for (const c of s.components ?? []) {
    const key = `component:${c.slug}`;
    const parent = resolveRef(c.part_of, `part_of of ${c.slug}`) ?? "service:redis-server";
    addEdge(key, "PART_OF", parent);
    for (const dep of c.depends_on ?? []) {
      const to = resolveRef(dep, `depends_on of ${c.slug}`);
      if (to) addEdge(key, "DEPENDS_ON", to);
    }
    for (const d of c.uses_deps ?? []) {
      const to = resolveRef(d.includes(":") ? d : `dependency:${d}`, `uses_deps of ${c.slug}`);
      if (to) addEdge(key, "USES", to);
    }
    for (const d of c.uses_datastores ?? []) {
      const to = resolveRef(d.includes(":") ? d : `datastore:${d}`, `uses_datastores of ${c.slug}`);
      if (to) addEdge(key, "USES", to);
    }
    for (const a of c.uses_adapters ?? []) {
      const to = resolveRef(a.includes(":") ? a : `adapter:${a}`, `uses_adapters of ${c.slug}`);
      if (to) addEdge(key, "USES_ADAPTER", to);
    }
    for (const i of c.exposes_interfaces ?? []) {
      const to = resolveRef(i.includes(":") ? i : `interface:${i}`, `exposes_interfaces of ${c.slug}`);
      if (to) addEdge(key, "IMPLEMENTS", to);
    }
    for (const v of c.config_vars ?? []) {
      if (!CONFIG_KEEP.has(v)) continue;
      const ck = `config:${v}`;
      if (!nodes.has(ck)) addNode(ck, "ConfigVariable", { name: v, summary: `redis.conf directive ${v}.` });
      addEdge(ck, "CONFIGURES", key);
    }
  }
  for (const i of s.interfaces ?? []) {
    const ikey = `interface:${i.slug}`;
    const svc = resolveRef(i.exposed_by, `exposed_by of ${i.slug}`) ?? "service:redis-server";
    addEdge(svc, "EXPOSES", ikey);
    for (const impl of i.implemented_by ?? []) {
      const c = resolveRef(impl, `implemented_by of iface ${i.slug}`);
      if (c) addEdge(c, "IMPLEMENTS", ikey);
    }
  }
  for (const a of s.adapters ?? []) for (const u of a.used_by ?? []) {
    const c = resolveRef(u, `used_by of adapter ${a.slug}`);
    if (c) addEdge(c, "USES_ADAPTER", `adapter:${a.slug}`);
  }
  for (const d of s.datastores ?? []) for (const u of d.used_by ?? []) {
    const c = resolveRef(u, `used_by of datastore ${d.slug}`);
    if (c) addEdge(c, "USES", `datastore:${d.slug}`);
  }
  for (const d of s.dependencies ?? []) for (const u of d.used_by ?? []) {
    const c = resolveRef(u, `used_by of dependency ${d.slug}`);
    if (c) addEdge(c, "USES", `dependency:${d.slug}`);
  }
  for (const v of s.config_vars ?? []) {
    if (!CONFIG_KEEP.has(v.name)) continue;
    const c = resolveRef(v.configures, `configures of ${v.name}`);
    if (c) addEdge(`config:${v.name}`, "CONFIGURES", c);
  }
  for (const f of s.features ?? []) {
    if (FEATURE_DROP.has(f.slug)) continue;
    const fkey = `feature:${f.slug}`;
    addEdge(resolveRef(f.provided_by, `provided_by of ${f.slug}`) ?? "service:redis-server", "PROVIDES", fkey);
    for (const impl of f.implemented_in ?? []) {
      const c = resolveRef(impl, `implemented_in of ${f.slug}`);
      if (c) addEdge(fkey, "IMPLEMENTED_IN", c);
    }
  }
  for (const d of s.decisions ?? []) {
    if (!DECISION_KEEP.has(d.slug)) continue;
    for (const a of d.affects ?? []) {
      const t = resolveRef(a, `affects of decision ${d.slug}`);
      if (t) addEdge(`decision:${d.slug}`, "AFFECTS", t, { truth: "agent_claim", confidence: 0.85 });
    }
  }
  for (const d of s.documents ?? []) for (const t of d.documents ?? []) {
    const tk = resolveRef(t, `documents of doc ${d.slug}`);
    if (tk) addEdge(`document:${d.slug}`, "DOCUMENTS", tk);
  }
}

// Narrative edges
for (const p of n.people ?? []) for (const t of p.member_of ?? []) {
  const tk = resolveRef(t.includes(":") ? t : `team:${t}`, `member_of of ${p.slug}`);
  if (tk) addEdge(`person:${p.slug}`, "MEMBER_OF", tk);
}
for (const o of n.ownership ?? []) {
  const owner = resolveRef(o.owner, "ownership.owner");
  const owned = resolveRef(o.owns, "ownership.owns");
  if (owner && owned) addEdge(owned, "OWNED_BY", owner, { truth: "user_decision" });
}
for (const pr of n.prs ?? []) {
  const key = `pull_request:redis-${pr.number}`;
  const evidence = { evidence: `github:redis/redis#${pr.number}`, truth: "source_observation" };
  const author = resolveRef(pr.authored_by?.includes(":") ? pr.authored_by : `person:${pr.authored_by}`, `author of PR ${pr.number}`);
  if (author) addEdge(author, "AUTHORED", key);
  for (const t of pr.touches ?? []) {
    const tk = resolveRef(t, `touches of PR ${pr.number}`);
    if (tk) addEdge(key, "TOUCHED", tk, evidence);
  }
  if (pr.resolves_issue) {
    const ik = resolveRef(pr.resolves_issue.includes(":") ? pr.resolves_issue : `issue:${pr.resolves_issue}`, `resolves_issue of PR ${pr.number}`);
    if (ik) addEdge(key, "RESOLVES", ik, evidence);
  }
  if (pr.implements_feature) {
    const fk = resolveRef(pr.implements_feature.includes(":") ? pr.implements_feature : `feature:${pr.implements_feature}`, `implements_feature of PR ${pr.number}`);
    if (fk) addEdge(key, "IMPLEMENTS", fk, evidence);
  }
}
for (const is of n.issues ?? []) for (const m of is.mentions ?? []) {
  const t = resolveRef(m, `mentions of issue ${is.slug}`);
  if (t) addEdge(`issue:${is.slug}`, "MENTIONS", t);
}
for (const d of n.decisions ?? []) {
  const key = `decision:${d.slug}`;
  if (d.decided_by) {
    const p = resolveRef(d.decided_by.includes(":") ? d.decided_by : `person:${d.decided_by}`, `decided_by of ${d.slug}`);
    if (p) addEdge(p, "AUTHORED", key);
  }
  for (const a of d.affects ?? []) {
    const t = resolveRef(a, `affects of decision ${d.slug}`);
    if (t) addEdge(key, "AFFECTS", t, { truth: "user_decision", confidence: 0.9 });
  }
  if (d.supersedes) {
    const t = resolveRef(d.supersedes.includes(":") ? d.supersedes : `decision:${d.supersedes}`, `supersedes of ${d.slug}`);
    if (t) addEdge(key, "SUPERSEDES", t);
  }
}
for (const p of n.preferences ?? []) for (const a of p.applies_to ?? []) {
  const t = resolveRef(a, `applies_to of pref ${p.slug}`);
  if (t) addEdge(`preference:${p.slug}`, "POLICY_APPLIES_TO", t, { truth: "user_decision" });
}
for (const b of n.bug_patterns ?? []) for (const r of b.reproduces ?? []) {
  const t = resolveRef(r, `reproduces of ${b.slug}`);
  if (t) addEdge(`bug_pattern:${b.slug}`, "REPRODUCES", t, { truth: "agent_claim", confidence: 0.9 });
}
for (const f of n.fixes ?? []) {
  const key = `fix:${f.slug}`;
  const bp = resolveRef(f.resolves?.includes(":") ? f.resolves : `bug_pattern:${f.resolves}`, `resolves of fix ${f.slug}`);
  if (bp) addEdge(key, f.outcome === "attempt_failed" ? "ATTEMPTED_FIX_FAILED" : "RESOLVES", bp, { truth: "agent_claim", confidence: f.outcome === "attempt_failed" ? 0.95 : 0.9 });
  if (f.via_pr) {
    const prk = `pull_request:redis-${f.via_pr}`;
    if (nodes.has(prk)) addEdge(prk, "DELIVERS", key);
    else warn(`fix ${f.slug} via_pr ${f.via_pr} has no PR node`);
  }
  if (f.verified_by) {
    const p = resolveRef(f.verified_by.includes(":") ? f.verified_by : `person:${f.verified_by}`, `verified_by of fix ${f.slug}`);
    if (p) addEdge(p, "VERIFIED", key);
  }
}
for (const i of n.investigations ?? []) {
  const key = `investigation:${i.slug}`;
  const bp = resolveRef(i.investigates?.includes(":") ? i.investigates : `bug_pattern:${i.investigates}`, `investigates of ${i.slug}`);
  if (bp) addEdge(key, "INVESTIGATES", bp);
  if (i.led_by) {
    const p = resolveRef(i.led_by.includes(":") ? i.led_by : `person:${i.led_by}`, `led_by of ${i.slug}`);
    if (p) addEdge(p, "AUTHORED", key);
  }
}
for (const de of n.deploy_edges ?? []) {
  const svc = resolveRef(de.service, "deploy_edges.service");
  const env = resolveRef(de.environment?.includes(":") ? de.environment : `environment:${de.environment}`, "deploy_edges.environment");
  if (svc && env) addEdge(svc, "DEPLOYED_TO", env);
}
for (const c of n.clusters ?? []) for (const e of c.hosts_environments ?? []) {
  const env = resolveRef(e.includes(":") ? e : `environment:${e}`, `hosts_environments of ${c.slug}`);
  if (env) addEdge(env, "HOSTED_ON", `cluster:${c.slug}`);
}
for (const d of n.deployments ?? []) {
  const svc = resolveRef(d.deploys, `deploys of ${d.slug}`);
  if (svc) addEdge(`deployment:${d.slug}`, "DEPLOYS", svc);
}
for (const r of n.runbooks ?? []) for (const a of r.applies_to ?? []) {
  const t = resolveRef(a, `applies_to of runbook ${r.slug}`);
  if (t) addEdge(`runbook:${r.slug}`, "DOCUMENTS", t);
}
for (const a of n.alerts ?? []) {
  const t = resolveRef(a.watches, `watches of alert ${a.slug}`);
  if (t) addEdge(`alert:${a.slug}`, "WATCHES", t);
}
for (const c of n.conversations ?? []) {
  for (const m of c.mentions ?? []) {
    const t = resolveRef(m, `mentions of conv ${c.slug}`);
    if (t) addEdge(`conversation:${c.slug}`, "MENTIONS", t);
  }
  for (const p of c.participants ?? []) {
    const pk = resolveRef(p.includes(":") ? p : `person:${p}`, `participants of conv ${c.slug}`);
    if (pk) addEdge(pk, "PARTICIPATED_IN", `conversation:${c.slug}`);
  }
}
for (const d of n.documents ?? []) for (const t of d.documents ?? []) {
  const tk = resolveRef(t, `documents of narrative doc ${d.slug}`);
  if (tk) addEdge(`document:${d.slug}`, "DOCUMENTS", tk);
}

// =============================================================================
// PASS 3 — relationships metadata on nodes, validation, stats
// =============================================================================
const nameOf = (k) => {
  const p = nodes.get(k)?.properties ?? {};
  return p.name ?? p.title ?? p.statement ?? k;
};
for (const node of nodes.values()) node.relationships = [];
for (const e of edges.values()) {
  const from = nodes.get(e.from), to = nodes.get(e.to);
  if (!from || !to) { warn(`dangling edge ${e.from} -${e.type}-> ${e.to}`); continue; }
  from.relationships.push({ type: e.type, direction: "out", target_key: e.to, target_labels: to.labels, target_name: nameOf(e.to) });
  to.relationships.push({ type: e.type, direction: "in", source_key: e.from, source_labels: from.labels, source_name: nameOf(e.from) });
}
const finalEdges = [...edges.values()].filter((e) => nodes.has(e.from) && nodes.has(e.to));

const degree = new Map();
for (const e of finalEdges) {
  degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
  degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
}
const orphans = [...nodes.keys()].filter((k) => !degree.has(k));
if (orphans.length) warn(`ORPHAN nodes (${orphans.length}): ${orphans.join(", ")}`);
for (const node of nodes.values()) {
  const d = node.properties.description;
  if (!d || String(d).length < 60) warn(`thin description on ${node.entity_key}`);
}

const labelCounts = {};
for (const node of nodes.values()) labelCounts[node.labels[0]] = (labelCounts[node.labels[0]] ?? 0) + 1;
const edgeTypeCounts = {};
for (const e of finalEdges) edgeTypeCounts[e.type] = (edgeTypeCounts[e.type] ?? 0) + 1;
const topEntities = [...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  .map(([key, deg]) => ({ entity_key: key, labels: nodes.get(key).labels, name: nameOf(key), degree: deg }));

const stats = {
  nodeCount: nodes.size,
  edgeCount: finalEdges.length,
  labelCounts,
  edgeTypeCounts,
  topEntities,
};

console.log(`nodes=${nodes.size} edges=${finalEdges.length} labels=${Object.keys(labelCounts).length} edgeTypes=${Object.keys(edgeTypeCounts).length}`);
console.log("labelCounts:", JSON.stringify(labelCounts));
console.log("edgeTypeCounts:", JSON.stringify(edgeTypeCounts));
console.log(`warnings (${warnings.length}):`);
for (const w of warnings) console.log("  -", w);
if (DRY) process.exit(0);

// =============================================================================
// EMIT
// =============================================================================
const sortedNodes = [...nodes.values()];
const header = `// Hand-authored (agent-extracted) project-memory graph of the Redis codebase
// for the demo "Redis" pot. Generated from a multi-agent survey of the actual
// redis/redis source tree (subsystem deep-dives + git history mining), then
// assembled and validated mechanically — see scripts/redis-graph/assemble.mjs.
//
// Shape: ProjectGraphNode/ProjectGraphEdge (services/PotService.ts), following
// the potpie context-engine ontology (entity_key grammar, retrieval-grade
// descriptions, canonical edge types like DEFINED_IN/DEPENDS_ON/PROVIDES/
// OWNED_BY/TOUCHED/REPRODUCES/RESOLVES). Structural code edges (PART_OF,
// component-level DEPENDS_ON) extend the strict backend ontology for demo
// legibility. Rendering-agnostic: the canvas is free to change; this file is
// the dataset of record.
//
// Do not hand-edit node/edge arrays piecemeal — regenerate via the assembler.

import type {
  ProjectGraphEdge,
  ProjectGraphNode,
} from "@/services/PotService";

`;
const bareNodes = sortedNodes.map(({ relationships, ...bare }) => bare);
const body =
  `type BareNode = Omit<ProjectGraphNode, "relationships">;\n\n` +
  `const NODES: BareNode[] = ${JSON.stringify(bareNodes, null, 1)};\n\n` +
  `export const REDIS_GRAPH_EDGES: ProjectGraphEdge[] = ${JSON.stringify(finalEdges, null, 1)};\n\n` +
  `export const REDIS_GRAPH_STATS = ${JSON.stringify(stats, null, 1)} as const;\n\n` +
  `// The per-node relationship metadata (inspector + expand-frontier UX) is fully
// derivable from the edge list, so it is attached here at module load instead
// of being stored twice in this file.
function withRelationships(
  bare: BareNode[],
  edges: ProjectGraphEdge[],
): ProjectGraphNode[] {
  const byKey = new Map<string, ProjectGraphNode>();
  for (const b of bare) byKey.set(b.entity_key, { ...b, relationships: [] });
  const nameOf = (key: string): string => {
    const p = byKey.get(key)?.properties;
    return (
      (p?.name as string | undefined) ??
      (p?.title as string | undefined) ??
      key
    );
  };
  for (const e of edges) {
    const from = byKey.get(e.from);
    const to = byKey.get(e.to);
    if (!from || !to) continue;
    from.relationships.push({
      type: e.type,
      direction: "out",
      target_key: e.to,
      target_labels: to.labels,
      target_name: nameOf(e.to),
    });
    to.relationships.push({
      type: e.type,
      direction: "in",
      source_key: e.from,
      source_labels: from.labels,
      source_name: nameOf(e.from),
    });
  }
  return Array.from(byKey.values());
}

export const REDIS_GRAPH_NODES: ProjectGraphNode[] = withRelationships(
  NODES,
  REDIS_GRAPH_EDGES,
);\n`;
writeFileSync(OUT_TS, header + body);
console.log(`wrote ${OUT_TS} (${((header.length + body.length) / 1024).toFixed(0)} KB)`);
