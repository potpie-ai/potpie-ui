import type {
  ExecutionLog,
  ExecutionTree,
  ExecutionTreeNode,
  Trigger,
  Workflow,
  WorkflowExecution,
} from "@/services/WorkflowService";
import { Permission, TriggerGroup } from "@/services/WorkflowService";

export const DEMO_CODE_REVIEW_WORKFLOW_ID = "wf-code-review";
export const DEMO_AUTO_DEBUG_WORKFLOW_ID = "wf-auto-debug";

const DEMO_WORKFLOW_IDS = new Set([
  DEMO_CODE_REVIEW_WORKFLOW_ID,
  DEMO_AUTO_DEBUG_WORKFLOW_ID,
]);

export function isDemoWorkflowId(id?: string | null): boolean {
  return !!id && DEMO_WORKFLOW_IDS.has(id);
}

/**
 * Trigger definitions matching the node types used in the demo graphs, so the
 * workflows list can resolve human-readable trigger names even when the
 * workflows backend is unreachable.
 */
export const DEMO_TRIGGERS: Trigger[] = [
  {
    id: "trigger_github_pr_opened",
    name: "GitHub PR Opened",
    description: "Fires when a pull request is opened on the connected repo",
    group: TriggerGroup.GITHUB,
    required_permissions: [Permission.READ_GITHUB, Permission.WRITE_GITHUB],
  },
  {
    id: "trigger_sentry_issue_created",
    name: "Sentry Issue Created",
    description: "Fires when Sentry reports a new issue for the project",
    group: "sentry" as TriggerGroup,
    required_permissions: [Permission.READ_GITHUB, Permission.WRITE_GITHUB],
  },
];

/**
 * Agents referenced by the demo graphs. Seeded into agent lists so node
 * cards and config panels resolve names even when the agents backend has
 * no matching records.
 */
export const DEMO_WORKFLOW_AGENTS = [
  {
    id: "agent-pr-intake",
    name: "PR Intake Agent",
    description:
      "Acknowledges new pull requests with a summary comment before review starts",
  },
  {
    id: "agent-diff-review",
    name: "Diff Review Agent",
    description:
      "Reviews PR diffs hunk by hunk with repo context and flags bugs with suggested fixes",
  },
  {
    id: "agent-comment-publisher",
    name: "Inline Comment Publisher",
    description:
      "Publishes review findings as inline PR comments with suggestion blocks",
  },
  {
    id: "agent-description-curator",
    name: "PR Description Curator",
    description:
      "Rewrites PR descriptions with a summary, change list, and test plan",
  },
  {
    id: "agent-triage",
    name: "Issue Triage Agent",
    description:
      "Deduplicates Sentry issues, assigns severity, and maps stack traces to owning modules",
  },
  {
    id: "agent-root-cause",
    name: "Root Cause Agent",
    description:
      "Reproduces issues in a sandbox and bisects regressions to the faulty commit",
  },
  {
    id: "agent-fix-pr",
    name: "Fix & Draft PR Agent",
    description:
      "Implements minimal fixes with regression tests and opens draft PRs",
  },
  {
    id: "agent-status-reporter",
    name: "Status Reporter",
    description:
      "Reports debugging outcomes on the originating issue and in Slack",
  },
];

// Timestamps are generated relative to page load so the history always reads
// as recent activity.
const NOW = Date.now();
const minutesAgo = (minutes: number) =>
  new Date(NOW - Math.round(minutes * 60_000)).toISOString();
const hoursAgo = (hours: number) => minutesAgo(hours * 60);
const daysAgo = (days: number) => hoursAgo(days * 24);

// --- WORKFLOW DEFINITIONS ---

export const DEMO_CODE_REVIEW_WORKFLOW: Workflow = {
  id: DEMO_CODE_REVIEW_WORKFLOW_ID,
  title: "Automated Code Review",
  description:
    "Reviews every new pull request end to end: posts an intake comment, runs a context-aware diff review, publishes inline comments, and refreshes the PR description.",
  created_by: "nndn",
  created_at: daysAgo(21),
  updated_at: daysAgo(3),
  is_paused: false,
  version: "4",
  variables: {
    repo: "potpietools/redis",
    review_depth: "thorough",
    max_inline_comments: "12",
  },
  validation: { is_valid: true, errors: [], warnings: [] },
  graph: {
    id: "graph-code-review",
    workflow_id: DEMO_CODE_REVIEW_WORKFLOW_ID,
    created_at: daysAgo(21),
    updated_at: daysAgo(3),
    nodes: {
      trigger_pr_opened: {
        id: "trigger_pr_opened",
        type: "trigger_github_pr_opened",
        group: "github",
        category: "trigger",
        position: { x: -380, y: -80 },
        data: {
          repo_name: "potpietools/redis",
          hash: "wh_9f2c41d8",
        },
      },
      agent_intake: {
        id: "agent_intake",
        type: "custom_agent",
        group: "default",
        category: "agent",
        position: { x: -20, y: -260 },
        data: {
          agent_id: "agent-pr-intake",
          agentName: "PR Intake Agent",
          name: "PR Intake Agent",
          task: "Acknowledge the new pull request with a starting comment that summarizes the changed files and states that a full review will follow shortly.",
          repo_name: "potpietools/redis",
          branch_name: "",
          use_current_repo: false,
          use_current_branch: true,
        },
      },
      agent_review: {
        id: "agent_review",
        type: "custom_agent",
        group: "default",
        category: "agent",
        position: { x: -20, y: 100 },
        data: {
          agent_id: "agent-diff-review",
          agentName: "Diff Review Agent",
          name: "Diff Review Agent",
          task: "Review the pull request diff hunk by hunk with full repo context. Flag correctness bugs, concurrency hazards, and perf regressions. For each finding output the file path, line, start_line, severity, and a concrete suggested change.",
          repo_name: "potpietools/redis",
          branch_name: "",
          use_current_repo: false,
          use_current_branch: true,
        },
      },
      agent_publish: {
        id: "agent_publish",
        type: "custom_agent",
        group: "default",
        category: "agent",
        position: { x: 380, y: 100 },
        data: {
          agent_id: "agent-comment-publisher",
          agentName: "Inline Comment Publisher",
          name: "Inline Comment Publisher",
          task: "Publish each review finding as an inline PR review comment on the exact line and start_line, including the suggested change as a GitHub suggestion block. Post a summary comment with the blocking/non-blocking split.",
          repo_name: "potpietools/redis",
          branch_name: "",
          use_current_repo: false,
          use_current_branch: true,
        },
      },
      agent_description: {
        id: "agent_description",
        type: "custom_agent",
        group: "default",
        category: "agent",
        position: { x: 380, y: -260 },
        data: {
          agent_id: "agent-description-curator",
          agentName: "PR Description Curator",
          name: "PR Description Curator",
          task: "Read the full diff, infer what the PR is trying to achieve, and rewrite the PR description with a concise summary, a change list grouped by module, and a test-plan section.",
          repo_name: "potpietools/redis",
          branch_name: "",
          use_current_repo: false,
          use_current_branch: true,
        },
      },
    },
    adjacency_list: {
      trigger_pr_opened: ["agent_intake", "agent_review"],
      agent_intake: ["agent_description"],
      agent_review: ["agent_publish"],
    },
  },
};

