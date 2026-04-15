import type {
  CreatePullRequestResponse,
  PhasedPlan,
  PlanChatResponse,
  PlanStatusResponse,
  RecipeDetailsResponse,
  RecipeQuestionsResponse,
  SpecChatResponse,
  SpecificationOutput,
  SpecStatusResponse,
  SubmitRecipeAnswersResponse,
  SubmitTaskSplittingResponse,
  TaskLayer,
  TaskSplittingItemsResponse,
  TaskSplittingStatusResponse,
  TriggerSpecGenerationResponse,
} from "@/lib/types/spec";
import type { Recipe } from "@/services/RecipeService";
import type { LoadedMessage } from "@/services/ChatService";
import type { CreateRecipeCodegenResponse } from "@/lib/types/spec";

export const DEMO_RECIPE_ID = "8f6d6c5e-37f0-48b8-a8d8-6fbef4f7d201";
export const DEMO_PROJECT_ID = "bd37c4a4-13bf-4d37-8507-986398f79400";
export const DEMO_QUESTION_RUN_ID = "demo-question-run-redis-dlq";
export const DEMO_SPEC_RUN_ID = "demo-spec-run-redis-dlq";
export const DEMO_PLAN_RUN_ID = "demo-plan-run-redis-dlq";
export const DEMO_TASK_SPLITTING_ID = "ba6d3347-e744-4c2f-8924-4619f98e1f2f";
export const DEMO_CONVERSATION_ID = "demo-conversation-redis-dlq";
export const DEMO_PLAN_ITEM_ID = "phase-1-command-surface";
export const DEMO_RECIPE_TITLE = "Dead Letter Q Support";
export const DEMO_PR_URL = "https://github.com/potpietools/redis/pull/8";

type DemoState = {
  questionsGenerated: boolean;
  answersSubmitted: boolean;
  specStarted: boolean;
  specComplete: boolean;
  planStarted: boolean;
  planComplete: boolean;
  codegenStarted: boolean;
  codegenComplete: boolean;
  codegenStage: number;
  prStarted: boolean;
  prComplete: boolean;
};

type DemoStreamEvent = {
  delay: number;
  eventType: string;
  data?: Record<string, unknown>;
};

const DEFAULT_STATE: DemoState = {
  questionsGenerated: false,
  answersSubmitted: false,
  specStarted: false,
  specComplete: false,
  planStarted: false,
  planComplete: false,
  codegenStarted: false,
  codegenComplete: false,
  codegenStage: -1,
  prStarted: false,
  prComplete: false,
};
let demoState: DemoState = { ...DEFAULT_STATE };
let demoPrTimer: number | null = null;

function readState(): DemoState {
  return demoState;
}

function writeState(next: DemoState) {
  demoState = next;
}

function updateState(updater: (current: DemoState) => DemoState): DemoState {
  const next = updater(readState());
  writeState(next);
  return next;
}

function getDerivedState() {
  return readState();
}

export function resetDemoBuildFlowState() {
  if (demoPrTimer !== null) {
    window.clearTimeout(demoPrTimer);
    demoPrTimer = null;
  }
  writeState({ ...DEFAULT_STATE });
}

export function isDemoRecipeId(recipeId?: string | null) {
  return recipeId === DEMO_RECIPE_ID;
}

export function isDemoTaskSplittingId(taskSplittingId?: string | null) {
  return taskSplittingId === DEMO_TASK_SPLITTING_ID;
}

export function isDemoConversationId(conversationId?: string | null) {
  return conversationId === DEMO_CONVERSATION_ID;
}

export function isRedisDlqDemoRequest(
  repoName?: string | null,
  branchName?: string | null,
  prompt?: string | null,
) {
  const normalizedRepo = repoName?.trim().toLowerCase();
  const normalizedBranch = branchName?.trim().toLowerCase();
  const normalizedPrompt = prompt?.trim().toLowerCase() ?? "";

  return (
    normalizedRepo === "potpietools/redis" &&
    normalizedBranch === "unstable" &&
    normalizedPrompt.includes("add") &&
    normalizedPrompt.includes("dlq")
  );
}

export function getDemoRecipeStatus() {
  const state = getDerivedState();
  if (!state.questionsGenerated) return "PENDING_QUESTIONS";
  if (state.codegenStarted) {
    return state.codegenComplete
      ? "IMPLEMENTATION_READY"
      : "TASK_SPLITTING_IN_PROGRESS";
  }
  if (state.planStarted) {
    return state.planComplete ? "PLAN_READY" : "PLAN_IN_PROGRESS";
  }
  if (state.specStarted) {
    return state.specComplete ? "SPEC_READY" : "SPEC_IN_PROGRESS";
  }
  if (state.answersSubmitted) return "ANSWERS_SUBMITTED";
  return "QUESTIONS_READY";
}

export function getDemoRecipe(): Recipe {
  return {
    id: DEMO_RECIPE_ID,
    recipe_id: DEMO_RECIPE_ID,
    project_id: DEMO_PROJECT_ID,
    user_prompt: DEMO_RECIPE_TITLE,
    status: getDemoRecipeStatus(),
    created_at: "2026-04-14T10:05:00.000Z",
    repo_name: "redis",
    branch_name: "stream-dlq-demo",
    current_question_task_id: "demo-question-task",
    current_spec_task_id: "demo-spec-task",
    current_plan_task_id: "demo-plan-task",
  };
}

export function getDemoCreateRecipeResponse(): CreateRecipeCodegenResponse {
  return {
    recipe: {
      id: DEMO_RECIPE_ID,
      project_id: DEMO_PROJECT_ID,
      user_prompt: DEMO_RECIPE_TITLE,
      additional_links: [],
      status: getDemoRecipeStatus(),
      created_by: "demo-user",
      current_question_task_id: "demo-question-task",
      current_spec_task_id: "demo-spec-task",
      current_plan_task_id: "demo-plan-task",
    },
  };
}

export function getDemoRecipeDetails(): RecipeDetailsResponse {
  return {
    recipe_id: DEMO_RECIPE_ID,
    project_id: DEMO_PROJECT_ID,
    user_prompt: getDemoRecipe().user_prompt,
    repo_name: "redis",
    branch_name: "stream-dlq-demo",
    questions_and_answers: DEMO_QUESTIONS.questions.map((question) => ({
      question_id: question.id,
      question: question.question,
      answer: null,
    })),
    status: getDemoRecipeStatus(),
  };
}

const DEMO_QUESTIONS: RecipeQuestionsResponse = {
  recipe_id: DEMO_RECIPE_ID,
  generation_status: "completed",
  generated_at: "2026-04-14T10:05:08.000Z",
  error_message: null,
  questions: [
    {
      id: "q1",
      question: "Which scope should ship in the first demo cut of `XDLQ`?",
      expected_answer_type: "mcq",
      multiple_choice: false,
      options: [
        { label: "MOVE, LIST, INFO, REPLAY only", description: "Prioritize core quarantine workflow." },
        { label: "Full family including PURGE", description: "Show the full operator lifecycle end to end." },
        { label: "MOVE and INFO only", description: "Keep the demo very small." },
      ],
      answer_recommendation: {
        idx: 1,
        reasoning: "The plan explicitly calls out `PURGE` as part of the operator lifecycle, and it demos well.",
      },
      context_refs: [{ path: "STREAM_DLQ_IMPLEMENTATION_PLAN.md", type: "doc" }],
    },
    {
      id: "q2",
      question: "How should dead-lettered entries interact with `XPENDING` during the demo?",
      expected_answer_type: "mcq",
      multiple_choice: false,
      options: [
        { label: "Keep them visible in normal XPENDING output" },
        { label: "Exclude them from active XPENDING and surface them via XDLQ INFO" },
        { label: "Make this undefined for v1" },
      ],
      answer_recommendation: {
        idx: 1,
        reasoning: "This matches the recommended semantics in the implementation plan and is easier to explain to clients.",
      },
      context_refs: [{ path: "STREAM_DLQ_IMPLEMENTATION_PLAN.md", type: "doc" }],
    },
    {
      id: "q3",
      question: "What metadata should the demo show for DLQ entries?",
      expected_answer_type: "mcq",
      multiple_choice: true,
      options: [
        { label: "failure reason" },
        { label: "last consumer" },
        { label: "delivery count at move time" },
        { label: "moved-at timestamp" },
        { label: "replay count" },
      ],
      answer_recommendation: {
        idx: 0,
        reasoning: "The UI should surface the full operator story, not just one field.",
      },
      context_refs: [{ path: "STREAM_DLQ_IMPLEMENTATION_PLAN.md", type: "doc" }],
    },
    {
      id: "q4",
      question: "Any constraints to keep the implementation native to Redis Streams?",
      expected_answer_type: "free_text",
      multiple_choice: false,
      options: [],
      answer_recommendation: {
        idx: null,
        reasoning:
          "Treat DLQ as consumer-group scoped state layered over the existing stream and PEL model; avoid a separate side stream in v1.",
      },
      context_refs: [{ path: "STREAM_DLQ_IMPLEMENTATION_PLAN.md", type: "doc" }],
    },
  ],
};

