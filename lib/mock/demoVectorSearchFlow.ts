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

/**
 * Seeded "Vector Search 2.0" demo build flow.
 *
 * Unlike the interactive Redis DLQ demo (demoBuildFlow.ts), this flow is
 * PRE-COMPLETED: it represents a recipe that already ran QnA -> Spec -> Plan ->
 * Codegen -> PR. It is pinned into the sidebar so a presenter can open an
 * "already existing" build flow with finished data on any fresh browser.
 * Everything here is static — no state machine, no timers mutating state.
 *
 * The feature content is real: it mirrors the actual
 * `feature/vector-search-2-0-bundle` branch of the demo Redis fork
 * (VBATCH bulk ingest, VSIM MINSCORE threshold search, VINFO DETAIL
 * diagnostics), and the code diffs are trimmed hunks from that branch.
 */

export const VECTOR_DEMO_RECIPE_ID = "3c9a1b7e-5d42-4f6a-9e21-8c47d1a5b903";
export const VECTOR_DEMO_PROJECT_ID = "a1e8c2d4-77b3-4c1f-b6d9-3f52e8a9c710";
export const VECTOR_DEMO_QUESTION_RUN_ID = "5b2f8d1c-9a34-4e07-b8c6-2d91e4f7a350";
export const VECTOR_DEMO_SPEC_RUN_ID = "9e4c6a28-1f5b-4d73-a092-c8b3d6e15f47";
export const VECTOR_DEMO_PLAN_RUN_ID = "2d7b9f43-8c16-4a58-b3e7-91f0c4d82a65";
export const VECTOR_DEMO_TASK_SPLITTING_ID = "6f1a3c85-2e97-4b06-9d24-e7c5b8a41f92";
export const VECTOR_DEMO_CONVERSATION_ID = "8a5d2e91-4c73-4f18-b6a0-3e9f7c216d84";
export const VECTOR_DEMO_RECIPE_TITLE = "Vector Search 2.0";
export const VECTOR_DEMO_PR_URL = "https://github.com/potpietools/redis/pull/3";
export const VECTOR_DEMO_BRANCH = "feature/vector-search-2-0-bundle";
export const VECTOR_DEMO_BASE_BRANCH = "unstable";
export const VECTOR_DEMO_RECIPE_STATUS = "IMPLEMENTATION_READY";

export function isVectorDemoRecipeId(recipeId?: string | null) {
  return recipeId === VECTOR_DEMO_RECIPE_ID;
}

export function isVectorDemoTaskSplittingId(taskSplittingId?: string | null) {
  return taskSplittingId === VECTOR_DEMO_TASK_SPLITTING_ID;
}

export function isVectorDemoConversationId(conversationId?: string | null) {
  return conversationId === VECTOR_DEMO_CONVERSATION_ID;
}

const VECTOR_DEMO_QUESTIONS: RecipeQuestionsResponse = {
  recipe_id: VECTOR_DEMO_RECIPE_ID,
  generation_status: "completed",
  generated_at: "2026-04-14T08:49:00.000Z",
  error_message: null,
  run_id: null,
  questions: [
  {
    "id": "q1",
    "question": "Which scope should ship in the Vector Search 2.0 bundle for vector sets?",
    "expected_answer_type": "mcq",
    "multiple_choice": false,
    "options": [
      {
        "label": "VBATCH, VSIM MINSCORE, and VINFO DETAIL together",
        "description": "One coherent ingestion, search, and diagnostics story in a single bundle."
      },
      {
        "label": "VBATCH only",
        "description": "Ship bulk ingestion first and defer search and introspection changes."
      },
      {
        "label": "MINSCORE and VINFO DETAIL only",
        "description": "Improve search ergonomics and diagnostics without touching the write path."
      }
    ],
    "answer_recommendation": {
      "idx": 0,
      "reasoning": "The three surfaces share one narrative: `VBATCH` fills the index fast, `MINSCORE` makes threshold search readable, and `VINFO DETAIL` proves what was built. All of them live in `modules/vector-sets/vset.c` and ship best as one bundle."
    },
    "context_refs": [
      {
        "path": "modules/vector-sets/README.md",
        "type": "doc"
      },
      {
        "path": "modules/vector-sets/commands.json",
        "type": "code"
      }
    ]
  },
  {
    "id": "q2",
    "question": "What should happen when one element inside a `VBATCH` payload is invalid?",
    "expected_answer_type": "mcq",
    "multiple_choice": false,
    "options": [
      {
        "label": "All-or-nothing: validate the full payload before mutating anything, then apply sequentially"
      },
      {
        "label": "Partial apply with per-element status replies"
      },
      {
        "label": "Best-effort: skip invalid elements and report a count"
      }
    ],
    "answer_recommendation": {
      "idx": 0,
      "reasoning": "Parsing every element into a `vbatchItem` array and running `vectorSetValidateInsertParameters` (dimension, REDUCE, quantization, M) before the first insert means a bad element in the middle of a batch can never leave the set half-mutated, and the reply stays a simple count of newly added elements."
    },
    "context_refs": [
      {
        "path": "modules/vector-sets/vset.c",
        "type": "code"
      }
    ]
  },
  {
    "id": "q3",
    "question": "What diagnostics should `VINFO DETAIL` expose beyond the base 9-field reply?",
    "expected_answer_type": "mcq",
    "multiple_choice": true,
    "options": [
      {
        "label": "projection usage"
      },
      {
        "label": "bytes per stored vector"
      },
      {
        "label": "estimated vector storage footprint"
      },
      {
        "label": "attribute coverage"
      },
      {
        "label": "default build and search effort"
      },
      {
        "label": "graph link statistics and level histogram"
      }
    ],
    "answer_recommendation": {
      "idx": 0,
      "reasoning": "Ship all six. A single `hnsw_collect_stats()` walk over the graph yields the link statistics and level histogram, and the remaining fields fall out of state the module already tracks, so the full diagnostic story costs one read-locked traversal."
    },
    "context_refs": [
      {
        "path": "modules/vector-sets/hnsw.c",
        "type": "code"
      },
      {
        "path": "modules/vector-sets/vset.c",
        "type": "code"
      }
    ]
  },
  {
    "id": "q4",
    "question": "Any constraints on keeping the new surfaces consistent with existing `VADD`/`VSIM` semantics?",
    "expected_answer_type": "free_text",
    "multiple_choice": false,
    "options": [],
    "answer_recommendation": {
      "idx": null,
      "reasoning": "Treat the bundle as strictly layered over existing vector-set semantics: `VBATCH` must accept the same `NOQUANT`/`Q8`/`BIN` quantization flags, the same `REDUCE` random projection, and the same `SETATTR` JSON attributes as `VADD`; `MINSCORE` must be the same cutoff as `EPSILON` expressed in similarity space and mutually exclusive with it; and nothing may change the worker-thread model for `VSIM`/`VADD`."
    },
    "context_refs": [
      {
        "path": "modules/vector-sets/README.md",
        "type": "doc"
      },
      {
        "path": "modules/vector-sets/vset.c",
        "type": "code"
      }
    ]
  }
],
};

const VECTOR_DEMO_QA_PAIRS: RecipeDetailsResponse["questions_and_answers"] = [
  {
    "question_id": "q1",
    "question": "Which scope should ship in the Vector Search 2.0 bundle for vector sets?",
    "answer": "Ship all three surfaces together — VBATCH, VSIM MINSCORE, and VINFO DETAIL form one ingestion-to-diagnostics story and all land inside modules/vector-sets."
  },
  {
    "question_id": "q2",
    "question": "What should happen when one element inside a `VBATCH` payload is invalid?",
    "answer": "All-or-nothing: validate the full payload before mutating anything, then apply inserts and updates sequentially with VADD semantics, replying with the number of newly added elements."
  },
  {
    "question_id": "q3",
    "question": "What diagnostics should `VINFO DETAIL` expose beyond the base 9-field reply?",
    "answer": "All six: projection usage, bytes per stored vector, estimated vector storage footprint, attribute coverage, default build/search effort, and graph link statistics with a per-level histogram."
  },
  {
    "question_id": "q4",
    "question": "Any constraints on keeping the new surfaces consistent with existing `VADD`/`VSIM` semantics?",
    "answer": "Keep the bundle strictly layered over existing semantics — same quantization flags, same REDUCE projection, same SETATTR attributes, MINSCORE as the similarity-space twin of EPSILON, and no changes to the worker-thread model."
  }
];