export const DEMO_AUTO_DEBUG_WORKFLOW: Workflow = {
  id: DEMO_AUTO_DEBUG_WORKFLOW_ID,
  title: "Auto-Debug Production Issues",
  description:
    "Triages every new Sentry issue, reproduces and root-causes actionable bugs, ships a candidate fix as a draft PR, and reports the outcome back on the issue.",
  created_by: "nndn",
  created_at: daysAgo(14),
  updated_at: daysAgo(1),
  is_paused: false,
  version: "7",
  variables: {
    repo: "potpietools/redis",
    severity_floor: "P2",
    open_draft_pr: "true",
  },
  validation: { is_valid: true, errors: [], warnings: [] },
  graph: {
    id: "graph-auto-debug",
    workflow_id: DEMO_AUTO_DEBUG_WORKFLOW_ID,
    created_at: daysAgo(14),
    updated_at: daysAgo(1),
    nodes: {
      trigger_sentry_issue: {
        id: "trigger_sentry_issue",
        type: "trigger_sentry_issue_created",
        group: "sentry",
        category: "trigger",
        position: { x: -520, y: 0 },
        data: {
          project_slug: "redis-prod",
          hash: "wh_c81aa302",
        },
      },
      agent_triage: {
        id: "agent_triage",
        type: "custom_agent",
        group: "default",
        category: "agent",
        position: { x: -180, y: 0 },
        data: {
          agent_id: "agent-triage",
          agentName: "Issue Triage Agent",
          name: "Issue Triage Agent",
          task: "Deduplicate the incoming Sentry issue against open issues, assign a severity (P0–P4), map the stack trace to the owning module, and decide whether the issue is actionable or deploy/infra noise.",
          repo_name: "potpietools/redis",
          branch_name: "unstable",
          use_current_repo: false,
          use_current_branch: false,
        },
      },
      gate_actionable: {
        id: "gate_actionable",
        type: "flow_control_conditional",
        group: "default",
        category: "flow_control",
        position: { x: 160, y: 0 },
        data: {
          condition:
            "triage.severity <= 'P2' && triage.actionable && !triage.duplicate",
          true_label: "Debug it",
          false_label: "Report & close",
        },
      },
      agent_debug: {
        id: "agent_debug",
        type: "custom_agent",
        group: "default",
        category: "agent",
        position: { x: 500, y: -180 },
        data: {
          agent_id: "agent-root-cause",
          agentName: "Root Cause Agent",
          name: "Root Cause Agent",
          task: "Reproduce the issue in a sandbox using the Sentry event payload, bisect recent commits if the issue is a regression, and produce a root-cause analysis with the exact faulty code path.",
          repo_name: "potpietools/redis",
          branch_name: "unstable",
          use_current_repo: false,
          use_current_branch: false,
        },
      },
      agent_fix: {
        id: "agent_fix",
        type: "custom_agent",
        group: "default",
        category: "agent",
        position: { x: 860, y: -180 },
        data: {
          agent_id: "agent-fix-pr",
          agentName: "Fix & Draft PR Agent",
          name: "Fix & Draft PR Agent",
          task: "Implement a minimal fix for the confirmed root cause on a new branch, add a regression test that fails without the fix, and open a draft PR linking the Sentry issue.",
          repo_name: "potpietools/redis",
          branch_name: "unstable",
          use_current_repo: false,
          use_current_branch: false,
        },
      },
      agent_report: {
        id: "agent_report",
        type: "custom_agent",
        group: "default",
        category: "agent",
        position: { x: 860, y: 180 },
        data: {
          agent_id: "agent-status-reporter",
          agentName: "Status Reporter",
          name: "Status Reporter",
          task: "Comment the outcome on the Sentry issue (root cause + draft PR link, or the reason it was classified as noise) and post a one-line summary to the #incidents Slack channel.",
          repo_name: "potpietools/redis",
          branch_name: "unstable",
          use_current_repo: false,
          use_current_branch: false,
        },
      },
    },
    adjacency_list: {
      trigger_sentry_issue: ["agent_triage"],
      agent_triage: ["gate_actionable"],
      gate_actionable: ["agent_debug", "agent_report"],
      agent_debug: ["agent_fix"],
      agent_fix: ["agent_report"],
    },
  },
};

export const DEMO_WORKFLOWS: Workflow[] = [
  DEMO_CODE_REVIEW_WORKFLOW,
  DEMO_AUTO_DEBUG_WORKFLOW,
];