const DEMO_SPECIFICATION: SpecificationOutput = {
  tl_dr:
    "Introduce a native `XDLQ` command family for Redis Streams so operators can quarantine poison messages, inspect dead-letter metadata, replay corrected messages, and purge stale DLQ state while preserving existing stream and consumer-group semantics.",
  context: {
    original_request:
      "We need a first-class dead-letter workflow for Redis Streams consumer groups that feels native to Redis rather than implemented as an external side stream.",
    janus_analysis:
      "The highest-value operator narrative is fail -> quarantine -> inspect -> replay. The feature should read like a serious Redis addition that spans command parsing, stream internals, introspection, replication, persistence, and tests.",
    qa_answers:
      "The demo should ship the full lifecycle including `PURGE`, keep dead-lettered entries out of active `XPENDING` flows, surface rich metadata in `LIST` and `INFO`, and keep the implementation group-scoped instead of creating a separate DLQ stream key.",
    research_findings:
      "The implementation handoff recommends consumer-group scoped DLQ state, deterministic per-ID status replies, replay that preserves original entry IDs, skip semantics for `XCLAIM`/`XAUTOCLAIM`, and focused persistence and replication validation.",
    scope_guardrails:
      "V1 should avoid threshold-based auto-promotion, arbitrary nested metadata, cross-stream routing, or expensive unbounded scans in hot paths.",
  },
  success_metrics: [
    "Operators can move one or more pending entries into DLQ with explicit failure metadata and receive stable per-ID result statuses.",
    "`XDLQ LIST` supports bounded iteration and returns metadata rich enough to debug blast radius without manual key inspection.",
    "`XDLQ INFO` and `XINFO STREAM FULL` expose low-cost DLQ summary fields for operational observability.",
    "Replayed entries re-enter standard consumer-group processing explicitly and never bypass quarantine semantics through generic claim paths.",
    "Replication, reload, AOF, and deleted-entry scenarios preserve correctness with no stale metadata or silent drift.",
  ],
  functional_requirements: [
    {
      id: "FR-001",
      title: "Add a first-class XDLQ command family",
      description:
        "Introduce `XDLQ MOVE`, `LIST`, `INFO`, `REPLAY`, `PURGE`, and `HELP` using Redis-native parsing, command metadata, help text, and RESP-stable reply schemas.",
      acceptance_criteria: [
        "The command family is discoverable through command docs and help output.",
        "MOVE, REPLAY, and PURGE return per-ID result statuses rather than a single aggregate integer.",
        "Malformed IDs, invalid option ordering, repeated IDs, missing groups, and wrong-type keys all return deterministic errors.",
      ],
      dependencies: [],
      implementation_recommendations: [
        "Define new command JSON entries under `src/commands/` for the top-level container and each supported subcommand.",
        "Keep parser dispatch close to existing stream command handling to preserve Redis command locality.",
      ],
      guardrails: [
        "Do not overload `XNACK` to become the DLQ surface.",
        "Keep RESP2 and RESP3 reply structures aligned.",
      ],
      external_dependencies: [],
    },
    {
      id: "FR-002",
      title: "Store DLQ metadata at the consumer-group level",
      description:
        "Persist DLQ records in consumer-group scoped state keyed by stream entry ID, capturing reason, last known consumer, delivery counters, timestamps, replay accounting, and summary fields.",
      acceptance_criteria: [
        "DLQ state survives normal stream operations until replay or purge.",
        "Deleting or acknowledging the underlying entry does not leave invalid references in DLQ indexes.",
        "The metadata model supports both lightweight summaries and bounded listing without requiring full scans.",
      ],
      dependencies: ["FR-001"],
      implementation_recommendations: [
        "Extend stream consumer-group internals rather than creating an external side stream.",
        "Track summary fields such as `dlq-count`, first/last IDs, and replay totals alongside the ordered DLQ index.",
      ],
      guardrails: [
        "Avoid duplicating large payloads or introducing unbounded metadata scans in hot paths.",
      ],
      external_dependencies: [],
    },
    {
      id: "FR-003",
      title: "Define DLQ lifecycle semantics and replay behavior",
      description:
        "Make DLQ a quarantined state distinct from the transient nack/reclaim path, and ensure replay explicitly restores an entry to active group processing under a target consumer.",
      acceptance_criteria: [
        "Dead-lettered entries are no longer considered active pending work.",
        "Replay removes the entry from DLQ state, updates replay accounting, and returns it to a claimable/owned workflow predictably.",
        "Acking or claiming DLQ entries outside the replay path is either disallowed or clearly defined with explicit status replies.",
      ],
      dependencies: ["FR-001", "FR-002"],
      implementation_recommendations: [
        "Treat replay as the only supported re-entry path into normal consumer-group processing.",
        "Preserve original stream IDs so operators can correlate move and replay history cleanly.",
      ],
      external_dependencies: [],
    },
    {
      id: "FR-004",
      title: "Integrate DLQ semantics with existing stream commands",
      description:
        "Ensure `XPENDING`, `XCLAIM`, `XAUTOCLAIM`, `XACK`, `XNACK`, and `XINFO STREAM FULL` behave coherently around quarantined entries.",
      acceptance_criteria: [
        "`XPENDING` reflects only active outstanding work and excludes DLQ entries from normal detailed iteration.",
        "`XCLAIM` and `XAUTOCLAIM` do not reclaim DLQ entries accidentally.",
        "`XINFO STREAM FULL` surfaces DLQ summary fields per consumer group without dumping unbounded entry detail.",
      ],
      dependencies: ["FR-002", "FR-003"],
      implementation_recommendations: [
        "Expose operator visibility through `XDLQ INFO` and `XINFO STREAM FULL` rather than overloading `XPENDING` output.",
        "Document how `XACK` and `XNACK` interact with DLQ so the lifecycle stays explicit.",
      ],
      external_dependencies: [],
    },
    {
      id: "FR-005",
      title: "Guarantee persistence, replication, and reload correctness",
      description:
        "DLQ state must survive replication, AOF rewrite, RDB save/load, and debug reload flows with no metadata drift between primary, replica, and restarted servers.",
      acceptance_criteria: [
        "`MOVE` and `REPLAY` transitions propagate deterministically through replication.",
        "Reload reconstructs DLQ summaries, replay counters, and membership correctly.",
        "Deleted-entry handling, multi-group behavior, and partial lifecycle scenarios remain correct after reload.",
      ],
      dependencies: ["FR-002", "FR-003", "FR-004"],
      implementation_recommendations: [
        "Prefer command rewriting for propagation unless metadata fidelity requires minimal new persistence hooks.",
        "Add focused test coverage for reload, AOF/RDB, and replication rather than relying on one giant end-to-end test.",
      ],
      external_dependencies: [],
    },
    {
      id: "FR-006",
      title: "Ship complete docs and operator-facing guidance",
      description:
        "Document the command family, reply shapes, lifecycle semantics, and examples so users can understand the feature from command docs, release notes, and introspection output alone.",
      acceptance_criteria: [
        "New command JSON files include summaries, arguments, and reply schema guidance.",
        "Operator examples show fail, inspect, replay, and purge flows clearly.",
        "Docs explain how DLQ differs from `XNACK` and how existing commands interact with quarantined entries.",
      ],
      dependencies: ["FR-001", "FR-004", "FR-005"],
      implementation_recommendations: [
        "Use concise command docs plus release notes to explain the intended operational story.",
      ],
      external_dependencies: [],
    },
  ],
  non_functional_requirements: [
    {
      id: "NFR-001",
      title: "Performance and bounded iteration",
      description:
        "`XDLQ INFO` must stay cheap, `XDLQ LIST` must support bounded iteration, and normal stream read/claim paths must avoid regressions from new DLQ bookkeeping.",
    },
    {
      id: "NFR-002",
      title: "Memory safety and cleanup",
      description:
        "Reason strings, ordered indexes, and per-group DLQ metadata must be cleaned up correctly during replay, purge, entry deletion, and group destruction.",
    },
    {
      id: "NFR-003",
      title: "Operator clarity",
      description:
        "Error messages and per-ID statuses should make partial success, duplicate requests, and deleted-entry scenarios easy to reason about during incident response.",
    },
  ],
  data_models: [
    {
      name: "streamDlqEntry",
      description:
        "Represents one dead-lettered stream entry within a consumer group and carries operator-visible metadata such as reason, last consumer, delivery counters, moved-at time, replay count, and optional replay audit fields.",
    },
    {
      name: "streamDlqSummary",
      description:
        "Maintains low-cost summary fields per consumer group including total count, first/last DLQ IDs, oldest/newest age, and replay totals for `INFO` and `XINFO STREAM FULL`.",
    },
  ],
  interfaces: [
    {
      name: "XDLQ MOVE",
      contract:
        "Moves specific pending entries into DLQ state with per-ID result statuses and optional metadata such as `REASON`, `CONSUMER`, and `RETRYCOUNT`.",
    },
    {
      name: "XDLQ LIST",
      contract:
        "Returns bounded DLQ entry objects with ID, reason, consumer, delivery metadata, moved-at time, and replay counters.",
    },
    {
      name: "XDLQ INFO",
      contract:
        "Returns lightweight DLQ summary fields suitable for operators and introspection surfaces.",
    },
  ],
  external_dependencies_summary: [
    "No external service dependency is required; the feature is implemented within Redis stream internals and command metadata.",
    "Existing replication, AOF, and RDB mechanisms are the critical compatibility surfaces.",
  ],
  architectural_decisions: [
    "Treat DLQ as a consumer-group scoped state machine layered over the existing PEL model rather than creating a separate stream key.",
    "Preserve original stream entry IDs during replay to avoid producer confusion and simplify correlation.",
    "Keep quarantine semantics explicit: DLQ entries are skipped by normal claim flows and only re-enter through `XDLQ REPLAY`.",
    "Favor summary fields and ordered indexes over unbounded scans so operator visibility remains cheap enough for production use.",
    "Prefer localized stream helper functions, minimal command-surface churn, and low-risk persistence propagation paths.",
  ],
};