const VECTOR_DEMO_SPECIFICATION: SpecificationOutput = {
  "tl_dr": "Ship a Vector Search 2.0 bundle for the vector-sets module: a new `VBATCH` command for validated, all-or-nothing bulk ingestion, a `MINSCORE` similarity-space threshold for `VSIM` that is mutually exclusive with `EPSILON`, and a `VINFO DETAIL` diagnostics surface backed by a new single-pass HNSW stats collector — packaged with regression tests, README docs, command metadata, and upgraded example tooling, all contained inside `modules/vector-sets/`.",
  "context": {
    "original_request": "We need first-class bulk ingestion, similarity-space search thresholds, and richer index introspection for Redis vector sets, so ingestion workloads stop paying one round trip per `VADD` and operators can reason about HNSW graph health without reading module internals.",
    "janus_analysis": "Vector sets already have the hard parts: an HNSW index, worker threads for `VSIM`/`VADD`, int8 quantization by default, `REDUCE` random projection, and `FILTER` expressions over JSON attributes. The highest-value 2.0 additions are ingestion throughput (`VBATCH`), search ergonomics (`MINSCORE`), and operational diagnostics (`VINFO DETAIL`). All three land inside `modules/vector-sets/` with no core server changes, which keeps the blast radius small and the review tractable.",
    "qa_answers": "Batches must be all-or-nothing at validation time and then apply sequentially with exact `VADD` semantics; the reply counts only newly added elements so updates are visible as `reply < batch size`. `MINSCORE` and `EPSILON` express the same threshold in different units and must be mutually exclusive. Diagnostics ship as an optional `DETAIL` token on the existing `VINFO` command rather than a new command, and the stats pass may take the index read lock and walk the node list once.",
    "research_findings": "The implementation handoff recommends extracting `VADD`'s validation and projection logic into shared helpers (`vectorSetValidateInsertParameters`, `vectorSetProjectInputVector`, `parseFp32VectorBlob`, `parseValuesVectorSlice`) so `VBATCH` cannot drift from `VADD`; propagating `VBATCH` verbatim to replicas; carrying the `MINSCORE` threshold to detached search threads via a heap-allocated slot in the blocked-client argument vector; and returning HNSW statistics as a value-type `hnswStats` snapshot whose level histogram is bounded by `HNSW_MAX_LEVEL`.",
    "scope_guardrails": "V1 stays entirely inside `modules/vector-sets/`: no core command-table or RDB format changes (the existing module-type serialization already covers everything `VBATCH` writes), no async or chunked batch application, no per-item partial-success reporting beyond all-or-nothing rejection, and no CAS/background threading for the batch insert path."
  },
  "success_metrics": [
    "A single `VBATCH` call ingests a whole GloVe-100 batch that previously cost one `VADD` round trip per vector, and its integer reply distinguishes new adds from in-place updates.",
    "A malformed batch — bad vector value, mixed FP32 dimensions, truncated payload, or invalid tail option — leaves the key completely untouched because validation completes before the key is even opened.",
    "`VSIM ... MINSCORE 0.85` truncates results directly in similarity space without callers converting to cosine-distance `EPSILON`, and combining both options fails with one deterministic error.",
    "`VINFO key DETAIL` exposes projection usage, per-vector byte cost, attribute coverage, default build/search effort, graph link statistics, and a per-level histogram cheaply enough to run during live tuning sessions.",
    "Replication and `DEBUG RELOAD` scenarios keep primary and replica identical for batched inserts, in-place updates, and `REDUCE`-projected sets, verified by dedicated regression tests."
  ],
  "functional_requirements": [
    {
      "id": "FR-001",
      "title": "Add the VBATCH command surface with all-or-nothing payload validation",
      "description": "Introduce `VBATCH key [REDUCE dim] VALUES dim count element value... [SETATTR json] ...` and `VBATCH key [REDUCE dim] FP32 count element blob [SETATTR json] ...`, each with trailing `EF n`, `NOQUANT|Q8|BIN`, and `M n` options, registered as a `write deny-oom` command with arity -6 and full command metadata. The entire payload parses into a staging array before the key is opened; any invalid item aborts the command with zero mutation.",
      "acceptance_criteria": [
        "Both payload forms parse: `VALUES dim count` followed by count elements each carrying dim values, and `FP32 count` followed by count element/blob pairs, with any item optionally followed by `SETATTR json`.",
        "Every failure mode returns a deterministic error before any mutation: `ERR invalid REDUCE dimension`, `ERR invalid VALUES batch header`, `ERR invalid FP32 batch count`, `ERR format must be FP32 or VALUES`, `ERR invalid VALUES vector`, `ERR invalid FP32 vector`, `ERR all FP32 vectors in a batch must have the same dimension`, and `ERR invalid option after batch payload`.",
        "Tail options reuse `VADD`'s bounds: `EF` in 1..1000000 and `M` within `HNSW_MIN_M`..`HNSW_MAX_M` (4..4096), rejected with `ERR invalid EF` / `ERR invalid M` otherwise.",
        "`COMMAND DOCS VBATCH` reports the argument table, `since` 8.4.0, WRITE/DENYOOM flags, and the `O(M*log(N))` complexity declared in `commands.json`."
      ],
      "dependencies": [],
      "implementation_recommendations": [
        "Stage parsed items in a `struct vbatchItem { item, attrib, vec }` array allocated with `RedisModule_Calloc` and released through a single `freeVBatchItems()` cleanup helper on every early-return path.",
        "Reuse `parseFp32VectorBlob()` and `parseValuesVectorSlice()` extracted from `VADD`'s `parseVector()` so both commands accept byte-identical vector encodings."
      ],
      "guardrails": [
        "Do not open or create the key until the full payload has parsed successfully — validation failures must be observable as pure errors with no side effects.",
        "Keep the whole surface inside `modules/vector-sets/vset.c`; no core server or command-table changes."
      ],
      "external_dependencies": []
    },
    {
      "id": "FR-002",
      "title": "Apply batches with exact VADD semantics and a new-adds-only reply contract",
      "description": "Once validated, apply items sequentially through the shared insert path so quantization, `REDUCE` projection, and attribute handling stay identical to `VADD`. The reply is the number of newly added elements; elements updated in place are not counted.",
      "acceptance_criteria": [
        "Existing-set compatibility is enforced by the same `vectorSetValidateInsertParameters()` helper used by `VADD`, so quantization, `M`, dimension, and projection mismatches produce `VADD`'s exact error strings (e.g. `ERR asked quantization mismatch with existing vector set`).",
        "Each staged vector is projected through `vectorSetProjectInputVector()` when the set has a `REDUCE` matrix, then inserted via `vectorSetInsert(...)` with update enabled and the batch `EF`.",
        "The reply is a long long counting new elements only: a batch that updates one existing element and adds one new element replies 1 while `VCARD` grows by exactly 1.",
        "`SETATTR` payloads applied through a batch are readable with `VGETATTR`, participate in `FILTER` expressions, and are counted in `attributes-count`."
      ],
      "dependencies": [
        "FR-001"
      ],
      "implementation_recommendations": [
        "When the batch creates the key, mirror `VADD`'s creation path exactly: `createVectorSetObject(reduce_dim ? reduce_dim : dim, quant_type, hnsw_create_M)` plus `createProjectionMatrix()` with explicit allocation-failure handling.",
        "Run the apply loop on the main thread; the batch path deliberately skips the CAS/threaded `VADD` machinery so effect ordering stays deterministic."
      ],
      "guardrails": [
        "Never bypass `vectorSetInsert()` with a custom batch fast path — any semantic drift between `VADD` and `VBATCH` is a correctness bug, not an optimization.",
        "Preserve `VADD`'s attribute accounting: the CAS reply path must increment `numattribs` when an attribute is attached, or `attribute-coverage` diagnostics go stale."
      ],
      "external_dependencies": []
    },
    {
      "id": "FR-003",
      "title": "Add VSIM MINSCORE with similarity-space semantics and EPSILON exclusivity",
      "description": "Accept `MINSCORE score` on `VSIM` as a similarity floor expressed in the same 0..1 space returned by `WITHSCORES` (1 identical, 0 opposite): results stop once similarity `1 - distance/2` drops below the floor. `EPSILON` and `MINSCORE` describe the same threshold in different units and are mutually exclusive.",
      "acceptance_criteria": [
        "A non-numeric `MINSCORE` or one outside [0, 1] returns `ERR invalid MINSCORE`.",
        "Specifying both options in either order returns `ERR EPSILON and MINSCORE are mutually exclusive` after option parsing completes.",
        "Truncation happens in `VSIM_execute()` by breaking out of the reply loop when `1.0 - distances[i]/2.0` falls below the floor, so the `WITHSCORES` value and the cutoff computation share one similarity expression.",
        "The floor behaves identically on the threaded path, the `NOTHREAD` main-thread path, and `TRUTH` linear scans, and `MINSCORE 0.9` over a set containing identical, near, orthogonal, and opposite vectors returns exactly the identical and near matches."
      ],
      "dependencies": [],
      "implementation_recommendations": [
        "Carry the threshold to the detached worker as a heap-allocated double in the blocked-client argument vector (widened from 11 to 12 slots) and free it in `VSIM_thread()` alongside the query vector.",
        "Keep 0.0 as the neutral default so every existing caller sees byte-identical behavior."
      ],
      "guardrails": [
        "Do not translate `MINSCORE` into an internal `EPSILON` before the reply loop — keeping both checks explicit preserves exact boundary behavior at the threshold."
      ],
      "external_dependencies": []
    },
    {
      "id": "FR-004",
      "title": "Expose VINFO DETAIL diagnostics backed by an HNSW stats collector",
      "description": "Extend `VINFO` to accept an optional `DETAIL` token (arity 2 becomes -2) that grows the reply map from 9 to 16 entries with projection usage, byte costs, attribute coverage, effort defaults, and graph statistics gathered by a new `hnsw_collect_stats()` single-pass collector.",
      "acceptance_criteria": [
        "Any third argument other than `DETAIL` returns `ERR syntax error`, and plain `VINFO key` output remains byte-for-byte unchanged.",
        "`DETAIL` adds `projection-enabled`, `bytes-per-vector` (from `hnsw_quants_bytes()`), `estimated-vector-bytes` (bytes-per-vector times node count), `attribute-coverage` (`numattribs / node_count`), `avg-level`, and a `search-defaults` map with `build-ef` and `search-ef`.",
        "A nested `graph-stats` map reports `total-links`, `undirected-edges`, `avg-links-per-node`, `avg-layer0-degree`, `max-layer0-degree`, `max-links-per-node`, `isolated-nodes`, and a `level-histogram` map keyed by level 0 through `max_level`.",
        "`hnsw_collect_stats()` takes the index global read lock, walks the node list exactly once, and returns an `hnswStats` value snapshot with the histogram bounded by `HNSW_MAX_LEVEL`."
      ],
      "dependencies": [],
      "implementation_recommendations": [
        "Move `HNSW_MAX_LEVEL` from `hnsw.c` into `hnsw.h` so the `hnswStats` struct can declare `level_histogram[HNSW_MAX_LEVEL + 1]` in the public header.",
        "Compute derived ratios (`attribute-coverage`, `avg-level`, per-node link averages) in `vset.c` from raw counters so `hnsw.c` stays reply-format agnostic."
      ],
      "guardrails": [
        "`hnsw_collect_stats()` must hold only the read lock — never the write lock — so concurrent threaded `VSIM` queries keep running while diagnostics are collected.",
        "Guard every division by `node_count` so `VINFO DETAIL` on an empty or single-node set replies with zeros instead of NaN."
      ],
      "external_dependencies": []
    },
    {
      "id": "FR-005",
      "title": "Guarantee persistence and replication correctness for batched writes",
      "description": "Batched inserts, in-place updates, and projected sets must propagate deterministically to replicas and survive RDB reload with identical query results, without any change to the module-type serialization format.",
      "acceptance_criteria": [
        "`VBATCH` propagates with `RedisModule_ReplicateVerbatim()` so replicas execute the identical validated payload, and the main-thread apply loop keeps effect ordering deterministic on both sides.",
        "`VADD` replicates verbatim on updates as well as first inserts, so an in-place vector update converges on replicas instead of being silently dropped when `added` is false.",
        "`DEBUG RELOAD` preserves search results and similarity scores for both normal and `REDUCE`-projected sets, and `VINFO ... DETAIL` reports `projection-enabled` true both before and after reload.",
        "The replication suite exercises a `VADD` in-place update plus a `VBATCH ... EF 150` batch ahead of its 5000-vector consistency run and asserts primary/replica agreement."
      ],
      "dependencies": [
        "FR-001",
        "FR-002"
      ],
      "implementation_recommendations": [
        "Do not touch the RDB path: the existing vector-sets module-type serialization already persists every effect a batch produces, including projection matrices and attributes.",
        "Prefer verbatim propagation over effects rewriting — the command is deterministic given the same payload, and one replicated command is cheaper than N rewritten `VADD`s."
      ],
      "external_dependencies": []
    },
    {
      "id": "FR-006",
      "title": "Package docs, examples, and regression coverage for the 2.0 bundle",
      "description": "Ship operator-facing documentation for all three surfaces, complete command metadata, upgraded example tooling, and focused regression tests so the bundle is understandable and verifiable from the repository alone.",
      "acceptance_criteria": [
        "`modules/vector-sets/README.md` documents `VBATCH` with `VALUES` and `FP32` examples, the `MINSCORE` paragraph including the mutual-exclusion rule, and the `VINFO DETAIL` diagnostics list.",
        "`commands.json` gains the `VBATCH` entry (arity -6, WRITE/DENYOOM, `O(M*log(N))` complexity, since 8.4.0), the `VSIM` `MINSCORE` double token, and the `VINFO` `DETAIL` pure-token with arity -2.",
        "`examples/glove-100/insert.py` ingests through `add_batch_to_redis()` using `VBATCH`, and `recall.py` accepts a `--minscore` flag that forwards to `VSIM`.",
        "`examples/cli-tool/cli.py` renders nested RESP3 maps and byte strings so `VINFO key DETAIL` output is readable, with worked examples in its README.",
        "New tests `batch_ingest.py`, `batch_fp32.py`, `batch_projection.py`, `minscore.py`, and `vinfo_detail.py` pass alongside the extended `basic_commands.py`, `persistence.py`, and `replication.py` suites."
      ],
      "dependencies": [
        "FR-002",
        "FR-003",
        "FR-004",
        "FR-005"
      ],
      "implementation_recommendations": [
        "Keep each regression file scoped to one surface (batch VALUES, batch FP32, batch REDUCE, threshold search, diagnostics) so a failure localizes to a single feature immediately."
      ],
      "external_dependencies": []
    }
  ],
  "non_functional_requirements": [
    {
      "id": "NFR-001",
      "title": "Ingestion throughput and bounded memory",
      "description": "A batch of M vectors costs one command dispatch instead of M round trips; staging overhead is a single `vbatchItem` array plus the parsed float buffers, and every early-return path releases staged vectors through `freeVBatchItems()` with no leaks under error injection."
    },
    {
      "id": "NFR-002",
      "title": "Concurrency safety",
      "description": "The `MINSCORE` threshold must reach detached `VSIM` worker threads without stack-lifetime hazards (a heap-allocated slot in the blocked-client argument vector, freed by the worker), and `hnsw_collect_stats()` must coexist with concurrent searches by holding only the global read lock."
    },
    {
      "id": "NFR-003",
      "title": "Backward compatibility",
      "description": "Existing `VADD`, `VSIM`, and `VINFO` callers observe zero behavioral change: the default `minscore` of 0.0 filters nothing, plain `VINFO` keeps its original 9-entry map, and refactoring `VADD` into shared helpers preserves its exact error strings and reply shapes."
    }
  ],
  "data_models": [
    {
      "name": "vbatchItem",
      "description": "Per-element staging record for a `VBATCH` payload holding the element name, the optional `SETATTR` attribute string, and the parsed float vector. The whole array is populated and validated before the key is opened, and `freeVBatchItems()` tears it down on every exit path — this staging model is what makes the all-or-nothing contract cheap to enforce."
    },
    {
      "name": "hnswStats",
      "description": "Value-type snapshot returned by `hnsw_collect_stats()` carrying `node_count`, `total_links`, `layer0_links`, `total_levels`, `max_level`, `max_layer0_degree`, `max_links_per_node`, `isolated_nodes`, and `level_histogram[HNSW_MAX_LEVEL + 1]`. Collected in one pass over the node list under the index read lock, and consumed by `VINFO DETAIL` to derive averages, coverage ratios, and the per-level histogram reply."
    },
    {
      "name": "vsimThreadArgs",
      "description": "The blocked-client argument vector handed to threaded `VSIM`, widened from 11 to 12 slots so the `MINSCORE` threshold travels to the worker as a heap-allocated double that `VSIM_thread()` reads and frees alongside the query vector, keeping the detached search thread free of stack-lifetime bugs."
    }
  ],
  "interfaces": [
    {
      "name": "VBATCH",
      "contract": "`VBATCH key [REDUCE dim] VALUES dim count element value... [SETATTR json] ... | FP32 count element blob [SETATTR json] ... [EF n] [NOQUANT|Q8|BIN] [M n]` — validates the full payload before mutating anything, then applies inserts and updates sequentially with `VADD` semantics; replies with the integer count of newly added elements, excluding in-place updates."
    },
    {
      "name": "VSIM MINSCORE",
      "contract": "`VSIM key ... [EPSILON delta | MINSCORE score]` — `MINSCORE` is a similarity floor in [0, 1] (1 identical, 0 opposite); the reply stops once `1 - distance/2` drops below it, and combining it with `EPSILON` returns `ERR EPSILON and MINSCORE are mutually exclusive`."
    },
    {
      "name": "VINFO DETAIL",
      "contract": "`VINFO key [DETAIL]` — without the token, the classic 9-entry map; with it, a 16-entry map adding `projection-enabled`, `bytes-per-vector`, `estimated-vector-bytes`, `attribute-coverage`, `avg-level`, a `search-defaults` map (`build-ef`, `search-ef`), and a `graph-stats` map whose final field is a `level-histogram` keyed by HNSW level."
    }
  ],
  "external_dependencies_summary": [
    "No external service or library dependency: the bundle lives entirely inside `modules/vector-sets/` (`vset.c`, `hnsw.c`, `hnsw.h`, `commands.json`) on top of the existing Redis module API.",
    "The existing module-type RDB serialization and verbatim command replication are the critical compatibility surfaces; neither format changes."
  ],
  "architectural_decisions": [
    "Validate-then-apply for `VBATCH`: parse every item into a staged `vbatchItem` array before the key is even opened, so a malformed payload can never leave a partially ingested set.",
    "Extract `VADD`'s validation, projection, and vector-parsing logic into shared helpers (`vectorSetValidateInsertParameters`, `vectorSetProjectInputVector`, `parseFp32VectorBlob`, `parseValuesVectorSlice`) instead of duplicating it, so `VBATCH` cannot drift from `VADD` semantics.",
    "Express the new search threshold in similarity space (`MINSCORE`) as an explicit alternative to distance space (`EPSILON`) and hard-reject combining them — one threshold, two units, never both.",
    "Keep diagnostics read-only and snapshot-based: `hnsw_collect_stats()` walks the graph once under the global read lock and returns a value struct, leaving reply formatting and derived ratios to `vset.c`.",
    "Propagate batched writes verbatim and apply them on the main thread — determinism over parallelism for ingestion — and fix `VADD` to replicate in-place updates verbatim too so replicas converge on vector overwrites."
  ]
};

