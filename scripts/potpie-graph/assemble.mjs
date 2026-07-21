// Deterministic assembler: merges the survey JSONs authored by the
// potpie-context-graph workflow into a ProjectGraph-shaped dataset and emits
// potpie-ui/lib/mock/potpieGraph.ts.
//
// Unlike the redis assembler, this one validates against the SHIPPED ontology
// (potpie/context-core/src/potpie_context_core/ontology.py): 24 entity labels,
// 25 public predicates + RELATED_TO + the SUPERSEDES system edge, and the
// per-predicate allowed_pairs table. Violations are dropped and reported —
// align the declaration, don't relax the check.
//
// Run: node assemble.mjs [--dry]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = new URL(".", import.meta.url).pathname;
const OUT_TS = "/Users/nandan/Desktop/Dev/potpie-ui/lib/mock/potpieGraph.ts";
const DRY = process.argv.includes("--dry");

// ---- ontology contract -----------------------------------------------------

// array name -> [label, key prefix]
const ARRAYS = {
  repositories: ["Repository", "repo"],
  services: ["Service", "service"],
  environments: ["Environment", "environment"],
  clusters: ["Cluster", "cluster"],
  deployment_targets: ["DeploymentTarget", "deployment_target"],
  datastores: ["DataStore", "datastore"],
  dependencies: ["Dependency", "dependency"],
  api_contracts: ["APIContract", "api_contract"],
  adapters: ["Adapter", "adapter"],
  config_vars: ["ConfigVariable", "config"],
  code_assets: ["CodeAsset", "code"],
  features: ["Feature", "feature"],
  people: ["Person", "person"],
  teams: ["Team", "team"],
  activities: ["Activity", "activity"],
  periods: ["Period", "period"],
  preferences: ["Preference", "preference"],
  policies: ["Policy", "policy"],
  decisions: ["Decision", "decision"],
  bug_patterns: ["BugPattern", "bug_pattern"],
  fixes: ["Fix", "fix"],
  documents: ["Document", "document"],
  observations: ["Observation", "observation"],
  quality_issues: ["QualityIssue", "quality"],
};

const PREFIX_TO_LABEL = Object.fromEntries(
  Object.values(ARRAYS).map(([label, prefix]) => [prefix, label]),
);
// Longest prefix first so "deployment_target:" wins over "deployment".
const PREFIXES = Object.keys(PREFIX_TO_LABEL).sort((a, b) => b.length - a.length);

const SCOPE = [
  "Repository",
  "Service",
  "Environment",
  "DataStore",
  "Cluster",
  "DeploymentTarget",
];
const ANY = "*";

// predicate -> array of [sourceLabels, targetLabels]
const EDGE_TYPES = {
  // topology (11)
  DEFINED_IN: [[["Service"], ["Repository"]]],
  DEPLOYED_TO: [[["Service"], ["Environment"]]],
  DEPENDS_ON: [[["Service"], ["Service"]]],
  USES: [[["Service"], ["DataStore", "Dependency"]]],
  USES_ADAPTER: [[["Service"], ["Adapter"]]],
  CONFIGURES: [[["Service", "Adapter"], ["ConfigVariable"]]],
  DEPLOYED_WITH: [[["Service"], ["DeploymentTarget"]]],
  EXPOSES: [[["Service"], ["APIContract"]]],
  HOSTED_ON: [[["Environment", "DeploymentTarget"], ["Cluster"]]],
  PROVIDES: [[["Repository", "Service"], ["Feature"]]],
  IMPLEMENTED_IN: [[["Feature"], ["Repository", "Service", "CodeAsset"]]],
  // ownership (1) — the only singleton
  OWNED_BY: [[["Service", "Repository"], ["Team", "Person"]]],
  // people (1)
  MEMBER_OF: [[["Person"], ["Team"]]],
  // timeline (5)
  TOUCHED: [[["Activity"], [...SCOPE, "CodeAsset"]]],
  PERFORMED: [[["Person", "Team"], ["Activity"]]],
  AUTHORED: [[["Person", "Team"], ["Activity"]]],
  IN_PERIOD: [[["Activity"], ["Period"]]],
  MENTIONS: [[["Activity"], [ANY]]],
  // memory (7)
  POLICY_APPLIES_TO: [[["Preference", "Policy"], [...SCOPE, "CodeAsset"]]],
  REPRODUCES: [[["BugPattern"], [...SCOPE, "CodeAsset"]]],
  RESOLVED: [[["Fix"], ["BugPattern"]]],
  ATTEMPTED_FIX_FAILED: [[["Fix"], ["BugPattern"]]],
  VERIFIED: [[["Activity", "Person", "Team"], ["Fix"]]],
  DECIDED: [[["Decision"], SCOPE]],
  AFFECTS: [[["Decision"], [ANY]]],
  // generic + system
  RELATED_TO: [[[ANY], [ANY]]],
  SUPERSEDES: [[["Decision"], ["Decision"]]],
};