const DEMO_PLAN: PhasedPlan = {
  phases: [
    {
      phase_id: "phase-0",
      name: "Design lock and command contract",
      description: "Freeze lifecycle semantics, reply shapes, and operator-visible behavior before implementation.",
      summary:
        "Resolve open questions around DLQ versus XPENDING semantics, replay ownership, per-ID status replies, and the exact first release scope so downstream implementation stays coherent.",
      dependencies: [],
      is_final: false,
      iteration: 1,
      plan_items: [
        {
          plan_item_id: "phase-0-design-lock",
          order: 1,
          title: "Lock the XDLQ surface area and response contracts",
          description:
            "Confirm the initial subcommand set, result object shape, and lifecycle terminology used across docs, tests, and implementation.",
          detailed_description:
            "Capture the product-level decisions from the handoff: `MOVE`, `LIST`, `INFO`, `REPLAY`, `PURGE`, and `HELP`; per-ID status objects for mutating commands; explicit quarantine semantics; and replay that preserves original stream IDs.",
          dependencies: [],
          status: "pending",
          created_at: "2026-04-14T10:05:10.000Z",
          file_changes: [
            { path: "src/commands/xdlq.json", action: "create", purpose: "Define top-level command family metadata." },
            { path: "src/commands/xdlq-help.json", action: "create", purpose: "Expose discoverable help and command docs." },
            { path: "src/t_stream.c", action: "modify", purpose: "Reserve command dispatch entrypoint for subcommands." },
          ],
          verification_criteria: [
            "No ambiguity remains around whether DLQ entries are claimable or visible to normal XPENDING iteration.",
            "Reply shapes are stable enough to be referenced by command docs and tests before core logic lands.",
          ],
        },
        {
          plan_item_id: DEMO_PLAN_ITEM_ID,
          order: 2,
          title: "Define subcommands, arguments, and reply schemas",
          description:
            "Create concrete command metadata for each subcommand and align validation semantics with existing stream commands.",
          detailed_description:
            "Add command JSON definitions for `MOVE`, `LIST`, `INFO`, `REPLAY`, and `PURGE`, including summaries, arguments, option ordering, and machine-friendly reply schemas suitable for RESP2 and RESP3 clients.",
          dependencies: ["phase-0-design-lock"],
          status: "pending",
          created_at: "2026-04-14T10:05:12.000Z",
          file_changes: [
            { path: "src/commands/xdlq-move.json", action: "create", purpose: "Document move semantics and reply schema." },
            { path: "src/commands/xdlq-list.json", action: "create", purpose: "Document bounded listing semantics." },
            { path: "src/commands/xdlq-info.json", action: "create", purpose: "Document summary reply fields." },
            { path: "src/commands/xdlq-replay.json", action: "create", purpose: "Document replay semantics and statuses." },
            { path: "src/commands/xdlq-purge.json", action: "create", purpose: "Document purge semantics and edge cases." },
          ],
          verification_criteria: [
            "`COMMAND DOCS` and `XDLQ HELP` list all supported subcommands with clear operator-facing descriptions.",
            "Mutating subcommands share one consistent per-ID result vocabulary.",
          ],
        },
      ],
      diagrams: [
        {
          diagram_id: "plan-phase-0-diagram",
          type: "mermaid",
          title: "Command contract flow",
          description: "High-level flow from client invocation to stable command replies.",
          mermaid_code:
            "flowchart LR\n  Client[XDLQ subcommand] --> Parse[Argument parsing]\n  Parse --> Validate[Semantic validation]\n  Validate --> Dispatch[DLQ command helpers]\n  Dispatch --> Reply[Per-ID result objects / summary maps]",
          generated_at: "2026-04-14T10:05:15.000Z",
        },
      ],
    },
    {
      phase_id: "phase-1",
      name: "Command skeleton and parser wiring",
      description: "Wire the new command family into Redis command parsing and help surfaces.",
      summary:
        "Add top-level dispatch, syntax handling, help output, and enough parser scaffolding that the feature becomes discoverable and testable even before full DLQ state transitions are implemented.",
      dependencies: ["phase-0"],
      is_final: false,
      iteration: 1,
      plan_items: [
        {
          plan_item_id: "phase-1-parser",
          order: 1,
          title: "Add top-level `xdlqCommand` dispatch",
          description:
            "Route `XDLQ` subcommands through stream command code using the same validation and lookup conventions as other stream operations.",
          detailed_description:
            "Introduce a dispatcher in `src/t_stream.c`, validate arity and option ordering, share ID parsing helpers where possible, and keep command handling localized to avoid scattering the new feature across unrelated files.",
          dependencies: [DEMO_PLAN_ITEM_ID],
          status: "pending",
          created_at: "2026-04-14T10:05:18.000Z",
          file_changes: [
            { path: "src/t_stream.c", action: "modify", purpose: "Add top-level XDLQ dispatcher and argument parsing." },
            { path: "src/commands.def", action: "modify", purpose: "Register the new command family in the command table." },
          ],
          verification_criteria: [
            "Invalid subcommands and malformed IDs fail with deterministic syntax or semantic errors.",
            "Command docs and parser behavior remain aligned.",
          ],
        },
        {
          plan_item_id: "phase-1-validation-tests",
          order: 2,
          title: "Cover syntax and error handling with focused tests",
          description:
            "Add low-level validation coverage before the full lifecycle semantics are implemented.",
          detailed_description:
            "Use focused stream tests to cover missing keys/groups, repeated IDs, malformed option ordering, and wrong-type cases so the command surface becomes stable early in the rollout.",
          dependencies: ["phase-1-parser"],
          status: "pending",
          created_at: "2026-04-14T10:05:20.000Z",
          file_changes: [
            { path: "tests/unit/type/stream-dlq.tcl", action: "create", purpose: "Introduce focused DLQ lifecycle and validation tests." },
            { path: "src/commands.def", action: "modify", purpose: "Expose the full generated argument table and command metadata surface." },
          ],
          verification_criteria: [
            "Parser behavior is locked before internal state storage is added.",
          ],
        },
      ],
      diagrams: [],
    },
    {
      phase_id: "phase-2",
      name: "Consumer-group DLQ state model",
      description: "Add the internal metadata structures, ordered indexes, and cleanup hooks needed for real DLQ state.",
      summary:
        "Implement group-scoped DLQ storage so dead-lettered entries behave like quarantined stream work rather than ad hoc tags, including reason metadata, timestamps, replay counters, and cleanup on deletion or group teardown.",
      dependencies: ["phase-1"],
      is_final: false,
      iteration: 1,
      plan_items: [
        {
          plan_item_id: "phase-2-metadata",
          order: 1,
          title: "Introduce DLQ metadata structures and indexes",
          description:
            "Persist reason, consumer, delivery counters, moved-at timestamps, and replay accounting for each dead-lettered entry.",
          detailed_description:
            "Extend the consumer-group data model with `streamDlqEntry` metadata and ordered indexes that support cheap summary reads and bounded list iteration without requiring a separate DLQ stream key.",
          dependencies: ["phase-1-parser"],
          status: "pending",
          created_at: "2026-04-14T10:05:24.000Z",
          file_changes: [
            { path: "src/server.h", action: "modify", purpose: "Define DLQ entry and summary structures." },
            { path: "src/stream.h", action: "modify", purpose: "Add consumer-group DLQ record types and helper declarations." },
            { path: "src/t_stream.c", action: "modify", purpose: "Add group-level DLQ indexes and helper APIs." },
          ],
          verification_criteria: [
            "DLQ state survives normal stream operations and remains independent per consumer group.",
            "Entry deletion and group cleanup paths do not leak memory or leave invalid references.",
          ],
        },
        {
          plan_item_id: "phase-2-cleanup",
          order: 2,
          title: "Wire cleanup hooks for delete, ack, and teardown paths",
          description:
            "Ensure stale DLQ metadata cannot survive entry deletion, group destruction, or lifecycle transitions.",
          detailed_description:
            "Audit stream cleanup paths and add the minimal hooks necessary so replay, purge, deletion, and group destruction all keep ordered indexes and summary counters consistent.",
          dependencies: ["phase-2-metadata"],
          status: "pending",
          created_at: "2026-04-14T10:05:26.000Z",
          file_changes: [
            { path: "src/t_stream.c", action: "modify", purpose: "Clean up DLQ references in teardown and deletion paths." },
            { path: "tests/unit/type/stream-dlq.tcl", action: "modify", purpose: "Validate deletion, duplicate operations, and ownership edge cases." },
          ],
          verification_criteria: [
            "No stale DLQ references remain after entry deletion or consumer-group destruction.",
          ],
        },
      ],
      diagrams: [
        {
          diagram_id: "plan-phase-2-diagram",
          type: "mermaid",
          title: "DLQ state machine",
          description: "Entry transitions through active, quarantined, replayed, and purged states.",
          mermaid_code:
            "stateDiagram-v2\n  [*] --> Pending\n  Pending --> DeadLettered: XDLQ MOVE\n  DeadLettered --> Pending: XDLQ REPLAY\n  DeadLettered --> Purged: XDLQ PURGE\n  Pending --> Acked: XACK\n  Acked --> [*]",
          generated_at: "2026-04-14T10:05:28.000Z",
        },
      ],
    },
    {
      phase_id: "phase-3",
      name: "Workflow semantics and introspection",
      description: "Make the lifecycle visible and coherent across list/info, replay, and stream introspection paths.",
      summary:
        "Implement `MOVE`, `LIST`, `INFO`, `REPLAY`, and `PURGE` semantics end to end, then align `XNACK`, `XCLAIM`, and `XINFO STREAM FULL` so quarantine is explicit and observable through the actual touched Redis surfaces.",
      dependencies: ["phase-2"],
      is_final: false,
      iteration: 1,
      plan_items: [
        {
          plan_item_id: "phase-3-lifecycle",
          order: 1,
          title: "Implement move/list/info/replay/purge state transitions",
          description:
            "Make core DLQ commands functional using the new metadata model and per-ID result contracts.",
          detailed_description:
            "Implement the business logic for mutating and reading DLQ state, preserving original IDs, updating replay counters, and returning metadata-rich list/info results that operators can reason about quickly.",
          dependencies: ["phase-2-cleanup"],
          status: "pending",
          created_at: "2026-04-14T10:05:30.000Z",
          file_changes: [
            { path: "src/t_stream.c", action: "modify", purpose: "Implement MOVE/LIST/INFO/REPLAY/PURGE helpers." },
            { path: "tests/unit/type/stream-dlq.tcl", action: "modify", purpose: "Exercise lifecycle semantics and partial-status results." },
          ],
          verification_criteria: [
            "Replay restores entries to normal group processing with deterministic ownership semantics.",
            "`XDLQ LIST` returns bounded metadata-rich entry objects.",
          ],
        },
        {
          plan_item_id: "phase-3-introspection",
          order: 2,
          title: "Integrate DLQ with command tables, XNACK/XCLAIM, and XINFO",
          description:
            "Keep quarantined work out of normal claim flows while exposing summary visibility through introspection and generated command metadata.",
          detailed_description:
            "Update `XNACK` and `XCLAIM` behavior to skip DLQ entries, wire the full generated `commands.def` metadata for the container command, and extend `XINFO STREAM FULL` with DLQ summary fields per group.",
          dependencies: ["phase-3-lifecycle"],
          status: "pending",
          created_at: "2026-04-14T10:05:32.000Z",
          file_changes: [
            { path: "src/commands.def", action: "modify", purpose: "Register XDLQ subcommands and argument tables." },
            { path: "src/commands/xinfo-stream.json", action: "modify", purpose: "Add DLQ summary fields to group introspection docs." },
            { path: "src/t_stream.c", action: "modify", purpose: "Skip DLQ entries in XNACK/XCLAIM paths and extend XINFO FULL output." },
            { path: "tests/unit/type/stream-dlq.tcl", action: "modify", purpose: "Assert XINFO summary fields and replay/claim semantics." },
          ],
          verification_criteria: [
            "`XCLAIM` never reactivates DLQ entries implicitly.",
            "`XNACK` does not recreate transient nack state for already-quarantined entries.",
            "`XINFO STREAM FULL` exposes `dlq-count`, `first-dlq-id`, and `last-dlq-id`.",
          ],
        },
      ],
      diagrams: [
        {
          diagram_id: "plan-phase-3-diagram",
          type: "mermaid",
          title: "Operator workflow",
          description: "Operator-facing flow through move, inspect, replay, and purge.",
          mermaid_code:
            "flowchart TD\n  Pending[Pending entry in group PEL] --> Move[XDLQ MOVE]\n  Move --> Dlq[DLQ record with metadata]\n  Dlq --> Info[XDLQ INFO]\n  Dlq --> List[XDLQ LIST]\n  Dlq --> Replay[XDLQ REPLAY]\n  Dlq --> Purge[XDLQ PURGE]\n  Replay --> Active[Owned by replay target consumer]",
          generated_at: "2026-04-14T10:05:34.000Z",
        },
      ],
    },
    {
      phase_id: "phase-4",
      name: "Persistence and reload hardening",
      description: "Make sure DLQ state survives AOF and RDB boundaries correctly.",
      summary:
        "Validate that DLQ metadata, replay counts, and summaries remain correct across AOF rewrite, RDB reload, type versioning, and validation tooling without introducing fragile persistence behavior.",
      dependencies: ["phase-3"],
      is_final: false,
      iteration: 1,
      plan_items: [
        {
          plan_item_id: "phase-4-replication",
          order: 1,
          title: "Emit DLQ state safely during AOF rewrite",
          description:
            "Ensure rewritten AOF files reconstruct the same DLQ lifecycle and metadata as the in-memory stream state.",
          detailed_description:
            "Emit rewrite-only `XCLAIM ... FORCE` plus `XDLQ MOVE` commands so DLQ entries can be reconstructed with their metadata even though they are not resident in the normal PEL.",
          dependencies: ["phase-3-introspection"],
          status: "pending",
          created_at: "2026-04-14T10:05:36.000Z",
          file_changes: [
            { path: "src/aof.c", action: "modify", purpose: "Rewrite DLQ metadata as FORCE claim plus XDLQ MOVE." },
            { path: "src/t_stream.c", action: "modify", purpose: "Accept rewrite-oriented metadata tokens during MOVE/REPLAY flows." },
          ],
          verification_criteria: [
            "A rewritten AOF preserves DLQ membership and metadata fields exactly.",
          ],
        },
        {
          plan_item_id: "phase-4-persistence",
          order: 2,
          title: "Add RDB v6 persistence and validation-tool support",
          description:
            "Preserve DLQ metadata and cleanup behavior across new stream RDB encoding and validation tooling.",
          detailed_description:
            "Bump the stream object encoding to a new RDB type, persist consumer-group DLQ metadata after the nack zone, load it back safely, and update RDB validation code so the new stream type is recognized.",
          dependencies: ["phase-4-replication"],
          status: "pending",
          created_at: "2026-04-14T10:05:38.000Z",
          file_changes: [
            { path: "src/rdb.c", action: "modify", purpose: "Persist DLQ metadata if command replay alone is insufficient." },
            { path: "src/rdb.h", action: "modify", purpose: "Introduce the new stream-v6 RDB object type." },
            { path: "src/redis-check-rdb.c", action: "modify", purpose: "Teach the validation tool about stream-v6." },
            { path: "tests/unit/type/stream-dlq.tcl", action: "modify", purpose: "Cover reload and deleted-entry scenarios." },
          ],
          verification_criteria: [
            "Reload reconstructs the same DLQ state and summaries.",
            "The new stream RDB type is recognized by validation tooling and loaders.",
            "Deleting a stream entry while dead-lettered does not leave broken metadata after restart.",
          ],
        },
      ],
      diagrams: [],
    },
    {
      phase_id: "phase-5",
      name: "Documentation and generated metadata polish",
      description: "Finish command docs and generated metadata for a production-ready feature story.",
      summary:
        "Ship final command docs and generated metadata so the feature can be discovered and understood from `COMMAND DOCS`, `HELP`, and `XINFO STREAM FULL` output without relying on tribal knowledge.",
      dependencies: ["phase-4"],
      is_final: true,
      iteration: 1,
      plan_items: [
        {
          plan_item_id: "phase-5-docs",
          order: 1,
          title: "Document the fail-inspect-replay workflow",
          description:
            "Explain how DLQ differs from XNACK and how operators should move, inspect, replay, and purge entries.",
          detailed_description:
            "Complete the new `xdlq*.json` command files plus the generated `commands.def` surface so the operator workflow reads as a coherent Redis feature rather than a one-off implementation detail.",
          dependencies: ["phase-4-persistence"],
          status: "pending",
          created_at: "2026-04-14T10:05:40.000Z",
          file_changes: [
            { path: "src/commands/xdlq.json", action: "modify", purpose: "Finalize top-level docs and examples." },
            { path: "src/commands/xdlq-help.json", action: "modify", purpose: "Polish HELP output." },
            { path: "src/commands.def", action: "modify", purpose: "Keep generated command metadata in sync with JSON definitions." },
          ],
          verification_criteria: [
            "A user can discover and understand the feature from command docs alone.",
            "Generated command metadata stays aligned with the new XDLQ JSON files.",
          ],
        },
      ],
      diagrams: [],
    },
  ],
  current_phase_index: 0,
  validation_history: [
    {
      phase_id: "phase-0",
      validated_at: "2026-04-14T10:05:42.000Z",
      status: "approved",
      notes: "Semantics aligned with the implementation handoff: group-scoped DLQ, replay preserves IDs, and claim paths skip quarantined entries.",
    },
  ],
  is_complete: false,
  summary:
    "Ship Redis Streams DLQ support in six phases: design lock, parser skeleton, internal DLQ state, workflow semantics and introspection, persistence hardening, then documentation polish.",
  estimated_total_effort: "6 engineering phases across the exact Redis touchpoints: stream core, generated command tables, XINFO docs, AOF/RDB persistence, and focused stream DLQ tests",
};