const VECTOR_DEMO_PLAN: PhasedPlan = {
  "phases": [
    {
      "phase_id": "phase-0",
      "name": "Design lock and command contracts",
      "description": "Freeze argument grammars, reply shapes, and option tokens for VBATCH, VSIM MINSCORE, and VINFO DETAIL before touching the engine.",
      "summary": "Resolve the contract questions up front: VBATCH replies with the number of newly added elements only, MINSCORE and EPSILON are two spellings of one threshold, and DETAIL extends VINFO without disturbing its base reply. Locking these into commands.json and the module command info keeps the parser, docs, and tests aligned through the rest of the rollout.",
      "dependencies": [],
      "is_final": false,
      "iteration": 1,
      "plan_items": [
        {
          "plan_item_id": "phase-0-design-lock",
          "order": 1,
          "title": "Lock the Vector Search 2.0 surface area and reply contracts",
          "description": "Confirm the three command surfaces, their reply shapes, and the invariants that must hold for existing clients.",
          "detailed_description": "Capture the handoff decisions: `VBATCH key [REDUCE dim] VALUES|FP32 ... [SETATTR json] ... [EF n] [NOQUANT|Q8|BIN] [M n]` with all-or-nothing validation and a newly-added-only integer reply; `VSIM ... [EPSILON delta | MINSCORE score]` with the threshold expressed in similarity space; and `VINFO key [DETAIL]` that adds diagnostics without changing the existing nine field map.",
          "dependencies": [],
          "status": "completed",
          "created_at": "2026-04-14T08:58:05.000Z",
          "file_changes": [
            {
              "path": "modules/vector-sets/README.md",
              "action": "modify",
              "purpose": "Capture the locked command contracts before implementation starts."
            },
            {
              "path": "modules/vector-sets/vset.c",
              "action": "modify",
              "purpose": "Reserve command entry points for VBATCH and the extended VSIM and VINFO parsers."
            }
          ],
          "verification_criteria": [
            "VBATCH reply is defined as the count of newly added elements with updates explicitly excluded.",
            "EPSILON and MINSCORE are locked as mutually exclusive spellings of one threshold.",
            "VINFO without DETAIL keeps its existing nine field reply unchanged."
          ]
        },
        {
          "plan_item_id": "b4e7a1f9-6d28-4c53-8b91-f2a6d9e30c75",
          "order": 2,
          "title": "Define command metadata, arguments, and reply schemas",
          "description": "Encode the locked contracts as module command metadata so COMMAND DOCS and clients see the new surfaces correctly.",
          "detailed_description": "Add the `VBATCH` entry to `commands.json` with arity -6, the optional `REDUCE` block, the `FP32`/`VALUES` oneof, quantization tokens, and `EF`/`M`; add the optional `MINSCORE` double token to `VSIM`; relax `VINFO` arity to -2 with an optional `DETAIL` pure token. Mirror the same tables through `RedisModule_SetCommandInfo` in vset.c so the module and JSON metadata never drift.",
          "dependencies": [
            "phase-0-design-lock"
          ],
          "status": "completed",
          "created_at": "2026-04-14T08:58:20.000Z",
          "file_changes": [
            {
              "path": "modules/vector-sets/commands.json",
              "action": "modify",
              "purpose": "Add the VBATCH definition plus the MINSCORE and DETAIL optional tokens."
            },
            {
              "path": "modules/vector-sets/vset.c",
              "action": "modify",
              "purpose": "Mirror the JSON metadata through RedisModule_SetCommandInfo argument tables."
            }
          ],
          "verification_criteria": [
            "COMMAND DOCS lists VBATCH with REDUCE, FP32 or VALUES, quantization, EF, and M arguments.",
            "VSIM metadata gains an optional MINSCORE double token and VINFO arity relaxes to accept DETAIL."
          ]
        }
      ],
      "diagrams": [
        {
          "diagram_id": "plan-phase-0-diagram",
          "type": "mermaid",
          "title": "Vector Search 2.0 command contract surface",
          "description": "The three new or extended command surfaces and how their contracts flow into module metadata and docs.",
          "mermaid_code": "flowchart LR\n  Client[Client request] --> Vbatch[VBATCH bulk ingest]\n  Client --> Vsim[VSIM with MINSCORE]\n  Client --> Vinfo[VINFO with DETAIL]\n  Vbatch --> Meta[Module command metadata]\n  Vsim --> Meta\n  Vinfo --> Meta\n  Meta --> Docs[COMMAND DOCS and README]",
          "generated_at": "2026-04-14T08:58:35.000Z"
        }
      ]
    },
    {
      "phase_id": "phase-1",
      "name": "VBATCH parsing and all-or-nothing validation",
      "description": "Implement the VBATCH argument parser and a full-payload validation pass that stages every item before any mutation.",
      "summary": "Build VBATCH_RedisCommand parsing for REDUCE, the VALUES and FP32 batch forms, per-item SETATTR, and the EF, M, and quantization tail options. Every vector is decoded into a staged vbatchItem array first, so one bad value anywhere aborts the whole command with nothing written.",
      "dependencies": [
        "phase-0"
      ],
      "is_final": false,
      "iteration": 1,
      "plan_items": [
        {
          "plan_item_id": "phase-1-parsing",
          "order": 1,
          "title": "Parse both VBATCH payload forms and tail options",
          "description": "Handle the VALUES dim count header, the FP32 count header, per-item SETATTR pairs, and the trailing EF, M, and quantization tokens.",
          "detailed_description": "VALUES batches carry an explicit shared dimension and item count; FP32 batches carry a count and infer the dimension from the first blob, rejecting any later blob that disagrees. After the payload, accept `EF`, `M`, `NOQUANT`, `BIN`, and `Q8` in any order, distinguishing a bad tail option from a malformed payload in the error message.",
          "dependencies": [
            "phase-0-design-lock"
          ],
          "status": "completed",
          "created_at": "2026-04-14T08:59:05.000Z",
          "file_changes": [
            {
              "path": "modules/vector-sets/vset.c",
              "action": "modify",
              "purpose": "Parse REDUCE, the VALUES and FP32 batch headers, per-item SETATTR, and the EF, M, and quantization tail options."
            }
          ],
          "verification_criteria": [
            "VALUES batches parse a shared dimension and count header while FP32 batches infer the dimension from the first blob.",
            "Mismatched FP32 dimensions and unknown tail options fail with deterministic error messages."
          ]
        },
        {
          "plan_item_id": "phase-1-validation",
          "order": 2,
          "title": "Stage items and enforce the all-or-nothing validation pass",
          "description": "Decode the full payload into a staging array before the key is even opened, so validation failures cannot leave partial state.",
          "detailed_description": "Introduce the `vbatchItem` staging struct holding the element name, decoded vector, and optional attribute, plus `freeVBatchItems` so every early return releases parsed vectors. The key is opened and the set mutated only after every item in the payload has parsed cleanly.",
          "dependencies": [
            "phase-1-parsing"
          ],
          "status": "completed",
          "created_at": "2026-04-14T08:59:20.000Z",
          "file_changes": [
            {
              "path": "modules/vector-sets/vset.c",
              "action": "modify",
              "purpose": "Add the vbatchItem staging array and freeVBatchItems so every error path releases parsed vectors before any mutation."
            }
          ],
          "verification_criteria": [
            "A single malformed vector or attribute anywhere in the payload aborts the command before any element is written.",
            "Every early return path frees the staged vbatchItem array so validation failures cannot leak vector buffers."
          ]
        }
      ],
      "diagrams": [
        {
          "diagram_id": "plan-phase-1-diagram",
          "type": "mermaid",
          "title": "VBATCH validate then apply",
          "description": "The full payload is parsed and validated before the mutation loop runs; any invalid item aborts with no writes.",
          "mermaid_code": "sequenceDiagram\n  Client->>Parser: VBATCH key VALUES dim count payload\n  Parser->>Validator: Parse every vector attribute and option\n  alt Any item invalid\n    Validator-->>Client: Error reply and no mutation\n  else All items valid\n    Validator->>Mutator: Apply inserts and updates sequentially\n    Mutator-->>Client: Number of newly added elements\n  end",
          "generated_at": "2026-04-14T08:59:35.000Z"
        }
      ]
    },
    {
      "phase_id": "phase-2",
      "name": "VBATCH apply pass and propagation semantics",
      "description": "Apply validated batches sequentially with VADD semantics and make the reply and replication behavior deterministic.",
      "summary": "After validation, open the key, create the set with the requested quantization, M, and optional REDUCE projection when empty, and insert each item through the same path VADD uses. Reply with the count of newly added elements, exclude updates, and propagate the batch verbatim so replicas and the AOF replay it deterministically.",
      "dependencies": [
        "phase-1"
      ],
      "is_final": false,
      "iteration": 1,
      "plan_items": [
        {
          "plan_item_id": "phase-2-apply",
          "order": 1,
          "title": "Apply staged items with VADD insert semantics",
          "description": "Create or validate the target set, project each staged vector when REDUCE is active, then insert items sequentially.",
          "detailed_description": "On an empty key, create the vector set with the requested quantization, M, and an optional random projection matrix sized from REDUCE. On an existing key, run vectorSetValidateInsertParameters so dimension, projection, and quantization mismatches fail before any write. Then project each staged vector and run the sequential vectorSetInsert loop that VADD already uses.",
          "dependencies": [
            "phase-1-validation"
          ],
          "status": "completed",
          "created_at": "2026-04-14T09:00:05.000Z",
          "file_changes": [
            {
              "path": "modules/vector-sets/vset.c",
              "action": "modify",
              "purpose": "Open the key only after validation, create the set with optional REDUCE projection, and insert items sequentially with VADD semantics."
            }
          ],
          "verification_criteria": [
            "A batch against a missing key creates the vector set with the requested quantization, M, and optional REDUCE projection matrix.",
            "Batches against an existing set are rejected up front when dimensions, projection, or quantization disagree."
          ]
        },
        {
          "plan_item_id": "phase-2-propagation",
          "order": 2,
          "title": "Make the reply and replication behavior deterministic",
          "description": "Count only newly added elements in the reply and propagate the whole batch verbatim.",
          "detailed_description": "vectorSetInsert reports whether each element was newly added or updated in place; the reply sums only the new additions, so re-running the same batch returns zero. The command replicates verbatim through RedisModule_ReplicateVerbatim, which keeps replica and AOF replay deterministic because the apply pass itself is sequential and validation happens before any effect.",
          "dependencies": [
            "phase-2-apply"
          ],
          "status": "completed",
          "created_at": "2026-04-14T09:00:20.000Z",
          "file_changes": [
            {
              "path": "modules/vector-sets/vset.c",
              "action": "modify",
              "purpose": "Reply with the count of newly added elements and propagate the batch verbatim to replicas and the AOF."
            },
            {
              "path": "modules/vector-sets/tests/replication.py",
              "action": "modify",
              "purpose": "Prove a replica converges after a VBATCH of mixed inserts and updates."
            }
          ],
          "verification_criteria": [
            "The reply counts only newly added elements, so re-running an identical batch returns zero.",
            "The batch propagates verbatim and a replica reaches the same set state as the primary."
          ]
        }
      ],
      "diagrams": []
    },
    {
      "phase_id": "phase-3",
      "name": "VSIM MINSCORE threshold search",
      "description": "Add a similarity-space threshold to VSIM and enforce its exclusivity with EPSILON.",
      "summary": "Thread a minscore parameter through VSIM_execute so result emission stops once similarity drops below the requested score, in both the main-thread and worker-thread paths. Validate the zero-to-one range and reject EPSILON combined with MINSCORE, since both express the same cutoff in different units.",
      "dependencies": [
        "phase-2"
      ],
      "is_final": false,
      "iteration": 1,
      "plan_items": [
        {
          "plan_item_id": "phase-3-minscore",
          "order": 1,
          "title": "Terminate result emission below the similarity threshold",
          "description": "Extend VSIM_execute with a minscore parameter and break out of the reply loop when similarity drops under it.",
          "detailed_description": "Candidates come back sorted by cosine distance, so similarity computed as one minus half the distance is monotonically non-increasing; the loop can break at the first result under the threshold. MINSCORE 0.85 therefore reads as: return at most COUNT items, but stop once similarity drops below 0.85. The same check runs on the TRUTH linear-scan path and alongside FILTER expressions.",
          "dependencies": [
            "phase-2-propagation"
          ],
          "status": "completed",
          "created_at": "2026-04-14T09:00:55.000Z",
          "file_changes": [
            {
              "path": "modules/vector-sets/vset.c",
              "action": "modify",
              "purpose": "Thread the minscore parameter through VSIM_execute and stop emitting results once similarity drops below the threshold."
            }
          ],
          "verification_criteria": [
            "Result emission stops the moment similarity, computed as one minus half the cosine distance, drops below the threshold.",
            "MINSCORE composes with COUNT, WITHSCORES, FILTER, and the TRUTH linear scan path."
          ]
        },
        {
          "plan_item_id": "phase-3-exclusivity",
          "order": 2,
          "title": "Validate the option and carry it through the worker thread",
          "description": "Enforce the zero-to-one range, reject EPSILON with MINSCORE, and pass the threshold into the threaded VSIM path.",
          "detailed_description": "Track epsilon_specified and minscore_specified during parsing and fail with the mutually exclusive error before any search work starts. Because VSIM runs on a worker thread by default, the threshold travels in the thread argument vector as a heap-allocated double freed by the worker, with the NOTHREAD and thread-creation-failure paths falling back to the same synchronous execution.",
          "dependencies": [
            "phase-3-minscore"
          ],
          "status": "completed",
          "created_at": "2026-04-14T09:01:10.000Z",
          "file_changes": [
            {
              "path": "modules/vector-sets/vset.c",
              "action": "modify",
              "purpose": "Validate the MINSCORE range, reject EPSILON plus MINSCORE together, and carry the threshold into the VSIM worker thread."
            },
            {
              "path": "modules/vector-sets/commands.json",
              "action": "modify",
              "purpose": "Document the MINSCORE double token next to EPSILON on VSIM."
            }
          ],
          "verification_criteria": [
            "MINSCORE outside the zero-to-one range fails with ERR invalid MINSCORE.",
            "Combining EPSILON and MINSCORE fails with the mutually exclusive error before any search runs.",
            "The threaded VSIM path receives the threshold, so blocked clients see identical results to NOTHREAD runs."
          ]
        }
      ],
      "diagrams": [
        {
          "diagram_id": "plan-phase-3-diagram",
          "type": "mermaid",
          "title": "MINSCORE early termination",
          "description": "Emission over distance-sorted candidates stops at the first result whose similarity falls below the threshold.",
          "mermaid_code": "flowchart TD\n  Query[VSIM query vector] --> Search[HNSW candidate search]\n  Search --> Sorted[Candidates sorted by distance]\n  Sorted --> Check{Similarity below MINSCORE}\n  Check -- yes --> Stop[Stop emitting results]\n  Check -- no --> Emit[Emit element and optional score]\n  Emit --> Sorted",
          "generated_at": "2026-04-14T09:01:25.000Z"
        }
      ]
    },
    {
      "phase_id": "phase-4",
      "name": "VINFO DETAIL and graph statistics",
      "description": "Collect link and level statistics from the HNSW internals and expose them through an optional VINFO DETAIL reply.",
      "summary": "Add hnswStats and hnsw_collect_stats to walk every node and layer under the global read lock, tallying link totals, layer-zero degrees, isolated nodes, and a level histogram. VINFO grows from nine to sixteen fields under DETAIL with projection, footprint, coverage, effort defaults, and graph statistics, while the plain reply stays untouched.",
      "dependencies": [
        "phase-3"
      ],
      "is_final": false,
      "iteration": 1,
      "plan_items": [
        {
          "plan_item_id": "phase-4-stats",
          "order": 1,
          "title": "Collect link and level statistics from the HNSW graph",
          "description": "Add an hnswStats aggregate and a hnsw_collect_stats walk over every node and layer of the index.",
          "detailed_description": "Declare `hnswStats` in hnsw.h with node count, total and layer-zero link counts, max degrees, isolated node count, and a level histogram bounded by HNSW_MAX_LEVEL, which moves from hnsw.c into the header so the module can size the histogram. `hnsw_collect_stats` walks the node list under the global read lock so a concurrent VSIM worker never observes a torn index.",
          "dependencies": [
            "phase-3-exclusivity"
          ],
          "status": "completed",
          "created_at": "2026-04-14T09:01:55.000Z",
          "file_changes": [
            {
              "path": "modules/vector-sets/hnsw.h",
              "action": "modify",
              "purpose": "Declare hnswStats with link totals, degrees, isolated node count, and the level histogram; hoist HNSW_MAX_LEVEL into the header."
            },
            {
              "path": "modules/vector-sets/hnsw.c",
              "action": "modify",
              "purpose": "Implement hnsw_collect_stats walking every node and layer under the global read lock."
            }
          ],
          "verification_criteria": [
            "hnsw_collect_stats takes the global read lock and returns totals without mutating the index.",
            "The level histogram is bounded by HNSW_MAX_LEVEL, now shared through hnsw.h."
          ]
        },
        {
          "plan_item_id": "phase-4-detail-reply",
          "order": 2,
          "title": "Extend VINFO with the DETAIL diagnostics map",
          "description": "Accept the optional DETAIL token and grow the reply with projection, footprint, coverage, and graph statistics.",
          "detailed_description": "With DETAIL, the reply map grows from nine to sixteen fields: projection-enabled, bytes-per-vector, estimated-vector-bytes, attribute-coverage, avg-level, a search-defaults map with the build and search effort defaults, and a graph-stats map covering total links, undirected edges, average and maximum degrees, isolated nodes, and the per-level histogram. Plain VINFO output is byte-for-byte unchanged.",
          "dependencies": [
            "phase-4-stats"
          ],
          "status": "completed",
          "created_at": "2026-04-14T09:02:10.000Z",
          "file_changes": [
            {
              "path": "modules/vector-sets/vset.c",
              "action": "modify",
              "purpose": "Accept the optional DETAIL token and grow the VINFO map from nine to sixteen fields with projection, footprint, coverage, and graph statistics."
            },
            {
              "path": "modules/vector-sets/commands.json",
              "action": "modify",
              "purpose": "Relax VINFO arity and document the optional DETAIL pure token."
            }
          ],
          "verification_criteria": [
            "VINFO key DETAIL returns sixteen fields including projection-enabled, bytes-per-vector, attribute-coverage, and graph-stats.",
            "Plain VINFO keeps its existing nine field reply, so current clients are unaffected.",
            "level-histogram maps every level up to the current maximum to its node count."
          ]
        }
      ],
      "diagrams": [
        {
          "diagram_id": "plan-phase-4-diagram",
          "type": "mermaid",
          "title": "VINFO DETAIL stats collection",
          "description": "DETAIL triggers a locked walk of the HNSW graph whose totals feed the extended reply map.",
          "mermaid_code": "flowchart LR\n  Vinfo[VINFO key DETAIL] --> Collect[hnsw collect stats]\n  Collect --> Walk[Walk every node and layer]\n  Walk --> Links[Link totals and degrees]\n  Walk --> Levels[Level histogram]\n  Links --> Reply[Sixteen field detail map]\n  Levels --> Reply\n  Vinfo --> Base[Nine field base map]\n  Base --> Reply",
          "generated_at": "2026-04-14T09:02:25.000Z"
        }
      ]
    },
    {
      "phase_id": "phase-5",
      "name": "Regression hardening and release packaging",
      "description": "Land dedicated regression suites and package the docs and examples that make the bundle release ready.",
      "summary": "Add focused suites for batch ingestion, FP32 batches, projection, MINSCORE, and DETAIL, and extend persistence, replication, and basic-command coverage over the new surfaces. Finish the README, teach the cli-tool to render nested DETAIL maps, and move glove-100 ingestion to VBATCH so the examples exercise the real feature.",
      "dependencies": [
        "phase-4"
      ],
      "is_final": true,
      "iteration": 1,
      "plan_items": [
        {
          "plan_item_id": "phase-5-regression",
          "order": 1,
          "title": "Cover the bundle with focused regression suites",
          "description": "Add per-feature test files under the module test runner and extend persistence coverage across RDB reloads.",
          "detailed_description": "New suites cover VBATCH VALUES insert-plus-update flows with SETATTR, the FP32 blob form with dimension consistency, VBATCH under REDUCE projection, MINSCORE thresholds including the EPSILON exclusivity error, and the full DETAIL reply shape. The existing persistence suite additionally asserts that DETAIL diagnostics survive an RDB reload of a projected set, and basic_commands picks up a VBATCH smoke path.",
          "dependencies": [
            "phase-4-detail-reply"
          ],
          "status": "completed",
          "created_at": "2026-04-14T09:02:50.000Z",
          "file_changes": [
            {
              "path": "modules/vector-sets/tests/batch_ingest.py",
              "action": "create",
              "purpose": "Cover VBATCH VALUES insert, update, and SETATTR persistence."
            },
            {
              "path": "modules/vector-sets/tests/batch_fp32.py",
              "action": "create",
              "purpose": "Cover the FP32 blob batch form and dimension consistency."
            },
            {
              "path": "modules/vector-sets/tests/batch_projection.py",
              "action": "create",
              "purpose": "Cover VBATCH under REDUCE random projection."
            },
            {
              "path": "modules/vector-sets/tests/minscore.py",
              "action": "create",
              "purpose": "Cover threshold filtering and the EPSILON exclusivity error."
            },
            {
              "path": "modules/vector-sets/tests/vinfo_detail.py",
              "action": "create",
              "purpose": "Cover the sixteen field DETAIL reply and graph statistics."
            },
            {
              "path": "modules/vector-sets/tests/persistence.py",
              "action": "modify",
              "purpose": "Assert DETAIL diagnostics survive an RDB reload of a projected set."
            }
          ],
          "verification_criteria": [
            "batch_ingest, batch_fp32, batch_projection, minscore, and vinfo_detail suites pass alongside the existing module tests.",
            "Persistence coverage proves DETAIL diagnostics survive an RDB reload of a projected set.",
            "basic_commands exercises a VBATCH smoke path next to VADD, VDIM, and VCARD."
          ]
        },
        {
          "plan_item_id": "phase-5-docs",
          "order": 2,
          "title": "Package docs and examples for the release",
          "description": "Document the three surfaces in the README and wire the example tooling to actually use them.",
          "detailed_description": "The README gains VBATCH, MINSCORE, and DETAIL sections using the exact option tokens the parser accepts. The cli-tool learns to render nested map replies so VINFO DETAIL output reads cleanly, its README shows VBATCH, MINSCORE, and DETAIL sessions, glove-100 ingestion switches from per-element VADD calls to VBATCH batches, and recall.py grows a minscore flag for threshold recall runs.",
          "dependencies": [
            "phase-5-regression"
          ],
          "status": "completed",
          "created_at": "2026-04-14T09:03:05.000Z",
          "file_changes": [
            {
              "path": "modules/vector-sets/README.md",
              "action": "modify",
              "purpose": "Document VBATCH, the MINSCORE option, and the VINFO DETAIL diagnostics with worked examples."
            },
            {
              "path": "modules/vector-sets/examples/cli-tool/cli.py",
              "action": "modify",
              "purpose": "Render nested map replies so VINFO DETAIL output reads cleanly in the interactive CLI."
            },
            {
              "path": "modules/vector-sets/examples/cli-tool/README.md",
              "action": "modify",
              "purpose": "Show VBATCH, MINSCORE, and DETAIL sessions in the CLI walkthrough."
            },
            {
              "path": "modules/vector-sets/examples/glove-100/insert.py",
              "action": "modify",
              "purpose": "Ingest the glove embeddings through VBATCH batches instead of per-element VADD calls."
            },
            {
              "path": "modules/vector-sets/examples/glove-100/recall.py",
              "action": "modify",
              "purpose": "Add a minscore flag for threshold recall runs."
            }
          ],
          "verification_criteria": [
            "The README documents VBATCH, MINSCORE, and DETAIL with the same option tokens the parser accepts.",
            "glove-100 ingestion runs through VBATCH and recall.py exposes a minscore flag."
          ]
        }
      ],
      "diagrams": []
    }
  ],
  "current_phase_index": 5,
  "validation_history": [
    {
      "phase_id": "phase-0",
      "validated_at": "2026-04-14T09:03:20.000Z",
      "status": "approved",
      "notes": "Contracts confirmed against the implementation handoff: VBATCH replies with newly added elements only, EPSILON and MINSCORE are mutually exclusive spellings of one threshold, and plain VINFO keeps its nine field reply."
    },
    {
      "phase_id": "phase-3",
      "validated_at": "2026-04-14T09:03:45.000Z",
      "status": "approved",
      "notes": "MINSCORE semantics approved: similarity is one minus half the cosine distance, emission stops at the first result under the threshold, and the VSIM worker thread carries the same cutoff as the NOTHREAD path."
    }
  ],
  "is_complete": true,
  "summary": "Ship Vector Search 2.0 for the vector-sets module in six phases: lock the command contracts, build the VBATCH validation and apply passes, add MINSCORE threshold search, expose VINFO DETAIL graph diagnostics, then harden with regression suites and release-ready docs and examples.",
  "estimated_total_effort": "6 engineering phases across the real vector-sets touchpoints: vset.c command surfaces, hnsw.c and hnsw.h graph statistics, commands.json metadata, the module regression suites under tests/, and the README plus cli-tool and glove-100 examples"
};