const SINGLETON_EDGES = new Set(["OWNED_BY"]);
const EVIDENCE_REQUIRED_TRUTH = new Set([
  "authoritative_fact",
  "source_observation",
]);
const TRUTH_CLASSES = new Set([
  "authoritative_fact",
  "source_observation",
  "agent_claim",
  "user_decision",
  "preference",
  "timeline_event",
  "quality_finding",
]);

// Display categories consumed by app/(main)/pots/components/graph/ontology.ts.
// Every one of the 24 labels must land in one of the 8 CATEGORY_ORDER keys or
// the overview's byCategory filter drops it.
const LABEL_CATEGORY = {
  Repository: "scope_identity",
  Service: "scope_identity",
  Environment: "scope_identity",
  Cluster: "scope_identity",
  Feature: "product_architecture",
  APIContract: "product_architecture",
  Adapter: "product_architecture",
  DataStore: "product_architecture",
  CodeAsset: "product_architecture",
  Dependency: "product_architecture",
  Activity: "change_decision",
  Decision: "change_decision",
  Preference: "change_decision",
  Policy: "change_decision",
  DeploymentTarget: "delivery_operations",
  ConfigVariable: "delivery_operations",
  BugPattern: "debugging_reliability",
  Fix: "debugging_reliability",
  Document: "knowledge_evidence",
  Observation: "knowledge_evidence",
  Period: "knowledge_evidence",
  Person: "team_ownership",
  Team: "team_ownership",
  QualityIssue: "quality_drift",
};

// ---- load ------------------------------------------------------------------
const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();
const slices = [];
for (const f of files) {
  let raw = readFileSync(join(DIR, f), "utf8").replace(/^﻿/, "").trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
  }
  try {
    slices.push({ file: f, doc: JSON.parse(raw) });
  } catch (e) {
    console.error(`PARSE FAIL ${f}: ${e.message}`);
    process.exitCode = 1;
  }
}
if (!slices.length) throw new Error("no slice JSON found");

const warnings = [];
const warn = (m) => warnings.push(m);

// ---- node store ------------------------------------------------------------
const nodes = new Map(); // entity_key -> {id, entity_key, labels, properties}
const clean = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== undefined && v !== null && v !== "" &&
        !(Array.isArray(v) && v.length === 0),
    ),
  );

function addNode(key, label, props, srcFile) {
  const existing = nodes.get(key);
  const incoming = clean(props);
  if (existing) {
    if (existing.labels[0] !== label) {
      warn(`label conflict on ${key}: ${existing.labels[0]} vs ${label} (${srcFile})`);
      return existing;
    }
    const a = existing.properties;
    for (const [k, v] of Object.entries(incoming)) {
      if (a[k] === undefined) a[k] = v;
      else if (
        (k === "description" || k === "summary") &&
        typeof v === "string" &&
        v.length > String(a[k]).length
      ) {
        a[k] = v;
      }
    }
    return existing;
  }
  const node = { id: key, entity_key: key, labels: [label], properties: incoming };
  nodes.set(key, node);
  return node;
}

// Array-valued props (fix_steps, alternatives_rejected) render better as prose.
const flatten = (v) => (Array.isArray(v) ? v.join("; ") : v);

// ---- PASS 1: nodes ---------------------------------------------------------
for (const { file, doc } of slices) {
  for (const [arrayName, [label, prefix]] of Object.entries(ARRAYS)) {
    for (const raw of doc[arrayName] ?? []) {
      const slug = raw.slug ?? raw.name;
      if (!slug) {
        warn(`${file}: ${arrayName} entry with no slug`);
        continue;
      }
      const key = `${prefix}:${slug}`;
      const { slug: _s, ...rest } = raw;
      const props = {};
      for (const [k, v] of Object.entries(rest)) props[k] = flatten(v);
      if (!props.name) props.name = slug;
      addNode(key, label, props, file);
    }
  }
  // Anything outside the known arrays is an ontology violation worth surfacing.
  for (const k of Object.keys(doc)) {
    if (k !== "edges" && !(k in ARRAYS)) warn(`${file}: unknown array "${k}" ignored`);
  }
}