const COMPLETED_LAYERS: TaskLayer[] = [
  {
    id: "layer-0",
    title: "Design lock and command contracts",
    status: "COMPLETED",
    layer_order: 0,
    tasks: [
      {
        id: "task-0-1",
        title: "Freeze XDLQ lifecycle semantics and reply shapes",
        file: "src/commands/xdlq.json",
        status: "COMPLETED",
        tests: { total: 2, passed: 2 },
        testCode: "redis-cli --json COMMAND DOCS XDLQ",
        testResults: [{ name: "command contract review", status: "PASSED" }],
        changes: [
          {
            path: "src/commands/xdlq.json",
            lang: "json",
            content: `{
  "XDLQ": {
    "summary": "Container command for Redis Streams dead-letter workflows",
    "group": "stream",
    "subcommands": ["MOVE", "LIST", "INFO", "REPLAY", "PURGE", "HELP"]
  }
}`,
          },
          {
            path: "src/commands/xdlq-help.json",
            lang: "json",
            content: `{
  "XDLQ|HELP": {
    "summary": "Show help for XDLQ subcommands and lifecycle semantics",
    "reply_schema": { "type": "array", "items": { "type": "string" } }
  }
}`,
          },
        ],
        logs: [
          "Locked the initial XDLQ scope to MOVE/LIST/INFO/REPLAY/PURGE/HELP",
          "Standardized mutating replies around per-ID result objects",
        ],
      },
    ],
  },
  {
    id: "layer-1",
    title: "Command surface and docs",
    status: "COMPLETED",
    layer_order: 1,
    tasks: [
      {
        id: "task-1-1",
        title: "Add XDLQ command metadata and subcommand docs",
        file: "src/commands/xdlq-move.json",
        status: "COMPLETED",
        tests: { total: 4, passed: 4 },
        testCode: "redis-cli --json COMMAND DOCS XDLQ XDLQ|MOVE XDLQ|LIST",
        testResults: [{ name: "command metadata", status: "PASSED" }],
        changes: [
          {
            path: "src/commands.def",
            lang: "c",
            content: `struct COMMAND_STRUCT XDLQ_Subcommands[] = {
    {MAKE_CMD("help", "...", "O(1)", "8.9.0", CMD_DOC_NONE, NULL, NULL, "stream", COMMAND_GROUP_STREAM, XDLQ_HELP_History, 0, XDLQ_HELP_Tips, 0, xdlqCommand, 2, CMD_LOADING|CMD_STALE, ACL_CATEGORY_STREAM, XDLQ_HELP_Keyspecs, 0, NULL, 0)},
    {MAKE_CMD("move", "...", "O(log N) per message ID", "8.9.0", CMD_DOC_NONE, NULL, NULL, "stream", COMMAND_GROUP_STREAM, XDLQ_MOVE_History, 0, XDLQ_MOVE_Tips, 0, xdlqCommand, -9, CMD_WRITE|CMD_FAST, ACL_CATEGORY_STREAM, XDLQ_MOVE_Keyspecs, 1, NULL, 13),.args=XDLQ_MOVE_Args},
    {0}
};`,
          },
          {
            path: "src/commands/xdlq-move.json",
            lang: "json",
            content: `{
  "XDLQ|MOVE": {
    "summary": "Move pending stream entries into consumer-group scoped DLQ state",
    "arguments": [
      { "name": "key", "type": "key" },
      { "name": "group", "type": "string" },
      { "name": "ids", "type": "block" },
      { "name": "reason", "type": "string" }
    ],
    "reply_schema": {
      "type": "array",
      "items": { "type": "map" }
    }
  }
}`,
          },
          {
            path: "src/commands/xdlq-list.json",
            lang: "json",
            content: `{
  "XDLQ|LIST": {
    "summary": "List dead-lettered entries and metadata",
    "reply_schema": {
      "type": "array",
      "items": {
        "type": "map"
      }
    }
  }
}`,
          },
        ],
        logs: [
          "Wired MOVE/LIST/INFO/REPLAY/PURGE into command docs",
          "Added RESP-stable per-ID status reply schema",
        ],
      },
      {
        id: "task-1-2",
        title: "Parse XDLQ subcommands in stream command path",
        file: "src/t_stream.c",
        status: "COMPLETED",
        tests: { total: 5, passed: 5 },
        testCode: "make test TESTS=tests/unit/type/stream-dlq.tcl",
        testResults: [{ name: "argument validation", status: "PASSED" }],
        changes: [
          {
            path: "src/t_stream.c",
            lang: "c",
            content: `void xdlqCommand(client *c) {
    if (!strcasecmp(c->argv[1]->ptr, "MOVE")) {
        streamDlqMoveCommand(c);
        return;
    }
    if (!strcasecmp(c->argv[1]->ptr, "LIST")) {
        streamDlqListCommand(c);
        return;
    }
    if (!strcasecmp(c->argv[1]->ptr, "INFO")) {
        streamDlqInfoCommand(c);
        return;
    }
    if (!strcasecmp(c->argv[1]->ptr, "REPLAY")) {
        streamDlqReplayCommand(c);
        return;
    }
    if (!strcasecmp(c->argv[1]->ptr, "PURGE")) {
        streamDlqPurgeCommand(c);
        return;
    }
    addReplyErrorObject(c, shared.syntaxerr);
}`,
          },
        ],
        logs: [
          "Added top-level XDLQ dispatcher",
          "Reused stream-group lookup and ID parsing helpers",
          "Aligned HELP and syntax validation with existing stream commands",
        ],
      },
    ],
  },
  {
    id: "layer-2",
    title: "DLQ state and replay semantics",
    status: "COMPLETED",
    layer_order: 2,
    tasks: [
      {
        id: "task-2-1",
        title: "Store DLQ metadata per consumer group",
        file: "src/stream.h",
        status: "COMPLETED",
        tests: { total: 3, passed: 3 },
        testCode: "valgrind --leak-check=full ./src/redis-server",
        testResults: [{ name: "memory cleanup", status: "PASSED" }],
        changes: [
          {
            path: "src/stream.h",
            lang: "c",
            content: `typedef struct streamDLQRec {
    sds reason;
    sds last_consumer;
    uint64_t delivery_count_at_move;
    mstime_t moved_at;
    uint64_t replay_count;
    mstime_t last_replayed_at;
    sds last_replay_consumer;
} streamDLQRec;`,
          },
          {
            path: "src/server.h",
            lang: "c",
            content: `void xdlqCommand(client *c);`,
          },
          {
            path: "src/t_stream.c",
            lang: "c",
            content: `static int streamGroupMoveToDlq(streamCG *group, streamNACK *nack,
        robj *reason, robj *consumer, uint64_t delivery_count) {
    /* persist metadata in a group-scoped ordered index */
    return C_OK;
}`,
          },
        ],
        logs: [
          "Added streamDLQRec metadata structure and streamCG.dlq state",
          "Introduced helper for MOVE / REPLAY lifecycle transitions",
          "Tracked replay audit fields and low-cost summary counters",
        ],
      },
      {
        id: "task-2-2",
        title: "Cover DLQ lifecycle in unit tests",
        file: "tests/unit/type/stream-dlq.tcl",
        status: "COMPLETED",
        tests: { total: 6, passed: 6 },
        testCode: "make test TESTS=tests/unit/type/stream-dlq.tcl",
        testResults: [{ name: "stream-dlq.tcl", status: "PASSED" }],
        changes: [
          {
            path: "tests/unit/type/stream-dlq.tcl",
            lang: "tcl",
            content: `test {xdlq move and replay workflow} {
    set id [r XADD jobs * job poison]
    r XGROUP CREATE jobs workers 0 MKSTREAM
    r XREADGROUP GROUP workers alice COUNT 1 STREAMS jobs >
    r XDLQ MOVE jobs workers IDS 1 $id REASON "schema mismatch"
    assert_equal 1 [dict get [r XDLQ INFO jobs workers] dlq-count]
}`,
          },
        ],
        logs: [
          "Added move/list/replay assertions",
          "Verified DLQ entries stay out of active XPENDING iteration",
          "Covered deleted-entry cleanup and duplicate move behavior",
        ],
      },
    ],
  },
  {
    id: "layer-3",
    title: "Introspection and stream command integration",
    status: "COMPLETED",
    layer_order: 3,
    tasks: [
      {
        id: "task-3-1",
        title: "Expose DLQ summary fields in stream introspection and command docs",
        file: "src/commands.def",
        status: "COMPLETED",
        tests: { total: 3, passed: 3 },
        testCode: "redis-cli --json COMMAND DOCS XINFO STREAM FULL",
        testResults: [{ name: "xinfo stream full", status: "PASSED" }],
        changes: [
          {
            path: "src/commands.def",
            lang: "c",
            content: `commandHistory XINFO_STREAM_History[] = {
    {"8.9.0","Added the dlq-count, first-dlq-id, and last-dlq-id fields to consumer groups in FULL output."},
};`,
          },
          {
            path: "src/commands/xinfo-stream.json",
            lang: "json",
            content: `{
  "XINFO|STREAM|FULL": {
    "group_fields": [
      "dlq-count",
      "first-dlq-id",
      "last-dlq-id",
      "replay-count-total"
    ]
  }
}`,
          },
        ],
        logs: [
          "Added DLQ summary fields to group introspection output",
          "Kept operator visibility lightweight and bounded",
        ],
      },
      {
        id: "task-3-2",
        title: "Keep XNACK, XCLAIM, and XINFO semantics coherent",
        file: "src/t_stream.c",
        status: "COMPLETED",
        tests: { total: 4, passed: 4 },
        testCode: "make test TESTS=tests/unit/type/stream-dlq.tcl",
        testResults: [{ name: "claim skip semantics", status: "PASSED" }],
        changes: [
          {
            path: "src/t_stream.c",
            lang: "c",
            content: `if (streamCGLookupDlq(group, buf, NULL))
    continue;

if (nack != NULL && streamCGLookupDlq(group, buf, NULL)) {
    /* Quarantined dead-letter entries are not claimable. */
    continue;
}`,
          },
        ],
        logs: [
          "Ensured XNACK does not recreate transient nack state for DLQ entries",
          "Ensured XCLAIM skips quarantined entries and XINFO FULL exposes DLQ summary fields",
        ],
      },
    ],
  },
  {
    id: "layer-4",
    title: "Persistence and reload hardening",
    status: "COMPLETED",
    layer_order: 4,
    tasks: [
      {
        id: "task-4-1",
        title: "Emit DLQ metadata during AOF rewrite",
        file: "src/aof.c",
        status: "COMPLETED",
        tests: { total: 3, passed: 3 },
        testCode: "redis-check-aof appendonly.aof",
        testResults: [{ name: "aof rewrite", status: "PASSED" }],
        changes: [
          {
            path: "src/aof.c",
            lang: "c",
            content: `static int rioWriteStreamDlqClaimForce(...) {
    /* DLQ IDs are not in the PEL; emit XCLAIM ... FORCE first. */
}

int rioWriteStreamDlqMove(...) {
    /* Emit XDLQ MOVE with full DLQ metadata. */
}`,
          },
        ],
        logs: [
          "Reconstructed DLQ records during AOF rewrite using XCLAIM FORCE plus XDLQ MOVE",
          "Preserved full metadata through rewrite paths",
        ],
      },
      {
        id: "task-4-2",
        title: "Add RDB v6 persistence and validation-tool support",
        file: "src/rdb.c",
        status: "COMPLETED",
        tests: { total: 3, passed: 3 },
        testCode: "redis-check-rdb dump.rdb",
        testResults: [{ name: "rdb v6 load", status: "PASSED" }],
        changes: [
          {
            path: "src/rdb.h",
            lang: "c",
            content: `#define RDB_TYPE_STREAM_LISTPACKS_6 28 /* Stream with XDLQ dead-letter metadata */`,
          },
          {
            path: "src/redis-check-rdb.c",
            lang: "c",
            content: `char *rdb_type_string[] = {
    /* ... */
    "stream-v6",
};`,
          },
        ],
        logs: [
          "Added RDB v6 stream persistence for consumer-group DLQ metadata",
          "Updated redis-check-rdb to recognize the new stream-v6 encoding",
        ],
      },
    ],
  },
  {
    id: "layer-5",
    title: "Documentation and release polish",
    status: "COMPLETED",
    layer_order: 5,
    tasks: [
      {
        id: "task-5-1",
        title: "Polish generated command metadata and XDLQ docs",
        file: "src/commands/xdlq-help.json",
        status: "COMPLETED",
        tests: { total: 2, passed: 2 },
        testCode: "redis-cli --json COMMAND DOCS XDLQ HELP",
        testResults: [{ name: "command docs review", status: "PASSED" }],
        changes: [
          {
            path: "src/commands/xdlq-help.json",
            lang: "json",
            content: `{
  "XDLQ|HELP": {
    "summary": "Returns helpful text about XDLQ subcommands.",
    "complexity": "O(1)"
  }
}`,
          },
        ],
        logs: [
          "Aligned the new xdlq*.json files with generated commands.def metadata",
          "Kept the operator story discoverable through HELP and COMMAND DOCS",
        ],
      },
    ],
  },
];