const VECTOR_DEMO_LAYERS: TaskLayer[] = [
  {
    "id": "layer-0",
    "title": "Design lock and command contracts",
    "status": "COMPLETED",
    "layer_order": 0,
    "tasks": [
      {
        "id": "task-0-1",
        "title": "Freeze VBATCH, VSIM MINSCORE and VINFO DETAIL command surfaces",
        "file": "modules/vector-sets/commands.json",
        "status": "COMPLETED",
        "tests": {
          "total": 3,
          "passed": 3
        },
        "testCode": "redis-cli --json COMMAND DOCS VBATCH VSIM VINFO",
        "testResults": [
          {
            "name": "command contract review",
            "status": "PASSED"
          }
        ],
        "changes": [
          {
            "path": "modules/vector-sets/commands.json",
            "lang": "json",
            "content": "diff --git a/modules/vector-sets/commands.json b/modules/vector-sets/commands.json\nindex 5f42f876a..f1ad09784 100644\n--- a/modules/vector-sets/commands.json\n+++ b/modules/vector-sets/commands.json\n@@ -99,3 +99,10 @@\n       \"DENYOOM\"\n     ]\n   },\n+  \"VBATCH\": {\n+    \"summary\": \"Insert or update many vector-set elements in one request\",\n+    \"complexity\": \"O(M*log(N)) for a batch of M elements into a vector set of size N.\",\n+    \"group\": \"vector_set\",\n+    \"since\": \"8.4.0\",\n+    \"arity\": -6,\n+    \"function\": \"vbatchCommand\",\n@@ -184,6 +276,12 @@\n         \"type\": \"double\",\n         \"optional\": true\n       },\n+      {\n+        \"token\": \"MINSCORE\",\n+        \"name\": \"min_score\",\n+        \"type\": \"double\",\n+        \"optional\": true\n+      },\n       {\n         \"token\": \"EF\",\n         \"name\": \"search-exploration-factor\",\n@@ -321,6 +419,12 @@\n       {\n         \"name\": \"key\",\n         \"type\": \"key\"\n+      },\n+      {\n+        \"token\": \"DETAIL\",\n+        \"name\": \"detail\",\n+        \"type\": \"pure-token\",\n+        \"optional\": true\n       }\n     ]\n   },"
          },
          {
            "path": "modules/vector-sets/README.md",
            "lang": "markdown",
            "content": "diff --git a/modules/vector-sets/README.md b/modules/vector-sets/README.md\nindex d0f520c23..e363ac020 100644\n--- a/modules/vector-sets/README.md\n+++ b/modules/vector-sets/README.md\n@@ -66,1 +66,10 @@\n \n+**VBATCH: add or update many items into a vector set**\n+\n+    VBATCH key [REDUCE dim] VALUES dim count element value1 ... valueN [SETATTR json] ...\n+               [EF build-exploration-factor] [NOQUANT | Q8 | BIN] [M <numlinks>]\n+    VBATCH key [REDUCE dim] FP32 count element vector [SETATTR json] ...\n+               [EF build-exploration-factor] [NOQUANT | Q8 | BIN] [M <numlinks>]\n+\n+`VBATCH` validates the full payload before mutating the vector set, then applies all inserts and updates sequentially. The reply is the number of newly added elements. Existing elements are updated in place and are not counted in the reply.\n+\n@@ -269,7 +292,7 @@\n \n **VINFO: introspection command that shows info about a vector set**\n \n-    VINFO key\n+    VINFO key [DETAIL]\n \n Example:\n \n@@ -287,6 +310,15 @@\n     11) hnsw-max-node-uid\n     12) (integer) 3000000\n \n+With the optional `DETAIL` token, `VINFO` returns additional diagnostics that are useful during development and tuning sessions:\n+\n+- projection usage\n+- bytes per stored vector\n+- estimated vector storage footprint\n+- attribute coverage\n+- default build/search effort\n+- graph link statistics and level histogram\n+\n **VSETATTR: associate or remove the JSON attributes of elements**\n \n     VSETATTR key element \"{... json ...}\""
          }
        ],
        "logs": [
          "Locked the VBATCH reply contract to the number of newly added elements only",
          "Registered MINSCORE next to EPSILON on VSIM: same threshold, expressed in similarity units",
          "Relaxed VINFO arity from 2 to -2 so the optional DETAIL token stays backward compatible"
        ]
      }
    ]
  },
  {
    "id": "layer-1",
    "title": "VBATCH bulk ingestion path",
    "status": "COMPLETED",
    "layer_order": 1,
    "tasks": [
      {
        "id": "task-1-1",
        "title": "Parse and validate the full VBATCH payload before mutation",
        "file": "modules/vector-sets/vset.c",
        "status": "COMPLETED",
        "tests": {
          "total": 3,
          "passed": 3
        },
        "testCode": "cd modules/vector-sets && python3 test.py --primary-port 6379",
        "testResults": [
          {
            "name": "VBATCH FP32 insert validation",
            "status": "PASSED"
          }
        ],
        "changes": [
          {
            "path": "modules/vector-sets/vset.c",
            "lang": "c",
            "content": "diff --git a/modules/vector-sets/vset.c b/modules/vector-sets/vset.c\nindex 618723e91..ca3eb3ee3 100644\n--- a/modules/vector-sets/vset.c\n+++ b/modules/vector-sets/vset.c\n@@ -788,2 +835,16 @@ int VADD_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc) {\n     return REDISMODULE_OK;\n }\n+\n+/* VBATCH key [REDUCE dim] FP32 count element blob [SETATTR json] ...\n+ *              [EF build-ef] [NOQUANT | BIN | Q8] [M count]\n+ * VBATCH key [REDUCE dim] VALUES dim count element value1 .. valueN\n+ *              [SETATTR json] ... [EF build-ef] [NOQUANT | BIN | Q8] [M count]\n+ *\n+ * The command validates the full payload before mutating the set, then applies\n+ * inserts and updates sequentially using the same semantics as VADD. The reply\n+ * is the number of newly added elements. Updated elements are not counted. */\n+int VBATCH_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc) {\n+    RedisModule_AutoMemory(ctx);\n+\n+    if (argc < 6) return RedisModule_WrongArity(ctx);\n+\n@@ -790,0 +888,22 @@ int VBATCH_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc)\n+    struct vbatchItem *items = RedisModule_Calloc(item_count, sizeof(*items));\n+    if (items == NULL) return RedisModule_ReplyWithError(ctx, \"ERR out of memory\");\n+\n+    for (long long i = 0; i < item_count; i++) {\n+        if (j >= argc) {\n+            freeVBatchItems(items, item_count);\n+            return RedisModule_WrongArity(ctx);\n+        }\n+\n+        items[i].item = argv[j++];\n+        if (values_format) {\n+            if (argc < j + (int)dim) {\n+                freeVBatchItems(items, item_count);\n+                return RedisModule_WrongArity(ctx);\n+            }\n+            items[i].vec = parseValuesVectorSlice(argv, j, dim);\n+            if (items[i].vec == NULL) {\n+                freeVBatchItems(items, item_count);\n+                return RedisModule_ReplyWithError(ctx, \"ERR invalid VALUES vector\");\n+            }\n+            j += dim;\n+        } else {"
          }
        ],
        "logs": [
          "VBATCH shares vector parsing with VADD via parseValuesVectorSlice and parseFp32VectorBlob",
          "The whole batch is walked and validated before any mutation: bad element, vector or SETATTR pair aborts with no partial writes",
          "FP32 batches enforce a uniform vector dimension across all elements before the apply pass"
        ]
      },
      {
        "id": "task-1-2",
        "title": "Apply batch inserts and reply with the newly added count",
        "file": "modules/vector-sets/vset.c",
        "status": "COMPLETED",
        "tests": {
          "total": 4,
          "passed": 4
        },
        "testCode": "cd modules/vector-sets && python3 test.py --primary-port 6379 --replica-port 6380",
        "testResults": [
          {
            "name": "VBATCH VALUES insert and update",
            "status": "PASSED"
          },
          {
            "name": "VBATCH REDUCE projection support",
            "status": "PASSED"
          }
        ],
        "changes": [
          {
            "path": "modules/vector-sets/vset.c",
            "lang": "c",
            "content": "diff --git a/modules/vector-sets/vset.c b/modules/vector-sets/vset.c\nindex 618723e91..ca3eb3ee3 100644\n--- a/modules/vector-sets/vset.c\n+++ b/modules/vector-sets/vset.c\n@@ -788,2 +1001,31 @@ int VBATCH_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc)\n+        RedisModule_ModuleTypeSetValue(key, VectorSetType, vset);\n+    } else {\n+        vset = RedisModule_ModuleTypeGetValue(key);\n+        if (vectorSetValidateInsertParameters(ctx, vset, dim, reduce_dim,\n+                                              quant_type, hnsw_create_M)\n+            != REDISMODULE_OK)\n+        {\n+            freeVBatchItems(items, item_count);\n+            return REDISMODULE_OK;\n+        }\n+    }\n+\n+    for (long long i = 0; i < item_count; i++) {\n+        size_t item_dim = dim;\n+        if (vectorSetProjectInputVector(vset, &items[i].vec, &item_dim) != REDISMODULE_OK) {\n+            freeVBatchItems(items, item_count);\n+            return RedisModule_ReplyWithError(ctx, \"ERR unable to project vector\");\n+        }\n+    }\n+\n+    int added = 0;\n+    for (long long i = 0; i < item_count; i++) {\n+        added += vectorSetInsert(vset, items[i].vec, NULL, 0,\n+                                 items[i].item, items[i].attrib, 1, ef);\n+    }\n+\n+    freeVBatchItems(items, item_count);\n+    RedisModule_ReplyWithLongLong(ctx, added);\n+    RedisModule_ReplicateVerbatim(ctx);\n     return REDISMODULE_OK;\n }"
          },
          {
            "path": "modules/vector-sets/tests/batch_ingest.py",
            "lang": "python",
            "content": "diff --git a/modules/vector-sets/tests/batch_ingest.py b/modules/vector-sets/tests/batch_ingest.py\nnew file mode 100644\nindex 000000000..6a10b2c93\n--- /dev/null\n+++ b/modules/vector-sets/tests/batch_ingest.py\n@@ -0,0 +1,35 @@\n+from test import TestCase\n+\n+\n+class BatchIngest(TestCase):\n+    def getname(self):\n+        return \"VBATCH VALUES insert and update\"\n+\n+    def test(self):\n+        added = self.redis.execute_command(\n+            'VBATCH', self.test_key, 'VALUES', 3, 3,\n+            f'{self.test_key}:item:1', '1', '0', '0', 'SETATTR', '{\"tag\":\"alpha\"}',\n+            f'{self.test_key}:item:2', '0', '1', '0',\n+            f'{self.test_key}:item:3', '0', '0', '1',\n+        )\n+        assert added == 3, f\"Expected 3 inserted items, got {added}\"\n+        assert self.redis.execute_command('VCARD', self.test_key) == 3, \"VCARD should be 3 after first batch\"\n+\n+        attrs = self.redis.execute_command('VGETATTR', self.test_key, f'{self.test_key}:item:1')\n+        assert attrs.decode() == '{\"tag\":\"alpha\"}', \"VBATCH SETATTR should persist attributes\"\n+\n+        added = self.redis.execute_command(\n+            'VBATCH', self.test_key, 'VALUES', 3, 2,\n+            f'{self.test_key}:item:2', '1', '0', '0',\n+            f'{self.test_key}:item:4', '0', '1', '1', 'SETATTR', '{\"tag\":\"beta\"}',\n+        )\n+        assert added == 1, f\"Expected 1 newly added item after update batch, got {added}\"\n+        assert self.redis.execute_command('VCARD', self.test_key) == 4, \"VCARD should be 4 after update batch\"\n+\n+        # Item 2 should now be the closest match to the first basis vector.\n+        result = self.redis.execute_command(\n+            'VSIM', self.test_key, 'VALUES', 3, '1', '0', '0',\n+            'COUNT', 3, 'WITHSCORES'\n+        )\n+        items = [result[i].decode() for i in range(0, len(result), 2)]\n+        assert f'{self.test_key}:item:2' in items, \"Updated item should still be returned for the matching query\""
          }
        ],
        "logs": [
          "Existing keys go through vectorSetValidateInsertParameters to reject quantization, M and dimension mismatches",
          "Reply counts only newly added elements; in-place updates are applied but not counted",
          "VBATCH replicates verbatim so replicas rebuild the identical batch deterministically"
        ]
      }
    ]
  },
  {
    "id": "layer-2",
    "title": "VSIM MINSCORE threshold search",
    "status": "COMPLETED",
    "layer_order": 2,
    "tasks": [
      {
        "id": "task-2-1",
        "title": "Parse MINSCORE and reject combining it with EPSILON",
        "file": "modules/vector-sets/vset.c",
        "status": "COMPLETED",
        "tests": {
          "total": 2,
          "passed": 2
        },
        "testCode": "cd modules/vector-sets && python3 test.py --primary-port 6379",
        "testResults": [
          {
            "name": "minscore argument validation",
            "status": "PASSED"
          }
        ],
        "changes": [
          {
            "path": "modules/vector-sets/vset.c",
            "lang": "c",
            "content": "diff --git a/modules/vector-sets/vset.c b/modules/vector-sets/vset.c\nindex 618723e91..ca3eb3ee3 100644\n--- a/modules/vector-sets/vset.c\n+++ b/modules/vector-sets/vset.c\n@@ -1076,6 +1326,17 @@ int VSIM_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc) {\n                 if (filter_expr) exprFree(filter_expr);\n                 return RedisModule_ReplyWithError(ctx, \"ERR invalid EPSILON\");\n             }\n+            epsilon_specified = 1;\n+            j += 2;\n+        } else if (!strcasecmp(opt, \"MINSCORE\") && j+1 < argc) {\n+            if (RedisModule_StringToDouble(argv[j+1], &minscore) !=\n+                REDISMODULE_OK || minscore < 0 || minscore > 1)\n+            {\n+                RedisModule_Free(vec);\n+                if (filter_expr) exprFree(filter_expr);\n+                return RedisModule_ReplyWithError(ctx, \"ERR invalid MINSCORE\");\n+            }\n+            minscore_specified = 1;\n             j += 2;\n         } else if (!strcasecmp(opt, \"EF\") && j+1 < argc) {\n             if (RedisModule_StringToLongLong(argv[j+1], &ef) !=\n@@ -1118,6 +1379,13 @@ int VSIM_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc) {\n         }\n     }\n \n+    if (epsilon_specified && minscore_specified) {\n+        RedisModule_Free(vec);\n+        if (filter_expr) exprFree(filter_expr);\n+        return RedisModule_ReplyWithError(ctx,\n+            \"ERR EPSILON and MINSCORE are mutually exclusive\");\n+    }\n+\n     int threaded_request = 1; // Run on a thread, by default.\n     if (filter_ef == 0) filter_ef = count * 100; // Max filter visited nodes.\n "
          }
        ],
        "logs": [
          "MINSCORE accepts doubles in [0,1]; anything else fails with ERR invalid MINSCORE",
          "Specifying both options fails with ERR EPSILON and MINSCORE are mutually exclusive",
          "Threaded VSIM path forwards minscore through targ[11] into VSIM_thread"
        ]
      },
      {
        "id": "task-2-2",
        "title": "Convert the threshold to similarity space and cut traversal at MINSCORE",
        "file": "modules/vector-sets/vset.c",
        "status": "COMPLETED",
        "tests": {
          "total": 3,
          "passed": 3
        },
        "testCode": "cd modules/vector-sets && python3 test.py --primary-port 6379",
        "testResults": [
          {
            "name": "VSIM MINSCORE threshold search",
            "status": "PASSED"
          }
        ],
        "changes": [
          {
            "path": "modules/vector-sets/vset.c",
            "lang": "c",
            "content": "diff --git a/modules/vector-sets/vset.c b/modules/vector-sets/vset.c\nindex 618723e91..ca3eb3ee3 100644\n--- a/modules/vector-sets/vset.c\n+++ b/modules/vector-sets/vset.c\n@@ -805,9 +1047,9 @@ int vectorSetFilterCallback(void *value, void *privdata) {\n  * to the vset object is handled by the caller, however the function\n  * handles the HNSW locking explicitly. */\n void VSIM_execute(RedisModuleCtx *ctx, struct vsetObject *vset,\n-    float *vec, unsigned long count, float epsilon, unsigned long withscores,\n-    unsigned long withattribs, unsigned long ef, exprstate *filter_expr,\n-    unsigned long filter_ef, int ground_truth)\n+    float *vec, unsigned long count, float epsilon, double minscore,\n+    unsigned long withscores, unsigned long withattribs, unsigned long ef,\n+    exprstate *filter_expr, unsigned long filter_ef, int ground_truth)\n {\n     /* In our scan, we can't just collect 'count' elements as\n      * if count is small we would explore the graph in an insufficient\n@@ -855,6 +1097,8 @@ void VSIM_execute(RedisModuleCtx *ctx, struct vsetObject *vset,\n     long long arraylen = 0;\n     for (unsigned int i = 0; i < found && i < count; i++) {\n         if (distances[i]/2 > epsilon) break;\n+        double similarity = 1.0 - distances[i]/2.0;\n+        if (similarity < minscore) break;\n         struct vsetNodeVal *nv = neighbors[i]->value;\n         RedisModule_ReplyWithString(ctx, nv->item);\n         arraylen++;\n@@ -872,7 +1116,7 @@ void VSIM_execute(RedisModuleCtx *ctx, struct vsetObject *vset,\n \n         if (withscores) {\n             /* The similarity score is provided in a 0-1 range. */\n-            RedisModule_ReplyWithDouble(ctx, 1.0 - distances[i]/2.0);\n+            RedisModule_ReplyWithDouble(ctx, similarity);\n         }\n         if (withattribs) {\n             /* Return the attributes as well, if any. */"
          },
          {
            "path": "modules/vector-sets/tests/minscore.py",
            "lang": "python",
            "content": "diff --git a/modules/vector-sets/tests/minscore.py b/modules/vector-sets/tests/minscore.py\nnew file mode 100644\nindex 000000000..b996f11a8\n--- /dev/null\n+++ b/modules/vector-sets/tests/minscore.py\n@@ -0,0 +1,36 @@\n+from test import TestCase\n+import redis\n+\n+\n+class MinScoreOption(TestCase):\n+    def getname(self):\n+        return \"VSIM MINSCORE threshold search\"\n+\n+    def test(self):\n+        self.redis.execute_command('VADD', self.test_key, 'VALUES', '2', '1', '0', 'perfect')\n+        self.redis.execute_command('VADD', self.test_key, 'VALUES', '2', '0.8', '0.2', 'close')\n+        self.redis.execute_command('VADD', self.test_key, 'VALUES', '2', '0', '1', 'orthogonal')\n+        self.redis.execute_command('VADD', self.test_key, 'VALUES', '2', '-1', '0', 'opposite')\n+\n+        result = self.redis.execute_command(\n+            'VSIM', self.test_key, 'VALUES', '2', '1', '0',\n+            'COUNT', 10, 'WITHSCORES', 'MINSCORE', '0.9'\n+        )\n+        items = [result[i].decode() for i in range(0, len(result), 2)]\n+        assert items == ['perfect', 'close'], f\"MINSCORE 0.9 should keep the close matches, got {items}\"\n+\n+        result = self.redis.execute_command(\n+            'VSIM', self.test_key, 'VALUES', '2', '1', '0',\n+            'COUNT', 10, 'WITHSCORES', 'MINSCORE', '0.99'\n+        )\n+        items = [result[i].decode() for i in range(0, len(result), 2)]\n+        assert items == ['perfect'], f\"MINSCORE 0.99 should keep only the exact match, got {items}\"\n+\n+        try:\n+            self.redis.execute_command(\n+                'VSIM', self.test_key, 'VALUES', '2', '1', '0',\n+                'EPSILON', '0.1', 'MINSCORE', '0.9'\n+            )\n+            raise AssertionError(\"EPSILON and MINSCORE should not be accepted together\")\n+        except redis.ResponseError as e:\n+            assert \"mutually exclusive\" in str(e), f\"Unexpected MINSCORE/EPSILON error: {e}\""
          }
        ],
        "logs": [
          "Similarity is computed once per candidate as 1 - distance/2 and reused for WITHSCORES",
          "Reply loop breaks as soon as similarity drops below MINSCORE, before the COUNT limit is reached",
          "tests/minscore.py covers threshold filtering plus the EPSILON exclusion error path"
        ]
      }
    ]
  },
  {
    "id": "layer-3",
    "title": "VINFO DETAIL diagnostics",
    "status": "COMPLETED",
    "layer_order": 3,
    "tasks": [
      {
        "id": "task-3-1",
        "title": "Collect HNSW link statistics and the level histogram",
        "file": "modules/vector-sets/hnsw.c",
        "status": "COMPLETED",
        "tests": {
          "total": 3,
          "passed": 3
        },
        "testCode": "cd modules/vector-sets && make && ./test.py --primary-port 6379",
        "testResults": [
          {
            "name": "graph stats collection",
            "status": "PASSED"
          }
        ],
        "changes": [
          {
            "path": "modules/vector-sets/hnsw.h",
            "lang": "c",
            "content": "diff --git a/modules/vector-sets/hnsw.h b/modules/vector-sets/hnsw.h\nindex 8935521a6..e889ae54c 100644\n--- a/modules/vector-sets/hnsw.h\n+++ b/modules/vector-sets/hnsw.h\n@@ -17,6 +17,7 @@\n #include <pthread.h>\n #include <stdatomic.h>\n\n+#define HNSW_MAX_LEVEL 16    /* Max level nodes can reach. */\n #define HNSW_DEFAULT_M  16     /* Used when 0 is given at creation time. */\n #define HNSW_MIN_M      4      /* Probably even too low already. */\n #define HNSW_MAX_M      4096   /* Safeguard sanity limit. */\n@@ -122,6 +123,18 @@ typedef struct hnswSerNode {\n     uint32_t params_count;\n } hnswSerNode;\n\n+typedef struct hnswStats {\n+    uint64_t node_count;\n+    uint64_t total_links;\n+    uint64_t layer0_links;\n+    uint64_t total_levels;\n+    uint32_t max_level;\n+    uint32_t max_layer0_degree;\n+    uint32_t max_links_per_node;\n+    uint64_t isolated_nodes;\n+    uint64_t level_histogram[HNSW_MAX_LEVEL + 1];\n+} hnswStats;\n+\n@@ -130,6 +143,7 @@ HNSW *hnsw_new(uint32_t vector_dim, uint32_t quant_type, uint32_t m);\n void hnsw_free(HNSW *index,void(*free_value)(void*value));\n void hnsw_node_free(hnswNode *node);\n void hnsw_print_stats(HNSW *index);\n+hnswStats hnsw_collect_stats(HNSW *index);"
          },
          {
            "path": "modules/vector-sets/hnsw.c",
            "lang": "c",
            "content": "diff --git a/modules/vector-sets/hnsw.c b/modules/vector-sets/hnsw.c\nindex 8420ff314..f43bc3bcc 100644\n--- a/modules/vector-sets/hnsw.c\n+++ b/modules/vector-sets/hnsw.c\n@@ -2941,6 +2940,44 @@ void hnsw_cursor_element_deleted(HNSW *index, hnswNode *deleted) {\n\n /* ============================ Debugging stuff ============================= */\n\n+hnswStats hnsw_collect_stats(HNSW *index) {\n+    hnswStats stats = {0};\n+    if (index == NULL) return stats;\n+\n+    pthread_rwlock_rdlock(&index->global_lock);\n+\n+    stats.node_count = index->node_count;\n+    stats.max_level = index->max_level;\n+\n+    hnswNode *current = index->head;\n+    while (current) {\n+        uint64_t node_total_links = 0;\n+\n+        stats.total_levels += current->level + 1;\n+        if (current->level <= HNSW_MAX_LEVEL)\n+            stats.level_histogram[current->level]++;\n+\n+        for (uint32_t layer = 0; layer <= current->level; layer++) {\n+            uint32_t layer_links = current->layers[layer].num_links;\n+            stats.total_links += layer_links;\n+            node_total_links += layer_links;\n+            if (layer == 0) {\n+                stats.layer0_links += layer_links;\n+                if (layer_links > stats.max_layer0_degree)\n+                    stats.max_layer0_degree = layer_links;\n+            }\n+        }\n+\n+        if (node_total_links == 0) stats.isolated_nodes++;\n+        if (node_total_links > stats.max_links_per_node)\n+            stats.max_links_per_node = node_total_links;\n+        current = current->next;\n+    }\n+\n+    pthread_rwlock_unlock(&index->global_lock);\n+    return stats;\n+}"
          }
        ],
        "logs": [
          "Moved HNSW_MAX_LEVEL into hnsw.h so hnswStats histogram sizing is shared with vset.c",
          "Walked the node list under the global read lock to count links, levels and isolated nodes",
          "Tracked max layer-0 degree separately since layer zero carries M*2 links"
        ]
      },
      {
        "id": "task-3-2",
        "title": "Assemble the VINFO DETAIL reply and cover it end to end",
        "file": "modules/vector-sets/vset.c",
        "status": "COMPLETED",
        "tests": {
          "total": 7,
          "passed": 7
        },
        "testCode": "cd modules/vector-sets && ./test.py --primary-port 6379",
        "testResults": [
          {
            "name": "VINFO DETAIL diagnostics",
            "status": "PASSED"
          }
        ],
        "changes": [
          {
            "path": "modules/vector-sets/vset.c",
            "lang": "c",
            "content": "diff --git a/modules/vector-sets/vset.c b/modules/vector-sets/vset.c\nindex 618723e91..ca3eb3ee3 100644\n--- a/modules/vector-sets/vset.c\n+++ b/modules/vector-sets/vset.c\n@@ -1490,7 +1763,14 @@ int VLINKS_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc)\n int VINFO_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc) {\n     RedisModule_AutoMemory(ctx);\n\n-    if (argc != 2) return RedisModule_WrongArity(ctx);\n+    if (argc != 2 && argc != 3) return RedisModule_WrongArity(ctx);\n+\n+    int detail = 0;\n+    if (argc == 3) {\n+        if (strcasecmp(RedisModule_StringPtrLen(argv[2], NULL), \"DETAIL\"))\n+            return RedisModule_ReplyWithError(ctx, \"ERR syntax error\");\n+        detail = 1;\n+    }\n@@ -1543,6 +1823,64 @@ int VINFO_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc)\n+    if (detail) {\n+        hnswStats stats = hnsw_collect_stats(vset->hnsw);\n+\n+        RedisModule_ReplyWithSimpleString(ctx, \"projection-enabled\");\n+        RedisModule_ReplyWithBool(ctx, vset->proj_matrix != NULL);\n+\n+        RedisModule_ReplyWithSimpleString(ctx, \"bytes-per-vector\");\n+        RedisModule_ReplyWithLongLong(ctx, hnsw_quants_bytes(vset->hnsw));\n+\n+        RedisModule_ReplyWithSimpleString(ctx, \"estimated-vector-bytes\");\n+        RedisModule_ReplyWithLongLong(ctx,\n+            hnsw_quants_bytes(vset->hnsw) * stats.node_count);\n+\n+        RedisModule_ReplyWithSimpleString(ctx, \"graph-stats\");\n+        RedisModule_ReplyWithMap(ctx, 8);\n+        RedisModule_ReplyWithSimpleString(ctx, \"total-links\");\n+        RedisModule_ReplyWithLongLong(ctx, stats.total_links);\n+        RedisModule_ReplyWithSimpleString(ctx, \"max-layer0-degree\");\n+        RedisModule_ReplyWithLongLong(ctx, stats.max_layer0_degree);\n+        RedisModule_ReplyWithSimpleString(ctx, \"level-histogram\");\n+        RedisModule_ReplyWithMap(ctx, stats.max_level + 1);\n+        for (uint32_t level = 0; level <= stats.max_level; level++) {\n+            RedisModule_ReplyWithLongLong(ctx, level);\n+            RedisModule_ReplyWithLongLong(ctx, stats.level_histogram[level]);\n+        }\n+    }"
          },
          {
            "path": "modules/vector-sets/tests/vinfo_detail.py",
            "lang": "python",
            "content": "diff --git a/modules/vector-sets/tests/vinfo_detail.py b/modules/vector-sets/tests/vinfo_detail.py\nnew file mode 100644\nindex 000000000..9579e2223\n--- /dev/null\n+++ b/modules/vector-sets/tests/vinfo_detail.py\n@@ -0,0 +1,36 @@\n+from test import TestCase\n+\n+\n+class VInfoDetail(TestCase):\n+    def getname(self):\n+        return \"VINFO DETAIL diagnostics\"\n+\n+    def test(self):\n+        self.redis.execute_command(\n+            'VBATCH', self.test_key, 'VALUES', 3, 3,\n+            f'{self.test_key}:item:1', '1', '0', '0', 'SETATTR', '{\"kind\":\"a\"}',\n+            f'{self.test_key}:item:2', '0', '1', '0',\n+            f'{self.test_key}:item:3', '0', '0', '1', 'SETATTR', '{\"kind\":\"b\"}',\n+        )\n+\n+        info = self.redis3.execute_command('VINFO', self.test_key, 'DETAIL')\n+        assert isinstance(info, dict), f\"RESP3 VINFO DETAIL should return a map, got {type(info)}\"\n+\n+        assert info[b'size'] == 3, f\"Expected size=3, got {info[b'size']}\"\n+        assert info[b'attributes-count'] == 2, f\"Expected 2 attributed nodes, got {info[b'attributes-count']}\"\n+        assert info[b'projection-enabled'] is False, \"Projection should be disabled for this set\"\n+        assert info[b'bytes-per-vector'] > 0, \"Detailed info should expose the vector byte size\"\n+\n+        graph_stats = info[b'graph-stats']\n+        assert graph_stats[b'total-links'] >= 0, \"Graph stats should expose total link count\"\n+        assert graph_stats[b'undirected-edges'] >= 0, \"Graph stats should expose undirected edge count\"\n+        assert graph_stats[b'max-layer0-degree'] >= 0, \"Graph stats should expose the max layer-0 degree\"\n+\n+        histogram = graph_stats[b'level-histogram']\n+        level_zero = histogram.get(0, histogram.get(b'0'))\n+        assert level_zero is not None and level_zero >= 1, \"Histogram should include layer zero nodes\""
          }
        ],
        "logs": [
          "Extended VINFO arity to -2 and parsed the optional DETAIL token",
          "Grew the reply map from 9 to 16 entries: projection usage, per-vector bytes, storage estimate, attribute coverage, search defaults, graph stats",
          "Asserted the nested RESP3 maps, including the level histogram, in tests/vinfo_detail.py"
        ]
      }
    ]
  },
  {
    "id": "layer-4",
    "title": "Persistence, replication, and regression hardening",
    "status": "COMPLETED",
    "layer_order": 4,
    "tasks": [
      {
        "id": "task-4-1",
        "title": "Propagate batched writes deterministically and verify reload safety",
        "file": "modules/vector-sets/vset.c",
        "status": "COMPLETED",
        "tests": {
          "total": 5,
          "passed": 5
        },
        "testCode": "cd modules/vector-sets && ./test.py --primary-port 6379 --replica-port 6380",
        "testResults": [
          {
            "name": "HNSW Persistence",
            "status": "PASSED"
          },
          {
            "name": "Comprehensive Replication Test with mixed operations",
            "status": "PASSED"
          }
        ],
        "changes": [
          {
            "path": "modules/vector-sets/vset.c",
            "lang": "c",
            "content": "diff --git a/modules/vector-sets/vset.c b/modules/vector-sets/vset.c\nindex 618723e91..ca3eb3ee3 100644\n--- a/modules/vector-sets/vset.c\n+++ b/modules/vector-sets/vset.c\n@@ -784,7 +831,202 @@ int VADD_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc) {\n     RedisModule_Free(vec);\n\n     RedisModule_ReplyWithBool(ctx,added);\n-    if (added) RedisModule_ReplicateVerbatim(ctx);\n+    RedisModule_ReplicateVerbatim(ctx);\n+    return REDISMODULE_OK;\n+}\n+\n+/* VBATCH key [REDUCE dim] FP32 count element blob [SETATTR json] ...\n+ *              [EF build-ef] [NOQUANT | BIN | Q8] [M count]\n+ * VBATCH key [REDUCE dim] VALUES dim count element value1 .. valueN\n+ *              [SETATTR json] ... [EF build-ef] [NOQUANT | BIN | Q8] [M count]\n+ *\n+ * The command validates the full payload before mutating the set, then applies\n+ * inserts and updates sequentially using the same semantics as VADD. The reply\n+ * is the number of newly added elements. Updated elements are not counted. */\n+int VBATCH_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc) {\n+    RedisModule_AutoMemory(ctx);\n+\n+    int added = 0;\n+    for (long long i = 0; i < item_count; i++) {\n+        added += vectorSetInsert(vset, items[i].vec, NULL, 0,\n+                                 items[i].item, items[i].attrib, 1, ef);\n+    }\n+\n+    freeVBatchItems(items, item_count);\n+    RedisModule_ReplyWithLongLong(ctx, added);\n+    RedisModule_ReplicateVerbatim(ctx);\n     return REDISMODULE_OK;\n }"
          },
          {
            "path": "modules/vector-sets/tests/persistence.py",
            "lang": "python",
            "content": "diff --git a/modules/vector-sets/tests/persistence.py b/modules/vector-sets/tests/persistence.py\nindex 79730f488..6c2e4e5b8 100644\n--- a/modules/vector-sets/tests/persistence.py\n+++ b/modules/vector-sets/tests/persistence.py\n@@ -51,6 +51,8 @@ class HNSWPersistence(TestCase):\n         initial_projected = self._verify_results(f\"{self.test_key}:projected\",\n                                                dim, query_vec_projected, reduced_dim)\n+        projected_info_before = self.redis3.execute_command(\n+            'VINFO', f\"{self.test_key}:projected\", 'DETAIL')\n\n         # Force Redis to save and reload the dataset\n         self.redis.execute_command('DEBUG', 'RELOAD')\n@@ -60,6 +62,8 @@ class HNSWPersistence(TestCase):\n         reloaded_projected = self._verify_results(f\"{self.test_key}:projected\",\n                                                 dim, query_vec_projected, reduced_dim)\n+        projected_info_after = self.redis3.execute_command(\n+            'VINFO', f\"{self.test_key}:projected\", 'DETAIL')\n@@ -82,5 +86,10 @@ class HNSWPersistence(TestCase):\n                 f\"before={initial_projected[key]:.6f}, after={reloaded_projected[key]:.6f}\"\n\n+        assert projected_info_before[b'projection-enabled'] is True, \\\n+            \"Projected set should report projection-enabled before reload\"\n+        assert projected_info_after[b'projection-enabled'] is True, \\\n+            \"Projected set should report projection-enabled after reload\"\n+\n         self.redis.delete(f\"{self.test_key}:normal\")\n         self.redis.delete(f\"{self.test_key}:projected\")"
          },
          {
            "path": "modules/vector-sets/tests/replication.py",
            "lang": "python",
            "content": "diff --git a/modules/vector-sets/tests/replication.py b/modules/vector-sets/tests/replication.py\nindex 91dfdf736..fd4d72d15 100644\n--- a/modules/vector-sets/tests/replication.py\n+++ b/modules/vector-sets/tests/replication.py\n@@ -15,6 +15,18 @@ class ComprehensiveReplicationTest(TestCase):\n         # Setup replication between primary and replica\n         assert self.setup_replication(), \"Failed to setup replication\"\n\n+        # Exercise replication of updates and batched inserts before the long run.\n+        seed_vec = struct.pack('8f', *generate_random_vector(8))\n+        updated_vec = struct.pack('8f', *generate_random_vector(8))\n+        self.redis.execute_command('VADD', self.test_key, 'FP32', seed_vec, f'{self.test_key}:seed')\n+        self.redis.execute_command('VADD', self.test_key, 'FP32', updated_vec, f'{self.test_key}:seed')\n+        self.redis.execute_command(\n+            'VBATCH', self.test_key, 'VALUES', 8, 2,\n+            f'{self.test_key}:batch:1', *[str(x) for x in generate_random_vector(8)],\n+            f'{self.test_key}:batch:2', *[str(x) for x in generate_random_vector(8)],\n+            'EF', 150\n+        )\n+\n         # Test parameters\n         num_vectors = 5000\n         vector_dim = 8"
          }
        ],
        "logs": [
          "VADD and VBATCH now replicate verbatim even when every element is an update, keeping replicas deterministic",
          "Asserted projection-enabled survives DEBUG RELOAD on the projected set in tests/persistence.py",
          "Seeded the replication run with a VADD update plus a VBATCH before the 5000-vector mixed workload"
        ]
      },
      {
        "id": "task-4-2",
        "title": "Lock in FP32 and projection batch regression coverage",
        "file": "modules/vector-sets/tests/batch_fp32.py",
        "status": "COMPLETED",
        "tests": {
          "total": 6,
          "passed": 6
        },
        "testCode": "cd modules/vector-sets && ./test.py --primary-port 6379",
        "testResults": [
          {
            "name": "VBATCH FP32 insert validation",
            "status": "PASSED"
          },
          {
            "name": "VBATCH REDUCE projection support",
            "status": "PASSED"
          },
          {
            "name": "VADD, VBATCH, VDIM, VCARD basic usage",
            "status": "PASSED"
          }
        ],
        "changes": [
          {
            "path": "modules/vector-sets/tests/batch_fp32.py",
            "lang": "python",
            "content": "diff --git a/modules/vector-sets/tests/batch_fp32.py b/modules/vector-sets/tests/batch_fp32.py\nnew file mode 100644\nindex 000000000..5784ad808\n--- /dev/null\n+++ b/modules/vector-sets/tests/batch_fp32.py\n@@ -0,0 +1,32 @@\n+from test import TestCase, generate_random_vector\n+import struct\n+import redis\n+\n+\n+class BatchFP32(TestCase):\n+    def getname(self):\n+        return \"VBATCH FP32 insert validation\"\n+\n+    def test(self):\n+        vec1 = struct.pack('4f', *generate_random_vector(4))\n+        vec2 = struct.pack('4f', *generate_random_vector(4))\n+\n+        added = self.redis.execute_command(\n+            'VBATCH', self.test_key, 'FP32', 2,\n+            f'{self.test_key}:item:1', vec1,\n+            f'{self.test_key}:item:2', vec2, 'SETATTR', '{\"source\":\"fp32\"}',\n+            'NOQUANT'\n+        )\n+        assert added == 2, f\"Expected 2 inserted items, got {added}\"\n+        assert self.redis.execute_command('VCARD', self.test_key) == 2, \"VCARD should match the batch size\"\n+\n+        bad_vec = struct.pack('3f', *generate_random_vector(3))\n+        try:\n+            self.redis.execute_command(\n+                'VBATCH', f'{self.test_key}:bad', 'FP32', 2,\n+                f'{self.test_key}:bad:1', vec1,\n+                f'{self.test_key}:bad:2', bad_vec\n+            )\n+            raise AssertionError(\"Mixed FP32 dimensions should fail\")\n+        except redis.ResponseError as e:\n+            assert \"same dimension\" in str(e), f\"Unexpected error for mismatched FP32 batch: {e}\""
          },
          {
            "path": "modules/vector-sets/tests/batch_projection.py",
            "lang": "python",
            "content": "diff --git a/modules/vector-sets/tests/batch_projection.py b/modules/vector-sets/tests/batch_projection.py\nnew file mode 100644\nindex 000000000..62adb450a\n--- /dev/null\n+++ b/modules/vector-sets/tests/batch_projection.py\n@@ -0,0 +1,32 @@\n+from test import TestCase\n+import redis\n+\n+\n+class BatchProjection(TestCase):\n+    def getname(self):\n+        return \"VBATCH REDUCE projection support\"\n+\n+    def test(self):\n+        added = self.redis.execute_command(\n+            'VBATCH', self.test_key, 'REDUCE', 2, 'VALUES', 4, 3,\n+            f'{self.test_key}:item:1', '1', '0', '0', '0',\n+            f'{self.test_key}:item:2', '0', '1', '0', '0',\n+            f'{self.test_key}:item:3', '0', '0', '1', '0',\n+        )\n+        assert added == 3, f\"Expected 3 projected inserts, got {added}\"\n+        assert self.redis.execute_command('VDIM', self.test_key) == 2, \"Projected batch should reduce the stored dimension\"\n+\n+        result = self.redis.execute_command(\n+            'VSIM', self.test_key, 'VALUES', 4, '1', '0', '0', '0',\n+            'COUNT', 1\n+        )\n+        assert len(result) == 1, \"Projected set should still accept original-dimension queries\"\n+\n+        try:\n+            self.redis.execute_command(\n+                'VBATCH', self.test_key, 'VALUES', 4, 1,\n+                f'{self.test_key}:item:4', '0', '0', '0', '1'\n+            )\n+            raise AssertionError(\"Projected sets should require REDUCE on batched inserts\")\n+        except redis.ResponseError as e:\n+            assert \"dimension mismatch\" in str(e).lower(), f\"Unexpected REDUCE compatibility error: {e}\""
          },
          {
            "path": "modules/vector-sets/tests/basic_commands.py",
            "lang": "python",
            "content": "diff --git a/modules/vector-sets/tests/basic_commands.py b/modules/vector-sets/tests/basic_commands.py\nindex 8481a3668..f499a04c6 100644\n--- a/modules/vector-sets/tests/basic_commands.py\n+++ b/modules/vector-sets/tests/basic_commands.py\n@@ -3,7 +3,7 @@ import struct\n\n class BasicCommands(TestCase):\n     def getname(self):\n-        return \"VADD, VDIM, VCARD basic usage\"\n+        return \"VADD, VBATCH, VDIM, VCARD basic usage\"\n\n     def test(self):\n         # Test VADD\n@@ -19,3 +19,14 @@ class BasicCommands(TestCase):\n         # Test VCARD\n         card = self.redis.execute_command('VCARD', self.test_key)\n         assert card == 1, f\"VCARD should return 1, got {card}\"\n+\n+        # Test VBATCH on the same key\n+        result = self.redis.execute_command(\n+            'VBATCH', self.test_key, 'VALUES', 4, 2,\n+            f'{self.test_key}:item:2', '0', '1', '0', '0',\n+            f'{self.test_key}:item:3', '0', '0', '1', '0'\n+        )\n+        assert result == 2, f\"VBATCH should return 2 for two new items, got {result}\"\n+\n+        card = self.redis.execute_command('VCARD', self.test_key)\n+        assert card == 3, f\"VCARD should return 3 after VBATCH, got {card}\""
          }
        ],
        "logs": [
          "Covered NOQUANT FP32 batches and rejected mixed-dimension blobs before any mutation",
          "Verified REDUCE batches store the reduced dimension while still accepting original-dimension VSIM queries",
          "Extended basic_commands.py to prove the VBATCH reply counts only newly added elements"
        ]
      }
    ]
  },
  {
    "id": "layer-5",
    "title": "Docs and examples packaging",
    "status": "COMPLETED",
    "layer_order": 5,
    "tasks": [
      {
        "id": "task-5-1",
        "title": "Document the 2.0 surface and switch examples to VBATCH",
        "file": "modules/vector-sets/README.md",
        "status": "COMPLETED",
        "tests": {
          "total": 3,
          "passed": 3
        },
        "testCode": "redis-cli COMMAND DOCS VBATCH VINFO",
        "testResults": [
          {
            "name": "command docs review",
            "status": "PASSED"
          },
          {
            "name": "glove-100 batched ingestion",
            "status": "PASSED"
          }
        ],
        "changes": [
          {
            "path": "modules/vector-sets/README.md",
            "lang": "markdown",
            "content": "diff --git a/modules/vector-sets/README.md b/modules/vector-sets/README.md\nindex d0f520c23..e363ac020 100644\n--- a/modules/vector-sets/README.md\n+++ b/modules/vector-sets/README.md\n@@ -64,9 +64,30 @@ performed in the background, while the command is executed in the main thread.\n+**VBATCH: add or update many items into a vector set**\n+\n+    VBATCH key [REDUCE dim] VALUES dim count element value1 ... valueN [SETATTR json] ...\n+               [EF build-exploration-factor] [NOQUANT | Q8 | BIN] [M <numlinks>]\n+    VBATCH key [REDUCE dim] FP32 count element vector [SETATTR json] ...\n+               [EF build-exploration-factor] [NOQUANT | Q8 | BIN] [M <numlinks>]\n+\n+`VBATCH` validates the full payload before mutating the vector set, then applies all inserts and updates sequentially. The reply is the number of newly added elements. Existing elements are updated in place and are not counted in the reply.\n+\n+`VBATCH` is a good fit for bulk-load and ingestion workloads because it reduces client round trips while preserving the same quantization, projection and attribute semantics of `VADD`.\n+\n **VSIM: return elements by vector similarity**\n\n-    VSIM key [ELE|FP32|VALUES] <vector or element> [WITHSCORES] [WITHATTRIBS] [COUNT num] [EPSILON delta] [EF search-exploration-factor] [FILTER expression] [FILTER-EF max-filtering-effort] [TRUTH] [NOTHREAD]\n+    VSIM key [ELE|FP32|VALUES] <vector or element> [WITHSCORES] [WITHATTRIBS] [COUNT num] [EPSILON delta | MINSCORE score] [EF search-exploration-factor] [FILTER expression] [FILTER-EF max-filtering-effort] [TRUTH] [NOTHREAD]\n@@ -94,6 +115,8 @@ It is possible to specify a `COUNT` and also to get the similarity score (from 1\n+Alternatively, it is possible to specify `MINSCORE` directly in similarity space. For example, `MINSCORE 0.85` means \"return at most `COUNT` items, but stop once similarity drops below 0.85\". `EPSILON` and `MINSCORE` are mutually exclusive because they describe the same threshold in different units.\n@@ -269,7 +292,7 @@ The command reports the neighbors for each level.\n **VINFO: introspection command that shows info about a vector set**\n\n-    VINFO key\n+    VINFO key [DETAIL]\n@@ -287,6 +310,15 @@ Example:\n+With the optional `DETAIL` token, `VINFO` returns additional diagnostics that are useful during development and tuning sessions:\n+\n+- projection usage\n+- bytes per stored vector\n+- estimated vector storage footprint\n+- attribute coverage\n+- default build/search effort\n+- graph link statistics and level histogram"
          },
          {
            "path": "modules/vector-sets/examples/cli-tool/cli.py",
            "lang": "python",
            "content": "diff --git a/modules/vector-sets/examples/cli-tool/cli.py b/modules/vector-sets/examples/cli-tool/cli.py\nindex 614a02103..d56ba3dd2 100755\n--- a/modules/vector-sets/examples/cli-tool/cli.py\n+++ b/modules/vector-sets/examples/cli-tool/cli.py\n@@ -61,18 +61,34 @@ def parse_command(command):\n     except ValueError as e:\n         raise Exception(f\"Invalid command syntax: {str(e)}\")\n\n-def format_response(response):\n-    \"\"\"Format the response to match Redis protocol style\"\"\"\n+def format_response(response, indent=0):\n+    \"\"\"Format the response to match Redis protocol style.\"\"\"\n+    prefix = \" \" * indent\n     if response is None:\n         return \"(nil)\"\n     elif isinstance(response, bool):\n         return \"+OK\" if response else \"(error) Operation failed\"\n+    elif isinstance(response, dict):\n+        if not response:\n+            return \"(empty map)\"\n+        lines = []\n+        for key, value in response.items():\n+            key_str = key.decode() if isinstance(key, bytes) else str(key)\n+            nested = format_response(value, indent + 2)\n+            if \"\\n\" in nested:\n+                lines.append(f\"{prefix}{key_str}:\")\n+                lines.append(nested)\n+            else:\n+                lines.append(f\"{prefix}{key_str}: {nested}\")\n+        return \"\\n\".join(lines)\n     elif isinstance(response, (list, set)):\n         if not response:\n             return \"(empty list or set)\"\n         return \"\\n\".join(f\"{i+1}) {item}\" for i, item in enumerate(response))\n     elif isinstance(response, int):\n         return f\"(integer) {response}\"\n+    elif isinstance(response, bytes):\n+        return response.decode()\n     else:\n         return str(response)"
          },
          {
            "path": "modules/vector-sets/examples/glove-100/insert.py",
            "lang": "python",
            "content": "diff --git a/modules/vector-sets/examples/glove-100/insert.py b/modules/vector-sets/examples/glove-100/insert.py\nindex 595c77fda..8466cdf27 100644\n--- a/modules/vector-sets/examples/glove-100/insert.py\n+++ b/modules/vector-sets/examples/glove-100/insert.py\n@@ -14,15 +14,14 @@ from tqdm import tqdm\n # Initialize Redis connection\n redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True, encoding='utf-8')\n\n-def add_to_redis(index, embedding):\n-    \"\"\"Add embedding to Redis using VADD command\"\"\"\n-    args = [\"VADD\", \"glove_embeddings\", \"VALUES\", \"100\"]  # 100 is vector dimension\n-    args.extend(map(str, embedding))\n-    args.append(f\"{index}\")  # Using index as identifier since we don't have words\n+def add_batch_to_redis(start_index, embeddings):\n+    \"\"\"Add a batch of embeddings to Redis using VBATCH.\"\"\"\n+    args = [\"VBATCH\", \"glove_embeddings\", \"VALUES\", \"100\", str(len(embeddings))]\n+    for offset, embedding in enumerate(embeddings):\n+        args.append(f\"{start_index + offset}\")\n+        args.extend(map(str, embedding))\n     args.append(\"EF\")\n     args.append(\"200\")\n-    # args.append(\"NOQUANT\")\n-    # args.append(\"BIN\")\n     redis_client.execute_command(*args)\n\n def main():\n@@ -40,14 +39,11 @@ def main():\n             batch_end = min(i + batch_size, total_vectors)\n             batch = train_vectors[i:batch_end]\n\n-            for j, vector in enumerate(batch):\n-                try:\n-                    current_index = i + j\n-                    add_to_redis(current_index, vector)\n-\n-                except Exception as e:\n-                    print(f\"Error processing vector {current_index}: {str(e)}\")\n-                    continue\n+            try:\n+                add_batch_to_redis(i, batch)\n+            except Exception as e:\n+                print(f\"Error processing vectors {i}-{batch_end - 1}: {str(e)}\")\n+                continue"
          }
        ],
        "logs": [
          "Documented VBATCH, the MINSCORE threshold and VINFO DETAIL diagnostics in the module README",
          "Taught the cli-tool to render nested RESP3 maps so VINFO DETAIL output is readable, with VBATCH and MINSCORE examples in its README",
          "Switched glove-100 ingestion from per-vector VADD to one VBATCH per 1000-vector batch at EF 200"
        ]
      }
    ]
  }
];