export function getDemoWorkflowById(id: string): Workflow | undefined {
  return DEMO_WORKFLOWS.find((workflow) => workflow.id === id);
}

// --- EXECUTION HISTORY ---

type DemoLogEvent = {
  status:
    | "info"
    | "running"
    | "success"
    | "warning"
    | "error"
    | "completed"
    | "failed";
  /** Minutes ago the event happened */
  at: number;
  details: string;
};

type DemoNodeRun = {
  nodeId: string;
  status: "pending" | "running" | "completed" | "failed";
  predecessor: string | null;
  /** Minutes ago the node started / finished */
  startedAt: number;
  completedAt?: number;
  iteration?: number;
  errorMessage?: string;
  events: DemoLogEvent[];
};

type DemoExecutionSpec = {
  id: string;
  workflowId: string;
  status: WorkflowExecution["status"];
  startedAt: number;
  completedAt?: number;
  errorMessage?: string;
  triggerData: Record<string, any>;
  nodes: DemoNodeRun[];
};

function buildExecution(spec: DemoExecutionSpec): {
  execution: WorkflowExecution;
  tree: ExecutionTree;
} {
  const executionLogs: ExecutionLog[] = spec.nodes.map((node) => ({
    id: `${spec.id}-${node.nodeId}`,
    execution_id: spec.id,
    node_id: node.nodeId,
    node_type: node.nodeId.startsWith("trigger")
      ? "trigger"
      : node.nodeId.startsWith("gate")
        ? "flow_control"
        : "custom_agent",
    status: node.status,
    started_at: minutesAgo(node.startedAt),
    completed_at:
      node.completedAt !== undefined ? minutesAgo(node.completedAt) : undefined,
    error_message: node.errorMessage,
    iteration: node.iteration ?? 0,
    predecessor_node_id: node.predecessor ?? undefined,
    logs: node.events.map((event) => ({
      status: event.status,
      timestamp: minutesAgo(event.at),
      details: event.details,
    })),
  }));

  const executionTree: Record<string, ExecutionTreeNode> = {};
  for (const node of spec.nodes) {
    executionTree[node.nodeId] = {
      node_id: node.nodeId,
      predecessor: node.predecessor,
      children: spec.nodes
        .filter((candidate) => candidate.predecessor === node.nodeId)
        .map((candidate) => candidate.nodeId),
      status: node.status,
      start_time: minutesAgo(node.startedAt),
      end_time:
        node.completedAt !== undefined
          ? minutesAgo(node.completedAt)
          : undefined,
      iteration: node.iteration ?? 0,
      logs: node.events.map((event) => ({
        status: event.status,
        timestamp: minutesAgo(event.at),
        details: event.details,
      })),
    };
  }

  return {
    execution: {
      id: spec.id,
      workflow_id: spec.workflowId,
      status: spec.status,
      started_at: minutesAgo(spec.startedAt),
      completed_at:
        spec.completedAt !== undefined
          ? minutesAgo(spec.completedAt)
          : undefined,
      error_message: spec.errorMessage,
      trigger_data: spec.triggerData,
      execution_logs: executionLogs,
    },
    tree: { execution_tree: executionTree },
  };
}