function getLayersForCurrentState(): TaskLayer[] {
  const state = getDerivedState();
  if (!state.codegenStarted) return [];

  if (state.codegenComplete) {
    return COMPLETED_LAYERS;
  }

  if (state.codegenStage < 0) {
    return [];
  }

  const activeLayerIndex = Math.min(
    Math.max(state.codegenStage, 0),
    COMPLETED_LAYERS.length - 1,
  );

  return COMPLETED_LAYERS.map((layer, layerIndex) => {
    if (layerIndex < activeLayerIndex) {
      return { ...layer, status: "COMPLETED" };
    }

    if (layerIndex === activeLayerIndex) {
      return {
        ...layer,
        status: "IN_PROGRESS",
        tasks: layer.tasks.map((task, taskIndex) =>
          taskIndex === 0
            ? { ...task, status: "COMPLETED" }
            : {
                ...task,
                status: "IN_PROGRESS",
                changes: [],
                logs: [
                  "Updating XPENDING, XCLAIM, and XAUTOCLAIM semantics...",
                  "Adding XINFO STREAM FULL DLQ summary fields...",
                ],
              },
        ),
      };
    }

    return {
      ...layer,
      status: "PENDING",
      tasks: layer.tasks.map((task) => ({
        ...task,
        status: "PENDING",
        changes: [],
        logs: ["Queued behind the active implementation layer."],
      })),
    };
  });
}

export function getDemoQuestionsResponse(): RecipeQuestionsResponse {
  const state = getDerivedState();
  if (!state.questionsGenerated) {
    return {
      recipe_id: DEMO_RECIPE_ID,
      generation_status: "processing",
      generated_at: null,
      error_message: null,
      run_id: DEMO_QUESTION_RUN_ID,
      questions: [],
    };
  }
  return {
    ...DEMO_QUESTIONS,
    run_id: null,
  };
}

export function submitDemoAnswers(): SubmitRecipeAnswersResponse {
  updateState((current) => ({ ...current, answersSubmitted: true }));
  return {
    message: "Answers accepted for Redis DLQ demo recipe.",
    recipe_id: DEMO_RECIPE_ID,
    new_status: "ANSWERS_SUBMITTED",
  };
}

export function startDemoSpecGeneration(): TriggerSpecGenerationResponse {
  updateState((current) => ({
    ...current,
    answersSubmitted: true,
    specStarted: true,
    specComplete: false,
  }));
  return {
    recipe_id: DEMO_RECIPE_ID,
    status: "accepted",
    created_at: new Date().toISOString(),
  };
}

export function getDemoSpecStatus(): SpecStatusResponse {
  const state = getDerivedState();
  return {
    recipe_id: DEMO_RECIPE_ID,
    generation_status: !state.specStarted
      ? "not_started"
      : state.specComplete
        ? "completed"
        : "processing",
    specification: state.specComplete ? DEMO_SPECIFICATION : null,
    generated_at: state.specComplete ? "2026-04-14T10:06:12.000Z" : null,
    error_message: null,
    run_id: state.specStarted && !state.specComplete ? DEMO_SPEC_RUN_ID : null,
  };
}

export function getDemoSpecChatResponse(message: string): SpecChatResponse {
  const lower = message.toLowerCase();
  const specOutput: SpecificationOutput = {
    ...DEMO_SPECIFICATION,
    tl_dr: lower.includes("observability")
      ? `${DEMO_SPECIFICATION.tl_dr} Add an explicit observability emphasis for operator-facing summaries and replay audits.`
      : DEMO_SPECIFICATION.tl_dr,
  };

  return {
    intent: "modify",
    message:
      "Updated the specification to emphasize the demo narrative around quarantine visibility, replay safety, and operator observability.",
    explanation:
      "Updated the specification to emphasize the demo narrative around quarantine visibility, replay safety, and operator observability.",
    spec_output: specOutput as unknown as SpecChatResponse["spec_output"],
    undo_token: "",
    next_actions: ["Review the revised summary", "Generate the plan"],
    regenerate_triggered: false,
  };
}

export function startDemoPlanGeneration() {
  updateState((current) => ({
    ...current,
    planStarted: true,
    planComplete: false,
  }));
  return {
    recipe_id: DEMO_RECIPE_ID,
    status: "accepted",
    created_at: new Date().toISOString(),
  };
}

export function getDemoPlanStatus(): PlanStatusResponse {
  const state = getDerivedState();
  return {
    recipe_id: DEMO_RECIPE_ID,
    generation_status: !state.planStarted
      ? "not_started"
      : state.planComplete
        ? "completed"
        : "processing",
    plan: state.planComplete ? DEMO_PLAN : null,
    generated_at: state.planComplete ? "2026-04-14T10:07:20.000Z" : null,
    error_message: null,
    run_id: state.planStarted && !state.planComplete ? DEMO_PLAN_RUN_ID : null,
  };
}

export function getDemoPlanChatResponse(_message: string): PlanChatResponse {
  return {
    intent: "clarify",
    message:
      "Expanded the rollout into six production-style phases so the plan now reads like a real Redis feature delivery: design lock, parser skeleton, DLQ internals, workflow integration, persistence hardening, and release polish.",
    explanation:
      "Expanded the rollout into six production-style phases so the plan now reads like a real Redis feature delivery: design lock, parser skeleton, DLQ internals, workflow integration, persistence hardening, and release polish.",
    plan_output: DEMO_PLAN as unknown as Record<string, unknown>,
    undo_token: "",
    next_actions: ["Review phase dependencies", "Start implementation for phase 0"],
  };
}

export function submitDemoTaskSplitting(): SubmitTaskSplittingResponse {
  updateState((current) => ({
    ...current,
    codegenStarted: true,
    codegenComplete: false,
    codegenStage: -1,
  }));
  return {
    task_splitting_id: DEMO_TASK_SPLITTING_ID,
    status: "SUBMITTED",
    message: "Demo code generation queued successfully.",
  };
}

export function getDemoTaskSplittingStatus(): TaskSplittingStatusResponse {
  const state = getDerivedState();
  const codegenStatus = !state.codegenStarted
    ? "PENDING"
    : state.codegenComplete
      ? "COMPLETED"
      : "IN_PROGRESS";
  const prStatus = !state.prStarted
    ? "NOT_STARTED"
    : state.prComplete
      ? "COMPLETED"
      : "IN_PROGRESS";

  return {
    task_splitting_id: DEMO_TASK_SPLITTING_ID,
    status: state.codegenStarted
      ? state.codegenComplete
        ? "COMPLETED"
        : "IN_PROGRESS"
      : "SUBMITTED",
    current_step: state.codegenComplete
      ? COMPLETED_LAYERS.length - 1
      : Math.max(Math.min(state.codegenStage, COMPLETED_LAYERS.length - 1), 0),
    codegen_status: codegenStatus,
    error_message: null,
    pr_status: prStatus,
    pr_error_message: null,
    pr_url: state.prComplete ? DEMO_PR_URL : null,
    branch_name: "stream-dlq-demo",
    base_branch: "unstable",
    head_sha: "d34db33fdlqdemo",
    pr_number: state.prComplete ? 8 : null,
    agent_activity: state.codegenStarted
      ? [
          {
            tool: "read",
            params: { path: "STREAM_DLQ_IMPLEMENTATION_PLAN.md" },
            phase: 0,
            task: 0,
          },
          {
            tool: "edit",
            params: { path: "src/t_stream.c", action: "wire xdlq parsing" },
            phase: 1,
            task: 1,
          },
          {
            tool: "test",
            params: { command: "make test TESTS=tests/unit/type/stream-dlq.tcl" },
            phase: 2,
            task: 1,
          },
          {
            tool: "edit",
            params: { path: "src/commands/xinfo-stream.json", action: "add dlq summary fields" },
            phase: 3,
            task: 0,
          },
          {
            tool: "test",
            params: { command: "make test TESTS=tests/integration/replication.tcl" },
            phase: 4,
            task: 0,
          },
        ]
      : [],
  };
}