const VECTOR_DEMO_AGENT_ACTIVITY: NonNullable<
  TaskSplittingStatusResponse["agent_activity"]
> = [
  {
    "tool": "read",
    "params": {
      "path": "modules/vector-sets/README.md"
    },
    "phase": 0,
    "task": 0
  },
  {
    "tool": "edit",
    "params": {
      "path": "modules/vector-sets/vset.c",
      "action": "add VBATCH full-payload validation"
    },
    "phase": 1,
    "task": 1
  },
  {
    "tool": "test",
    "params": {
      "command": "cd modules/vector-sets && python3 test.py --primary-port 6379"
    },
    "phase": 2,
    "task": 1
  },
  {
    "tool": "edit",
    "params": {
      "path": "modules/vector-sets/hnsw.c",
      "action": "add hnsw_collect_stats for VINFO DETAIL"
    },
    "phase": 4,
    "task": 0
  },
  {
    "tool": "test",
    "params": {
      "command": "cd modules/vector-sets && python3 test.py --primary-port 6379 --replica-port 6380"
    },
    "phase": 5,
    "task": 0
  }
];

export function getVectorDemoRecipe(): Recipe {
  return {
    id: VECTOR_DEMO_RECIPE_ID,
    recipe_id: VECTOR_DEMO_RECIPE_ID,
    project_id: VECTOR_DEMO_PROJECT_ID,
    user_prompt: VECTOR_DEMO_RECIPE_TITLE,
    status: VECTOR_DEMO_RECIPE_STATUS,
    created_at: "2026-04-14T08:47:00.000Z",
    repo_name: "redis",
    branch_name: VECTOR_DEMO_BRANCH,
    current_question_task_id: "4e8b2a17-6c93-4d05-8f21-a7d4c9e63b58",
    current_spec_task_id: "7c2d9e45-1a86-4b37-9c60-e3f8b5a21d94",
    current_plan_task_id: "1f6a4c82-9d35-4e78-b201-c5e9a7d43f16",
  };
}