// ---- edge store ------------------------------------------------------------
const edges = new Map(); // "from|type|to" -> edge
const ownedBySeen = new Map(); // from -> to, enforcing the singleton

function labelOf(key) {
  const node = nodes.get(key);
  if (node) return node.labels[0];
  for (const p of PREFIXES) if (key.startsWith(`${p}:`)) return PREFIX_TO_LABEL[p];
  return null;
}

function pairAllowed(type, fromLabel, toLabel) {
  for (const [srcs, tgts] of EDGE_TYPES[type]) {
    const srcOk = srcs.includes(ANY) || srcs.includes(fromLabel);
    const tgtOk = tgts.includes(ANY) || tgts.includes(toLabel);
    if (srcOk && tgtOk) return true;
  }
  return false;
}

const dropped = { unknownType: 0, badPair: 0, dangling: 0, self: 0, singleton: 0 };

function addEdge(e, srcFile) {
  const { from, type, to } = e;
  if (!from || !type || !to) return warn(`${srcFile}: malformed edge ${JSON.stringify(e)}`);
  if (from === to) {
    dropped.self++;
    return warn(`${srcFile}: self-edge dropped ${from} -${type}-> ${to}`);
  }
  if (!EDGE_TYPES[type]) {
    dropped.unknownType++;
    return warn(`${srcFile}: predicate "${type}" not in the ontology (${from} -> ${to})`);
  }
  if (!nodes.has(from) || !nodes.has(to)) {
    dropped.dangling++;
    const which = !nodes.has(from) ? from : to;
    return warn(`${srcFile}: dangling ref "${which}" in ${from} -${type}-> ${to}`);
  }
  const fl = labelOf(from);
  const tl = labelOf(to);
  if (!pairAllowed(type, fl, tl)) {
    dropped.badPair++;
    return warn(`${srcFile}: allowed_pairs violation ${fl} -${type}-> ${tl} (${from} -> ${to})`);
  }
  if (SINGLETON_EDGES.has(type)) {
    const prior = ownedBySeen.get(from);
    if (prior && prior !== to) {
      dropped.singleton++;
      return warn(`${srcFile}: singleton ${type} conflict on ${from} (kept ${prior}, dropped ${to})`);
    }
    ownedBySeen.set(from, to);
  }
  const truth = e.truth ?? "agent_claim";
  if (!TRUTH_CLASSES.has(truth)) warn(`${srcFile}: unknown truth class "${truth}" on ${from} -${type}-> ${to}`);
  if (EVIDENCE_REQUIRED_TRUTH.has(truth) && !e.evidence) {
    warn(`${srcFile}: truth "${truth}" without evidence on ${from} -${type}-> ${to}`);
  }
  const id = `${from}|${type}|${to}`;
  if (edges.has(id)) return;
  edges.set(id, {
    from,
    type,
    to,
    properties: clean({
      truth,
      confidence: e.confidence,
      evidence: e.evidence,
      note: e.note,
    }),
  });
}

// ---- PASS 2: edges ---------------------------------------------------------
for (const { file, doc } of slices) {
  for (const e of doc.edges ?? []) addEdge(e, file);
}