export function getDemoTaskSplittingItems(): TaskSplittingItemsResponse {
  return {
    task_splitting_id: DEMO_TASK_SPLITTING_ID,
    layers: getLayersForCurrentState(),
    next_layer_order: null,
  };
}

export function createDemoPullRequest(): CreatePullRequestResponse {
  if (demoPrTimer !== null) {
    window.clearTimeout(demoPrTimer);
  }
  updateState((current) => ({
    ...current,
    prStarted: true,
    prComplete: false,
  }));
  demoPrTimer = window.setTimeout(() => {
    updateState((current) => ({
      ...current,
      prStarted: true,
      prComplete: true,
    }));
    demoPrTimer = null;
  }, 10_000);
  return {
    task_splitting_id: DEMO_TASK_SPLITTING_ID,
    status: "IN_PROGRESS",
    message: "Creating pull request for Redis DLQ demo branch.",
    pr_url: null,
  };
}

export function getDemoConversationMessages(): LoadedMessage[] {
  return [
    {
      id: "demo-msg-1",
      text:
        "Walk me through the Redis DLQ implementation. I want to understand why this is modeled inside the consumer group instead of as a side stream.",
      sender: "user",
      citations: [],
      has_attachments: false,
      attachments: [],
      tool_calls: null,
      thinking: null,
    },
    {
      id: "demo-msg-2",
      text:
        "The implementation keeps DLQ state scoped to the consumer group so dead-lettering remains a property of how a specific group failed to process a message. That lets Redis preserve stream IDs, keep replay explicit, and avoid broadening the keyspace with a second stream just for quarantine bookkeeping.",
      sender: "agent",
      citations: [],
      has_attachments: false,
      attachments: [],
      tool_calls: [
        {
          call_id: "demo-tool-1",
          event_type: "call",
          tool_name: "ReadFile",
          tool_response: "",
          tool_call_details: {
            summary: "Read Redis DLQ handoff plan",
          },
          stream_part: null,
          is_complete: true,
        },
        {
          call_id: "demo-tool-1",
          event_type: "result",
          tool_name: "ReadFile",
          tool_response:
            "Captured the recommended group-scoped DLQ model, replay semantics, and interactions with XPENDING/XCLAIM/XAUTOCLAIM.",
          tool_call_details: {
            summary: "Extracted core DLQ semantics",
          },
          stream_part: null,
          is_complete: true,
        },
      ],
      thinking:
        "I should anchor the explanation in the design tradeoff from the implementation plan: native Redis feel, lower-risk persistence, and explicit replay semantics.",
    },
  ];
}

const DEMO_CHAT_REPLY =
  "For the Redis DLQ demo, the mocked patch keeps dead-letter state scoped to the consumer group, gives operators explicit `MOVE`, `LIST`, `INFO`, `REPLAY`, and `PURGE` flows, keeps quarantined entries out of normal claim and pending paths, and preserves replay semantics so a fixed worker can safely reactivate messages without losing auditability.";

export function createDemoConversation() {
  return { conversation_id: DEMO_CONVERSATION_ID };
}

export function streamDemoConversationReply(
  onMessageUpdate: (
    message: string,
    tool_calls: any[],
    citations: string[],
    thinking?: string | null,
  ) => void,
): Promise<{ message: string; citations: string[]; sessionId: string }> {
  return new Promise((resolve) => {
    const chunks = [
      DEMO_CHAT_REPLY.slice(0, 88),
      DEMO_CHAT_REPLY.slice(88, 178),
      DEMO_CHAT_REPLY.slice(178),
    ];
    let current = "";
    chunks.forEach((chunk, index) => {
      window.setTimeout(() => {
        current += chunk;
        onMessageUpdate(current, [], []);
        if (index === chunks.length - 1) {
          resolve({
            message: current,
            citations: [],
            sessionId: "demo-session",
          });
        }
      }, 280 * (index + 1));
    });
  });
}

function runStreamSequence(
  events: DemoStreamEvent[],
  options: {
    signal?: AbortSignal;
    onEvent?: (eventType: string, data: Record<string, unknown>) => void;
    onError?: (error: string) => void;
  },
  onComplete?: () => void,
) {
  const timers: number[] = [];
  let stopped = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    timers.forEach((timer) => window.clearTimeout(timer));
  };

  if (options.signal) {
    if (options.signal.aborted) return;
    options.signal.addEventListener("abort", stop, { once: true });
  }

  events.forEach(({ delay, eventType, data }) => {
    const timer = window.setTimeout(() => {
      if (stopped) return;
      try {
        if (eventType === "state_update") {
          updateState((current) => ({
            ...current,
            ...((data ?? {}) as Partial<DemoState>),
          }));
          return;
        }
        if (eventType === "end") {
          onComplete?.();
        }
        options.onEvent?.(eventType, data ?? {});
        if (eventType === "end") {
          stop();
        }
      } catch (error) {
        options.onError?.(error instanceof Error ? error.message : String(error));
        stop();
      }
    }, delay);
    timers.push(timer);
  });
}

export function connectDemoSpecStream(options: {
  signal?: AbortSignal;
  onEvent?: (eventType: string, data: Record<string, unknown>) => void;
  onError?: (error: string) => void;
}) {
  runStreamSequence(
    [
      { delay: 80, eventType: "queued", data: { message: "Queued Redis DLQ spec generation" } },
      { delay: 340, eventType: "start", data: { message: "Analyzing feature handoff" } },
      { delay: 900, eventType: "progress", data: { step: "Research", message: "Reading the Redis DLQ implementation plan and extracting operator workflows, edge cases, and file impact." } },
      { delay: 1280, eventType: "tool_call_start", data: { tool: "read_files", call_id: "spec-read-batch-1" } },
      { delay: 1360, eventType: "tool_call_start", data: { tool: "read_files", call_id: "spec-read-batch-2" } },
      { delay: 1440, eventType: "tool_call_start", data: { tool: "read_files", call_id: "spec-read-batch-3" } },
      { delay: 2400, eventType: "tool_call_end", data: { tool: "read_files", call_id: "spec-read-batch-1", result: "Read `STREAM_DLQ_IMPLEMENTATION_PLAN.md`, `src/t_stream.c`, and `src/stream.h` to ground the spec in real command and consumer-group semantics." } },
      { delay: 2520, eventType: "tool_call_end", data: { tool: "read_files", call_id: "spec-read-batch-2", result: "Read `src/commands.def`, `src/commands/xdlq*.json`, and `src/commands/xinfo-stream.json` to align command contracts, help text, and introspection language." } },
      { delay: 2640, eventType: "tool_call_end", data: { tool: "read_files", call_id: "spec-read-batch-3", result: "Read `tests/unit/type/stream-dlq.tcl`, `src/aof.c`, and `src/rdb.c` to pull lifecycle validation and persistence constraints into the handoff." } },
      { delay: 3120, eventType: "tool_call_start", data: { tool: "ask_knowledge_graph_queries", call_id: "spec-kg-1" } },
      { delay: 4020, eventType: "tool_call_end", data: { tool: "ask_knowledge_graph_queries", call_id: "spec-kg-1", result: "Cross-linked consumer-group state, quarantine semantics, and replay behavior to confirm DLQ should remain group-scoped and explicit." } },
      { delay: 4500, eventType: "chunk", data: { content: "Thinking through the Redis DLQ feature as a spec handoff, not just a feature summary.\n\nI’m first locking the operator story: fail -> quarantine -> inspect -> replay -> purge, while preserving native Streams semantics and keeping the design scoped to the consumer group." } },
      { delay: 5880, eventType: "progress", data: { step: "Structuring", message: "Converting the workflow into detailed functional requirements, non-functional guardrails, data models, and interface contracts." } },
      { delay: 6240, eventType: "tool_call_start", data: { tool: "read_files", call_id: "spec-read-batch-4" } },
      { delay: 7180, eventType: "tool_call_end", data: { tool: "read_files", call_id: "spec-read-batch-4", result: "Re-read persistence and test touchpoints to expand file impact, acceptance criteria, and operator-facing observability expectations." } },
      { delay: 7580, eventType: "chunk", data: { content: "\nNow I’m translating that into requirements for command parsing, DLQ metadata storage, replay semantics, claim-path behavior, XINFO visibility, and persistence correctness across AOF/RDB boundaries." } },
      { delay: 9000, eventType: "progress", data: { step: "Reasoning", message: "Reviewing tradeoffs and simplifying the v1 scope so the spec still feels production-ready without overreaching." } },
      { delay: 9340, eventType: "tool_call_start", data: { tool: "ask_knowledge_graph_queries", call_id: "spec-kg-2" } },
      { delay: 10180, eventType: "tool_call_end", data: { tool: "ask_knowledge_graph_queries", call_id: "spec-kg-2", result: "Validated that threshold automation, side-stream routing, and unbounded metadata scans should remain out of scope for the first release." } },
      { delay: 10620, eventType: "chunk", data: { content: "\nThe final pass is polishing success metrics, keeping reply shapes deterministic, and making the spec read like a handoff an engineer could pick up without additional clarifications." } },
      { delay: 11620, eventType: "progress", data: { step: "Polish", message: "Expanding the file impact and operator-facing acceptance criteria so the spec reads like a production handoff." } },
      { delay: 12480, eventType: "end", data: { message: "Spec generation complete" } },
    ],
    options,
    () => {
      updateState((current) => ({
        ...current,
        answersSubmitted: true,
        specStarted: true,
        specComplete: true,
      }));
    },
  );
}

