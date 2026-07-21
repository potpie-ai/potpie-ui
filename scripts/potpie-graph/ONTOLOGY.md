# Potpie context-graph ontology — authoring contract

Canonical source: `/Users/nandan/Desktop/Dev/potpie/potpie/context-core/src/potpie_context_core/ontology.py`
Prose reference: `/Users/nandan/Desktop/Dev/potpie/docs/context-graph/ontology.md`

`ONTOLOGY_VERSION = "2026-06-graph"`, `GRAPH_CONTRACT_VERSION = "v1.5"`.

This file is the contract every survey slice under `scripts/potpie-graph/*.json`
must obey. The assembler (`assemble.mjs`) validates against it and fails loud on
drift.

## 1. The 24 entity labels — nothing else exists

| Label | key prefix | What it is |
|---|---|---|
| `Repository` | `repo:` | A source code repository. **scope** |
| `Service` | `service:` | A deployable/runnable unit (service, worker, cronjob, frontend, gateway, library). **scope** |
| `Environment` | `environment:` | A named runtime target (prod, staging, dev, preview). **scope** |
| `DataStore` | `datastore:` | A stateful backing resource (postgres, redis, kafka, s3, ...). **scope** |
| `Cluster` | `cluster:` | The cloud account / cluster / region an environment runs on. **scope** |
| `DeploymentTarget` | `deployment_target:` | A concrete deploy mechanism: k8s workload, container app, serverless fn. **scope** |
| `Dependency` | `dependency:<ecosystem>:<name>` | A third-party package a service depends on. |
| `APIContract` | `api_contract:<service>:<method>:<path>` | One operation in an OpenAPI/RPC spec. |
| `Adapter` | `adapter:<domain>:<slug>` | A runtime/integration adapter a service selects (graph backend, auth provider). |
| `ConfigVariable` | `config:<scope>:<name>` | A named env/config value selecting behavior. |
| `CodeAsset` | `code:<repo>:<path>` | A repository code anchor: file, dir, module, class, function, symbol. |
| `Feature` | `feature:` | A user- or system-facing capability a repo/service provides. |
| `Team` | `team:` | An owning group / squad. |
| `Person` | `person:<handle>` | An individual contributor / owner. |
| `Activity` | `activity:<source>:<id>` | **A timestamped event.** PR merged, commit, issue, deploy, alert, incident, discussion. **is_activity** |
| `Period` | `period:` | A timeline bucket anchoring activities for windowed queries. |
| `Preference` | `preference:` | A coding preference with scope-qualified prescription. |
| `Policy` | `policy:` | A named project-wide policy. |
| `BugPattern` | `bug_pattern:` | A reproducible failure pattern — the symptom side of a fix. |
| `Fix` | `fix:` | A bug-fix observation retrievable by symptom. Carries `verification_status`. |
| `Decision` | `decision:` | An ADR-style decision with statement, rationale, alternatives_rejected. |
| `Document` | `document:` | Generic document / note. |
| `Observation` | `observation:` | Generic observation / signal. |
| `QualityIssue` | `quality:` | Marker recording an ontology downgrade. |

### THE MOST IMPORTANT RULE

**`Activity` is the single timeline collapse point.** PRs, commits, issues,
incidents, deployments, alerts and discussions ALL mint as one `Activity`
entity. There is **no** `PullRequest`, `Commit`, `Issue`, `Incident`,
`Deployment`, `Component`, `Interface`, `Episode`, `Conversation`,
`SourceReference`, `Capability`, `Runbook`, `Alert` or `Investigation` label.
Any doc that names those is stale — do not emit them.

Distinguish activities with properties, not labels:
`activity_type` ∈ `pull_request | commit | issue | deployment | incident | alert | discussion | review | release`
and `verb_class` (e.g. `pr_merged`, `pr_opened`, `github_issue_opened`, `deploy_succeeded`, `incident_resolved`).

Subsystems that would once have been `Component` become **`CodeAsset`**
(a file/module/package anchor) or **`Service`** (if independently runnable).
Protocols/endpoints that would once have been `Interface` become **`APIContract`**.

## 2. The 25 public predicates + `RELATED_TO`

Emit only these. `allowed_pairs` is enforced by the assembler.
`@Scope` = any of Repository, Service, Environment, DataStore, Cluster, DeploymentTarget.
`@Activity` = Activity. `*` = anything.

### topology (11)
| Predicate | allowed pairs |
|---|---|
| `DEFINED_IN` | Service → Repository |
| `DEPLOYED_TO` | Service → Environment |
| `DEPENDS_ON` | Service → Service |
| `USES` | Service → DataStore, Service → Dependency |
| `USES_ADAPTER` | Service → Adapter |
| `CONFIGURES` | Service → ConfigVariable, Adapter → ConfigVariable |
| `DEPLOYED_WITH` | Service → DeploymentTarget |
| `EXPOSES` | Service → APIContract |
| `HOSTED_ON` | Environment → Cluster, DeploymentTarget → Cluster |
| `PROVIDES` | Repository → Feature, Service → Feature |
| `IMPLEMENTED_IN` | Feature → Repository, Feature → Service, Feature → CodeAsset |