const CODE_REVIEW_EXECUTION_SPECS: DemoExecutionSpec[] = [
  {
    id: "exec-cr-2041",
    workflowId: DEMO_CODE_REVIEW_WORKFLOW_ID,
    status: "running",
    startedAt: 4,
    triggerData: {
      event: "pull_request.opened",
      repo: "potpietools/redis",
      pr_number: 15,
      pr_title: "dlq: expose retry metrics via INFO section",
      author: "jordan-ok",
      head: "feat/dlq-retry-metrics",
      base: "unstable",
    },
    nodes: [
      {
        nodeId: "trigger_pr_opened",
        status: "completed",
        predecessor: null,
        startedAt: 4,
        completedAt: 3.9,
        events: [
          {
            status: "info",
            at: 4,
            details:
              "Received GitHub webhook (X-GitHub-Event: pull_request, action: opened) for potpietools/redis#15",
          },
          {
            status: "success",
            at: 3.95,
            details: "Webhook signature verified against hash wh_9f2c41d8",
          },
          {
            status: "completed",
            at: 3.9,
            details: "Dispatched event to 2 downstream nodes",
          },
        ],
      },
      {
        nodeId: "agent_intake",
        status: "completed",
        predecessor: "trigger_pr_opened",
        startedAt: 3.9,
        completedAt: 3.4,
        events: [
          {
            status: "info",
            at: 3.9,
            details: "Fetched PR metadata: 11 changed files, +486 −92",
          },
          {
            status: "success",
            at: 3.5,
            details:
              "Posted intake comment: \"Starting review — covering src/dlq/*, src/info.c and 3 test files. Full review shortly.\"",
          },
          {
            status: "completed",
            at: 3.4,
            details: "Handed off to PR Description Curator",
          },
        ],
      },
      {
        nodeId: "agent_description",
        status: "completed",
        predecessor: "agent_intake",
        startedAt: 3.4,
        completedAt: 2.1,
        events: [
          {
            status: "running",
            at: 3.3,
            details: "Reading full diff to infer intent of the change",
          },
          {
            status: "success",
            at: 2.2,
            details:
              "Updated PR description with summary, per-module change list, and test plan (3 sections, 214 words)",
          },
          {
            status: "completed",
            at: 2.1,
            details: "Description update pushed to potpietools/redis#15",
          },
        ],
      },
      {
        nodeId: "agent_review",
        status: "running",
        predecessor: "trigger_pr_opened",
        startedAt: 3.9,
        events: [
          {
            status: "info",
            at: 3.8,
            details:
              "Cloned potpietools/redis @ feat/dlq-retry-metrics (depth 50) and loaded knowledge-graph context",
          },
          {
            status: "info",
            at: 3.2,
            details:
              "Built review plan: 17 diff hunks across 11 files, review_depth=thorough",
          },
          {
            status: "warning",
            at: 1.6,
            details:
              "Possible stale read in dlqRetryStatsSnapshot() — snapshot taken outside the stats lock (src/dlq/metrics.c:141)",
          },
          {
            status: "running",
            at: 0.4,
            details: "Analyzing hunk 12/17 — src/info.c (INFO section wiring)",
          },
        ],
      },
      {
        nodeId: "agent_publish",
        status: "pending",
        predecessor: "agent_review",
        startedAt: 0.1,
        events: [
          {
            status: "info",
            at: 0.1,
            details: "Waiting on Diff Review Agent output",
          },
        ],
      },
    ],
  },
  {
    id: "exec-cr-2040",
    workflowId: DEMO_CODE_REVIEW_WORKFLOW_ID,
    status: "completed",
    startedAt: 26,
    completedAt: 19,
    triggerData: {
      event: "pull_request.opened",
      repo: "potpietools/redis",
      pr_number: 14,
      pr_title: "vector-search: tune HNSW recall for filtered queries",
      author: "mira-chen",
      head: "feat/hnsw-filtered-recall",
      base: "unstable",
    },
    nodes: [
      {
        nodeId: "trigger_pr_opened",
        status: "completed",
        predecessor: null,
        startedAt: 26,
        completedAt: 25.9,
        events: [
          {
            status: "info",
            at: 26,
            details:
              "Received GitHub webhook (X-GitHub-Event: pull_request, action: opened) for potpietools/redis#14",
          },
          {
            status: "success",
            at: 25.95,
            details: "Webhook signature verified against hash wh_9f2c41d8",
          },
          {
            status: "completed",
            at: 25.9,
            details: "Dispatched event to 2 downstream nodes",
          },
        ],
      },
      {
        nodeId: "agent_intake",
        status: "completed",
        predecessor: "trigger_pr_opened",
        startedAt: 25.9,
        completedAt: 25.3,
        events: [
          {
            status: "info",
            at: 25.8,
            details: "Fetched PR metadata: 6 changed files, +312 −57",
          },
          {
            status: "success",
            at: 25.4,
            details:
              "Posted intake comment describing the recall-tuning change and the ef_runtime sweep",
          },
          {
            status: "completed",
            at: 25.3,
            details: "Handed off to PR Description Curator",
          },
        ],
      },
      {
        nodeId: "agent_description",
        status: "completed",
        predecessor: "agent_intake",
        startedAt: 25.3,
        completedAt: 23.8,
        events: [
          {
            status: "running",
            at: 25.2,
            details: "Reading full diff to infer intent of the change",
          },
          {
            status: "success",
            at: 24,
            details:
              "Rewrote description: added benchmark table (recall@10 0.87 → 0.94) and rollout notes",
          },
          {
            status: "completed",
            at: 23.8,
            details: "Description update pushed to potpietools/redis#14",
          },
        ],
      },
      {
        nodeId: "agent_review",
        status: "completed",
        predecessor: "trigger_pr_opened",
        startedAt: 25.9,
        completedAt: 21.5,
        events: [
          {
            status: "info",
            at: 25.7,
            details:
              "Cloned potpietools/redis @ feat/hnsw-filtered-recall and loaded knowledge-graph context",
          },
          {
            status: "info",
            at: 25.1,
            details: "Built review plan: 9 diff hunks across 6 files",
          },
          {
            status: "warning",
            at: 23.4,
            details:
              "ef_runtime override is not clamped — a filtered query can force ef=8192 and starve the event loop (src/vector/hnsw_search.c:288)",
          },
          {
            status: "warning",
            at: 22.6,
            details:
              "Benchmark harness seeds RNG with wall clock; recall numbers are not reproducible (tests/bench/hnsw_recall.py:41)",
          },
          {
            status: "success",
            at: 21.6,
            details:
              "Review complete: 8 findings (1 blocking, 7 suggestions) across 6 files",
          },
          {
            status: "completed",
            at: 21.5,
            details: "Findings passed to Inline Comment Publisher",
          },
        ],
      },
      {
        nodeId: "agent_publish",
        status: "completed",
        predecessor: "agent_review",
        startedAt: 21.5,
        completedAt: 19,
        events: [
          {
            status: "running",
            at: 21.4,
            details: "Publishing 8 inline review comments with suggestion blocks",
          },
          {
            status: "success",
            at: 19.4,
            details:
              "Posted 8 inline comments and 1 summary comment (1 blocking: ef_runtime clamp)",
          },
          {
            status: "completed",
            at: 19,
            details: "Review submitted as REQUEST_CHANGES on potpietools/redis#14",
          },
        ],
      },
    ],
  },
  {
    id: "exec-cr-2033",
    workflowId: DEMO_CODE_REVIEW_WORKFLOW_ID,
    status: "failed",
    startedAt: 22 * 60,
    completedAt: 22 * 60 - 9,
    errorMessage:
      "Diff Review Agent failed: GitHub secondary rate limit (403) while fetching diff blobs — retried 3×, giving up.",
    triggerData: {
      event: "pull_request.opened",
      repo: "potpietools/redis",
      pr_number: 13,
      pr_title: "cluster: fix slot migration race during resharding",
      author: "dev-sam",
      head: "fix/slot-migration-race",
      base: "unstable",
    },
    nodes: [
      {
        nodeId: "trigger_pr_opened",
        status: "completed",
        predecessor: null,
        startedAt: 22 * 60,
        completedAt: 22 * 60 - 0.1,
        events: [
          {
            status: "info",
            at: 22 * 60,
            details:
              "Received GitHub webhook (X-GitHub-Event: pull_request, action: opened) for potpietools/redis#13",
          },
          {
            status: "success",
            at: 22 * 60 - 0.05,
            details: "Webhook signature verified against hash wh_9f2c41d8",
          },
          {
            status: "completed",
            at: 22 * 60 - 0.1,
            details: "Dispatched event to 2 downstream nodes",
          },
        ],
      },
      {
        nodeId: "agent_intake",
        status: "completed",
        predecessor: "trigger_pr_opened",
        startedAt: 22 * 60 - 0.1,
        completedAt: 22 * 60 - 0.8,
        events: [
          {
            status: "success",
            at: 22 * 60 - 0.7,
            details: "Posted intake comment on potpietools/redis#13",
          },
          {
            status: "completed",
            at: 22 * 60 - 0.8,
            details: "Handed off to PR Description Curator",
          },
        ],
      },
      {
        nodeId: "agent_description",
        status: "completed",
        predecessor: "agent_intake",
        startedAt: 22 * 60 - 0.8,
        completedAt: 22 * 60 - 2.5,
        events: [
          {
            status: "success",
            at: 22 * 60 - 2.6,
            details:
              "Updated description with race-condition summary and CLUSTER SETSLOT sequencing notes",
          },
          {
            status: "completed",
            at: 22 * 60 - 2.5,
            details: "Description update pushed to potpietools/redis#13",
          },
        ],
      },
      {
        nodeId: "agent_review",
        status: "failed",
        predecessor: "trigger_pr_opened",
        startedAt: 22 * 60 - 0.1,
        completedAt: 22 * 60 - 9,
        iteration: 3,
        errorMessage:
          "GitHub secondary rate limit (403) while fetching diff blobs — retried 3×, giving up.",
        events: [
          {
            status: "info",
            at: 22 * 60 - 0.3,
            details: "Cloned potpietools/redis @ fix/slot-migration-race",
          },
          {
            status: "error",
            at: 22 * 60 - 3,
            details:
              "GET /repos/potpietools/redis/pulls/13/files → 403 (secondary rate limit). Backing off 60s (attempt 1/3)",
          },
          {
            status: "error",
            at: 22 * 60 - 5,
            details:
              "GET /repos/potpietools/redis/pulls/13/files → 403 (secondary rate limit). Backing off 120s (attempt 2/3)",
          },
          {
            status: "error",
            at: 22 * 60 - 8,
            details:
              "GET /repos/potpietools/redis/pulls/13/files → 403 (secondary rate limit). Attempt 3/3 failed",
          },
          {
            status: "failed",
            at: 22 * 60 - 9,
            details: "Node failed after 3 retries; marking execution as failed",
          },
        ],
      },
      {
        nodeId: "agent_publish",
        status: "pending",
        predecessor: "agent_review",
        startedAt: 22 * 60 - 9,
        events: [
          {
            status: "info",
            at: 22 * 60 - 9,
            details: "Skipped — upstream Diff Review Agent failed",
          },
        ],
      },
    ],
  },
  {
    id: "exec-cr-2029",
    workflowId: DEMO_CODE_REVIEW_WORKFLOW_ID,
    status: "completed",
    startedAt: 3 * 24 * 60,
    completedAt: 3 * 24 * 60 - 11,
    triggerData: {
      event: "pull_request.opened",
      repo: "potpietools/redis",
      pr_number: 8,
      pr_title: "Add dead letter queue support",
      author: "nndn",
      head: "feat/dead-letter-queue",
      base: "unstable",
    },
    nodes: [
      {
        nodeId: "trigger_pr_opened",
        status: "completed",
        predecessor: null,
        startedAt: 3 * 24 * 60,
        completedAt: 3 * 24 * 60 - 0.1,
        events: [
          {
            status: "info",
            at: 3 * 24 * 60,
            details:
              "Received GitHub webhook (X-GitHub-Event: pull_request, action: opened) for potpietools/redis#8",
          },
          {
            status: "completed",
            at: 3 * 24 * 60 - 0.1,
            details: "Dispatched event to 2 downstream nodes",
          },
        ],
      },
      {
        nodeId: "agent_intake",
        status: "completed",
        predecessor: "trigger_pr_opened",
        startedAt: 3 * 24 * 60 - 0.1,
        completedAt: 3 * 24 * 60 - 0.9,
        events: [
          {
            status: "success",
            at: 3 * 24 * 60 - 0.8,
            details:
              "Posted intake comment: 18 changed files across src/dlq/* and t/unit/dlq",
          },
          {
            status: "completed",
            at: 3 * 24 * 60 - 0.9,
            details: "Handed off to PR Description Curator",
          },
        ],
      },
      {
        nodeId: "agent_description",
        status: "completed",
        predecessor: "agent_intake",
        startedAt: 3 * 24 * 60 - 0.9,
        completedAt: 3 * 24 * 60 - 3,
        events: [
          {
            status: "success",
            at: 3 * 24 * 60 - 2.8,
            details:
              "Rewrote description with DLQ design summary, config keys (dlq-max-len, dlq-retry-limit), and migration notes",
          },
          {
            status: "completed",
            at: 3 * 24 * 60 - 3,
            details: "Description update pushed to potpietools/redis#8",
          },
        ],
      },
      {
        nodeId: "agent_review",
        status: "completed",
        predecessor: "trigger_pr_opened",
        startedAt: 3 * 24 * 60 - 0.1,
        completedAt: 3 * 24 * 60 - 8,
        events: [
          {
            status: "info",
            at: 3 * 24 * 60 - 0.5,
            details: "Cloned potpietools/redis @ feat/dead-letter-queue",
          },
          {
            status: "warning",
            at: 3 * 24 * 60 - 4,
            details:
              "dlqEnqueue() drops the message when the DLQ itself is full instead of applying the configured overflow policy (src/dlq/dlq.c:207)",
          },
          {
            status: "warning",
            at: 3 * 24 * 60 - 5.5,
            details:
              "Retry counter is stored in a 16-bit field but dlq-retry-limit accepts values up to 2^31 (src/dlq/entry.h:33)",
          },
          {
            status: "success",
            at: 3 * 24 * 60 - 8.2,
            details:
              "Review complete: 11 findings (2 blocking, 9 suggestions) across 18 files",
          },
          {
            status: "completed",
            at: 3 * 24 * 60 - 8,
            details: "Findings passed to Inline Comment Publisher",
          },
        ],
      },
      {
        nodeId: "agent_publish",
        status: "completed",
        predecessor: "agent_review",
        startedAt: 3 * 24 * 60 - 8,
        completedAt: 3 * 24 * 60 - 11,
        events: [
          {
            status: "success",
            at: 3 * 24 * 60 - 10.5,
            details:
              "Posted 11 inline comments and 1 summary comment (2 blocking) on potpietools/redis#8",
          },
          {
            status: "completed",
            at: 3 * 24 * 60 - 11,
            details: "Review submitted as REQUEST_CHANGES on potpietools/redis#8",
          },
        ],
      },
    ],
  },
];