export function connectDemoQuestionsStream(options: {
  signal?: AbortSignal;
  onEvent?: (eventType: string, data: Record<string, unknown>) => void;
  onError?: (error: string) => void;
}) {
  runStreamSequence(
    [
      { delay: 80, eventType: "queued", data: { message: "Queued clarifying question generation" } },
      { delay: 320, eventType: "start", data: { message: "Understanding the Redis Streams feature request" } },
      { delay: 900, eventType: "progress", data: { step: "Context", message: "Scanning the handoff, stream internals, and prior Redis command patterns before drafting the QnA set." } },
      { delay: 1260, eventType: "tool_call_start", data: { tool: "read_files", call_id: "qna-read-batch-1" } },
      { delay: 1340, eventType: "tool_call_start", data: { tool: "read_files", call_id: "qna-read-batch-2" } },
      { delay: 1420, eventType: "tool_call_start", data: { tool: "read_files", call_id: "qna-read-batch-3" } },
      { delay: 2380, eventType: "tool_call_end", data: { tool: "read_files", call_id: "qna-read-batch-1", result: "Read `STREAM_DLQ_IMPLEMENTATION_PLAN.md`, `src/t_stream.c`, and `tests/unit/type/stream-dlq.tcl` in parallel to extract lifecycle semantics, parser touchpoints, and operator-facing edge cases." } },
      { delay: 2500, eventType: "tool_call_end", data: { tool: "read_files", call_id: "qna-read-batch-2", result: "Read `src/commands/xdlq-move.json`, `src/commands/xdlq-replay.json`, and `src/commands/xinfo-stream.json` to align question wording with the planned command docs and introspection surface." } },
      { delay: 2620, eventType: "tool_call_end", data: { tool: "read_files", call_id: "qna-read-batch-3", result: "Read `src/aof.c`, `src/rdb.c`, and `src/redis-check-rdb.c` to understand persistence constraints that should influence default answers." } },
      { delay: 3160, eventType: "tool_call_start", data: { tool: "ask_knowledge_graph_queries", call_id: "qna-kg-1" } },
      { delay: 4060, eventType: "tool_call_end", data: { tool: "ask_knowledge_graph_queries", call_id: "qna-kg-1", result: "Cross-referenced stream consumer-group structures, pending-entry flows, and claim semantics to confirm DLQ should stay group-scoped and out of normal XPENDING/XCLAIM behavior." } },
      { delay: 4520, eventType: "chunk", data: { content: "Thinking through the smallest useful set of clarifying questions for the Redis DLQ rollout.\n\nI want the QnA step to feel purposeful, so I’m filtering for only the decisions that materially change command scope, metadata visibility, and replay semantics." } },
      { delay: 5980, eventType: "progress", data: { step: "Drafting", message: "Locking only the questions that materially affect command scope, metadata visibility, and replay semantics." } },
      { delay: 6340, eventType: "tool_call_start", data: { tool: "read_files", call_id: "qna-read-batch-4" } },
      { delay: 7260, eventType: "tool_call_end", data: { tool: "read_files", call_id: "qna-read-batch-4", result: "Revisited docs, persistence, and lifecycle tests to make sure the default answers match the eventual plan and implementation story." } },
      { delay: 7640, eventType: "tool_call_start", data: { tool: "ask_knowledge_graph_queries", call_id: "qna-kg-2" } },
      { delay: 8500, eventType: "tool_call_end", data: { tool: "ask_knowledge_graph_queries", call_id: "qna-kg-2", result: "Validated that `PURGE` belongs in the first demo cut and that replay should preserve original IDs while remaining explicit." } },
      { delay: 8920, eventType: "tool_call_start", data: { tool: "bash", call_id: "qna-bash-1" } },
      { delay: 10620, eventType: "tool_call_end", data: { tool: "bash", call_id: "qna-bash-1", result: "Executed `git diff unstable...stream-dlq-demo -- src/t_stream.c src/commands/*.json tests/unit/type/stream-dlq.tcl src/aof.c src/rdb.c src/redis-check-rdb.c && python scripts/summarize_stream_changes.py --include-dlq --include-persistence --format markdown` to verify the touched files and keep the recommended answers consistent with the intended patch footprint." } },
      { delay: 11040, eventType: "chunk", data: { content: "\nThe result is a short QnA set that still feels real: one question for feature scope, one for how DLQ affects `XPENDING`, one for what metadata must be visible, and one open-ended constraint that anchors the implementation to native Streams semantics." } },
      { delay: 12420, eventType: "progress", data: { step: "Finalizing", message: "Marking recommendation-backed answers as the initial state and packaging the stream payload for the QnA screen." } },
      { delay: 13280, eventType: "chunk", data: { content: "\nPrepared four focused questions with default answers already selected so the review can move straight to spec generation." } },
      { delay: 14240, eventType: "end", data: { message: "Questions ready" } },
    ],
    options,
    () => {
      updateState((current) => ({
        ...current,
        questionsGenerated: true,
      }));
    },
  );
}

export function connectDemoPlanStream(options: {
  signal?: AbortSignal;
  onEvent?: (eventType: string, data: Record<string, unknown>) => void;
  onError?: (error: string) => void;
}) {
  runStreamSequence(
    [
      { delay: 80, eventType: "queued", data: { message: "Queued implementation planning" } },
      { delay: 360, eventType: "start", data: { message: "Building phased execution plan" } },
      { delay: 980, eventType: "progress", data: { step: "Research", message: "Re-reading the spec, QnA decisions, and touched Redis surfaces before sequencing the rollout." } },
      { delay: 1320, eventType: "tool_call_start", data: { tool: "read_files", call_id: "plan-read-batch-1" } },
      { delay: 1400, eventType: "tool_call_start", data: { tool: "read_files", call_id: "plan-read-batch-2" } },
      { delay: 1480, eventType: "tool_call_start", data: { tool: "read_files", call_id: "plan-read-batch-3" } },
      { delay: 2560, eventType: "tool_call_end", data: { tool: "read_files", call_id: "plan-read-batch-1", result: "Read `STREAM_DLQ_IMPLEMENTATION_PLAN.md`, `src/t_stream.c`, and `src/commands.def` in parallel to anchor the rollout in the actual command parser and generated command-table touchpoints." } },
      { delay: 2680, eventType: "tool_call_end", data: { tool: "read_files", call_id: "plan-read-batch-2", result: "Read `src/stream.h`, `src/aof.c`, `src/rdb.c`, and `src/redis-check-rdb.c` to separate core state-model work from later persistence hardening." } },
      { delay: 2800, eventType: "tool_call_end", data: { tool: "read_files", call_id: "plan-read-batch-3", result: "Read `src/commands/xdlq-*.json`, `src/commands/xinfo-stream.json`, and `tests/unit/type/stream-dlq.tcl` to connect docs, introspection, and validation coverage to each phase." } },
      { delay: 3360, eventType: "tool_call_start", data: { tool: "ask_knowledge_graph_queries", call_id: "plan-kg-1" } },
      { delay: 4340, eventType: "tool_call_end", data: { tool: "ask_knowledge_graph_queries", call_id: "plan-kg-1", result: "Mapped dependencies between consumer-group state, claim semantics, persistence encoding, and generated command metadata so the plan can build from contract -> parser -> state -> workflow -> persistence -> docs." } },
      { delay: 4860, eventType: "chunk", data: { content: "Planning the Redis DLQ rollout as a production-style sequence instead of a flat checklist.\n\nFirst, I’m separating design commitments from implementation so the command family, reply shapes, and quarantine semantics are locked before stream internals start changing." } },
      { delay: 6620, eventType: "progress", data: { step: "Phase 1", message: "Drafting phase 0: design lock and command contract." } },
      { delay: 7000, eventType: "tool_call_start", data: { tool: "phase_builder", call_id: "plan-phase-0" } },
      { delay: 8200, eventType: "tool_call_end", data: { tool: "phase_builder", call_id: "plan-phase-0", result: "Phase 0 drafted around `XDLQ` surface lock, help/docs contract, per-ID result schemas, and parser-local command dispatch preparation." } },
      { delay: 8620, eventType: "chunk", data: { content: "\nPhase 1 is the design lock: freeze `MOVE`, `LIST`, `INFO`, `REPLAY`, `PURGE`, and `HELP`; define per-ID mutating replies; and make sure the feature story reads consistently in command docs, tests, and parser behavior." } },
      { delay: 10440, eventType: "progress", data: { step: "Phase 2", message: "Drafting parser wiring and early validation before internal state changes." } },
      { delay: 10840, eventType: "tool_call_start", data: { tool: "bash", call_id: "plan-bash-1" } },
      { delay: 12680, eventType: "tool_call_end", data: { tool: "bash", call_id: "plan-bash-1", result: "Executed `git diff unstable...stream-dlq-demo -- src/t_stream.c src/commands.def src/commands/xdlq*.json tests/unit/type/stream-dlq.tcl src/aof.c src/rdb.c src/redis-check-rdb.c && python scripts/summarize_stream_changes.py --group-by-phase --include-docs --include-tests --include-persistence` to verify that parser work should be isolated before DLQ state and reload logic." } },
      { delay: 13120, eventType: "tool_call_start", data: { tool: "phase_builder", call_id: "plan-phase-1" } },
      { delay: 14240, eventType: "tool_call_end", data: { tool: "phase_builder", call_id: "plan-phase-1", result: "Phase 1 drafted around top-level `xdlqCommand` dispatch, command-table registration, and focused syntax/error-path tests." } },
      { delay: 14640, eventType: "chunk", data: { content: "\nPhase 2 is parser wiring: make the command family real and discoverable, add low-level validation, and lock syntax behavior before deeper stream state is introduced." } },
      { delay: 16240, eventType: "progress", data: { step: "Phase 3", message: "Sequencing consumer-group DLQ metadata and cleanup hooks." } },
      { delay: 16600, eventType: "tool_call_start", data: { tool: "ask_knowledge_graph_queries", call_id: "plan-kg-2" } },
      { delay: 17660, eventType: "tool_call_end", data: { tool: "ask_knowledge_graph_queries", call_id: "plan-kg-2", result: "Confirmed that stale-reference cleanup, replay accounting, and per-group ordering indexes belong in the internal state phase before claim/introspection integration." } },
      { delay: 18120, eventType: "tool_call_start", data: { tool: "phase_builder", call_id: "plan-phase-2" } },
      { delay: 19280, eventType: "tool_call_end", data: { tool: "phase_builder", call_id: "plan-phase-2", result: "Phase 2 drafted around `streamDlqEntry` metadata, group-scoped indexes, replay counters, and deletion/teardown cleanup hooks." } },
      { delay: 19700, eventType: "chunk", data: { content: "\nPhase 3 becomes the DLQ state-model phase: extend consumer groups with DLQ metadata, wire cleanup into deletion and teardown paths, and make summary reads cheap enough for production introspection." } },
      { delay: 21380, eventType: "progress", data: { step: "Phase 4", message: "Grouping lifecycle commands with introspection and claim-path semantics." } },
      { delay: 21760, eventType: "tool_call_start", data: { tool: "phase_builder", call_id: "plan-phase-3" } },
      { delay: 22920, eventType: "tool_call_end", data: { tool: "phase_builder", call_id: "plan-phase-3", result: "Phase 3 drafted around MOVE/LIST/INFO/REPLAY/PURGE behavior, XNACK/XCLAIM skip semantics, and `XINFO STREAM FULL` summary exposure." } },
      { delay: 23340, eventType: "chunk", data: { content: "\nPhase 4 is workflow integration: activate the full DLQ lifecycle, keep quarantined entries out of normal claim paths, and expose summary visibility through `XDLQ INFO` and `XINFO STREAM FULL`." } },
      { delay: 24980, eventType: "progress", data: { step: "Phase 5", message: "Deferring replication and reload correctness into dedicated persistence hardening." } },
      { delay: 25360, eventType: "tool_call_start", data: { tool: "phase_builder", call_id: "plan-phase-4" } },
      { delay: 26480, eventType: "tool_call_end", data: { tool: "phase_builder", call_id: "plan-phase-4", result: "Phase 4 drafted around AOF rewrite reconstruction, stream-v6 RDB encoding, validation-tool compatibility, and deleted-entry reload scenarios." } },
      { delay: 26920, eventType: "tool_call_start", data: { tool: "read_files", call_id: "plan-read-batch-4" } },
      { delay: 27920, eventType: "tool_call_end", data: { tool: "read_files", call_id: "plan-read-batch-4", result: "Re-read persistence and validation files to keep the persistence-hardening phase concrete and scoped to actual Redis touchpoints." } },
      { delay: 28320, eventType: "chunk", data: { content: "\nPhase 5 is persistence hardening: teach AOF rewrite and RDB reload how to preserve DLQ metadata faithfully, then validate that deleted entries and partial lifecycle states remain coherent after restart." } },
      { delay: 29980, eventType: "progress", data: { step: "Phase 6", message: "Finishing with docs and generated metadata polish once behavior is stable." } },
      { delay: 30340, eventType: "tool_call_start", data: { tool: "phase_builder", call_id: "plan-phase-5" } },
      { delay: 31420, eventType: "tool_call_end", data: { tool: "phase_builder", call_id: "plan-phase-5", result: "Phase 5 drafted around final `xdlq*.json` docs, HELP polish, and keeping generated command metadata aligned with the shipped command family." } },
      { delay: 31840, eventType: "tool_call_start", data: { tool: "bash", call_id: "plan-bash-2" } },
      { delay: 33340, eventType: "tool_call_end", data: { tool: "bash", call_id: "plan-bash-2", result: "Executed `python scripts/plan_dependency_check.py --feature stream-dlq --validate-order --emit-mermaid && git diff --stat unstable...stream-dlq-demo` to verify the six-phase ordering and diagram support against the actual file-change footprint." } },
      { delay: 33820, eventType: "chunk", data: { content: "\nPhase 6 is release polish: finish command docs, align generated metadata, and make the fail -> inspect -> replay -> purge story discoverable without relying on implementation context.\n\nI’m now attaching verification criteria, file-change callouts, and diagrams so each phase reads like a handoff an engineer could execute sequentially." } },
      { delay: 35620, eventType: "progress", data: { step: "Finalizing", message: "Assembling the six phases, per-phase plan items, diagrams, dependencies, and verification criteria into the final phased plan." } },
      { delay: 36800, eventType: "end", data: { message: "Plan generation complete" } },
    ],
    options,
    () => {
      updateState((current) => ({
        ...current,
        planStarted: true,
        planComplete: true,
      }));
    },
  );
}