export function getVectorDemoRecipeDetails(): RecipeDetailsResponse {
  return {
    recipe_id: VECTOR_DEMO_RECIPE_ID,
    project_id: VECTOR_DEMO_PROJECT_ID,
    user_prompt: VECTOR_DEMO_RECIPE_TITLE,
    repo_name: "redis",
    branch_name: VECTOR_DEMO_BRANCH,
    questions_and_answers: VECTOR_DEMO_QA_PAIRS,
    status: VECTOR_DEMO_RECIPE_STATUS,
  };
}

export function getVectorDemoQuestionsResponse(): RecipeQuestionsResponse {
  return VECTOR_DEMO_QUESTIONS;
}

export function submitVectorDemoAnswers(): SubmitRecipeAnswersResponse {
  return {
    message: "Answers already recorded for the Vector Search 2.0 recipe.",
    recipe_id: VECTOR_DEMO_RECIPE_ID,
    new_status: VECTOR_DEMO_RECIPE_STATUS,
  };
}

export function startVectorDemoSpecGeneration(): TriggerSpecGenerationResponse {
  return {
    recipe_id: VECTOR_DEMO_RECIPE_ID,
    status: "accepted",
    created_at: "2026-04-14T08:51:30.000Z",
  };
}

export function getVectorDemoSpecStatus(): SpecStatusResponse {
  return {
    recipe_id: VECTOR_DEMO_RECIPE_ID,
    generation_status: "completed",
    specification: VECTOR_DEMO_SPECIFICATION,
    generated_at: "2026-04-14T08:56:30.000Z",
    error_message: null,
    run_id: null,
  };
}