// ---- PASS 3: relationships, validation, stats ------------------------------
const nameOf = (k) => {
  const p = nodes.get(k)?.properties ?? {};
  return p.name ?? p.title ?? p.statement ?? k;
};
for (const node of nodes.values()) node.relationships = [];
for (const e of edges.values()) {
  const from = nodes.get(e.from);
  const to = nodes.get(e.to);
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

const finalEdges = [...edges.values()];
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
for (const label of Object.keys(LABEL_CATEGORY)) {
  const n = [...nodes.values()].filter((x) => x.labels[0] === label).length;
  if (!n) warn(`label "${label}" is unpopulated`);
}

const labelCounts = {};
for (const node of nodes.values()) {
  labelCounts[node.labels[0]] = (labelCounts[node.labels[0]] ?? 0) + 1;
}
const edgeTypeCounts = {};
for (const e of finalEdges) edgeTypeCounts[e.type] = (edgeTypeCounts[e.type] ?? 0) + 1;

const topEntities = [...degree.entries()]
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .slice(0, 10)
  .map(([key, deg]) => ({
    entity_key: key,
    labels: nodes.get(key).labels,
    name: nameOf(key),
    degree: deg,
  }));

const stats = {
  nodeCount: nodes.size,
  edgeCount: finalEdges.length,
  labelCounts: Object.fromEntries(Object.entries(labelCounts).sort()),
  edgeTypeCounts: Object.fromEntries(Object.entries(edgeTypeCounts).sort()),
  topEntities,
};

// ---- report ----------------------------------------------------------------
console.log(`slices        ${slices.length} (${files.join(", ")})`);
console.log(`nodes         ${stats.nodeCount}`);
console.log(`edges         ${stats.edgeCount}`);
console.log(`labels        ${Object.keys(labelCounts).length}/24`);
// 25 public predicates + RELATED_TO + the SUPERSEDES system edge.
console.log(`predicates    ${Object.keys(edgeTypeCounts).length}/${Object.keys(EDGE_TYPES).length}`);
console.log(`dropped       ${JSON.stringify(dropped)}`);
console.log(`orphans       ${orphans.length}`);
console.log(`warnings      ${warnings.length}`);
console.log("\nlabelCounts", stats.labelCounts);
console.log("\nedgeTypeCounts", stats.edgeTypeCounts);
if (warnings.length) {
  console.log("\n--- warnings ---");
  for (const w of warnings) console.log("  " + w);
}

// ---- emit ------------------------------------------------------------------
const bare = [...nodes.values()].map(({ relationships, ...rest }) => rest);

const banner = `// Hand-authored context-graph fixture for the "potpie" demo pot: Potpie's own
// engineering org, graphed by Potpie. Generated by scripts/potpie-graph/assemble.mjs
// from the survey JSONs in that directory — do not hand-edit the node/edge arrays
// piecemeal, regenerate instead.
//
// Unlike the redis fixture this dataset is authored against the SHIPPED ontology
// (potpie/context-core/src/potpie_context_core/ontology.py, ONTOLOGY_VERSION
// "2026-06-graph"): the 24 canonical entity labels and the 25 public predicates
// plus RELATED_TO / SUPERSEDES. Note in particular that there is no PullRequest,
// Issue, Commit, Deployment, Incident or Component label — every one of those is
// an \`Activity\` carrying an \`activity_type\` property, because Activity is the
// ontology's single timeline collapse point. The assembler enforces the
// per-predicate allowed_pairs table and the OWNED_BY singleton rule, so this file
// is a valid instance of the contract rather than an illustration of it.

import type { ProjectGraphEdge, ProjectGraphNode } from "@/services/PotService";

type BareNode = Omit<ProjectGraphNode, "relationships">;
`;

const body = [
  banner,
  `const NODES: BareNode[] = ${JSON.stringify(bare, null, 1)};\n`,
  `export const POTPIE_GRAPH_EDGES: ProjectGraphEdge[] = ${JSON.stringify(finalEdges, null, 1)};\n`,
  `export const POTPIE_GRAPH_STATS = ${JSON.stringify(stats, null, 1)} as const;\n`,
  `// Derives both directions of every edge onto its endpoints so the inspector can
// walk a node's neighbourhood without a second pass over the edge list.
function withRelationships(
  bare: BareNode[],
  edgeList: ProjectGraphEdge[],
): ProjectGraphNode[] {
  const byKey = new Map<string, ProjectGraphNode>(
    bare.map((n) => [n.entity_key, { ...n, relationships: [] }]),
  );
  const nameOf = (key: string): string => {
    const p = byKey.get(key)?.properties ?? {};
    return (p.name as string) ?? (p.title as string) ?? key;
  };
  for (const e of edgeList) {
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
  return [...byKey.values()];
}

export const POTPIE_GRAPH_NODES: ProjectGraphNode[] = withRelationships(
  NODES,
  POTPIE_GRAPH_EDGES,
);
`,
].join("\n");

if (DRY) {
  console.log(`\n[dry] would write ${OUT_TS} (${body.length} bytes)`);
} else {
  writeFileSync(OUT_TS, body);
  console.log(`\nwrote ${OUT_TS} (${body.length} bytes)`);
}