export function connectDemoCodegenStream(options: {
  signal?: AbortSignal;
  onEvent?: (eventType: string, data: Record<string, unknown>) => void;
  onError?: (error: string) => void;
}) {
  runStreamSequence(
    [
      { delay: 120, eventType: "queued", data: { message: "Queued implementation execution" } },
      { delay: 360, eventType: "start", data: { message: "Preparing layered Redis DLQ code generation" } },
      { delay: 920, eventType: "progress", data: { step: "Research", message: "Loading the approved plan, Redis stream internals, command metadata, persistence touchpoints, and focused tests before editing." } },
      { delay: 1260, eventType: "tool_call_start", data: { tool: "read_files", call_id: "codegen-read-batch-1" } },
      { delay: 1340, eventType: "tool_call_start", data: { tool: "read_files", call_id: "codegen-read-batch-2" } },
      { delay: 1420, eventType: "tool_call_start", data: { tool: "read_files", call_id: "codegen-read-batch-3" } },
      { delay: 2540, eventType: "tool_call_end", data: { tool: "read_files", call_id: "codegen-read-batch-1", result: "Read `src/t_stream.c`, `src/stream.h`, and `src/server.h` in parallel to wire command dispatch, DLQ metadata records, and helper declarations." } },
      { delay: 2660, eventType: "tool_call_end", data: { tool: "read_files", call_id: "codegen-read-batch-2", result: "Read `src/commands.def`, `src/commands/xdlq*.json`, and `src/commands/xinfo-stream.json` to keep generated command metadata aligned with the shipped command family." } },
      { delay: 2780, eventType: "tool_call_end", data: { tool: "read_files", call_id: "codegen-read-batch-3", result: "Read `tests/unit/type/stream-dlq.tcl`, `src/aof.c`, `src/rdb.c`, and `src/redis-check-rdb.c` to stage lifecycle coverage and persistence hardening after core stream edits." } },
      { delay: 3340, eventType: "tool_call_start", data: { tool: "ask_knowledge_graph_queries", call_id: "codegen-kg-1" } },
      { delay: 4340, eventType: "tool_call_end", data: { tool: "ask_knowledge_graph_queries", call_id: "codegen-kg-1", result: "Resolved dependencies between parser wiring, group-scoped DLQ storage, claim-skip semantics, introspection summaries, and AOF/RDB reconstruction so tasks can execute in layer order without rework." } },
      { delay: 4840, eventType: "chunk", data: { content: "Executing the approved Redis DLQ rollout layer by layer.\n\nStarting with command contracts and parser-local wiring so the new `XDLQ` family becomes concrete before deeper consumer-group state changes are introduced." } },
      { delay: 6500, eventType: "progress", data: { step: "Layer 1", message: "Generating command docs, command-table metadata, and top-level parser dispatch." } },
      { delay: 6800, eventType: "tool_call_start", data: { tool: "bash", call_id: "codegen-bash-1" } },
      { delay: 8620, eventType: "tool_call_end", data: { tool: "bash", call_id: "codegen-bash-1", result: "Executed `git diff unstable...stream-dlq-demo -- src/t_stream.c src/commands.def src/commands/xdlq*.json && python scripts/summarize_stream_changes.py --phase parser --with-docs` to verify the command-surface patch set before applying edits." } },
      { delay: 9100, eventType: "tool_call_start", data: { tool: "edit_files", call_id: "codegen-edit-layer-1" } },
      { delay: 10480, eventType: "tool_call_end", data: { tool: "edit_files", call_id: "codegen-edit-layer-1", result: "Updated `src/commands.def`, added `xdlq*.json` command docs, and wired `xdlqCommand` dispatch inside `src/t_stream.c`." } },
      { delay: 10920, eventType: "state_update", data: { codegenStage: 0 } },
      { delay: 11220, eventType: "chunk", data: { content: "\nLayer 1 complete: the command family is discoverable, argument parsing is wired, and early validation coverage can now anchor later stream-state changes." } },
      { delay: 12820, eventType: "progress", data: { step: "Layer 2", message: "Generating consumer-group DLQ metadata, ordered indexes, cleanup hooks, and lifecycle tests." } },
      { delay: 13140, eventType: "tool_call_start", data: { tool: "read_files", call_id: "codegen-read-batch-4" } },
      { delay: 14200, eventType: "tool_call_end", data: { tool: "read_files", call_id: "codegen-read-batch-4", result: "Re-read stream teardown and lifecycle paths so the metadata layer and cleanup hooks stay consistent with the later replay and persistence work." } },
      { delay: 14580, eventType: "tool_call_start", data: { tool: "edit_files", call_id: "codegen-edit-layer-2" } },
      { delay: 16060, eventType: "tool_call_end", data: { tool: "edit_files", call_id: "codegen-edit-layer-2", result: "Added `streamDLQRec` metadata structures, group-scoped DLQ indexes, replay accounting, and teardown/delete cleanup logic across stream internals." } },
      { delay: 16440, eventType: "tool_call_start", data: { tool: "run_tests", call_id: "codegen-tests-layer-2" } },
      { delay: 17600, eventType: "tool_call_end", data: { tool: "run_tests", call_id: "codegen-tests-layer-2", result: "`tests/unit/type/stream-dlq.tcl` now covers move/list/replay flows, duplicate operations, deleted-entry cleanup, and operator-visible metadata assertions." } },
      { delay: 17940, eventType: "state_update", data: { codegenStage: 1 } },
      { delay: 18280, eventType: "chunk", data: { content: "\nLayer 2 complete: DLQ state is now consumer-group scoped, cleanup paths are explicit, and lifecycle tests protect the quarantine model before introspection and persistence work lands." } },
      { delay: 19920, eventType: "progress", data: { step: "Layer 3", message: "Integrating workflow semantics with XNACK/XCLAIM and stream introspection." } },
      { delay: 20260, eventType: "tool_call_start", data: { tool: "ask_knowledge_graph_queries", call_id: "codegen-kg-2" } },
      { delay: 21240, eventType: "tool_call_end", data: { tool: "ask_knowledge_graph_queries", call_id: "codegen-kg-2", result: "Confirmed that quarantined entries must be skipped in claim paths and surfaced through `XDLQ INFO` and `XINFO STREAM FULL` summary fields rather than normal XPENDING iteration." } },
      { delay: 21620, eventType: "tool_call_start", data: { tool: "edit_files", call_id: "codegen-edit-layer-3" } },
      { delay: 23020, eventType: "tool_call_end", data: { tool: "edit_files", call_id: "codegen-edit-layer-3", result: "Implemented MOVE/LIST/INFO/REPLAY/PURGE semantics, added DLQ summary fields to `XINFO STREAM FULL`, and kept `XNACK`/`XCLAIM` from reviving quarantined entries." } },
      { delay: 23380, eventType: "state_update", data: { codegenStage: 2 } },
      { delay: 23720, eventType: "chunk", data: { content: "\nLayer 3 complete: the operator workflow now reads end to end, and the Redis surfaces touched by quarantine semantics, introspection, and replay all agree on the same lifecycle." } },
      { delay: 25340, eventType: "progress", data: { step: "Layer 4", message: "Hardening AOF rewrite, RDB reload, and validation-tool support." } },
      { delay: 25680, eventType: "tool_call_start", data: { tool: "bash", call_id: "codegen-bash-2" } },
      { delay: 27300, eventType: "tool_call_end", data: { tool: "bash", call_id: "codegen-bash-2", result: "Executed `python scripts/plan_dependency_check.py --feature stream-dlq --phase persistence && git diff --stat unstable...stream-dlq-demo -- src/aof.c src/rdb.c src/rdb.h src/redis-check-rdb.c` to validate persistence ordering and exact file impact." } },
      { delay: 27700, eventType: "tool_call_start", data: { tool: "edit_files", call_id: "codegen-edit-layer-4" } },
      { delay: 29120, eventType: "tool_call_end", data: { tool: "edit_files", call_id: "codegen-edit-layer-4", result: "Added AOF reconstruction helpers, introduced stream-v6 persistence support, and updated `redis-check-rdb` to recognize the new encoding." } },
      { delay: 29480, eventType: "tool_call_start", data: { tool: "run_tests", call_id: "codegen-tests-layer-4" } },
      { delay: 30780, eventType: "tool_call_end", data: { tool: "run_tests", call_id: "codegen-tests-layer-4", result: "Reload, persistence, introspection, and replication checks passed with DLQ metadata preserved through rewrite and restart boundaries." } },
      { delay: 31120, eventType: "state_update", data: { codegenStage: 3 } },
      { delay: 31480, eventType: "chunk", data: { content: "\nLayer 4 complete: persistence boundaries are accounted for, validation tooling understands the new stream encoding, and the implementation now survives rewrite and reload the way a real Redis feature should." } },
      { delay: 33080, eventType: "progress", data: { step: "Layer 5", message: "Polishing docs, generated metadata, and final packaging for the implementation view." } },
      { delay: 33420, eventType: "tool_call_start", data: { tool: "read_files", call_id: "codegen-read-batch-5" } },
      { delay: 34480, eventType: "tool_call_end", data: { tool: "read_files", call_id: "codegen-read-batch-5", result: "Read final command docs and generated metadata files to keep the release-polish layer consistent with the implementation that already landed below it." } },
      { delay: 34840, eventType: "tool_call_start", data: { tool: "ask_knowledge_graph_queries", call_id: "codegen-kg-3" } },
      { delay: 35780, eventType: "tool_call_end", data: { tool: "ask_knowledge_graph_queries", call_id: "codegen-kg-3", result: "Confirmed the release-polish layer should stay focused on docs, help text, and generated metadata sync rather than changing runtime semantics." } },
      { delay: 36140, eventType: "chunk", data: { content: "\nI’m in the final packaging pass now: tightening command docs, aligning generated metadata, and making sure the right-side code view can reveal the layers progressively instead of jumping ahead all at once." } },
      { delay: 37800, eventType: "progress", data: { step: "Packaging", message: "Assembling layered task output, diffs, logs, verification status, and PR metadata for the codegen view." } },
      { delay: 38220, eventType: "state_update", data: { codegenStage: 4 } },
      { delay: 38620, eventType: "chunk", data: { content: "\nAll layers complete. Packaging command metadata, stream internals, tests, introspection, persistence, and release-polish artifacts into the final implementation view." } },
      { delay: 39840, eventType: "end", data: { message: "Code generation complete" } },
    ],
    options,
    () => {
      updateState((current) => ({
        ...current,
        codegenStarted: true,
        codegenComplete: true,
        codegenStage: COMPLETED_LAYERS.length - 1,
      }));
    },
  );
}