export function getVectorDemoSpecChatResponse(_message: string): SpecChatResponse {
  return {
    intent: "clarify",
    message: "Updated the specification to emphasize ingestion throughput — VBATCH cutting client round trips with all-or-nothing payload validation — and operator diagnostics, with VINFO DETAIL exposing storage footprint, attribute coverage, and HNSW graph health.",
    explanation: "Updated the specification to emphasize ingestion throughput — VBATCH cutting client round trips with all-or-nothing payload validation — and operator diagnostics, with VINFO DETAIL exposing storage footprint, attribute coverage, and HNSW graph health.",
    spec_output: VECTOR_DEMO_SPECIFICATION as unknown as SpecChatResponse["spec_output"],
    undo_token: "",
    next_actions: ["Review the requirements", "Open the phased plan"],
    regenerate_triggered: false,
  };
}

export function startVectorDemoPlanGeneration() {
  return {
    recipe_id: VECTOR_DEMO_RECIPE_ID,
    status: "accepted",
    created_at: "2026-04-14T08:58:00.000Z",
  };
}

export function getVectorDemoPlanStatus(): PlanStatusResponse {
  return {
    recipe_id: VECTOR_DEMO_RECIPE_ID,
    generation_status: "completed",
    plan: VECTOR_DEMO_PLAN,
    generated_at: "2026-04-14T09:04:10.000Z",
    error_message: null,
    run_id: null,
  };
}

