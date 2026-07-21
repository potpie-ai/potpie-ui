// Display labels and styling for event taxonomy. Pure data — no React.

export const LIFECYCLE_LABELS: Record<string, string> = {
  done: "Processed",
  reconciled: "Processed",
  queued: "Queued",
  processing: "Processing",
  error: "Error",
  failed: "Error",
  received: "Queued",
};

// Tailwind classes per status. Kept here so badge + row indicator agree.
// Palette discipline: emerald = done, amber = pending, rose = failed, and
// the lime accent only for the live/processing state.
export const STATUS_COLORS: Record<string, string> = {
  done: "border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  reconciled:
    "border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  queued:
    "border-amber-600/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  received:
    "border-amber-600/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  processing: "border-accent/60 bg-accent/15 text-foreground",
  error: "border-rose-600/25 bg-rose-500/10 text-rose-700 dark:text-rose-400",
  failed: "border-rose-600/25 bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

export const SOURCE_LABELS: Record<string, string> = {
  ui_raw_ingest: "Added from UI",
  manual: "Manual",
  github: "GitHub",
  webhook: "Webhook",
  cli: "CLI",
  http: "API",
  unknown: "Unknown",
};

export const KIND_LABELS: Record<string, string> = {
  raw_episode: "Raw note",
  agent_reconciliation: "Agent ingestion",
  github_merged_pr: "Merged PR",
};

export const WORK_EVENT_LABELS: Record<string, string> = {
  prompt: "Prompt",
  model_messages: "Messages",
  tool_call: "Tool call",
  tool_result: "Tool result",
  plan_output: "Plan",
  error: "Error",
};

// Friendly labels for the agent's tool surface. Keys are the exact tool
// names the reconciliation agent registers (see pydantic_deep_agent.py:
// read / mutation / control tools + the github / linear / web / sandbox
// connectors). The raw snake_case name is still shown as a secondary chip
// so power users can correlate with logs — this is just the human gloss.
export const TOOL_LABELS: Record<string, string> = {
  // read-only graph lookups
  context_search: "Searched the graph",
  context_recent_changes: "Checked recent changes",
  context_file_owners: "Looked up file owners",
  context_graph_overview: "Reviewed graph overview",
  // mutation
  apply_graph_mutations: "Updated the graph",
  // event-completion control
  mark_events_processed: "Marked events reconciled",
  mark_event_processed: "Marked event reconciled",
  finish_batch: "Finished the batch",
  // GitHub connector
  github_get_pull_request: "Read GitHub PR",
  github_get_pull_request_commits: "Read PR commits",
  github_get_pull_request_review_comments: "Read PR review comments",
  github_get_pull_request_issue_comments: "Read PR comments",
  github_get_issue: "Read GitHub issue",
  // Linear connector
  linear_get_issue: "Read Linear issue",
  // Web connector
  web_search: "Searched the web",
  web_extract_page: "Read a web page",
  // Sandbox connector
  sandbox_list_repos: "Listed sandbox repos",
  sandbox_list_dir: "Listed a directory",
  sandbox_read_file: "Read a file",
  sandbox_search: "Searched the code",
  sandbox_git_log: "Walked git history",
  sandbox_git_show: "Inspected a commit",
  sandbox_git_blame: "Ran git blame",
  sandbox_git_diff: "Diffed refs",
  sandbox_checkout: "Checked out a ref",
};

// The backend records the model's reasoning parts as a flat `thinking`
// record_type, so every reasoning chunk would otherwise render the same
// static "Thinking" badge — monotonous when a reasoning model emits dozens.
// Pick one of these per part (deterministically by part id, so the label
// is stable across stream flushes) for a Claude-Code-style rotating verb.
export const THINKING_VERBS: readonly string[] = [
  "Thinking",
  "Pondering",
  "Reasoning",
  "Analyzing",
  "Considering",
  "Deliberating",
  "Reflecting",
  "Synthesizing",
  "Connecting the dots",
  "Tracing context",
  "Mapping relationships",
  "Working it out",
  "Mulling it over",
  "Piecing it together",
  "Cross-referencing",
  "Weighing the evidence",
];

// Statuses considered "in-flight" — agent may still be working.
export const ACTIVE_STATUSES: ReadonlySet<string> = new Set([
  "queued",
  "received",
  "processing",
]);

export const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  "done",
  "reconciled",
  "error",
  "failed",
]);

export const PAGE_SIZE = 25;