### ownership (1)
| `OWNED_BY` | Service→Team, Service→Person, Repository→Team, Repository→Person |
**The only `singleton=True` edge — each subject may have exactly ONE live `OWNED_BY`.**

### people (1)
| `MEMBER_OF` | Person → Team |

### timeline (5)
| `TOUCHED` | @Activity → @Scope, @Activity → CodeAsset |
| `PERFORMED` | Person → @Activity, Team → @Activity |
| `AUTHORED` | Person → @Activity, Team → @Activity |
| `IN_PERIOD` | @Activity → Period |
| `MENTIONS` | @Activity → * |

### memory (7)
| `POLICY_APPLIES_TO` | Preference→@Scope, Preference→CodeAsset, Policy→@Scope, Policy→CodeAsset |
| `REPRODUCES` | BugPattern → @Scope, BugPattern → CodeAsset |
| `RESOLVED` | Fix → BugPattern |
| `ATTEMPTED_FIX_FAILED` | Fix → BugPattern |
| `VERIFIED` | @Activity→Fix, Person→Fix, Team→Fix |
| `DECIDED` | Decision → @Scope |
| `AFFECTS` | Decision→@Scope, Decision→CodeAsset, Decision→* |

### generic + system
| `RELATED_TO` | * → * — soft-fail fallback, use sparingly |
| `SUPERSEDES` | system edge, emitted on supersession (Decision→Decision) |

There are deliberately **no** stored temporal/causal edges. No `TRIGGERED_BY`,
`PRECEDED_BY`, `HOTSPOT`, `FIXES`, `CAUSED`, `IMPLEMENTS`, `CALLS`, `PART_OF`,
`DOCUMENTS`, `RESOLVES`, `DELIVERS`, `WATCHES`, `INVESTIGATES`,
`PARTICIPATED_IN`, `DEPLOYS`. The timeline is a read-time query over `valid_at`.

Note the renames from the older demo vocabulary:
`PART_OF` → use `IMPLEMENTED_IN` or `TOUCHED`; `DOCUMENTS` → `MENTIONS` or
`AFFECTS`; `RESOLVES` → `RESOLVED`; `IMPLEMENTS` → `IMPLEMENTED_IN`.

## 3. Edge claim properties (provenance)

Every edge carries a claim. Set these on `edges[]` entries:

- `truth` — one of `authoritative_fact`, `source_observation`, `agent_claim`
  (default), `user_decision`, `preference`, `timeline_event`, `quality_finding`.
  - `authoritative_fact` / `source_observation` **require** `evidence`.
  - Use `authoritative_fact` for code-derived topology (Service DEFINED_IN Repository).
  - Use `source_observation` for GitHub-derived facts (activity TOUCHED repo).
  - Use `timeline_event` for PERFORMED / AUTHORED / IN_PERIOD.
  - Use `user_decision` for OWNED_BY and Decision edges.
  - Use `preference` for POLICY_APPLIES_TO.
  - Use `agent_claim` for inferred links; pair with `confidence` (0.0–1.0).
- `confidence` — float, only on `agent_claim` / lower-authority edges.
- `evidence` — a source ref string, e.g. `github:potpie-ai/potpie#1018`,
  `code:potpie/pyproject.toml`, `linear:POT-1930`.

## 4. Node properties

Always set `name`. Always set `summary` (one line) **and** `description`
(the retrieval card — 2–4 sentences written for semantic search: symptoms,
synonyms, scope, searchable phrasings). Descriptions under 60 chars are
flagged by the assembler.

Label-specific properties worth setting:
- `Repository`: `repo_name`, `default_branch`, `visibility`, `language`
- `Service`: `repo_name`, `path`, `language`
- `CodeAsset`: `repo_name`, `path`, `language`, `loc`, `symbol`
- `Feature`: `lifecycle` ∈ proposed/planned/in_progress/completed/deprecated/decommissioned
- `Activity`: `activity_type`, `verb_class`, `occurred_at` (ISO), `url`,
  `number`, `state`, `repo_name`, `head_branch`, `base_branch`
- `Person`: `email`, `handle`, `role`
- `Decision`: `statement`, `rationale`, `alternatives_rejected`, `decided_at`,
  `lifecycle` ∈ proposed/accepted/superseded/deprecated/rejected
- `Preference` / `Policy`: `policy_kind`, `prescription`, `lifecycle`
- `BugPattern`: `symptom_signature`, `first_seen`
- `Fix`: `fix_steps`, `verification_status` ∈ verified/failed/unverified
- `ConfigVariable`: `config_key`, `env_var`, `default`
- `Dependency`: `package_name`, `version`, `ecosystem`
- `APIContract`: `http_method`, `path`
- `Adapter`: `adapter_kind`, `provider`
- `Period`: `period_kind`, `starts_at`, `ends_at`
- `QualityIssue`: `issue_kind`, `detected_at`