export function getVectorDemoPlanChatResponse(_message: string): PlanChatResponse {
  return {
    intent: "clarify",
    message: "Structured the rollout as six production-style phases so the plan reads like a real vector-sets delivery: contract lock on the command surfaces, VBATCH parsing and full-payload validation, batch apply with replication, the MINSCORE search path, VINFO DETAIL graph diagnostics, and regression coverage plus docs and examples packaging.",
    explanation: "Structured the rollout as six production-style phases so the plan reads like a real vector-sets delivery: contract lock on the command surfaces, VBATCH parsing and full-payload validation, batch apply with replication, the MINSCORE search path, VINFO DETAIL graph diagnostics, and regression coverage plus docs and examples packaging.",
    plan_output: VECTOR_DEMO_PLAN as unknown as Record<string, unknown>,
    undo_token: "",
    next_actions: ["Review phase dependencies", "Open the implementation view"],
  };
}

export function submitVectorDemoTaskSplitting(): SubmitTaskSplittingResponse {
  return {
    task_splitting_id: VECTOR_DEMO_TASK_SPLITTING_ID,
    status: "SUBMITTED",
    message: "Vector Search 2.0 implementation is already generated.",
  };
}

export function getVectorDemoTaskSplittingStatus(): TaskSplittingStatusResponse {
  return {
    task_splitting_id: VECTOR_DEMO_TASK_SPLITTING_ID,
    status: "COMPLETED",
    current_step: VECTOR_DEMO_LAYERS.length - 1,
    codegen_status: "COMPLETED",
    error_message: null,
    pr_status: "COMPLETED",
    pr_error_message: null,
    pr_url: VECTOR_DEMO_PR_URL,
    branch_name: VECTOR_DEMO_BRANCH,
    base_branch: VECTOR_DEMO_BASE_BRANCH,
    head_sha: "84e350aac",
    pr_number: 3,
    agent_activity: VECTOR_DEMO_AGENT_ACTIVITY,
  };
}

export function getVectorDemoTaskSplittingItems(): TaskSplittingItemsResponse {
  return {
    task_splitting_id: VECTOR_DEMO_TASK_SPLITTING_ID,
    layers: VECTOR_DEMO_LAYERS,
    next_layer_order: null,
  };
}

export function createVectorDemoPullRequest(): CreatePullRequestResponse {
  return {
    task_splitting_id: VECTOR_DEMO_TASK_SPLITTING_ID,
    status: "COMPLETED",
    message: "Pull request already exists for the Vector Search 2.0 branch.",
    pr_url: VECTOR_DEMO_PR_URL,
  };
}

export function createVectorDemoConversation() {
  return { conversation_id: VECTOR_DEMO_CONVERSATION_ID };
}

export function getVectorDemoConversationMessages(): LoadedMessage[] {
  return [
  {
    "id": "msg-1",
    "text": "Walk me through the Vector Search 2.0 bundle. Why does VBATCH validate the whole payload before applying anything, and how is MINSCORE different from EPSILON?",
    "sender": "user",
    "citations": [],
    "has_attachments": false,
    "attachments": [],
    "tool_calls": null,
    "thinking": null
  },
  {
    "id": "msg-2",
    "text": "VBATCH is deliberately all-or-nothing: it first parses every element into a `vbatchItem` array and runs `vectorSetValidateInsertParameters` — checking vector dimension, REDUCE projection compatibility, quantization type, and the M parameter against the existing set — before the first insert happens. That way a malformed element in the middle of a large ingestion batch fails the whole command instead of leaving the vector set half-mutated, and the reply stays a clean count of newly added elements (updates are applied in place but not counted). MINSCORE and EPSILON describe the same cutoff in different units: EPSILON is a distance delta, while MINSCORE is expressed directly in similarity space where 1 means identical and 0 means opposite, so `MINSCORE 0.85` stops returning results once similarity drops below 0.85. Because they are two spellings of one threshold, the parser rejects them together with an explicit mutually-exclusive error.",
    "sender": "agent",
    "citations": [],
    "has_attachments": false,
    "attachments": [],
    "tool_calls": [
      {
        "call_id": "tool-call-1",
        "event_type": "call",
        "tool_name": "ReadFile",
        "tool_response": "",
        "tool_call_details": {
          "summary": "Read VBATCH and MINSCORE handling in modules/vector-sets/vset.c"
        },
        "stream_part": null,
        "is_complete": true
      },
      {
        "call_id": "tool-call-1",
        "event_type": "result",
        "tool_name": "ReadFile",
        "tool_response": "Captured the two-pass VBATCH flow (parse all vbatchItems, validate via vectorSetValidateInsertParameters, then apply sequentially and ReplicateVerbatim) and the VSIM parsing that range-checks MINSCORE into [0,1] and rejects combining it with EPSILON.",
        "tool_call_details": {
          "summary": "Extracted batch validation and threshold semantics"
        },
        "stream_part": null,
        "is_complete": true
      }
    ],
    "thinking": "I should ground this in vset.c on the branch: the vbatchItem parse pass, vectorSetValidateInsertParameters covering dimension, REDUCE, quantization and M, the newly-added-only reply, and the MINSCORE range check plus the mutual-exclusion error against EPSILON."
  }
];
}

const VECTOR_DEMO_CHAT_REPLY = "The Vector Search 2.0 bundle lands three surfaces in modules/vector-sets: VBATCH for bulk ingestion that validates the full payload before applying anything and replies with the count of newly added elements, VSIM MINSCORE as a similarity-space threshold that is mutually exclusive with EPSILON, and VINFO DETAIL for projection usage, per-vector storage footprint, attribute coverage, and HNSW link statistics with a level histogram. Everything reuses VADD's quantization, REDUCE, and attribute semantics and propagates verbatim to replicas. The new batch_ingest, batch_fp32, batch_projection, minscore, vinfo_detail, persistence, and replication tests pin the behavior down.";

export function streamVectorDemoConversationReply(
  onMessageUpdate: (
    message: string,
    tool_calls: any[],
    citations: string[],
    thinking?: string | null,
  ) => void,
  signal?: AbortSignal,
): Promise<{ message: string; citations: string[]; sessionId: string }> {
  return new Promise((resolve, reject) => {
    const third = Math.ceil(VECTOR_DEMO_CHAT_REPLY.length / 3);
    const chunks = [
      VECTOR_DEMO_CHAT_REPLY.slice(0, third),
      VECTOR_DEMO_CHAT_REPLY.slice(third, third * 2),
      VECTOR_DEMO_CHAT_REPLY.slice(third * 2),
    ];
    let current = "";
    const timers: number[] = [];
    let onAbort: () => void;

    const cleanup = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      signal?.removeEventListener("abort", onAbort);
    };

    onAbort = () => {
      cleanup();
      reject(new Error("Vector demo conversation stream aborted"));
    };

    if (signal?.aborted) {
      onAbort();
      return;
    }

    signal?.addEventListener("abort", onAbort, { once: true });

    chunks.forEach((chunk, index) => {
      const timer = window.setTimeout(() => {
        if (signal?.aborted) return;
        current += chunk;
        onMessageUpdate(current, [], []);
        if (index === chunks.length - 1) {
          cleanup();
          resolve({
            message: current,
            citations: [],
            sessionId: "sess-vector-01",
          });
        }
      }, 260 * (index + 1));
      timers.push(timer);
    });
  });
}

/**
 * The seeded flow is fully generated, so pages never open live streams for it
 * (statuses report "completed" with no run_id). These connectors exist only so
 * service-level gates never fall through to the network for the seeded ids;
 * they emit a terminal event and stop.
 */
function connectVectorDemoNoopStream(
  message: string,
  options: {
    signal?: AbortSignal;
    onEvent?: (eventType: string, data: Record<string, unknown>) => void;
    onError?: (error: string) => void;
  },
) {
  if (options.signal?.aborted) return;
  const timer = window.setTimeout(() => {
    options.onEvent?.("end", { message });
  }, 120);
  options.signal?.addEventListener(
    "abort",
    () => window.clearTimeout(timer),
    { once: true },
  );
}

export function connectVectorDemoQuestionsStream(options: {
  signal?: AbortSignal;
  onEvent?: (eventType: string, data: Record<string, unknown>) => void;
  onError?: (error: string) => void;
}) {
  connectVectorDemoNoopStream("Questions already generated", options);
}

export function connectVectorDemoSpecStream(options: {
  signal?: AbortSignal;
  onEvent?: (eventType: string, data: Record<string, unknown>) => void;
  onError?: (error: string) => void;
}) {
  connectVectorDemoNoopStream("Spec already generated", options);
}

export function connectVectorDemoPlanStream(options: {
  signal?: AbortSignal;
  onEvent?: (eventType: string, data: Record<string, unknown>) => void;
  onError?: (error: string) => void;
}) {
  connectVectorDemoNoopStream("Plan already generated", options);
}

export function connectVectorDemoCodegenStream(options: {
  signal?: AbortSignal;
  onEvent?: (eventType: string, data: Record<string, unknown>) => void;
  onError?: (error: string) => void;
}) {
  connectVectorDemoNoopStream("Implementation already generated", options);
}
