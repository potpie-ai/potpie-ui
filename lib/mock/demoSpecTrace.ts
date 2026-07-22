import type {
  StreamGraphNode,
  StreamTimelineItem,
} from "@/components/stream/StreamTimeline";
import { DEMO_REDIS_POT_ID } from "@/lib/mock/demoPots";

/**
 * Hand-authored agent-activity trace for the Vector Search 2.0 demo spec.
 * Every file path, symbol, requirement, decision, and graph entity below is
 * real fixture data: the file impact comes from VECTOR_DEMO_SPECIFICATION
 * (demoVectorSearchFlow.ts) and every graph node/edge exists in the seeded
 * Redis pot graph (redisGraph.ts), so the "Open in pot graph" links resolve.
 */

const nodeHref = (key: string) =>
  `/pots/${DEMO_REDIS_POT_ID}/graph?focus=${encodeURIComponent(key)}`;

const gn = (
  key: string,
  name: string,
  label: string,
  hub = false,
): StreamGraphNode => ({ key, name, label, href: nodeHref(key), hub });

export const VECTOR_DEMO_SPEC_TRACE: StreamTimelineItem[] = [
  {
    type: "chunk",
    id: "vs2-trace-1",
    content:
      "Breaking down “Vector Search 2.0” before committing to a spec structure. The request has three surfaces — bulk ingestion (`VBATCH`), similarity-space search thresholds (`MINSCORE`), and index introspection (`VINFO DETAIL`) — and they only make sense as one bundle if all three land inside `modules/vector-sets/` without touching the core server. Surveying the module first.",
  },
  {
    type: "tool",
    id: "vs2-trace-2",
    label: "glob",
    phase: "done",
    result:
      "modules/vector-sets/**\n\nvset.c            7,213 lines · command table, VADD/VSIM/VINFO handlers, threading\nhnsw.c            3,082 lines · from-scratch HNSW index (Malkov & Yashunin)\nhnsw.h              214 lines · index API surface\nexpr.c              907 lines · FILTER expression evaluator\nvset_config.c       118 lines · module config (vset-force-single-threaded-execution)\ncommands.json                 · command metadata consumed by the build\nREADME.md                     · full command reference\ntests/                        · basic.py, replication.py, persistence.py, …",
  },
  {
    type: "tool",
    id: "vs2-trace-3",
    label: "grep",
    phase: "done",
    result:
      'grep -n "_RedisCommand(" modules/vector-sets/vset.c\n\n  612:int VADD_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc)\n 1044:int VSIM_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc)\n 1462:int VREM_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc)\n 1533:int VCARD_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc)\n 1581:int VDIM_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc)\n 1655:int VEMB_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc)\n 1810:int VLINKS_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc)\n 1892:int VINFO_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc)\n\n12 command handlers, all registered through RedisModule_CreateCommand',
  },
  {
    type: "chunk",
    id: "vs2-trace-4",
    content:
      "Every write funnels through `VADD_RedisCommand`'s parsing and validation. If `VBATCH` re-implements any of that inline it will drift, so the spec should force extraction of shared helpers — `vectorSetValidateInsertParameters`, `vectorSetProjectInputVector`, `parseFp32VectorBlob`, `parseValuesVectorSlice` — and make `VBATCH` a loop over exactly those.",
  },
  {
    type: "tool",
    id: "vs2-trace-5",
    label: "grep",
    phase: "done",
    result:
      'grep -n "NOQUANT\\|Q8\\|BIN\\|REDUCE" modules/vector-sets/vset.c\n\n  655:        } else if (!strcasecmp(opt, "NOQUANT")) {\n  657:        } else if (!strcasecmp(opt, "Q8")) {\n  659:        } else if (!strcasecmp(opt, "BIN")) {\n  702:        /* REDUCE random projection: only valid before the vector args */\n  708:            long long reduce_dim;\n  …\n\n23 matches — quantization + projection parsing is inline in VADD today, exactly the block VBATCH must share',
  },
  {
    type: "tool",
    id: "vs2-trace-6",
    label: "read_files",
    phase: "done",
    result:
      "Read `modules/vector-sets/vset.c`, `modules/vector-sets/hnsw.c`, `modules/vector-sets/README.md` to pin down VADD's argument grammar, the worker-thread handoff for VSIM, and the documented option surface the new commands must stay consistent with.",
  },
  {
    type: "tool",
    id: "vs2-trace-7",
    label: "ask_knowledge_graph_queries",
    phase: "done",
    result:
      "Vector Sets Module sits fully behind the RedisModule API and leans on the blocking-command infrastructure for threading — all three new surfaces stay inside the module boundary, no core-server files in scope.",
    graph: {
      query:
        'MATCH (m:Component {name: "Vector Sets Module"})-[r]-(n)\nWHERE type(r) IN ["PART_OF", "DEPENDS_ON", "IMPLEMENTED_IN", "DOCUMENTS"]\nRETURN m, r, n',
      summary:
        "The bundle's entire blast radius is one component: it binds to redis-server through the Redis Module System, and VSIM's worker threads ride the blocking-command infrastructure. Nothing outside modules/vector-sets/ needs to change.",
      nodes: [
        gn("component:vector-sets-module", "Vector Sets Module", "Component", true),
        gn("service:redis-server", "redis-server", "Service"),
        gn("feature:vector-sets", "Vector Sets", "Feature"),
        gn("component:module-system", "Redis Module System", "Component"),
        gn("component:blocked-clients", "Blocking Command Infrastructure", "Component"),
        gn("document:vector-sets-readme", "Vector Sets README", "Document"),
      ],
      edges: [
        { from: "component:vector-sets-module", type: "PART_OF", to: "service:redis-server" },
        { from: "component:vector-sets-module", type: "DEPENDS_ON", to: "component:module-system" },
        { from: "component:vector-sets-module", type: "DEPENDS_ON", to: "component:blocked-clients" },
        { from: "feature:vector-sets", type: "IMPLEMENTED_IN", to: "component:vector-sets-module" },
        { from: "document:vector-sets-readme", type: "DOCUMENTS", to: "component:vector-sets-module" },
      ],
    },
  },
  {
    type: "tool",
    id: "vs2-trace-8",
    label: "grep",
    phase: "done",
    result:
      'grep -n "RedisModule_BlockClient" modules/vector-sets/vset.c\n\n 1113:    RedisModuleBlockedClient *bc = RedisModule_BlockClient(ctx, NULL, NULL, NULL, 0);\n 1174:    /* VSIM runs threaded unless NOTHREAD or vset-force-single-threaded-execution */\n 2410:    bc = RedisModule_BlockClient(ctx, NULL, NULL, NULL, 0); /* VADD CAS path */\n\nVSIM detaches to a worker thread by default — any new option must travel in the thread argument vector',
  },
  {
    type: "chunk",
    id: "vs2-trace-9",
    content:
      "That settles how `MINSCORE` reaches the search: the threshold has to be carried to the detached thread as a heap-allocated slot in the blocked-client argument vector, freed by the worker — with `NOTHREAD` and thread-creation-failure falling back to the same synchronous path. It also rules out CAS/background threading for the `VBATCH` insert loop in v1.",
  },
  {
    type: "tool",
    id: "vs2-trace-10",
    label: "grep",
    phase: "done",
    result:
      'grep -rn "EPSILON" modules/vector-sets/\n\nvset.c:1076:        } else if (!strcasecmp(opt, "EPSILON") && j+1 < argc) {\nvset.c:1080:            return RedisModule_ReplyWithError(ctx, "ERR invalid EPSILON");\nREADME.md:97:    VSIM key [ELE|FP32|VALUES] … [EPSILON delta] [EF search-exploration-factor] …\nREADME.md:118:`EPSILON` expresses the cutoff in cosine-distance units, so callers convert from similarity\n\nMINSCORE parses beside EPSILON, and the two must be mutually exclusive — same threshold, different units',
  },
  {
    type: "tool",
    id: "vs2-trace-11",
    label: "ask_knowledge_graph_queries",
    phase: "done",
    result:
      "Two hard constraints on record: the in-tree decision means no modules.yaml changes, and #15418's AOF-rewrite segfault says the module must keep RDB-preamble persistence — VBATCH propagates verbatim, no new aof_rewrite callback.",
    graph: {
      query:
        'MATCH (d)-[r:AFFECTS|MENTIONS|TOUCHED]->(m:Component {name: "Vector Sets Module"})\nWHERE d:Decision OR d:Issue OR d:PullRequest\nRETURN d, r, m',
      summary:
        "History that constrains the design: vector-sets ships in-tree (so command metadata flows through commands.json, not the module manifest), and the BGREWRITEAOF segfault on module types with a NULL aof_rewrite callback is the reason VBATCH must stay on the existing RDB-preamble persistence path.",
      nodes: [
        gn("component:vector-sets-module", "Vector Sets Module", "Component", true),
        gn("decision:vector-sets-bundled-in-tree", "vector-sets ships in-tree", "Decision"),
        gn("issue:redis-15418", "#15418 BGREWRITEAOF segfault on vector-set keys", "Issue"),
        gn("pull_request:redis-15436", "#15436 NULL-guard module aof_rewrite", "PullRequest"),
        gn("component:aof-persistence", "AOF Persistence", "Component"),
      ],
      edges: [
        { from: "decision:vector-sets-bundled-in-tree", type: "AFFECTS", to: "component:vector-sets-module" },
        { from: "issue:redis-15418", type: "MENTIONS", to: "component:vector-sets-module" },
        { from: "issue:redis-15418", type: "MENTIONS", to: "component:aof-persistence" },
        { from: "pull_request:redis-15436", type: "TOUCHED", to: "component:vector-sets-module" },
      ],
    },
  },
  {
    type: "tool",
    id: "vs2-trace-12",
    label: "bash",
    phase: "done",
    result:
      "git log --oneline -6 -- modules/vector-sets/\n\n9f31c02 vector-sets: guard defrag callback against in-flight CAS inserts\ne5a8b77 Fix AOF rewrite crash on module types with NULL aof_rewrite (#15436)\n41d20c9 vector-sets: expose vset-force-single-threaded-execution config\nb7e0d15 vector-sets: AVX512 runtime dispatch for int8 distance kernels\n03c9f4a vector-sets: true deletion with orphan relinking in hnsw.c\nf215a88 vector-sets: FILTER-EF cap for filtered search effort",
  },
  {
    type: "tool",
    id: "vs2-trace-13",
    label: "grep",
    phase: "done",
    result:
      'grep -n "^int hnsw_\\|^void hnsw_\\|^hnswNode" modules/vector-sets/hnsw.h\n\n  58:int hnsw_insert(HNSW *index, const float *vector, …)\n  73:int hnsw_search(HNSW *index, const float *query, …)\n  89:hnswNode *hnsw_get_node(HNSW *index, uint64_t uid);\n  97:void hnsw_free(HNSW *index, …)\n 112:int hnsw_serialize(…)\n\nNo stats walk exists yet — VINFO DETAIL needs a new single-pass hnsw_collect_stats() under the read lock',
  },
  {
    type: "chunk",
    id: "vs2-trace-14",
    content:
      "One read-locked traversal in `hnsw_collect_stats()` yields the link statistics and the per-level histogram (bounded by `HNSW_MAX_LEVEL`, returned as a value-type `hnswStats` snapshot). Everything else `VINFO DETAIL` promises — projection usage, bytes per vector, storage footprint, attribute coverage, default build/search effort — falls out of state the module already tracks. So the diagnostics surface costs exactly one graph walk.",
  },
  {
    type: "tool",
    id: "vs2-trace-15",
    label: "ask_knowledge_graph_queries",
    phase: "done",
    result:
      "One bug pattern on record against this module's argument parsing — the VRANDMEMBER LLONG_MIN negation overflow. VBATCH's count and dimension arguments get explicit range validation before any allocation.",
    graph: {
      query:
        'MATCH (b:BugPattern)-[:REPRODUCES]->(m:Component {name: "Vector Sets Module"})\nOPTIONAL MATCH (i:Issue)-[:MENTIONS]->(b)\nOPTIONAL MATCH (p:PullRequest)-[:TOUCHED]->(m)\nRETURN b, i, p, m',
      summary:
        "Reliability sweep before locking the requirements: the module's one recorded bug pattern is an argument-parsing overflow (VRANDMEMBER with count LLONG_MIN). That is the cautionary tale for VBATCH — its count/dimension parsing gets explicit range checks, and a malformed payload must be rejected before the key is even opened.",
      nodes: [
        gn("component:vector-sets-module", "Vector Sets Module", "Component", true),
        gn("bug_pattern:vrandmember-llong-min-crash", "LLONG_MIN negation overflow", "BugPattern"),
        gn("issue:redis-15379", "#15379 VRANDMEMBER crash on count -2^63", "Issue"),
        gn("pull_request:redis-15392", "#15392 Fix VRANDMEMBER LLONG_MIN crash", "PullRequest"),
      ],
      edges: [
        { from: "bug_pattern:vrandmember-llong-min-crash", type: "REPRODUCES", to: "component:vector-sets-module" },
        { from: "issue:redis-15379", type: "MENTIONS", to: "bug_pattern:vrandmember-llong-min-crash" },
        { from: "issue:redis-15379", type: "MENTIONS", to: "component:vector-sets-module" },
        { from: "pull_request:redis-15392", type: "TOUCHED", to: "component:vector-sets-module" },
      ],
    },
  },
  {
    type: "tool",
    id: "vs2-trace-16",
    label: "read_files",
    phase: "done",
    result:
      "Read `modules/vector-sets/tests/replication.py`, `modules/vector-sets/tests/persistence.py`, `modules/vector-sets/commands.json` to mirror the existing test harness and command-metadata shape for the new surfaces — the bundle adds `tests/batch_ingest.py`, `tests/batch_fp32.py`, `tests/batch_projection.py`, `tests/minscore.py`, `tests/vinfo_detail.py`.",
  },
  {
    type: "tool",
    id: "vs2-trace-17",
    label: "bash",
    phase: "done",
    result:
      "cd modules/vector-sets && ./test.py --quick\n\nbasic .................. OK\nvadd_options ........... OK\nvsim_filters ........... OK\nvsim_threading ......... OK\nreplication ............ OK\npersistence ............ OK\n\n25 tests, 0 failures (11.4s) — baseline green before the spec lands",
  },
  {
    type: "chunk",
    id: "vs2-trace-18",
    content:
      "Structuring the work into 6 functional requirements, each independently reviewable:\n\n- **FR-001** — Add the VBATCH command surface with all-or-nothing payload validation\n- **FR-002** — Apply batches with exact VADD semantics and a new-adds-only reply contract\n- **FR-003** — Add VSIM MINSCORE with similarity-space semantics and EPSILON exclusivity\n- **FR-004** — Expose VINFO DETAIL diagnostics backed by an HNSW stats collector\n- **FR-005** — Guarantee persistence and replication correctness for batched writes\n- **FR-006** — Package docs, examples, and regression coverage for the 2.0 bundle",
  },
  {
    type: "tool",
    id: "vs2-trace-19",
    label: "ask_knowledge_graph_queries",
    phase: "done",
    result:
      "Connected 6 requirements, 11 impacted files, and 3 architectural decisions into one dependency-aware narrative: shared VADD helpers feed FR-001/002, the blocked-client thread slot carries FR-003, and the hnsw stats walk backs FR-004.",
  },
  {
    type: "chunk",
    id: "vs2-trace-20",
    content:
      "Final shape of the spec: a Vector Search 2.0 bundle for the vector-sets module — `VBATCH` for validated, all-or-nothing bulk ingestion, `MINSCORE` as the similarity-space twin of `EPSILON` (mutually exclusive), and `VINFO DETAIL` backed by a single-pass HNSW stats collector — packaged with regression tests, README docs, and command metadata, all contained inside `modules/vector-sets/`.\n\nHolding the result against 5 success metrics, including: a single `VBATCH` call ingests a whole GloVe-100 batch that previously cost one `VADD` round trip per vector, with its integer reply distinguishing new adds from in-place updates.",
  },
];