const AUTO_DEBUG_EXECUTION_SPECS: DemoExecutionSpec[] = [
  {
    id: "exec-dbg-3112",
    workflowId: DEMO_AUTO_DEBUG_WORKFLOW_ID,
    status: "running",
    startedAt: 7,
    triggerData: {
      event: "sentry.issue.created",
      project: "redis-prod",
      issue_id: "REDIS-PROD-1424",
      title:
        "TypeError: Cannot read properties of undefined (reading 'ack') in dlq/consumer",
      culprit: "dlqConsumerDrain (src/dlq/consumer.c)",
      first_seen_release: "7.2.4",
      event_count: 118,
      users_affected: 14,
    },
    nodes: [
      {
        nodeId: "trigger_sentry_issue",
        status: "completed",
        predecessor: null,
        startedAt: 7,
        completedAt: 6.9,
        events: [
          {
            status: "info",
            at: 7,
            details:
              "Received Sentry webhook for new issue REDIS-PROD-1424 (118 events, 14 users affected)",
          },
          {
            status: "completed",
            at: 6.9,
            details: "Dispatched payload to Issue Triage Agent",
          },
        ],
      },
      {
        nodeId: "agent_triage",
        status: "completed",
        predecessor: "trigger_sentry_issue",
        startedAt: 6.9,
        completedAt: 5.6,
        events: [
          {
            status: "info",
            at: 6.8,
            details:
              "No duplicate found among 42 open issues (closest match REDIS-PROD-1388 at 0.41 similarity)",
          },
          {
            status: "info",
            at: 6.2,
            details:
              "Stack trace mapped to module src/dlq/consumer.c, owner team @queueing",
          },
          {
            status: "success",
            at: 5.7,
            details:
              "Classified as P1, actionable, regression suspect: first seen in release 7.2.4",
          },
          {
            status: "completed",
            at: 5.6,
            details: "Triage verdict passed to actionable gate",
          },
        ],
      },
      {
        nodeId: "gate_actionable",
        status: "completed",
        predecessor: "agent_triage",
        startedAt: 5.6,
        completedAt: 5.5,
        events: [
          {
            status: "success",
            at: 5.55,
            details:
              "Condition evaluated TRUE (severity P1 ≤ P2, actionable, not duplicate) → routing to Root Cause Agent",
          },
          {
            status: "completed",
            at: 5.5,
            details: "Branch taken: Debug it",
          },
        ],
      },
      {
        nodeId: "agent_debug",
        status: "running",
        predecessor: "gate_actionable",
        startedAt: 5.5,
        events: [
          {
            status: "info",
            at: 5.3,
            details:
              "Reproduced crash in sandbox: consumer group deleted while pending entries remain",
          },
          {
            status: "info",
            at: 3.8,
            details:
              "Regression window narrowed to v7.2.3..v7.2.4 (37 commits touching src/dlq)",
          },
          {
            status: "running",
            at: 0.7,
            details:
              "Bisecting: step 4/7 — testing commit 9c4e1af (\"dlq: lazy-init consumer group state\")",
          },
        ],
      },
      {
        nodeId: "agent_fix",
        status: "pending",
        predecessor: "agent_debug",
        startedAt: 0.5,
        events: [
          {
            status: "info",
            at: 0.5,
            details: "Waiting on Root Cause Agent analysis",
          },
        ],
      },
      {
        nodeId: "agent_report",
        status: "pending",
        predecessor: "agent_fix",
        startedAt: 0.5,
        events: [
          {
            status: "info",
            at: 0.5,
            details: "Waiting on upstream nodes",
          },
        ],
      },
    ],
  },
  {
    id: "exec-dbg-3108",
    workflowId: DEMO_AUTO_DEBUG_WORKFLOW_ID,
    status: "completed",
    startedAt: 5 * 60,
    completedAt: 5 * 60 - 21,
    triggerData: {
      event: "sentry.issue.created",
      project: "redis-prod",
      issue_id: "REDIS-PROD-1417",
      title: "Latency spike: XADD p99 above 800ms on stream shards",
      culprit: "streamAppendWithDLQCheck (src/t_stream.c)",
      first_seen_release: "7.2.4",
      event_count: 2304,
      users_affected: 87,
    },
    nodes: [
      {
        nodeId: "trigger_sentry_issue",
        status: "completed",
        predecessor: null,
        startedAt: 5 * 60,
        completedAt: 5 * 60 - 0.1,
        events: [
          {
            status: "info",
            at: 5 * 60,
            details:
              "Received Sentry webhook for new issue REDIS-PROD-1417 (2,304 events, 87 users affected)",
          },
          {
            status: "completed",
            at: 5 * 60 - 0.1,
            details: "Dispatched payload to Issue Triage Agent",
          },
        ],
      },
      {
        nodeId: "agent_triage",
        status: "completed",
        predecessor: "trigger_sentry_issue",
        startedAt: 5 * 60 - 0.1,
        completedAt: 5 * 60 - 1.8,
        events: [
          {
            status: "info",
            at: 5 * 60 - 1,
            details:
              "Perf regression profile detected; mapped to src/t_stream.c, owner team @streams",
          },
          {
            status: "success",
            at: 5 * 60 - 1.9,
            details: "Classified as P1, actionable, not a duplicate",
          },
          {
            status: "completed",
            at: 5 * 60 - 1.8,
            details: "Triage verdict passed to actionable gate",
          },
        ],
      },
      {
        nodeId: "gate_actionable",
        status: "completed",
        predecessor: "agent_triage",
        startedAt: 5 * 60 - 1.8,
        completedAt: 5 * 60 - 1.7,
        events: [
          {
            status: "success",
            at: 5 * 60 - 1.75,
            details: "Condition evaluated TRUE → routing to Root Cause Agent",
          },
          {
            status: "completed",
            at: 5 * 60 - 1.7,
            details: "Branch taken: Debug it",
          },
        ],
      },
      {
        nodeId: "agent_debug",
        status: "completed",
        predecessor: "gate_actionable",
        startedAt: 5 * 60 - 1.7,
        completedAt: 5 * 60 - 12,
        events: [
          {
            status: "info",
            at: 5 * 60 - 3,
            details:
              "Reproduced p99 spike with 50k-entry stream + DLQ check enabled (baseline 4ms → 812ms)",
          },
          {
            status: "info",
            at: 5 * 60 - 7,
            details:
              "Flamegraph shows 91% of time in dlqScanPending() called from the XADD hot path",
          },
          {
            status: "success",
            at: 5 * 60 - 12.2,
            details:
              "Root cause confirmed: O(n) pending-entry scan on every XADD when dlq-retry-limit > 0 (introduced in 41d0b7c)",
          },
          {
            status: "completed",
            at: 5 * 60 - 12,
            details: "Root-cause analysis passed to Fix & Draft PR Agent",
          },
        ],
      },
      {
        nodeId: "agent_fix",
        status: "completed",
        predecessor: "agent_debug",
        startedAt: 5 * 60 - 12,
        completedAt: 5 * 60 - 19,
        events: [
          {
            status: "info",
            at: 5 * 60 - 14,
            details:
              "Implemented fix on branch fix/dlq-pending-scan-cache: cache pending count per consumer group, invalidate on ack/claim",
          },
          {
            status: "success",
            at: 5 * 60 - 16,
            details:
              "Added regression test t/unit/dlq/pending-scan-perf.tcl — fails at 812ms before fix, 6ms after",
          },
          {
            status: "success",
            at: 5 * 60 - 19.2,
            details:
              "Opened draft PR potpietools/redis#16 linking REDIS-PROD-1417",
          },
          {
            status: "completed",
            at: 5 * 60 - 19,
            details: "Draft PR handed to Status Reporter",
          },
        ],
      },
      {
        nodeId: "agent_report",
        status: "completed",
        predecessor: "agent_fix",
        startedAt: 5 * 60 - 19,
        completedAt: 5 * 60 - 21,
        events: [
          {
            status: "success",
            at: 5 * 60 - 20,
            details:
              "Commented root cause + draft PR link on REDIS-PROD-1417 and assigned @streams",
          },
          {
            status: "success",
            at: 5 * 60 - 20.8,
            details:
              "Posted summary to #incidents: \"XADD p99 spike root-caused; candidate fix in PR #16\"",
          },
          {
            status: "completed",
            at: 5 * 60 - 21,
            details: "Execution finished",
          },
        ],
      },
    ],
  },
  {
    id: "exec-dbg-3101",
    workflowId: DEMO_AUTO_DEBUG_WORKFLOW_ID,
    status: "completed",
    startedAt: 26 * 60,
    completedAt: 26 * 60 - 2,
    triggerData: {
      event: "sentry.issue.created",
      project: "redis-stage",
      issue_id: "REDIS-STAGE-0997",
      title: "ConnectionResetError: peer reset during rolling deploy",
      culprit: "connSocketRead (src/connection.c)",
      first_seen_release: "7.2.4-rc2",
      event_count: 31,
      users_affected: 0,
    },
    nodes: [
      {
        nodeId: "trigger_sentry_issue",
        status: "completed",
        predecessor: null,
        startedAt: 26 * 60,
        completedAt: 26 * 60 - 0.1,
        events: [
          {
            status: "info",
            at: 26 * 60,
            details:
              "Received Sentry webhook for new issue REDIS-STAGE-0997 (31 events, 0 users affected)",
          },
          {
            status: "completed",
            at: 26 * 60 - 0.1,
            details: "Dispatched payload to Issue Triage Agent",
          },
        ],
      },
      {
        nodeId: "agent_triage",
        status: "completed",
        predecessor: "trigger_sentry_issue",
        startedAt: 26 * 60 - 0.1,
        completedAt: 26 * 60 - 1.3,
        events: [
          {
            status: "info",
            at: 26 * 60 - 0.8,
            details:
              "Event burst correlates 1:1 with staging rolling deploy window (14:02–14:09 UTC)",
          },
          {
            status: "success",
            at: 26 * 60 - 1.4,
            details:
              "Classified as P4 deploy noise — connection resets expected during pod rotation",
          },
          {
            status: "completed",
            at: 26 * 60 - 1.3,
            details: "Triage verdict passed to actionable gate",
          },
        ],
      },
      {
        nodeId: "gate_actionable",
        status: "completed",
        predecessor: "agent_triage",
        startedAt: 26 * 60 - 1.3,
        completedAt: 26 * 60 - 1.2,
        events: [
          {
            status: "info",
            at: 26 * 60 - 1.25,
            details:
              "Condition evaluated FALSE (severity P4, not actionable) → routing to Status Reporter",
          },
          {
            status: "completed",
            at: 26 * 60 - 1.2,
            details: "Branch taken: Report & close",
          },
        ],
      },
      {
        nodeId: "agent_report",
        status: "completed",
        predecessor: "gate_actionable",
        startedAt: 26 * 60 - 1.2,
        completedAt: 26 * 60 - 2,
        events: [
          {
            status: "success",
            at: 26 * 60 - 1.8,
            details:
              "Resolved REDIS-STAGE-0997 as deploy noise with correlation evidence attached",
          },
          {
            status: "completed",
            at: 26 * 60 - 2,
            details: "Execution finished — no debug run required",
          },
        ],
      },
    ],
  },
  {
    id: "exec-dbg-3094",
    workflowId: DEMO_AUTO_DEBUG_WORKFLOW_ID,
    status: "failed",
    startedAt: 2 * 24 * 60,
    completedAt: 2 * 24 * 60 - 14,
    errorMessage:
      "Root Cause Agent failed: could not reproduce OOM in sandbox — replica dataset exceeds the 8 GiB sandbox memory limit.",
    triggerData: {
      event: "sentry.issue.created",
      project: "redis-prod",
      issue_id: "REDIS-PROD-1389",
      title: "OOM in RDB fork on replica during full sync",
      culprit: "rdbSaveBackground (src/rdb.c)",
      first_seen_release: "7.2.3",
      event_count: 9,
      users_affected: 3,
    },
    nodes: [
      {
        nodeId: "trigger_sentry_issue",
        status: "completed",
        predecessor: null,
        startedAt: 2 * 24 * 60,
        completedAt: 2 * 24 * 60 - 0.1,
        events: [
          {
            status: "info",
            at: 2 * 24 * 60,
            details:
              "Received Sentry webhook for new issue REDIS-PROD-1389 (9 events, 3 users affected)",
          },
          {
            status: "completed",
            at: 2 * 24 * 60 - 0.1,
            details: "Dispatched payload to Issue Triage Agent",
          },
        ],
      },
      {
        nodeId: "agent_triage",
        status: "completed",
        predecessor: "trigger_sentry_issue",
        startedAt: 2 * 24 * 60 - 0.1,
        completedAt: 2 * 24 * 60 - 1.5,
        events: [
          {
            status: "success",
            at: 2 * 24 * 60 - 1.6,
            details:
              "Classified as P2, actionable; mapped to src/rdb.c, owner team @persistence",
          },
          {
            status: "completed",
            at: 2 * 24 * 60 - 1.5,
            details: "Triage verdict passed to actionable gate",
          },
        ],
      },
      {
        nodeId: "gate_actionable",
        status: "completed",
        predecessor: "agent_triage",
        startedAt: 2 * 24 * 60 - 1.5,
        completedAt: 2 * 24 * 60 - 1.4,
        events: [
          {
            status: "success",
            at: 2 * 24 * 60 - 1.45,
            details: "Condition evaluated TRUE → routing to Root Cause Agent",
          },
          {
            status: "completed",
            at: 2 * 24 * 60 - 1.4,
            details: "Branch taken: Debug it",
          },
        ],
      },
      {
        nodeId: "agent_debug",
        status: "failed",
        predecessor: "gate_actionable",
        startedAt: 2 * 24 * 60 - 1.4,
        completedAt: 2 * 24 * 60 - 12,
        iteration: 2,
        errorMessage:
          "Could not reproduce OOM: replica dataset (23 GiB) exceeds the 8 GiB sandbox memory limit.",
        events: [
          {
            status: "info",
            at: 2 * 24 * 60 - 3,
            details:
              "Attempting reproduction with synthetic 4 GiB dataset — fork completed without OOM",
          },
          {
            status: "warning",
            at: 2 * 24 * 60 - 7,
            details:
              "Production replica dataset is 23 GiB; sandbox is capped at 8 GiB",
          },
          {
            status: "error",
            at: 2 * 24 * 60 - 11,
            details:
              "Reproduction attempt 2/2 failed: cannot allocate representative dataset in sandbox",
          },
          {
            status: "failed",
            at: 2 * 24 * 60 - 12,
            details:
              "Marking node failed; recommended manual follow-up with a memory-profiled replica",
          },
        ],
      },
      {
        nodeId: "agent_report",
        status: "completed",
        predecessor: "agent_debug",
        startedAt: 2 * 24 * 60 - 12,
        completedAt: 2 * 24 * 60 - 14,
        events: [
          {
            status: "warning",
            at: 2 * 24 * 60 - 13,
            details:
              "Commented on REDIS-PROD-1389: automated debugging blocked by sandbox memory limits; escalated to @persistence",
          },
          {
            status: "completed",
            at: 2 * 24 * 60 - 14,
            details: "Execution finished with failure recorded",
          },
        ],
      },
    ],
  },
];

const DEMO_EXECUTIONS = [
  ...CODE_REVIEW_EXECUTION_SPECS,
  ...AUTO_DEBUG_EXECUTION_SPECS,
].map(buildExecution);

export function getDemoWorkflowExecutions(
  workflowId: string
): WorkflowExecution[] {
  return DEMO_EXECUTIONS.filter(
    (entry) => entry.execution.workflow_id === workflowId
  ).map((entry) => entry.execution);
}

export function getDemoExecutionById(
  executionId: string
): WorkflowExecution | undefined {
  return DEMO_EXECUTIONS.find((entry) => entry.execution.id === executionId)
    ?.execution;
}

export function getDemoExecutionTree(
  executionId: string
): ExecutionTree | undefined {
  return DEMO_EXECUTIONS.find((entry) => entry.execution.id === executionId)
    ?.tree;
}
