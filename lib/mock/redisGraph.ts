// Hand-authored (agent-extracted) project-memory graph of the Redis codebase
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

type BareNode = Omit<ProjectGraphNode, "relationships">;

const NODES: BareNode[] = [
 {
  "id": "repository:redis/redis",
  "entity_key": "repository:redis/redis",
  "labels": [
   "Repository"
  ],
  "properties": {
   "name": "redis/redis",
   "repo_name": "redis/redis",
   "default_branch": "unstable",
   "summary": "Primary Redis source repository.",
   "description": "Main redis/redis source tree (branch unstable): server, data types, streams, persistence, replication, cluster, scripting, modules, tcl test suite. The pot's primary code scope."
  }
 },
 {
  "id": "repository:redis/redis-doc",
  "entity_key": "repository:redis/redis-doc",
  "labels": [
   "Repository"
  ],
  "properties": {
   "name": "redis/redis-doc",
   "repo_name": "redis/redis-doc",
   "default_branch": "master",
   "summary": "Companion documentation repository.",
   "description": "redis/redis-doc: command reference and topic documentation published to redis.io; companion docs scope for the redis/redis code repository."
  }
 },
 {
  "id": "service:redis-server",
  "entity_key": "service:redis-server",
  "labels": [
   "Service"
  ],
  "properties": {
   "name": "redis-server",
   "summary": "The Redis server itself — single-threaded core with I/O threads, persistence, replication, cluster.",
   "description": "redis-server binary: event-loop driven in-memory data structure server. Runs standalone, replica, sentinel-monitored, or cluster mode; persists via RDB snapshots and AOF; entry point for every data-path subsystem in this graph.",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "service:redis-sentinel",
  "entity_key": "service:redis-sentinel",
  "labels": [
   "Service"
  ],
  "properties": {
   "name": "redis-sentinel",
   "summary": "High-availability monitor: failure detection, leader election, automatic failover.",
   "description": "redis-sentinel (sentinel.c, runs as redis-server --sentinel): monitors masters/replicas with SDOWN/ODOWN quorum agreement, elects a leader sentinel and promotes replicas on master failure. Searchable as 'failover', 'sentinel quorum', 'master promotion'.",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "service:redis-cli",
  "entity_key": "service:redis-cli",
  "labels": [
   "Service"
  ],
  "properties": {
   "name": "redis-cli",
   "summary": "Interactive command-line client, cluster admin tool, and latency/bigkeys analyzer.",
   "description": "redis-cli: interactive REPL with linenoise, --cluster admin subcommands (create/reshard/atomic slot migration), --latency/--bigkeys/--memkeys analyzers, RESP3 support, TLS. First tool an operator reaches for.",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "service:redis-benchmark",
  "entity_key": "service:redis-benchmark",
  "labels": [
   "Service"
  ],
  "properties": {
   "name": "redis-benchmark",
   "summary": "Load-generation and throughput/latency measurement tool.",
   "description": "redis-benchmark: configurable parallel-connection load generator with pipelining, RESP3, cluster support and hdr_histogram-based latency percentile reporting. Searchable as 'throughput test', 'ops/sec benchmark'.",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:pubsub",
  "entity_key": "component:pubsub",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Pub/Sub Messaging",
   "summary": "SUBSCRIBE/PSUBSCRIBE/PUBLISH plus slot-scoped shard pubsub (SSUBSCRIBE/SPUBLISH) over kvstore channel dicts",
   "description": "Implements classic and shard-level Pub/Sub via a shared 'pubsubtype' vtable struct (pubSubType/pubSubShardType) so subscribeCommand/ssubscribeCommand, pubsubPublishMessageInternal and pubsubUnsubscribeAllChannelsInternal handle both modes; global channels live in kvstore server.pubsub_channels, shard channels in server.pubsubshard_channels bound to cluster slots (pubsubShardUnsubscribeAllChannelsInSlot cleans up on slot migration). Delivers messages as RESP3 push frames or RESP2 multibulk via addReplyPubsubMessage/addReplyPubsubPatMessage with CLIENT_PUSHING; PUBSUB CHANNELS/NUMSUB/NUMPAT/SHARDCHANNELS introspect state and pubsubMemOverhead feeds MEMORY USAGE. Searchable as 'pubsub message not delivered', 'shard channel', 'pattern subscribe glob', 'CROSSSLOT ssubscribe'; pubsub client output limits come from client-output-buffer-limit pubsub class.",
   "path": "src/pubsub.c",
   "loc": 771,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:keyspace-notifications",
  "entity_key": "component:keyspace-notifications",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Keyspace Event Notifications",
   "summary": "notify-keyspace-events flag engine publishing __keyspace@/__keyevent@ (and subkey) events over Pub/Sub",
   "description": "notifyKeyspaceEvent/notifyKeyspaceEventWithSubkeys publish key-change events to __keyspace@<db>__:<key> and __keyevent@<db>__:<event> channels, gated by keyspaceEventsStringToFlags classes (K/E/A/g/$/l/s/h/z/x/e/t/m/d/n/o/c plus this tree's subkey classes S/T/I/V mapping to __subkeyspace@/__subkeyevent@/__subkeyspaceitem@/__subkeyspaceevent@ channels with length-prefixed '<len>:<subkey>' payloads, and GCRA 'r' rate-limit class). Always calls moduleNotifyKeyspaceEvent first (modules bypass the flag config), then short-circuits when no pubsub subscribers exist; isSubkeyNotifyEnabled decides whether callers should collect subkeys. Searchable as 'keyspace notifications not firing', 'expired event', 'notify-keyspace-events flags', '__keyevent__ del'; notifications are fire-and-forget with no delivery guarantee and default to off (notify-keyspace-events \"\").",
   "path": "src/notify.c",
   "loc": 297,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:client-tracking",
  "entity_key": "component:client-tracking",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Client-Side Caching / Tracking",
   "summary": "CLIENT TRACKING invalidation engine: rax TrackingTable/PrefixTable, RESP3 push, BCAST mode, RESP2 redirect",
   "description": "Implements RESP3 client-side caching invalidation: TrackingTable is a rax of keys -> rax of client IDs filled by trackingRememberKeys, and trackingInvalidateKey sends 'invalidate' push frames via sendTrackingMessage (RESP2 works only with REDIRECT to a pubsub connection on the __redis__:invalidate channel; a dead redirect target triggers a 'tracking-redir-broken' push). BCAST mode registers prefixes in PrefixTable (bcastState{keys,clients}) with checkPrefixCollisionsOrReply rejecting overlapping prefixes, batching invalidations per event-loop cycle via trackingBroadcastInvalidationMessages; supports OPTIN/OPTOUT/CACHING/NOLOOP flags (CLIENT_TRACKING_* client flags) and trackingLimitUsedSlots evicts random keys once tracking-table-max-keys is exceeded. Searchable as 'client side caching', 'invalidation message', 'CLIENT TRACKING REDIRECT', 'tracking table memory'; sendTrackingMessage pauses IO threads (pauseIOThread) when pushing into a connection owned by another thread.",
   "path": "src/tracking.c",
   "loc": 761,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:blocked-clients",
  "entity_key": "component:blocked-clients",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Blocking Command Infrastructure",
   "summary": "Generic blocking for BLPOP/XREAD BLOCK/WAIT/WAITAOF: blockClient, signalKeyAsReady, rax timeout table",
   "description": "blockClient sets CLIENT_BLOCKED with a btype (BLOCKED_LIST/ZSET/STREAM/WAIT/MODULE/LAZYFREE/POSTPONE/SHUTDOWN); blockForKeys parks clients on c->bstate.keys, writers call signalKeyAsReady, and handleClientsBlockedOnKeys + blockedBeforeSleep serve ready keys and run processUnblockedClients inside beforeSleep (unblocked clients are queued there because no readable event fires for already-read query buffers). timeout.c keeps a radix tree of encodeTimeoutKey(big-endian timeout || client pointer) entries so handleBlockedClientsTimeout wakes expired blockers in order and replyToBlockedClientTimedOut sends the null/timeout reply; blockForReplication backs WAIT, blockForAofFsync backs WAITAOF, and blockPostponeClient implements CLIENT PAUSE-style postponing until CLIENT UNPAUSE/timeout. Searchable as 'BLPOP timeout', 'blocked_clients metric', 'client stuck blocked', 'XREAD BLOCK never returns', 'CLIENT UNPAUSE'; updateStatsOnUnblock feeds commandstats, latency histograms and the slowlog for commands that finished while blocked.",
   "path": "src/blocked.c, src/timeout.c",
   "loc": 1025,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:transactions",
  "entity_key": "component:transactions",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "MULTI/EXEC Transactions",
   "summary": "MULTI/EXEC/DISCARD command queueing plus WATCH/UNWATCH optimistic CAS via touchWatchedKey",
   "description": "queueMultiCommand accumulates pendingCommand pointers into c->mstate (a growable array; this tree moves parsed commands from the client's pending_cmds queue rather than copying argv) and execCommand replays them atomically, aborting with EXECABORT via execCommandAbort or returning nil when CLIENT_DIRTY_CAS/CLIENT_DIRTY_EXEC is set. WATCH implements optimistic locking: watchForKey links clients into db->watched_keys, touchWatchedKey dirties every watcher on modification, isWatchedKeyExpired handles lazily-expired keys, and touchAllWatchedKeysInDb fires on FLUSHDB/SWAPDB and cluster slot changes (slotRangeArray). Searchable as 'EXEC returned nil', 'EXECABORT', 'WATCH CAS retry', 'transaction discarded', 'commands queued'; multiStateMemOverhead reports per-client transaction memory.",
   "path": "src/multi.c",
   "loc": 517,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:acl-engine",
  "entity_key": "component:acl-engine",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "ACL Engine",
   "summary": "ACL users/rules/categories/selectors: rax Users table, per-selector command bitmaps, ACL LOG audit ring",
   "description": "Access control: rax *Users maps usernames to user structs, each holding a list of aclSelector (root selector + additional selectors in parentheses) with a command-ID bitmap (ACLGetCommandID/ACLSetSelectorCommandBit), key patterns including %R~/%W~ read/write-only patterns (keyPattern), and &channel pubsub patterns. ACLSetUser/ACLSetSelector parse rules (+cmd, -@category, allkeys, resetchannels, on/off, >password hashed via ACLHashPassword SHA256, time_independent_strcmp compare); ACLAuthenticateUser/ACLCheckUserCredentials back AUTH/HELLO, ACLCheckAllPerm gates every command, and denials are recorded in the ACLLog list served by ACL LOG (capped by acllog-max-len). Categories are a 64-bit flag space (ACL_MAX_CATEGORIES, ACLAddCommandCategory lets modules register new ones); users load from aclfile or redis.conf user lines via UsersToLoad. Searchable as 'NOPERM error', 'ACL SETUSER rules', 'WRONGPASS', 'default user nopass', 'ACL selectors', 'ACL GENPASS'; related directives aclfile, acllog-max-len, acl-pubsub-default (default resetchannels), requirepass.",
   "path": "src/acl.c",
   "loc": 3367,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:slowlog",
  "entity_key": "component:slowlog",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Slowlog and Request/Response Logging",
   "summary": "In-memory ring of slow commands (SLOWLOG GET/RESET/LEN) plus compile-time req/res logging for RESP testing",
   "description": "slowlogPushEntryIfNeeded appends a slowlogEntry (id, timestamp, duration, client name/peer, trimmed argv) to the server.slowlog list when execution exceeds slowlog-log-slower-than microseconds, trimming to slowlog-max-len; slowlogCreateEntry caps arguments at slowlog-entry-max-argc and truncates strings at slowlog-entry-max-string-len (configurable in this tree, upstream constants), duplicating robjs to avoid sharing with the keyspace. logreqres.c (compiled under LOG_REQ_RES, enabled by hidden req-res-logfile directive) dumps every client's argv and raw RESP2/RESP3 reply to a per-client file with an __argv_end__ marker, used to validate RESP3 coverage in tests; reqresShouldLog skips pubsub/monitor/replica links. Searchable as 'SLOWLOG GET empty', 'slow query log', 'command took too long', 'slowlog entry truncated arguments'.",
   "path": "src/slowlog.c, src/logreqres.c",
   "loc": 540,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "interface:keyspace-events",
  "entity_key": "interface:keyspace-events",
  "labels": [
   "Interface"
  ],
  "properties": {
   "name": "Keyspace Events Channel Protocol",
   "summary": "Pub/Sub channel naming contract for key-change events: __keyspace@<db>__, __keyevent@<db>__ and subkey variants",
   "description": "The wire contract consumed by external watchers: SUBSCRIBE/PSUBSCRIBE to __keyspace@<db>__:<key> (message = event name) or __keyevent@<db>__:<event> (message = key name), plus this tree's subkey channels __subkeyspace@/__subkeyevent@/__subkeyspaceitem@/__subkeyspaceevent@ carrying length-prefixed '<len>:<subkey>' payloads. Event classes are selected by the notify-keyspace-events directive (K/E required to emit anything); delivery is best-effort fire-and-forget over normal or shard pubsub with no persistence, so disconnected subscribers miss events."
  }
 },
 {
  "id": "config:notify-keyspace-events",
  "entity_key": "config:notify-keyspace-events",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "notify-keyspace-events",
   "summary": "Flag string selecting which keyspace event classes are published (K/E/g/$/l/s/h/z/x/e/t/m/n/S/T/I/V/A)",
   "description": "Parsed by keyspaceEventsStringToFlags in notify.c; must include K (keyspace) and/or E (keyevent) or nothing is emitted. 'A' aliases all class flags except K/E/m and subkey classes. Empty by default because notifications cost CPU per write; special config with custom set/get/rewrite handlers in config.c.",
   "default": "\"\""
  }
 },
 {
  "id": "config:tracking-table-max-keys",
  "entity_key": "config:tracking-table-max-keys",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "tracking-table-max-keys",
   "summary": "Max keys held in the client-tracking invalidation table before random keys are evicted-and-invalidated",
   "description": "Enforced by trackingLimitUsedSlots in tracking.c: when TrackingTable exceeds this count, random keys are removed and invalidation messages sent to their trackers, bounding server-side CSC memory. 0 disables the limit.",
   "default": "1000000"
  }
 },
 {
  "id": "config:slowlog-log-slower-than",
  "entity_key": "config:slowlog-log-slower-than",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "slowlog-log-slower-than",
   "summary": "Microsecond execution-time threshold above which a command is recorded in the slowlog",
   "description": "Checked by slowlogPushEntryIfNeeded; negative disables slowlog entirely, 0 logs every command. I/O time is not counted, only command execution time.",
   "default": "10000"
  }
 },
 {
  "id": "config:aclfile",
  "entity_key": "config:aclfile",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "aclfile",
   "summary": "External file holding 'user ...' ACL definitions, enabling ACL LOAD/ACL SAVE",
   "description": "Immutable config; mutually exclusive with user lines in redis.conf. Users parsed into UsersToLoad and applied after module load during server init (ACLInit/ACLLoadUsersAtStartup path in acl.c).",
   "default": "\"\""
  }
 },
 {
  "id": "feature:keyspace-notifications",
  "entity_key": "feature:keyspace-notifications",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Keyspace Notifications",
   "summary": "Clients observe key modifications, expirations and evictions as Pub/Sub events, down to subkey granularity",
   "description": "Opt-in event stream over Pub/Sub for data changes: every write path calls notifyKeyspaceEvent, and this tree extends the upstream feature with subkey-level channels (S/T/I/V flags) carrying which hash fields/members changed, plus new/overwritten/type-changed (n/o/c) classes. Used for cache invalidation, TTL-expiry triggers ('x' expired events) and audit pipelines; best-effort delivery only.",
   "lifecycle": "active"
  }
 },
 {
  "id": "feature:client-side-caching",
  "entity_key": "feature:client-side-caching",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Client-Side Caching",
   "summary": "RESP3 tracking-based invalidation lets clients cache keys locally and receive push invalidations",
   "description": "CLIENT TRACKING on|off with REDIRECT/BCAST/PREFIX/OPTIN/OPTOUT/NOLOOP options; server remembers served keys per client-ID in a rax and pushes RESP3 'invalidate' frames (or __redis__:invalidate pubsub messages for RESP2 redirection) when keys change, flush, or are evicted from the tracking table. Memory bounded by tracking-table-max-keys.",
   "lifecycle": "active"
  }
 },
 {
  "id": "feature:access-control",
  "entity_key": "feature:access-control",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Access Control Lists (ACL)",
   "summary": "Named users with rule-based command, key-pattern and pubsub-channel permissions, selectors, and audit log",
   "description": "AUTH/HELLO authenticate against the Users rax; per-user selectors grant command bits (+@category/-cmd), key patterns (~glob, %R~/%W~ read/write-only), and &channel pubsub patterns, checked on every command by ACLCheckAllPerm. ACL SETUSER/GETUSER/LIST/CAT/GENPASS/WHOAMI/LOG manage it at runtime; passwords stored as SHA256 hashes, denials audited in ACL LOG.",
   "lifecycle": "active"
  }
 },
 {
  "id": "decision:unblocked-clients-beforesleep",
  "entity_key": "decision:unblocked-clients-beforesleep",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Unblocked clients are reprocessed in beforeSleep, not via the event loop",
   "statement": "unblockClient queues clients into an unblocked_clients list drained by processUnblockedClients inside beforeSleep rather than waiting for socket readability.",
   "rationale": "The pending commands were already read into the query buffer while the client was blocked, so no 'readable' event will ever fire for them; beforeSleep is the only reliable hook to resume parsing.",
   "description": "Documented in the blocked.c header API comment; CLIENT_UNBLOCKED flag marks membership in the list, and blockedBeforeSleep ties handleClientsBlockedOnKeys + timeout processing into every event-loop iteration.",
   "evidence": "src/blocked.c header comment: 'It puts the client into a list of just unblocked clients that are processed ASAP in the beforeSleep() event loop callback... otherwise there is no readable event fired, we already read the pending commands.'",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:resp2-invalidation-via-redirect-only",
  "entity_key": "decision:resp2-invalidation-via-redirect-only",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "RESP2 clients get invalidations only via redirection to a pubsub connection",
   "statement": "Tracking invalidation is pushed in-band only on RESP3; RESP2 clients must use CLIENT TRACKING REDIRECT to a second connection subscribed to __redis__:invalidate.",
   "rationale": "RESP2 has no push frame type on a request/response connection, so the only RESP2-compatible delivery channel is a Pub/Sub message on a dedicated connection.",
   "description": "sendTrackingMessage branches on c->resp > 2 (push 'invalidate') vs using_redirection && CLIENT_PUBSUB (pubsub message on TrackingChannelName); a broken redirect target sets CLIENT_TRACKING_BROKEN_REDIR and notifies RESP3 originators with 'tracking-redir-broken'.",
   "evidence": "src/tracking.c sendTrackingMessage() comment: 'Only send such info for clients in RESP version 3 or more. However if redirection is active, and the connection we redirect to is in Pub/Sub mode, we can support the feature with RESP 2 as well.'",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "component:cluster-core",
  "entity_key": "component:cluster-core",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Cluster Core (implementation-agnostic layer)",
   "summary": "Shared clustering layer: key-to-slot hashing, MOVED/ASK redirects, MIGRATE/RESTORE, CLUSTER dispatch",
   "description": "Implementation-agnostic half of Redis Cluster (cluster.c header says it holds 'the common parts of a clustering implementation'). Maps keys to 16384 slots via keyHashSlot/patternHashSlot (crc16 & 0x3FFF, honoring {hashtag} braces), routes commands with getNodeByQuery/clusterRedirectClient producing -MOVED, -ASK, -CROSSSLOT, -TRYAGAIN and -CLUSTERDOWN errors (CLUSTER_REDIR_* codes, including the new CLUSTER_REDIR_TRIMMING for slots being trimmed), and implements migrateCommand/restoreCommand with cached sockets (migrateCachedSocket, migrateCloseTimedoutSockets) plus ASKING/READONLY/READWRITE. Also dispatches the CLUSTER command (NODES, SLOTS, SHARDS, KEYSLOT, COUNTKEYSINSLOT, GETKEYSINSLOT, MIGRATION, SYNCSLOTS), provides the slotRangeArray utility family, and exports the clusterAsmProcess/clusterAsmOnEvent hook API so alternative cluster implementations (e.g. module-based) can drive Atomic Slot Migration. Searchable as 'hash slot', 'hash tag', 'CROSSSLOT error', 'MOVED redirect', 'ASK redirect', 'cluster redirection'.",
   "path": "src/cluster.c, src/cluster.h",
   "loc": 2403,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:cluster-bus",
  "entity_key": "component:cluster-bus",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Cluster Bus (legacy gossip implementation)",
   "summary": "Gossip-based cluster bus: clusterMsg protocol, PING/PONG/MEET, epochs, PFAIL->FAIL, failover voting",
   "description": "The standard cluster-bus clustering mechanism (cluster_legacy.c): binary clusterMsg packets on the bus port (cluster-port, default client port +10000) carrying message types PING/PONG/MEET/FAIL/PUBLISH/PUBLISHSHARD/FAILOVER_AUTH_REQUEST/FAILOVER_AUTH_ACK/UPDATE/MFSTART/MODULE, each with currentEpoch/configEpoch and a 16384-bit myslots bitmap; clusterSendPing gossips ~1/10 of known nodes (min 3) per packet and clusterProcessPacket applies them. Failure detection promotes PFAIL to FAIL via markNodeAsFailingIfNeeded quorum of failure reports; replica failover runs in clusterHandleSlaveFailover with epoch-based master voting (clusterRequestFailoverAuth/clusterSendFailoverAuthIfNeeded, quorum = size/2+1, data_age validity gated by cluster-replica-validity-factor) and clusterFailoverReplaceYourMaster; epoch conflicts resolved by clusterHandleConfigEpochCollision/clusterBumpConfigEpochWithoutConsensus, slot ownership updates by clusterUpdateSlotsConfigWith. Persists topology in nodes.conf (clusterLoadConfig/clusterSaveConfig); clusterCron drives reconnects and timeouts. Searchable as 'cluster gossip', 'node PFAIL FAIL', 'failover election', 'config epoch collision', 'split brain', 'CLUSTERDOWN', 'nodes.conf corruption'; tuned by cluster-node-timeout, cluster-ping-interval, cluster-migration-barrier, cluster-require-full-coverage, cluster-link-sendbuf-limit.",
   "path": "src/cluster_legacy.c, src/cluster_legacy.h",
   "loc": 6693,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:atomic-slot-migration",
  "entity_key": "component:atomic-slot-migration",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Atomic Slot Migration (ASM)",
   "summary": "Destination-driven atomic slot migration: snapshot + repl stream over dual channels, atomic handoff, trim",
   "description": "New atomic slot migration engine (cluster_asm.c, 2025): destination runs CLUSTER MIGRATION IMPORT <slots>, source forks and sends a slot snapshot as RESTORE commands over a dedicated RDB channel (CLUSTER SYNCSLOTS RDBCHANNEL) while streaming incremental writes over the main channel; when the destination catches up the source pauses slot writes (ASM_HANDOFF_PREP/ASM_HANDOFF), the destination drains its sync_buffer, takes ownership, and the config flips atomically via the cluster bus, after which the source trims migrated keys in background (BIO) or active-cron mode. Core structs/functions: asmTask (state machine ASM_SEND_SYNCSLOTS -> ASM_ACCUMULATE_BUF -> ASM_STREAMING_BUF -> ASM_TAKEOVER on import; ASM_WAIT_BGSAVE_START -> ASM_SEND_BULK_AND_STREAM -> ASM_HANDOFF -> ASM_STREAM_EOF on migrate), global asmManager singleton with tasks/archived_tasks/trim jobs, clusterMigrationCommand (IMPORT/STATUS/CANCEL), clusterSyncSlotsCommand, asmCron/asmBeforeSleep, clusterAsmProcess/clusterAsmOnEvent events for external cluster implementations and module notifications (REDISMODULE_EVENT_CLUSTER_SLOT_MIGRATION). Replaces the old per-key MIGRATE/SETSLOT resharding dance with no ASK-redirect window. Searchable as 'ASM', 'slot migration stuck', 'CLUSTER MIGRATION', 'SYNCSLOTS', 'write pause during migration', 'slot trimming', '-TRYAGAIN trimming'; tuned by cluster-slot-migration-handoff-max-lag-bytes, cluster-slot-migration-write-pause-timeout, cluster-slot-migration-sync-buffer-drain-timeout.",
   "path": "src/cluster_asm.c, src/cluster_asm.h",
   "loc": 3888,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:cluster-slot-stats",
  "entity_key": "component:cluster-slot-stats",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Per-Slot Statistics (CLUSTER SLOT-STATS)",
   "summary": "CLUSTER SLOT-STATS: per-slot key-count, cpu-usec, memory-bytes, network-bytes-in/out metrics",
   "description": "Implements CLUSTER SLOT-STATS with SLOTSRANGE <start> <end> and ORDERBY <metric> [LIMIT n] [ASC|DESC] variants (clusterSlotStatsCommand), reporting per-slot key-count plus opt-in cpu-usec, memory-bytes and network-bytes-in/out stored in kvstoreDictMetadata attached to each slot's dict in the kvstore. Accumulators clusterSlotStatsAddCpuDuration, clusterSlotStatsAddNetworkBytesInForUserClient/OutForUserClient and the replication/sharded-pubsub variants guard against double counting inside MULTI/EXEC, EVAL/FCALL nesting and blocked clients (canAddCpuDuration/canAddNetworkBytesIn); clusterSlotStatReset clears metrics on slot ownership change. Useful for finding hot slots before resharding; searchable as 'hot slot', 'slot-level metrics', 'per-slot cpu', 'slot key count'; gated by cluster-slot-stats-enabled (cpu/net/mem flags, memory also needs memory tracking) because extra metrics carry a performance trade-off.",
   "path": "src/cluster_slot_stats.c, src/cluster_slot_stats.h",
   "loc": 373,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "interface:cluster-bus-protocol",
  "entity_key": "interface:cluster-bus-protocol",
  "labels": [
   "Interface"
  ],
  "properties": {
   "name": "Cluster Bus Protocol",
   "summary": "Binary clusterMsg gossip protocol between nodes on the bus port (client port +10000 by default)",
   "description": "Node-to-node wire protocol defined by struct clusterMsg in cluster_legacy.h: 'RCmb' signature, protocol version, sender name/shard-id, currentEpoch/configEpoch, replication offset, 2048-byte myslots bitmap (16384 slots), and a union payload of gossip sections (clusterMsgDataGossip), FAIL, PUBLISH/PUBLISHSHARD, UPDATE and module messages; field offsets are frozen with static_assert so wire-format breakage fails at compile time. Message types: PING(0) PONG(1) MEET(2) FAIL(3) PUBLISH(4) FAILOVER_AUTH_REQUEST(5) FAILOVER_AUTH_ACK(6) UPDATE(7) MFSTART(8) MODULE(9) PUBLISHSHARD(10). Modules can piggyback on it via clusterSendModuleMessageToTarget and can disable failover/redirection with CLUSTER_MODULE_FLAG_NO_FAILOVER/NO_REDIRECTION. Runs over TCP or TLS (tls-cluster); searchable as 'cluster bus port', 'gossip packet', 'MEET handshake', 'bus message version mismatch'."
  }
 },
 {
  "id": "config:cluster-enabled",
  "entity_key": "config:cluster-enabled",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "cluster-enabled",
   "summary": "Immutable switch that starts the node in Redis Cluster mode",
   "description": "createBoolConfig in config.c, IMMUTABLE_CONFIG, default off. When enabled the server initializes clusterInit/clusterCommonInit, opens the cluster bus port and enforces slot-based key routing; commands touching keys outside owned slots return -MOVED/-ASK. Most CLUSTER subcommands and CLUSTER SLOT-STATS reply 'This instance has cluster support disabled' when off.",
   "default": "no"
  }
 },
 {
  "id": "config:cluster-node-timeout",
  "entity_key": "config:cluster-node-timeout",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "cluster-node-timeout",
   "summary": "Milliseconds a node can be unreachable before being flagged PFAIL; baseline for most cluster timing",
   "description": "createLongLongConfig, default 15000 ms. Drives failure detection (PFAIL flagging in clusterCron), FAIL promotion report validity (node_timeout*2), failover auth_timeout (MAX(node_timeout*2,2000)) and retry (2x that) in clusterHandleSlaveFailover, and replica data-age validity together with cluster-replica-validity-factor. Too low causes spurious failovers; too high delays recovery.",
   "default": "15000"
  }
 },
 {
  "id": "config:cluster-slot-migration-handoff-max-lag-bytes",
  "entity_key": "config:cluster-slot-migration-handoff-max-lag-bytes",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "cluster-slot-migration-handoff-max-lag-bytes",
   "summary": "Replication lag threshold below which ASM pauses source writes to hand off slots",
   "description": "createLongLongConfig (server.asm_handoff_max_lag_bytes), default 1MB. During atomic slot migration the source waits until the destination is within this many bytes of the stream before entering ASM_HANDOFF_PREP and pausing slot writes, bounding the write-pause window.",
   "default": "1mb"
  }
 },
 {
  "id": "feature:cluster-failover",
  "entity_key": "feature:cluster-failover",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Cluster Failover (automatic and manual)",
   "summary": "Replica promotion via epoch-based master voting when a master FAILs, plus CLUSTER FAILOVER manual mode",
   "description": "When gossip marks a master FAIL (markNodeAsFailingIfNeeded quorum of failure reports), its replicas run clusterHandleSlaveFailover: rank by replication offset, delay election accordingly, bump currentEpoch, broadcast FAILOVER_AUTH_REQUEST, and win with votes from a majority of slot-owning masters (needed_quorum = size/2+1); the winner runs clusterFailoverReplaceYourMaster and claims slots under its new configEpoch. Manual failover (CLUSTER FAILOVER, MFSTART packet, clusterSendMFStart) does a coordinated no-data-loss switchover; FORCE/TAKEOVER variants relax safety. Data-staleness gate via cluster-replica-validity-factor; disabled per node by cluster-replica-no-failover. Failure symptoms: 'election timed out', 'cant_failover_reason' in logs, stuck CLUSTERDOWN.",
   "lifecycle": "active"
  }
 },
 {
  "id": "feature:atomic-slot-migration-feature",
  "entity_key": "feature:atomic-slot-migration-feature",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Atomic Slot Migration",
   "summary": "Recently landed slot rebalancing that moves whole slot ranges atomically without per-key MIGRATE or ASK windows",
   "description": "Operator runs CLUSTER MIGRATION IMPORT <ranges> on the destination; the engine snapshots slots on the source (fork + RESTORE stream over an RDB channel), streams live writes, briefly pauses source writes when lag < cluster-slot-migration-handoff-max-lag-bytes, drains, and flips slot ownership atomically via the cluster bus — clients see a clean -MOVED cutover instead of the legacy SETSLOT IMPORTING/MIGRATING + per-key MIGRATE + ASK redirect dance. CLUSTER MIGRATION STATUS/CANCEL manage tasks; migrated keys are trimmed on the source in background or active mode; module notifications and the clusterAsmProcess/clusterAsmOnEvent API let external cluster managers drive the same flow.",
   "lifecycle": "active"
  }
 },
 {
  "id": "decision:crc16-16384-slots",
  "entity_key": "decision:crc16-16384-slots",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "16384 hash slots addressed by CRC16/XMODEM low 14 bits with {hashtag} override",
   "statement": "Key placement uses the least significant 14 bits of CRC16 (XMODEM variant) of the key — or of the substring between the first {...} braces — giving exactly 16384 slots.",
   "rationale": "14 bits keeps the per-message slot bitmap at 2KB inside every gossip packet while allowing multi-key operations to be forced onto one node via hash tags; XMODEM CRC16 parameters are documented so alternative clients can reimplement routing identically.",
   "description": "keyHashSlot in cluster.h implements 'crc16(key) & 0x3FFF' with brace extraction; CLUSTER_SLOT_MASK_BITS 14 defines CLUSTER_SLOTS 16384; crc16.c documents the exact CRC parameters (poly 1021, init 0000, 'XMODEM').",
   "evidence": "src/cluster.h lines 22-25 and 54-79 (keyHashSlot comment); src/crc16.c header note ('this is actually the XMODEM CRC 16 algorithm') with full parameter table",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:gossip-fanout-tenth",
  "entity_key": "decision:gossip-fanout-tenth",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Gossip 1/10 of nodes per PING (min 3), plus all PFAIL nodes",
   "statement": "Each PING/PONG carries gossip sections for ~10% of known nodes with a floor of 3, and always includes every PFAIL node.",
   "rationale": "The in-code probability analysis shows that with N/10 entries and ~8 packets exchanged per node pair in the node_timeout*2 failure-report validity window, a PFAIL node is expected to be reported to ~80% of the cluster — safely above the majority needed to promote PFAIL to FAIL — while keeping packet size bounded.",
   "description": "clusterSendPing computes wanted = floor(nodes/10), clamps to >=3, and adds pfail_wanted sections so failure reports propagate fast.",
   "evidence": "src/cluster_legacy.c clusterSendPing (~lines 3752-3784): long comment 'How many gossip sections we want to add? 1/10 of the number of nodes and anyway at least 3. Why 1/10? ...'",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "component:server-core",
  "entity_key": "component:server-core",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Server Core",
   "summary": "Main server lifecycle: main(), initServer, serverCron, beforeSleep, and the processCommand/call dispatch path.",
   "description": "Owns the redis-server process lifecycle and global state (struct redisServer server): main() -> initServerConfig/initServer/initListeners -> aeMain(server.el). serverCron (driven by 'hz', run_with_period macro) handles clientsCron, replicationCron, child-info collection and stats; beforeSleep/afterSleep flush AOF, drain TLS/compression pending data, handle blocked clients and pending writes each event-loop cycle, with a reduced re-entrant path guarded by ProcessingEventsWhileBlocked (processEventsWhileBlocked during RDB/AOF load). Command execution flows preprocessCommand -> processCommand -> call(); searchable as 'command dispatch', 'server cron', 'beforeSleep', 'event loop cycle', 'main loop stall'. Related directives: hz, dynamic-hz; failure symptoms: latency spikes when cron tasks or beforeSleep work (AOF fsync, expired-key cycles) run long.",
   "path": "src/server.c, src/server.h",
   "loc": 8401,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:event-loop",
  "entity_key": "component:event-loop",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Event Loop (ae)",
   "summary": "Self-contained event-driven library multiplexing socket I/O and timers; aeMain/aeProcessEvents drive everything.",
   "description": "Minimal event library (originally written for the Jim Tcl interpreter) providing aeEventLoop with file events (aeFileEvent/aeFiredEvent) and timer events; aeCreateEventLoop, aeCreateFileEvent, aeCreateTimeEvent, aeProcessEvents, aeMain, plus aeSetBeforeSleepProc/aeSetAfterSleepProc hooks used by server-core and by each IO thread. The multiplexing backend is chosen at compile time by #ifdef in performance order: evport > epoll > kqueue > select (ae_evport.c/ae_epoll.c/ae_kqueue.c/ae_select.c are #included, not linked). Searchable as 'event loop', 'multiplexing backend', 'aeApiPoll', 'timer resolution', 'busy loop'; uses monotonic clock (monotonicInit).",
   "path": "src/ae.c, src/ae.h",
   "loc": 516,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:networking",
  "entity_key": "component:networking",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Client Networking",
   "summary": "Client lifecycle, RESP request parsing, reply construction, and output-buffer management (networking.c).",
   "description": "Implements createClient/freeClient, readQueryFromClient -> processInputBuffer -> processMultibulkBuffer/processInlineBuffer (RESP vs inline protocol), and the reply path: addReply into a fixed c->buf (PROTO_REPLY_CHUNK_BYTES) that overflows into a reply block list, drained by writeToClient/handleClientsWithPendingWrites (with _writeToClientSlave/_writeToClientNonSlave split and an IO-thread variant for replicas). closeClientOnOutputBufferLimitReached enforces client-output-buffer-limit; helloCommand switches clients between RESP2/RESP3 (c->resp) and addReplyPushLen emits RESP3 push frames. Searchable as 'client output buffer', 'obuf limit', 'pending writes', 'protocol error', 'query buffer', 'CLIENT KILL'; directives: client-output-buffer-limit, maxmemory-clients, proto-max-bulk-len, tcp-keepalive.",
   "path": "src/networking.c",
   "loc": 6004,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:connection-layer",
  "entity_key": "component:connection-layer",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Connection Abstraction Layer",
   "summary": "ConnectionType vtable abstracting TCP/Unix/TLS transports over anet.c low-level socket helpers.",
   "description": "connection.c/h define the ConnectionType function table (ae_handler, accept_handler, read/write/writev, listen, addr) and connTypeRegister; socket.c registers CT_Socket (tcp), unix.c registers CT_Unix, tls.c registers CT_TLS, so networking code is transport-agnostic. Connection state machine CONN_STATE_CONNECTING/ACCEPTING/CONNECTED/CLOSED plus CONN_FLAG_WRITE_BARRIER; anet.c ('basic TCP socket stuff made a bit less boring') provides anetTcpServer, anetUnixServer, anetNonBlock, keepalive and DNS helpers. Searchable as 'connection type', 'listener', 'accept handler', 'bind', 'unix socket'; directives: port, bind, tcp-backlog, unixsocket, unixsocketperm; symptoms: 'Could not create server TCP listening socket', accept backlog overflow.",
   "path": "src/connection.c, src/connection.h, src/anet.c, src/socket.c, src/unix.c",
   "loc": 812,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:tls-layer",
  "entity_key": "component:tls-layer",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "TLS Layer",
   "summary": "OpenSSL-backed CT_TLS connection type; can be built into the core or as a separate module.",
   "description": "Implements the CT_TLS ConnectionType over OpenSSL: createSSLContext builds server/client SSL_CTX (redis_tls_ctx/redis_tls_client_ctx) from redisTLSContextConfig, with session caching, keyfile-password callbacks, and TLSv1.3 detection; compiled in-core or as a module depending on USE_OPENSSL/BUILD_TLS_MODULE. Because TLS can buffer decrypted bytes, beforeSleep calls connTypeProcessPendingData/connTypeHasPendingData to drain pending reads and avoid sleeping on hidden data. Searchable as 'TLS handshake failure', 'certificate reload', 'tls-port', 'SSL_ERROR'; directives: tls-port, tls-cert-file, tls-key-file, tls-ciphers, tls-auth-clients, tls-replication, tls-cluster.",
   "path": "src/tls.c",
   "loc": 1297,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:io-threads",
  "entity_key": "component:io-threads",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "IO Threads",
   "summary": "Multi-threaded I/O: per-thread event loops offload socket reads, RESP parsing, and writes; commands still run on the main thread.",
   "description": "iothread.c (2024 redesign) gives each IOThread its own aeEventLoop and IOThreadBeforeSleep; clients are pinned via assignClientToIOThread/fetchClientFromIOThread and exchanged through mutex-protected pending lists plus eventNotifier wakeups (enqueuePendingClientsToMainThread, handleClientsFromMainThread). IO threads perform read(2), protocol parsing (CLIENT_IO_PENDING_COMMAND handoff), reply writing and per-client cron, while processClientsFromIOThread executes the parsed commands on the main thread — with prefetchIOThreadCommands batching memory prefetch — so command execution stays single-threaded and race-free. Searchable as 'threaded I/O', 'io-threads', 'client handoff', 'running_tid', 'IO thread pause'; directive: io-threads (immutable, default 1; io-threads-do-reads is now deprecated).",
   "path": "src/iothread.c",
   "loc": 1080,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:resp-protocol",
  "entity_key": "component:resp-protocol",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "RESP Reply Parser & CallReply",
   "summary": "Callback-based RESP2/RESP3 reply parser and the opaque CallReply object used by RM_Call and Lua redis.call().",
   "description": "resp_parser.c is a callback-driven parser (parseReply with per-type callbacks: array/set/map/attribute/big-number/verbatim) for replies generated by Redis itself — explicitly documented as NOT safe for parsing user input; call_reply.c wraps it in the opaque CallReply struct (REPLY_FLAG_ROOT/PARSED/RESP3) with lazy parsing and nested sub-reply access, consumed by the module API (RM_Call) and Lua scripting. Searchable as 'RESP parser', 'CallReply', 'RM_Call reply', 'RESP3 map/set/attribute', 'reply protocol blob'.",
   "path": "src/resp_parser.c, src/call_reply.c",
   "loc": 540,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:command-table",
  "entity_key": "component:command-table",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Command Table",
   "summary": "Generated redisCommand table: 460 JSON specs compiled into commands.def via MAKE_CMD macros.",
   "description": "commands.c is a 13-line shim: MAKE_CMD/MAKE_ARG macros expand commands.def (or commands_with_reply_schema.def when LOG_REQ_RES is defined) into the redisCommand/redisCommandArg tables consumed by lookupCommand and COMMAND DOCS/INFO. The .def file is generated by utils/generate-command-code.py from ~460 per-command JSON files in src/commands/ carrying arity, flags, ACL categories, key specs, history and tips; cli_commands.c reuses the same .def for redis-cli. Searchable as 'command table', 'command flags', 'key specs', 'arity', 'commands.def generation', 'unknown command'.",
   "path": "src/commands.c, src/commands.def, src/commands/",
   "loc": 12000,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:config-engine",
  "entity_key": "component:config-engine",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Config Engine",
   "summary": "Typed config registry (standardConfig) behind redis.conf parsing and CONFIG GET/SET/REWRITE.",
   "description": "config.c declares every directive in a static_configs table via createBoolConfig/createIntConfig/createEnumConfig/createStringConfig/createSpecialConfig macros with flags (MODIFIABLE_CONFIG, IMMUTABLE_CONFIG, DEBUG_CONFIG), bounds, defaults and apply/update callbacks (e.g. updateHZ, applyTLSPort); loadServerConfig/loadServerConfigFromString parse redis.conf and stdin, configSetCommand/configGetCommand implement CONFIG SET/GET with glob matching, and rewriteConfigState powers CONFIG REWRITE preserving user comments; a deprecatedConfig list silently accepts retired directives like io-threads-do-reads. Searchable as 'config directive', 'CONFIG REWRITE', 'immutable config', 'FATAL CONFIG FILE ERROR', 'unknown directive'.",
   "path": "src/config.c",
   "loc": 3905,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:background-io",
  "entity_key": "component:background-io",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Background I/O (bio)",
   "summary": "Dedicated worker threads for blocking ops: deferred close(2), AOF fsync, lazy-free; plus fork-child info pipe.",
   "description": "bio.c runs fixed worker threads (BIO_WORKER_CLOSE_FILE, BIO_WORKER_AOF_FSYNC, BIO_WORKER_LAZY_FREE) each draining a FIFO job queue in insertion order; bioInit/bioSubmitJob plus bioCreateCloseJob, bioCreateCloseAofJob, bioCreateFsyncJob, bioCreateLazyFreeJob, and completion-callback jobs (bioCreateCompRq / BIO_COMP_RQ_*) that notify the main thread through a pipe read in the event loop; bioDrainWorker/bioKillThreads used at shutdown and by DEBUG. childinfo.c opens a child->parent pipe (openChildInfoPipe) reporting copy-on-write bytes and progress from RDB/AOF fork children, polled by serverCron's receiveChildInfo. Searchable as 'bio threads', 'background fsync', 'lazyfree thread', 'slow close', 'copy-on-write reporting'.",
   "path": "src/bio.c, src/childinfo.c",
   "loc": 449,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "interface:resp3",
  "entity_key": "interface:resp3",
  "labels": [
   "Interface"
  ],
  "properties": {
   "name": "RESP2/RESP3 Wire Protocol",
   "summary": "Redis serialization protocol spoken on every client connection; RESP3 adds maps, sets, push and attribute frames.",
   "description": "The request/reply protocol clients speak over TCP/Unix/TLS: multibulk requests parsed by processMultibulkBuffer, replies built by the addReply* family. HELLO 2|3 (helloCommand) selects the per-client version (c->resp); RESP3 adds typed maps (%), sets (~), doubles, big numbers, verbatim strings, attributes, and out-of-band push frames (addReplyPushLen) used by client-side caching and pub/sub. Same grammar is re-parsed internally by resp_parser.c for RM_Call/Lua replies."
  }
 },
 {
  "id": "adapter:ae-epoll",
  "entity_key": "adapter:ae-epoll",
  "labels": [
   "Adapter"
  ],
  "properties": {
   "name": "ae epoll backend",
   "summary": "Linux epoll(7) multiplexing backend for the ae event loop (ae_epoll.c), selected when HAVE_EPOLL.",
   "description": "aeApiCreate/aeApiPoll wrappers over epoll_create/epoll_ctl/epoll_wait; the default and fastest general backend on Linux, compiled in via #ifdef HAVE_EPOLL in ae.c."
  }
 },
 {
  "id": "adapter:ae-kqueue",
  "entity_key": "adapter:ae-kqueue",
  "labels": [
   "Adapter"
  ],
  "properties": {
   "name": "ae kqueue backend",
   "summary": "BSD/macOS kqueue multiplexing backend (ae_kqueue.c), selected when HAVE_KQUEUE.",
   "description": "aeApi* implementation over kqueue/kevent for FreeBSD, OpenBSD and macOS builds; chosen after evport/epoll in ae.c's compile-time preference order."
  }
 },
 {
  "id": "adapter:ae-select",
  "entity_key": "adapter:ae-select",
  "labels": [
   "Adapter"
  ],
  "properties": {
   "name": "ae select backend",
   "summary": "Portable select(2) fallback backend (ae_select.c) used when no better multiplexer exists.",
   "description": "Lowest-performance fallback in ae.c's backend ladder; limited by FD_SETSIZE, used only on platforms without evport/epoll/kqueue."
  }
 },
 {
  "id": "adapter:ae-evport",
  "entity_key": "adapter:ae-evport",
  "labels": [
   "Adapter"
  ],
  "properties": {
   "name": "ae evport backend",
   "summary": "illumos/Solaris event-ports backend (ae_evport.c), highest priority in the compile-time ladder.",
   "description": "Contributed by Joyent for illumos event ports (port_create/port_getn); listed first in ae.c's 'ordered by performances, descending' backend selection."
  }
 },
 {
  "id": "adapter:openssl-tls",
  "entity_key": "adapter:openssl-tls",
  "labels": [
   "Adapter"
  ],
  "properties": {
   "name": "OpenSSL",
   "summary": "OpenSSL library backing tls.c: SSL_CTX setup, handshakes, session caching, cert/key loading.",
   "description": "tls.c targets OpenSSL >= 1.0 with version-conditional init (OPENSSL_config vs OPENSSL_init_crypto), RAND seeding checks, and locking callbacks for pre-1.1.0; encapsulated so it can ship as a loadable TLS module (BUILD_TLS_MODULE)."
  }
 },
 {
  "id": "config:hz",
  "entity_key": "config:hz",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "hz",
   "summary": "serverCron frequency (calls per second).",
   "description": "Controls how often serverCron runs and the granularity of run_with_period tasks (client timeouts, expired-key sampling, replicationCron); updateHZ callback applies changes live. Higher hz = more CPU, lower latency for background tasks.",
   "default": "10"
  }
 },
 {
  "id": "config:io-threads",
  "entity_key": "config:io-threads",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "io-threads",
   "summary": "Number of I/O threads (1 = classic single-threaded I/O).",
   "description": "IMMUTABLE_CONFIG, range 1-128. Above 1, initThreadedIO spawns IOThreadMain threads each with its own event loop, handling reads, RESP parsing and writes; redis.conf advises leaving at least one spare core and enabling only under real CPU pressure.",
   "default": "1"
  }
 },
 {
  "id": "config:client-output-buffer-limit",
  "entity_key": "config:client-output-buffer-limit",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "client-output-buffer-limit",
   "summary": "Per-class (normal/replica/pubsub) hard and soft output buffer limits.",
   "description": "Special multi-arg config enforced by closeClientOnOutputBufferLimitReached: clients exceeding the hard limit, or the soft limit for soft-seconds, are disconnected — the classic cause of 'client scheduled to be closed ASAP for overcoming of output buffer limits' and replica disconnect loops.",
   "default": "normal 0 0 0 slave 256mb 64mb 60 pubsub 32mb 8mb 60"
  }
 },
 {
  "id": "config:tls-port",
  "entity_key": "config:tls-port",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "tls-port",
   "summary": "TLS listening port; 0 disables TLS.",
   "description": "applyTLSPort creates the CT_TLS listener; requires tls-cert-file/tls-key-file to be configured or connections fail at handshake.",
   "default": "0"
  }
 },
 {
  "id": "feature:threaded-io",
  "entity_key": "feature:threaded-io",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Threaded I/O",
   "summary": "Multi-core scaling of socket I/O and protocol parsing without sharding or pipelining.",
   "description": "Per-thread event loops (iothread.c) take over read(2), RESP parsing and write(2) for assigned clients while command execution remains on the main thread; enabled by io-threads > 1. Redis.conf frames it as an alternative to pipelining/multi-instance sharding for boxes with 4+ cores.",
   "lifecycle": "active"
  }
 },
 {
  "id": "feature:tls-support",
  "entity_key": "feature:tls-support",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "TLS Connections",
   "summary": "Encrypted client, replication, and cluster-bus connections via the CT_TLS connection type.",
   "description": "TLS terminates inside the server through the pluggable connection layer; tls-replication and tls-cluster extend it to replica links and the cluster bus. Buildable in-core or as a module (USE_OPENSSL/BUILD_TLS_MODULE).",
   "lifecycle": "active"
  }
 },
 {
  "id": "decision:compile-time-multiplexer-selection",
  "entity_key": "decision:compile-time-multiplexer-selection",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Select the I/O multiplexing backend at compile time, ordered by performance",
   "statement": "ae.c #includes exactly one backend (evport > epoll > kqueue > select) chosen by preprocessor checks rather than runtime dispatch.",
   "rationale": "Avoids virtual-dispatch overhead in the hottest loop and keeps each backend a tiny drop-in file implementing the same aeApi* functions.",
   "description": "The ae.c comment 'Include the best multiplexing layer supported by this system. The following should be ordered by performances, descending' documents the explicit ladder: HAVE_EVPORT -> HAVE_EPOLL -> HAVE_KQUEUE -> select fallback.",
   "evidence": "src/ae.c lines 30-44: '#ifdef HAVE_EVPORT ... #include \"ae_evport.c\" ... #include \"ae_select.c\"' with the ordering comment.",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:connection-type-vtable",
  "entity_key": "decision:connection-type-vtable",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Pluggable ConnectionType vtable unifies TCP, Unix, and TLS transports",
   "statement": "All transports register a ConnectionType (function table with ae_handler, accept, read/write/writev, listen) via connTypeRegister, so networking.c is transport-agnostic.",
   "rationale": "Lets TLS ship as an optional module and keeps encryption/socket details out of client logic; the same abstraction supports replication and cluster links over any transport.",
   "description": "connection.h defines the ConnectionType struct with init/cleanup/configure and I/O hooks; socket.c (CT_Socket), unix.c (CT_Unix) and tls.c (CT_TLS) each register themselves into the static connTypes[CONN_TYPE_MAX] array.",
   "evidence": "src/connection.h ConnectionType struct definition; src/connection.c connTypeRegister; CT_Socket/CT_Unix/CT_TLS registrations in src/socket.c:467, src/unix.c:218, src/tls.c:403.",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:json-generated-command-table",
  "entity_key": "decision:json-generated-command-table",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Command table generated from per-command JSON specs",
   "statement": "Command metadata lives in src/commands/*.json (460 files) and is compiled by utils/generate-command-code.py into commands.def, expanded by MAKE_CMD macros in commands.c.",
   "rationale": "Single source of truth for arity, flags, ACL categories, key specs, history and docs shared by the server, COMMAND DOCS output, and redis-cli (cli_commands.c includes the same .def).",
   "description": "commands.c is a 13-line macro shim; a parallel commands_with_reply_schema.def exists for LOG_REQ_RES builds that validate reply schemas.",
   "evidence": "src/commands.c (#include \"commands.def\" behind MAKE_CMD/MAKE_ARG), src/commands/ JSON directory, utils/generate-command-code.py.",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:resp-parser-trusted-input-only",
  "entity_key": "decision:resp-parser-trusted-input-only",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Internal RESP parser is deliberately not hardened for user input",
   "statement": "resp_parser.c only parses replies generated by Redis itself (RM_Call, Lua redis.call) and skips validations, trading safety checks for speed.",
   "rationale": "The blob being parsed was just produced by the reply-writing code, so full protocol validation would be redundant on the hot module/scripting path.",
   "description": "Header comment states: 'NOTE: This parser is designed to only handle replies generated by Redis itself. It does not perform many required validations and thus NOT SAFE FOR PARSING USER INPUT.'",
   "evidence": "src/resp_parser.c top-of-file comment block.",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "document:redis-conf-reference",
  "entity_key": "document:redis-conf-reference",
  "labels": [
   "Document"
  ],
  "properties": {
   "name": "redis.conf annotated configuration reference",
   "title": "redis.conf annotated configuration reference",
   "path": "redis.conf",
   "summary": "Self-documenting example config; the THREADED I/O, TLS, and clients sections explain tuning rationale.",
   "description": "The self-documenting example config, organized in banner sections: INCLUDES, MODULES, NETWORK, TLS/SSL, GENERAL, SNAPSHOTTING, REPLICATION, KEYS TRACKING, SECURITY/ACL, CLIENTS, MEMORY MANAGEMENT, LAZY FREEING, THREADED I/O, KERNEL OOM, APPEND ONLY MODE, BACKUP/RESTORE, SHUTDOWN, REDIS CLUSTER, SLOW LOG, LATENCY MONITOR/TRACKING, EVENT NOTIFICATION, ADVANCED CONFIG, ACTIVE DEFRAGMENTATION. Each directive's comments carry defaults and operational guidance (memory units, maxmemory policies, appendfsync tradeoffs), making it the de facto ops manual."
  }
 },
 {
  "id": "component:object-system",
  "entity_key": "component:object-system",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Object System (robj/kvobj)",
   "summary": "robj/kvobj value containers: type+encoding tags, refcounting, LRU/LFU bits, embedded keys and metadata",
   "description": "Core value container: struct redisObject (robj) carries 4-bit type (OBJ_STRING..OBJ_STREAM, plus fork-specific OBJ_ARRAY and OBJ_GCRA) and 4-bit encoding (OBJ_ENCODING_RAW/INT/EMBSTR/HT/INTSET/SKIPLIST/QUICKLIST/LISTPACK/LISTPACK_EX/TMPL_LP/TMPL_ARRAY); kvobj is a robj with iskvobj=1 that embeds the key sds inline and prepends up to 8 8-byte metadata slots selected by metabits (slot 0 = expiry). Key functions: createObject, createStringObject, createEmbeddedStringObject (embstr for strings <= 44 bytes, OBJ_ENCODING_EMBSTR_SIZE_LIMIT), kvobjSet/kvobjCreate, kvobjMetaRef, incrRefCount/decrRefCount (OBJ_SHARED_REFCOUNT for immortal shared integers), dismissStringObject/dismissListObject (madvise-based COW relief), objectCommand (OBJECT ENCODING/FREQ/IDLETIME/REFCOUNT). Searchable as 'object encoding', 'embstr vs raw', 'refcount', 'shared objects', 'kvobj embedded key'; wrong-encoding symptoms show up as WRONGTYPE errors or unexpected OBJECT ENCODING output.",
   "path": "src/object.c, src/object.h",
   "loc": 1992,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:keyspace",
  "entity_key": "component:keyspace",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Keyspace (db.c)",
   "summary": "Per-database key lookup/add/delete over kvstore, lazy expiration on access, SCAN, FLUSH, RENAME/COPY",
   "description": "C-level DB API on redisDb: kvstore-backed db->keys and db->expires plus estore db->subexpires for hash-field TTLs; lookupKey/lookupKeyRead/lookupKeyWrite apply expireIfNeeded (flags EXPIRE_FORCE_DELETE_EXPIRED / EXPIRE_ALLOW_ACCESS_EXPIRED) so expired keys are deleted lazily on access; dbAdd/dbAddByLink/dbAddRDBLoad, setKey, dbGenericDelete (sync or lazyfree async), setExpire/removeExpire, scanGenericCommand+scanCallback (SCAN cursor semantics), flushallCommand/flushdbCommand with async flush blocking, renameGenericCommand, COPY/MOVE/RANDOMKEY/DBSIZE/TYPE, and per-type keysizes histograms (kvstoreMetadata). Searchable as 'keyspace lookup', 'lazy expiration on access', 'db->keys kvstore', 'SCAN guarantees', 'keyspace hit miss'; symptoms: keyspace_misses spikes, FLUSHALL latency, 'DEL vs UNLINK' behavior.",
   "path": "src/db.c",
   "loc": 4009,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:string-type",
  "entity_key": "component:string-type",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "String Type",
   "summary": "SET/GET family, INCR/DECR, ranges, APPEND, LCS, plus conditional SET (IFEQ/IFNE/IFDEQ/IFDNE) and DIGEST",
   "description": "String commands over sds-backed robj values: setGenericCommand implements SET/SETEX/PSETEX/SETNX/GETSET with NX/XX/GET/KEEPTTL and fork-specific conditional flags IFEQ/IFNE (compare value) and IFDEQ/IFDNE (compare XXH3 digest); also GETEX/GETDEL, SETRANGE/GETRANGE, MGET/MSET/MSETNX/MSETEX, INCR/DECR/INCRBY/INCRBYFLOAT/INCREX, APPEND, STRLEN, LCS, and digestCommand producing a 16-hex-char XXH3 value digest. Encodings: OBJ_ENCODING_INT for integers, EMBSTR <= 44 bytes, RAW otherwise; checkStringLength enforces proto-max-bulk-len (default 512MB). Searchable as 'string commands', 'SET NX XX', 'compare-and-set IFEQ', 'INCR overflow', 'string exceeds maximum allowed size'.",
   "path": "src/t_string.c",
   "loc": 1683,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:list-type",
  "entity_key": "component:list-type",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "List Type",
   "summary": "LPUSH/RPUSH/LMOVE/LMPOP lists with listpack-to-quicklist encoding conversion",
   "description": "List commands (LPUSH/RPUSH/LPUSHX/LINSERT/LRANGE/LREM/LPOS/LMOVE/RPOPLPUSH/LMPOP and blocking BLPOP/BRPOP/BLMPOP/BLMOVE) over two encodings: OBJ_ENCODING_LISTPACK for small lists and OBJ_ENCODING_QUICKLIST (linked list of listpacks) for large ones. listTypeTryConversionRaw/listTypeTryConvertListpack decide conversions in both directions (LIST_CONV_GROWING/SHRINKING) using quicklistNodeExceedsLimit against list-max-listpack-size (default -2 = 8KB per node); list-compress-depth enables LZF compression of interior quicklist nodes. Searchable as 'list encoding conversion', 'quicklist listpack threshold', 'blocking list pop'; symptoms: memory jump when a list converts to quicklist, OBJECT ENCODING listpack vs quicklist.",
   "path": "src/t_list.c",
   "loc": 1754,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:set-type",
  "entity_key": "component:set-type",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Set Type",
   "summary": "SADD/SINTER/SUNION/SDIFF sets with intset/listpack/hashtable encodings and size-based conversion",
   "description": "Unordered set commands (SADD/SREM/SMOVE/SISMEMBER/SMISMEMBER/SPOP/SRANDMEMBER/SINTER/SINTERCARD/SUNION/SDIFF plus fork-specific SUNIONCARD/SDIFFCARD, SSCAN) over three encodings: OBJ_ENCODING_INTSET for all-integer sets up to set-max-intset-entries (512), OBJ_ENCODING_LISTPACK up to set-max-listpack-entries (128) with values <= set-max-listpack-value (64 bytes), otherwise OBJ_ENCODING_HT. setTypeMaybeConvert/setTypeConvertAndExpand perform upward conversion with size hints; intset shrinks back to listpack when small enough. sunionDiffGenericCommand/sinterGenericCommand implement the algebra. Searchable as 'set encoding intset listpack hashtable', 'SPOP with count', 'SRANDMEMBER negative count', 'set conversion threshold'.",
   "path": "src/t_set.c",
   "loc": 2047,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:hash-type",
  "entity_key": "component:hash-type",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Hash Type",
   "summary": "HSET/HGET hashes with listpack/dict encodings, field TTLs (HFE via ebuckets), and shared hash templates",
   "description": "Largest type file (6.5k lines): hash commands (HSET/HGET/HDEL/HRANDFIELD/HSCAN/HINCRBY) over encodings OBJ_ENCODING_LISTPACK, LISTPACK_EX (listpackEx struct: listpack of key-value-ttl tuples ordered by TTL plus ExpireMeta), OBJ_ENCODING_HT (dict of Entry objects), and template encodings TMPL_LP/TMPL_ARRAY where many hashes share one immutable hashTemplate holding the field names once (hashTemplateRegistry, hashTemplateGetOrCreateWithHash, HIMPORT PREPARE/SET bulk-load commands). Hash Field Expiration (HFE): HEXPIRE/HPEXPIRE/HTTL/HPERSIST/HGETEX/HGETDEL/HSETEX attach per-field TTLs stored in a per-hash private ebuckets (dictType entryHashDictTypeWithHFE, onFieldExpire callback), and each HFE hash registers its minimum next-expiry in the global db->subexpires estore for active expiration. Conversion thresholds: hash-max-listpack-entries (512), hash-max-listpack-value (64); template use gated by hash-min/max-template-entries. Searchable as 'hash field TTL', 'HEXPIRE', 'hash encoding listpackex', 'hash templates shared field names', 'HFE active expiration'.",
   "path": "src/t_hash.c",
   "loc": 6578,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:zset-type",
  "entity_key": "component:zset-type",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Sorted Set Type",
   "summary": "ZADD/ZRANGE sorted sets on dual dict+skiplist (Pugh skiplist) or listpack for small sets",
   "description": "Sorted sets keep every element in two structures simultaneously: a dict (zsetDictType maps sds -> zskiplistNode*) for O(1) score lookup and a zskiplist (William Pugh skiplist with backward pointers and duplicate-score support; zslInsert/zslDelete/zslGetElementByRank, element sds embedded in the node via zskiplistNodeInfo/sdsoffset) for ordered range queries. Small zsets use OBJ_ENCODING_LISTPACK until zset-max-listpack-entries (128) or zset-max-listpack-value (64 bytes) is exceeded; zsetTypeMaybeConvert/zsetConvertAndExpand switch to OBJ_ENCODING_SKIPLIST. Commands: zaddGenericCommand (NX/XX/GT/LT/INCR/CH), zrangeGenericCommand (ZRANGE/ZRANGEBYSCORE/ZRANGEBYLEX/REV/STORE), ZRANK, ZPOPMIN/ZPOPMAX, ZMPOP/BZPOPMIN, ZINCRBY, ZUNIONSTORE/ZINTERSTORE/ZDIFF, ZRANDMEMBER, ZSCAN. Searchable as 'skiplist', 'zset dual data structure', 'ZRANGEBYSCORE slow', 'zset listpack conversion'.",
   "path": "src/t_zset.c",
   "loc": 5033,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:bitops",
  "entity_key": "component:bitops",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Bit Operations",
   "summary": "SETBIT/GETBIT/BITCOUNT/BITPOS/BITOP/BITFIELD over string values with AVX2/AVX512/NEON SIMD paths",
   "description": "Bit-level operations on string keys: setbitCommand/getbitCommand, bitcountCommand (redisPopcount with 28-byte-per-loop scalar unrolling plus AVX2/AVX512-VPOPCNTDQ and AArch64 NEON accelerated variants selected via __builtin_cpu_supports), bitposCommand, bitopCommand (AND/OR/XOR/NOT with bitopCommandAVX/bitopCommandAVX512 vectorized kernels), and bitfieldCommand/bitfieldroCommand implementing BITFIELD GET/SET/INCRBY with WRAP/SAT/FAIL overflow policies. lookupStringForBitCommand grows/creates the underlying sds; max addressable bit bounded by proto-max-bulk-len. Searchable as 'bitmap commands', 'popcount SIMD', 'BITFIELD overflow', 'bit offset out of range'.",
   "path": "src/bitops.c",
   "loc": 2201,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:hyperloglog",
  "entity_key": "component:hyperloglog",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "HyperLogLog",
   "summary": "PFADD/PFCOUNT/PFMERGE probabilistic cardinality: 16384 6-bit registers, dense/sparse encodings on strings",
   "description": "HyperLogLog cardinality estimator (Flajolet + Heule et al. 64-bit-hash variant) stored as a plain OBJ_STRING with 'HYLL' magic header, so no new type is introduced and HLLs survive GET/SET/RDB as strings. Two representations: HLL_DENSE (HLL_P=14 -> HLL_REGISTERS=16384 6-bit registers, ~12KB per key) and HLL_SPARSE (run-length encoded, promoted by hllSparseToDense once it exceeds hll-sparse-max-bytes, default 3000). Key functions: hllDenseAdd/hllSparseAdd, hllCount with cached cardinality in the header, PFADD/PFCOUNT/PFMERGE/PFDEBUG/PFSELFTEST commands; SIMD (AVX2/NEON) register-histogram paths. Searchable as 'HLL sparse dense', 'INVALIDHLL / WRONGTYPE Key is not a valid HyperLogLog', 'PFCOUNT accuracy 0.81%'.",
   "path": "src/hyperloglog.c",
   "loc": 2128,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:geo-index",
  "entity_key": "component:geo-index",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Geo Index",
   "summary": "GEOADD/GEOSEARCH/GEORADIUS: 52-bit interleaved geohash scores stored in a sorted set",
   "description": "Geospatial commands built entirely on zsets: geoaddCommand encodes longitude/latitude with geohashEncodeWGS84 (26-step interleaved geohash -> 52-bit score) and stores members via ZADD semantics; georadiusCommand/geosearchCommand/geosearchstoreCommand compute candidate boxes with geohashEstimateStepsByRadius and geohashGetAreasByRadiusWGS84 (9-cell neighbor search), then filter with Haversine distance into a geoArray sorted by pqsort. Also GEOPOS/GEODIST/GEOHASH (11-char base32 output). Uses zzlFirstInRange/zslValueLteMax exported from t_zset.c for direct zset introspection. Searchable as 'geohash encoding', 'GEORADIUS deprecated vs GEOSEARCH', 'geo distance wrong near poles', 'FROMMEMBER BYBOX'.",
   "path": "src/geo.c, src/geohash.c, src/geohash_helper.c",
   "loc": 1006,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:sort-engine",
  "entity_key": "component:sort-engine",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "SORT Engine",
   "summary": "SORT/SORT_RO for lists/sets/zsets with BY/GET patterns, LIMIT via partial qsort",
   "description": "sortCommandGeneric implements SORT and read-only SORT_RO over lists, sets and sorted sets: numeric or ALPHA comparison (sortCompare), BY pattern external-key sorting and GET pattern projection through lookupKeyByPattern which substitutes '*' in key patterns and supports 'key->field' hash-field dereferencing and '#' self-reference; LIMIT offset/count uses pqsort (partial quicksort) instead of full qsort; STORE writes the result as a list and BY nosort skips sorting for pure pagination. In cluster mode BY/GET are restricted unless keys hash to one slot. Searchable as 'SORT BY GET pattern', 'One or more scores can't be converted into double', 'SORT ALPHA', 'pqsort partial sorting'.",
   "path": "src/sort.c",
   "loc": 660,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:expire-cycle",
  "entity_key": "component:expire-cycle",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Active Expire Cycle",
   "summary": "Adaptive fast/slow active expiration of TTL keys plus HFE sub-expiry sweep; EXPIRE/TTL/PERSIST commands",
   "description": "activeExpireCycle incrementally deletes expired keys that were never touched: ACTIVE_EXPIRE_CYCLE_FAST (<=1000us, run from beforeSleep) and ACTIVE_EXPIRE_CYCLE_SLOW (serverCron at hz, capped at ACTIVE_EXPIRE_CYCLE_SLOW_TIME_PERC=25% CPU), sampling ACTIVE_EXPIRE_CYCLE_KEYS_PER_LOOP=20 keys per db and repeating while >10% sampled were stale (ACTIVE_EXPIRE_CYCLE_ACCEPTABLE_STALE); effort scaled by active-expire-effort (1-10); maintains db->avg_ttl via avg_ttl_factor decay. activeExpireCycleTryExpire deletes and propagates DEL/UNLINK (lazyfree-lazy-expire); a parallel activeSubexpires pass walks db->subexpires via estoreActiveExpire/estoreGetNextNonEmptyBucket to expire hash fields (HFE). Also implements EXPIRE/PEXPIRE/EXPIREAT (NX/XX/GT/LT flags), TTL/PTTL, EXPIRETIME, PERSIST, TOUCH. Searchable as 'active expiration', 'expired keys not freed', 'stat_expiredkeys', 'expire cycle CPU'.",
   "path": "src/expire.c",
   "loc": 934,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:expiration-store",
  "entity_key": "component:expiration-store",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Expiration Store (estore)",
   "summary": "ebuckets-based per-slot store of items with ExpireMeta; currently indexes hashes with field TTLs",
   "description": "estore is to ebuckets what kvstore is to dict: struct _estore holds an ebArray of ebuckets (one per cluster slot with CLUSTER_SLOT_MASK_BITS buckets, or a single bucket standalone) plus a fenwickTree (fwtree) of cumulative bucket sizes for O(log n) first/next-non-empty-bucket iteration. Items must embed ExpireMeta; API: estoreCreate/estoreAdd/estoreRemove/estoreActiveExpire/estoreGetFirstNonEmptyBucket/estoreMoveEbuckets (used by atomic slot migration). Currently backs db->subexpires only: each hash with hash-field expiration registers with its earliest field expiry so the active cycle can find it. Searchable as 'estore', 'subexpires', 'HFE global registration', 'per-slot expiration buckets'.",
   "path": "src/estore.c, src/estore.h",
   "loc": 498,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:key-metadata",
  "entity_key": "component:key-metadata",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Key Metadata Framework + Hash Entry",
   "summary": "8-class per-key metadata slots on kvobj (class 0 = expire, others module-registered); Entry field-value objects",
   "description": "keymeta.c: framework attaching up to 8 independent 8-byte metadata values to a kvobj, indexed by the robj metabits bitmap; KEY_META_ID_EXPIRE=0 is reserved for TTL, IDs 1-7 are registered by modules (KeyMetaClass with 4-char names encoded like module type IDs, 'META-xxxx' entities, 32-bit class spec for RDB/DUMP) with lifecycle callbacks KeyMetaLoadFunc/SaveFunc/CopyFunc/RenameFunc/UnlinkFunc/FreeFunc/DefragFunc so copy, rename, RDB persistence and defrag stay consistent. entry.c: Entry is the compact hash field-value pair object used by OBJ_ENCODING_HT hashes — field stored as embedded sds with aux bits FIELD_SDS_AUX_BIT_ENTRY_HAS_EXPIRY / HAS_VALUE_PTR, value either embedded inline or via pointer, optional TTL metadata; setEntryWriteInfo/entryWrite compute single-allocation layouts. Searchable as 'key metadata class', 'metabits', 'module per-key metadata', 'hash entry embedded value'.",
   "path": "src/keymeta.c, src/keymeta.h, src/entry.c, src/entry.h",
   "loc": 1348,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "config:hash-max-listpack-entries",
  "entity_key": "config:hash-max-listpack-entries",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "hash-max-listpack-entries",
   "summary": "Max fields for listpack-encoded hashes",
   "description": "Hashes stay listpack/listpackEx up to this field count, then hashTypeConvert switches to dict-of-Entry (OBJ_ENCODING_HT). Alias: hash-max-ziplist-entries.",
   "default": "512"
  }
 },
 {
  "id": "config:zset-max-listpack-entries",
  "entity_key": "config:zset-max-listpack-entries",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "zset-max-listpack-entries",
   "summary": "Max entries for listpack-encoded sorted sets",
   "description": "Zsets stay OBJ_ENCODING_LISTPACK up to this count, then zsetConvertAndExpand builds the dict+skiplist representation. Alias: zset-max-ziplist-entries.",
   "default": "128"
  }
 },
 {
  "id": "config:active-expire-effort",
  "entity_key": "config:active-expire-effort",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "active-expire-effort",
   "summary": "Aggressiveness of the active expire cycle (1-10)",
   "description": "Scales keys-per-loop, fast-cycle duration, CPU percentage and acceptable-stale tolerance inside activeExpireCycle; higher values free expired keys sooner at more CPU cost.",
   "default": "1"
  }
 },
 {
  "id": "feature:hash-field-ttl",
  "entity_key": "feature:hash-field-ttl",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Hash Field Expiration (HFE)",
   "summary": "Per-field TTLs on hashes: HEXPIRE/HTTL/HPERSIST/HGETEX with ebuckets-backed active expiration",
   "description": "Fields of a hash can carry individual TTLs: HEXPIRE/HPEXPIRE/HEXPIREAT (NX/XX/GT/LT), HTTL/HPTTL, HEXPIRETIME, HPERSIST, HGETEX/HGETDEL/HSETEX. TTLs live in a per-hash private ebuckets (dict encoding) or TTL-ordered listpackEx; each HFE hash registers its minimum next-expiry in the global db->subexpires estore so activeSubexpires can expire fields across hashes without scanning. Expired fields propagate HDEL to replicas/AOF (propagateHashFieldDeletion).",
   "lifecycle": "active"
  }
 },
 {
  "id": "feature:hash-templates",
  "entity_key": "feature:hash-templates",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Shared Hash Templates",
   "summary": "Many hashes with identical field sets share one immutable field-name template (TMPL_LP/TMPL_ARRAY)",
   "description": "Memory optimization for large populations of schema-like hashes: field names are stored once in an immutable hashTemplate (registry keyed by field set and by fields-listpack blob for O(1) RESTORE resolution) and each hash stores only its values, either inline in a listpack ([template_id][v0]..[vN-1], OBJ_ENCODING_TMPL_LP) or as an sds array (OBJ_ENCODING_TMPL_ARRAY). HSET/HDEL that change the field set switch templates rather than editing one. HIMPORT PREPARE/SET/DISCARD bulk-loads template hashes; gated by hash-min/max-template-entries.",
   "lifecycle": "active"
  }
 },
 {
  "id": "feature:conditional-set",
  "entity_key": "feature:conditional-set",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Conditional SET (IFEQ/IFNE/IFDEQ/IFDNE) and DIGEST",
   "summary": "Compare-and-set on strings by value or XXH3 digest, plus a DIGEST command",
   "description": "setGenericCommand supports IFEQ/IFNE (set only if current value equals/differs from a supplied match value) and IFDEQ/IFDNE (compare against a 16-hex-char XXH3 64-bit digest of the current value), enabling optimistic concurrency on plain strings without WATCH/MULTI; digestCommand returns the value digest for later conditional writes.",
   "lifecycle": "active"
  }
 },
 {
  "id": "decision:zset-dual-structure",
  "entity_key": "decision:zset-dual-structure",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Sorted sets use a dict and a skiplist over the same elements",
   "statement": "Large zsets keep every element in both a hash table (member -> node) and a skiplist (score-ordered) sharing one sds allocation.",
   "rationale": "O(1) score lookup plus O(log N) ordered insert/remove/range in one type; the sds is owned by the skiplist node (freed only in zslFreeNode) and the dict stores zskiplistNode* with no destructors, saving one string copy per element.",
   "description": "Documented in the t_zset.c header: a Pugh skiplist modified to allow repeated scores, compare by member as satellite data, and carry level-1 backward pointers for ZREVRANGE; the dict (zsetDictType) resolves members to nodes via zslGetNodeElementForDict.",
   "evidence": "src/t_zset.c top-of-file comment ('ZSETs are ordered sets using two data structures...') and zsetDictType comment 'skiplist owns the node memory'",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:hll-as-string",
  "entity_key": "decision:hll-as-string",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "HyperLogLog is stored as a plain string, not a new type",
   "statement": "HLLs are OBJ_STRING values with a 16-byte 'HYLL' header, cached cardinality, and dense/sparse encodings.",
   "rationale": "Reusing the string type means HLLs work with GET/SET, RDB, replication and DUMP for free; the header caches the last computed cardinality so PFCOUNT is O(1) when unmodified, and sparse run-length encoding keeps small-cardinality keys tiny until hll-sparse-max-bytes forces dense promotion.",
   "description": "The hyperloglog.c design comment lists 'The use of the Redis string data type. No new type is introduced.' as an explicit implementation idea, alongside 16384 6-bit registers (~12KB) from a 64-bit hash.",
   "evidence": "src/hyperloglog.c header comment: 'The use of the Redis string data type. No new type is introduced.'",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:kvobj-embedded-key-metadata",
  "entity_key": "decision:kvobj-embedded-key-metadata",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Keys and metadata are embedded in the value object (kvobj)",
   "statement": "The dict entry stores a single kvobj allocation containing metadata slots (prepended, selected by metabits), the robj, the key sds, and for small strings the value itself.",
   "rationale": "One allocation per key-value removes a pointer and a separate key sds, improving memory footprint and locality; class-0 metadata is the expire time, so TTLs need no separate expires-dict payload, and keys with large embedded keys pre-reserve expire space (KEY_SIZE_TO_INCLUDE_EXPIRE_THRESHOLD=128) to avoid reallocating when EXPIRE is set later.",
   "description": "object.h documents the exact layouts ('Expiry Time | serverObject | key-hdr-size | sdshdr5 mykey') with up to 8 8-byte metadata classes placed before the struct in reverse class order; kvobjMetaRef popcounts metabits to locate a slot.",
   "evidence": "src/object.h 'kvobj (key-value object)' and 'kvobj with metadata (+expiration)' header comment; src/object.c KEY_SIZE_TO_INCLUDE_EXPIRE_THRESHOLD comment",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:hfe-two-level-expiry",
  "entity_key": "decision:hfe-two-level-expiry",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Hash field TTLs use per-hash ebuckets plus a global subexpires estore",
   "statement": "Each HFE hash tracks its own field TTLs privately, and registers only its minimum next-expiry in the per-db estore (db->subexpires) for the active cycle.",
   "rationale": "Active expiration across many hashes only needs the earliest deadline per hash; keeping full TTL ordering local (ebuckets or TTL-ordered listpackEx) avoids a giant global index, and HASH_NEW_EXPIRE_DIFF_THRESHOLD avoids re-registering the global entry for small TTL changes.",
   "description": "t_hash.c documents that hashes with HFE 'will be also registered in a global ebuckets DS with expiration time value that reflects their next minimum time to expire (db->subexpires)'; estore.h states estore currently manages subexpiry only for HFE, using a Fenwick tree for non-empty-bucket iteration in cluster mode.",
   "evidence": "src/t_hash.c 'Hash Field Expiration (HFE) Feature' comment (lines ~114-122); src/estore.h 'USAGE IN REDIS' section",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "component:sds",
  "entity_key": "component:sds",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "SDS Dynamic Strings",
   "summary": "Length-prefixed binary-safe dynamic string library (SDSLib 2.0) used for every Redis string value.",
   "description": "Binary-safe dynamic C strings with five header sizes (sdshdr5/8/16/32/64) chosen by sdsReqType so short strings pay 1-byte overhead; sdsnewlen/sdsMakeRoomFor/sdscatlen handle growth, and sdsResize/sdsRemoveFreeSpace trim allocations. Every key, value, client buffer, and protocol argument flows through sds, so searches like 'string overhead', 'sds header corruption', 'embstr vs raw' land here. Header/alloc mismatch bugs (alloc truncated below buffer size) are handled by adjustTypeIfNeeded per the top-of-file comment.",
   "path": "src/sds.c, src/sds.h",
   "loc": 1599,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:dict",
  "entity_key": "component:dict",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Hash Table (dict)",
   "summary": "Chained hash table with incremental rehashing; the backbone of the keyspace and most collections.",
   "description": "Power-of-two chained hash table (dictEntry, compact dictEntryNoValue variant) that rehashes incrementally: dictRehash moves buckets a step at a time and dictRehashMicroseconds lets serverCron time-box it, so lookups touch both ht_table[0] and ht_table[1] mid-rehash. dictSetResizeEnabled(DICT_RESIZE_AVOID) suppresses resizes while an RDB/AOF fork child exists to protect copy-on-write, though expand is still forced past dict_force_resize_ratio=4. dictScan implements the reverse-binary-cursor guarantee behind SCAN/HSCAN. Searchable as 'incremental rehashing', 'rehash latency spike', 'hash table resize during bgsave'; tuned by the activerehashing directive; keyed hashing uses SipHash (see checksums).",
   "path": "src/dict.c, src/dict.h",
   "loc": 2397,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:kvstore",
  "entity_key": "component:kvstore",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "kvstore (per-slot dict manager)",
   "summary": "Manages an array of dicts (one per cluster slot) with cumulative-count indexing via a Fenwick tree.",
   "description": "Wraps num_dicts hash tables (one per slot in cluster mode, one otherwise) behind a single keyspace API: struct _kvstore keeps a rehashing list, a resize_cursor for cron-driven gradual resizing, key/bucket counts, and a fenwickTree dict_sizes of cumulative key frequencies so kvstoreGetFairRandomDictIndex/kvstoreFindDictIndexByKeyIndex pick dicts weighted by size (fair RANDOMKEY in cluster mode). kvstoreIncrementallyRehash spreads rehash work across dicts and tracks overhead_hashtable_rehashing for INFO memory. Searchable as 'per-slot dictionary', 'kvstore', 'slot dict rehashing', 'cluster keyspace sharding'.",
   "path": "src/kvstore.c, src/kvstore.h",
   "loc": 1174,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:adlist",
  "entity_key": "component:adlist",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "adlist Doubly Linked List",
   "summary": "Generic doubly linked list (listCreate/listNode) used for clients, rehashing queues, and bookkeeping.",
   "description": "Plain doubly linked list of void* values with pluggable dup/free/match callbacks: listCreate, listAddNodeHead/Tail, listSearchKey, safe iterators via listGetIterator. Not a data-type encoding — it backs server bookkeeping such as the clients list, kvstore's rehashing queue, and blocked-client queues. Searchable as 'adlist', 'listNode', 'server linked list'.",
   "path": "src/adlist.c, src/adlist.h",
   "loc": 395,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:quicklist",
  "entity_key": "component:quicklist",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Quicklist",
   "summary": "Doubly linked list of listpack nodes with optional LZF compression; storage engine for the List type.",
   "description": "The List type's engine: a doubly linked list where each quicklistNode holds a listpack of entries (or a PLAIN node for huge elements, test-tunable via quicklistSetPackedThreshold). Node fill is bounded by optimization_level sizes 4096..65536 bytes selected by list-max-listpack-size (negative values -1..-5; alias list-max-ziplist-size), and interior nodes beyond list-compress-depth are LZF-compressed into quicklistLZF via lzf_compress. Searchable as 'quicklist node', 'list compression', 'LPUSH memory', 'quicklist bookmark'; failure symptoms include list memory bloat when fill limits are mistuned.",
   "path": "src/quicklist.c, src/quicklist.h",
   "loc": 3658,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:listpack",
  "entity_key": "component:listpack",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Listpack",
   "summary": "Compact single-allocation list-of-strings serialization; the successor to ziplist for all small encodings.",
   "description": "Flat byte-array serialization of a list of string/integer elements (original listpack spec): 6-byte header (LP_HDR_SIZE, 32-bit total len + 16-bit count), per-element encodings from 7-bit uint through 64-bit int and 6/12/32-bit strings, and a variable 'backlen' after each entry enabling backward traversal without ziplist's cascading prevlen updates. lpAppend/lpInsert/lpGet/lpSeek/lpSafeToAdd are the core API. It is the small-object encoding for hash, zset, set, and list (inside quicklist) and the entry payload format for streams. Searchable as 'listpack encoding', 'lpGet crash', 'hash-max-listpack-entries', 'ziplist replacement'.",
   "path": "src/listpack.c, src/listpack.h",
   "loc": 3588,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:ziplist-legacy",
  "entity_key": "component:ziplist-legacy",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Ziplist (legacy)",
   "summary": "SUPERSEDED by listpack: legacy compact list/hash encodings kept only to convert old RDB payloads.",
   "description": "Legacy compact encodings fully superseded by listpack: ziplist is the old <zlbytes><zltail><zllen>...<zlend> dually-linked byte array whose prevlen field caused cascading-update reallocations, and zipmap is the even older string->string small-hash map. No live data type uses them; rdb.c's ziplistPairsConvertAndValidateIntegrity / _ziplistEntryConvertAndValidate validate old-format RDB values and convert them to listpack on load. Searchable as 'ziplist deprecated', 'zipmap', 'old RDB encoding conversion', 'cascading prevlen update'.",
   "path": "src/ziplist.c, src/ziplist.h, src/zipmap.c, src/zipmap.h",
   "loc": 2665,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:rax",
  "entity_key": "component:rax",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Rax Radix Tree",
   "summary": "Compressed radix tree keyed by binary strings; indexes stream IDs, consumer-group PELs, and ebuckets.",
   "description": "Compressed radix (prefix) tree: raxNode packs edge characters inline, raxInsert/raxRemove/raxFind mutate it, raxStack retains parent chains for upward fixups, and raxIterator (raxStart/raxSeek/raxNext) walks keys in lexicographic order. It indexes stream entries by 16-byte big-endian stream IDs (stream.h), consumer-group pending-entries lists, and ebuckets' expiration buckets. Searchable as 'radix tree', 'raxNode', 'stream ID index', 'raxSeek iterator'; oom flags on raxStack signal allocation failure during deep walks.",
   "path": "src/rax.c, src/rax.h",
   "loc": 2993,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:intset",
  "entity_key": "component:intset",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Intset",
   "summary": "Sorted array of integers with on-demand 16/32/64-bit encoding upgrades; small-Set encoding.",
   "description": "Contiguous sorted integer array used as the Set type's encoding when all members are integers: _intsetValueEncoding picks INTSET_ENC_INT16/32/64, intsetAdd binary-searches for position, and intsetUpgradeAndAdd widens every element when a larger value arrives (upgrades are one-way). Converted to listpack/hashtable past set-max-intset-entries. Searchable as 'intset encoding', 'SADD integer set', 'intset upgrade', 'set-max-intset-entries'.",
   "path": "src/intset.c, src/intset.h",
   "loc": 566,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:ebuckets",
  "entity_key": "component:ebuckets",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Ebuckets (TTL buckets)",
   "summary": "Expiration-ordered bucket store over a rax (or list when small); backs estore and hash-field TTLs.",
   "description": "Stores items carrying an embedded ExpireMeta into time-interval buckets keyed by expiration-time >> EB_BUCKET_KEY_PRECISION in a rax tree (plain linked list when tiny). Each bucket holds segments (FirstSegHdr/NextSegHdr, cyclic singly linked, EB_SEG_MAX_ITEMS=16) so most add/remove work stays at segment level instead of mutating the rax (~40 bytes/leaf), and bucket keys are pruned to 6 bytes (EB_KEY_SIZE) to bound tree depth; full segments split buckets, while same-TTL overflow chains extended segments. ebAdd/ebRemove/ebExpire drive active expiration for the expiration-store (estore.c/expire.c) and hash-field expiration in t_hash.c. Searchable as 'ebuckets', 'TTL buckets', 'active expire data structure', 'HEXPIRE internals'.",
   "path": "src/ebuckets.c, src/ebuckets.h",
   "loc": 2725,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:mstr",
  "entity_key": "component:mstr",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Mstr (metadata string)",
   "summary": "Immutable string with optional attached metadata flags (mstrKind); largely idle after hash-entry rework.",
   "description": "String type that can carry typed metadata blocks before the char buffer: mstrNew builds headers MSTR_TYPE_5/8/16/64 (CREATE_MSTR_INFO packs len/ismeta/type into the info byte), and mstrKind/mstrFlags describe which metadata slots (mstrSumMetaLen) are attached. Originally introduced for hash fields with expiration; t_hash.c now notes its entry layout is 'simpler than the previous mstr approach', so mstr currently survives mostly with its unit test (mstrTest wired in server.c). Searchable as 'mstr', 'metadata string', 'hash field expiration string'.",
   "path": "src/mstr.c, src/mstr.h",
   "loc": 528,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:sparse-array",
  "entity_key": "component:sparse-array",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Sparse Array",
   "summary": "Memory-efficient sparse array over a 64-bit index space; engine of the new ARRAY data type.",
   "description": "Random-access sequence indexed by non-negative 64-bit integers with O(1) get/set: values are tagged pointer-sized words (ints/short strings inlined, arString heap fallback with 2-or-8-byte length headers via arStringLen), slices of ArraySliceSize elements keep sparse regions cheap, and ar->alloc_size is tracked on every zmalloc so kvobjAllocSize answers in O(1). Backs the ARRAY data type commands in t_array.c (argetCommand/arsetCommand/ardelCommand/arlenCommand/arscanCommand/argrepCommand/aropCommand/arinsertCommand; ARGREP uses the tre regex dep). Searchable as 'sparse array', 'redisArray', 'ARRAY type', 'array-slice-size'; tuned by array-slice-size/array-sparse-kmax/array-sparse-kmin.",
   "path": "src/sparsearray.c, src/sparsearray.h, src/t_array.c",
   "loc": 2080,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:fenwick-tree",
  "entity_key": "component:fenwick-tree",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Fenwick Tree",
   "summary": "Binary indexed tree of cumulative counts; lets kvstore find the dict owning the Nth key in O(log n).",
   "description": "Classic 1-based Fenwick/Binary Indexed Tree over 2^sizeBits slots: fwTreeCreate/fwTreeUpdate maintain per-index counts plus a running total, fwTreePrefixSum answers cumulative sums, and fwTreeFindIndex locates the first index whose prefix sum reaches a target. Its consumer is kvstore's dict_sizes field, which records cumulative key frequencies per dict-index so fair random dict selection and kvstoreFindDictIndexByKeyIndex work across cluster slot dicts without linear scans. Searchable as 'fenwick tree', 'binary indexed tree', 'BIT prefix sum', 'weighted random slot'.",
   "path": "src/fwtree.c, src/fwtree.h",
   "loc": 237,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:topk-sketch",
  "entity_key": "component:topk-sketch",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "CuckooHeavyKeeper Top-K",
   "summary": "Top-K heavy-hitter sketch (CuckooHeavyKeeper + min-heap) powering the HOTKEYS commands.",
   "description": "Probabilistic top-K structure from the paper 'Cuckoo Heavy Keeper and the balancing act of maintaining heavy hitters in stream processing' (Ngo & Papatriantafilou), extended with a min-heap of item names borrowed from RedisBloom's TopK: chkTopKCreate/chkTopKUpdate/chkTopKList, with lobby-to-heavy promotion (LOBBY_PROMOTION_THRESHOLD=16), bounded cuckoo eviction (MAX_KICKS=16), heavy-hitter threshold HEAVY_RATIO=0.008, and xxhash fingerprints. hotkeys.c instantiates one sketch per tracked metric (CPU and NET, decay 1.08, k*10 tracked keys) behind the HOTKEYS START/GET/STOP/RESET commands. Searchable as 'hotkeys sketch', 'heavy keeper', 'top-k keys', 'hot key detection'.",
   "path": "src/chk.c, src/chk.h",
   "loc": 822,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:vector-util",
  "entity_key": "component:vector-util",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Vec (append-only vector)",
   "summary": "Small append-only pointer vector with optional caller-provided stack storage; helper for db.c and t_hash.c.",
   "description": "Minimal growable array of void* (struct vec): vecInit accepts caller stack storage for the first initcap items before spilling to heap, vecPush/vecGet/vecReserve/vecClear/vecRelease manage it, and an optional per-element free callback runs on clear/release. Used by db.c and t_hash.c for transient element collections. Not related to vector-sets (that is a module). Searchable as 'vec', 'append-only vector', 'stack-backed vector'.",
   "path": "src/vector.c, src/vector.h",
   "loc": 227,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:lzf-compression",
  "entity_key": "component:lzf-compression",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "LZF Compression",
   "summary": "Vendored libLZF (Marc Lehmann) fast compressor used by quicklist nodes and RDB string objects.",
   "description": "In-tree copy of Marc Alexander Lehmann's libLZF: lzf_compress (hash-chain match finder tuned by HLOG/ULTRA_FAST/VERY_FAST) and lzf_decompress, favoring speed over ratio and aborting when data is incompressible. quicklist compresses interior nodes into quicklistLZF blobs (list-compress-depth), and rdb.c LZF-compresses string payloads when rdbcompression is enabled. Searchable as 'lzf_compress', 'rdbcompression', 'quicklist compressed node', 'LZF decompress corruption'.",
   "path": "src/lzf_c.c, src/lzf_d.c, src/lzfP.h",
   "loc": 500,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:checksums",
  "entity_key": "component:checksums",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Checksums & Hash Primitives",
   "summary": "CRC16/CRC64 (speed-optimized), SipHash 1-2, SHA1, and SHA256 primitives shared across the server.",
   "description": "Hash/checksum toolbox: crc16 computes cluster key hash slots (CRC16 mod 16384); crc64 with crcspeed's table-generated, segment-parallel implementation (Mark Adler base, Matt Stancliff and Josiah Carlson mods, 10-90% faster on >1MB blobs) and crccombine's gf2_matrix_times_vec CRC merging checksums RDB files via rio.c and DEBUG DIGEST; siphash implements SipHash 1-2 (deliberately reduced from 2-4, which cost ~4% throughput) as the dict seed-keyed hash defending against hash-flooding; sha1 backs EVALSHA script digests and sha256 backs ACL password hashing. Searchable as 'rdb checksum mismatch', 'crc64', 'key hash slot', 'siphash', 'hash flooding DoS'.",
   "path": "src/crc16.c, src/crc64.c, src/crccombine.c, src/crcspeed.c, src/siphash.c, src/sha1.c, src/sha256.c",
   "loc": 1900,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "feature:array-datatype",
  "entity_key": "feature:array-datatype",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "ARRAY data type",
   "summary": "New Redis data type: 64-bit-indexed arrays with ARGET/ARSET/ARDEL/ARSCAN/ARGREP/AROP commands.",
   "description": "A first-class array type whose command surface lives in t_array.c (argetCommand, armget/armset, ardelrange, arlen/arcount, argetrange, arscan, argrep with tre-based regex, arop, arinsert) on top of the sparse-array structure, with RDB/AOF/defrag/lazyfree integration across rdb.c, aof.c, defrag.c, and lazyfree.c.",
   "lifecycle": "active"
  }
 },
 {
  "id": "decision:siphash12-over-siphash24",
  "entity_key": "decision:siphash12-over-siphash24",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "SipHash 1-2 chosen over the standard 2-4 variant",
   "statement": "Redis hashes dict keys with reduced-round SipHash 1-2 rather than the canonical SipHash 2-4.",
   "rationale": "The 2-4 variant slowed Redis by roughly 4%; 1-2 runs at Murmurhash2 speed while still keeping seed-keyed protection against hash-flooding attacks, with no known trivial attacks on the reduced-round form.",
   "description": "The modification notes in siphash.c document the tradeoff explicitly, including hard-coded rounds for compiler optimization and case-insensitive variants for command lookup.",
   "evidence": "src/siphash.c header comment: 'We use SipHash 1-2 ... the 2-4 variant slowed down Redis by a 4% figure more or less.'",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:dict-resize-avoid-during-cow",
  "entity_key": "decision:dict-resize-avoid-during-cow",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Dict resizing is suppressed while a fork child is saving",
   "statement": "dictSetResizeEnabled(DICT_RESIZE_AVOID) disables most rehashing while RDB/AOF-rewrite children run, to avoid copy-on-write memory blowup.",
   "rationale": "Rehashing moves every bucket, dirtying pages shared with the fork child; avoiding resizes keeps COW cost down, with a safety valve forcing expansion once used/buckets >= dict_force_resize_ratio (4) or shrink below 1/(HASHTABLE_MIN_FILL*ratio).",
   "description": "Documented at the top of dict.c next to dict_can_resize; serverCron toggles the mode around child lifecycle.",
   "evidence": "src/dict.c:34-46 comment on dictSetResizeEnabled/DICT_RESIZE_AVOID and dict_force_resize_ratio",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:chk-cuckoo-heavy-keeper-adoption",
  "entity_key": "decision:chk-cuckoo-heavy-keeper-adoption",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Hot-key tracking uses CuckooHeavyKeeper plus a RedisBloom-style min-heap",
   "statement": "The top-K sketch implements the Ngo & Papatriantafilou CuckooHeavyKeeper algorithm, extended with a min-heap to retain the names of the top K elements.",
   "rationale": "CuckooHeavyKeeper balances accuracy and memory for heavy-hitter detection in streams; the sketch alone tracks counts, so a k-sized heap (idea credited to RedisBloom's TopK) is added to answer 'which keys' rather than just 'how heavy'.",
   "description": "The chk.c header cites the paper and the reference C++ implementation, and constants (HEAVY_RATIO=0.008, MAX_KICKS=16, LOBBY_PROMOTION_THRESHOLD=16) encode the paper's tuning.",
   "evidence": "src/chk.c:1-16 header comment citing the paper, reference repo, and RedisBloom min-heap addition",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "component:zmalloc-layer",
  "entity_key": "component:zmalloc-layer",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "zmalloc Allocation Layer",
   "summary": "Memory-accounting wrapper over malloc; routes to jemalloc/tcmalloc/libc and tracks used_memory.",
   "description": "Allocator abstraction (zmalloc/zcalloc/zrealloc/zfree, ztrymalloc_usable, zmalloc_with_flags, zmalloc_no_tcache) that macro-redirects to je_malloc/tc_malloc/libc and keeps global used-memory accounting in cache-line-aligned per-thread used_memory_entry slots (DEDICATED_ENTRIES=8 single-writer atomics, overflow threads share hashed RMW slots). Also provides RSS/fragmentation introspection: zmalloc_get_rss, zmalloc_get_allocator_info (jemalloc stats.allocated/active/resident), zmalloc_get_smap_bytes_by_field, jemalloc_purge, set_jemalloc_bg_thread, zmadvise_dontneed, plus OOM handler hooks (zmalloc_set_oom_handler). Searchable as 'used_memory accounting', 'memory fragmentation ratio', 'RSS vs allocated', 'OOM allocating', 'INFO memory'; sets je_malloc_conf tcache tuning (lg_tcache_nslots_mul:3,tcache_nslots_small_max:1000) at compile time.",
   "path": "src/zmalloc.c, src/zmalloc.h",
   "loc": 1308,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:eviction",
  "entity_key": "component:eviction",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Maxmemory Eviction",
   "summary": "maxmemory enforcement via sampled LRU/LFU approximation with a 16-entry eviction pool.",
   "description": "Implements the maxmemory directive: performEvictions() checks getMaxmemoryState() before command execution and evicts keys using an approximated LRU/LFU — evictionPoolPopulate() samples maxmemory-samples random keys per pass into the EVPOOL_SIZE=16 evictionPoolEntry array ordered by idle time (LRU_CLOCK/estimateObjectIdleTime) or inverse frequency (LFULogIncr/LFUDecrAndReturn, 16-bit minutes + 8-bit log counter packed in robj->lru). Eviction time is bounded by evictionTimeLimitUs() derived from maxmemory-eviction-tenacity, continuing via an ae timer (evictionTimeProc); freeMemoryGetNotCountedMemory() excludes AOF/replication buffers to avoid eviction feedback loops; deletes go async when lazyfree-lazy-eviction is set. Searchable as 'OOM command not allowed when used memory > maxmemory', 'evicted_keys', 'allkeys-lru vs volatile-lfu', 'eviction-cycle latency event', 'noeviction'; skips importing ASM slots and paused-evict states (isSafeToPerformEvictions).",
   "path": "src/evict.c",
   "loc": 764,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:defrag",
  "entity_key": "component:defrag",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Active Defragmentation",
   "summary": "Stage-based active defrag that reallocates fragmented pointers using jemalloc defrag hints.",
   "description": "Active memory defragmentation: activeDefragCycle() -> computeDefragCycles() -> beginDefragCycle() runs a list of StageDescriptor stages (defragStageDbKeys, expires, pubsub kvstores, Lua scripts, hash templates, module defrag callbacks) inside bounded ae timer slices (activeDefragTimeProc, DEFRAG_CYCLE_US=500us). Core primitive activeDefragAlloc()/activeDefragAllocWithoutFree() asks jemalloc's je_get_defrag_hint() whether moving a pointer helps, then reallocates via zmalloc_no_tcache; hits/misses tracked in stat_active_defrag_hits/misses and getAllocatorFragmentation() computes frag percent. Searchable as 'mem_fragmentation_ratio high', 'active-defrag-cycle latency spike', 'external fragmentation', 'CONFIG SET activedefrag yes'; compiled only when HAVE_DEFRAG (jemalloc builds); tuned by active-defrag-threshold-lower/upper, active-defrag-ignore-bytes, active-defrag-cycle-min/max.",
   "path": "src/defrag.c",
   "loc": 2176,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:lazyfree",
  "entity_key": "component:lazyfree",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Lazy Free (Async Reclaim)",
   "summary": "Asynchronous freeing of big objects and whole databases on the bio lazyfree thread.",
   "description": "Offloads expensive frees to the background: freeObjAsync() computes lazyfreeGetFreeEffort() (quicklist nodes, dict size, skiplist length, stream rax nodes + consumer-group PEL estimate, module free_effort) and hands objects exceeding LAZYFREE_THRESHOLD=64 with refcount==1 to the bio thread (lazyfreeFreeObject); emptyDbAsync()/kvsLazyfreeFree() free whole kvstores for FLUSHALL ASYNC plus estore subexpires and ASM trim histogram deltas, then flush jemalloc tcache and jemalloc_purge(). Also lazily frees the client-tracking rax, error-stats rax, lua_scripts dict, and functions lib; counters lazyfree_objects/lazyfreed_objects back INFO lazyfree_pending_objects. Searchable as 'UNLINK vs DEL', 'FLUSHALL ASYNC', 'lazyfree-lazy-expire', 'eviction-lazyfree latency event', 'big key delete blocking'.",
   "path": "src/lazyfree.c",
   "loc": 409,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:memory-prefetch",
  "entity_key": "component:memory-prefetch",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Command Batch Memory Prefetch",
   "summary": "Software-pipelined dict-lookup prefetcher that batches commands to hide memory stalls.",
   "description": "Amortizes cache-miss latency across a batch of parsed commands: a dictPrefetcher drives per-key dictPrefetchLookup state machines (PREFETCH_BUCKET -> PREFETCH_ENTRY -> PREFETCH_ENTRY_KEY -> PREFETCH_ENTRY_VALUE -> PREFETCH_DONE) issuing __builtin_prefetch-style loads while yielding between in-flight lookups, delegating payload prefetch to dictType->prefetchEntryKey/prefetchEntryValue. addCommandToBatch()/prefetchCommands() are called from the io-threads path (iothread.c) and networking.c before execution; determinePrefetchCount() sizes the window and prefetchCommandsBatchInit() allocates it. Searchable as 'memory access amortization', 'batch prefetch io-threads', 'dictFind cache miss', 'prefetch-batch-max-size' (hidden config, default 16, 0 disables); ported from Valkey contributors' work per file header.",
   "path": "src/memory_prefetch.c, src/memory_prefetch.h",
   "loc": 526,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:hotkeys-tracking",
  "entity_key": "component:hotkeys-tracking",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Hotkeys Tracking",
   "summary": "HOTKEYS command: per-key CPU-time and network-bytes top-K tracking via CuckooHeavyKeeper sketches.",
   "description": "New (2026) hotkey detection: HOTKEYS START [METRICS CPU|NET] [COUNT k] [DURATION] [SAMPLE ratio] [SLOTS ...] creates a hotkeyStats (server.hotkeys) holding two chkTopK CuckooHeavyKeeper sketches (chkTopKCreate with count*10 tracked keys) — one for CPU microseconds, one for network bytes. hotkeyStatsPreCurrentCmd/UpdateCurrentCmd/PostCurrentCmd hook command execution in server.c, extract keys via getKeysFromCommandWithSpecs, split cost per key, and support probabilistic sampling and cluster slot filtering (slotRangeArray, clusterNodeCoversSlot, clusterGetLocalSlotRanges); HOTKEYS GET returns by-cpu-time-us/by-net-bytes rankings plus rusage-based totals, HOTKEYS STOP/RESET manage the session. Searchable as 'hot key detection', 'top keys by CPU', 'skewed workload single slot', 'HOTKEYS command', 'per-slot hotspot'.",
   "path": "src/hotkeys.c, src/hotkeys.h",
   "loc": 693,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:rate-limiter",
  "entity_key": "component:rate-limiter",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "GCRA Rate Limiter",
   "summary": "GCRA command implementing leaky-bucket rate limiting with bursts; compile-gated behind ENABLE_GCRA.",
   "description": "Generic Cell Rate Algorithm rate limiter modeled on brandur's redis-cell: gcraCommand() (GCRA key max_burst tokens_per_period period [TOKENS n]) stores the Theoretical Arrival Time (TaT) in a dedicated OBJ_GCRA object with microsecond math (emission_interval_us, variance_us, allow_at = new_tat - variance) and replies [limited, max_burst, remaining, retry_after_s, reset_after_s]. Keys self-expire at their TaT via setExpireByLink, fire NOTIFY_RATE_LIMIT ('r' class) keyspace events, and replicate deterministically by rewriting to the internal GCRASETVALUE command since GCRA reads commandTimeSnapshot. Searchable as 'rate limiting', 'leaky bucket', 'throttle command', 'redis-cell CL.THROTTLE equivalent', 'ACL_CATEGORY_RATE_LIMIT'; entire feature is disabled by default and compiled in with -DENABLE_GCRA (server.h comment).",
   "path": "src/gcra.c",
   "loc": 284,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:latency-monitor",
  "entity_key": "component:latency-monitor",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Latency Monitor",
   "summary": "Per-event latency time series (LATENCY command) with spike history, doctor analysis and sparklines.",
   "description": "Event-based latency spike tracker: latencyAddSampleIfNeeded() (macro gated on latency-monitor-threshold ms) feeds latencyAddSample() into per-event latencyTimeSeries ring buffers (LATENCY_TS_LEN, 160 sec-resolution samples) stored in server.latency_events; instrumented events include eviction-cycle, eviction-lazyfree, expire-cycle, fork, aof-write, aof-fsync-always, active-defrag-cycle, command-unblocking, rdb-unlink-temp-file. latencyCommand() serves LATENCY HISTORY/LATEST/GRAPH (ASCII sparkline)/DOCTOR (human analysis incl. THPGetAnonHugePagesSize transparent-hugepage warning)/RESET, and hdr_histogram backs the LATENCY command percentile reporting (latency-tracking, latency-tracking-info-percentiles). Searchable as 'latency spikes', 'LATENCY DOCTOR', 'fork latency', 'transparent huge pages latency', 'latency-monitor-threshold'.",
   "path": "src/latency.c, src/latency.h",
   "loc": 721,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "adapter:jemalloc-allocator",
  "entity_key": "adapter:jemalloc-allocator",
  "labels": [
   "Adapter"
  ],
  "properties": {
   "name": "jemalloc Allocator",
   "summary": "Bundled jemalloc (deps/jemalloc) with Redis-specific defrag-hint and usize patches.",
   "description": "Default allocator on Linux, vendored in deps/jemalloc and bound via USE_JEMALLOC macro overrides in zmalloc.c (je_malloc/je_mallocx/je_dallocx, je_malloc_with_usize fast paths). Redis patches expose get_defrag_hint() (deps/jemalloc/src/jemalloc.c) which powers activeDefragAlloc's move-or-keep decision, plus je_mallctl hooks for stats.allocated/active/resident, thread.tcache.flush, arena purge (jemalloc_purge) and background_thread control (set_jemalloc_bg_thread). Compile-time je_malloc_conf raises tcache slots for small size classes. Searchable as 'USE_JEMALLOC', 'arena purge', 'tcache', 'allocator active vs resident'."
  }
 },
 {
  "id": "config:maxmemory",
  "entity_key": "config:maxmemory",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "maxmemory",
   "summary": "Memory usage limit in bytes; 0 means unlimited.",
   "description": "Upper bound on dataset memory; when exceeded, performEvictions() frees keys per maxmemory-policy or rejects writes with OOM errors under noeviction. AOF/replication buffers are excluded from the accounting (freeMemoryGetNotCountedMemory) to avoid eviction feedback loops.",
   "default": "0 (no limit)"
  }
 },
 {
  "id": "config:maxmemory-policy",
  "entity_key": "config:maxmemory-policy",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "maxmemory-policy",
   "summary": "Eviction strategy: noeviction, allkeys/volatile x lru/lfu/random, volatile-ttl.",
   "description": "Selects the victim-picking strategy in evict.c: LRU policies use estimateObjectIdleTime over sampled keys, LFU uses the 8-bit logarithmic counter (LFULogIncr/LFUDecrAndReturn with lfu-log-factor/lfu-decay-time), random and ttl variants bypass the idle ranking.",
   "default": "noeviction"
  }
 },
 {
  "id": "config:activedefrag",
  "entity_key": "config:activedefrag",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "activedefrag",
   "summary": "Enables active defragmentation (requires jemalloc build).",
   "description": "Gates activeDefragCycle(); when on, defrag stages run in ae timer slices whenever fragmentation exceeds active-defrag-threshold-lower and active-defrag-ignore-bytes. Only compiled under HAVE_DEFRAG (zmalloc.h, jemalloc builds).",
   "default": "no"
  }
 },
 {
  "id": "config:lazyfree-lazy-eviction",
  "entity_key": "config:lazyfree-lazy-eviction",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "lazyfree-lazy-eviction",
   "summary": "Free evicted keys asynchronously on the lazyfree bio thread.",
   "description": "When yes, maxmemory eviction deletes use dbAsyncDelete/freeObjAsync so big-object reclamation does not block the main thread; one of five lazyfree-lazy-* flags (expire, server-del, user-del, user-flush).",
   "default": "no"
  }
 },
 {
  "id": "config:latency-monitor-threshold",
  "entity_key": "config:latency-monitor-threshold",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "latency-monitor-threshold",
   "summary": "Minimum event duration in ms to record a latency spike; 0 disables.",
   "description": "Gate for latencyAddSampleIfNeeded(); events at or above the threshold are logged into per-event ring buffers consumed by LATENCY HISTORY/LATEST/DOCTOR/GRAPH.",
   "default": "0"
  }
 },
 {
  "id": "feature:hotkey-detection",
  "entity_key": "feature:hotkey-detection",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Hotkey Detection (HOTKEYS command)",
   "summary": "On-demand per-key CPU/network top-K profiling sessions with cluster slot filtering.",
   "description": "HOTKEYS START/STOP/GET/RESET sessions rank the hottest keys by CPU microseconds and network bytes using CuckooHeavyKeeper top-K sketches, with optional sampling ratio and slot selection for diagnosing skewed cluster workloads; results aggregate cleanly across nodes (array-of-map reply).",
   "lifecycle": "active"
  }
 },
 {
  "id": "feature:gcra-rate-limiting",
  "entity_key": "feature:gcra-rate-limiting",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "GCRA Rate Limiting",
   "summary": "Native GCRA/leaky-bucket rate-limit command with burst support, off by default (-DENABLE_GCRA).",
   "description": "The GCRA command provides redis-cell-style rate limiting in core: TaT-based allowance checks with burst capacity, self-expiring OBJ_GCRA keys, an 'r' keyspace-notification class, and GCRASETVALUE-based deterministic replication/AOF rewrite. Compile-gated behind ENABLE_GCRA.",
   "lifecycle": "in_progress"
  }
 },
 {
  "id": "feature:active-defragmentation",
  "entity_key": "feature:active-defragmentation",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Active Defragmentation",
   "summary": "Online compaction of fragmented allocations without restart.",
   "description": "Incremental, latency-bounded defrag of keys, expires, pubsub state, Lua scripts and module data driven by jemalloc utilization hints; monitored via INFO stats active_defrag_hits/misses and the active-defrag-cycle latency event.",
   "lifecycle": "active"
  }
 },
 {
  "id": "feature:async-memory-reclaim",
  "entity_key": "feature:async-memory-reclaim",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Asynchronous Memory Reclaim (UNLINK / lazy free)",
   "summary": "Background freeing of large objects and databases to keep the main thread responsive.",
   "description": "UNLINK, FLUSHALL/FLUSHDB ASYNC and the lazyfree-lazy-* pathways move O(N) frees to the bio lazyfree thread when free effort exceeds 64 allocations, covering data objects, whole kvstores, tracking tables, error stats and Lua script dicts.",
   "lifecycle": "active"
  }
 },
 {
  "id": "decision:approximate-lru-eviction-pool",
  "entity_key": "decision:approximate-lru-eviction-pool",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Approximate LRU/LFU via sampling into a shared eviction pool",
   "statement": "Redis approximates LRU/LFU by sampling N keys per eviction pass into a 16-entry pool of best candidates instead of maintaining exact recency ordering.",
   "rationale": "Runs in constant memory and avoids per-access bookkeeping; pool persistence across performEvictions() calls improves approximation quality over pure random sampling.",
   "description": "evict.c defines EVPOOL_SIZE=16 evictionPoolEntry entries ordered by idle time (or inverse LFU frequency) and documents that sampled keys enter the pool only if better than current candidates; stale pool entries trigger repopulation.",
   "evidence": "src/evict.c comment block 'LRU approximation algorithm ... Redis uses an approximation of the LRU algorithm that runs in constant memory' above evictionPoolAlloc(), and the evictionPoolEntry struct comment.",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:exclude-buffers-from-maxmemory",
  "entity_key": "decision:exclude-buffers-from-maxmemory",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Exclude AOF and replication buffers from eviction accounting",
   "statement": "Used-memory checks for eviction subtract AOF buffers and the shared replication buffer beyond backlog size.",
   "rationale": "Counting DEL-propagation buffers as used memory creates a feedback loop: evictions grow the buffers, which forces more evictions, potentially evicting every key.",
   "description": "freeMemoryGetNotCountedMemory() returns the overhead subtracted by getMaxmemoryState() so eviction pressure reflects data size, not propagation buffers.",
   "evidence": "src/evict.c comment above freeMemoryGetNotCountedMemory(): 'it can cause feedback-loop when we push DELs into them ... maybe cause massive eviction loop, even all keys are evicted'.",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:gcra-deterministic-replication",
  "entity_key": "decision:gcra-deterministic-replication",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "GCRA replicates as GCRASETVALUE with self-expiring keys",
   "statement": "Allowed GCRA requests rewrite the client command to internal GCRASETVALUE key tat for replication/AOF, and each key implicitly expires at its TaT.",
   "rationale": "GCRA uses commandTimeSnapshot so replaying the verb on replicas would compute different TaTs; implicit expiry avoids requiring DEL for numerous short-lived limiter keys (idea from redis-cell).",
   "description": "gcraCommand() calls setExpireByLink(when = new_tat_us/1000) and rewriteClientCommandVector to GCRASETVALUE; gcraSetValueCommand() applies the stored TaT identically on replicas and during AOF rewrite.",
   "evidence": "src/gcra.c comments: 'Replicating the command directly would mess up TaT as we use commandTimeSnapshot' and 'The key implicitly sets its own expiry time ... NOTE: idea is same as in redis-cell.'",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:lazyfree-effort-threshold",
  "entity_key": "decision:lazyfree-effort-threshold",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Async free only for objects with effort > 64 and refcount 1",
   "statement": "freeObjAsync() hands objects to the bio thread only when lazyfreeGetFreeEffort() exceeds LAZYFREE_THRESHOLD=64 and the object is not shared; small objects free synchronously.",
   "rationale": "Queueing tiny frees to a background thread costs more than freeing inline; effort is estimated per type (quicklist len, dict size, stream rax nodes + consumer-group PEL) to keep the estimate O(1).",
   "description": "The same 64-allocation threshold gates lazy freeing of the tracking rax, error stats, lua_scripts dict and function libraries.",
   "evidence": "src/lazyfree.c: '#define LAZYFREE_THRESHOLD 64' and freeObjAsync() condition 'free_effort > LAZYFREE_THRESHOLD && obj->refcount == 1'; lazyfreeGetFreeEffort() comment on proportional effort.",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "component:rdb-persistence",
  "entity_key": "component:rdb-persistence",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "RDB Persistence",
   "summary": "Point-in-time binary snapshot engine: BGSAVE fork, RDB serialization/loading, diskless replica sync.",
   "description": "Serializes the whole dataset to the RDB binary format and loads it back: rdbSaveRio/rdbSaveObject/rdbSaveKeyValuePair on the write side, rdbLoadRio/rdbLoadObject on the read side, with LZF string compression (rdbSaveLzfStringObject) and a trailing CRC64 checksum. rdbSaveBackground forks a CHILD_TYPE_RDB child via redisFork so the parent keeps serving while copy-on-write pages diverge; the child reports COW bytes through the childinfo pipe (sendChildCowInfo) and backgroundSaveDoneHandler reaps it. Diskless full-sync uses rdbSaveToSlavesSockets — the child writes the RDB into server.rdb_pipe_read and the parent relays it to replica connections framed by rdbSaveRioWithEOFMark's '$EOF:<40-byte hex>' delimiter. Searchable as: BGSAVE, SAVE, dump.rdb, fork copy-on-write spike, 'Background saving started by pid', MISCONF stop-writes-on-bgsave-error, 'Bad file format reading the append only file'/corrupt RDB (rdbReportError), sanitize-dump-payload deep validation of RESTORE/DUMP payloads (lpValidateIntegrityAndDups, ziplistPairsConvertAndValidateIntegrity). Governed by save points, rdbcompression, rdbchecksum, dbfilename, dir, rdb-save-incremental-fsync (rioSetAutoSync), rdb-del-sync-files.",
   "path": "src/rdb.c, src/rdb.h",
   "loc": 5560,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:aof-persistence",
  "entity_key": "component:aof-persistence",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "AOF Persistence",
   "summary": "Multi-Part append-only file: manifest-tracked BASE/INCR/HISTORY files, fsync policies, AOFRW, BACKUP.",
   "description": "Durable command log using the Multi-Part AOF layout: an aofManifest (appendonly.aof.manifest in appenddirname) tracks one BASE file (snapshot from last rewrite, written as RDB when aof-use-rdb-preamble yes — rdbSaveRio with RDBFLAGS_AOF_PREAMBLE), ordered INCR files of RESP commands, and HISTORY files awaiting GC (aofDelHistoryFiles). feedAppendOnlyFile buffers propagated commands, flushAppendOnlyFile/aofWrite apply the appendfsync policy — always fsyncs inline, everysec offloads to a bio thread (aof_background_fsync) and delays writes up to 2s if fsync lags, logging 'Asynchronous AOF fsync is taking too long (disk is busy?)'. AOFRW (rewriteAppendOnlyFileBackground, BGREWRITEAOF) forks CHILD_TYPE_AOF: the child writes a fresh BASE via rewriteAppendOnlyFile while the parent opens a new INCR (openNewIncrAofForAppend), then markRewrittenIncrAofAsHistory retires old files; aofRewriteLimited throttles retry storms. Also implements the BACKUP command: a consistent hard-linked BASE+INCR+manifest copy in backupdirname with lifecycle IDLE->PENDING->SNAPSHOTTING->INCREMENTING->SEALED. Searchable as: appendonly, AOF rewrite, aof manifest, truncated AOF, aof-load-truncated, aof-timestamp-enabled annotations, auto-aof-rewrite-percentage, fsync everysec latency.",
   "path": "src/aof.c",
   "loc": 3831,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:rio-layer",
  "entity_key": "component:rio-layer",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Rio Stream Abstraction",
   "summary": "Stream I/O abstraction (buffer/file/conn/fd/connset) with CRC64 checksumming used by RDB and AOF.",
   "description": "Uniform read/write/tell/flush interface over five backends — rioInitWithBuffer (sds), rioInitWithFile, rioInitWithConn (replica socket with read_limit), rioInitWithFd (child-to-parent pipe for diskless sync), rioInitWithConnset (fan-out to multiple connections) — so rdb.c and aof.c serialize identically to memory, disk, or sockets. rioGenericUpdateChecksum maintains the rolling CRC64 embedded in RDB files; rioSetAutoSync implements incremental fsync every N bytes (rdb-save-incremental-fsync / aof-rewrite-incremental-fsync) to avoid huge fsync latency spikes; rioSetReclaimCache drops page cache during large dumps. Also provides RESP emission helpers used by AOF rewrite: rioWriteBulkCount/rioWriteBulkString/rioWriteBulkLongLong/rioWriteBulkDouble. Searchable as: rio, stream I/O abstraction, checksum mismatch, short read, auto-sync.",
   "path": "src/rio.c, src/rio.h",
   "loc": 640,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:persistence-checkers",
  "entity_key": "component:persistence-checkers",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Persistence File Checkers",
   "summary": "redis-check-rdb and redis-check-aof: offline validation and repair of RDB files and AOF sets.",
   "description": "Offline integrity tools compiled into the server binary. redis_check_rdb_main replays a dump through rdbLoadObject in rdbCheckMode, tracking a state machine (RDB_CHECK_DOING_READ_TYPE/READ_KEY/READ_OBJECT_VALUE/CHECK_SUM in rdbstate) so a crash or error reports exactly which key/opcode was being parsed; counts keys, expires, already-expired. redis_check_aof_main classifies input as AOF_RESP, AOF_RDB_PREAMBLE, or AOF_MULTI_PART (fileIsManifest/fileIsRDB), walks manifests via checkMultiPartAof, validates RESP records (processRESP/processAnnotations), and supports --fix (truncate at last valid offset) and --truncate-to-timestamp using aof-timestamp-enabled annotations for point-in-time recovery. Searchable as: corrupt RDB, 'Bad data format', AOF truncated tail repair, aof manifest validation, redis-check-aof --fix.",
   "path": "src/redis-check-rdb.c, src/redis-check-aof.c",
   "loc": 1062,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "datastore:rdb-snapshot",
  "entity_key": "datastore:rdb-snapshot",
  "labels": [
   "DataStore"
  ],
  "properties": {
   "name": "RDB Snapshot File",
   "summary": "Compact binary point-in-time dump (dump.rdb): typed opcodes, LZF-compressed strings, CRC64 trailer.",
   "description": "The on-disk snapshot format written by rdbSaveRio: 'REDIS<version>' magic, aux fields (redis-ver, repl-id/repl-offset from rdbSaveInfo for replication continuity), per-db key/value records with type opcodes and millisecond expires, optional LZF compression, module aux data, functions, and a CRC64 footer. Filename set by dbfilename (default dump.rdb) in dir; also streamed over sockets for diskless full sync and embedded as the BASE file of the AOF (RDB preamble). Temp files are written as temp-<pid>.rdb then renamed for atomicity."
  }
 },
 {
  "id": "datastore:aof-log",
  "entity_key": "datastore:aof-log",
  "labels": [
   "DataStore"
  ],
  "properties": {
   "name": "Append-Only File Set",
   "summary": "Multi-Part AOF directory (appendonlydir): manifest plus BASE/INCR/HISTORY files logging every write.",
   "description": "Durable write log stored in appenddirname: appendonly.aof.manifest lines like 'file appendonly.aof.2.base.rdb seq 2 type b' track one BASE (RDB or RESP snapshot), ordered INCR files of RESP-encoded commands (with optional '#TS' timestamp annotations when aof-timestamp-enabled), and HISTORY files pending deletion. Replayed at startup by loadAppendOnlyFiles/loadSingleAppendOnlyFile, which detects the 'REDIS' magic to load RDB-preamble bases. The BACKUP command hard-links BASE+INCR into backupdirname to pin inodes across rewrites and GC."
  }
 },
 {
  "id": "config:appendonly",
  "entity_key": "config:appendonly",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "appendonly",
   "summary": "Master switch for AOF persistence.",
   "description": "When yes, every write is logged to the Multi-Part AOF set and replayed at startup (loadAppendOnlyFiles); toggling at runtime triggers startAppendOnly/stopAppendOnly with an initial AOFRW.",
   "default": "no"
  }
 },
 {
  "id": "config:appendfsync",
  "entity_key": "config:appendfsync",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "appendfsync",
   "summary": "AOF fsync policy: always, everysec, or no.",
   "description": "Controls flushAppendOnlyFile durability: always fsyncs per write batch, everysec offloads fsync to a bio thread (may delay writes up to 2s when the disk is busy), no leaves flushing to the OS.",
   "default": "everysec"
  }
 },
 {
  "id": "config:save",
  "entity_key": "config:save",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "save",
   "summary": "RDB save points: '<seconds> <changes>' pairs triggering BGSAVE.",
   "description": "serverCron triggers rdbSaveBackground when any point matches; 'save \"\"' disables snapshotting.",
   "default": "3600 1 300 100 60 10000"
  }
 },
 {
  "id": "config:aof-use-rdb-preamble",
  "entity_key": "config:aof-use-rdb-preamble",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "aof-use-rdb-preamble",
   "summary": "Write the AOF BASE file in RDB format instead of RESP.",
   "description": "When yes, rewriteAppendOnlyFile emits the BASE via rdbSaveRio(RDBFLAGS_AOF_PREAMBLE), producing appendonly.aof.N.base.rdb — faster rewrites and loads than a pure-RESP base.",
   "default": "yes"
  }
 },
 {
  "id": "config:auto-aof-rewrite-percentage",
  "entity_key": "config:auto-aof-rewrite-percentage",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "auto-aof-rewrite-percentage",
   "summary": "Growth percentage over last-rewrite size that auto-triggers AOFRW.",
   "description": "With auto-aof-rewrite-min-size, drives automatic BGREWRITEAOF scheduling; aofRewriteLimited backs off after repeated failures.",
   "default": "100"
  }
 },
 {
  "id": "feature:multi-part-aof",
  "entity_key": "feature:multi-part-aof",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Multi-Part AOF with manifest",
   "summary": "AOF split into manifest-tracked BASE/INCR/HISTORY files; rewrites never rewrite the live tail.",
   "description": "aofManifest tracks file name, seq, type (b/i/h) plus startoffset/endoffset per file; AOFRW writes a new BASE while the parent appends to a fresh INCR, then old files become HISTORY and are GC'd (aofDelHistoryFiles). aofUpgradePrepare migrates pre-7.0 single-file AOFs into the manifest scheme.",
   "lifecycle": "active"
  }
 },
 {
  "id": "feature:diskless-rdb-sync",
  "entity_key": "feature:diskless-rdb-sync",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Diskless RDB streaming to replicas",
   "summary": "RDB streamed from a fork child through a pipe to replica sockets, framed by a $EOF hex mark.",
   "description": "rdbSaveToSlavesSockets forks a child that writes the RDB into server.rdb_pipe_read; the parent event loop relays chunks to each waiting replica connection. rdbSaveRioWithEOFMark brackets the stream with '$EOF:<40-byte unguessable hex>' so replicas detect end-of-transfer without a length prefix. backgroundSaveDoneHandlerSocket handles completion.",
   "lifecycle": "active"
  }
 },
 {
  "id": "feature:backup-command",
  "entity_key": "feature:backup-command",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "BACKUP command (consistent hard-linked copy)",
   "summary": "Online consistent backup reusing MP-AOF: hard-linked BASE + INCR + manifest sealed in backupdir.",
   "description": "BACKUP drives a state machine IDLE->PENDING->SNAPSHOTTING->INCREMENTING->SEALED (server.backup_state); it snapshots a BASE, captures concurrent writes in an INCR, hard-links both into backupdirname (backupLinkFile) so inodes survive AOFRW and history GC, and writes a generated manifest (backupWriteManifest). ABORT/failures land in FAILED; CLEANUP resets. Blocks concurrent AOFRW while snapshotting/incrementing and postpones manual BGREWRITEAOF until sealed.",
   "lifecycle": "active"
  }
 },
 {
  "id": "feature:aof-point-in-time-truncate",
  "entity_key": "feature:aof-point-in-time-truncate",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "AOF timestamp annotations and PITR truncate",
   "summary": "Optional #TS annotations in the AOF enable redis-check-aof --truncate-to-timestamp recovery.",
   "description": "With aof-timestamp-enabled, genAofTimestampAnnotationIfNeeded interleaves timestamp annotation records; redis-check-aof --truncate-to-timestamp <unix-ts> (processAnnotations, AOF_CHECK_TIMESTAMP_TRUNCATED) cuts the log at the chosen instant for point-in-time restore.",
   "lifecycle": "active"
  }
 },
 {
  "id": "decision:mpaof-base-incr-history",
  "entity_key": "decision:mpaof-base-incr-history",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "AOF is a manifest-managed set of BASE/INCR/HISTORY files",
   "statement": "Instead of one mutable appendonly.aof, the AOF is a directory of immutable files (one BASE snapshot, ordered INCR command logs, retired HISTORY files) coordinated by a manifest.",
   "rationale": "Rewrites can produce a new BASE without touching the live append stream, aborted rewrites leave multiple ordered INCRs safely, and old files are garbage-collected instead of overwritten — eliminating the pre-7.0 rewrite buffer and rename races.",
   "description": "The aof.c 'AOF Manifest file implementation' block defines the three file types and shows a sample manifest ('file appendonly.aof.2.base.rdb seq 2 type b ...'); markRewrittenIncrAofAsHistory and aofDelHistoryFiles implement retirement and GC.",
   "evidence": "src/aof.c ~lines 44-73 header comment describing BASE/INCR/HISTORY types and example manifest content",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:everysec-fsync-on-bio-thread",
  "entity_key": "decision:everysec-fsync-on-bio-thread",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "everysec fsync runs on a background bio thread with a 2s write-delay grace",
   "statement": "Under appendfsync everysec, fsync is offloaded to bio (aof_background_fsync); if a background fsync is still in flight, flushAppendOnlyFile postpones the write up to 2 seconds before writing anyway.",
   "rationale": "Keeps fsync latency off the main thread while bounding unwritten-buffer growth; a busy disk degrades to at-most-2s data loss rather than blocking the event loop.",
   "description": "flushAppendOnlyFile tracks server.aof_flush_postponed_start and logs 'Asynchronous AOF fsync is taking too long (disk is busy?)...' when forced to write during an in-flight fsync — the canonical symptom string for AOF disk-pressure incidents.",
   "evidence": "src/aof.c:1257-1270 postponed-flush logic and warning log string",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:diskless-eof-mark-framing",
  "entity_key": "decision:diskless-eof-mark-framing",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Diskless RDB streams are delimited by an unguessable $EOF hex mark",
   "statement": "Socket-target RDB transfers are framed as '$EOF:<40 bytes unguessable hex string>\\r\\n ... <mark>' instead of a length prefix.",
   "rationale": "The RDB length is unknown when streaming begins from a fork child; a random 40-byte delimiter lets replicas detect end-of-payload safely without buffering the whole dump.",
   "description": "rdbSaveRioWithEOFMark writes the '$EOF:' preamble and trailing mark around rdbSaveRio for rdbSaveToSlavesSockets transfers relayed via server.rdb_pipe_* from the child.",
   "evidence": "src/rdb.c:2096-2107 comment and rioWrite of '$EOF:' in rdbSaveRioWithEOFMark",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "component:replication-core",
  "entity_key": "component:replication-core",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Replication Core",
   "summary": "Master-replica async replication: PSYNC2 partial resync, backlog, diskless sync, WAIT, FAILOVER.",
   "description": "Implements Redis master-replica synchronization (replication.c): PSYNC2 partial resync via masterTryPartialResynchronization/slaveTryPartialResynchronization matching dual replication IDs server.replid/replid2 (shiftReplicationId keeps the old history valid up to second_replid_offset so a promoted replica can serve +CONTINUE after failover); the replication backlog is a shared circular history (replBacklog struct, createReplicationBacklog, rax blocks_index, incrementalTrimReplicationBacklog to avoid trim-induced stalls) sized by repl-backlog-size. Also covers diskless sync (RDB streamed child-to-socket, startBgsaveForReplication, rdbPipeReadHandler) and diskless load (readSyncBulkPayload with swapdb/flushdb/on-empty-db modes), the newer rdb-channel full sync where the replica opens a second connection so RDB transfer and live repl stream flow in parallel (rdbChannelFullSyncWithMaster, replica-full-sync-buffer-limit, hidden config repl-rdb-channel), chained replicas / sub-replicas that proxy the master stream verbatim (replicationFeedStreamFromMasterStream), WAIT/WAITAOF synchronous barriers (waitCommand, replicationCountAcksByOffset, REPLCONF ACK), REPLCONF capability negotiation including compression, the coordinated FAILOVER command (failoverCommand, updateFailoverStatus), and replicationCron heartbeats/timeouts. Searchable as 'partial resynchronization', 'full resync', 'replication lag', 'master_link_status down', 'broken link with master', 'replica promotion', 'replid mismatch'; failure symptoms: repeated full syncs from too-small backlog, 'Unable to partial resync ... lack of backlog', replica timeout during bulk transfer.",
   "path": "src/replication.c",
   "loc": 5598,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:sync-io",
  "entity_key": "component:sync-io",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Synchronous I/O Helpers",
   "summary": "Blocking socket read/write with millisecond timeouts for SYNC handshake and MIGRATE.",
   "description": "Tiny utility layer (syncio.c, ~125 lines) providing blocking-with-timeout socket I/O in an otherwise nonblocking server: syncWrite, syncRead, syncReadLine poll via aeWait at 10ms resolution (SYNCIO__RESOLUTION) and return -1/ETIMEDOUT on expiry. Header comment states it exists for the replication handshake (replica-side SYNC/PSYNC negotiation) and for MIGRATE, which must be blocking to stay atomic across two instances. Searchable as 'blocking socket IO', 'syncReadLine timeout', 'handshake timeout'.",
   "path": "src/syncio.c",
   "loc": 125,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:repl-compression",
  "entity_key": "component:repl-compression",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Replication Stream Compression",
   "summary": "New zstd streaming compression of the replication link, negotiated via REPLCONF compression.",
   "description": "New client-connection compression layer (client_comp.c) that transparently compresses the master-to-replica replication stream with zstd when built with BUILD_COMPRESSION=yes (code guarded by USE_COMPRESSION; stubs return errors otherwise). compressionState wraps ZSTD_CStream/ZSTD_DStream with input/output tempBufs; clientConnWrite/clientConnRead replace raw connection I/O, with clientCompressAndWrite, clientReadBufAndDecompress, and event-loop pending-decompression draining (clientCompressionProcessPendingData). The replica requests it during handshake with REPLCONF compression <level> (syncWithMaster REPL_STATE_RECEIVE_CLIENT_COMP); the master accepts only if its own repl-compression level matches exactly, and setReplCompression forces level 0 on non-compression builds. Flushing uses ZSTD_e_end (ends the frame) rather than ZSTD_e_flush to keep decompression latency low; repl-compression-max-latency bounds buffering delay, and the feature only works with io-threads > 1. Searchable as 'replication compression', 'zstd replication stream', 'REPLCONF compression rejected', 'compression levels differ'.",
   "path": "src/client_comp.c",
   "loc": 849,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:sentinel-core",
  "entity_key": "component:sentinel-core",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Sentinel Core",
   "summary": "Redis Sentinel: SDOWN/ODOWN detection, quorum, leader election by epoch, automatic failover.",
   "description": "Full Redis Sentinel implementation (sentinel.c): monitors masters/replicas/peer sentinels as sentinelRedisInstance objects (SRI_MASTER/SRI_SLAVE/SRI_SENTINEL flags), pings them each SENTINEL_PING_PERIOD and marks SRI_S_DOWN (subjectively down) in sentinelCheckSubjectivelyDown after down-after-milliseconds, escalating to SRI_O_DOWN (objectively down) in sentinelCheckObjectivelyDown once quorum sentinels agree via 'SENTINEL is-master-down-by-addr' (sentinelAskMasterStateToOtherSentinels). Failover runs an epoch-based leader election (sentinelGetLeader, sentinelVoteLeader, current_epoch/failover_epoch, sentinel_election_timeout) then a state machine sentinelFailoverStateMachine: select replica (sentinelFailoverSelectSlave, replica-priority), SLAVEOF NO ONE, wait promotion, reconfigure remaining replicas parallel-syncs at a time, switch config. Peer discovery and config propagation use the __sentinel__:hello pub/sub channel (sentinelSendHello/sentinelProcessHelloMessage) over hiredis async connections (TLS-capable when built with OpenSSL); TILT mode guards against clock/scheduling anomalies. Searchable as 'sdown odown', 'quorum not reached', '+failover-state', 'sentinel leader election', 'master rebooting', '-BUSY script kill'; runs as service redis-sentinel on port 26379.",
   "path": "src/sentinel.c",
   "loc": 5528,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "interface:psync2",
  "entity_key": "interface:psync2",
  "labels": [
   "Interface"
  ],
  "properties": {
   "name": "PSYNC2 Replication Protocol",
   "summary": "Wire protocol for replica sync: PSYNC replid offset, +FULLRESYNC/+CONTINUE, REPLCONF capabilities.",
   "description": "The replication handshake and streaming protocol spoken between masters, replicas, and chained sub-replicas: replica sends REPLCONF listening-port / capa eof capa psync2 (plus optional rdb-channel and compression capabilities) then PSYNC <replid> <offset>; master answers +FULLRESYNC <replid> <offset> or +CONTINUE [<replid>] when masterTryPartialResynchronization finds the offset in its backlog under replid or the secondary replid2. PSYNC2 semantics (dual replication IDs with second_replid_offset) let partial resync survive replica promotion and failover. Liveness flows over REPLCONF ACK <offset> from replica and REPLCONF GETACK from master; also carried by Sentinel-triggered SLAVEOF/REPLICAOF reconfiguration. Searchable as 'PSYNC handshake', '+CONTINUE', 'FULLRESYNC', 'replconf ack'."
  }
 },
 {
  "id": "adapter:zstd-compression",
  "entity_key": "adapter:zstd-compression",
  "labels": [
   "Adapter"
  ],
  "properties": {
   "name": "zstd Streaming Adapter",
   "summary": "compressionType vtable binding client_comp.c to zstd's streaming API.",
   "description": "Adapter in client_comp.c abstracting the compression library behind a compressionType vtable (init_compress/init_decompress/compress/decompress/end) with zstd as the only backend: zstdInitCompress/zstdCompress drive ZSTD_CStream via ZSTD_compressStream2, zstdInitDecompress/zstdDecompress drive ZSTD_DStream, buffers sized by ZSTD_CStreamInSize/OutSize. Compiled only under USE_COMPRESSION (BUILD_COMPRESSION=yes); compression levels 0-22 map directly to ZSTD_c_compressionLevel. Flush path deliberately uses ZSTD_e_end to close frames so the replica-side decompressor never stalls waiting for more data."
  }
 },
 {
  "id": "config:repl-diskless-sync",
  "entity_key": "config:repl-diskless-sync",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "repl-diskless-sync",
   "summary": "Stream RDB child-to-socket during full sync instead of writing to disk first.",
   "description": "When yes (the default in redis.conf), the master forks a child that writes the full-sync RDB directly to replica sockets, skipping disk; better with slow disks and fast networks. Drives socket_target in startBgsaveForReplication.",
   "default": "yes"
  }
 },
 {
  "id": "config:repl-diskless-load",
  "entity_key": "config:repl-diskless-load",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "repl-diskless-load",
   "summary": "Replica-side parsing of RDB straight from the socket: disabled/swapdb/flushdb/on-empty-db.",
   "description": "Controls whether readSyncBulkPayload parses the RDB directly from the replication socket instead of saving to a temp file: disabled, swapdb (keep old dataset in RAM while loading, needs memory), flushdb (drop dataset first, data loss if load fails), on-empty-db (diskless only when empty). redis.conf warns modules not handling I/O errors can abort the server on read errors.",
   "default": "disabled"
  }
 },
 {
  "id": "config:repl-backlog-size",
  "entity_key": "config:repl-backlog-size",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "repl-backlog-size",
   "summary": "Size of the replication backlog that makes partial resync possible.",
   "description": "Circular buffer of recent replication stream retained for disconnected replicas; bigger backlog tolerates longer replica disconnects before forcing full resync. Allocated only once at least one replica connects (createReplicationBacklogIfNeeded); enforced minimum CONFIG_REPL_BACKLOG_MIN_SIZE.",
   "default": "1mb"
  }
 },
 {
  "id": "config:repl-compression",
  "entity_key": "config:repl-compression",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "repl-compression",
   "summary": "zstd compression level (0-22) for the replication stream; 0 disables.",
   "description": "Replica requests this level via REPLCONF compression during handshake; master accepts only when its own level matches exactly. Immutable config, forced to 0 unless built with BUILD_COMPRESSION=yes, and per redis.conf only works when io-threads > 1.",
   "default": "0"
  }
 },
 {
  "id": "config:repl-compression-max-latency",
  "entity_key": "config:repl-compression-max-latency",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "repl-compression-max-latency",
   "summary": "Max ms before buffered compressed replication data is flushed to the socket.",
   "description": "Bounds how long the compressor may hold data for better ratio before forcing a frame flush (ZSTD_e_end) and socket write; compressionState.last_write tracks the deadline.",
   "default": "100"
  }
 },
 {
  "id": "feature:psync2-partial-resync",
  "entity_key": "feature:psync2-partial-resync",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "PSYNC2 Partial Resynchronization",
   "summary": "Replicas resume from an offset in the backlog instead of full RDB transfer, surviving promotions.",
   "description": "Partial resync matches the replica-supplied replid/offset against server.replid or the secondary replid2 (valid up to second_replid_offset) and replays only the missing backlog bytes with +CONTINUE. shiftReplicationId on promotion preserves the old history ID so ex-siblings can partially resync with a newly promoted master; replicationCacheMaster/replicationResurrectCachedMaster let a replica resume after transient disconnects.",
   "lifecycle": "active"
  }
 },
 {
  "id": "feature:rdb-channel-full-sync",
  "entity_key": "feature:rdb-channel-full-sync",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "RDB Channel Full Sync",
   "summary": "Dual-connection full sync: RDB on one channel, live repl stream buffered on the other.",
   "description": "Newer full-sync mode (file header: 'RDB Channel for Full Sync') where the replica opens a second connection (CLIENT_REPL_RDB_CHANNEL, main_ch_client_id pairing) so the master ships the RDB while the replica concurrently buffers the live replication stream (rdbChannelBufferReplData, replDataBuf) and applies it after load (rdbChannelStreamReplDataToDb), shifting fullsync buffering cost from master to replica. Controlled by hidden modifiable config repl-rdb-channel (default on) and bounded by replica-full-sync-buffer-limit; replicationLogicalReplicaCount collapses the two connections into one logical replica.",
   "lifecycle": "active"
  }
 },
 {
  "id": "feature:replication-zstd-compression",
  "entity_key": "feature:replication-zstd-compression",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Replication Stream zstd Compression",
   "summary": "Opt-in zstd compression of the master-replica link, negotiated at handshake.",
   "description": "New build-gated feature (USE_COMPRESSION / BUILD_COMPRESSION=yes): replica sends REPLCONF compression <level> during syncWithMaster; on exact level match with the master's repl-compression, both ends wrap the connection with clientConnWrite/clientConnRead zstd streaming (enableMasterClientDecompressionIfNeeded on the replica). Reduces replication bandwidth at some CPU cost; requires io-threads > 1 and repl-compression-max-latency bounds added latency.",
   "lifecycle": "active"
  }
 },
 {
  "id": "feature:wait-synchronous-replication",
  "entity_key": "feature:wait-synchronous-replication",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "WAIT / WAITAOF Barriers",
   "summary": "Block a client until N replicas (or AOF fsyncs) acknowledge the current offset.",
   "description": "waitCommand blocks the caller until numreplicas have ACKed the client's write offset (replicationRequestAckFromSlaves broadcasts REPLCONF GETACK, replicationCountAcksByOffset tallies), with waitaofCommand doing the same for local/replica AOF fsync counts via replicationCountAOFAcksByOffset; processClientsWaitingReplicas unblocks in beforeSleep. Best-effort durability, not consensus.",
   "lifecycle": "active"
  }
 },
 {
  "id": "feature:sentinel-automatic-failover",
  "entity_key": "feature:sentinel-automatic-failover",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Sentinel Automatic Failover",
   "summary": "Quorum-based failure detection and epoch-elected leader promotes a replica automatically.",
   "description": "Sentinels agree a master is ODOWN via quorum over 'SENTINEL is-master-down-by-addr', elect a leader for the failover_epoch (sentinelGetLeader/sentinelVoteLeader with majority of all known sentinels), and the leader drives sentinelFailoverStateMachine: WAIT_START, SELECT_SLAVE, SEND_SLAVEOF_NOONE, WAIT_PROMOTION, RECONF_SLAVES, UPDATE_CONFIG, then publishes the new layout on __sentinel__:hello. Manual trigger via SENTINEL FAILOVER sets SRI_FORCE_FAILOVER.",
   "lifecycle": "active"
  }
 },
 {
  "id": "decision:dual-replid-history",
  "entity_key": "decision:dual-replid-history",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Keep two replication IDs so promotion does not force full resync",
   "statement": "A promoted replica moves its old replid into replid2 (valid up to second_replid_offset) and mints a new replid, instead of discarding the old history.",
   "rationale": "Replicas of the failed master share history with the promoted node up to the promotion offset; accepting PSYNC against the secondary ID (offset+1 semantics) lets the whole shard avoid full RDB transfers after failover.",
   "description": "shiftReplicationId copies replid to replid2 and sets second_replid_offset = master_repl_offset+1, with an explicit comment walking through the 50-bytes/offset-51 example; masterTryPartialResynchronization checks both IDs. Searchable as 'replid2', 'secondary replication ID', 'psync after failover'.",
   "evidence": "src/replication.c shiftReplicationId() and clearReplicationId2() comments (~lines 2128-2155); masterTryPartialResynchronization ID1/ID2 comment (~line 1013).",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:zstd-end-frame-flush",
  "entity_key": "decision:zstd-end-frame-flush",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Flush replication compression with ZSTD_e_end, not ZSTD_e_flush",
   "statement": "When the compressed replication stream must be flushed, the frame is fully ended (ZSTD_e_end) instead of merely flushing zstd's internal buffers.",
   "rationale": "Ending the frame slightly lowers compression ratio but massively speeds up the replica-side decompressor, which no longer waits for more data to complete a frame; measured ratio remained very good at the default level per the in-code comment.",
   "description": "zstdCompress selects ZSTD_e_end whenever flush or write_flush_pending is set; the comment documents the ratio-vs-latency tradeoff. Searchable as 'zstd frame flush', 'replication compression latency'.",
   "evidence": "src/client_comp.c zstdCompress() comment (~lines 125-131) explaining ZSTD_e_end choice.",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "component:eval-scripts",
  "entity_key": "component:eval-scripts",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "EVAL Lua Scripting",
   "summary": "EVAL/EVALSHA Lua script execution: SHA1 script cache, run-context guards, Lua<->RESP conversion, LDB debugger",
   "description": "Implements EVAL/EVALSHA/EVAL_RO/SCRIPT via a single shared lua_State (struct luaCtx lctx) holding a SHA1->luaScript dict plus an LRU list (luaScriptsLRUAdd); evalGenericCommand/luaCreateFunction compile bodies named by sha1hex, and evalExtractShebangFlags parses '#!lua flags=' shebangs (no-writes, allow-oom, allow-stale, no-cluster, allow-cross-slot-keys). script.c is the engine-agnostic run layer: scriptPrepareForRun/scriptCall/scriptResetRun enforce ACL, OOM, cluster-state, and write/replica checks per command (scriptVerifyACL, scriptVerifyOOM, scriptVerifyClusterState), and scriptInterrupt + busy-reply-threshold (alias lua-time-limit) drive BUSY replies and SCRIPT KILL/UNKILLABLE handling. script_lua.c bridges Lua and RESP (luaRedisGenericCommand for redis.call/pcall, redisProtocolToLuaType_* and luaReplyToRedisReply, sandboxed globals allow-lists for cjson/cmsgpack/bit/struct), and eval.c also hosts the LDB Lua debugger (struct ldbState, ldbEval, forked debugging sessions). Searchable as 'BUSY Redis is busy running a script', 'NOSCRIPT No matching script', 'script timeout', 'EVALSHA cache miss', 'redis.call error', 'Lua sandbox'. Under jemalloc the Lua VM gets a dedicated arena/tcache (createLuaState/luaAlloc) so Lua allocations do not block the defragger.",
   "path": "src/eval.c, src/script.c, src/script_lua.c, src/script.h, src/script_lua.h",
   "loc": 4240,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:functions-engine",
  "entity_key": "component:functions-engine",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Redis Functions Engine",
   "summary": "FUNCTION LOAD/FCALL server-side function libraries with pluggable engines; Lua engine in function_lua.c",
   "description": "functions.c implements the FUNCTION command family (functionLoadCommand, fcallCommand/fcallroCommand, functionDumpCommand/functionRestoreCommand, functionListCommand, functionStatsCommand, functionFlushCommand, functionKillCommand) around functionsLibCtx, a library-name->functionLibInfo and function-name->functionInfo registry with per-engine stats; functionExtractLibMetaData parses the '#!lua name=libname' shebang and functionsRegisterEngine allows pluggable engines. function_lua.c is the LUA engine implementation: luaEngineCreate compiles a library blob, luaRegisterFunction implements redis.register_function (named or positional args, flags like no-writes), luaEngineCall invokes registered callbacks, and luaEngineLoadHook cancels FUNCTION LOAD after a 500ms timeout (LOAD_TIMEOUT_MS). Unlike EVAL scripts, libraries are part of the dataset: persisted to RDB, replicated, and dump/restorable with FLUSH/APPEND/REPLACE policies (restorePolicy). Runs on the shared script.c run layer (scriptPrepareForRun/scriptCall) so ACL/OOM/cluster checks and SCRIPT-style timeouts apply. Searchable as 'FUNCTION LOAD failed', 'missing library metadata', 'FCALL vs EVAL', 'redis.register_function', 'wrong number of arguments', 'library name conflict'.",
   "path": "src/functions.c, src/function_lua.c, src/functions.h",
   "loc": 1651,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:module-system",
  "entity_key": "component:module-system",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Redis Module System",
   "summary": "RedisModule_* dynamic-module host: commands, data types, keyspace/server events, blocking clients, RM_Call",
   "description": "16k-line host for dynamically loaded modules (moduleLoad via dlopen, MODULE LOAD/LOADEX/UNLOAD/LIST guarded by enable-module-command): RM_CreateCommand registers module commands into the command table, RM_CreateDataType/RM_LoadDataTypeFromStringEncver register moduleType data types with RDB/AOF/defrag callbacks, RM_Call executes Redis commands from module code returning lazy RedisModuleCallReply objects (call_reply.c), and RM_Replicate/RM_ReplicateVerbatim control propagation. Event surface: RM_SubscribeToKeyspaceEvents(WithSubkeys) and RM_NotifyKeyspaceEvent hook keyspace notifications, while RM_SubscribeToServerEvent/moduleFireServerEvent deliver RedisModuleEvent_* server events (ReplicationRoleChanged, Persistence, FlushDB, Shutdown, CronLoop, ClusterSlotMigration, and ClusterTopologyChange — debounced to once per event-loop iteration with change_flags for SLOT/ROLE/STATE/NODE reasons). Also provides blocking clients (RM_BlockClient/RM_BlockClientOnKeys/RM_UnblockClient), thread-safe contexts (RM_GetThreadSafeContext + GIL), timers (RM_CreateTimer), command filters (RM_RegisterCommandFilter), module ACL checks (RM_ACLCheckCommandPermissions/RM_ACLCheckKeyPermissions), shared inter-module APIs (RedisModuleSharedAPI), and module INFO/config registration. Searchable as 'RedisModule API', 'module blocked client', 'MODULE LOAD error', 'thread safe context lock', 'module data type encver', 'keyspace notification callback'. RM_-prefixed doc comments in module.c generate the official Modules API docs.",
   "path": "src/module.c, src/redismodule.h",
   "loc": 16077,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:vector-sets-module",
  "entity_key": "component:vector-sets-module",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Vector Sets Module",
   "summary": "Bundled VADD/VSIM vector-similarity data type built on a custom HNSW index with int8/binary quantization",
   "description": "In-tree module (bundled into the Redis 8+ binary, buildable as vset.so for older servers) adding the vector set data type: VADD inserts elements with FP32/VALUES vectors (REDUCE random projection, NOQUANT/Q8/BIN quantization, M/EF HNSW tuning, CAS threaded insert), VSIM returns nearest elements (WITHSCORES/WITHATTRIBS/COUNT/EPSILON/EF/TRUTH/NOTHREAD), plus VREM/VCARD/VDIM/VEMB/VLINKS/VINFO/VSETATTR/VGETATTR and FILTER expressions (expr.c evaluates '.year > 1950'-style scalar filters over JSON attributes, FILTER-EF caps effort). hnsw.c is a from-scratch HNSW (Malkov & Yashunin) with bidirectional-only links, on-insert normalization (cosine==dot), per-vector int8 quantization, true deletion with orphan relinking, and AVX2/AVX512 runtime dispatch. Threading model: VSIM runs in a spawned thread and VADD CAS collects neighbors in background; a per-object in_use rwlock plus vectorSetWaitAllBackgroundClients() fences deletes/attr updates — registered through RedisModule_CreateCommand and the blocked-client API. Searchable as 'vector similarity search', 'HNSW recall', 'embedding search redis', 'VSIM slow', 'binary quantization'; vset-force-single-threaded-execution (vset_config.c) forces main-thread execution.",
   "path": "modules/vector-sets/vset.c, modules/vector-sets/hnsw.c, modules/vector-sets/expr.c, modules/vector-sets/vset_config.c, modules/vector-sets/README.md",
   "loc": 6907,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "interface:module-api",
  "entity_key": "interface:module-api",
  "labels": [
   "Interface"
  ],
  "properties": {
   "name": "RedisModule API (redismodule.h)",
   "summary": "C ABI for loadable modules: RM_* functions resolved at load time via RedisModule_Init",
   "description": "Versioned C function-pointer surface exported by module.c and consumed through redismodule.h: command registration (RM_CreateCommand/RM_SetCommandInfo), data types (RM_CreateDataType with rdb_load/rdb_save/aof_rewrite/free/defrag callbacks and encver versioning), RM_Call with RESP3-aware CallReply accessors, keyspace-event and server-event subscriptions, blocking clients, timers, ACL checks, and module configs. Doc comments above each RM_ function in module.c are the canonical API reference (generated via src/modules/gendoc.rb). Searchable as 'redismodule.h', 'RedisModule_Init', 'module ABI compatibility', 'REDISMODULE_OK/ERR'. Bundled vector-sets and external modules (redisbloom, redisearch, redisjson, redistimeseries per modules/modules.yaml) all bind to this interface."
  }
 },
 {
  "id": "config:busy-reply-threshold",
  "entity_key": "config:busy-reply-threshold",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "busy-reply-threshold",
   "summary": "Milliseconds before a running script/function makes Redis answer BUSY to other clients",
   "description": "createLongLongConfig in config.c, default 5000ms, modifiable at runtime; alias of the legacy lua-time-limit name. Once exceeded, scriptInterrupt puts the run context into timedout mode (enterScriptTimedoutMode in script.c): other clients get -BUSY and only SCRIPT KILL / FUNCTION KILL / SHUTDOWN NOSAVE are allowed. Setting 0 means scripts still yield event-loop processing but the threshold is immediate.",
   "default": "5000"
  }
 },
 {
  "id": "feature:lua-scripting",
  "entity_key": "feature:lua-scripting",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Lua Scripting (EVAL)",
   "summary": "EVAL/EVALSHA server-side Lua with SHA1 script cache, script flags, effects replication, and LDB debugger",
   "description": "Client-supplied Lua executed atomically inside the server via a single sandboxed lua_State; EVALSHA avoids resending bodies through the SHA1 cache (SCRIPT LOAD/EXISTS/FLUSH), shebang flags declare no-writes/allow-oom/allow-stale behavior, EVAL_RO/EVALSHA_RO enforce read-only, and script effects (not the script text) are propagated to replicas and AOF. Includes the interactive LDB debugger (redis-cli --ldb) and BUSY/SCRIPT KILL timeout handling.",
   "lifecycle": "active"
  }
 },
 {
  "id": "feature:redis-functions",
  "entity_key": "feature:redis-functions",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Redis Functions",
   "summary": "FUNCTION LOAD libraries with named callable functions (FCALL), persisted and replicated as part of the dataset",
   "description": "Successor to raw EVAL for managed server-side logic: libraries declared with '#!lua name=lib' register named functions via redis.register_function and are invoked with FCALL/FCALL_RO by name; libraries survive restarts (RDB), replicate to replicas, and are portable via FUNCTION DUMP/RESTORE with flush/append/replace policies. Engine layer is pluggable (functionsRegisterEngine); LUA is the bundled engine (function_lua.c).",
   "lifecycle": "active"
  }
 },
 {
  "id": "feature:vector-sets",
  "entity_key": "feature:vector-sets",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Vector Sets",
   "summary": "Native vector-similarity data type (VADD/VSIM) with HNSW index, quantization, and filtered search",
   "description": "New-in-Redis-8 data type pairing string elements with embedding vectors: VADD builds an HNSW graph with optional dimensionality reduction (REDUCE) and int8/binary quantization, VSIM answers approximate nearest-neighbor queries with optional scalar FILTER expressions over per-element JSON attributes, and TRUTH provides exact linear-scan ground truth for recall measurement. Reads execute in background threads to keep the event loop responsive.",
   "lifecycle": "active"
  }
 },
 {
  "id": "decision:script-effects-replication-only",
  "entity_key": "decision:script-effects-replication-only",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Scripts replicate effects, not script bodies",
   "statement": "EVAL propagation is always effects-based: the write commands a script performs are replicated to replicas/AOF instead of the script text; redis.replicate_commands() is a deprecated no-op returning true.",
   "rationale": "Whole-script replication required scripts to be deterministic and re-executed on every replica; effects replication removes that constraint and makes AOF loading of long-running scripts safe. The luaRedisReplicateCommandsCommand comment marks the old toggle DEPRECATED, and evalGenericCommand notes newly generated AOF files 'propagate effects rather than scripts'.",
   "description": "Encoded in script.c where scriptRunCtx defaults repl_flags to PROPAGATE_AOF|PROPAGATE_REPL per command and preventCommandPropagation suppresses verbatim EVAL propagation; scriptSetRepl still lets scripts narrow AOF/REPL targets via redis.set_repl.",
   "evidence": "src/eval.c luaRedisReplicateCommandsCommand comment ('DEPRECATED: Now do nothing and always return true') and comment at end of evalGenericCommand ('newly generated AOF files, in which scripts propagate effects rather than scripts'); src/script.c scriptPrepareForRun sets repl_flags = PROPAGATE_AOF | PROPAGATE_REPL.",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:lua-dedicated-jemalloc-arena",
  "entity_key": "decision:lua-dedicated-jemalloc-arena",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Lua VM gets its own jemalloc arena and tcache",
   "statement": "Under USE_JEMALLOC, each lua_State is created with a private tcache and a dedicated arena (server.lua_arena) via a custom luaAlloc allocator instead of the default allocator.",
   "rationale": "Isolating Lua allocations in their own arena prevents Lua's churny memory from interleaving with keyspace allocations and, per the code comment, avoids blocking the active defragger.",
   "description": "createLuaState calls je_mallctl('tcache.create') and lua_newstate(luaAlloc, tcache); luaAlloc routes through zrealloc_with_flags with MALLOCX_ARENA(server.lua_arena)|MALLOCX_TCACHE. Applies to both the EVAL interpreter and the Functions LUA engine.",
   "evidence": "src/script.c comments 'Create a lua interpreter, and use jemalloc as lua memory allocator' and 'Under jemalloc we need to create a new arena for lua to avoid blocking defragger' (luaEnvInit/createLuaState).",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:vector-sets-bundled-in-tree",
  "entity_key": "decision:vector-sets-bundled-in-tree",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "vector-sets ships in-tree and is compiled into the Redis binary",
   "statement": "Unlike redisbloom/redisearch/redisjson/redistimeseries (source-pinned externals in modules.yaml), vector-sets lives under modules/vector-sets/ with no manifest entry and its commands are part of the default Redis 8 build.",
   "rationale": "Makes the vector data type a first-class built-in for Redis >= 8.0 while keeping the code a normal RedisModule API consumer, so it can still be built as vset.so for older servers.",
   "description": "modules.yaml explicitly notes 'vector-sets is intentionally absent — it lives in-tree under modules/vector-sets/ and is not cloned', and the README states 'this is a merged module, it's part of the Redis binary now'.",
   "evidence": "modules/vector-sets/README.md ('this is a merged module, it's part of the Redis binary now'); modules/modules.yaml notes section; MODULES.md §1 ('In-tree modules (e.g. vector-sets) are intentionally absent from the manifest').",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "document:vector-sets-readme",
  "entity_key": "document:vector-sets-readme",
  "labels": [
   "Document"
  ],
  "properties": {
   "name": "Vector Sets README",
   "title": "Vector Sets README",
   "path": "modules/vector-sets/README.md",
   "summary": "Full command reference for VADD/VSIM/VREM/VEMB etc., quantization options, filtered-search expression language, and HNSW tuning",
   "description": "Authoritative user/ops doc for the bundled vector-sets module: explains REDUCE random projection, Q8/BIN/NOQUANT quantization trade-offs, M/EF recall tuning, EPSILON similarity cutoffs, TRUTH linear-scan recall measurement, WITHSCORES/WITHATTRIBS RESP2 vs RESP3 reply shapes, and the FILTER expression syntax over element JSON attributes."
  }
 },
 {
  "id": "document:modules-build-doc",
  "entity_key": "document:modules-build-doc",
  "labels": [
   "Document"
  ],
  "properties": {
   "name": "External Modules build/run/test guide (MODULES.md)",
   "title": "External Modules build/run/test guide (MODULES.md)",
   "path": "modules/MODULES.md",
   "summary": "How external modules are pinned (modules.yaml), cloned, built against this tree, loaded, and tested from the repo root",
   "description": "Describes the source-pinned module pipeline: modules.yaml as single source of truth (repo/ref/target_module/loadmodule per module), make modules-update/bootstrap/build/run/test targets, redis-full.conf generation via sync-redis-conf, private config blocks, and reproducible release tarballs baking module config into redis.conf. Explains why vector-sets is absent from the manifest (in-tree)."
  }
 },
 {
  "id": "document:modules-manifest",
  "entity_key": "document:modules-manifest",
  "labels": [
   "Document"
  ],
  "properties": {
   "name": "modules.yaml pin manifest",
   "title": "modules.yaml pin manifest",
   "path": "modules/modules.yaml",
   "summary": "Pin manifest for bundled external modules: redisbloom, redisearch, redisjson, redistimeseries at v8.9.9x refs",
   "description": "Machine-consumed manifest listing each bundled external module's upstream repo, pinned ref (tag>branch>commit resolution via git ls-remote), build artifact path (target_module, e.g. redisjson builds rejson.so), loadmodule path emitted into redis-full.conf, and optional build_env overrides (redisearch sets LTO=1 and INLINE_LSE_ATOMICS=0 to avoid SIGILL on pre-Armv8.1-a ARM cores)."
  }
 },
 {
  "id": "component:streams-core",
  "entity_key": "component:streams-core",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Streams Core",
   "summary": "Stream type: rax-indexed listpack macro-nodes, ms-seq IDs, XADD/XRANGE/XREAD/XTRIM plus IDMP dedup",
   "description": "Core Redis Stream data type in t_stream.c/stream.h: entries live in listpack macro-nodes indexed by a rax radix tree keyed by 128-bit streamID {ms,seq}; streamNew/streamAppendItem/streamIterator (streamIteratorStart/GetID/GetField) and streamTrim/streamTrimByLength/streamTrimByID implement XADD, XRANGE/XREVRANGE, XLEN, XREAD, XDEL, XDELEX, XTRIM (MAXLEN/MINID with ~ approx and LIMIT), XSETID, XINFO. Node splitting is governed by stream-node-max-bytes/stream-node-max-entries (STREAM_LISTPACK_MAX_SIZE cap 1GB); deleted entries become tombstones via STREAM_ITEM_FLAG_DELETED and max_deleted_entry_id/first_id track the gap. This fork also adds IDMP idempotent-producer dedup (idmpProducer/idmpEntry, XXH128 auto-hash via createIdempotencyHash, XADD IDMP/IDMPAUTO, XCFGSET IDMP-DURATION/IDMP-MAXSIZE, XIDMPRECORD, iids_added/iids_duplicates stats). Searchable as 'stream listpack node', 'stream ID ms-seq', 'XADD trim MAXLEN', 'stream tombstone', 'idempotent producer dedup'; symptoms: 'ID specified in XADD is equal or smaller' errors, memory growth from oversized macro-nodes, approx-trim leaving up to 100*stream-node-max-entries extra entries.",
   "path": "src/t_stream.c, src/stream.h",
   "loc": 6327,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:stream-consumer-groups",
  "entity_key": "component:stream-consumer-groups",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Stream Consumer Groups & PEL",
   "summary": "XGROUP/XREADGROUP/XACK/XCLAIM/XAUTOCLAIM/XPENDING/XNACK: PEL, NACK zone, per-consumer delivery tracking",
   "description": "Consumer-group layer in t_stream.c: streamCG holds last_id, entries_read (see streamEstimateDistanceFromFirstEverEntry for lag math), a rax PEL of streamNACK records (delivery_time, delivery_count, owning consumer) shared with per-consumer PELs (streamConsumer), plus a time-ordered doubly-linked PEL list (pel_time_head/pel_time_tail) giving O(1) access to oldest pending entries for XCLAIM/XAUTOCLAIM. Implements XGROUP CREATE/SETID/DESTROY/CREATECONSUMER/DELCONSUMER, XREADGROUP (NOACK, '>' vs history reads), XACK, XACKDEL (KEEPREF|DELREF|ACKED with per-ID statuses XACKDEL_DELETED/STILL_REFERENCED), XPENDING, XCLAIM, XAUTOCLAIM, and this fork's XNACK key group SILENT|FAIL|FATAL IDS ... [RETRYCOUNT][FORCE], which disowns entries (consumer=NULL, delivery_time=0) into a 'NACK zone' at the PEL head delimited by pel_nack_tail (pelListInsertNacked/pelListNackedCount); FATAL sets delivery_count=LLONG_MAX. A stream-level cgroups_ref rax maps entry IDs to referencing groups (streamLinkCGroupToEntry/streamCleanupEntryCGroupRefs) so DELREF/ACKED trim-delete strategies work. Searchable as 'pending entries list', 'PEL', 'NOGROUP error', 'consumer group lag', 'nack requeue', 'poison message retry'; symptoms: unbounded PEL growth, messages stuck pending after consumer crash, XAUTOCLAIM deleted-entry cleanup.",
   "path": "src/t_stream.c, src/stream.h",
   "loc": 2800,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:stream-dlq",
  "entity_key": "component:stream-dlq",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Stream Dead-Letter Queue (PLANNED)",
   "summary": "PLANNED XDLQ command family: quarantine, inspect, replay, purge poisoned consumer-group entries",
   "description": "Planned (in progress, not yet in src/) first-class dead-letter workflow for Streams consumer groups per STREAM_DLQ_IMPLEMENTATION_PLAN.md: an XDLQ container command with MOVE/LIST/INFO/REPLAY/PURGE/HELP subcommands storing group-scoped DLQ metadata keyed by stream ID (reason string, last consumer, delivery count, moved-at ms, replay count). Dead-lettered entries are a quarantined state stronger than the existing XNACK 'nacked zone': XCLAIM/XAUTOCLAIM must skip them, they leave the XPENDING detailed view, are not ackable until replayed, and XDLQ REPLAY reinserts the original entry ID into the group PEL owned by a target consumer. Plan mandates replication/AOF/RDB fidelity (prefer command rewriting over new encodings), per-ID status replies (moved/already-dead-lettered/not-found/not-pending), cheap XDLQ INFO (dlq-count, first/last-dlq-id, oldest-dlq-age-ms) and XINFO STREAM FULL summary fields; motivated by redis/redis#7386. Searchable as 'dead letter queue', 'DLQ', 'poison message quarantine', 'XDLQ MOVE REPLAY', 'failed message replay'.",
   "path": "STREAM_DLQ_IMPLEMENTATION_PLAN.md",
   "loc": 717,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "config:stream-node-max-entries",
  "entity_key": "config:stream-node-max-entries",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "stream-node-max-entries",
   "summary": "Max entries per stream listpack macro-node before a new rax node is started",
   "description": "When a stream listpack macro-node reaches this many entries, streamAppendItem starts a new rax node (server.stream_node_max_entries check in t_stream.c); 0 disables the entry-count limit. Also bounds approximate trimming: XTRIM/XADD with '~' may leave up to 100*stream-node-max-entries extra entries. Larger values pack more entries per node (less rax overhead, slower per-node scans).",
   "default": "100"
  }
 },
 {
  "id": "config:stream-node-max-bytes",
  "entity_key": "config:stream-node-max-bytes",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "stream-node-max-bytes",
   "summary": "Max byte size of a stream listpack macro-node before a new rax node is started",
   "description": "Byte ceiling for each stream listpack macro-node (server.stream_node_max_bytes in streamAppendItem); when exceeded a new node is appended to the rax. Preallocation is clamped to STREAM_LISTPACK_MAX_PRE_ALLOCATE (4KB) and nodes are hard-capped at STREAM_LISTPACK_MAX_SIZE (1GB) to avoid listpack header overflow. 0 means no byte limit.",
   "default": "4kb"
  }
 },
 {
  "id": "config:stream-idmp-duration",
  "entity_key": "config:stream-idmp-duration",
  "labels": [
   "ConfigVariable"
  ],
  "properties": {
   "name": "stream-idmp-duration",
   "summary": "Default retention window (seconds) for IDMP idempotent-producer dedup records",
   "description": "Server-wide default for how long per-producer IDMP idempotency IDs (IIDs) are tracked for XADD IDMP/IDMPAUTO deduplication; copied into each stream at streamNew (s->idmp_duration) and overridable per key via XCFGSET IDMP-DURATION. Bounded by CONFIG_STREAM_IDMP_MIN/MAX_DURATION in config.c.",
   "default": "100"
  }
 },
 {
  "id": "feature:consumer-groups",
  "entity_key": "feature:consumer-groups",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Stream Consumer Groups",
   "summary": "Cooperative stream consumption with per-group cursors, pending-entry tracking, claim/reclaim and NACK requeue",
   "description": "Lets multiple named consumers share a stream via XGROUP-created groups: each group tracks last_id/entries_read and a PEL of unacknowledged deliveries; consumers read with XREADGROUP, acknowledge with XACK/XACKDEL, recover stuck work with XCLAIM/XAUTOCLAIM, inspect with XPENDING/XINFO, and (in this fork) requeue failures with XNACK SILENT|FAIL|FATAL into an immediately-claimable NACK zone. Foundation the planned XDLQ dead-letter workflow layers on.",
   "lifecycle": "active"
  }
 },
 {
  "id": "feature:streams-dlq",
  "entity_key": "feature:streams-dlq",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Stream Dead-Letter Workflow (XDLQ)",
   "summary": "In-progress XDLQ command family to quarantine, inspect, replay and purge failed consumer-group entries",
   "description": "Planned feature (STREAM_DLQ_IMPLEMENTATION_PLAN.md; no XDLQ code in src/ yet) adding operator-grade dead-letter handling to consumer groups: XDLQ MOVE quarantines poisoned entries with failure metadata (reason, consumer, delivery count, moved-at), XDLQ LIST/INFO expose bounded inspection and cheap summaries, XDLQ REPLAY returns entries to the claimable PEL for a chosen consumer preserving original IDs, XDLQ PURGE removes metadata. Claim paths and XPENDING must skip quarantined entries; replication/AOF/RDB must reconstruct DLQ state. Phased plan: command skeleton, internal group-level DLQ state, workflow semantics, integration with XCLAIM/XPENDING/XINFO, persistence, docs.",
   "lifecycle": "in_progress"
  }
 },
 {
  "id": "feature:stream-idempotent-producer",
  "entity_key": "feature:stream-idempotent-producer",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "Stream Idempotent Producer (IDMP)",
   "summary": "XADD IDMP/IDMPAUTO deduplicates producer retries via per-producer idempotency IDs",
   "description": "Fork feature making XADD idempotent: producers pass IDMP pid iid (or IDMPAUTO pid, which XXH128-hashes the field-value payload via createIdempotencyHash) and duplicate IIDs within the retention window return the original entry ID instead of appending again. State lives in per-stream idmpProducer rax with insertion-order eviction (stream-idmp-duration/stream-idmp-maxsize, per-key XCFGSET overrides); XIDMPRECORD replays dedup records for replication/AOF, and XINFO exposes iids_added/iids_duplicates.",
   "lifecycle": "active"
  }
 },
 {
  "id": "decision:dlq-distinct-from-xnack",
  "entity_key": "decision:dlq-distinct-from-xnack",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "XDLQ layers above XNACK; nacked and dead-lettered are distinct states",
   "statement": "XNACK stays the transient 'eligible for reclaim' primitive; dead-lettered is a stronger quarantined state that normal claim/reclaim paths (XCLAIM/XAUTOCLAIM) skip and that leaves the XPENDING detailed view.",
   "rationale": "Quarantine loses meaning if generic claim paths can bypass it; XPENDING implies active outstanding work, not quarantined work; overloading XNACK would blur a useful low-level primitive.",
   "description": "State model decision in the DLQ plan: entries move normal-pending -> nacked/unowned -> dead-lettered -> replayed, with DLQ entries invisible to XCLAIM/XAUTOCLAIM/XPENDING iteration and not ackable until replayed; visibility comes via XDLQ INFO/LIST and XINFO STREAM FULL summary fields (dlq-count, first/last-dlq-id).",
   "evidence": "STREAM_DLQ_IMPLEMENTATION_PLAN.md 'State Model', 'Interaction With Existing Commands', Q2/Q3/Q4 answers",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:dlq-replay-preserves-entry-id",
  "entity_key": "decision:dlq-replay-preserves-entry-id",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "XDLQ REPLAY reuses the original entry ID instead of creating a new stream entry",
   "statement": "Replay removes DLQ state and reinserts the same stream ID into the group PEL owned by the target consumer; no new entry is appended.",
   "rationale": "Preserving the original entry ID keeps semantics simple, avoids producer-side confusion, and keeps replay explicit and deterministic with per-ID result reporting.",
   "description": "Replay semantics locked in the plan: after XDLQ REPLAY the message is owned by the specified consumer, appears in normal XPENDING again, disappears from XDLQ LIST, and replay accounting (replay count) is updated; lower-risk persistence via command rewriting is preferred over richer metadata or new encodings.",
   "evidence": "STREAM_DLQ_IMPLEMENTATION_PLAN.md 'XDLQ REPLAY' section, Q5 ('Should replay create a brand new stream entry? no for v1') and Q8",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:pel-time-ordered-list-nack-zone",
  "entity_key": "decision:pel-time-ordered-list-nack-zone",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "PEL keeps a time-ordered doubly-linked list with a NACK zone at its head",
   "statement": "Every streamCG maintains pel_time_head/pel_time_tail ordering streamNACKs by delivery_time for O(1) oldest-entry access, with an XNACK-populated 'NACK zone' (up to pel_nack_tail) at the head whose entries have delivery_time=0 and no owner.",
   "rationale": "XCLAIM/XAUTOCLAIM need the oldest pending entries efficiently without rax scans, and NACKed entries must be immediately claimable ahead of all time-ordered entries while staying structurally intact during inserts.",
   "description": "Code-evidenced fork design in stream.h/t_stream.c: streamNACK gains pel_prev/pel_next; pelListInsertSorted/pelListUnlink/pelListInsertNacked/pelListNackedCount maintain the list; new entries are never placed before pel_nack_tail so the NACK zone stays intact; XINFO reports the nacked-entries count.",
   "evidence": "src/stream.h streamCG comments (pel_time_head/pel_time_tail/pel_nack_tail, 'O(1) access to oldest entries') and src/t_stream.c pelListInsertNacked comment 'The NACK zone occupies positions from pel_time_head to pel_nack_tail'",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "document:stream-dlq-implementation-plan",
  "entity_key": "document:stream-dlq-implementation-plan",
  "labels": [
   "Document"
  ],
  "properties": {
   "name": "Stream Dead-Letter Workflow Implementation Plan",
   "title": "Stream Dead-Letter Workflow Implementation Plan",
   "path": "STREAM_DLQ_IMPLEMENTATION_PLAN.md",
   "summary": "717-line engineering contract for the planned XDLQ command family: semantics, state model, phases, tests",
   "description": "Implementation handoff doc specifying the XDLQ MOVE/LIST/INFO/REPLAY/PURGE surface, group-scoped metadata model, interactions with XPENDING/XCLAIM/XAUTOCLAIM/XACK/XNACK, replication/AOF/RDB requirements, per-ID reply shapes, error handling, six delivery phases (design lock through docs polish), expected file impact (src/t_stream.c, src/commands/xdlq*.json, tests/unit/type/stream-dlq.tcl), and Q&A locking key tradeoffs. The authoritative source for stream-dlq scope; cites redis/redis#7386 as demand."
  }
 },
 {
  "id": "component:cli-internals",
  "entity_key": "component:cli-internals",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "redis-cli Internals",
   "summary": "Interactive REPL, cluster manager, and diagnostic modes of the redis-cli binary",
   "description": "Implements every redis-cli mode in one 11.5k-line file: the linenoise-driven repl() with completionCallback/hintsCallback built from commands.def metadata (cli_commands.c), cliConnect/cliSendCommand/cliFormatReply* output formatters (TTY/raw/CSV/JSON), and special modes latencyMode, latencyDistMode, slaveMode (replica-protocol RDB+stream receiver), getRDB (--rdb), pipeMode (--pipe mass insert), statMode, scanMode, findBigKeys/getKeySizes/getKeyFreqs (--bigkeys/--memkeys/--keystats/--hotkeys), lru_test_mode, evalMode with the LDB Lua debugger, vsetRecallMode, and clusterManagerMode implementing 'redis-cli --cluster create|check|fix|reshard|rebalance|add-node|del-node|import|backup' (clusterManagerCommands table; ASM-based CLUSTER MIGRATION requires server >= 8.4.0 per CLUSTER_MANAGER_ASM_MIN_VERSION). cli_common.c supplies cliSecureConnection (OpenSSL SSL_CTX wiring for --tls/--cacert/--insecure) shared with redis-benchmark. Searchable as 'redis-cli hangs', 'cluster fix slot coverage', 'REDISCLI_AUTH', 'REDISCLI_HISTFILE', '--pipe timeout', 'bigkeys sampling'; env vars REDISCLI_AUTH, REDISCLI_HISTFILE, REDISCLI_RCFILE, REDISCLI_CLUSTER_YES control auth/history/rc behavior.",
   "path": "src/redis-cli.c, src/cli_common.c, src/cli_commands.c, src/cli_commands.h",
   "loc": 11533,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:benchmark-internals",
  "entity_key": "component:benchmark-internals",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "redis-benchmark Internals",
   "summary": "Multithreaded load generator with HDR-histogram latency reporting and cluster-aware key routing",
   "description": "redis-benchmark.c drives up to MAX_THREADS(500) benchmarkThread workers, each with its own aeEventLoop (CLIENT_GET_EVENTLOOP), pipelining requests (-P) against numclients connections; benchmark()/createMissingClients/showLatencyReport run each named test and print percentiles from hdr_histogram latency_histogram + current_sec_latency_histogram (10us..3s range, --precision). Cluster mode (--cluster) uses fetchClusterConfiguration/fetchClusterSlotsConfiguration and crc16_slottable to hash-tag keys per node (setClusterKeyHashTag), and randomizeClientKey implements -r keyspacelen key randomization; supports --threads, -x stdin payload, --csv, idle mode, TLS via cliSecureConnection from cli_common. Searchable as 'benchmark throughput drop', 'requests per second', 'p50 p99 latency percentiles', 'pipeline benchmark', 'MOVED error benchmark cluster'.",
   "path": "src/redis-benchmark.c",
   "loc": 2043,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:test-suite",
  "entity_key": "component:test-suite",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Tcl Test Suite",
   "summary": "Tcl-based test harness: unit/integration suites, multi-instance cluster/sentinel runners, module API tests",
   "description": "tests/test_helper.tcl (launched by ./runtest, needs tclsh 8.5+) globs suites from tests/unit, tests/unit/type, tests/unit/moduleapi, tests/unit/cluster and tests/integration, spawning redis-server instances from baseport 21111 via tests/support/server.tcl (start_server proc) with helpers in support/util.tcl, support/redis.tcl, support/aofmanifest.tcl and background load generators in tests/helpers (gen_write_load.tcl, bg_complex_data.tcl). Separate runners: ./runtest-cluster and ./runtest-sentinel use the tests/instances.tcl multi-instance framework via tests/cluster/run.tcl and tests/sentinel/run.tcl; ./runtest-moduleapi first builds C test modules in tests/modules (aclcheck.c, blockonkeys.c, atomicslotmigration.c, ...) then runs unit/moduleapi suites. Supports --tls/--tls-module, --valgrind, --tsan, --durable, --accurate, external-server mode (--host/--port with external:skip tags), and tag filtering per tests/README.md; unit/cluster covers atomic-slot-migration, slot-stats, sharded-pubsub; unit/type covers array.tcl, stream-cgroups.tcl, hash-field-expire.tcl. Searchable as 'flaky tcl test', 'start_server timeout', 'wait_for_condition', 'runtest --single', 'test port collision'.",
   "path": "tests/, runtest, runtest-cluster, runtest-sentinel, runtest-moduleapi",
   "loc": 902,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "component:build-system",
  "entity_key": "component:build-system",
  "labels": [
   "Component"
  ],
  "properties": {
   "name": "Build System",
   "summary": "Make-based build: src/Makefile core rules, deps vendoring, plus fork-local module orchestration scripts",
   "description": "src/Makefile builds redis-server, redis-sentinel, redis-cli, redis-benchmark, redis-check-rdb and redis-check-aof from REDIS_SERVER_OBJ, pulling DEPENDENCY_TARGETS 'hiredis linenoise lua hdr_histogram fpconv xxhash tre' (plus jemalloc when MALLOC=jemalloc, the Linux default; libc elsewhere) via deps/Makefile; key knobs are BUILD_TLS=yes|module (OpenSSL, redis-tls.so), BUILD_COMPRESSION=yes (libzstd replication compression, -DUSE_COMPRESSION=1), SANITIZER=address|memory|undefined, OPTIMIZATION=-O3 and PROG_SUFFIX. This fork's top-level Makefile is heavily customized: default goal routes through scripts/build.sh with a modules.yaml manifest (modules/manifest.mk) and adds build/test/deploy/run/tarball/sync-redis-conf orchestration goals for bundled modules. Version status: 00-RELEASENOTES is the 'unstable branch' placeholder (no release notes; src/version.h REDIS_VERSION=255.255.255), and cli code pinning CLUSTER MIGRATION to >=8.4.0 places this tree in the Redis 8.4-era development line. Searchable as 'make BUILD_TLS', 'jemalloc build failure', 'make distclean deps', 'zmalloc.h:USE_JEMALLOC', 'cross compile AR'.",
   "path": "Makefile, src/Makefile, deps/Makefile, scripts/, modules/manifest.mk",
   "loc": 583,
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "dependency:jemalloc",
  "entity_key": "dependency:jemalloc",
  "labels": [
   "Dependency"
  ],
  "properties": {
   "name": "jemalloc",
   "summary": "Default malloc replacement on Linux, patched with defrag hints for active defragmentation",
   "description": "Vendored as a git subtree at deps/jemalloc (5.3.0), configured with --with-lg-quantum=3 (8-byte size classes for Redis struct density), --with-jemalloc-prefix=je_ and --disable-cache-oblivious; Redis-specific patch adds JEMALLOC_FRAG_HINT and je_get_defrag_hint() which activedefrag depends on. Selected when MALLOC=jemalloc (Linux default); searchable as 'mem_allocator', 'mem_fragmentation_ratio', 'active defrag not working', 'USE_JEMALLOC'."
  }
 },
 {
  "id": "dependency:lua",
  "entity_key": "dependency:lua",
  "labels": [
   "Dependency"
  ],
  "properties": {
   "name": "Lua 5.1",
   "summary": "Pinned Lua 5.1 interpreter for EVAL scripts and Functions, with bytecode-loading disabled",
   "description": "deps/lua is Lua 5.1 with deliberate freezes and patches per deps/README.md: no upgrade planned (avoids breaking existing scripts), linked cjson/struct/cmsgpack/bit libraries (lua_cjson.o, lua_struct.o, lua_cmsgpack.o, lua_bit.o), and a security fix in ldo.c line 498 removing the LUA_SIGNATURE[0] check so precompiled bytecode cannot be executed. Built with -DLUA_ANSI -DENABLE_CJSON_GLOBAL; searchable as 'EVAL sandbox', 'lua bytecode blocked', 'cjson', 'script timeout'."
  }
 },
 {
  "id": "dependency:hiredis",
  "entity_key": "dependency:hiredis",
  "labels": [
   "Dependency"
  ],
  "properties": {
   "name": "hiredis",
   "summary": "Official C client library used by redis-cli, redis-benchmark, and Sentinel",
   "description": "Vendored git subtree at deps/hiredis; provides redisContext/redisCommand/redisReply and the async API. Its SDS identifiers are prefixed 'hi' (sdscompat.h maps sds calls to hi_ variants) so it can coexist with the server's own sds in one binary; built with USE_SSL=1 (libhiredis_ssl.a) when BUILD_TLS is enabled. Searchable as 'redisConnect', 'redisReply leak', 'hiredis_ssl'."
  }
 },
 {
  "id": "dependency:linenoise",
  "entity_key": "dependency:linenoise",
  "labels": [
   "Dependency"
  ],
  "properties": {
   "name": "linenoise",
   "summary": "Minimal readline replacement powering the redis-cli interactive prompt",
   "description": "deps/linenoise (same-author side project, vendored unmodified) gives redis-cli line editing, multi-line mode, history (linenoiseHistoryLoad/Save to ~/.rediscli_history) and the completion/hints machinery (linenoiseSetCompletionCallback, linenoiseSetHintsCallback) that renders command-argument hints from commands.def docs. Searchable as 'cli history file', 'tab completion redis-cli'."
  }
 },
 {
  "id": "dependency:hdr_histogram",
  "entity_key": "dependency:hdr_histogram",
  "labels": [
   "Dependency"
  ],
  "properties": {
   "name": "HdrHistogram (C)",
   "summary": "High-dynamic-range histograms for per-command and benchmark latency percentile tracking",
   "description": "deps/hdr_histogram is a customized copy of HdrHistogram_c (based on upstream master commit e4448cf6d1cd) per deps/README.md; the server uses it for per-command latency tracking (latencystats, latency-tracking-info-percentiles config), redis-benchmark for its p50/p99 latency report, and redis-cli for --latency-dist style output. Searchable as 'latency percentiles', 'hdr_record_value', 'LATENCY HISTOGRAM'."
  }
 },
 {
  "id": "dependency:fpconv",
  "entity_key": "dependency:fpconv",
  "labels": [
   "Dependency"
  ],
  "properties": {
   "name": "fpconv (Grisu2 dtoa)",
   "summary": "Fast float-to-string conversion (fpconv_dtoa) for RESP replies, RDB, and Lua bridging",
   "description": "deps/fpconv builds libfpconv.a exposing fpconv_dtoa (Grisu2 shortest-representation double formatting); consumed via util.c (d2string paths) by networking.c reply building, rdb.c/rio.c persistence encoding, and script_lua.c number conversion. Searchable as 'double formatting precision', 'dtoa', 'float reply representation'."
  }
 },
 {
  "id": "dependency:fast_float",
  "entity_key": "dependency:fast_float",
  "labels": [
   "Dependency"
  ],
  "properties": {
   "name": "fast_float strtod",
   "summary": "SIMD-era fast string-to-double parsing wrapped as fast_float_strtod",
   "description": "deps/fast_float provides libfast_float.a wrapped by src/fast_float_strtod.c/h (C shim over the C++ fast_float library); used on hot parsing paths in util.c, resp_parser.c (RESP double parsing), t_zset.c score parsing, and sort.c BY-numeric comparisons. Searchable as 'strtod slow', 'ZADD score parse', 'string2d'."
  }
 },
 {
  "id": "dependency:tre",
  "entity_key": "dependency:tre",
  "labels": [
   "Dependency"
  ],
  "properties": {
   "name": "TRE regex",
   "summary": "POSIX-compatible regex library with linear-time matching, used by Array ARGREP predicates",
   "description": "deps/tre builds libtre.a (approximate/fuzzy-capable POSIX regexp engine with O(M^2N) worst case per its README); linked into redis-server and consumed by t_array.c which calls tre_regncompb/tre_regexec/tre_regfree to compile RE predicates for ARGREP over sparse arrays (regex_t in the predicate plan struct). Searchable as 'ARGREP regex', 'tre_regncompb', 'array regex predicate'."
  }
 },
 {
  "id": "dependency:xxhash",
  "entity_key": "dependency:xxhash",
  "labels": [
   "Dependency"
  ],
  "properties": {
   "name": "xxHash",
   "summary": "XXH3 non-cryptographic hashing used by streams, Top-K sketch, and string hashing paths",
   "description": "deps/xxhash builds libxxhash.a (v0.8.3); XXH3 is used from t_stream.c/stream.h, chk.c (the Count-Min/Top-K style sketch behind hotkeys tracking), and t_string.c. Built with -fPIC so modules can link it. Searchable as 'XXH3_64bits', 'hash function sketch', 'xxhash'."
  }
 },
 {
  "id": "dependency:zstd",
  "entity_key": "dependency:zstd",
  "labels": [
   "Dependency"
  ],
  "properties": {
   "name": "libzstd",
   "summary": "System zstd library, opt-in at build time for replication stream compression",
   "description": "Not vendored under deps/ — resolved from the system via pkg-config libzstd (fallback -lzstd) only when make BUILD_COMPRESSION=yes, which defines USE_COMPRESSION=1 and enables client_comp.c replication-stream compression; without the flag the compression code compiles to no-ops and libzstd is not required (src/Makefile comment). Searchable as 'replication compression', 'BUILD_COMPRESSION', 'libzstd link error'."
  }
 },
 {
  "id": "feature:cli-cluster-manager",
  "entity_key": "feature:cli-cluster-manager",
  "labels": [
   "Feature"
  ],
  "properties": {
   "name": "redis-cli Cluster Manager",
   "summary": "redis-cli --cluster subcommands for creating, checking, fixing, and resharding clusters",
   "description": "The clusterManagerCommands table in redis-cli.c implements create/check/info/fix/reshard/rebalance/add-node/del-node/call/set-timeout/import/backup/help against live clusters (clusterManagerCommandCreate etc.), with fix-owner logic, weight-based rebalance (CLUSTER_MANAGER_REBALANCE_THRESHOLD 2), MIGRATE pipelining, and atomic-slot-migration support gated on server >= 8.4.0 (CLUSTER_MANAGER_ASM_MIN_VERSION, 60-minute ASM migrate timeout). Successor to the old ruby redis-trib tooling; searchable as 'redis-cli --cluster fix', 'slots not covered', 'reshard'.",
   "lifecycle": "active"
  }
 },
 {
  "id": "decision:lua-pinned-5-1",
  "entity_key": "decision:lua-pinned-5-1",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Pin Lua at 5.1 and disable bytecode execution",
   "statement": "The scripting engine stays on Lua 5.1 indefinitely, with a patch removing the LUA_SIGNATURE bytecode check so only source scripts can run.",
   "rationale": "Newer Lua would break existing user scripts for little gain; blocking precompiled bytecode closes a sandbox-escape vector.",
   "description": "deps/README.md states 'We use Lua 5.1 and no upgrade is planned currently, since we don't want to break Lua scripts for new Lua features' and lists the ldo.c line 498 security fix removing the LUA_SIGNATURE[0] check 'in order to avoid direct bytecode execution'.",
   "evidence": "deps/README.md Lua section (lines ~80-96)",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "decision:jemalloc-defrag-contract",
  "entity_key": "decision:jemalloc-defrag-contract",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Patch jemalloc for active defragmentation instead of using it stock",
   "statement": "Redis ships a patched jemalloc exposing je_get_defrag_hint()/JEMALLOC_FRAG_HINT and configures it with --with-lg-quantum=3, and the server detects at build time whether the allocator supports defrag.",
   "rationale": "lg-quantum=3 yields size classes that better fit Redis data structures for memory efficiency; the frag-hint API is required by defrag.c but kept optional so stock jemalloc still builds.",
   "description": "deps/README.md details the upgrade procedure preserving JEMALLOC_FRAG_HINT and je_get_defrag_hint(); deps/Makefile invokes configure with --with-lg-quantum=3 --disable-cache-oblivious --with-jemalloc-prefix=je_ --with-version=5.3.0-0-g0.",
   "evidence": "deps/README.md jemalloc section; deps/Makefile jemalloc target (configure flags)",
   "lifecycle": "accepted"
  }
 },
 {
  "id": "document:readme",
  "entity_key": "document:readme",
  "labels": [
   "Document"
  ],
  "properties": {
   "name": "README.md",
   "title": "README.md",
   "path": "README.md",
   "summary": "Quick start plus exhaustive per-distro build-from-source instructions",
   "description": "Covers what Redis is, key use cases, then detailed build recipes for Ubuntu 20.04-26.04, Debian 12/13, AlmaLinux/Rocky 8-10, Alpine 3.23+, and macOS 14-26, a prebuilt Docker build-environment image, build flags (BUILD_TLS, MALLOC, allocator/monotonic-clock notes), and TLS run instructions. Primary reference for 'how do I build redis with all data structures'."
  }
 },
 {
  "id": "document:manifesto",
  "entity_key": "document:manifesto",
  "labels": [
   "Document"
  ],
  "properties": {
   "name": "Redis Manifesto",
   "title": "Redis Manifesto",
   "path": "MANIFESTO",
   "summary": "Design philosophy: DSL for abstract data types, memory-first storage, code efficiency",
   "description": "The original author's statement of principles: Redis as a DSL over abstract data types with explicit complexity guarantees, memory storage as priority #1, fundamental data structures driving the API, code efficiency and scaling down to small ARM devices. Useful context for why the codebase favors simple C and bespoke data structures."
  }
 },
 {
  "id": "document:tls-doc",
  "entity_key": "document:tls-doc",
  "labels": [
   "Document"
  ],
  "properties": {
   "name": "TLS.md",
   "title": "TLS.md",
   "path": "TLS.md",
   "summary": "How to build (BUILD_TLS=yes|module), test (runtest --tls), and run Redis with TLS",
   "description": "Documents building TLS as built-in or as the redis-tls.so module (Sentinel does not support module mode), generating test certs with utils/gen-test-certs.sh, running the suite with ./runtest --tls / --tls-module, and manual server + redis-cli --tls invocations with tls-port/tls-cert-file/tls-key-file/tls-ca-cert-file flags."
  }
 },
 {
  "id": "document:deps-readme",
  "entity_key": "document:deps-readme",
  "labels": [
   "Document"
  ],
  "properties": {
   "name": "deps/README.md",
   "title": "deps/README.md",
   "path": "deps/README.md",
   "summary": "Dependency vendoring policy and per-library upgrade procedures",
   "description": "Explains what each vendored dependency is for (jemalloc allocator, hiredis client, linenoise readline, Lua 5.1, hdr_histogram) and the exact upgrade workflow: git subtree pulls for jemalloc/hiredis, wholesale replacement for linenoise, manual diffing for Lua and the customized hdr_histogram (upstream commit e4448cf pinned). Records the jemalloc defrag-hint patch requirements."
  }
 },
 {
  "id": "document:tests-readme",
  "entity_key": "document:tests-readme",
  "labels": [
   "Document"
  ],
  "properties": {
   "name": "tests/README.md",
   "title": "tests/README.md",
   "path": "tests/README.md",
   "summary": "Test suite run modes, external-server options, and the tag taxonomy",
   "description": "Documents normal local-instance execution vs external-server mode (--host/--port), compatibility options (--singledb, --ignore-encoding, --ignore-digest, --cluster-mode, --large-memory) and the tag system (external:skip, cluster:skip, large-memory, ...) applied at start_server/tags/test level to gate which tests run where."
  }
 },
 {
  "id": "team:redis-oss",
  "entity_key": "team:redis-oss",
  "labels": [
   "Team"
  ],
  "properties": {
   "name": "Redis OSS Core",
   "summary": "The core open-source engineering team: all six engineers across runtime, data types, cluster, memory, scripting, and tooling.",
   "description": "Redis OSS Core is the umbrella team owning the redis/redis unstable branch: server runtime and IO threads, data types, streams, persistence, replication and cluster, memory management, scripting/modules, and tooling/QA. Every persona in this graph is a member; component-level ownership is split by domain (Greco core/persistence, Tanaka streams/client features, Novak cluster/replication, Okafor memory/perf, Mehta scripting/modules, Costa tooling/QA)."
  }
 },
 {
  "id": "team:streams-squad",
  "entity_key": "team:streams-squad",
  "labels": [
   "Team"
  ],
  "properties": {
   "name": "Streams Squad",
   "summary": "Working group driving the Streams roadmap: XNACK, IDMP idempotent producer, and the XDLQ dead-letter workflow.",
   "description": "Streams Squad is the focused working group behind this fork's stream ambitions: the XNACK nack-zone requeue primitive, the IDMP idempotent-producer dedup layer, XACKDEL/XDELEX delete strategies, and now the XDLQ dead-letter queue (issue redis/redis#7386, STREAM_DLQ_IMPLEMENTATION_PLAN.md, draft PR #15500). Led by Yuki Tanaka with Rohan Mehta on replication/persistence semantics and Luiza Costa on the stream-dlq.tcl test plan. Owns streams-core, stream-consumer-groups, and the stream-dlq component."
  }
 },
 {
  "id": "person:sgreco",
  "entity_key": "person:sgreco",
  "labels": [
   "Person"
  ],
  "properties": {
   "name": "Salvatore Greco",
   "email": "salvatore@redis.dev",
   "role": "Tech lead — core runtime & persistence",
   "summary": "Tech lead for the server core, event loop, IO threads, and the RDB/AOF persistence stack.",
   "description": "Salvatore Greco (salvatore@redis.dev) is the tech lead and de-facto architect of the core runtime: ae event loop, iothread.c offload model, networking.c, and the whole persistence stack (rdb.c, aof.c, Multi-Part AOF, the BACKUP command state machine). He signs off on the architectural decision spine (single-threaded command execution, io-threads-for-network, RDB-preamble AOF) and is the usual reviewer for anything touching beforeSleep, fork/COW behavior, or the command table. Recently shipped the Backup & Restore feature (#15441) and the io-thread replication busy-loop fix (#15329). Ask him about 'why is command execution single-threaded', AOF rewrite pressure, and hinted hash templates."
  }
 },
 {
  "id": "person:ytanaka",
  "entity_key": "person:ytanaka",
  "labels": [
   "Person"
  ],
  "properties": {
   "name": "Yuki Tanaka",
   "email": "yuki@redis.dev",
   "role": "Senior engineer — streams & client features",
   "summary": "Owns Streams (XADD/consumer groups/XNACK/IDMP) and client-facing features: tracking, ACL, pubsub, blocking commands.",
   "description": "Yuki Tanaka (yuki@redis.dev) leads the Streams Squad and owns t_stream.c end to end: consumer groups and the PEL, the XNACK nack-zone design, the IDMP idempotent producer, and the in-flight XDLQ dead-letter workflow (draft PR #15500, plan doc STREAM_DLQ_IMPLEMENTATION_PLAN.md). Also owns client-side features: CLIENT TRACKING / client-side caching (fixed the BCAST ACL key-name leak in #15371), ACL key-spec enforcement (#15478 domain), keyspace notifications, MULTI/EXEC queueing, and blocked clients (LMOVEM/BLMOVEM, #15405). Ask her about 'dead letter queue', 'PEL growth', 'poison message', 'invalidation push', 'XREADGROUP NOACK'."
  }
 },
 {
  "id": "person:enovak",
  "entity_key": "person:enovak",
  "labels": [
   "Person"
  ],
  "properties": {
   "name": "Elena Novak",
   "email": "elena@redis.dev",
   "role": "Senior engineer — cluster & replication",
   "summary": "Owns cluster (bus, atomic slot migration) and replication (PSYNC2, RDB-channel sync, zstd link compression), plus Sentinel.",
   "description": "Elena Novak (elena@redis.dev) owns everything that crosses the wire between Redis nodes: replication.c (PSYNC2 dual replids, backlog trimming, RDB-channel dual-connection full sync), the new zstd replication link compression (client_comp.c, #15366/#15490), cluster_legacy.c and the cluster bus, and the 2025 atomic slot migration engine (cluster_asm.c) that she drove to replace MIGRATE/ASK resharding. Also on the hook for redis-sentinel failover behavior. Ask her about 'replica lag', 'full sync storm', 'REPLCONF compression', 'slot migration handoff lag', 'split brain'."
  }
 },
 {
  "id": "person:aokafor",
  "entity_key": "person:aokafor",
  "labels": [
   "Person"
  ],
  "properties": {
   "name": "Amara Okafor",
   "email": "amara@redis.dev",
   "role": "Senior engineer — memory & performance",
   "summary": "Owns memory subsystems (zmalloc, eviction, defrag, lazyfree, expire cycle) and performance work: SIMD paths, rax/listpack optimizations, hotkeys.",
   "description": "Amara Okafor (amara@redis.dev) is the memory and performance specialist: zmalloc per-thread used_memory sharding, maxmemory eviction and the LRU pool, active defrag StageDescriptor slices, lazyfree, and the active expire cycle (she shipped the FAST-cycle unit-mismatch fix #15412). Performance credits include the rax leaf-inlining rework (#15256), the batched wide-HSET listpack append (#15345), BITFIELD overflow hardening (#15433), and the HOTKEYS CuckooHeavyKeeper rollout. First responder for 'memory fragmentation', 'RSS spike', 'expired keys not being deleted', 'evictions during AOF rewrite', 'used_memory drift'."
  }
 },
 {
  "id": "person:rmehta",
  "entity_key": "person:rmehta",
  "labels": [
   "Person"
  ],
  "properties": {
   "name": "Rohan Mehta",
   "email": "rohan@redis.dev",
   "role": "Engineer — scripting & modules",
   "summary": "Owns Lua/EVAL, FUNCTION engine, the module API, and the in-tree vector-sets module.",
   "description": "Rohan Mehta (rohan@redis.dev) owns the scripting and extension surface: eval.c/script_lua.c (effects-only replication, dedicated Lua jemalloc arena), the FUNCTION engine, module.c and its server events (he added RedisModuleEvent_ClusterTopologyChange, #15350), and the bundled vector-sets HNSW module (fixed the VRANDMEMBER LLONG_MIN crash, #15392). Sits on the Streams Squad as the second pair of eyes on XDLQ persistence and replication semantics. Ask him about 'module datatype callbacks', 'script determinism', 'vector search recall', 'topology change event', 'FUNCTION LOAD timeout'."
  }
 },
 {
  "id": "person:lcosta",
  "entity_key": "person:lcosta",
  "labels": [
   "Person"
  ],
  "properties": {
   "name": "Luiza Costa",
   "email": "luiza@redis.dev",
   "role": "Engineer — tooling, QA & release",
   "summary": "Owns redis-cli/redis-benchmark, the tcl test suite, the build system, and release/CI health; verifies most fixes.",
   "description": "Luiza Costa (luiza@redis.dev) owns developer and operator tooling: redis-cli (cluster manager, latency percentiles #15352 domain), redis-benchmark, scripts/build.sh + modules.yaml orchestration, and the tcl integration test suite — she deflaked the cluster-topology-change test by waiting for ASM completion (#15493). Runs the CI nightly deployment and is the default verifier on fixes before they ship (busy-loop, expire-cycle, KeyMeta double-restore). Ask her about 'flaky test', 'CI red', 'reproduce with tcl', 'redis-cli --cluster reshard', 'release checklist'."
  }
 },
 {
  "id": "environment:production",
  "entity_key": "environment:production",
  "labels": [
   "Environment"
  ],
  "properties": {
   "name": "production",
   "summary": "Customer-facing fleet: cluster-mode redis-server on prod-cache-euw1 with Sentinel-managed standalone shards for control-plane data.",
   "description": "Production environment: the customer-facing cache/data fleet, primarily the prod-cache-euw1 cluster (6 nodes, 16384 slots) running cluster-mode redis-server v8.4 with io-threads 4, hybrid RDB+AOF persistence, and Sentinel supervising the non-clustered control-plane shards. Change policy: everything soaks in staging first (see the repl-compression canary), deploys go through tagged rollouts like v8-4-rollout, and the rss-cow-spike / replica-lag / cluster-split-brain alerts page the on-call. Searchable as 'prod', 'live fleet', 'customer facing'."
  }
 },
 {
  "id": "environment:staging",
  "entity_key": "environment:staging",
  "labels": [
   "Environment"
  ],
  "properties": {
   "name": "staging",
   "summary": "Pre-production soak environment mirroring prod topology; where canaries (repl compression) and load tests (TTL-heavy expire audit) run.",
   "description": "Staging environment: a scaled-down mirror of production topology (cluster + sentinel pair) used for feature canaries and destructive load testing before production rollout. Recent history made here: the repl-compression canary that surfaced the IO-thread busy loop (issue redis-15311), the TTL-heavy load test that exposed the dead FAST expire cycle (issue redis-15388), and ASM rehearsals for the cluster-resharding runbook. Deploys land here days before production. Searchable as 'staging', 'canary environment', 'pre-prod soak'."
  }
 },
 {
  "id": "environment:ci",
  "entity_key": "environment:ci",
  "labels": [
   "Environment"
  ],
  "properties": {
   "name": "ci",
   "summary": "Continuous integration: nightly full tcl matrix (standalone/cluster/sentinel/tls) plus per-PR suites; flaky-test policy enforced here.",
   "description": "CI environment: per-PR runs of the affected tcl suites plus the nightly full matrix (standalone, cluster, sentinel, TLS, io-threads variants, sanitizer builds) deployed via the nightly-ci deployment. The battleground for the tcl-integration-tests-required policy and flake control — the cluster-topology-change flake (#15493) and the replication-iothreads suite (#15329) both live here. Red nightly blocks the next day's merges by convention. Searchable as 'CI', 'nightly build', 'test matrix', 'sanitizer run'."
  }
 },
 {
  "id": "cluster:prod-cache-euw1",
  "entity_key": "cluster:prod-cache-euw1",
  "labels": [
   "Cluster"
  ],
  "properties": {
   "name": "Prod cache cluster (eu-west-1)",
   "summary": "The production Redis Cluster: 6 nodes (3 masters + 3 replicas) covering all 16384 slots in eu-west-1.",
   "description": "prod-cache-euw1: the production Redis Cluster in eu-west-1 — 6 nodes (3 masters, 3 replicas) covering all 16384 hash slots, cluster-node-timeout 15000, io-threads 4, zstd replication compression enabled since the v8.4 rollout. Resharding uses atomic slot migration exclusively (cluster-resharding runbook); the cluster-split-brain alert watches bus partitions and the replica-lag alert watches feed health. Hosts the production environment. Searchable as 'prod cluster', 'eu-west-1', '16384 slots', 'six nodes'."
  }
 },
 {
  "id": "pull_request:redis-15500",
  "entity_key": "pull_request:redis-15500",
  "labels": [
   "PullRequest"
  ],
  "properties": {
   "name": "#15500 XDLQ: dead-letter workflow for stream consumer groups",
   "number": 15500,
   "state": "draft",
   "kind": "feature",
   "summary": "Draft implementation of the XDLQ command family (MOVE/LIST/INFO/REPLAY/PURGE) adding group-scoped dead-letter quarantine to stream consumer groups.",
   "description": "Work-in-progress PR implementing STREAM_DLQ_IMPLEMENTATION_PLAN.md phases 1-3: the XDLQ container command skeleton (src/commands/xdlq*.json entries in the generated command table), group-scoped DLQ metadata keyed by stream ID (reason, last consumer, delivery count, moved-at ms, replay count) hanging off streamCG, and XDLQ MOVE/LIST/INFO semantics layered on the existing XNACK nack-zone and cgroups_ref machinery in t_stream.c. XCLAIM/XAUTOCLAIM skip quarantined entries; XDLQ REPLAY reinserts the original entry ID into the PEL for a target consumer. Replication via command rewriting; tests land in tests/unit/type/stream-dlq.tcl. Motivated by redis/redis#7386 (dead letter queue support). Still open: RDB/AOF persistence phase and XINFO STREAM FULL summary fields — see the #xdlq-semantics thread on replay-vs-purge defaults.",
   "url": "https://github.com/redis/redis/pull/15500",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "pull_request:redis-15366",
  "entity_key": "pull_request:redis-15366",
  "labels": [
   "PullRequest"
  ],
  "properties": {
   "name": "#15366 Client compression for replication",
   "number": 15366,
   "state": "merged",
   "kind": "feature",
   "merged_at": "2026-07-20",
   "summary": "Adds zstd on-the-wire compression of the master-to-replica command stream (client_comp.c), negotiated via REPLCONF compression.",
   "description": "Implements the repl-zstd-compression decision: a new client_comp.c (~850 lines) compresses the replication stream with zstd, negotiated via REPLCONF compression with exact level match and requiring io-threads > 1; config knobs repl-compression / repl-compression-max-latency in redis.conf, pending-data drained in beforeSleep. Cuts replication bandwidth for write-heavy workloads at the cost of CPU on both ends; opt-in at build time (BUILD_COMPRESSION=yes, zstd is the only non-vendored dependency). Canaried in staging via deployment repl-compression-canary before production enablement.",
   "url": "https://github.com/redis/redis/pull/15366",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "pull_request:redis-15490",
  "entity_key": "pull_request:redis-15490",
  "labels": [
   "PullRequest"
  ],
  "properties": {
   "name": "#15490 Fix redis.conf and README for repl compression",
   "number": 15490,
   "state": "merged",
   "kind": "docs",
   "merged_at": "2026-07-20",
   "summary": "Same-day follow-up correcting the redis.conf directive descriptions and README build notes for replication compression.",
   "description": "Documentation fix shipped hours after #15366: corrects the repl-compression and repl-compression-max-latency directive descriptions in redis.conf and the README BUILD_COMPRESSION=yes usage notes so operators enable replication link compression with accurate defaults (io-threads > 1 requirement, exact zstd level match between master and replica).",
   "url": "https://github.com/redis/redis/pull/15490",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "pull_request:redis-15329",
  "entity_key": "pull_request:redis-15329",
  "labels": [
   "PullRequest"
  ],
  "properties": {
   "name": "#15329 Fix IO thread busy looping for repl clients",
   "number": 15329,
   "state": "merged",
   "kind": "fix",
   "merged_at": "2026-07-14",
   "summary": "One-line iothread.c fix stopping IO threads from spinning at 100% CPU when they own replica clients; adds a 149-line replication-iothreads test suite.",
   "description": "Resolves the iothread-repl-busy-loop bug pattern: when a replication client was bound to an IO thread, the thread's ae loop kept a write-ready event armed with nothing to send and spun a full core at 100% CPU even with zero traffic. The fix corrects the event-mask handling for replica-owned connections in iothread.c so the thread parks in its multiplexer wait, and adds tests/integration/replication-iothreads.tcl (149 lines). Landed after a failed first attempt that throttled the loop with a sleep instead of removing the spurious event. Found during the repl-compression canary because compression requires io-threads > 1.",
   "url": "https://github.com/redis/redis/pull/15329",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "pull_request:redis-15338",
  "entity_key": "pull_request:redis-15338",
  "labels": [
   "PullRequest"
  ],
  "properties": {
   "name": "#15338 Support atomic slot migration in redis-cli",
   "number": 15338,
   "state": "merged",
   "kind": "feature",
   "merged_at": "2026-07-01",
   "summary": "Teaches redis-cli --cluster reshard/rebalance to drive the server-side atomic slot migration protocol instead of legacy MIGRATE.",
   "description": "Client-side half of the atomic-slot-migration decision: ~344 lines in redis-cli.c teach the cluster manager to drive the server-side ASM protocol (cluster_asm.c) instead of the legacy per-key MIGRATE/ASK resharding dance, gated on server >= 8.4.0. Reshard and rebalance operations become atomic per slot with no client-visible ASK window; the destination node snapshots slot ranges as RESTORE commands over a dedicated RDB channel and flips ownership via the cluster bus once lag drops below cluster-slot-migration-handoff-max-lag-bytes.",
   "url": "https://github.com/redis/redis/pull/15338",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "pull_request:redis-15493",
  "entity_key": "pull_request:redis-15493",
  "labels": [
   "PullRequest"
  ],
  "properties": {
   "name": "#15493 Fix flaky cluster-topology-change test by waiting for ASM to finish",
   "number": 15493,
   "state": "merged",
   "kind": "test",
   "merged_at": "2026-07-20",
   "summary": "Deflakes the cluster-topology-change test with a shared ASM-completion wait helper in cluster_util.tcl.",
   "description": "CI de-flake: the cluster-topology-change test (added with the RedisModuleEvent_ClusterTopologyChange event, #15350) intermittently asserted topology state while an atomic slot migration was still in flight. Moves an ASM-completion wait helper into shared cluster_util.tcl and calls it before assertions, so nightly CI stops going red on a race the product code doesn't actually have. Classic 'wait for convergence before asserting' pattern now recommended for all cluster tests.",
   "url": "https://github.com/redis/redis/pull/15493",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "pull_request:redis-15412",
  "entity_key": "pull_request:redis-15412",
  "labels": [
   "PullRequest"
  ],
  "properties": {
   "name": "#15412 Fix unit mismatch that disabled the FAST expire cycle stale trigger",
   "number": 15412,
   "state": "merged",
   "kind": "fix",
   "merged_at": "2026-07-13",
   "summary": "One-character fix in expire.c: a microseconds-vs-milliseconds comparison meant the FAST expire cycle never fired.",
   "description": "Resolves the fast-expire-stale-trigger-dead bug pattern: the stale-percentage trigger condition in activeExpireCycle compared a microsecond timestamp against a millisecond threshold, so ACTIVE_EXPIRE_CYCLE_FAST effectively never activated and expired keys lingered until the slow cycle or lazy expiration caught them. Symptom: DBSIZE and memory stay elevated under heavy expired-key pressure, INFO shows expired_stale_perc high but no fast cycles. The fix is a single unit conversion; found by auditing why staging RSS stayed high after a TTL-heavy load test.",
   "url": "https://github.com/redis/redis/pull/15412",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "pull_request:redis-15436",
  "entity_key": "pull_request:redis-15436",
  "labels": [
   "PullRequest"
  ],
  "properties": {
   "name": "#15436 Fix AOF rewrite crash on module types with a NULL aof_rewrite callback",
   "number": 15436,
   "state": "merged",
   "kind": "fix",
   "merged_at": "2026-07-19",
   "summary": "Guards the BGREWRITEAOF path against module datatypes that registered no aof_rewrite callback (as vector sets do).",
   "description": "redis-server segfaulted during BGREWRITEAOF when the dataset contained a module datatype whose type methods left aof_rewrite NULL — vector sets being the in-tree example. aof.c now skips or errors cleanly instead of dereferencing the missing callback, and a vector-sets aof_rewrite regression test covers the path. Surfaced during the v8.4 rollout when a canary node with vector-set keys crashed on its first scheduled AOF rewrite.",
   "url": "https://github.com/redis/redis/pull/15436",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "pull_request:redis-15466",
  "entity_key": "pull_request:redis-15466",
  "labels": [
   "PullRequest"
  ],
  "properties": {
   "name": "#15466 Avoid duplicate KeyMeta restoration in RESTORE-based AOF rewrites",
   "number": 15466,
   "state": "merged",
   "kind": "fix",
   "merged_at": "2026-07-17",
   "summary": "Stops key metadata from being applied twice when RESTORE payloads already embed KeyMeta, corrupting per-key metadata after reload.",
   "description": "Resolves the keymeta-double-restore bug pattern: the RESTORE path shared by AOF rewrites and atomic slot migration (cluster.c/cluster_asm.c) re-applied KeyMeta that was already embedded in the serialized payload, double-registering per-key metadata slots (expire, module metadata) after reload or slot handoff. Fix makes the RESTORE path skip re-application when the payload embeds KeyMeta; covered by new keymeta module tests. Found by Elena while tracing why migrated slots reported doubled metadata on the destination node.",
   "url": "https://github.com/redis/redis/pull/15466",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "pull_request:redis-15364",
  "entity_key": "pull_request:redis-15364",
  "labels": [
   "PullRequest"
  ],
  "properties": {
   "name": "#15364 Introduce hinted hash templates",
   "number": 15364,
   "state": "merged",
   "kind": "feature",
   "merged_at": "2026-07-18",
   "summary": "~2350-line t_hash.c feature: HIMPORT command family lets millions of schema-like hashes share one field-name template.",
   "description": "Flagship data-type feature: template-hinted hashes (OBJ_ENCODING_TMPL_LP/TMPL_ARRAY) deduplicate repeated field-name schemas across millions of similar hashes. New HIMPORT PREPARE/SET/DISCARD command family, new RDB encodings (rdbSaveHashTemplates, ref-mode saving), defrag support, and config knobs hash-min/max-template-entries. Preceded by the wide-HSET batched listpack append perf win (#15345). The memory win for ORM-style workloads (same field names on every hash) is the headline; templates are immutable once created per the immutable-hash-templates decision.",
   "url": "https://github.com/redis/redis/pull/15364",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "pull_request:redis-15345",
  "entity_key": "pull_request:redis-15345",
  "labels": [
   "PullRequest"
  ],
  "properties": {
   "name": "#15345 Optimize wide HSET/HMSET on a fresh hash with a single batched listpack append",
   "number": 15345,
   "state": "merged",
   "kind": "perf",
   "merged_at": "2026-07-09",
   "summary": "Wide HSET creating a new listpack hash now appends all field-value pairs in one batched operation instead of pair-by-pair reallocation.",
   "description": "Performance prelude to hash templates (#15364): when a wide HSET/HMSET creates a brand-new listpack-encoded hash, all field-value pairs are appended in a single batched listpack operation instead of reallocating pair-by-pair, substantially speeding up bulk hash creation for cache-fill and ETL workloads. Benchmark-verified with redis-benchmark before merge.",
   "url": "https://github.com/redis/redis/pull/15345",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "pull_request:redis-15371",
  "entity_key": "pull_request:redis-15371",
  "labels": [
   "PullRequest"
  ],
  "properties": {
   "name": "#15371 Fix ACL key-name leak in BCAST client-side caching invalidations",
   "number": 15371,
   "state": "merged",
   "kind": "fix",
   "merged_at": "2026-07-08",
   "summary": "BCAST tracking invalidations now filter through the receiving client's ACL key permissions, closing a key-name information leak.",
   "description": "Security fix resolving the bcast-acl-key-leak bug pattern: clients using CLIENT TRACKING in BCAST mode received invalidation push messages naming keys their ACL user had no permission to read — an information disclosure across tenants sharing an instance. Reworks BCAST client-side caching (~224 lines in tracking.c plus acl.c) to filter invalidation broadcasts through each receiving client's ACL key patterns before sending. Reported privately, fixed within a week.",
   "url": "https://github.com/redis/redis/pull/15371",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "pull_request:redis-15433",
  "entity_key": "pull_request:redis-15433",
  "labels": [
   "PullRequest"
  ],
  "properties": {
   "name": "#15433 Fix signed overflow in BITFIELD #offset parsing",
   "number": 15433,
   "state": "merged",
   "kind": "fix",
   "merged_at": "2026-07-10",
   "summary": "BITFIELD with a huge #-prefixed offset now errors instead of wrapping negative via signed integer overflow.",
   "description": "Correctness fix in bitops.c: the #offset multiplication in BITFIELD parsing could overflow signed 64-bit arithmetic, silently wrapping huge typed offsets negative (undefined behavior) instead of rejecting them. Adds overflow checking so out-of-range offsets return a clean error, with regression tests. Found via a fuzzing report; the kind of UB the c99-no-vla / strict-flags build policy exists to surface.",
   "url": "https://github.com/redis/redis/pull/15433",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "pull_request:redis-15392",
  "entity_key": "pull_request:redis-15392",
  "labels": [
   "PullRequest"
  ],
  "properties": {
   "name": "#15392 Fix server crash on VRANDMEMBER with LLONG_MIN count",
   "number": 15392,
   "state": "merged",
   "kind": "fix",
   "merged_at": "2026-07-13",
   "summary": "Vector sets' VRANDMEMBER no longer crashes when given count -9223372036854775808 (negating LLONG_MIN overflows).",
   "description": "Crash fix in the bundled vector-sets module: VRANDMEMBER with count LLONG_MIN (-9223372036854775808) negated the value, which is undefined for LLONG_MIN and crashed redis-server. The module now rejects the value cleanly with an error; regression test added to the vector-sets python suite. Same UB family as the BITFIELD #offset overflow (#15433) fixed the same week.",
   "url": "https://github.com/redis/redis/pull/15392",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "pull_request:redis-15282",
  "entity_key": "pull_request:redis-15282",
  "labels": [
   "PullRequest"
  ],
  "properties": {
   "name": "#15282 Add MAXCOUNT and MAXSIZE options to XREAD and XREADGROUP",
   "number": 15282,
   "state": "merged",
   "kind": "feature",
   "merged_at": "2026-06-26",
   "summary": "XREAD/XREADGROUP gain MAXCOUNT and MAXSIZE to cap total entries and reply bytes across all requested streams.",
   "description": "Streams ergonomics feature (~152 lines in t_stream.c): consumers reading many streams at once can now bound the total entries (MAXCOUNT) and total reply bytes (MAXSIZE) returned across all requested streams, preventing one hot stream from starving others or blowing client output buffers. Groundwork for well-behaved XDLQ-era consumers that poll many streams per loop.",
   "url": "https://github.com/redis/redis/pull/15282",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "pull_request:redis-15441",
  "entity_key": "pull_request:redis-15441",
  "labels": [
   "PullRequest"
  ],
  "properties": {
   "name": "#15441 Backup & Restore",
   "number": 15441,
   "state": "merged",
   "kind": "feature",
   "merged_at": "2026-07-18",
   "summary": "BACKUP command family (START/SEAL/STATUS/LIST/ABORT/CLEANUP) producing consistent sealed on-disk backups from a running instance.",
   "description": "Adds an online consistent-backup state machine (IDLE->PENDING->SNAPSHOTTING->INCREMENTING->SEALED, ~687 lines in aof.c) built on the Multi-Part AOF machinery: BACKUP START hard-links BASE/INCR files plus a generated manifest into backupdirname, BACKUP SEAL closes the set, STATUS/LIST/ABORT/CLEANUP manage lifecycle and retention — no external orchestrator required. The operational answer to 'how do I take a consistent backup without forking a second BGSAVE'; referenced by the aof-rewrite-pressure runbook.",
   "url": "https://github.com/redis/redis/pull/15441",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "pull_request:redis-15350",
  "entity_key": "pull_request:redis-15350",
  "labels": [
   "PullRequest"
  ],
  "properties": {
   "name": "#15350 Add RedisModuleEvent_ClusterTopologyChange server event",
   "number": 15350,
   "state": "merged",
   "kind": "feature",
   "merged_at": "2026-07-13",
   "summary": "New debounced module server event fired on cluster topology changes (nodes added/removed, slot ownership moves).",
   "description": "Module API growth: cluster_legacy.c now fires a debounced RedisModuleEvent_ClusterTopologyChange event with SLOT/ROLE/STATE/NODE change_flags whenever topology shifts, letting shard-routing modules react to reconfiguration (including atomic slot migrations) without polling CLUSTER SHARDS. Ships a dedicated test module and tcl suite — the suite that later proved flaky against in-flight ASM and was deflaked in #15493.",
   "url": "https://github.com/redis/redis/pull/15350",
   "repo_name": "redis/redis"
  }
 },
 {
  "id": "issue:redis-7386",
  "entity_key": "issue:redis-7386",
  "labels": [
   "Issue"
  ],
  "properties": {
   "name": "#7386 Dead letter queue support for streams",
   "title": "Dead letter queue support for streams",
   "number": 7386,
   "state": "open",
   "summary": "Long-standing community ask: first-class dead-letter handling for stream consumer groups instead of hand-rolled XAUTOCLAIM+XADD side-stream patterns.",
   "description": "The original community request motivating the XDLQ work: applications using XREADGROUP/XACK have no first-class way to quarantine poison messages — entries that exceed a delivery-count threshold today require hand-rolled XAUTOCLAIM loops copying entries to a side stream and XACKing the original, losing the original entry ID and failure metadata. Asks for native dead-letter semantics: quarantine after N failed deliveries, inspection of why/when/who, replay back into the group, and purge. Being answered by the streams-dlq-design decision, STREAM_DLQ_IMPLEMENTATION_PLAN.md, and draft PR #15500 (XDLQ MOVE/LIST/INFO/REPLAY/PURGE). Searchable as 'dead letter queue', 'DLQ', 'poison message', 'max delivery count', 'failed message handling'.",
   "url": "https://github.com/redis/redis/issues/7386"
  }
 },
 {
  "id": "issue:redis-15311",
  "entity_key": "issue:redis-15311",
  "labels": [
   "Issue"
  ],
  "properties": {
   "name": "#15311 IO thread burns 100% CPU on an idle master with attached replicas",
   "title": "IO thread burns 100% CPU on an idle master with attached replicas",
   "number": 15311,
   "state": "closed",
   "summary": "With io-threads > 1 and replicas attached, one IO thread spins at full CPU even with zero traffic; top shows io_thd_1 at 100%.",
   "description": "Operator report: on masters running io-threads 4 with attached replicas, `top -H` shows an io_thd_* thread pinned at 100% CPU even when the instance is completely idle; perf top shows the thread spinning through its ae event loop with a write event armed for the replica connection and nothing to write. No functional impact but a full core wasted per replica-owning thread, worse power/latency profiles, and false capacity alarms. Reproduced in the repl-compression staging canary (compression requires io-threads > 1). Root cause and fix in #15329 (event-mask handling for replication clients in iothread.c). Searchable as 'busy loop', 'io thread 100% cpu', 'idle spin', 'replica connection spinning'.",
   "url": "https://github.com/redis/redis/issues/15311"
  }
 },
 {
  "id": "issue:redis-15388",
  "entity_key": "issue:redis-15388",
  "labels": [
   "Issue"
  ],
  "properties": {
   "name": "#15388 Expired keys linger for minutes under TTL-heavy write load",
   "title": "Expired keys linger for minutes under TTL-heavy write load",
   "number": 15388,
   "state": "closed",
   "summary": "Keys with short TTLs stay visible in DBSIZE and RSS long after expiry; expired_stale_perc high but the FAST expire cycle never runs.",
   "description": "After a TTL-heavy load test, staging instances kept elevated DBSIZE and RSS for minutes: keys with 1-5s TTLs were only reclaimed by the slow expire cycle or lazy access-time expiration. INFO stats showed expired_stale_perc consistently above the fast-cycle threshold yet zero ACTIVE_EXPIRE_CYCLE_FAST activations. Root cause: a microseconds-vs-milliseconds unit mismatch in the stale trigger comparison in expire.c meant the FAST cycle condition could never be true — one character wrong, feature silently dead. Fixed in #15412. Searchable as 'expired keys not deleted', 'memory not released after TTL', 'active expire not working', 'DBSIZE includes expired keys'.",
   "url": "https://github.com/redis/redis/issues/15388"
  }
 },
 {
  "id": "issue:redis-15340",
  "entity_key": "issue:redis-15340",
  "labels": [
   "Issue"
  ],
  "properties": {
   "name": "#15340 CLIENT TRACKING BCAST leaks key names outside the user's ACL patterns",
   "title": "CLIENT TRACKING BCAST leaks key names outside the user's ACL patterns",
   "number": 15340,
   "state": "closed",
   "summary": "BCAST-mode invalidation pushes disclose key names an ACL-restricted user cannot read — information leak across tenants.",
   "description": "Security report: a client that enables CLIENT TRACKING BCAST (optionally with PREFIX) receives __redis__:invalidate push messages for every matching key modification — including keys outside the ACL key patterns its user is permitted to read. On multi-tenant instances this leaks tenant key names (which often embed user IDs or emails) to other tenants. Fixed in #15371 by filtering BCAST invalidation broadcasts through the receiving client's ACL key permissions in tracking.c/acl.c. Searchable as 'ACL bypass', 'invalidation message leak', 'client-side caching security', 'key name disclosure'.",
   "url": "https://github.com/redis/redis/issues/15340"
  }
 },
 {
  "id": "issue:redis-15379",
  "entity_key": "issue:redis-15379",
  "labels": [
   "Issue"
  ],
  "properties": {
   "name": "#15379 Crash: VRANDMEMBER with count -9223372036854775808",
   "title": "Crash: VRANDMEMBER with count -9223372036854775808",
   "number": 15379,
   "state": "closed",
   "summary": "redis-server crashes when vector sets' VRANDMEMBER is called with LLONG_MIN as the count argument.",
   "description": "Fuzzer-found crash in the bundled vector-sets module: VRANDMEMBER key -9223372036854775808 negates the count to make it positive, but -LLONG_MIN overflows (undefined behavior) and the server aborts. Fixed in #15392 by rejecting LLONG_MIN explicitly with a range error; regression test in the vector-sets python suite. Searchable as 'VRANDMEMBER crash', 'LLONG_MIN negation', 'vector sets segfault', 'integer overflow crash'.",
   "url": "https://github.com/redis/redis/issues/15379"
  }
 },
 {
  "id": "issue:redis-15408",
  "entity_key": "issue:redis-15408",
  "labels": [
   "Issue"
  ],
  "properties": {
   "name": "#15408 BITFIELD #offset silently wraps negative on huge values",
   "title": "BITFIELD #offset silently wraps negative on huge values",
   "number": 15408,
   "state": "closed",
   "summary": "BITFIELD with a large #-prefixed typed offset overflows signed multiplication and operates on a wrapped negative offset instead of erroring.",
   "description": "BITFIELD GET/SET with a #-prefixed offset multiplies the offset by the type width; with huge offsets the signed 64-bit multiplication overflows (UB), wrapping negative and either erroring confusingly or touching unintended bit ranges. Expected: a clean 'bit offset is out of range' error. Fixed in #15433 with explicit overflow checking in bitops.c BITFIELD parsing. Searchable as 'BITFIELD overflow', 'signed integer overflow', 'typed offset wraps', 'undefined behavior bitops'.",
   "url": "https://github.com/redis/redis/issues/15408"
  }
 },
 {
  "id": "issue:redis-15418",
  "entity_key": "issue:redis-15418",
  "labels": [
   "Issue"
  ],
  "properties": {
   "name": "#15418 BGREWRITEAOF segfault when dataset contains vector-set keys",
   "title": "BGREWRITEAOF segfault when dataset contains vector-set keys",
   "number": 15418,
   "state": "closed",
   "summary": "AOF rewrite crashes on module datatypes that registered no aof_rewrite callback; first hit on a canary node holding vector-set keys.",
   "description": "During the v8.4 production rollout a canary node crashed on its first scheduled AOF rewrite: the aof.c rewrite path called the module type's aof_rewrite callback unconditionally, but vector sets (and any module type relying on RDB-preamble persistence) register NULL there — instant segfault dereferencing a NULL function pointer during BGREWRITEAOF. Fixed in #15436 with a NULL guard plus a vector-sets aof_rewrite regression test. Searchable as 'BGREWRITEAOF crash', 'module aof_rewrite NULL', 'segfault during AOF rewrite', 'vector sets persistence crash'.",
   "url": "https://github.com/redis/redis/issues/15418"
  }
 },
 {
  "id": "decision:streams-dlq-design",
  "entity_key": "decision:streams-dlq-design",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "XDLQ dead-letter workflow: group-scoped quarantine layered on XNACK, replay preserves entry IDs",
   "statement": "Build stream dead-lettering as an XDLQ command family storing group-scoped metadata keyed by stream ID (no side stream key in v1); dead-lettered is a quarantined state stronger than XNACK that XCLAIM/XAUTOCLAIM/XPENDING skip; XDLQ REPLAY reinserts the original entry ID into the group PEL rather than appending a new entry; persistence via command rewriting.",
   "rationale": "A separate side-stream key would broaden keyspace, cluster routing, replication, and UX complexity, while 'this message failed in this consumer group' is inherently group-scoped. Quarantine loses meaning if generic claim paths can bypass it, and XPENDING implies active outstanding work. Preserving the original entry ID keeps replay deterministic and avoids producer-side confusion; command rewriting avoids risky new RDB encodings for v1.",
   "lifecycle": "accepted",
   "summary": "Accepted design for the XDLQ dead-letter feature: consumer-group-scoped metadata, quarantine distinct from XNACK, ID-preserving replay.",
   "description": "The design-lock decision behind feature streams-dlq and draft PR #15500, distilled from the 717-line STREAM_DLQ_IMPLEMENTATION_PLAN.md: XDLQ MOVE/LIST/INFO/REPLAY/PURGE subcommands; DLQ records (reason, consumer, delivery count, moved-at ms, replay count) hang off streamCG keyed by entry ID, compatible with the existing PEL/nack-zone structures; entries move normal-pending -> nacked -> dead-lettered -> replayed; XINFO STREAM FULL grows dlq-count/first-dlq-id/last-dlq-id summary fields. Answers issue redis/redis#7386. Debated in the #xdlq-semantics thread (replay-vs-purge defaults, whether FATAL XNACKs auto-move). Searchable as 'DLQ design', 'dead letter architecture', 'XDLQ semantics', 'quarantine vs nack'.",
   "decided_at": "2026-06-28"
  }
 },
 {
  "id": "decision:repl-zstd-compression",
  "entity_key": "decision:repl-zstd-compression",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Compress the replication link with zstd, negotiated per-replica via REPLCONF",
   "statement": "Add opt-in zstd compression of the master-to-replica command stream (client_comp.c), negotiated via REPLCONF compression with exact level match, requiring io-threads > 1 so compression work stays off the main thread; zstd stays a system (non-vendored) dependency behind BUILD_COMPRESSION=yes with no-op fallback.",
   "rationale": "Cross-AZ and cross-region replication bandwidth dominates infra cost for write-heavy fleets; zstd gives 3-5x stream compression at acceptable CPU. Doing the compression on IO threads keeps the main thread latency profile intact, and exact-level negotiation avoids asymmetric CPU surprises. Keeping zstd out of deps/ was a deliberate exception to the vendoring rule since the feature is opt-in and no-ops without the library.",
   "lifecycle": "accepted",
   "summary": "Accepted: zstd replication link compression as shipped in #15366/#15490, canaried in staging before production.",
   "description": "Decision behind feature replication-zstd-compression and the repl-compression component: compress the replication stream with zstd end-frames flushed in beforeSleep (client_comp.c), config knobs repl-compression / repl-compression-max-latency, REPLCONF compression negotiation with exact-level match, hard requirement io-threads > 1. Rollout: staging canary (deployment repl-compression-canary) surfaced the IO-thread busy loop (#15329) before production enablement. The one sanctioned exception to no-external-runtime-deps. Searchable as 'replication bandwidth', 'zstd stream compression', 'REPLCONF compression', 'compressed replica link'.",
   "decided_at": "2026-05-20"
  }
 },
 {
  "id": "decision:atomic-slot-migration",
  "entity_key": "decision:atomic-slot-migration",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Replace MIGRATE/ASK resharding with destination-initiated atomic slot migration",
   "statement": "Cluster resharding moves to a destination-initiated Atomic Slot Migration engine (cluster_asm.c): the destination snapshots slot ranges as RESTORE commands over a dedicated RDB channel, streams live writes on a main channel, pauses source writes only when lag < cluster-slot-migration-handoff-max-lag-bytes (default 1MB), and flips slot ownership atomically via the cluster bus. The legacy per-key MIGRATE/ASK dance remains only for manual single-key moves.",
   "rationale": "Per-key MIGRATE resharding is slow (one key per round trip), leaves long client-visible ASK redirect windows, loses per-key metadata edge cases, and cannot bound the write-pause. Snapshot-plus-stream with a lag-gated handoff gives near-zero pause, no ASK window, and an API (clusterAsmProcess/clusterAsmOnEvent) that module-based cluster implementations can drive.",
   "lifecycle": "accepted",
   "summary": "Accepted: cluster_asm.c atomic slot migration supersedes the legacy MIGRATE/ASK per-key resharding approach.",
   "description": "Decision behind component atomic-slot-migration and feature atomic-slot-migration-feature (3888 LOC cluster_asm.c, 2025): destination-initiated, dual-channel (RDB snapshot channel + live write stream), lag-gated write pause (cluster-slot-migration-handoff-max-lag-bytes, cluster-slot-migration-write-pause-timeout), atomic ownership flip on the cluster bus. redis-cli drives it since #15338 (server >= 8.4.0); the topology-change test race was deflaked in #15493; KeyMeta double-restoration in the shared RESTORE path fixed in #15466. Supersedes migrate-restore-resharding. Runbook: cluster-resharding. Searchable as 'ASM', 'slot migration', 'reshard without ASK', 'resharding write pause'.",
   "decided_at": "2026-03-12"
  }
 },
 {
  "id": "decision:migrate-restore-resharding",
  "entity_key": "decision:migrate-restore-resharding",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Reshard clusters by per-key MIGRATE with ASK redirects",
   "statement": "Slot resharding is performed key-by-key: the admin tool issues CLUSTER GETKEYSINSLOT + MIGRATE (DUMP/RESTORE over a synchronous connection) for each key while clients follow ASK/ASKING redirects to the importing node until CLUSTER SETSLOT finalizes ownership.",
   "rationale": "At the time, per-key MIGRATE reused the existing DUMP/RESTORE serialization, required no new cluster-bus machinery, and kept the cluster available throughout — the ASK redirect protocol let clients chase keys mid-migration without a global pause.",
   "lifecycle": "superseded",
   "summary": "Superseded: the original per-key MIGRATE/ASK resharding model, replaced by atomic slot migration in 2026.",
   "description": "Historical decision now superseded by atomic-slot-migration: resharding as a long sequence of per-key MIGRATE calls with client-visible ASK/ASKING redirect windows, driven by redis-cli/redis-trib. Pain points that killed it: throughput of one key per round trip on big slots, hours-long resharding of large clusters, ASK-window complexity in every client library, and metadata fidelity gaps (the KeyMeta era made per-key serialization even more delicate, see #15466). Kept in the graph as context for why cluster_asm.c exists. Searchable as 'MIGRATE resharding', 'ASK redirect', 'legacy reshard', 'per-key migration'.",
   "decided_at": "2025-10-05"
  }
 },
 {
  "id": "decision:single-threaded-event-loop",
  "entity_key": "decision:single-threaded-event-loop",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Command execution stays strictly single-threaded on one ae event loop",
   "statement": "All command execution happens on the main thread inside a single ae event loop; concurrency is achieved by non-blocking multiplexed IO and background offload (bio, io-threads, module threads), never by concurrent command execution against the keyspace.",
   "rationale": "Single-threaded execution eliminates locking on every data structure, makes command semantics trivially atomic, keeps tail latency predictable, and has repeatedly benchmarked better than fine-grained locking for an in-memory workload dominated by O(1)/O(log n) operations. Complexity is pushed to the edges (IO, forks) where it is containable.",
   "lifecycle": "accepted",
   "summary": "Foundational: one main thread executes all commands; parallelism lives only at the IO and background edges.",
   "description": "The load-bearing architectural decision of the codebase: ae.c runs one event loop on the main thread and every keyspace mutation happens there — asserted at runtime in processClientsFromIOThread (io-threads hand off parsed commands but never execute). Everything else in this graph bends around it: bio threads for fsync/lazyfree, fork-based persistence for snapshots, io-threads for socket work, module background threads fenced by locks. When someone asks 'why doesn't Redis use all my cores for commands', this is the answer. Searchable as 'single threaded', 'event loop', 'atomicity guarantee', 'no locks on keyspace'.",
   "decided_at": "2025-09-25"
  }
 },
 {
  "id": "decision:io-threads-for-network",
  "entity_key": "decision:io-threads-for-network",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "IO threads own reads, parsing, and writes — never command execution",
   "statement": "Each IO thread (iothread.c, 2024 redesign) runs its own ae event loop and offloads socket reads, RESP parsing, and writes for its bound clients, handing fully-parsed commands to the main thread via mutex-guarded pending lists; command execution remains exclusively on the main thread.",
   "rationale": "Network IO and RESP parsing are the scalable share of CPU under high connection counts and can parallelize without touching keyspace invariants; per-thread event loops avoid the old start/stop batching model's synchronization overhead. Keeping execution on the main thread preserves the single-threaded-event-loop guarantees while still scaling throughput 2-4x on multi-core hosts.",
   "lifecycle": "accepted",
   "summary": "Accepted: the 2024 iothread.c redesign — per-thread ae loops for socket work, parsed commands funneled to the main thread.",
   "description": "Refines single-threaded-event-loop for multi-core scaling: io-threads N spawns N-1 IO threads each with its own ae loop, clients are bound to threads, reads/parses/writes happen there, and processClientsFromIOThread drains mutex-guarded pending lists on the main thread (with an assertion that execution never happens off-main). Operationally sharp edges captured in this graph: the replication-client busy-loop bug pattern (fixed #15329), sendTrackingMessage pausing another thread's loop via pauseIOThread, zstd repl compression requiring io-threads > 1, and zmalloc's 8-slot sharded used_memory accounting. Searchable as 'io-threads', 'threaded IO', 'network offload', 'pending clients list'.",
   "decided_at": "2025-11-05"
  }
 },
 {
  "id": "decision:listpack-over-ziplist",
  "entity_key": "decision:listpack-over-ziplist",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Listpack replaces ziplist as the compact-encoding workhorse",
   "statement": "All small-collection compact encodings (hash, zset, list nodes, set, stream macro-nodes) use listpack; ziplist survives only as a load-time format converted to listpack in rdb.c, with ziplist.c retained solely for that conversion.",
   "rationale": "Ziplist's prevlen back-pointers caused cascading update storms (an O(n^2) worst case) and its encoding was fiendish to modify safely — the source of multiple historical corruption CVEs. Listpack entries are self-contained (no prevlen chain), support backward traversal via end-of-entry length bytes, and are simpler to fuzz and reason about.",
   "lifecycle": "accepted",
   "summary": "Accepted: listpack everywhere ziplist used to be; ziplist demoted to an RDB load-time legacy conversion path.",
   "description": "Encoding-strategy decision confirmed by the lowlevel survey: only server.h still includes ziplist.h, and rdb.c converts RDB_TYPE_*_ZIPLIST/ZIPMAP payloads to listpack on load (OBJ_ENCODING_LISTPACK). Governs hash-max-listpack-entries/-value, zset-max-listpack-entries/-value, set-max-listpack-entries, list-max-listpack-size thresholds, and stream listpack macro-nodes. Supersedes the ziplist-encoding decision; the listpack-for-small-collections preference tells contributors which encoding new small-value features must target. Searchable as 'listpack vs ziplist', 'cascade update', 'compact encoding', 'small hash encoding'.",
   "decided_at": "2025-10-10"
  }
 },
 {
  "id": "decision:ziplist-encoding",
  "entity_key": "decision:ziplist-encoding",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Small collections use the ziplist contiguous encoding",
   "statement": "Small hashes, zsets, and list nodes are stored as ziplists: contiguous byte arrays with per-entry prevlen back-pointers enabling bidirectional traversal, converted to hashtable/skiplist encodings past size thresholds.",
   "rationale": "For small collections a contiguous byte array beats pointer-chasing structures on both memory (no per-entry malloc headers) and cache locality; prevlen fields made backward iteration possible without an index.",
   "lifecycle": "superseded",
   "summary": "Superseded: the original ziplist compact encoding, replaced by listpack after cascading-update and safety problems.",
   "description": "Historical decision now superseded by listpack-over-ziplist: ziplist's prevlen chain meant inserting or resizing one entry could cascade length-field rewrites through every following entry (the 'cascading update' O(n^2) pathology) and made the format notoriously easy to corrupt — several CVEs traced to ziplist edge cases. Retained in the graph because ziplist.c still exists for RDB load-time conversion of old dumps (ziplist-legacy component). Searchable as 'ziplist', 'prevlen', 'cascading update', 'legacy encoding'.",
   "decided_at": "2025-09-22"
  }
 },
 {
  "id": "decision:rdb-aof-hybrid-persistence",
  "entity_key": "decision:rdb-aof-hybrid-persistence",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "Durability = Multi-Part AOF with an RDB-preamble BASE plus periodic RDB snapshots",
   "statement": "The durable persistence story is hybrid: Multi-Part AOF (manifest-managed BASE + INCR files in appenddirname) where the BASE is written as an RDB snapshot (rdbSaveRio with RDBFLAGS_AOF_PREAMBLE) and INCRs are command logs; standalone RDB BGSAVE remains for snapshots/backups; both rely on fork-based copy-on-write children.",
   "rationale": "RDB alone loses the last window of writes; plain-text AOF alone rewrites too slowly and loads too slowly at scale. An RDB-format BASE loads an order of magnitude faster than replaying commands, while INCR AOFs bound data loss to appendfsync granularity, and the manifest makes rewrites atomic without the old double-buffer rewrite dance.",
   "lifecycle": "accepted",
   "summary": "Foundational: hybrid RDB-preamble Multi-Part AOF as the durability model, fork/COW as the snapshot mechanism.",
   "description": "The persistence-architecture decision uniting rdb.c and aof.c: aof-use-rdb-preamble yes writes the AOFRW BASE via rdbSaveRio; the manifest in appenddirname tracks BASE/INCR/HISTORY files; BGSAVE/AOFRW children rely on fork COW with usage reported over the childinfo pipe. Everything operational hangs off it: the aofrw-cow-spike bug pattern and rss-cow-spike alert (COW doubling under write load), the aof-rewrite-pressure runbook, the BACKUP command (#15441) hard-linking BASE/INCR into backupdirname, and diskless replica sync framed by $EOF:40-hex marks. Searchable as 'hybrid persistence', 'aof preamble', 'multi-part aof', 'fork copy-on-write'.",
   "decided_at": "2025-10-20"
  }
 },
 {
  "id": "decision:jemalloc-default-allocator",
  "entity_key": "decision:jemalloc-default-allocator",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "jemalloc (patched) is the default allocator on Linux",
   "statement": "Redis links a vendored, patched jemalloc as the default allocator on Linux (USE_JEMALLOC), carrying a custom je_get_defrag_hint API that active defrag depends on; libc malloc is a fallback, and MALLOC=libc builds lose activedefrag.",
   "rationale": "jemalloc's arena/size-class design keeps fragmentation far lower than glibc malloc for Redis's allocation patterns, provides reliable per-allocation introspection (used_memory accuracy), and its stability under long-running processes is proven; patching in a defrag hint lets Redis do active defragmentation no stock allocator supports.",
   "lifecycle": "accepted",
   "summary": "Foundational: vendored patched jemalloc as default allocator; active defrag depends on its custom defrag-hint patch.",
   "description": "Allocator decision behind adapter jemalloc-allocator and the jemalloc-defrag-contract: deps/jemalloc is vendored (per no-external-runtime-deps) and patched with je_get_defrag_hint, which defrag.c's StageDescriptor stages (500us slices) use to decide which allocations to move; zmalloc layers per-thread sharded used_memory accounting (8 cache-line-aligned slots for io-threads scaling) on top. Consequences: mem_fragmentation_ratio semantics, activedefrag availability, and the Lua VM getting its own dedicated arena so script allocations don't block defrag. Searchable as 'jemalloc', 'fragmentation ratio', 'active defrag hint', 'allocator choice'.",
   "decided_at": "2025-09-30"
  }
 },
 {
  "id": "decision:kvstore-per-slot-dicts",
  "entity_key": "decision:kvstore-per-slot-dicts",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "The keyspace is a kvstore of per-slot dicts with Fenwick-tree cumulative counts",
   "statement": "Databases are kvstore objects holding one dict per cluster slot (16384 in cluster mode, 1 otherwise), with a Fenwick tree (binary indexed tree) over per-slot dict sizes enabling O(log n) fair random-slot selection and cumulative key counting.",
   "rationale": "Cluster operations (slot migration, per-slot key listing, slot-scoped flushes) need slot-local key sets without scanning a monolithic dict; per-slot dicts make atomic slot migration and slot stats natural, while the Fenwick tree keeps RANDOMKEY and eviction sampling unbiased across slots of wildly different sizes at logarithmic cost.",
   "lifecycle": "accepted",
   "summary": "Accepted: kvstore splits each DB into per-slot dicts indexed by a Fenwick tree — the substrate ASM and slot stats build on.",
   "description": "Keyspace-architecture decision behind the kvstore and fenwick-tree components: kvstore.c owns an array of dicts keyed by slot with a dict_sizes BIT for cumulative counts; CLUSTER GETKEYSINSLOT, cluster slot stats, atomic slot migration's per-slot snapshotting, and fair RANDOMKEY all ride on it. Also the reason resize/rehash bookkeeping is per-slot (dict-resize-avoid-during-cow interacts here) and why the global HFE expiry estore is per-slot too. Searchable as 'kvstore', 'per slot dict', 'Fenwick tree', 'binary indexed tree', 'GETKEYSINSLOT'.",
   "decided_at": "2025-11-18"
  }
 },
 {
  "id": "decision:resp3-protocol-decision",
  "entity_key": "decision:resp3-protocol-decision",
  "labels": [
   "Decision"
  ],
  "properties": {
   "name": "RESP3 ships as an opt-in protocol upgrade negotiated by HELLO, RESP2 stays default",
   "statement": "The server speaks RESP2 by default forever; clients opt into RESP3 per-connection via HELLO 3, which unlocks typed replies (maps, sets, doubles, big numbers), out-of-band push messages (invalidation, pubsub), and attribute replies — and no command may change its RESP2 reply shape.",
   "rationale": "Breaking the wire protocol would strand thousands of client libraries; per-connection negotiation lets new capabilities (client-side caching push, typed replies) ship without a flag day, while the RESP2-compatibility invariant keeps every existing client working against every future server.",
   "lifecycle": "accepted",
   "summary": "Accepted: RESP3 via HELLO 3 negotiation, RESP2 reply shapes frozen forever — the compat rule behind resp-backward-compat.",
   "description": "Protocol-evolution decision governing resp-protocol and networking: HELLO 3 switches a connection to RESP3 (maps/sets/doubles/push frames); CLIENT TRACKING invalidation uses RESP3 push natively and the RESP2 redirect-to-pubsub fallback otherwise (see resp2-invalidation-via-redirect-only). Enforced by the resp-backward-compat preference: new commands choose reply shapes that degrade cleanly to RESP2, and existing RESP2 replies are frozen. Every addReply* call site in the tree lives under this rule. Searchable as 'RESP3', 'HELLO 3', 'push message', 'protocol negotiation', 'reply shape compatibility'.",
   "decided_at": "2025-10-02"
  }
 },
 {
  "id": "preference:no-external-runtime-deps",
  "entity_key": "preference:no-external-runtime-deps",
  "labels": [
   "Preference"
  ],
  "properties": {
   "name": "Vendor all runtime dependencies into deps/",
   "policy_kind": "dependency_policy",
   "prescription": "Never add a system-library runtime dependency; vendor the exact source into deps/ (jemalloc, Lua, hiredis, linenoise, fpconv, hdr_histogram pattern) so a bare `make` on a clean POSIX box always succeeds. Opt-in system libs (zstd via BUILD_COMPRESSION=yes) must no-op cleanly when absent.",
   "summary": "Dependencies are vendored in deps/, never assumed on the system; zstd is the single sanctioned opt-in exception.",
   "description": "Long-standing build philosophy: deps/ carries pinned, sometimes patched copies of every runtime dependency (jemalloc with je_get_defrag_hint, Lua 5.1 with bytecode loading disabled, hiredis, linenoise) so builds are reproducible and airgapped-friendly. The zstd replication-compression dependency (#15366) was deliberately left as a system library behind BUILD_COMPRESSION=yes with full no-op fallback — the exception that documents the rule. Violations to flag in review: configure-time discovery of system libs, pkg-config requirements, dlopen of unvendored code. Searchable as 'vendored deps', 'deps directory', 'system library policy', 'make on clean machine'."
  }
 },
 {
  "id": "preference:listpack-for-small-collections",
  "entity_key": "preference:listpack-for-small-collections",
  "labels": [
   "Preference"
  ],
  "properties": {
   "name": "New small-value encodings target listpack, never ziplist or bespoke formats",
   "policy_kind": "data_structure_policy",
   "prescription": "Any feature needing a compact small-collection representation must use listpack (with a size/count threshold config pair like hash-max-listpack-entries/-value) and convert to the scaled structure past thresholds; do not touch ziplist.c and do not invent new serialized inline formats.",
   "summary": "Listpack is the only sanctioned compact encoding for small collections; ziplist is load-time legacy only.",
   "description": "Encoding policy flowing from the listpack-over-ziplist decision: hashes, zsets, sets, list nodes, stream macro-nodes, and the new hash templates (OBJ_ENCODING_TMPL_LP) all encode small data as listpacks with paired threshold configs, converting to dict/skiplist/quicklist beyond them. Reviewers should reject PRs adding entries to ziplist.c (RDB load conversion only) or hand-rolled contiguous formats without listpack's bounds discipline. Searchable as 'compact encoding policy', 'listpack threshold', 'encoding conversion', 'small hash memory'."
  }
 },
 {
  "id": "preference:tcl-integration-tests-required",
  "entity_key": "preference:tcl-integration-tests-required",
  "labels": [
   "Preference"
  ],
  "properties": {
   "name": "Behavior changes ship with tcl integration tests",
   "policy_kind": "testing_policy",
   "prescription": "Every behavior-visible change lands with tests in tests/unit or tests/integration (tcl framework); new commands get a dedicated suite file; cluster tests must wait for convergence (ASM completion, replication sync) before asserting, using shared helpers in cluster_util.tcl / util.tcl rather than sleeps.",
   "summary": "No behavior change merges without tcl coverage; cluster tests wait for convergence instead of sleeping.",
   "description": "Testing policy visible in nearly every recent PR: #15329 shipped a 149-line replication-iothreads suite with a one-line fix, #15436/#15466/#15433 all added regression tests, and #15493 codified the convergence rule by moving an ASM-wait helper into cluster_util.tcl after the cluster-topology-change test raced an in-flight migration. The XDLQ plan mandates tests/unit/type/stream-dlq.tcl before merge. Flaky-test debt is treated as a bug owned by whoever wrote the test. Searchable as 'tcl tests', 'regression test required', 'flaky test policy', 'wait_for_condition'."
  }
 },
 {
  "id": "preference:resp-backward-compat",
  "entity_key": "preference:resp-backward-compat",
  "labels": [
   "Preference"
  ],
  "properties": {
   "name": "Never change an existing RESP2 reply shape",
   "policy_kind": "api_compatibility_policy",
   "prescription": "Existing commands' RESP2 reply shapes are frozen: extend replies only by appending fields to maps/arrays where clients tolerate extras (like SLOWLOG GET's added argc field), gate richer shapes behind RESP3 or new subcommands, and never repurpose error strings that clients pattern-match (MOVED, ASK, NOGROUP, BUSYGROUP, LOADING).",
   "summary": "Wire-compatibility rule: RESP2 replies and well-known error prefixes are frozen; new richness goes to RESP3 or new commands.",
   "description": "API-compatibility policy flowing from resp3-protocol-decision: thousands of client libraries parse replies positionally and pattern-match error prefixes, so changing a reply shape is a silent ecosystem break. Recent practice: SLOWLOG GET appended the total-argc field rather than restructuring (#15347 pattern), XACKDEL introduced per-ID status arrays as a new command instead of overloading XACK, and XDLQ (#15500) defines fresh per-ID reply shapes rather than extending XPENDING. Review checklist: does the change alter any existing addReply sequence under RESP2? Searchable as 'breaking protocol change', 'reply format frozen', 'client compatibility', 'error prefix contract'."
  }
 },
 {
  "id": "preference:c99-no-vla",
  "entity_key": "preference:c99-no-vla",
  "labels": [
   "Preference"
  ],
  "properties": {
   "name": "C99 subset: no VLAs, no compiler extensions in portable code",
   "policy_kind": "code_style_policy",
   "prescription": "Write C99 without variable-length arrays or GNU-only extensions in portable paths (server compiles with -std=c99 -pedantic across gcc/clang on Linux/BSD/macOS/Solaris); use fixed maxima or heap allocation instead of VLAs, guard platform intrinsics (AVX2/AVX512/NEON) behind runtime detection plus fallback scalar paths, and keep UB-prone arithmetic (signed overflow) behind explicit checks.",
   "summary": "Portable C99 only: no VLAs, SIMD behind runtime detection with scalar fallbacks, signed-overflow checks explicit.",
   "description": "Code-style policy for the C codebase: VLAs are banned (stack-depth unpredictability, C11 optionality), platform SIMD (the AVX2/AVX512/NEON paths in bitops and hyperloglog) must runtime-detect and fall back to scalar, and arithmetic that can overflow signed types needs explicit guards — the BITFIELD #offset overflow (#15433) and VRANDMEMBER LLONG_MIN negation (#15392) are the cautionary tales from this quarter. The compile-time multiplexer ladder in ae.c (evport/epoll/kqueue/select) is the model for platform divergence done right. Searchable as 'VLA ban', 'C99 pedantic', 'signed overflow check', 'SIMD fallback', 'portability rules'."
  }
 },
 {
  "id": "bug_pattern:iothread-repl-busy-loop",
  "entity_key": "bug_pattern:iothread-repl-busy-loop",
  "labels": [
   "BugPattern"
  ],
  "properties": {
   "name": "IO thread busy-loops at 100% CPU when owning replication clients",
   "symptom_signature": "top/htop shows an io_thd_* thread pinned at 100% CPU on an otherwise idle master with attached replicas; perf shows the thread cycling its ae event loop with a permanently-armed write event for the replica connection and zero bytes moving; disappears when io-threads is set to 1 or replicas detach.",
   "summary": "Replica connections bound to IO threads left a write event armed with nothing to send, spinning a full core even when idle.",
   "description": "Bug pattern in the 2024 iothread.c redesign's interaction with replication clients: replica connections have their output driven by the replication feed rather than the normal client reply path, so the IO thread's event registration logic kept the connection's write event armed even when the replication buffer was empty — the thread's ae loop woke instantly forever, burning 100% of a core per affected thread with no functional symptoms. Detection: CPU alarms on idle masters, 'io thread high cpu', power draw anomalies. Surfaced 2026-07-02 in the repl-compression staging canary (compression requires io-threads > 1). First fix attempt (usleep throttle) failed review and testing; real fix #15329 corrects the event mask so the thread parks in epoll_wait. Regression guard: tests/integration/replication-iothreads.tcl. Searchable as 'busy loop', 'io thread spin', '100% cpu idle', 'replica connection event mask'.",
   "first_seen": "2026-07-02"
  }
 },
 {
  "id": "bug_pattern:fast-expire-stale-trigger-dead",
  "entity_key": "bug_pattern:fast-expire-stale-trigger-dead",
  "labels": [
   "BugPattern"
  ],
  "properties": {
   "name": "FAST expire cycle silently disabled by a microseconds/milliseconds mismatch",
   "symptom_signature": "Under heavy expired-key pressure, DBSIZE and RSS stay elevated for minutes; INFO shows expired_stale_perc above threshold but no fast expire cycles ever run; keys with 1-5s TTLs only reclaimed by slow cycle or on access.",
   "summary": "A one-character unit mismatch in expire.c's stale trigger meant ACTIVE_EXPIRE_CYCLE_FAST could never activate.",
   "description": "Bug pattern in activeExpireCycle: the condition gating the FAST cycle compared a timestamp in microseconds against a threshold in milliseconds, so the trigger was numerically impossible and the fast path was dead code in production — active expiration silently degraded to the slow cycle alone. Classic 'silent feature death by unit mismatch': no error, no crash, just expired keys lingering and memory staying high after TTL-heavy workloads. Found by Amara auditing staging RSS after a load test (issue redis-15388), fixed by one unit conversion in #15412. Lesson recorded: assert units at boundaries or encode them in variable names (_us/_ms suffixes). Searchable as 'expired keys linger', 'fast expire cycle never fires', 'unit mismatch', 'us vs ms', 'active expire broken'.",
   "first_seen": "2026-07-05"
  }
 },
 {
  "id": "bug_pattern:aofrw-cow-spike",
  "entity_key": "bug_pattern:aofrw-cow-spike",
  "labels": [
   "BugPattern"
  ],
  "properties": {
   "name": "Copy-on-write memory doubling during AOF rewrite under write load",
   "symptom_signature": "RSS nearly doubles within a minute of BGREWRITEAOF starting on a write-heavy instance; INFO persistence shows aof_rewrite_in_progress:1 with mem_cow steadily climbing toward used_memory; kernel OOM killer or maxmemory evictions fire mid-rewrite; worst when auto-aof-rewrite triggers during peak traffic.",
   "summary": "Fork-based AOFRW under heavy writes copies nearly every touched page, spiking RSS toward 2x and triggering OOM/eviction cascades.",
   "description": "Operational bug pattern inherent to fork/COW persistence (rdb-aof-hybrid-persistence): the AOFRW child shares pages with the parent, but a write-heavy parent dirties pages faster than the child finishes, so copy-on-write duplicates approach the full dataset size — RSS spikes toward 2x used_memory, and on memory-tight hosts the kernel OOM-killer takes down redis-server or maxmemory eviction storms evict hot keys mid-rewrite. Aggravators: auto-aof-rewrite-percentage firing at peak traffic, THP (transparent huge pages) inflating COW granularity to 2MB, dict rehashing during the fork (see dict-resize-avoid-during-cow). Observed 2026-06-14 in production during the pre-v8.4 era; mitigated operationally (runbook aof-rewrite-pressure: schedule rewrites off-peak, disable THP, headroom sizing, watch the rss-cow-spike alert; BACKUP command #15441 now offers hard-link backups without a second fork). Searchable as 'COW spike', 'RSS doubles during rewrite', 'OOM during BGREWRITEAOF', 'copy-on-write memory', 'aof rewrite eviction storm'.",
   "first_seen": "2026-06-14"
  }
 },
 {
  "id": "bug_pattern:keymeta-double-restore",
  "entity_key": "bug_pattern:keymeta-double-restore",
  "labels": [
   "BugPattern"
  ],
  "properties": {
   "name": "KeyMeta restored twice through RESTORE-based rewrites and slot migration",
   "symptom_signature": "After AOF reload or atomic slot migration, keys report duplicated per-key metadata: expire metadata slot registered twice, module keymeta callbacks fire twice per key, OBJECT/DEBUG inspection shows doubled metabits state on the destination node.",
   "summary": "The RESTORE path shared by AOF rewrites and cluster_asm.c re-applied KeyMeta already embedded in serialized payloads.",
   "description": "Bug pattern at the intersection of the kvobj/keymeta framework and RESTORE-based data movement: serialized payloads produced for AOF rewrites and atomic slot migration already embed KeyMeta (expire in slot 0, module metadata slots), but the deserializing RESTORE path applied metadata again on top — double-registering lifecycle callbacks and corrupting metabits accounting after reload or slot handoff. Symptoms subtle: doubled module callback invocations, wrong metadata after ASM, only visible with keymeta-using modules or HFE-era metadata. Traced by Elena during ASM validation (metadata doubled on destination nodes), fixed in #15466 by skipping re-application when the payload embeds KeyMeta; new keymeta module tests guard it. Searchable as 'duplicate key metadata', 'RESTORE keymeta', 'metadata doubled after migration', 'metabits corruption'.",
   "first_seen": "2026-07-10"
  }
 },
 {
  "id": "bug_pattern:bcast-acl-key-leak",
  "entity_key": "bug_pattern:bcast-acl-key-leak",
  "labels": [
   "BugPattern"
  ],
  "properties": {
   "name": "BCAST invalidations disclose key names outside the client's ACL patterns",
   "symptom_signature": "A client with CLIENT TRACKING BCAST receives __redis__:invalidate push messages naming keys its ACL user cannot read; multi-tenant instances leak other tenants' key names (often containing user IDs) through the invalidation channel.",
   "summary": "BCAST-mode client tracking broadcast every matching invalidation to every subscriber regardless of ACL key permissions.",
   "description": "Security bug pattern in client-side caching: BCAST mode registers a prefix in the tracking table and pushed invalidations for every key modification under that prefix to every subscribed client — without consulting the receiving client's ACL key patterns. On shared/multi-tenant instances, tenant A could enable BCAST with an empty prefix and harvest tenant B's key names (which commonly embed emails, user IDs, session tokens) from invalidation traffic despite having no read permission. Reported privately 2026-07-01 (issue redis-15340), fixed in #15371 by filtering broadcasts through per-client ACL checks in tracking.c/acl.c. Related policy: bcast-prefixes-no-overlap. Searchable as 'ACL leak', 'invalidation disclosure', 'BCAST security', 'tracking key name leak', 'multi-tenant isolation'.",
   "first_seen": "2026-07-01"
  }
 },
 {
  "id": "bug_pattern:vrandmember-llong-min-crash",
  "entity_key": "bug_pattern:vrandmember-llong-min-crash",
  "labels": [
   "BugPattern"
  ],
  "properties": {
   "name": "VRANDMEMBER crashes on LLONG_MIN count via negation overflow",
   "symptom_signature": "redis-server aborts (crash log with SIGSEGV/SIGABRT in the vector-sets module) when VRANDMEMBER is called with count -9223372036854775808; any client able to run vector-set commands can crash the server with one command.",
   "summary": "Negating LLONG_MIN to normalize a negative VRANDMEMBER count is undefined behavior and crashed the server.",
   "description": "Crash bug pattern in the bundled vector-sets HNSW module: VRANDMEMBER treats negative counts as 'with duplicates' and negates them, but -LLONG_MIN does not fit in long long — undefined behavior that in practice aborted the process. A single command from any client with vector-set access was a denial of service. Fuzzer-found (issue redis-15379), fixed in #15392 by rejecting LLONG_MIN with a range error; regression test in the vector-sets python suite. Same negation-overflow family as the BITFIELD #offset bug (#15433) — both now cited in the c99-no-vla policy's overflow-check clause. Searchable as 'VRANDMEMBER crash', 'LLONG_MIN', 'negation overflow', 'one command DoS'.",
   "first_seen": "2026-07-08"
  }
 },
 {
  "id": "fix:iothread-busyloop-sleep-throttle",
  "entity_key": "fix:iothread-busyloop-sleep-throttle",
  "labels": [
   "Fix"
  ],
  "properties": {
   "name": "Failed attempt: throttle spinning IO threads with a short sleep",
   "fix_steps": "Added a usleep(50) backoff in the IO thread loop when an iteration processed zero events for replica-owned connections, hoping to cap the spin without touching event registration.",
   "verification_status": "failed",
   "summary": "First attempt papered over the busy loop with a sleep throttle; it cut CPU but added replication latency jitter and left the armed-event root cause in place.",
   "description": "Plausible-but-wrong first fix for iothread-repl-busy-loop: sleeping in the IO thread loop reduced the idle CPU burn but introduced up to 50us of added latency per replication feed wakeup (visible as replica lag jitter in the staging canary with compression enabled), and the spurious write event stayed armed — the loop still woke instantly after every sleep. Rejected in review by Salvatore with 'fix the event mask, not the symptom'; superseded by the real fix in #15329. Kept in the graph as the canonical example of treating a scheduler symptom instead of the event-registration cause. Searchable as 'sleep throttle', 'usleep backoff', 'failed busy loop fix'."
  }
 },
 {
  "id": "fix:iothread-busyloop-event-mask-fix",
  "entity_key": "fix:iothread-busyloop-event-mask-fix",
  "labels": [
   "Fix"
  ],
  "properties": {
   "name": "Correct write-event mask handling for replica clients on IO threads",
   "fix_steps": "One-line change in iothread.c: stop keeping the write event armed for replication clients with an empty output state, so the IO thread's ae loop parks in its multiplexer wait until the replication feed actually queues data; added tests/integration/replication-iothreads.tcl (149 lines) covering io-threads > 1 with attached replicas, idle CPU assertion included.",
   "verification_status": "verified",
   "summary": "The real fix for the IO-thread busy loop, shipped in #15329: remove the spuriously-armed write event instead of throttling the spin.",
   "description": "Resolves iothread-repl-busy-loop at the root: replica connections owned by IO threads no longer keep a write-ready event registered when the replication buffer is empty, so idle threads sleep in epoll_wait/kevent instead of spinning at 100% CPU. Verified by Luiza in the staging canary: io_thd_* CPU dropped from 100% to <1% idle with 4 io-threads, 2 replicas, and repl compression enabled; the new replication-iothreads tcl suite guards regressions. Unblocked the repl-compression production rollout (compression requires io-threads > 1). Searchable as 'event mask fix', 'iothread busy loop resolved', 'epoll park'."
  }
 },
 {
  "id": "fix:fast-expire-unit-conversion-fix",
  "entity_key": "fix:fast-expire-unit-conversion-fix",
  "labels": [
   "Fix"
  ],
  "properties": {
   "name": "Convert the FAST expire trigger comparison to consistent milliseconds",
   "fix_steps": "One-character-class change in expire.c aligning the stale-trigger timestamp comparison to milliseconds on both sides; verified by rerunning the TTL-heavy staging load test and confirming ACTIVE_EXPIRE_CYCLE_FAST activations in INFO plus prompt RSS reclamation.",
   "verification_status": "verified",
   "summary": "Fix for the dead FAST expire cycle (#15412): one unit conversion re-enables fast active expiration under expired-key pressure.",
   "description": "Resolves fast-expire-stale-trigger-dead: with both sides of the stale-percentage trigger in milliseconds, the FAST expire cycle activates as designed when expired_stale_perc exceeds threshold, and short-TTL keys are reclaimed within seconds instead of minutes. Verified by Luiza re-running the original TTL-heavy reproduction on staging: DBSIZE converged in <5s post-expiry vs minutes before, fast-cycle counters visible in INFO stats. Follow-up hygiene: _us/_ms suffix convention noted for time variables in expire.c review. Searchable as 'fast expire fixed', 'unit conversion fix', 'TTL reclamation restored'."
  }
 },
 {
  "id": "fix:aofrw-offpeak-scheduling-mitigation",
  "entity_key": "fix:aofrw-offpeak-scheduling-mitigation",
  "labels": [
   "Fix"
  ],
  "properties": {
   "name": "Operational mitigation: off-peak AOFRW scheduling, THP off, COW headroom",
   "fix_steps": "Raised auto-aof-rewrite-percentage from 100 to 200 and auto-aof-rewrite-min-size to 1gb on write-heavy production nodes so automatic rewrites fire less often; cron-triggered BGREWRITEAOF in the 03:00 UTC low-traffic window; verified transparent_hugepage=never on all hosts; resized memory headroom to 2.2x expected used_memory; wired the rss-cow-spike alert to page before OOM territory.",
   "verification_status": "verified",
   "summary": "Ops-level resolution of the AOFRW COW spike: fewer, off-peak rewrites with THP disabled and 2.2x headroom; no OOM recurrence since.",
   "description": "Resolves aofrw-cow-spike operationally (the fork/COW cost is inherent to rdb-aof-hybrid-persistence, so the fix is scheduling and headroom, not code): automatic rewrites now trigger at 200% growth with a 1gb floor, scheduled rewrites run off-peak, THP is disabled fleet-wide (2MB COW granularity was the biggest aggravator), and hosts carry 2.2x headroom validated against peak dirty-page rates. Verified by Salvatore across four weekly cycles in production: peak mem_cow held under 45% of used_memory, zero OOM events, no eviction storms. Codified in the aof-rewrite-pressure runbook; the BACKUP command (#15441) further removes one class of ad-hoc BGSAVE forks. Searchable as 'COW mitigation', 'rewrite scheduling', 'THP disable', 'memory headroom'."
  }
 },
 {
  "id": "fix:keymeta-restore-skip-fix",
  "entity_key": "fix:keymeta-restore-skip-fix",
  "labels": [
   "Fix"
  ],
  "properties": {
   "name": "Skip KeyMeta re-application when RESTORE payloads embed metadata",
   "fix_steps": "Made the shared RESTORE deserialization path (cluster.c/cluster_asm.c/AOF rewrite consumers) detect KeyMeta already embedded in the payload and skip the second application; added keymeta module tests covering AOF reload and atomic slot migration round-trips.",
   "verification_status": "verified",
   "summary": "Fix for KeyMeta double-restoration (#15466): RESTORE no longer re-applies metadata that the serialized payload already carries.",
   "description": "Resolves keymeta-double-restore: the deserializer now recognizes embedded KeyMeta (expire slot 0 plus module metadata slots) and applies it exactly once, restoring correct metabits state and single-fire lifecycle callbacks after AOF reload and ASM slot handoff. Verified by Luiza with the new keymeta module test matrix: metadata identical byte-for-byte across serialize/deserialize round-trips on both the AOF path and a full atomic slot migration between two nodes. Unblocked confidence in ASM for keymeta/HFE-bearing datasets. Searchable as 'keymeta fix', 'RESTORE dedup', 'metadata single application'."
  }
 },
 {
  "id": "fix:bcast-acl-filter-fix",
  "entity_key": "fix:bcast-acl-filter-fix",
  "labels": [
   "Fix"
  ],
  "properties": {
   "name": "Filter BCAST invalidation broadcasts through the receiver's ACL key patterns",
   "fix_steps": "Reworked tracking.c BCAST fan-out (~224 lines, plus acl.c helpers) to evaluate each candidate invalidation key against the receiving client's ACL key permissions before pushing; added acl + tracking regression tests asserting a restricted user never sees out-of-pattern key names.",
   "verification_status": "verified",
   "summary": "Fix for the BCAST ACL key-name leak (#15371): invalidation pushes are now ACL-filtered per receiving client.",
   "description": "Resolves bcast-acl-key-leak: every BCAST invalidation is checked against the subscriber's ACL key patterns at send time, so multi-tenant instances no longer leak foreign key names through __redis__:invalidate traffic. Verified by Luiza with a two-tenant reproduction: tenant A subscribed with an empty prefix receives invalidations only for keys matching its own ACL patterns while tenant B's churn stays invisible; perf impact measured negligible for prefix-scoped subscriptions. Security-sensitive review by Yuki and Salvatore before merge. Searchable as 'ACL filtered invalidation', 'BCAST leak fixed', 'tracking security fix'."
  }
 },
 {
  "id": "fix:vrandmember-llong-min-guard",
  "entity_key": "fix:vrandmember-llong-min-guard",
  "labels": [
   "Fix"
  ],
  "properties": {
   "name": "Reject LLONG_MIN count in VRANDMEMBER before negation",
   "fix_steps": "Added an explicit bounds check in the vector-sets module rejecting count == LLONG_MIN with a range error before the sign normalization; regression test added to the vector-sets python suite alongside a sweep of other negation sites in the module.",
   "verification_status": "verified",
   "summary": "Fix for the VRANDMEMBER LLONG_MIN crash (#15392): the pathological count is rejected cleanly instead of hitting UB.",
   "description": "Resolves vrandmember-llong-min-crash: VRANDMEMBER key -9223372036854775808 now returns a clean 'value is out of range' error instead of aborting the server. Rohan also swept the module for other unchecked negations as part of the fix. Verified in the vector-sets python suite plus a targeted fuzz rerun that previously reproduced the abort within seconds. Cross-referenced with the BITFIELD overflow fix (#15433) in the c99-no-vla policy as this quarter's UB case studies. Searchable as 'LLONG_MIN guard', 'VRANDMEMBER fixed', 'negation overflow check'."
  }
 },
 {
  "id": "investigation:iothread-busyloop-profiling",
  "entity_key": "investigation:iothread-busyloop-profiling",
  "labels": [
   "Investigation"
  ],
  "properties": {
   "name": "Profiling the idle-master IO thread CPU burn",
   "status": "closed",
   "summary": "perf-based investigation that traced the 100% CPU io_thd_* spin to a permanently-armed write event on replica connections; killed the sleep-throttle attempt and produced the event-mask fix.",
   "description": "Investigation of iothread-repl-busy-loop led by Salvatore after the repl-compression staging canary showed io_thd_1 pinned at 100% on an idle master: `perf top -t <tid>` showed the thread cycling aeProcessEvents with zero-byte writes; `strace` confirmed epoll_wait returning instantly with a write-ready replica fd every iteration. Ruled out compression itself (reproduced with BUILD_COMPRESSION off), ruled out the sleep-throttle attempt (latency jitter, root cause intact), and isolated the event-registration path for replication clients in iothread.c — replica connections kept AE_WRITABLE armed with an empty replication buffer. Outcome: the one-line event-mask fix in #15329 plus the replication-iothreads tcl suite. Method note recorded: always strace the multiplexer before touching scheduling. Searchable as 'busy loop investigation', 'perf top io thread', 'epoll_wait instant return'."
  }
 },
 {
  "id": "investigation:expire-lag-memory-audit",
  "entity_key": "investigation:expire-lag-memory-audit",
  "labels": [
   "Investigation"
  ],
  "properties": {
   "name": "Staging RSS audit after the TTL-heavy load test",
   "status": "closed",
   "summary": "Memory audit explaining why expired keys lingered: INFO forensics showed expired_stale_perc high with zero fast cycles, leading straight to the us/ms comparison in expire.c.",
   "description": "Investigation of fast-expire-stale-trigger-dead led by Amara: after a TTL-heavy staging load test, RSS and DBSIZE stayed elevated for minutes. INFO stats forensics showed expired_stale_perc pinned above the fast-cycle threshold while the fast-cycle activation counter stayed at zero across the whole fleet — statistically impossible if the trigger worked. Reading activeExpireCycle found the microseconds-vs-milliseconds comparison that made the condition unsatisfiable; git archaeology showed the mismatch survived multiple refactors because no test asserted fast-cycle activation. Outcome: the unit-conversion fix (#15412), a new assertion-style test, and a convention note to suffix time variables with _us/_ms. Searchable as 'expire audit', 'stale percentage forensics', 'fast cycle never activated'."
  }
 },
 {
  "id": "investigation:aofrw-cow-forensics",
  "entity_key": "investigation:aofrw-cow-forensics",
  "labels": [
   "Investigation"
  ],
  "properties": {
   "name": "Production COW spike forensics during AOF rewrites",
   "status": "closed",
   "summary": "Correlated smaps/mem_cow telemetry with traffic to explain near-2x RSS spikes during BGREWRITEAOF; produced the off-peak scheduling mitigation, THP finding, and the rss-cow-spike alert thresholds.",
   "description": "Investigation of aofrw-cow-spike led by Amara with Salvatore on the persistence side: instrumented /proc/<child>/smaps and the childinfo-pipe mem_cow reporting across production rewrite windows, correlating COW growth rate with write throughput and key-access distribution. Findings: THP inflated COW granularity to 2MB pages (single hot key dirties 2MB), auto-aof-rewrite-percentage 100 reliably fired rewrites during peak traffic, and dict rehashing during the fork amplified page dirtying (cross-referenced with the dict-resize-avoid-during-cow decision). Modeled worst-case COW as dirty-page-rate x rewrite-duration and validated the 2.2x headroom figure. Outcome: the aofrw-offpeak-scheduling-mitigation fix, the rss-cow-spike alert (page at COW > 40% of used_memory), and the aof-rewrite-pressure runbook. Searchable as 'COW forensics', 'smaps analysis', 'mem_cow telemetry', 'THP huge pages redis'."
  }
 },
 {
  "id": "investigation:asm-keymeta-doubling-trace",
  "entity_key": "investigation:asm-keymeta-doubling-trace",
  "labels": [
   "Investigation"
  ],
  "properties": {
   "name": "Tracing doubled key metadata after atomic slot migrations",
   "status": "closed",
   "summary": "ASM validation caught destination nodes with doubled per-key metadata; the trace pinned the shared RESTORE path re-applying embedded KeyMeta and fed directly into #15466.",
   "description": "Investigation of keymeta-double-restore led by Elena during atomic-slot-migration validation with keymeta-bearing datasets: after migrating slots holding keys with module metadata and HFE state, destination nodes showed lifecycle callbacks firing twice and DEBUG-level metabits accounting doubled. Bisected the data path — DUMP-equivalent serialization on the source embeds KeyMeta, and the destination's RESTORE handler applied metadata from the payload and then again through the generic post-restore hook. Confirmed the same doubling on plain AOF-rewrite reload (shared code path), which upgraded severity from 'ASM edge case' to 'persistence correctness'. Outcome: the restore-skip fix shipped by Salvatore in #15466 with a keymeta test matrix. Searchable as 'metadata doubling trace', 'ASM validation', 'RESTORE path bisect'."
  }
 },
 {
  "id": "deployment:v8-4-rollout",
  "entity_key": "deployment:v8-4-rollout",
  "labels": [
   "Deployment"
  ],
  "properties": {
   "name": "v8.4 production rollout",
   "date": "2026-07-06",
   "environment": "production",
   "summary": "Rolling production upgrade to the 8.4 line: atomic slot migration, hash templates prep, BACKUP command; surfaced the vector-sets AOF rewrite crash on a canary.",
   "description": "Staged production rollout of the 8.4-era build to prod-cache-euw1 (one replica, then masters via failover, 2026-07-06 through 07-09): brings atomic slot migration into production resharding, the BACKUP command for hard-link backups, and the fixed FAST expire cycle (#15412). The first canary node crashed on a scheduled BGREWRITEAOF with vector-set keys — the NULL aof_rewrite callback bug (issue redis-15418) — pausing the rollout for two days until #15436 merged. Post-rollout validation followed the failover-drill runbook. Searchable as 'v8.4 deploy', 'production upgrade', 'rolling restart'."
  }
 },
 {
  "id": "deployment:repl-compression-canary",
  "entity_key": "deployment:repl-compression-canary",
  "labels": [
   "Deployment"
  ],
  "properties": {
   "name": "Replication compression staging canary",
   "date": "2026-07-15",
   "environment": "staging",
   "summary": "Staging canary enabling zstd replication compression (repl-compression yes, io-threads 4); measured 3.8x stream compression and flushed out the IO-thread busy loop.",
   "description": "Canary deployment to staging enabling the new zstd replication link compression (#15366) ahead of production: repl-compression yes with io-threads 4 across the staging cluster and sentinel pair. Results: 3.8x average compression on the write-heavy soak workload, replica lag flat, CPU +6% on masters — and the discovery that idle IO threads owning replica connections spin at 100% CPU (issue redis-15311, fixed #15329 before the canary re-run on 07-15 passed clean). Production enablement is gated on one more week of soak per Elena's rollout plan discussed in the repl-compression-canary-review thread. Searchable as 'compression canary', 'staging soak', 'REPLCONF compression rollout'."
  }
 },
 {
  "id": "deployment:nightly-ci-2026-07-19",
  "entity_key": "deployment:nightly-ci-2026-07-19",
  "labels": [
   "Deployment"
  ],
  "properties": {
   "name": "Nightly CI matrix 2026-07-19",
   "date": "2026-07-19",
   "environment": "ci",
   "summary": "Nightly CI deployment running the full tcl matrix on unstable tip; first fully green cluster run since the ASM-wait deflake landed.",
   "description": "The 2026-07-19 nightly CI deployment: builds unstable tip (post #15364 hash templates, pre #15366 merge) across standalone/cluster/sentinel/TLS/io-threads/sanitizer configurations and runs the full tcl matrix. Notable as the first fully green cluster suite since the cluster-topology-change flake was fixed by waiting for ASM completion (#15493 merged next morning after this run validated the helper on a branch build). Nightly health is Luiza's domain; red nightlies block merges by convention. Searchable as 'nightly run', 'green build', 'test matrix deploy'."
  }
 },
 {
  "id": "runbook:aof-rewrite-pressure",
  "entity_key": "runbook:aof-rewrite-pressure",
  "labels": [
   "Runbook"
  ],
  "properties": {
   "name": "Handling AOF rewrite memory pressure (COW spikes)",
   "title": "Handling AOF rewrite memory pressure (COW spikes)",
   "summary": "What to do when RSS balloons during BGREWRITEAOF: verify it's COW, buy headroom, reschedule rewrites, and the THP/config checklist.",
   "description": "On-call runbook for the aofrw-cow-spike pattern. Diagnose: INFO persistence shows aof_rewrite_in_progress:1 and climbing mem_cow; /proc/<child>/smaps confirms private-dirty growth. Immediate: if COW > 60% of used_memory and climbing, consider killing the rewrite child (it restarts later) before the kernel OOM-killer picks the parent; never restart the parent. Stabilize: confirm transparent_hugepage=never, check auto-aof-rewrite-percentage (fleet standard 200) and -min-size (1gb), verify maxmemory headroom >= 2.2x. Prevent: schedule BGREWRITEAOF in the 03:00 UTC window; for backup needs prefer the BACKUP command (#15441) which hard-links Multi-Part AOF files instead of forking a second child. Escalate to Salvatore Greco. Alert: rss-cow-spike. Searchable as 'OOM during rewrite', 'mem_cow high', 'kill rewrite child', 'THP redis'."
  }
 },
 {
  "id": "runbook:cluster-resharding",
  "entity_key": "runbook:cluster-resharding",
  "labels": [
   "Runbook"
  ],
  "properties": {
   "name": "Resharding with atomic slot migration",
   "title": "Resharding with atomic slot migration",
   "summary": "Step-by-step ASM resharding on prod-cache-euw1: preflight checks, redis-cli --cluster rebalance, lag-gate monitoring, rollback and stuck-migration handling.",
   "description": "Operator runbook for moving slots on production clusters using atomic slot migration (never legacy MIGRATE — see the atomic-slot-migration decision). Preflight: server >= 8.4.0 everywhere, replica-full-sync-buffer-limit sized, no rewrite/BGSAVE in flight on source nodes, keymeta fix #15466 present. Execute: redis-cli --cluster rebalance (drives ASM since #15338); watch CLUSTER SLOT-STATS and the migration state on both nodes; handoff pauses source writes only when lag < cluster-slot-migration-handoff-max-lag-bytes (1MB) — if the pause exceeds cluster-slot-migration-write-pause-timeout the migration aborts safely. Stuck migration: check the dedicated RDB channel connection, then abort and re-run; ownership flips are atomic so no split ownership is possible. Verify: topology-change events observed by modules, slot counts per node, no ASK redirects in client logs. Escalate to Elena Novak. Searchable as 'reshard', 'rebalance slots', 'ASM stuck', 'slot handoff pause'."
  }
 },
 {
  "id": "runbook:failover-drill",
  "entity_key": "runbook:failover-drill",
  "labels": [
   "Runbook"
  ],
  "properties": {
   "name": "Failover drill: Sentinel and cluster promotion",
   "title": "Failover drill: Sentinel and cluster promotion",
   "summary": "Quarterly drill procedure: induced master failure, SDOWN/ODOWN observation, promotion timing budgets, PSYNC2 partial-resync verification, and rollback.",
   "description": "Runbook for the quarterly failover drill on staging (and post-rollout validation in production): stop a master, watch Sentinel reach SDOWN then ODOWN quorum, leader election by epoch, and replica promotion through the six-state failover machine — budget: detection < down-after-milliseconds, full failover < 30s. For cluster mode: verify the promoted replica's PSYNC2 dual-replid handling lets surviving replicas partial-resync (master_replid2 continuity, no full sync storm) and that replicas-keep-backlog held. Checks: no lost acknowledged writes (min-replicas-to-write honored), replica-lag alert cleared, clients reconnected. Rollback: controlled SENTINEL FAILOVER / CLUSTER FAILOVER back once the old master rejoins as replica. Escalate to Elena Novak. Searchable as 'failover test', 'sentinel quorum drill', 'promotion budget', 'partial resync verification'."
  }
 },
 {
  "id": "runbook:hotkey-triage",
  "entity_key": "runbook:hotkey-triage",
  "labels": [
   "Runbook"
  ],
  "properties": {
   "name": "Hot key triage with HOTKEYS",
   "title": "Hot key triage with HOTKEYS",
   "summary": "Using the HOTKEYS CPU/net top-K sketches to find and defuse hot keys: enable, rank, slot-filter, and the standard mitigations ladder.",
   "description": "Runbook for latency or single-node saturation suspected to be hot-key driven: enable HOTKEYS tracking (CuckooHeavyKeeper sketches ranking keys by CPU-us and net-bytes), let it sample 60s, then read the top-K — on clusters, slot-filter to the saturated node's slots. Interpret: CPU-heavy keys (expensive ops on big collections) vs net-heavy keys (large values fetched often) need different fixes. Mitigation ladder: client-side caching via CLIENT TRACKING for read-hot keys, key splitting/sharding suffixes for write-hot, replica reads for net-hot, and for cluster imbalance consider moving the slot (cluster-resharding runbook). Correlate with LATENCY HISTORY and slowlog (slowlog-entry-max-argc trimming applies). Disable tracking after triage — sketches cost memory. Escalate to Amara Okafor. Searchable as 'hot key', 'single node saturated', 'HOTKEYS command', 'top-k keys', 'skewed slot load'."
  }
 },
 {
  "id": "alert:rss-cow-spike",
  "entity_key": "alert:rss-cow-spike",
  "labels": [
   "Alert"
  ],
  "properties": {
   "name": "RSS copy-on-write spike during persistence fork",
   "summary": "Pages when a BGSAVE/AOFRW child's COW memory exceeds 40% of used_memory or RSS exceeds 1.8x used_memory while a fork is active.",
   "description": "Alert watching aof-persistence fork behavior on production nodes: fires when mem_cow (childinfo-pipe reporting) exceeds 40% of used_memory, or process RSS exceeds 1.8x used_memory while aof_rewrite_in_progress or rdb_bgsave_in_progress is set. Warning at 40%/15min, critical at 60% (approaching the 2.2x headroom budget — OOM-killer territory). Response: aof-rewrite-pressure runbook (verify THP off, consider killing the rewrite child). Tuned from the aofrw-cow-forensics investigation; owned by Amara Okafor. Searchable as 'COW alert', 'RSS spike page', 'rewrite memory alarm'."
  }
 },
 {
  "id": "alert:replica-lag",
  "entity_key": "alert:replica-lag",
  "labels": [
   "Alert"
  ],
  "properties": {
   "name": "Replica replication lag",
   "summary": "Pages when any replica's offset lag exceeds 10MB for 5 minutes or master_link_status goes down; warns on repl-backlog overrun risk.",
   "description": "Alert watching replication-core health across production and staging: computes per-replica lag as master_repl_offset minus the replica's acked offset; warning at 10MB sustained 5min, critical at 64MB (approaching repl-backlog-size, where disconnect means full sync — and full sync storms are exactly what the RDB-channel dual-connection sync and replicas-keep-backlog exist to soften). Also fires on master_link_status:down > 30s. Known benign blip: brief lag jitter during zstd compression canary re-negotiation. Response: check network first, then the feed path (see #15447 mid-stream feeding), then failover-drill runbook if the master is sick. Owned by Elena Novak. Searchable as 'replica behind', 'replication lag alert', 'backlog overrun', 'full sync storm risk'."
  }
 },
 {
  "id": "alert:cluster-split-brain",
  "entity_key": "alert:cluster-split-brain",
  "labels": [
   "Alert"
  ],
  "properties": {
   "name": "Cluster bus partition / split-brain risk",
   "summary": "Pages when cluster nodes disagree on cluster_state or a node marks >= 2 masters PFAIL simultaneously; watches gossip health on the cluster bus.",
   "description": "Alert watching cluster-bus gossip health on prod-cache-euw1: fires when (a) cluster_state differs across nodes for > cluster-node-timeout, (b) any node reports >= 2 masters PFAIL simultaneously (partition signature, not node failure), or (c) bus message rates collapse asymmetrically. The gossip fanout design (1/10 of nodes, min 3, PFAIL propagation ~node_timeout*2) bounds how fast agreement converges — sustained disagreement past 2x node_timeout is real. Response: identify the partition boundary from CLUSTER NODES link states on each side, check cluster-require-full-coverage behavior, do not force failovers while partitioned. Escalate to Elena Novak immediately; split-brain writes are unrecoverable. Searchable as 'split brain', 'cluster partition', 'PFAIL storm', 'gossip failure'."
  }
 },
 {
  "id": "conversation:xdlq-semantics",
  "entity_key": "conversation:xdlq-semantics",
  "labels": [
   "Conversation"
  ],
  "properties": {
   "name": "XDLQ semantics: replay vs purge, and what FATAL should do",
   "title": "XDLQ semantics: replay vs purge, and what FATAL should do",
   "summary": "Streams Squad thread hashing out dead-letter edge semantics for #15500: replay ownership, purge irreversibility, whether XNACK FATAL auto-moves to DLQ, and cluster/replication fidelity.",
   "description": "Design thread on the draft XDLQ PR (#15500) among the Streams Squad. Settled: XDLQ REPLAY must name a target consumer (no 'back to the pool' replay in v1 — keeps ownership deterministic per the streams-dlq-design decision); XDLQ PURGE is irreversible and requires an explicit ID list or FORCE for ranges; replayed entries keep their original entry ID and increment a replay counter surfaced in XDLQ LIST. Still open when the thread closed: should XNACK FATAL (delivery_count=LLONG_MAX) auto-move entries to the DLQ or stay a separate manual XDLQ MOVE step — Yuki holds manual-move for v1 so operators see quarantine happen explicitly; Rohan raised replication concerns about auto-move ordering relative to XIDMPRECORD, reinforcing command-rewriting persistence. Luiza committed the stream-dlq.tcl matrix: replay-then-ack, purge-during-claim, replica reload fidelity. Searchable as 'DLQ debate', 'replay semantics', 'FATAL auto-move', 'purge safety'."
  }
 },
 {
  "id": "conversation:repl-compression-canary-review",
  "entity_key": "conversation:repl-compression-canary-review",
  "labels": [
   "Conversation"
  ],
  "properties": {
   "name": "Repl compression canary review: results and production gate",
   "title": "Repl compression canary review: results and production gate",
   "summary": "Review of the staging zstd canary: 3.8x compression, +6% master CPU, the busy-loop discovery, and the checklist gating production enablement.",
   "description": "Post-canary review thread for the repl-compression staging deployment: Elena presented soak results (3.8x average stream compression on the write-heavy workload, replica lag flat after the #15329 fix, +6% master CPU, exact-level REPLCONF negotiation verified across version skew). The canary's big catch — IO threads spinning at 100% on idle replica connections (bug pattern iothread-repl-busy-loop) — was walked through as a case study for why canaries must include idle-state observation, not just load. Production gate agreed: one more clean soak week, rss/CPU dashboards extended to compression ratio, rollback plan is CONFIG SET repl-compression no (renegotiates on next sync), and Salvatore signed off contingent on the busy-loop regression test staying in the nightly matrix. Searchable as 'canary review', 'compression results', 'production gate', 'rollback plan'."
  }
 },
 {
  "id": "conversation:hotkeys-rollout-review",
  "entity_key": "conversation:hotkeys-rollout-review",
  "labels": [
   "Conversation"
  ],
  "properties": {
   "name": "HOTKEYS rollout review: sketch overhead and triage workflow",
   "title": "HOTKEYS rollout review: sketch overhead and triage workflow",
   "summary": "Review before enabling HOTKEYS tracking in production: CuckooHeavyKeeper memory/CPU overhead numbers, slot filtering for cluster triage, and the runbook workflow.",
   "description": "Thread reviewing whether HOTKEYS tracking (CuckooHeavyKeeper top-K sketches ranking keys by CPU-us and net-bytes) is cheap enough to enable on-demand in production: Amara presented overhead measurements (fixed sketch memory per tracked dimension, low single-digit % CPU while sampling), argued for triage-time enablement rather than always-on, and demoed the cluster slot-filtering flow that isolates a saturated node's hot keys. Salvatore pushed for the disable-after-triage discipline to be written into the runbook (done — hotkey-triage), and the group agreed the mitigation ladder (client-side caching, key splitting, replica reads, slot moves) belongs with the runbook rather than tribal knowledge. Follow-up: redis-cli key-analytics integration for offline analysis. Searchable as 'hotkeys review', 'sketch overhead', 'top-k rollout', 'triage workflow'."
  }
 },
 {
  "id": "conversation:maxmemory-tuning",
  "entity_key": "conversation:maxmemory-tuning",
  "labels": [
   "Conversation"
  ],
  "properties": {
   "name": "Maxmemory and eviction tuning for the v8.4 fleet",
   "title": "Maxmemory and eviction tuning for the v8.4 fleet",
   "summary": "Ops thread settling fleet maxmemory policy: allkeys-lru vs volatile-ttl per workload, eviction-tenacity under COW pressure, and headroom interplay with AOF rewrites.",
   "description": "Operational tuning thread ahead of the v8.4 rollout: Amara and Elena settled per-workload eviction policy (allkeys-lru for the pure-cache slots, volatile-ttl where producers set honest TTLs — with a reminder that the FAST expire cycle actually works now post-#15412, changing volatile reclaim behavior), reviewed maxmemory-eviction-tenacity against latency SLOs, and reconciled maxmemory headroom with the 2.2x COW budget from the AOF rewrite forensics — eviction storms during rewrites were traced to headroom double-counting. Also flagged: replication buffers are excluded from maxmemory accounting (exclude-buffers-from-maxmemory decision), so replica-heavy nodes need the alert margins, not maxmemory, to absorb feed growth. Outcome: fleet config PR plus dashboard changes; revisit after compression goes to production. Searchable as 'eviction tuning', 'maxmemory policy', 'allkeys-lru vs volatile', 'headroom budget'."
  }
 },
 {
  "id": "document:replication-topology-notes",
  "entity_key": "document:replication-topology-notes",
  "labels": [
   "Document"
  ],
  "properties": {
   "name": "Replication topology notes",
   "title": "Replication topology notes",
   "summary": "Living doc mapping the replication fabric: PSYNC2 replid rules, RDB-channel full sync flow, compression negotiation, and Sentinel supervision of non-cluster shards.",
   "description": "Engineering notes maintained by Elena covering how our fleets actually replicate: PSYNC2 dual-replid rules of thumb (when a promoted replica can serve partial resyncs, the shiftReplicationId offset+1 subtlety), the RDB-channel dual-connection full sync (replica buffers the live stream while loading, replica-full-sync-buffer-limit sizing), zstd link compression negotiation and its io-threads > 1 requirement, backlog sizing vs the replica-lag alert thresholds, and which shards Sentinel supervises vs cluster-managed ones. The pre-read for the failover-drill runbook and for anyone touching replication.c. Searchable as 'replication topology', 'partial resync rules', 'full sync flow', 'backlog sizing'."
  }
 },
 {
  "id": "document:oncall-handbook",
  "entity_key": "document:oncall-handbook",
  "labels": [
   "Document"
  ],
  "properties": {
   "name": "Redis on-call handbook",
   "title": "Redis on-call handbook",
   "summary": "The on-call entry point: alert-to-runbook routing (rss-cow-spike, replica-lag, cluster-split-brain), escalation owners by subsystem, and first-15-minutes checklists.",
   "description": "The on-call rotation's front door: routes each alert to its runbook (rss-cow-spike -> aof-rewrite-pressure, replica-lag -> failover-drill triage steps, cluster-split-brain -> cluster-resharding's partition appendix), lists escalation owners by subsystem (Greco core/persistence, Novak cluster/replication, Okafor memory/perf, Tanaka streams/clients, Mehta modules, Costa tooling/CI), and gives first-15-minutes checklists: INFO snapshot capture, LATENCY HISTORY, never restart a parent mid-fork, never force failover during a partition. Includes the environment map (prod-cache-euw1 topology, staging mirror, CI) and deploy freeze rules during rollouts. Searchable as 'on-call guide', 'escalation path', 'alert routing', 'incident first steps'."
  }
 },
 {
  "id": "document:memory-tuning-guide",
  "entity_key": "document:memory-tuning-guide",
  "labels": [
   "Document"
  ],
  "properties": {
   "name": "Memory tuning guide",
   "title": "Memory tuning guide",
   "summary": "Fleet memory doctrine: maxmemory/headroom budgeting against COW, eviction policy selection, defrag thresholds, and fragmentation-ratio interpretation.",
   "description": "Amara's doctrine doc for fleet memory settings: how to budget maxmemory against the 2.2x COW headroom rule (and why replication buffers being excluded from maxmemory changes the math), choosing eviction policies per workload (allkeys-lru cache slots vs volatile-ttl with honest TTLs, per the maxmemory-tuning thread), activedefrag thresholds and what mem_fragmentation_ratio actually measures under jemalloc (patched je_get_defrag_hint, StageDescriptor 500us slices), lazyfree settings, and the per-thread used_memory sharding introduced for io-threads scaling. Companion to the aof-rewrite-pressure and hotkey-triage runbooks. Searchable as 'memory tuning', 'fragmentation ratio explained', 'eviction policy guide', 'defrag settings'."
  }
 },
 {
  "id": "document:io-threads-architecture-notes",
  "entity_key": "document:io-threads-architecture-notes",
  "labels": [
   "Document"
  ],
  "properties": {
   "name": "IO threads architecture notes",
   "title": "IO threads architecture notes",
   "summary": "How the 2024 iothread.c redesign works: per-thread ae loops, client binding, pending-list handoff, pauseIOThread choreography, and the busy-loop postmortem.",
   "description": "Salvatore's architecture notes on the io-threads model for anyone touching iothread.c: each IO thread runs its own ae event loop, clients bind to threads, reads/RESP parsing/writes happen thread-side, and parsed commands cross to the main thread via mutex-guarded pending lists (execution single-threadedness asserted in processClientsFromIOThread). Covers the pauseIOThread choreography (used by sendTrackingMessage to push invalidations to connections owned by another thread), interaction with replication clients including the full busy-loop postmortem (bug pattern iothread-repl-busy-loop, why the sleep throttle was wrong, the event-mask fix in #15329), and why repl compression requires io-threads > 1. Required reading before binding new client classes to IO threads. Searchable as 'io thread design', 'pending list handoff', 'pauseIOThread', 'busy loop postmortem'."
  }
 }
];

export const REDIS_GRAPH_EDGES: ProjectGraphEdge[] = [
 {
  "from": "service:redis-server",
  "type": "DEFINED_IN",
  "to": "repository:redis/redis",
  "properties": {
   "truth": "authoritative_fact"
  }
 },
 {
  "from": "service:redis-sentinel",
  "type": "DEFINED_IN",
  "to": "repository:redis/redis",
  "properties": {
   "truth": "authoritative_fact"
  }
 },
 {
  "from": "service:redis-cli",
  "type": "DEFINED_IN",
  "to": "repository:redis/redis",
  "properties": {
   "truth": "authoritative_fact"
  }
 },
 {
  "from": "service:redis-benchmark",
  "type": "DEFINED_IN",
  "to": "repository:redis/redis",
  "properties": {
   "truth": "authoritative_fact"
  }
 },
 {
  "from": "repository:redis/redis-doc",
  "type": "RELATED_TO",
  "to": "repository:redis/redis",
  "properties": {
   "note": "companion docs repo"
  }
 },
 {
  "from": "component:pubsub",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:pubsub",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:pubsub",
  "type": "DEPENDS_ON",
  "to": "component:networking",
  "properties": {}
 },
 {
  "from": "component:pubsub",
  "type": "DEPENDS_ON",
  "to": "component:kvstore",
  "properties": {}
 },
 {
  "from": "component:pubsub",
  "type": "DEPENDS_ON",
  "to": "component:dict",
  "properties": {}
 },
 {
  "from": "component:pubsub",
  "type": "DEPENDS_ON",
  "to": "component:cluster-core",
  "properties": {}
 },
 {
  "from": "component:pubsub",
  "type": "DEPENDS_ON",
  "to": "component:cluster-slot-stats",
  "properties": {}
 },
 {
  "from": "component:pubsub",
  "type": "IMPLEMENTS",
  "to": "interface:keyspace-events",
  "properties": {}
 },
 {
  "from": "config:client-output-buffer-limit",
  "type": "CONFIGURES",
  "to": "component:pubsub",
  "properties": {}
 },
 {
  "from": "component:keyspace-notifications",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:keyspace-notifications",
  "type": "DEPENDS_ON",
  "to": "component:pubsub",
  "properties": {}
 },
 {
  "from": "component:keyspace-notifications",
  "type": "DEPENDS_ON",
  "to": "component:module-system",
  "properties": {}
 },
 {
  "from": "component:keyspace-notifications",
  "type": "DEPENDS_ON",
  "to": "component:sds",
  "properties": {}
 },
 {
  "from": "component:keyspace-notifications",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:keyspace-notifications",
  "type": "IMPLEMENTS",
  "to": "interface:keyspace-events",
  "properties": {}
 },
 {
  "from": "config:notify-keyspace-events",
  "type": "CONFIGURES",
  "to": "component:keyspace-notifications",
  "properties": {}
 },
 {
  "from": "component:client-tracking",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:client-tracking",
  "type": "DEPENDS_ON",
  "to": "component:rax",
  "properties": {}
 },
 {
  "from": "component:client-tracking",
  "type": "DEPENDS_ON",
  "to": "component:pubsub",
  "properties": {}
 },
 {
  "from": "component:client-tracking",
  "type": "DEPENDS_ON",
  "to": "component:networking",
  "properties": {}
 },
 {
  "from": "component:client-tracking",
  "type": "DEPENDS_ON",
  "to": "component:io-threads",
  "properties": {}
 },
 {
  "from": "component:client-tracking",
  "type": "DEPENDS_ON",
  "to": "component:resp-protocol",
  "properties": {}
 },
 {
  "from": "component:client-tracking",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "config:tracking-table-max-keys",
  "type": "CONFIGURES",
  "to": "component:client-tracking",
  "properties": {}
 },
 {
  "from": "component:blocked-clients",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:blocked-clients",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:blocked-clients",
  "type": "DEPENDS_ON",
  "to": "component:event-loop",
  "properties": {}
 },
 {
  "from": "component:blocked-clients",
  "type": "DEPENDS_ON",
  "to": "component:dict",
  "properties": {}
 },
 {
  "from": "component:blocked-clients",
  "type": "DEPENDS_ON",
  "to": "component:rax",
  "properties": {}
 },
 {
  "from": "component:blocked-clients",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:blocked-clients",
  "type": "DEPENDS_ON",
  "to": "component:cluster-core",
  "properties": {}
 },
 {
  "from": "component:blocked-clients",
  "type": "DEPENDS_ON",
  "to": "component:latency-monitor",
  "properties": {}
 },
 {
  "from": "component:blocked-clients",
  "type": "DEPENDS_ON",
  "to": "component:slowlog",
  "properties": {}
 },
 {
  "from": "component:blocked-clients",
  "type": "DEPENDS_ON",
  "to": "component:module-system",
  "properties": {}
 },
 {
  "from": "component:transactions",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:transactions",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:transactions",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:transactions",
  "type": "DEPENDS_ON",
  "to": "component:command-table",
  "properties": {}
 },
 {
  "from": "component:transactions",
  "type": "DEPENDS_ON",
  "to": "component:networking",
  "properties": {}
 },
 {
  "from": "component:acl-engine",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:acl-engine",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:acl-engine",
  "type": "DEPENDS_ON",
  "to": "component:rax",
  "properties": {}
 },
 {
  "from": "component:acl-engine",
  "type": "DEPENDS_ON",
  "to": "component:sds",
  "properties": {}
 },
 {
  "from": "component:acl-engine",
  "type": "DEPENDS_ON",
  "to": "component:checksums",
  "properties": {}
 },
 {
  "from": "component:acl-engine",
  "type": "DEPENDS_ON",
  "to": "component:command-table",
  "properties": {}
 },
 {
  "from": "component:acl-engine",
  "type": "DEPENDS_ON",
  "to": "component:pubsub",
  "properties": {}
 },
 {
  "from": "component:acl-engine",
  "type": "DEPENDS_ON",
  "to": "component:config-engine",
  "properties": {}
 },
 {
  "from": "config:aclfile",
  "type": "CONFIGURES",
  "to": "component:acl-engine",
  "properties": {}
 },
 {
  "from": "component:slowlog",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:slowlog",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:slowlog",
  "type": "DEPENDS_ON",
  "to": "component:adlist",
  "properties": {}
 },
 {
  "from": "component:slowlog",
  "type": "DEPENDS_ON",
  "to": "component:sds",
  "properties": {}
 },
 {
  "from": "component:slowlog",
  "type": "DEPENDS_ON",
  "to": "component:networking",
  "properties": {}
 },
 {
  "from": "config:slowlog-log-slower-than",
  "type": "CONFIGURES",
  "to": "component:slowlog",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "EXPOSES",
  "to": "interface:keyspace-events",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:keyspace-notifications",
  "properties": {}
 },
 {
  "from": "feature:keyspace-notifications",
  "type": "IMPLEMENTED_IN",
  "to": "component:keyspace-notifications",
  "properties": {}
 },
 {
  "from": "feature:keyspace-notifications",
  "type": "IMPLEMENTED_IN",
  "to": "component:pubsub",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:client-side-caching",
  "properties": {}
 },
 {
  "from": "feature:client-side-caching",
  "type": "IMPLEMENTED_IN",
  "to": "component:client-tracking",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:access-control",
  "properties": {}
 },
 {
  "from": "feature:access-control",
  "type": "IMPLEMENTED_IN",
  "to": "component:acl-engine",
  "properties": {}
 },
 {
  "from": "decision:unblocked-clients-beforesleep",
  "type": "AFFECTS",
  "to": "component:blocked-clients",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:resp2-invalidation-via-redirect-only",
  "type": "AFFECTS",
  "to": "component:client-tracking",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:resp2-invalidation-via-redirect-only",
  "type": "AFFECTS",
  "to": "feature:client-side-caching",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "component:cluster-core",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:cluster-core",
  "type": "DEPENDS_ON",
  "to": "component:cluster-bus",
  "properties": {}
 },
 {
  "from": "component:cluster-core",
  "type": "DEPENDS_ON",
  "to": "component:atomic-slot-migration",
  "properties": {}
 },
 {
  "from": "component:cluster-core",
  "type": "DEPENDS_ON",
  "to": "component:cluster-slot-stats",
  "properties": {}
 },
 {
  "from": "component:cluster-core",
  "type": "DEPENDS_ON",
  "to": "component:checksums",
  "properties": {}
 },
 {
  "from": "component:cluster-core",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:cluster-core",
  "type": "DEPENDS_ON",
  "to": "component:kvstore",
  "properties": {}
 },
 {
  "from": "component:cluster-core",
  "type": "DEPENDS_ON",
  "to": "component:networking",
  "properties": {}
 },
 {
  "from": "component:cluster-core",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "config:cluster-enabled",
  "type": "CONFIGURES",
  "to": "component:cluster-core",
  "properties": {}
 },
 {
  "from": "component:cluster-bus",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:cluster-bus",
  "type": "DEPENDS_ON",
  "to": "component:cluster-core",
  "properties": {}
 },
 {
  "from": "component:cluster-bus",
  "type": "DEPENDS_ON",
  "to": "component:connection-layer",
  "properties": {}
 },
 {
  "from": "component:cluster-bus",
  "type": "DEPENDS_ON",
  "to": "component:tls-layer",
  "properties": {}
 },
 {
  "from": "component:cluster-bus",
  "type": "DEPENDS_ON",
  "to": "component:event-loop",
  "properties": {}
 },
 {
  "from": "component:cluster-bus",
  "type": "DEPENDS_ON",
  "to": "component:dict",
  "properties": {}
 },
 {
  "from": "component:cluster-bus",
  "type": "DEPENDS_ON",
  "to": "component:sds",
  "properties": {}
 },
 {
  "from": "component:cluster-bus",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:cluster-bus",
  "type": "USES_ADAPTER",
  "to": "adapter:openssl-tls",
  "properties": {}
 },
 {
  "from": "component:cluster-bus",
  "type": "IMPLEMENTS",
  "to": "interface:cluster-bus-protocol",
  "properties": {}
 },
 {
  "from": "config:cluster-node-timeout",
  "type": "CONFIGURES",
  "to": "component:cluster-bus",
  "properties": {}
 },
 {
  "from": "component:atomic-slot-migration",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:atomic-slot-migration",
  "type": "DEPENDS_ON",
  "to": "component:cluster-core",
  "properties": {}
 },
 {
  "from": "component:atomic-slot-migration",
  "type": "DEPENDS_ON",
  "to": "component:cluster-bus",
  "properties": {}
 },
 {
  "from": "component:atomic-slot-migration",
  "type": "DEPENDS_ON",
  "to": "component:replication-core",
  "properties": {}
 },
 {
  "from": "component:atomic-slot-migration",
  "type": "DEPENDS_ON",
  "to": "component:background-io",
  "properties": {}
 },
 {
  "from": "component:atomic-slot-migration",
  "type": "DEPENDS_ON",
  "to": "component:rdb-persistence",
  "properties": {}
 },
 {
  "from": "component:atomic-slot-migration",
  "type": "DEPENDS_ON",
  "to": "component:module-system",
  "properties": {}
 },
 {
  "from": "component:atomic-slot-migration",
  "type": "DEPENDS_ON",
  "to": "component:connection-layer",
  "properties": {}
 },
 {
  "from": "config:cluster-slot-migration-handoff-max-lag-bytes",
  "type": "CONFIGURES",
  "to": "component:atomic-slot-migration",
  "properties": {}
 },
 {
  "from": "component:cluster-slot-stats",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:cluster-slot-stats",
  "type": "DEPENDS_ON",
  "to": "component:cluster-core",
  "properties": {}
 },
 {
  "from": "component:cluster-slot-stats",
  "type": "DEPENDS_ON",
  "to": "component:cluster-bus",
  "properties": {}
 },
 {
  "from": "component:cluster-slot-stats",
  "type": "DEPENDS_ON",
  "to": "component:kvstore",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "EXPOSES",
  "to": "interface:cluster-bus-protocol",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:cluster-failover",
  "properties": {}
 },
 {
  "from": "feature:cluster-failover",
  "type": "IMPLEMENTED_IN",
  "to": "component:cluster-bus",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:atomic-slot-migration-feature",
  "properties": {}
 },
 {
  "from": "feature:atomic-slot-migration-feature",
  "type": "IMPLEMENTED_IN",
  "to": "component:atomic-slot-migration",
  "properties": {}
 },
 {
  "from": "feature:atomic-slot-migration-feature",
  "type": "IMPLEMENTED_IN",
  "to": "component:cluster-core",
  "properties": {}
 },
 {
  "from": "decision:crc16-16384-slots",
  "type": "AFFECTS",
  "to": "component:cluster-core",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:gossip-fanout-tenth",
  "type": "AFFECTS",
  "to": "component:cluster-bus",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:gossip-fanout-tenth",
  "type": "AFFECTS",
  "to": "feature:cluster-failover",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "component:server-core",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:server-core",
  "type": "DEPENDS_ON",
  "to": "component:event-loop",
  "properties": {}
 },
 {
  "from": "component:server-core",
  "type": "DEPENDS_ON",
  "to": "component:networking",
  "properties": {}
 },
 {
  "from": "component:server-core",
  "type": "DEPENDS_ON",
  "to": "component:command-table",
  "properties": {}
 },
 {
  "from": "component:server-core",
  "type": "DEPENDS_ON",
  "to": "component:config-engine",
  "properties": {}
 },
 {
  "from": "component:server-core",
  "type": "DEPENDS_ON",
  "to": "component:connection-layer",
  "properties": {}
 },
 {
  "from": "component:server-core",
  "type": "DEPENDS_ON",
  "to": "component:io-threads",
  "properties": {}
 },
 {
  "from": "component:server-core",
  "type": "DEPENDS_ON",
  "to": "component:background-io",
  "properties": {}
 },
 {
  "from": "component:server-core",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:server-core",
  "type": "DEPENDS_ON",
  "to": "component:object-system",
  "properties": {}
 },
 {
  "from": "component:server-core",
  "type": "DEPENDS_ON",
  "to": "component:expire-cycle",
  "properties": {}
 },
 {
  "from": "component:server-core",
  "type": "DEPENDS_ON",
  "to": "component:eviction",
  "properties": {}
 },
 {
  "from": "component:server-core",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "config:hz",
  "type": "CONFIGURES",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:event-loop",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:event-loop",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:event-loop",
  "type": "USES_ADAPTER",
  "to": "adapter:ae-epoll",
  "properties": {}
 },
 {
  "from": "component:event-loop",
  "type": "USES_ADAPTER",
  "to": "adapter:ae-kqueue",
  "properties": {}
 },
 {
  "from": "component:event-loop",
  "type": "USES_ADAPTER",
  "to": "adapter:ae-select",
  "properties": {}
 },
 {
  "from": "component:event-loop",
  "type": "USES_ADAPTER",
  "to": "adapter:ae-evport",
  "properties": {}
 },
 {
  "from": "component:networking",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:networking",
  "type": "DEPENDS_ON",
  "to": "component:connection-layer",
  "properties": {}
 },
 {
  "from": "component:networking",
  "type": "DEPENDS_ON",
  "to": "component:event-loop",
  "properties": {}
 },
 {
  "from": "component:networking",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:networking",
  "type": "DEPENDS_ON",
  "to": "component:io-threads",
  "properties": {}
 },
 {
  "from": "component:networking",
  "type": "DEPENDS_ON",
  "to": "component:sds",
  "properties": {}
 },
 {
  "from": "component:networking",
  "type": "DEPENDS_ON",
  "to": "component:adlist",
  "properties": {}
 },
 {
  "from": "component:networking",
  "type": "IMPLEMENTS",
  "to": "interface:resp3",
  "properties": {}
 },
 {
  "from": "config:client-output-buffer-limit",
  "type": "CONFIGURES",
  "to": "component:networking",
  "properties": {}
 },
 {
  "from": "component:connection-layer",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:connection-layer",
  "type": "DEPENDS_ON",
  "to": "component:event-loop",
  "properties": {}
 },
 {
  "from": "component:tls-layer",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:tls-layer",
  "type": "DEPENDS_ON",
  "to": "component:connection-layer",
  "properties": {}
 },
 {
  "from": "component:tls-layer",
  "type": "DEPENDS_ON",
  "to": "component:event-loop",
  "properties": {}
 },
 {
  "from": "component:tls-layer",
  "type": "DEPENDS_ON",
  "to": "component:config-engine",
  "properties": {}
 },
 {
  "from": "component:tls-layer",
  "type": "USES_ADAPTER",
  "to": "adapter:openssl-tls",
  "properties": {}
 },
 {
  "from": "config:tls-port",
  "type": "CONFIGURES",
  "to": "component:tls-layer",
  "properties": {}
 },
 {
  "from": "component:io-threads",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:io-threads",
  "type": "DEPENDS_ON",
  "to": "component:event-loop",
  "properties": {}
 },
 {
  "from": "component:io-threads",
  "type": "DEPENDS_ON",
  "to": "component:networking",
  "properties": {}
 },
 {
  "from": "component:io-threads",
  "type": "DEPENDS_ON",
  "to": "component:connection-layer",
  "properties": {}
 },
 {
  "from": "component:io-threads",
  "type": "DEPENDS_ON",
  "to": "component:memory-prefetch",
  "properties": {}
 },
 {
  "from": "component:io-threads",
  "type": "DEPENDS_ON",
  "to": "component:repl-compression",
  "properties": {}
 },
 {
  "from": "config:io-threads",
  "type": "CONFIGURES",
  "to": "component:io-threads",
  "properties": {}
 },
 {
  "from": "component:resp-protocol",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:resp-protocol",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:resp-protocol",
  "type": "DEPENDS_ON",
  "to": "component:sds",
  "properties": {}
 },
 {
  "from": "component:resp-protocol",
  "type": "IMPLEMENTS",
  "to": "interface:resp3",
  "properties": {}
 },
 {
  "from": "component:command-table",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:command-table",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:command-table",
  "type": "DEPENDS_ON",
  "to": "component:acl-engine",
  "properties": {}
 },
 {
  "from": "component:config-engine",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:config-engine",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:config-engine",
  "type": "DEPENDS_ON",
  "to": "component:sds",
  "properties": {}
 },
 {
  "from": "component:config-engine",
  "type": "DEPENDS_ON",
  "to": "component:background-io",
  "properties": {}
 },
 {
  "from": "component:background-io",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:background-io",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:background-io",
  "type": "DEPENDS_ON",
  "to": "component:lazyfree",
  "properties": {}
 },
 {
  "from": "component:background-io",
  "type": "DEPENDS_ON",
  "to": "component:aof-persistence",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "EXPOSES",
  "to": "interface:resp3",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:threaded-io",
  "properties": {}
 },
 {
  "from": "feature:threaded-io",
  "type": "IMPLEMENTED_IN",
  "to": "component:io-threads",
  "properties": {}
 },
 {
  "from": "feature:threaded-io",
  "type": "IMPLEMENTED_IN",
  "to": "component:networking",
  "properties": {}
 },
 {
  "from": "feature:threaded-io",
  "type": "IMPLEMENTED_IN",
  "to": "component:event-loop",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:tls-support",
  "properties": {}
 },
 {
  "from": "feature:tls-support",
  "type": "IMPLEMENTED_IN",
  "to": "component:tls-layer",
  "properties": {}
 },
 {
  "from": "feature:tls-support",
  "type": "IMPLEMENTED_IN",
  "to": "component:connection-layer",
  "properties": {}
 },
 {
  "from": "decision:compile-time-multiplexer-selection",
  "type": "AFFECTS",
  "to": "component:event-loop",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:connection-type-vtable",
  "type": "AFFECTS",
  "to": "component:connection-layer",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:connection-type-vtable",
  "type": "AFFECTS",
  "to": "component:tls-layer",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:connection-type-vtable",
  "type": "AFFECTS",
  "to": "component:networking",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:json-generated-command-table",
  "type": "AFFECTS",
  "to": "component:command-table",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:resp-parser-trusted-input-only",
  "type": "AFFECTS",
  "to": "component:resp-protocol",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "document:redis-conf-reference",
  "type": "DOCUMENTS",
  "to": "component:config-engine",
  "properties": {}
 },
 {
  "from": "document:redis-conf-reference",
  "type": "DOCUMENTS",
  "to": "component:io-threads",
  "properties": {}
 },
 {
  "from": "document:redis-conf-reference",
  "type": "DOCUMENTS",
  "to": "component:tls-layer",
  "properties": {}
 },
 {
  "from": "document:redis-conf-reference",
  "type": "DOCUMENTS",
  "to": "component:networking",
  "properties": {}
 },
 {
  "from": "component:object-system",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:object-system",
  "type": "DEPENDS_ON",
  "to": "component:sds",
  "properties": {}
 },
 {
  "from": "component:object-system",
  "type": "DEPENDS_ON",
  "to": "component:dict",
  "properties": {}
 },
 {
  "from": "component:object-system",
  "type": "DEPENDS_ON",
  "to": "component:listpack",
  "properties": {}
 },
 {
  "from": "component:object-system",
  "type": "DEPENDS_ON",
  "to": "component:quicklist",
  "properties": {}
 },
 {
  "from": "component:object-system",
  "type": "DEPENDS_ON",
  "to": "component:intset",
  "properties": {}
 },
 {
  "from": "component:object-system",
  "type": "DEPENDS_ON",
  "to": "component:key-metadata",
  "properties": {}
 },
 {
  "from": "component:keyspace",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:keyspace",
  "type": "DEPENDS_ON",
  "to": "component:kvstore",
  "properties": {}
 },
 {
  "from": "component:keyspace",
  "type": "DEPENDS_ON",
  "to": "component:dict",
  "properties": {}
 },
 {
  "from": "component:keyspace",
  "type": "DEPENDS_ON",
  "to": "component:object-system",
  "properties": {}
 },
 {
  "from": "component:keyspace",
  "type": "DEPENDS_ON",
  "to": "component:expiration-store",
  "properties": {}
 },
 {
  "from": "component:keyspace",
  "type": "DEPENDS_ON",
  "to": "component:key-metadata",
  "properties": {}
 },
 {
  "from": "component:keyspace",
  "type": "DEPENDS_ON",
  "to": "component:lazyfree",
  "properties": {}
 },
 {
  "from": "component:keyspace",
  "type": "DEPENDS_ON",
  "to": "component:keyspace-notifications",
  "properties": {}
 },
 {
  "from": "component:keyspace",
  "type": "DEPENDS_ON",
  "to": "component:cluster-core",
  "properties": {}
 },
 {
  "from": "component:string-type",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:string-type",
  "type": "DEPENDS_ON",
  "to": "component:object-system",
  "properties": {}
 },
 {
  "from": "component:string-type",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:string-type",
  "type": "DEPENDS_ON",
  "to": "component:sds",
  "properties": {}
 },
 {
  "from": "component:string-type",
  "type": "USES",
  "to": "dependency:xxhash",
  "properties": {}
 },
 {
  "from": "component:list-type",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:list-type",
  "type": "DEPENDS_ON",
  "to": "component:listpack",
  "properties": {}
 },
 {
  "from": "component:list-type",
  "type": "DEPENDS_ON",
  "to": "component:quicklist",
  "properties": {}
 },
 {
  "from": "component:list-type",
  "type": "DEPENDS_ON",
  "to": "component:object-system",
  "properties": {}
 },
 {
  "from": "component:list-type",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:list-type",
  "type": "DEPENDS_ON",
  "to": "component:blocked-clients",
  "properties": {}
 },
 {
  "from": "component:set-type",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:set-type",
  "type": "DEPENDS_ON",
  "to": "component:intset",
  "properties": {}
 },
 {
  "from": "component:set-type",
  "type": "DEPENDS_ON",
  "to": "component:listpack",
  "properties": {}
 },
 {
  "from": "component:set-type",
  "type": "DEPENDS_ON",
  "to": "component:dict",
  "properties": {}
 },
 {
  "from": "component:set-type",
  "type": "DEPENDS_ON",
  "to": "component:object-system",
  "properties": {}
 },
 {
  "from": "component:set-type",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:hash-type",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:hash-type",
  "type": "DEPENDS_ON",
  "to": "component:listpack",
  "properties": {}
 },
 {
  "from": "component:hash-type",
  "type": "DEPENDS_ON",
  "to": "component:dict",
  "properties": {}
 },
 {
  "from": "component:hash-type",
  "type": "DEPENDS_ON",
  "to": "component:ebuckets",
  "properties": {}
 },
 {
  "from": "component:hash-type",
  "type": "DEPENDS_ON",
  "to": "component:key-metadata",
  "properties": {}
 },
 {
  "from": "component:hash-type",
  "type": "DEPENDS_ON",
  "to": "component:expiration-store",
  "properties": {}
 },
 {
  "from": "component:hash-type",
  "type": "DEPENDS_ON",
  "to": "component:object-system",
  "properties": {}
 },
 {
  "from": "component:hash-type",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:hash-type",
  "type": "DEPENDS_ON",
  "to": "component:keyspace-notifications",
  "properties": {}
 },
 {
  "from": "config:hash-max-listpack-entries",
  "type": "CONFIGURES",
  "to": "component:hash-type",
  "properties": {}
 },
 {
  "from": "component:zset-type",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:zset-type",
  "type": "DEPENDS_ON",
  "to": "component:listpack",
  "properties": {}
 },
 {
  "from": "component:zset-type",
  "type": "DEPENDS_ON",
  "to": "component:dict",
  "properties": {}
 },
 {
  "from": "component:zset-type",
  "type": "DEPENDS_ON",
  "to": "component:intset",
  "properties": {}
 },
 {
  "from": "component:zset-type",
  "type": "DEPENDS_ON",
  "to": "component:object-system",
  "properties": {}
 },
 {
  "from": "component:zset-type",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:zset-type",
  "type": "DEPENDS_ON",
  "to": "component:blocked-clients",
  "properties": {}
 },
 {
  "from": "component:zset-type",
  "type": "USES",
  "to": "dependency:fast_float",
  "properties": {}
 },
 {
  "from": "config:zset-max-listpack-entries",
  "type": "CONFIGURES",
  "to": "component:zset-type",
  "properties": {}
 },
 {
  "from": "component:bitops",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:bitops",
  "type": "DEPENDS_ON",
  "to": "component:string-type",
  "properties": {}
 },
 {
  "from": "component:bitops",
  "type": "DEPENDS_ON",
  "to": "component:object-system",
  "properties": {}
 },
 {
  "from": "component:bitops",
  "type": "DEPENDS_ON",
  "to": "component:sds",
  "properties": {}
 },
 {
  "from": "component:bitops",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:hyperloglog",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:hyperloglog",
  "type": "DEPENDS_ON",
  "to": "component:string-type",
  "properties": {}
 },
 {
  "from": "component:hyperloglog",
  "type": "DEPENDS_ON",
  "to": "component:sds",
  "properties": {}
 },
 {
  "from": "component:hyperloglog",
  "type": "DEPENDS_ON",
  "to": "component:object-system",
  "properties": {}
 },
 {
  "from": "component:hyperloglog",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:geo-index",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:geo-index",
  "type": "DEPENDS_ON",
  "to": "component:zset-type",
  "properties": {}
 },
 {
  "from": "component:geo-index",
  "type": "DEPENDS_ON",
  "to": "component:object-system",
  "properties": {}
 },
 {
  "from": "component:geo-index",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:sort-engine",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:sort-engine",
  "type": "DEPENDS_ON",
  "to": "component:list-type",
  "properties": {}
 },
 {
  "from": "component:sort-engine",
  "type": "DEPENDS_ON",
  "to": "component:set-type",
  "properties": {}
 },
 {
  "from": "component:sort-engine",
  "type": "DEPENDS_ON",
  "to": "component:zset-type",
  "properties": {}
 },
 {
  "from": "component:sort-engine",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:sort-engine",
  "type": "DEPENDS_ON",
  "to": "component:cluster-core",
  "properties": {}
 },
 {
  "from": "component:sort-engine",
  "type": "USES",
  "to": "dependency:fast_float",
  "properties": {}
 },
 {
  "from": "component:expire-cycle",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:expire-cycle",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:expire-cycle",
  "type": "DEPENDS_ON",
  "to": "component:expiration-store",
  "properties": {}
 },
 {
  "from": "component:expire-cycle",
  "type": "DEPENDS_ON",
  "to": "component:hash-type",
  "properties": {}
 },
 {
  "from": "component:expire-cycle",
  "type": "DEPENDS_ON",
  "to": "component:lazyfree",
  "properties": {}
 },
 {
  "from": "component:expire-cycle",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "config:active-expire-effort",
  "type": "CONFIGURES",
  "to": "component:expire-cycle",
  "properties": {}
 },
 {
  "from": "component:expiration-store",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:expiration-store",
  "type": "DEPENDS_ON",
  "to": "component:ebuckets",
  "properties": {}
 },
 {
  "from": "component:expiration-store",
  "type": "DEPENDS_ON",
  "to": "component:fenwick-tree",
  "properties": {}
 },
 {
  "from": "component:expiration-store",
  "type": "DEPENDS_ON",
  "to": "component:atomic-slot-migration",
  "properties": {}
 },
 {
  "from": "component:key-metadata",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:key-metadata",
  "type": "DEPENDS_ON",
  "to": "component:object-system",
  "properties": {}
 },
 {
  "from": "component:key-metadata",
  "type": "DEPENDS_ON",
  "to": "component:sds",
  "properties": {}
 },
 {
  "from": "component:key-metadata",
  "type": "DEPENDS_ON",
  "to": "component:module-system",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:hash-field-ttl",
  "properties": {}
 },
 {
  "from": "feature:hash-field-ttl",
  "type": "IMPLEMENTED_IN",
  "to": "component:hash-type",
  "properties": {}
 },
 {
  "from": "feature:hash-field-ttl",
  "type": "IMPLEMENTED_IN",
  "to": "component:expiration-store",
  "properties": {}
 },
 {
  "from": "feature:hash-field-ttl",
  "type": "IMPLEMENTED_IN",
  "to": "component:expire-cycle",
  "properties": {}
 },
 {
  "from": "feature:hash-field-ttl",
  "type": "IMPLEMENTED_IN",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:hash-templates",
  "properties": {}
 },
 {
  "from": "feature:hash-templates",
  "type": "IMPLEMENTED_IN",
  "to": "component:hash-type",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:conditional-set",
  "properties": {}
 },
 {
  "from": "feature:conditional-set",
  "type": "IMPLEMENTED_IN",
  "to": "component:string-type",
  "properties": {}
 },
 {
  "from": "decision:zset-dual-structure",
  "type": "AFFECTS",
  "to": "component:zset-type",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:hll-as-string",
  "type": "AFFECTS",
  "to": "component:hyperloglog",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:hll-as-string",
  "type": "AFFECTS",
  "to": "component:string-type",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:kvobj-embedded-key-metadata",
  "type": "AFFECTS",
  "to": "component:object-system",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:kvobj-embedded-key-metadata",
  "type": "AFFECTS",
  "to": "component:key-metadata",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:kvobj-embedded-key-metadata",
  "type": "AFFECTS",
  "to": "component:keyspace",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:hfe-two-level-expiry",
  "type": "AFFECTS",
  "to": "component:hash-type",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:hfe-two-level-expiry",
  "type": "AFFECTS",
  "to": "component:expiration-store",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:hfe-two-level-expiry",
  "type": "AFFECTS",
  "to": "component:expire-cycle",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:hfe-two-level-expiry",
  "type": "AFFECTS",
  "to": "feature:hash-field-ttl",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "component:sds",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:sds",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:dict",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:dict",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:dict",
  "type": "DEPENDS_ON",
  "to": "component:checksums",
  "properties": {}
 },
 {
  "from": "component:kvstore",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:kvstore",
  "type": "DEPENDS_ON",
  "to": "component:dict",
  "properties": {}
 },
 {
  "from": "component:kvstore",
  "type": "DEPENDS_ON",
  "to": "component:fenwick-tree",
  "properties": {}
 },
 {
  "from": "component:kvstore",
  "type": "DEPENDS_ON",
  "to": "component:adlist",
  "properties": {}
 },
 {
  "from": "component:kvstore",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:adlist",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:adlist",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:quicklist",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:quicklist",
  "type": "DEPENDS_ON",
  "to": "component:listpack",
  "properties": {}
 },
 {
  "from": "component:quicklist",
  "type": "DEPENDS_ON",
  "to": "component:lzf-compression",
  "properties": {}
 },
 {
  "from": "component:quicklist",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:listpack",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:listpack",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:ziplist-legacy",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:ziplist-legacy",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:ziplist-legacy",
  "type": "DEPENDS_ON",
  "to": "component:listpack",
  "properties": {}
 },
 {
  "from": "component:rax",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:rax",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:intset",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:intset",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:ebuckets",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:ebuckets",
  "type": "DEPENDS_ON",
  "to": "component:rax",
  "properties": {}
 },
 {
  "from": "component:ebuckets",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:mstr",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:mstr",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:sparse-array",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:sparse-array",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:sparse-array",
  "type": "USES",
  "to": "dependency:tre",
  "properties": {}
 },
 {
  "from": "component:fenwick-tree",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:fenwick-tree",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:topk-sketch",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:topk-sketch",
  "type": "DEPENDS_ON",
  "to": "component:sds",
  "properties": {}
 },
 {
  "from": "component:topk-sketch",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:topk-sketch",
  "type": "USES",
  "to": "dependency:xxhash",
  "properties": {}
 },
 {
  "from": "component:vector-util",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:vector-util",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:lzf-compression",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:checksums",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:array-datatype",
  "properties": {}
 },
 {
  "from": "feature:array-datatype",
  "type": "IMPLEMENTED_IN",
  "to": "component:sparse-array",
  "properties": {}
 },
 {
  "from": "decision:siphash12-over-siphash24",
  "type": "AFFECTS",
  "to": "component:checksums",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:siphash12-over-siphash24",
  "type": "AFFECTS",
  "to": "component:dict",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:dict-resize-avoid-during-cow",
  "type": "AFFECTS",
  "to": "component:dict",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:dict-resize-avoid-during-cow",
  "type": "AFFECTS",
  "to": "component:kvstore",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:chk-cuckoo-heavy-keeper-adoption",
  "type": "AFFECTS",
  "to": "component:topk-sketch",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:chk-cuckoo-heavy-keeper-adoption",
  "type": "AFFECTS",
  "to": "component:hotkeys-tracking",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "component:zmalloc-layer",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:zmalloc-layer",
  "type": "USES",
  "to": "dependency:jemalloc",
  "properties": {}
 },
 {
  "from": "component:zmalloc-layer",
  "type": "USES_ADAPTER",
  "to": "adapter:jemalloc-allocator",
  "properties": {}
 },
 {
  "from": "component:eviction",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:eviction",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:eviction",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:eviction",
  "type": "DEPENDS_ON",
  "to": "component:kvstore",
  "properties": {}
 },
 {
  "from": "component:eviction",
  "type": "DEPENDS_ON",
  "to": "component:lazyfree",
  "properties": {}
 },
 {
  "from": "component:eviction",
  "type": "DEPENDS_ON",
  "to": "component:latency-monitor",
  "properties": {}
 },
 {
  "from": "component:eviction",
  "type": "DEPENDS_ON",
  "to": "component:atomic-slot-migration",
  "properties": {}
 },
 {
  "from": "component:eviction",
  "type": "DEPENDS_ON",
  "to": "component:event-loop",
  "properties": {}
 },
 {
  "from": "config:maxmemory",
  "type": "CONFIGURES",
  "to": "component:eviction",
  "properties": {}
 },
 {
  "from": "config:maxmemory-policy",
  "type": "CONFIGURES",
  "to": "component:eviction",
  "properties": {}
 },
 {
  "from": "config:lazyfree-lazy-eviction",
  "type": "CONFIGURES",
  "to": "component:eviction",
  "properties": {}
 },
 {
  "from": "component:defrag",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:defrag",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:defrag",
  "type": "DEPENDS_ON",
  "to": "component:kvstore",
  "properties": {}
 },
 {
  "from": "component:defrag",
  "type": "DEPENDS_ON",
  "to": "component:dict",
  "properties": {}
 },
 {
  "from": "component:defrag",
  "type": "DEPENDS_ON",
  "to": "component:event-loop",
  "properties": {}
 },
 {
  "from": "component:defrag",
  "type": "DEPENDS_ON",
  "to": "component:module-system",
  "properties": {}
 },
 {
  "from": "component:defrag",
  "type": "DEPENDS_ON",
  "to": "component:eval-scripts",
  "properties": {}
 },
 {
  "from": "component:defrag",
  "type": "USES",
  "to": "dependency:jemalloc",
  "properties": {}
 },
 {
  "from": "component:defrag",
  "type": "USES_ADAPTER",
  "to": "adapter:jemalloc-allocator",
  "properties": {}
 },
 {
  "from": "config:activedefrag",
  "type": "CONFIGURES",
  "to": "component:defrag",
  "properties": {}
 },
 {
  "from": "component:lazyfree",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:lazyfree",
  "type": "DEPENDS_ON",
  "to": "component:background-io",
  "properties": {}
 },
 {
  "from": "component:lazyfree",
  "type": "DEPENDS_ON",
  "to": "component:object-system",
  "properties": {}
 },
 {
  "from": "component:lazyfree",
  "type": "DEPENDS_ON",
  "to": "component:kvstore",
  "properties": {}
 },
 {
  "from": "component:lazyfree",
  "type": "DEPENDS_ON",
  "to": "component:expiration-store",
  "properties": {}
 },
 {
  "from": "component:lazyfree",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:lazyfree",
  "type": "DEPENDS_ON",
  "to": "component:atomic-slot-migration",
  "properties": {}
 },
 {
  "from": "component:lazyfree",
  "type": "USES_ADAPTER",
  "to": "adapter:jemalloc-allocator",
  "properties": {}
 },
 {
  "from": "config:lazyfree-lazy-eviction",
  "type": "CONFIGURES",
  "to": "component:lazyfree",
  "properties": {}
 },
 {
  "from": "component:memory-prefetch",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:memory-prefetch",
  "type": "DEPENDS_ON",
  "to": "component:dict",
  "properties": {}
 },
 {
  "from": "component:memory-prefetch",
  "type": "DEPENDS_ON",
  "to": "component:io-threads",
  "properties": {}
 },
 {
  "from": "component:memory-prefetch",
  "type": "DEPENDS_ON",
  "to": "component:networking",
  "properties": {}
 },
 {
  "from": "component:memory-prefetch",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:hotkeys-tracking",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:hotkeys-tracking",
  "type": "DEPENDS_ON",
  "to": "component:topk-sketch",
  "properties": {}
 },
 {
  "from": "component:hotkeys-tracking",
  "type": "DEPENDS_ON",
  "to": "component:command-table",
  "properties": {}
 },
 {
  "from": "component:hotkeys-tracking",
  "type": "DEPENDS_ON",
  "to": "component:cluster-core",
  "properties": {}
 },
 {
  "from": "component:hotkeys-tracking",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:rate-limiter",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:rate-limiter",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:rate-limiter",
  "type": "DEPENDS_ON",
  "to": "component:object-system",
  "properties": {}
 },
 {
  "from": "component:rate-limiter",
  "type": "DEPENDS_ON",
  "to": "component:keyspace-notifications",
  "properties": {}
 },
 {
  "from": "component:latency-monitor",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:latency-monitor",
  "type": "DEPENDS_ON",
  "to": "component:dict",
  "properties": {}
 },
 {
  "from": "component:latency-monitor",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:latency-monitor",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:latency-monitor",
  "type": "USES",
  "to": "dependency:hdr_histogram",
  "properties": {}
 },
 {
  "from": "config:latency-monitor-threshold",
  "type": "CONFIGURES",
  "to": "component:latency-monitor",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:hotkey-detection",
  "properties": {}
 },
 {
  "from": "feature:hotkey-detection",
  "type": "IMPLEMENTED_IN",
  "to": "component:hotkeys-tracking",
  "properties": {}
 },
 {
  "from": "feature:hotkey-detection",
  "type": "IMPLEMENTED_IN",
  "to": "component:topk-sketch",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:gcra-rate-limiting",
  "properties": {}
 },
 {
  "from": "feature:gcra-rate-limiting",
  "type": "IMPLEMENTED_IN",
  "to": "component:rate-limiter",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:active-defragmentation",
  "properties": {}
 },
 {
  "from": "feature:active-defragmentation",
  "type": "IMPLEMENTED_IN",
  "to": "component:defrag",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:async-memory-reclaim",
  "properties": {}
 },
 {
  "from": "feature:async-memory-reclaim",
  "type": "IMPLEMENTED_IN",
  "to": "component:lazyfree",
  "properties": {}
 },
 {
  "from": "feature:async-memory-reclaim",
  "type": "IMPLEMENTED_IN",
  "to": "component:background-io",
  "properties": {}
 },
 {
  "from": "decision:approximate-lru-eviction-pool",
  "type": "AFFECTS",
  "to": "component:eviction",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:exclude-buffers-from-maxmemory",
  "type": "AFFECTS",
  "to": "component:eviction",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:gcra-deterministic-replication",
  "type": "AFFECTS",
  "to": "component:rate-limiter",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:lazyfree-effort-threshold",
  "type": "AFFECTS",
  "to": "component:lazyfree",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "component:rdb-persistence",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:rdb-persistence",
  "type": "DEPENDS_ON",
  "to": "component:rio-layer",
  "properties": {}
 },
 {
  "from": "component:rdb-persistence",
  "type": "DEPENDS_ON",
  "to": "component:object-system",
  "properties": {}
 },
 {
  "from": "component:rdb-persistence",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:rdb-persistence",
  "type": "DEPENDS_ON",
  "to": "component:lzf-compression",
  "properties": {}
 },
 {
  "from": "component:rdb-persistence",
  "type": "DEPENDS_ON",
  "to": "component:checksums",
  "properties": {}
 },
 {
  "from": "component:rdb-persistence",
  "type": "DEPENDS_ON",
  "to": "component:background-io",
  "properties": {}
 },
 {
  "from": "component:rdb-persistence",
  "type": "DEPENDS_ON",
  "to": "component:module-system",
  "properties": {}
 },
 {
  "from": "component:rdb-persistence",
  "type": "DEPENDS_ON",
  "to": "component:streams-core",
  "properties": {}
 },
 {
  "from": "component:rdb-persistence",
  "type": "DEPENDS_ON",
  "to": "component:replication-core",
  "properties": {}
 },
 {
  "from": "component:rdb-persistence",
  "type": "DEPENDS_ON",
  "to": "component:key-metadata",
  "properties": {}
 },
 {
  "from": "component:rdb-persistence",
  "type": "USES",
  "to": "datastore:rdb-snapshot",
  "properties": {}
 },
 {
  "from": "config:save",
  "type": "CONFIGURES",
  "to": "component:rdb-persistence",
  "properties": {}
 },
 {
  "from": "component:aof-persistence",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:aof-persistence",
  "type": "DEPENDS_ON",
  "to": "component:rio-layer",
  "properties": {}
 },
 {
  "from": "component:aof-persistence",
  "type": "DEPENDS_ON",
  "to": "component:rdb-persistence",
  "properties": {}
 },
 {
  "from": "component:aof-persistence",
  "type": "DEPENDS_ON",
  "to": "component:background-io",
  "properties": {}
 },
 {
  "from": "component:aof-persistence",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:aof-persistence",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:aof-persistence",
  "type": "DEPENDS_ON",
  "to": "component:atomic-slot-migration",
  "properties": {}
 },
 {
  "from": "component:aof-persistence",
  "type": "USES",
  "to": "datastore:aof-log",
  "properties": {}
 },
 {
  "from": "config:appendonly",
  "type": "CONFIGURES",
  "to": "component:aof-persistence",
  "properties": {}
 },
 {
  "from": "config:appendfsync",
  "type": "CONFIGURES",
  "to": "component:aof-persistence",
  "properties": {}
 },
 {
  "from": "config:auto-aof-rewrite-percentage",
  "type": "CONFIGURES",
  "to": "component:aof-persistence",
  "properties": {}
 },
 {
  "from": "config:aof-use-rdb-preamble",
  "type": "CONFIGURES",
  "to": "component:aof-persistence",
  "properties": {}
 },
 {
  "from": "component:rio-layer",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:rio-layer",
  "type": "DEPENDS_ON",
  "to": "component:checksums",
  "properties": {}
 },
 {
  "from": "component:rio-layer",
  "type": "DEPENDS_ON",
  "to": "component:sds",
  "properties": {}
 },
 {
  "from": "component:rio-layer",
  "type": "DEPENDS_ON",
  "to": "component:connection-layer",
  "properties": {}
 },
 {
  "from": "component:persistence-checkers",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:persistence-checkers",
  "type": "DEPENDS_ON",
  "to": "component:rdb-persistence",
  "properties": {}
 },
 {
  "from": "component:persistence-checkers",
  "type": "DEPENDS_ON",
  "to": "component:aof-persistence",
  "properties": {}
 },
 {
  "from": "component:persistence-checkers",
  "type": "DEPENDS_ON",
  "to": "component:rio-layer",
  "properties": {}
 },
 {
  "from": "component:persistence-checkers",
  "type": "USES",
  "to": "datastore:rdb-snapshot",
  "properties": {}
 },
 {
  "from": "component:persistence-checkers",
  "type": "USES",
  "to": "datastore:aof-log",
  "properties": {}
 },
 {
  "from": "component:replication-core",
  "type": "USES",
  "to": "datastore:rdb-snapshot",
  "properties": {}
 },
 {
  "from": "component:aof-persistence",
  "type": "USES",
  "to": "datastore:rdb-snapshot",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:multi-part-aof",
  "properties": {}
 },
 {
  "from": "feature:multi-part-aof",
  "type": "IMPLEMENTED_IN",
  "to": "component:aof-persistence",
  "properties": {}
 },
 {
  "from": "feature:multi-part-aof",
  "type": "IMPLEMENTED_IN",
  "to": "component:persistence-checkers",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:diskless-rdb-sync",
  "properties": {}
 },
 {
  "from": "feature:diskless-rdb-sync",
  "type": "IMPLEMENTED_IN",
  "to": "component:rdb-persistence",
  "properties": {}
 },
 {
  "from": "feature:diskless-rdb-sync",
  "type": "IMPLEMENTED_IN",
  "to": "component:rio-layer",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:backup-command",
  "properties": {}
 },
 {
  "from": "feature:backup-command",
  "type": "IMPLEMENTED_IN",
  "to": "component:aof-persistence",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:aof-point-in-time-truncate",
  "properties": {}
 },
 {
  "from": "feature:aof-point-in-time-truncate",
  "type": "IMPLEMENTED_IN",
  "to": "component:aof-persistence",
  "properties": {}
 },
 {
  "from": "feature:aof-point-in-time-truncate",
  "type": "IMPLEMENTED_IN",
  "to": "component:persistence-checkers",
  "properties": {}
 },
 {
  "from": "decision:mpaof-base-incr-history",
  "type": "AFFECTS",
  "to": "component:aof-persistence",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:mpaof-base-incr-history",
  "type": "AFFECTS",
  "to": "feature:multi-part-aof",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:everysec-fsync-on-bio-thread",
  "type": "AFFECTS",
  "to": "component:aof-persistence",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:diskless-eof-mark-framing",
  "type": "AFFECTS",
  "to": "component:rdb-persistence",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:diskless-eof-mark-framing",
  "type": "AFFECTS",
  "to": "feature:diskless-rdb-sync",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "component:replication-core",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:replication-core",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:replication-core",
  "type": "DEPENDS_ON",
  "to": "component:networking",
  "properties": {}
 },
 {
  "from": "component:replication-core",
  "type": "DEPENDS_ON",
  "to": "component:connection-layer",
  "properties": {}
 },
 {
  "from": "component:replication-core",
  "type": "DEPENDS_ON",
  "to": "component:sync-io",
  "properties": {}
 },
 {
  "from": "component:replication-core",
  "type": "DEPENDS_ON",
  "to": "component:repl-compression",
  "properties": {}
 },
 {
  "from": "component:replication-core",
  "type": "DEPENDS_ON",
  "to": "component:rdb-persistence",
  "properties": {}
 },
 {
  "from": "component:replication-core",
  "type": "DEPENDS_ON",
  "to": "component:background-io",
  "properties": {}
 },
 {
  "from": "component:replication-core",
  "type": "DEPENDS_ON",
  "to": "component:io-threads",
  "properties": {}
 },
 {
  "from": "component:replication-core",
  "type": "DEPENDS_ON",
  "to": "component:rax",
  "properties": {}
 },
 {
  "from": "component:replication-core",
  "type": "IMPLEMENTS",
  "to": "interface:psync2",
  "properties": {}
 },
 {
  "from": "config:repl-diskless-sync",
  "type": "CONFIGURES",
  "to": "component:replication-core",
  "properties": {}
 },
 {
  "from": "config:repl-diskless-load",
  "type": "CONFIGURES",
  "to": "component:replication-core",
  "properties": {}
 },
 {
  "from": "config:repl-backlog-size",
  "type": "CONFIGURES",
  "to": "component:replication-core",
  "properties": {}
 },
 {
  "from": "component:sync-io",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:sync-io",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:sync-io",
  "type": "DEPENDS_ON",
  "to": "component:event-loop",
  "properties": {}
 },
 {
  "from": "component:repl-compression",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:repl-compression",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:repl-compression",
  "type": "DEPENDS_ON",
  "to": "component:networking",
  "properties": {}
 },
 {
  "from": "component:repl-compression",
  "type": "DEPENDS_ON",
  "to": "component:io-threads",
  "properties": {}
 },
 {
  "from": "component:repl-compression",
  "type": "DEPENDS_ON",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "component:repl-compression",
  "type": "USES",
  "to": "dependency:zstd",
  "properties": {}
 },
 {
  "from": "component:repl-compression",
  "type": "USES_ADAPTER",
  "to": "adapter:zstd-compression",
  "properties": {}
 },
 {
  "from": "config:repl-compression",
  "type": "CONFIGURES",
  "to": "component:repl-compression",
  "properties": {}
 },
 {
  "from": "config:repl-compression-max-latency",
  "type": "CONFIGURES",
  "to": "component:repl-compression",
  "properties": {}
 },
 {
  "from": "component:sentinel-core",
  "type": "PART_OF",
  "to": "service:redis-sentinel",
  "properties": {}
 },
 {
  "from": "component:sentinel-core",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:sentinel-core",
  "type": "DEPENDS_ON",
  "to": "component:event-loop",
  "properties": {}
 },
 {
  "from": "component:sentinel-core",
  "type": "DEPENDS_ON",
  "to": "component:replication-core",
  "properties": {}
 },
 {
  "from": "component:sentinel-core",
  "type": "DEPENDS_ON",
  "to": "component:pubsub",
  "properties": {}
 },
 {
  "from": "component:sentinel-core",
  "type": "DEPENDS_ON",
  "to": "component:tls-layer",
  "properties": {}
 },
 {
  "from": "component:sentinel-core",
  "type": "USES",
  "to": "dependency:hiredis",
  "properties": {}
 },
 {
  "from": "component:sentinel-core",
  "type": "USES_ADAPTER",
  "to": "adapter:openssl-tls",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "EXPOSES",
  "to": "interface:psync2",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:psync2-partial-resync",
  "properties": {}
 },
 {
  "from": "feature:psync2-partial-resync",
  "type": "IMPLEMENTED_IN",
  "to": "component:replication-core",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:rdb-channel-full-sync",
  "properties": {}
 },
 {
  "from": "feature:rdb-channel-full-sync",
  "type": "IMPLEMENTED_IN",
  "to": "component:replication-core",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:replication-zstd-compression",
  "properties": {}
 },
 {
  "from": "feature:replication-zstd-compression",
  "type": "IMPLEMENTED_IN",
  "to": "component:repl-compression",
  "properties": {}
 },
 {
  "from": "feature:replication-zstd-compression",
  "type": "IMPLEMENTED_IN",
  "to": "component:replication-core",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:wait-synchronous-replication",
  "properties": {}
 },
 {
  "from": "feature:wait-synchronous-replication",
  "type": "IMPLEMENTED_IN",
  "to": "component:replication-core",
  "properties": {}
 },
 {
  "from": "service:redis-sentinel",
  "type": "PROVIDES",
  "to": "feature:sentinel-automatic-failover",
  "properties": {}
 },
 {
  "from": "feature:sentinel-automatic-failover",
  "type": "IMPLEMENTED_IN",
  "to": "component:sentinel-core",
  "properties": {}
 },
 {
  "from": "decision:dual-replid-history",
  "type": "AFFECTS",
  "to": "component:replication-core",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:dual-replid-history",
  "type": "AFFECTS",
  "to": "feature:psync2-partial-resync",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:zstd-end-frame-flush",
  "type": "AFFECTS",
  "to": "component:repl-compression",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:zstd-end-frame-flush",
  "type": "AFFECTS",
  "to": "feature:replication-zstd-compression",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "component:eval-scripts",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:eval-scripts",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:eval-scripts",
  "type": "DEPENDS_ON",
  "to": "component:command-table",
  "properties": {}
 },
 {
  "from": "component:eval-scripts",
  "type": "DEPENDS_ON",
  "to": "component:resp-protocol",
  "properties": {}
 },
 {
  "from": "component:eval-scripts",
  "type": "DEPENDS_ON",
  "to": "component:acl-engine",
  "properties": {}
 },
 {
  "from": "component:eval-scripts",
  "type": "DEPENDS_ON",
  "to": "component:replication-core",
  "properties": {}
 },
 {
  "from": "component:eval-scripts",
  "type": "DEPENDS_ON",
  "to": "component:cluster-core",
  "properties": {}
 },
 {
  "from": "component:eval-scripts",
  "type": "DEPENDS_ON",
  "to": "component:dict",
  "properties": {}
 },
 {
  "from": "component:eval-scripts",
  "type": "DEPENDS_ON",
  "to": "component:sds",
  "properties": {}
 },
 {
  "from": "component:eval-scripts",
  "type": "USES",
  "to": "dependency:lua",
  "properties": {}
 },
 {
  "from": "component:eval-scripts",
  "type": "USES",
  "to": "dependency:fpconv",
  "properties": {}
 },
 {
  "from": "config:busy-reply-threshold",
  "type": "CONFIGURES",
  "to": "component:eval-scripts",
  "properties": {}
 },
 {
  "from": "component:functions-engine",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:functions-engine",
  "type": "DEPENDS_ON",
  "to": "component:eval-scripts",
  "properties": {}
 },
 {
  "from": "component:functions-engine",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:functions-engine",
  "type": "DEPENDS_ON",
  "to": "component:rdb-persistence",
  "properties": {}
 },
 {
  "from": "component:functions-engine",
  "type": "DEPENDS_ON",
  "to": "component:replication-core",
  "properties": {}
 },
 {
  "from": "component:functions-engine",
  "type": "DEPENDS_ON",
  "to": "component:dict",
  "properties": {}
 },
 {
  "from": "component:functions-engine",
  "type": "DEPENDS_ON",
  "to": "component:rio-layer",
  "properties": {}
 },
 {
  "from": "component:functions-engine",
  "type": "USES",
  "to": "dependency:lua",
  "properties": {}
 },
 {
  "from": "component:functions-engine",
  "type": "USES",
  "to": "datastore:rdb-snapshot",
  "properties": {}
 },
 {
  "from": "component:module-system",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:module-system",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:module-system",
  "type": "DEPENDS_ON",
  "to": "component:command-table",
  "properties": {}
 },
 {
  "from": "component:module-system",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:module-system",
  "type": "DEPENDS_ON",
  "to": "component:object-system",
  "properties": {}
 },
 {
  "from": "component:module-system",
  "type": "DEPENDS_ON",
  "to": "component:keyspace-notifications",
  "properties": {}
 },
 {
  "from": "component:module-system",
  "type": "DEPENDS_ON",
  "to": "component:blocked-clients",
  "properties": {}
 },
 {
  "from": "component:module-system",
  "type": "DEPENDS_ON",
  "to": "component:acl-engine",
  "properties": {}
 },
 {
  "from": "component:module-system",
  "type": "DEPENDS_ON",
  "to": "component:rdb-persistence",
  "properties": {}
 },
 {
  "from": "component:module-system",
  "type": "DEPENDS_ON",
  "to": "component:aof-persistence",
  "properties": {}
 },
 {
  "from": "component:module-system",
  "type": "DEPENDS_ON",
  "to": "component:replication-core",
  "properties": {}
 },
 {
  "from": "component:module-system",
  "type": "DEPENDS_ON",
  "to": "component:cluster-core",
  "properties": {}
 },
 {
  "from": "component:module-system",
  "type": "DEPENDS_ON",
  "to": "component:atomic-slot-migration",
  "properties": {}
 },
 {
  "from": "component:module-system",
  "type": "DEPENDS_ON",
  "to": "component:resp-protocol",
  "properties": {}
 },
 {
  "from": "component:module-system",
  "type": "DEPENDS_ON",
  "to": "component:slowlog",
  "properties": {}
 },
 {
  "from": "component:module-system",
  "type": "DEPENDS_ON",
  "to": "component:defrag",
  "properties": {}
 },
 {
  "from": "component:module-system",
  "type": "USES",
  "to": "dependency:hdr_histogram",
  "properties": {}
 },
 {
  "from": "component:module-system",
  "type": "IMPLEMENTS",
  "to": "interface:module-api",
  "properties": {}
 },
 {
  "from": "component:vector-sets-module",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:vector-sets-module",
  "type": "DEPENDS_ON",
  "to": "component:module-system",
  "properties": {}
 },
 {
  "from": "component:vector-sets-module",
  "type": "DEPENDS_ON",
  "to": "component:blocked-clients",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "EXPOSES",
  "to": "interface:module-api",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:lua-scripting",
  "properties": {}
 },
 {
  "from": "feature:lua-scripting",
  "type": "IMPLEMENTED_IN",
  "to": "component:eval-scripts",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:redis-functions",
  "properties": {}
 },
 {
  "from": "feature:redis-functions",
  "type": "IMPLEMENTED_IN",
  "to": "component:functions-engine",
  "properties": {}
 },
 {
  "from": "feature:redis-functions",
  "type": "IMPLEMENTED_IN",
  "to": "component:eval-scripts",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:vector-sets",
  "properties": {}
 },
 {
  "from": "feature:vector-sets",
  "type": "IMPLEMENTED_IN",
  "to": "component:vector-sets-module",
  "properties": {}
 },
 {
  "from": "decision:script-effects-replication-only",
  "type": "AFFECTS",
  "to": "component:eval-scripts",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:script-effects-replication-only",
  "type": "AFFECTS",
  "to": "feature:lua-scripting",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:lua-dedicated-jemalloc-arena",
  "type": "AFFECTS",
  "to": "component:eval-scripts",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:lua-dedicated-jemalloc-arena",
  "type": "AFFECTS",
  "to": "component:functions-engine",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:vector-sets-bundled-in-tree",
  "type": "AFFECTS",
  "to": "component:vector-sets-module",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:vector-sets-bundled-in-tree",
  "type": "AFFECTS",
  "to": "component:module-system",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "document:vector-sets-readme",
  "type": "DOCUMENTS",
  "to": "component:vector-sets-module",
  "properties": {}
 },
 {
  "from": "document:vector-sets-readme",
  "type": "DOCUMENTS",
  "to": "feature:vector-sets",
  "properties": {}
 },
 {
  "from": "document:modules-build-doc",
  "type": "DOCUMENTS",
  "to": "component:module-system",
  "properties": {}
 },
 {
  "from": "document:modules-build-doc",
  "type": "DOCUMENTS",
  "to": "component:vector-sets-module",
  "properties": {}
 },
 {
  "from": "document:modules-build-doc",
  "type": "DOCUMENTS",
  "to": "component:build-system",
  "properties": {}
 },
 {
  "from": "document:modules-manifest",
  "type": "DOCUMENTS",
  "to": "component:module-system",
  "properties": {}
 },
 {
  "from": "component:streams-core",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:streams-core",
  "type": "DEPENDS_ON",
  "to": "component:rax",
  "properties": {}
 },
 {
  "from": "component:streams-core",
  "type": "DEPENDS_ON",
  "to": "component:listpack",
  "properties": {}
 },
 {
  "from": "component:streams-core",
  "type": "DEPENDS_ON",
  "to": "component:sds",
  "properties": {}
 },
 {
  "from": "component:streams-core",
  "type": "DEPENDS_ON",
  "to": "component:dict",
  "properties": {}
 },
 {
  "from": "component:streams-core",
  "type": "DEPENDS_ON",
  "to": "component:object-system",
  "properties": {}
 },
 {
  "from": "component:streams-core",
  "type": "DEPENDS_ON",
  "to": "component:keyspace",
  "properties": {}
 },
 {
  "from": "component:streams-core",
  "type": "DEPENDS_ON",
  "to": "component:keyspace-notifications",
  "properties": {}
 },
 {
  "from": "component:streams-core",
  "type": "DEPENDS_ON",
  "to": "component:blocked-clients",
  "properties": {}
 },
 {
  "from": "component:streams-core",
  "type": "DEPENDS_ON",
  "to": "component:server-core",
  "properties": {}
 },
 {
  "from": "component:streams-core",
  "type": "USES",
  "to": "dependency:xxhash",
  "properties": {}
 },
 {
  "from": "config:stream-node-max-entries",
  "type": "CONFIGURES",
  "to": "component:streams-core",
  "properties": {}
 },
 {
  "from": "config:stream-node-max-bytes",
  "type": "CONFIGURES",
  "to": "component:streams-core",
  "properties": {}
 },
 {
  "from": "config:stream-idmp-duration",
  "type": "CONFIGURES",
  "to": "component:streams-core",
  "properties": {}
 },
 {
  "from": "component:stream-consumer-groups",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:stream-consumer-groups",
  "type": "DEPENDS_ON",
  "to": "component:streams-core",
  "properties": {}
 },
 {
  "from": "component:stream-consumer-groups",
  "type": "DEPENDS_ON",
  "to": "component:rax",
  "properties": {}
 },
 {
  "from": "component:stream-consumer-groups",
  "type": "DEPENDS_ON",
  "to": "component:adlist",
  "properties": {}
 },
 {
  "from": "component:stream-consumer-groups",
  "type": "DEPENDS_ON",
  "to": "component:sds",
  "properties": {}
 },
 {
  "from": "component:stream-consumer-groups",
  "type": "DEPENDS_ON",
  "to": "component:blocked-clients",
  "properties": {}
 },
 {
  "from": "component:stream-consumer-groups",
  "type": "DEPENDS_ON",
  "to": "component:keyspace-notifications",
  "properties": {}
 },
 {
  "from": "component:stream-dlq",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:stream-dlq",
  "type": "DEPENDS_ON",
  "to": "component:stream-consumer-groups",
  "properties": {}
 },
 {
  "from": "component:stream-dlq",
  "type": "DEPENDS_ON",
  "to": "component:streams-core",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:consumer-groups",
  "properties": {}
 },
 {
  "from": "feature:consumer-groups",
  "type": "IMPLEMENTED_IN",
  "to": "component:stream-consumer-groups",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:streams-dlq",
  "properties": {}
 },
 {
  "from": "feature:streams-dlq",
  "type": "IMPLEMENTED_IN",
  "to": "component:stream-dlq",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "PROVIDES",
  "to": "feature:stream-idempotent-producer",
  "properties": {}
 },
 {
  "from": "feature:stream-idempotent-producer",
  "type": "IMPLEMENTED_IN",
  "to": "component:streams-core",
  "properties": {}
 },
 {
  "from": "decision:dlq-distinct-from-xnack",
  "type": "AFFECTS",
  "to": "component:stream-dlq",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:dlq-distinct-from-xnack",
  "type": "AFFECTS",
  "to": "feature:streams-dlq",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:dlq-distinct-from-xnack",
  "type": "AFFECTS",
  "to": "component:stream-consumer-groups",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:dlq-replay-preserves-entry-id",
  "type": "AFFECTS",
  "to": "component:stream-dlq",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:dlq-replay-preserves-entry-id",
  "type": "AFFECTS",
  "to": "feature:streams-dlq",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:pel-time-ordered-list-nack-zone",
  "type": "AFFECTS",
  "to": "component:stream-consumer-groups",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:pel-time-ordered-list-nack-zone",
  "type": "AFFECTS",
  "to": "feature:consumer-groups",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "document:stream-dlq-implementation-plan",
  "type": "DOCUMENTS",
  "to": "component:stream-dlq",
  "properties": {}
 },
 {
  "from": "document:stream-dlq-implementation-plan",
  "type": "DOCUMENTS",
  "to": "feature:streams-dlq",
  "properties": {}
 },
 {
  "from": "document:stream-dlq-implementation-plan",
  "type": "DOCUMENTS",
  "to": "component:stream-consumer-groups",
  "properties": {}
 },
 {
  "from": "component:cli-internals",
  "type": "PART_OF",
  "to": "service:redis-cli",
  "properties": {}
 },
 {
  "from": "component:cli-internals",
  "type": "DEPENDS_ON",
  "to": "component:command-table",
  "properties": {}
 },
 {
  "from": "component:cli-internals",
  "type": "DEPENDS_ON",
  "to": "component:cluster-core",
  "properties": {}
 },
 {
  "from": "component:cli-internals",
  "type": "DEPENDS_ON",
  "to": "component:resp-protocol",
  "properties": {}
 },
 {
  "from": "component:cli-internals",
  "type": "USES",
  "to": "dependency:hiredis",
  "properties": {}
 },
 {
  "from": "component:cli-internals",
  "type": "USES",
  "to": "dependency:linenoise",
  "properties": {}
 },
 {
  "from": "component:cli-internals",
  "type": "USES",
  "to": "dependency:hdr_histogram",
  "properties": {}
 },
 {
  "from": "component:benchmark-internals",
  "type": "PART_OF",
  "to": "service:redis-benchmark",
  "properties": {}
 },
 {
  "from": "component:benchmark-internals",
  "type": "DEPENDS_ON",
  "to": "component:event-loop",
  "properties": {}
 },
 {
  "from": "component:benchmark-internals",
  "type": "DEPENDS_ON",
  "to": "component:checksums",
  "properties": {}
 },
 {
  "from": "component:benchmark-internals",
  "type": "USES",
  "to": "dependency:hiredis",
  "properties": {}
 },
 {
  "from": "component:benchmark-internals",
  "type": "USES",
  "to": "dependency:hdr_histogram",
  "properties": {}
 },
 {
  "from": "component:test-suite",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:test-suite",
  "type": "DEPENDS_ON",
  "to": "component:cli-internals",
  "properties": {}
 },
 {
  "from": "component:test-suite",
  "type": "DEPENDS_ON",
  "to": "component:benchmark-internals",
  "properties": {}
 },
 {
  "from": "component:test-suite",
  "type": "DEPENDS_ON",
  "to": "component:module-system",
  "properties": {}
 },
 {
  "from": "component:test-suite",
  "type": "DEPENDS_ON",
  "to": "component:sentinel-core",
  "properties": {}
 },
 {
  "from": "component:test-suite",
  "type": "DEPENDS_ON",
  "to": "component:cluster-core",
  "properties": {}
 },
 {
  "from": "component:build-system",
  "type": "PART_OF",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "component:build-system",
  "type": "USES",
  "to": "dependency:jemalloc",
  "properties": {}
 },
 {
  "from": "component:build-system",
  "type": "USES",
  "to": "dependency:lua",
  "properties": {}
 },
 {
  "from": "component:build-system",
  "type": "USES",
  "to": "dependency:hiredis",
  "properties": {}
 },
 {
  "from": "component:build-system",
  "type": "USES",
  "to": "dependency:linenoise",
  "properties": {}
 },
 {
  "from": "component:build-system",
  "type": "USES",
  "to": "dependency:hdr_histogram",
  "properties": {}
 },
 {
  "from": "component:build-system",
  "type": "USES",
  "to": "dependency:fpconv",
  "properties": {}
 },
 {
  "from": "component:build-system",
  "type": "USES",
  "to": "dependency:fast_float",
  "properties": {}
 },
 {
  "from": "component:build-system",
  "type": "USES",
  "to": "dependency:tre",
  "properties": {}
 },
 {
  "from": "component:build-system",
  "type": "USES",
  "to": "dependency:xxhash",
  "properties": {}
 },
 {
  "from": "component:build-system",
  "type": "USES",
  "to": "dependency:zstd",
  "properties": {}
 },
 {
  "from": "component:networking",
  "type": "USES",
  "to": "dependency:fpconv",
  "properties": {}
 },
 {
  "from": "component:rdb-persistence",
  "type": "USES",
  "to": "dependency:fpconv",
  "properties": {}
 },
 {
  "from": "component:rio-layer",
  "type": "USES",
  "to": "dependency:fpconv",
  "properties": {}
 },
 {
  "from": "component:resp-protocol",
  "type": "USES",
  "to": "dependency:fast_float",
  "properties": {}
 },
 {
  "from": "service:redis-cli",
  "type": "PROVIDES",
  "to": "feature:cli-cluster-manager",
  "properties": {}
 },
 {
  "from": "feature:cli-cluster-manager",
  "type": "IMPLEMENTED_IN",
  "to": "component:cli-internals",
  "properties": {}
 },
 {
  "from": "decision:lua-pinned-5-1",
  "type": "AFFECTS",
  "to": "component:eval-scripts",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:lua-pinned-5-1",
  "type": "AFFECTS",
  "to": "component:functions-engine",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:jemalloc-defrag-contract",
  "type": "AFFECTS",
  "to": "component:defrag",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:jemalloc-defrag-contract",
  "type": "AFFECTS",
  "to": "component:zmalloc-layer",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "decision:jemalloc-defrag-contract",
  "type": "AFFECTS",
  "to": "component:build-system",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.85
  }
 },
 {
  "from": "document:readme",
  "type": "DOCUMENTS",
  "to": "component:build-system",
  "properties": {}
 },
 {
  "from": "document:manifesto",
  "type": "DOCUMENTS",
  "to": "component:build-system",
  "properties": {}
 },
 {
  "from": "document:tls-doc",
  "type": "DOCUMENTS",
  "to": "component:build-system",
  "properties": {}
 },
 {
  "from": "document:tls-doc",
  "type": "DOCUMENTS",
  "to": "component:test-suite",
  "properties": {}
 },
 {
  "from": "document:tls-doc",
  "type": "DOCUMENTS",
  "to": "component:cli-internals",
  "properties": {}
 },
 {
  "from": "document:deps-readme",
  "type": "DOCUMENTS",
  "to": "component:build-system",
  "properties": {}
 },
 {
  "from": "document:tests-readme",
  "type": "DOCUMENTS",
  "to": "component:test-suite",
  "properties": {}
 },
 {
  "from": "person:sgreco",
  "type": "MEMBER_OF",
  "to": "team:redis-oss",
  "properties": {}
 },
 {
  "from": "person:ytanaka",
  "type": "MEMBER_OF",
  "to": "team:redis-oss",
  "properties": {}
 },
 {
  "from": "person:ytanaka",
  "type": "MEMBER_OF",
  "to": "team:streams-squad",
  "properties": {}
 },
 {
  "from": "person:enovak",
  "type": "MEMBER_OF",
  "to": "team:redis-oss",
  "properties": {}
 },
 {
  "from": "person:aokafor",
  "type": "MEMBER_OF",
  "to": "team:redis-oss",
  "properties": {}
 },
 {
  "from": "person:rmehta",
  "type": "MEMBER_OF",
  "to": "team:redis-oss",
  "properties": {}
 },
 {
  "from": "person:rmehta",
  "type": "MEMBER_OF",
  "to": "team:streams-squad",
  "properties": {}
 },
 {
  "from": "person:lcosta",
  "type": "MEMBER_OF",
  "to": "team:redis-oss",
  "properties": {}
 },
 {
  "from": "person:lcosta",
  "type": "MEMBER_OF",
  "to": "team:streams-squad",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "OWNED_BY",
  "to": "team:redis-oss",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "service:redis-sentinel",
  "type": "OWNED_BY",
  "to": "person:enovak",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "service:redis-cli",
  "type": "OWNED_BY",
  "to": "person:lcosta",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "service:redis-benchmark",
  "type": "OWNED_BY",
  "to": "person:lcosta",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:streams-core",
  "type": "OWNED_BY",
  "to": "team:streams-squad",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:stream-consumer-groups",
  "type": "OWNED_BY",
  "to": "team:streams-squad",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:stream-dlq",
  "type": "OWNED_BY",
  "to": "team:streams-squad",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "feature:streams-dlq",
  "type": "OWNED_BY",
  "to": "team:streams-squad",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:server-core",
  "type": "OWNED_BY",
  "to": "person:sgreco",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:io-threads",
  "type": "OWNED_BY",
  "to": "person:sgreco",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:networking",
  "type": "OWNED_BY",
  "to": "person:sgreco",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:aof-persistence",
  "type": "OWNED_BY",
  "to": "person:sgreco",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:rdb-persistence",
  "type": "OWNED_BY",
  "to": "person:sgreco",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:command-table",
  "type": "OWNED_BY",
  "to": "person:sgreco",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:replication-core",
  "type": "OWNED_BY",
  "to": "person:enovak",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:repl-compression",
  "type": "OWNED_BY",
  "to": "person:enovak",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:cluster-core",
  "type": "OWNED_BY",
  "to": "person:enovak",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:atomic-slot-migration",
  "type": "OWNED_BY",
  "to": "person:enovak",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:sentinel-core",
  "type": "OWNED_BY",
  "to": "person:enovak",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:zmalloc-layer",
  "type": "OWNED_BY",
  "to": "person:aokafor",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:eviction",
  "type": "OWNED_BY",
  "to": "person:aokafor",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:defrag",
  "type": "OWNED_BY",
  "to": "person:aokafor",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:expire-cycle",
  "type": "OWNED_BY",
  "to": "person:aokafor",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:hotkeys-tracking",
  "type": "OWNED_BY",
  "to": "person:aokafor",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:module-system",
  "type": "OWNED_BY",
  "to": "person:rmehta",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:eval-scripts",
  "type": "OWNED_BY",
  "to": "person:rmehta",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:vector-sets-module",
  "type": "OWNED_BY",
  "to": "person:rmehta",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:client-tracking",
  "type": "OWNED_BY",
  "to": "person:ytanaka",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:acl-engine",
  "type": "OWNED_BY",
  "to": "person:ytanaka",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:test-suite",
  "type": "OWNED_BY",
  "to": "person:lcosta",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:cli-internals",
  "type": "OWNED_BY",
  "to": "person:lcosta",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "component:build-system",
  "type": "OWNED_BY",
  "to": "person:lcosta",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "person:ytanaka",
  "type": "AUTHORED",
  "to": "pull_request:redis-15500",
  "properties": {}
 },
 {
  "from": "pull_request:redis-15500",
  "type": "TOUCHED",
  "to": "component:streams-core",
  "properties": {
   "evidence": "github:redis/redis#15500",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15500",
  "type": "TOUCHED",
  "to": "component:stream-consumer-groups",
  "properties": {
   "evidence": "github:redis/redis#15500",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15500",
  "type": "TOUCHED",
  "to": "component:command-table",
  "properties": {
   "evidence": "github:redis/redis#15500",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15500",
  "type": "IMPLEMENTS",
  "to": "feature:streams-dlq",
  "properties": {
   "evidence": "github:redis/redis#15500",
   "truth": "source_observation"
  }
 },
 {
  "from": "person:enovak",
  "type": "AUTHORED",
  "to": "pull_request:redis-15366",
  "properties": {}
 },
 {
  "from": "pull_request:redis-15366",
  "type": "TOUCHED",
  "to": "component:repl-compression",
  "properties": {
   "evidence": "github:redis/redis#15366",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15366",
  "type": "TOUCHED",
  "to": "component:replication-core",
  "properties": {
   "evidence": "github:redis/redis#15366",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15366",
  "type": "TOUCHED",
  "to": "component:networking",
  "properties": {
   "evidence": "github:redis/redis#15366",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15366",
  "type": "TOUCHED",
  "to": "component:io-threads",
  "properties": {
   "evidence": "github:redis/redis#15366",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15366",
  "type": "TOUCHED",
  "to": "component:config-engine",
  "properties": {
   "evidence": "github:redis/redis#15366",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15366",
  "type": "TOUCHED",
  "to": "component:server-core",
  "properties": {
   "evidence": "github:redis/redis#15366",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15366",
  "type": "TOUCHED",
  "to": "component:test-suite",
  "properties": {
   "evidence": "github:redis/redis#15366",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15366",
  "type": "IMPLEMENTS",
  "to": "feature:replication-zstd-compression",
  "properties": {
   "evidence": "github:redis/redis#15366",
   "truth": "source_observation"
  }
 },
 {
  "from": "person:enovak",
  "type": "AUTHORED",
  "to": "pull_request:redis-15490",
  "properties": {}
 },
 {
  "from": "pull_request:redis-15490",
  "type": "TOUCHED",
  "to": "component:repl-compression",
  "properties": {
   "evidence": "github:redis/redis#15490",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15490",
  "type": "IMPLEMENTS",
  "to": "feature:replication-zstd-compression",
  "properties": {
   "evidence": "github:redis/redis#15490",
   "truth": "source_observation"
  }
 },
 {
  "from": "person:sgreco",
  "type": "AUTHORED",
  "to": "pull_request:redis-15329",
  "properties": {}
 },
 {
  "from": "pull_request:redis-15329",
  "type": "TOUCHED",
  "to": "component:io-threads",
  "properties": {
   "evidence": "github:redis/redis#15329",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15329",
  "type": "TOUCHED",
  "to": "component:replication-core",
  "properties": {
   "evidence": "github:redis/redis#15329",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15329",
  "type": "TOUCHED",
  "to": "component:test-suite",
  "properties": {
   "evidence": "github:redis/redis#15329",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15329",
  "type": "RESOLVES",
  "to": "issue:redis-15311",
  "properties": {
   "evidence": "github:redis/redis#15329",
   "truth": "source_observation"
  }
 },
 {
  "from": "person:enovak",
  "type": "AUTHORED",
  "to": "pull_request:redis-15338",
  "properties": {}
 },
 {
  "from": "pull_request:redis-15338",
  "type": "TOUCHED",
  "to": "component:cli-internals",
  "properties": {
   "evidence": "github:redis/redis#15338",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15338",
  "type": "TOUCHED",
  "to": "component:atomic-slot-migration",
  "properties": {
   "evidence": "github:redis/redis#15338",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15338",
  "type": "TOUCHED",
  "to": "component:test-suite",
  "properties": {
   "evidence": "github:redis/redis#15338",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15338",
  "type": "IMPLEMENTS",
  "to": "feature:atomic-slot-migration-feature",
  "properties": {
   "evidence": "github:redis/redis#15338",
   "truth": "source_observation"
  }
 },
 {
  "from": "person:lcosta",
  "type": "AUTHORED",
  "to": "pull_request:redis-15493",
  "properties": {}
 },
 {
  "from": "pull_request:redis-15493",
  "type": "TOUCHED",
  "to": "component:test-suite",
  "properties": {
   "evidence": "github:redis/redis#15493",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15493",
  "type": "TOUCHED",
  "to": "component:atomic-slot-migration",
  "properties": {
   "evidence": "github:redis/redis#15493",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15493",
  "type": "TOUCHED",
  "to": "component:cluster-core",
  "properties": {
   "evidence": "github:redis/redis#15493",
   "truth": "source_observation"
  }
 },
 {
  "from": "person:aokafor",
  "type": "AUTHORED",
  "to": "pull_request:redis-15412",
  "properties": {}
 },
 {
  "from": "pull_request:redis-15412",
  "type": "TOUCHED",
  "to": "component:expire-cycle",
  "properties": {
   "evidence": "github:redis/redis#15412",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15412",
  "type": "RESOLVES",
  "to": "issue:redis-15388",
  "properties": {
   "evidence": "github:redis/redis#15412",
   "truth": "source_observation"
  }
 },
 {
  "from": "person:sgreco",
  "type": "AUTHORED",
  "to": "pull_request:redis-15436",
  "properties": {}
 },
 {
  "from": "pull_request:redis-15436",
  "type": "TOUCHED",
  "to": "component:aof-persistence",
  "properties": {
   "evidence": "github:redis/redis#15436",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15436",
  "type": "TOUCHED",
  "to": "component:module-system",
  "properties": {
   "evidence": "github:redis/redis#15436",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15436",
  "type": "TOUCHED",
  "to": "component:vector-sets-module",
  "properties": {
   "evidence": "github:redis/redis#15436",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15436",
  "type": "RESOLVES",
  "to": "issue:redis-15418",
  "properties": {
   "evidence": "github:redis/redis#15436",
   "truth": "source_observation"
  }
 },
 {
  "from": "person:sgreco",
  "type": "AUTHORED",
  "to": "pull_request:redis-15466",
  "properties": {}
 },
 {
  "from": "pull_request:redis-15466",
  "type": "TOUCHED",
  "to": "component:key-metadata",
  "properties": {
   "evidence": "github:redis/redis#15466",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15466",
  "type": "TOUCHED",
  "to": "component:cluster-core",
  "properties": {
   "evidence": "github:redis/redis#15466",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15466",
  "type": "TOUCHED",
  "to": "component:atomic-slot-migration",
  "properties": {
   "evidence": "github:redis/redis#15466",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15466",
  "type": "TOUCHED",
  "to": "component:test-suite",
  "properties": {
   "evidence": "github:redis/redis#15466",
   "truth": "source_observation"
  }
 },
 {
  "from": "person:sgreco",
  "type": "AUTHORED",
  "to": "pull_request:redis-15364",
  "properties": {}
 },
 {
  "from": "pull_request:redis-15364",
  "type": "TOUCHED",
  "to": "component:hash-type",
  "properties": {
   "evidence": "github:redis/redis#15364",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15364",
  "type": "TOUCHED",
  "to": "component:listpack",
  "properties": {
   "evidence": "github:redis/redis#15364",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15364",
  "type": "TOUCHED",
  "to": "component:rdb-persistence",
  "properties": {
   "evidence": "github:redis/redis#15364",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15364",
  "type": "TOUCHED",
  "to": "component:dict",
  "properties": {
   "evidence": "github:redis/redis#15364",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15364",
  "type": "TOUCHED",
  "to": "component:defrag",
  "properties": {
   "evidence": "github:redis/redis#15364",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15364",
  "type": "TOUCHED",
  "to": "component:command-table",
  "properties": {
   "evidence": "github:redis/redis#15364",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15364",
  "type": "TOUCHED",
  "to": "component:keyspace",
  "properties": {
   "evidence": "github:redis/redis#15364",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15364",
  "type": "TOUCHED",
  "to": "component:config-engine",
  "properties": {
   "evidence": "github:redis/redis#15364",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15364",
  "type": "IMPLEMENTS",
  "to": "feature:hash-templates",
  "properties": {
   "evidence": "github:redis/redis#15364",
   "truth": "source_observation"
  }
 },
 {
  "from": "person:aokafor",
  "type": "AUTHORED",
  "to": "pull_request:redis-15345",
  "properties": {}
 },
 {
  "from": "pull_request:redis-15345",
  "type": "TOUCHED",
  "to": "component:hash-type",
  "properties": {
   "evidence": "github:redis/redis#15345",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15345",
  "type": "TOUCHED",
  "to": "component:test-suite",
  "properties": {
   "evidence": "github:redis/redis#15345",
   "truth": "source_observation"
  }
 },
 {
  "from": "person:ytanaka",
  "type": "AUTHORED",
  "to": "pull_request:redis-15371",
  "properties": {}
 },
 {
  "from": "pull_request:redis-15371",
  "type": "TOUCHED",
  "to": "component:client-tracking",
  "properties": {
   "evidence": "github:redis/redis#15371",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15371",
  "type": "TOUCHED",
  "to": "component:acl-engine",
  "properties": {
   "evidence": "github:redis/redis#15371",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15371",
  "type": "TOUCHED",
  "to": "component:networking",
  "properties": {
   "evidence": "github:redis/redis#15371",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15371",
  "type": "RESOLVES",
  "to": "issue:redis-15340",
  "properties": {
   "evidence": "github:redis/redis#15371",
   "truth": "source_observation"
  }
 },
 {
  "from": "person:aokafor",
  "type": "AUTHORED",
  "to": "pull_request:redis-15433",
  "properties": {}
 },
 {
  "from": "pull_request:redis-15433",
  "type": "TOUCHED",
  "to": "component:bitops",
  "properties": {
   "evidence": "github:redis/redis#15433",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15433",
  "type": "TOUCHED",
  "to": "component:test-suite",
  "properties": {
   "evidence": "github:redis/redis#15433",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15433",
  "type": "RESOLVES",
  "to": "issue:redis-15408",
  "properties": {
   "evidence": "github:redis/redis#15433",
   "truth": "source_observation"
  }
 },
 {
  "from": "person:rmehta",
  "type": "AUTHORED",
  "to": "pull_request:redis-15392",
  "properties": {}
 },
 {
  "from": "pull_request:redis-15392",
  "type": "TOUCHED",
  "to": "component:vector-sets-module",
  "properties": {
   "evidence": "github:redis/redis#15392",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15392",
  "type": "RESOLVES",
  "to": "issue:redis-15379",
  "properties": {
   "evidence": "github:redis/redis#15392",
   "truth": "source_observation"
  }
 },
 {
  "from": "person:ytanaka",
  "type": "AUTHORED",
  "to": "pull_request:redis-15282",
  "properties": {}
 },
 {
  "from": "pull_request:redis-15282",
  "type": "TOUCHED",
  "to": "component:streams-core",
  "properties": {
   "evidence": "github:redis/redis#15282",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15282",
  "type": "TOUCHED",
  "to": "component:stream-consumer-groups",
  "properties": {
   "evidence": "github:redis/redis#15282",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15282",
  "type": "TOUCHED",
  "to": "component:command-table",
  "properties": {
   "evidence": "github:redis/redis#15282",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15282",
  "type": "TOUCHED",
  "to": "component:test-suite",
  "properties": {
   "evidence": "github:redis/redis#15282",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15282",
  "type": "IMPLEMENTS",
  "to": "feature:consumer-groups",
  "properties": {
   "evidence": "github:redis/redis#15282",
   "truth": "source_observation"
  }
 },
 {
  "from": "person:sgreco",
  "type": "AUTHORED",
  "to": "pull_request:redis-15441",
  "properties": {}
 },
 {
  "from": "pull_request:redis-15441",
  "type": "TOUCHED",
  "to": "component:aof-persistence",
  "properties": {
   "evidence": "github:redis/redis#15441",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15441",
  "type": "TOUCHED",
  "to": "component:command-table",
  "properties": {
   "evidence": "github:redis/redis#15441",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15441",
  "type": "TOUCHED",
  "to": "component:config-engine",
  "properties": {
   "evidence": "github:redis/redis#15441",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15441",
  "type": "TOUCHED",
  "to": "component:server-core",
  "properties": {
   "evidence": "github:redis/redis#15441",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15441",
  "type": "TOUCHED",
  "to": "component:test-suite",
  "properties": {
   "evidence": "github:redis/redis#15441",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15441",
  "type": "IMPLEMENTS",
  "to": "feature:backup-command",
  "properties": {
   "evidence": "github:redis/redis#15441",
   "truth": "source_observation"
  }
 },
 {
  "from": "person:rmehta",
  "type": "AUTHORED",
  "to": "pull_request:redis-15350",
  "properties": {}
 },
 {
  "from": "pull_request:redis-15350",
  "type": "TOUCHED",
  "to": "component:module-system",
  "properties": {
   "evidence": "github:redis/redis#15350",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15350",
  "type": "TOUCHED",
  "to": "component:cluster-bus",
  "properties": {
   "evidence": "github:redis/redis#15350",
   "truth": "source_observation"
  }
 },
 {
  "from": "pull_request:redis-15350",
  "type": "TOUCHED",
  "to": "component:test-suite",
  "properties": {
   "evidence": "github:redis/redis#15350",
   "truth": "source_observation"
  }
 },
 {
  "from": "issue:redis-7386",
  "type": "MENTIONS",
  "to": "component:stream-consumer-groups",
  "properties": {}
 },
 {
  "from": "issue:redis-7386",
  "type": "MENTIONS",
  "to": "component:streams-core",
  "properties": {}
 },
 {
  "from": "issue:redis-7386",
  "type": "MENTIONS",
  "to": "feature:streams-dlq",
  "properties": {}
 },
 {
  "from": "issue:redis-7386",
  "type": "MENTIONS",
  "to": "pull_request:redis-15500",
  "properties": {}
 },
 {
  "from": "issue:redis-7386",
  "type": "MENTIONS",
  "to": "decision:streams-dlq-design",
  "properties": {}
 },
 {
  "from": "issue:redis-15311",
  "type": "MENTIONS",
  "to": "component:io-threads",
  "properties": {}
 },
 {
  "from": "issue:redis-15311",
  "type": "MENTIONS",
  "to": "component:replication-core",
  "properties": {}
 },
 {
  "from": "issue:redis-15311",
  "type": "MENTIONS",
  "to": "bug_pattern:iothread-repl-busy-loop",
  "properties": {}
 },
 {
  "from": "issue:redis-15388",
  "type": "MENTIONS",
  "to": "component:expire-cycle",
  "properties": {}
 },
 {
  "from": "issue:redis-15388",
  "type": "MENTIONS",
  "to": "bug_pattern:fast-expire-stale-trigger-dead",
  "properties": {}
 },
 {
  "from": "issue:redis-15340",
  "type": "MENTIONS",
  "to": "component:client-tracking",
  "properties": {}
 },
 {
  "from": "issue:redis-15340",
  "type": "MENTIONS",
  "to": "component:acl-engine",
  "properties": {}
 },
 {
  "from": "issue:redis-15340",
  "type": "MENTIONS",
  "to": "bug_pattern:bcast-acl-key-leak",
  "properties": {}
 },
 {
  "from": "issue:redis-15379",
  "type": "MENTIONS",
  "to": "component:vector-sets-module",
  "properties": {}
 },
 {
  "from": "issue:redis-15379",
  "type": "MENTIONS",
  "to": "bug_pattern:vrandmember-llong-min-crash",
  "properties": {}
 },
 {
  "from": "issue:redis-15408",
  "type": "MENTIONS",
  "to": "component:bitops",
  "properties": {}
 },
 {
  "from": "issue:redis-15418",
  "type": "MENTIONS",
  "to": "component:aof-persistence",
  "properties": {}
 },
 {
  "from": "issue:redis-15418",
  "type": "MENTIONS",
  "to": "component:module-system",
  "properties": {}
 },
 {
  "from": "issue:redis-15418",
  "type": "MENTIONS",
  "to": "component:vector-sets-module",
  "properties": {}
 },
 {
  "from": "person:ytanaka",
  "type": "AUTHORED",
  "to": "decision:streams-dlq-design",
  "properties": {}
 },
 {
  "from": "decision:streams-dlq-design",
  "type": "AFFECTS",
  "to": "component:stream-dlq",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:streams-dlq-design",
  "type": "AFFECTS",
  "to": "feature:streams-dlq",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:streams-dlq-design",
  "type": "AFFECTS",
  "to": "component:stream-consumer-groups",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "person:enovak",
  "type": "AUTHORED",
  "to": "decision:repl-zstd-compression",
  "properties": {}
 },
 {
  "from": "decision:repl-zstd-compression",
  "type": "AFFECTS",
  "to": "component:repl-compression",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:repl-zstd-compression",
  "type": "AFFECTS",
  "to": "component:replication-core",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:repl-zstd-compression",
  "type": "AFFECTS",
  "to": "adapter:zstd-compression",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:repl-zstd-compression",
  "type": "AFFECTS",
  "to": "component:io-threads",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "person:enovak",
  "type": "AUTHORED",
  "to": "decision:atomic-slot-migration",
  "properties": {}
 },
 {
  "from": "decision:atomic-slot-migration",
  "type": "AFFECTS",
  "to": "component:atomic-slot-migration",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:atomic-slot-migration",
  "type": "AFFECTS",
  "to": "component:cluster-core",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:atomic-slot-migration",
  "type": "AFFECTS",
  "to": "feature:atomic-slot-migration-feature",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:atomic-slot-migration",
  "type": "AFFECTS",
  "to": "component:cluster-bus",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:atomic-slot-migration",
  "type": "SUPERSEDES",
  "to": "decision:migrate-restore-resharding",
  "properties": {}
 },
 {
  "from": "person:sgreco",
  "type": "AUTHORED",
  "to": "decision:migrate-restore-resharding",
  "properties": {}
 },
 {
  "from": "decision:migrate-restore-resharding",
  "type": "AFFECTS",
  "to": "component:cluster-core",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:migrate-restore-resharding",
  "type": "AFFECTS",
  "to": "component:atomic-slot-migration",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "person:sgreco",
  "type": "AUTHORED",
  "to": "decision:single-threaded-event-loop",
  "properties": {}
 },
 {
  "from": "decision:single-threaded-event-loop",
  "type": "AFFECTS",
  "to": "component:event-loop",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:single-threaded-event-loop",
  "type": "AFFECTS",
  "to": "component:server-core",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:single-threaded-event-loop",
  "type": "AFFECTS",
  "to": "component:command-table",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "person:sgreco",
  "type": "AUTHORED",
  "to": "decision:io-threads-for-network",
  "properties": {}
 },
 {
  "from": "decision:io-threads-for-network",
  "type": "AFFECTS",
  "to": "component:io-threads",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:io-threads-for-network",
  "type": "AFFECTS",
  "to": "component:event-loop",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:io-threads-for-network",
  "type": "AFFECTS",
  "to": "component:networking",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:io-threads-for-network",
  "type": "AFFECTS",
  "to": "feature:threaded-io",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "person:aokafor",
  "type": "AUTHORED",
  "to": "decision:listpack-over-ziplist",
  "properties": {}
 },
 {
  "from": "decision:listpack-over-ziplist",
  "type": "AFFECTS",
  "to": "component:listpack",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:listpack-over-ziplist",
  "type": "AFFECTS",
  "to": "component:ziplist-legacy",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:listpack-over-ziplist",
  "type": "AFFECTS",
  "to": "component:hash-type",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:listpack-over-ziplist",
  "type": "AFFECTS",
  "to": "component:zset-type",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:listpack-over-ziplist",
  "type": "AFFECTS",
  "to": "component:quicklist",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:listpack-over-ziplist",
  "type": "SUPERSEDES",
  "to": "decision:ziplist-encoding",
  "properties": {}
 },
 {
  "from": "person:aokafor",
  "type": "AUTHORED",
  "to": "decision:ziplist-encoding",
  "properties": {}
 },
 {
  "from": "decision:ziplist-encoding",
  "type": "AFFECTS",
  "to": "component:ziplist-legacy",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:ziplist-encoding",
  "type": "AFFECTS",
  "to": "component:listpack",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "person:sgreco",
  "type": "AUTHORED",
  "to": "decision:rdb-aof-hybrid-persistence",
  "properties": {}
 },
 {
  "from": "decision:rdb-aof-hybrid-persistence",
  "type": "AFFECTS",
  "to": "component:aof-persistence",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:rdb-aof-hybrid-persistence",
  "type": "AFFECTS",
  "to": "component:rdb-persistence",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:rdb-aof-hybrid-persistence",
  "type": "AFFECTS",
  "to": "feature:multi-part-aof",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "person:aokafor",
  "type": "AUTHORED",
  "to": "decision:jemalloc-default-allocator",
  "properties": {}
 },
 {
  "from": "decision:jemalloc-default-allocator",
  "type": "AFFECTS",
  "to": "component:zmalloc-layer",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:jemalloc-default-allocator",
  "type": "AFFECTS",
  "to": "adapter:jemalloc-allocator",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:jemalloc-default-allocator",
  "type": "AFFECTS",
  "to": "component:defrag",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "person:enovak",
  "type": "AUTHORED",
  "to": "decision:kvstore-per-slot-dicts",
  "properties": {}
 },
 {
  "from": "decision:kvstore-per-slot-dicts",
  "type": "AFFECTS",
  "to": "component:kvstore",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:kvstore-per-slot-dicts",
  "type": "AFFECTS",
  "to": "component:dict",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:kvstore-per-slot-dicts",
  "type": "AFFECTS",
  "to": "component:keyspace",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:kvstore-per-slot-dicts",
  "type": "AFFECTS",
  "to": "component:cluster-core",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "person:ytanaka",
  "type": "AUTHORED",
  "to": "decision:resp3-protocol-decision",
  "properties": {}
 },
 {
  "from": "decision:resp3-protocol-decision",
  "type": "AFFECTS",
  "to": "component:resp-protocol",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:resp3-protocol-decision",
  "type": "AFFECTS",
  "to": "component:networking",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "decision:resp3-protocol-decision",
  "type": "AFFECTS",
  "to": "component:client-tracking",
  "properties": {
   "truth": "user_decision",
   "confidence": 0.9
  }
 },
 {
  "from": "preference:no-external-runtime-deps",
  "type": "POLICY_APPLIES_TO",
  "to": "component:build-system",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "preference:listpack-for-small-collections",
  "type": "POLICY_APPLIES_TO",
  "to": "component:listpack",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "preference:listpack-for-small-collections",
  "type": "POLICY_APPLIES_TO",
  "to": "component:hash-type",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "preference:listpack-for-small-collections",
  "type": "POLICY_APPLIES_TO",
  "to": "component:zset-type",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "preference:listpack-for-small-collections",
  "type": "POLICY_APPLIES_TO",
  "to": "component:set-type",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "preference:listpack-for-small-collections",
  "type": "POLICY_APPLIES_TO",
  "to": "component:list-type",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "preference:listpack-for-small-collections",
  "type": "POLICY_APPLIES_TO",
  "to": "component:streams-core",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "preference:tcl-integration-tests-required",
  "type": "POLICY_APPLIES_TO",
  "to": "component:test-suite",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "preference:resp-backward-compat",
  "type": "POLICY_APPLIES_TO",
  "to": "component:resp-protocol",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "preference:resp-backward-compat",
  "type": "POLICY_APPLIES_TO",
  "to": "component:networking",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "preference:resp-backward-compat",
  "type": "POLICY_APPLIES_TO",
  "to": "component:command-table",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "preference:c99-no-vla",
  "type": "POLICY_APPLIES_TO",
  "to": "component:server-core",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "preference:c99-no-vla",
  "type": "POLICY_APPLIES_TO",
  "to": "component:bitops",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "preference:c99-no-vla",
  "type": "POLICY_APPLIES_TO",
  "to": "component:hyperloglog",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "preference:c99-no-vla",
  "type": "POLICY_APPLIES_TO",
  "to": "component:build-system",
  "properties": {
   "truth": "user_decision"
  }
 },
 {
  "from": "bug_pattern:iothread-repl-busy-loop",
  "type": "REPRODUCES",
  "to": "component:io-threads",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.9
  }
 },
 {
  "from": "bug_pattern:iothread-repl-busy-loop",
  "type": "REPRODUCES",
  "to": "component:replication-core",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.9
  }
 },
 {
  "from": "bug_pattern:fast-expire-stale-trigger-dead",
  "type": "REPRODUCES",
  "to": "component:expire-cycle",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.9
  }
 },
 {
  "from": "bug_pattern:aofrw-cow-spike",
  "type": "REPRODUCES",
  "to": "component:aof-persistence",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.9
  }
 },
 {
  "from": "bug_pattern:keymeta-double-restore",
  "type": "REPRODUCES",
  "to": "component:key-metadata",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.9
  }
 },
 {
  "from": "bug_pattern:keymeta-double-restore",
  "type": "REPRODUCES",
  "to": "component:atomic-slot-migration",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.9
  }
 },
 {
  "from": "bug_pattern:bcast-acl-key-leak",
  "type": "REPRODUCES",
  "to": "component:client-tracking",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.9
  }
 },
 {
  "from": "bug_pattern:bcast-acl-key-leak",
  "type": "REPRODUCES",
  "to": "component:acl-engine",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.9
  }
 },
 {
  "from": "bug_pattern:vrandmember-llong-min-crash",
  "type": "REPRODUCES",
  "to": "component:vector-sets-module",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.9
  }
 },
 {
  "from": "fix:iothread-busyloop-sleep-throttle",
  "type": "ATTEMPTED_FIX_FAILED",
  "to": "bug_pattern:iothread-repl-busy-loop",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.95
  }
 },
 {
  "from": "fix:iothread-busyloop-event-mask-fix",
  "type": "RESOLVES",
  "to": "bug_pattern:iothread-repl-busy-loop",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.9
  }
 },
 {
  "from": "pull_request:redis-15329",
  "type": "DELIVERS",
  "to": "fix:iothread-busyloop-event-mask-fix",
  "properties": {}
 },
 {
  "from": "person:lcosta",
  "type": "VERIFIED",
  "to": "fix:iothread-busyloop-event-mask-fix",
  "properties": {}
 },
 {
  "from": "fix:fast-expire-unit-conversion-fix",
  "type": "RESOLVES",
  "to": "bug_pattern:fast-expire-stale-trigger-dead",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.9
  }
 },
 {
  "from": "pull_request:redis-15412",
  "type": "DELIVERS",
  "to": "fix:fast-expire-unit-conversion-fix",
  "properties": {}
 },
 {
  "from": "person:lcosta",
  "type": "VERIFIED",
  "to": "fix:fast-expire-unit-conversion-fix",
  "properties": {}
 },
 {
  "from": "fix:aofrw-offpeak-scheduling-mitigation",
  "type": "RESOLVES",
  "to": "bug_pattern:aofrw-cow-spike",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.9
  }
 },
 {
  "from": "person:sgreco",
  "type": "VERIFIED",
  "to": "fix:aofrw-offpeak-scheduling-mitigation",
  "properties": {}
 },
 {
  "from": "fix:keymeta-restore-skip-fix",
  "type": "RESOLVES",
  "to": "bug_pattern:keymeta-double-restore",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.9
  }
 },
 {
  "from": "pull_request:redis-15466",
  "type": "DELIVERS",
  "to": "fix:keymeta-restore-skip-fix",
  "properties": {}
 },
 {
  "from": "person:lcosta",
  "type": "VERIFIED",
  "to": "fix:keymeta-restore-skip-fix",
  "properties": {}
 },
 {
  "from": "fix:bcast-acl-filter-fix",
  "type": "RESOLVES",
  "to": "bug_pattern:bcast-acl-key-leak",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.9
  }
 },
 {
  "from": "pull_request:redis-15371",
  "type": "DELIVERS",
  "to": "fix:bcast-acl-filter-fix",
  "properties": {}
 },
 {
  "from": "person:lcosta",
  "type": "VERIFIED",
  "to": "fix:bcast-acl-filter-fix",
  "properties": {}
 },
 {
  "from": "fix:vrandmember-llong-min-guard",
  "type": "RESOLVES",
  "to": "bug_pattern:vrandmember-llong-min-crash",
  "properties": {
   "truth": "agent_claim",
   "confidence": 0.9
  }
 },
 {
  "from": "pull_request:redis-15392",
  "type": "DELIVERS",
  "to": "fix:vrandmember-llong-min-guard",
  "properties": {}
 },
 {
  "from": "person:lcosta",
  "type": "VERIFIED",
  "to": "fix:vrandmember-llong-min-guard",
  "properties": {}
 },
 {
  "from": "investigation:iothread-busyloop-profiling",
  "type": "INVESTIGATES",
  "to": "bug_pattern:iothread-repl-busy-loop",
  "properties": {}
 },
 {
  "from": "person:sgreco",
  "type": "AUTHORED",
  "to": "investigation:iothread-busyloop-profiling",
  "properties": {}
 },
 {
  "from": "investigation:expire-lag-memory-audit",
  "type": "INVESTIGATES",
  "to": "bug_pattern:fast-expire-stale-trigger-dead",
  "properties": {}
 },
 {
  "from": "person:aokafor",
  "type": "AUTHORED",
  "to": "investigation:expire-lag-memory-audit",
  "properties": {}
 },
 {
  "from": "investigation:aofrw-cow-forensics",
  "type": "INVESTIGATES",
  "to": "bug_pattern:aofrw-cow-spike",
  "properties": {}
 },
 {
  "from": "person:aokafor",
  "type": "AUTHORED",
  "to": "investigation:aofrw-cow-forensics",
  "properties": {}
 },
 {
  "from": "investigation:asm-keymeta-doubling-trace",
  "type": "INVESTIGATES",
  "to": "bug_pattern:keymeta-double-restore",
  "properties": {}
 },
 {
  "from": "person:enovak",
  "type": "AUTHORED",
  "to": "investigation:asm-keymeta-doubling-trace",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "DEPLOYED_TO",
  "to": "environment:production",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "DEPLOYED_TO",
  "to": "environment:staging",
  "properties": {}
 },
 {
  "from": "service:redis-server",
  "type": "DEPLOYED_TO",
  "to": "environment:ci",
  "properties": {}
 },
 {
  "from": "service:redis-sentinel",
  "type": "DEPLOYED_TO",
  "to": "environment:production",
  "properties": {}
 },
 {
  "from": "service:redis-sentinel",
  "type": "DEPLOYED_TO",
  "to": "environment:staging",
  "properties": {}
 },
 {
  "from": "environment:production",
  "type": "HOSTED_ON",
  "to": "cluster:prod-cache-euw1",
  "properties": {}
 },
 {
  "from": "deployment:v8-4-rollout",
  "type": "DEPLOYS",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "deployment:repl-compression-canary",
  "type": "DEPLOYS",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "deployment:nightly-ci-2026-07-19",
  "type": "DEPLOYS",
  "to": "service:redis-server",
  "properties": {}
 },
 {
  "from": "runbook:aof-rewrite-pressure",
  "type": "DOCUMENTS",
  "to": "component:aof-persistence",
  "properties": {}
 },
 {
  "from": "runbook:aof-rewrite-pressure",
  "type": "DOCUMENTS",
  "to": "component:rdb-persistence",
  "properties": {}
 },
 {
  "from": "runbook:aof-rewrite-pressure",
  "type": "DOCUMENTS",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "runbook:cluster-resharding",
  "type": "DOCUMENTS",
  "to": "component:atomic-slot-migration",
  "properties": {}
 },
 {
  "from": "runbook:cluster-resharding",
  "type": "DOCUMENTS",
  "to": "component:cluster-core",
  "properties": {}
 },
 {
  "from": "runbook:cluster-resharding",
  "type": "DOCUMENTS",
  "to": "component:cli-internals",
  "properties": {}
 },
 {
  "from": "runbook:failover-drill",
  "type": "DOCUMENTS",
  "to": "component:sentinel-core",
  "properties": {}
 },
 {
  "from": "runbook:failover-drill",
  "type": "DOCUMENTS",
  "to": "component:replication-core",
  "properties": {}
 },
 {
  "from": "runbook:failover-drill",
  "type": "DOCUMENTS",
  "to": "component:cluster-core",
  "properties": {}
 },
 {
  "from": "runbook:hotkey-triage",
  "type": "DOCUMENTS",
  "to": "component:hotkeys-tracking",
  "properties": {}
 },
 {
  "from": "runbook:hotkey-triage",
  "type": "DOCUMENTS",
  "to": "component:latency-monitor",
  "properties": {}
 },
 {
  "from": "runbook:hotkey-triage",
  "type": "DOCUMENTS",
  "to": "component:eviction",
  "properties": {}
 },
 {
  "from": "alert:rss-cow-spike",
  "type": "WATCHES",
  "to": "component:aof-persistence",
  "properties": {}
 },
 {
  "from": "alert:replica-lag",
  "type": "WATCHES",
  "to": "component:replication-core",
  "properties": {}
 },
 {
  "from": "alert:cluster-split-brain",
  "type": "WATCHES",
  "to": "component:cluster-bus",
  "properties": {}
 },
 {
  "from": "conversation:xdlq-semantics",
  "type": "MENTIONS",
  "to": "decision:streams-dlq-design",
  "properties": {}
 },
 {
  "from": "conversation:xdlq-semantics",
  "type": "MENTIONS",
  "to": "feature:streams-dlq",
  "properties": {}
 },
 {
  "from": "conversation:xdlq-semantics",
  "type": "MENTIONS",
  "to": "pull_request:redis-15500",
  "properties": {}
 },
 {
  "from": "conversation:xdlq-semantics",
  "type": "MENTIONS",
  "to": "component:stream-consumer-groups",
  "properties": {}
 },
 {
  "from": "person:ytanaka",
  "type": "PARTICIPATED_IN",
  "to": "conversation:xdlq-semantics",
  "properties": {}
 },
 {
  "from": "person:rmehta",
  "type": "PARTICIPATED_IN",
  "to": "conversation:xdlq-semantics",
  "properties": {}
 },
 {
  "from": "person:lcosta",
  "type": "PARTICIPATED_IN",
  "to": "conversation:xdlq-semantics",
  "properties": {}
 },
 {
  "from": "conversation:repl-compression-canary-review",
  "type": "MENTIONS",
  "to": "feature:replication-zstd-compression",
  "properties": {}
 },
 {
  "from": "conversation:repl-compression-canary-review",
  "type": "MENTIONS",
  "to": "deployment:repl-compression-canary",
  "properties": {}
 },
 {
  "from": "conversation:repl-compression-canary-review",
  "type": "MENTIONS",
  "to": "bug_pattern:iothread-repl-busy-loop",
  "properties": {}
 },
 {
  "from": "conversation:repl-compression-canary-review",
  "type": "MENTIONS",
  "to": "pull_request:redis-15366",
  "properties": {}
 },
 {
  "from": "person:enovak",
  "type": "PARTICIPATED_IN",
  "to": "conversation:repl-compression-canary-review",
  "properties": {}
 },
 {
  "from": "person:sgreco",
  "type": "PARTICIPATED_IN",
  "to": "conversation:repl-compression-canary-review",
  "properties": {}
 },
 {
  "from": "person:lcosta",
  "type": "PARTICIPATED_IN",
  "to": "conversation:repl-compression-canary-review",
  "properties": {}
 },
 {
  "from": "conversation:hotkeys-rollout-review",
  "type": "MENTIONS",
  "to": "feature:hotkey-detection",
  "properties": {}
 },
 {
  "from": "conversation:hotkeys-rollout-review",
  "type": "MENTIONS",
  "to": "component:hotkeys-tracking",
  "properties": {}
 },
 {
  "from": "conversation:hotkeys-rollout-review",
  "type": "MENTIONS",
  "to": "component:topk-sketch",
  "properties": {}
 },
 {
  "from": "conversation:hotkeys-rollout-review",
  "type": "MENTIONS",
  "to": "runbook:hotkey-triage",
  "properties": {}
 },
 {
  "from": "person:aokafor",
  "type": "PARTICIPATED_IN",
  "to": "conversation:hotkeys-rollout-review",
  "properties": {}
 },
 {
  "from": "person:sgreco",
  "type": "PARTICIPATED_IN",
  "to": "conversation:hotkeys-rollout-review",
  "properties": {}
 },
 {
  "from": "conversation:maxmemory-tuning",
  "type": "MENTIONS",
  "to": "config:maxmemory",
  "properties": {}
 },
 {
  "from": "conversation:maxmemory-tuning",
  "type": "MENTIONS",
  "to": "component:eviction",
  "properties": {}
 },
 {
  "from": "conversation:maxmemory-tuning",
  "type": "MENTIONS",
  "to": "component:expire-cycle",
  "properties": {}
 },
 {
  "from": "conversation:maxmemory-tuning",
  "type": "MENTIONS",
  "to": "alert:rss-cow-spike",
  "properties": {}
 },
 {
  "from": "person:aokafor",
  "type": "PARTICIPATED_IN",
  "to": "conversation:maxmemory-tuning",
  "properties": {}
 },
 {
  "from": "person:enovak",
  "type": "PARTICIPATED_IN",
  "to": "conversation:maxmemory-tuning",
  "properties": {}
 },
 {
  "from": "document:replication-topology-notes",
  "type": "DOCUMENTS",
  "to": "component:replication-core",
  "properties": {}
 },
 {
  "from": "document:replication-topology-notes",
  "type": "DOCUMENTS",
  "to": "component:sentinel-core",
  "properties": {}
 },
 {
  "from": "document:replication-topology-notes",
  "type": "DOCUMENTS",
  "to": "component:repl-compression",
  "properties": {}
 },
 {
  "from": "document:replication-topology-notes",
  "type": "DOCUMENTS",
  "to": "feature:rdb-channel-full-sync",
  "properties": {}
 },
 {
  "from": "document:oncall-handbook",
  "type": "DOCUMENTS",
  "to": "component:aof-persistence",
  "properties": {}
 },
 {
  "from": "document:oncall-handbook",
  "type": "DOCUMENTS",
  "to": "component:replication-core",
  "properties": {}
 },
 {
  "from": "document:oncall-handbook",
  "type": "DOCUMENTS",
  "to": "component:cluster-core",
  "properties": {}
 },
 {
  "from": "document:oncall-handbook",
  "type": "DOCUMENTS",
  "to": "component:expire-cycle",
  "properties": {}
 },
 {
  "from": "document:memory-tuning-guide",
  "type": "DOCUMENTS",
  "to": "component:zmalloc-layer",
  "properties": {}
 },
 {
  "from": "document:memory-tuning-guide",
  "type": "DOCUMENTS",
  "to": "component:eviction",
  "properties": {}
 },
 {
  "from": "document:memory-tuning-guide",
  "type": "DOCUMENTS",
  "to": "component:defrag",
  "properties": {}
 },
 {
  "from": "document:memory-tuning-guide",
  "type": "DOCUMENTS",
  "to": "component:lazyfree",
  "properties": {}
 },
 {
  "from": "document:io-threads-architecture-notes",
  "type": "DOCUMENTS",
  "to": "component:io-threads",
  "properties": {}
 },
 {
  "from": "document:io-threads-architecture-notes",
  "type": "DOCUMENTS",
  "to": "component:event-loop",
  "properties": {}
 },
 {
  "from": "document:io-threads-architecture-notes",
  "type": "DOCUMENTS",
  "to": "component:networking",
  "properties": {}
 }
];

export const REDIS_GRAPH_STATS = {
 "nodeCount": 303,
 "edgeCount": 982,
 "labelCounts": {
  "Repository": 2,
  "Service": 4,
  "Component": 79,
  "Interface": 5,
  "ConfigVariable": 33,
  "Feature": 31,
  "Decision": 44,
  "Adapter": 7,
  "Document": 14,
  "DataStore": 2,
  "Dependency": 10,
  "Team": 2,
  "Person": 6,
  "Environment": 3,
  "Cluster": 1,
  "PullRequest": 17,
  "Issue": 7,
  "Preference": 5,
  "BugPattern": 6,
  "Fix": 7,
  "Investigation": 4,
  "Deployment": 3,
  "Runbook": 4,
  "Alert": 3,
  "Conversation": 4
 },
 "edgeTypeCounts": {
  "DEFINED_IN": 4,
  "RELATED_TO": 1,
  "PART_OF": 79,
  "DEPENDS_ON": 328,
  "IMPLEMENTS": 14,
  "CONFIGURES": 35,
  "EXPOSES": 5,
  "PROVIDES": 31,
  "IMPLEMENTED_IN": 46,
  "AFFECTS": 99,
  "USES_ADAPTER": 11,
  "DOCUMENTS": 47,
  "USES": 41,
  "MEMBER_OF": 9,
  "OWNED_BY": 32,
  "AUTHORED": 33,
  "TOUCHED": 56,
  "RESOLVES": 12,
  "MENTIONS": 35,
  "SUPERSEDES": 2,
  "POLICY_APPLIES_TO": 15,
  "REPRODUCES": 9,
  "ATTEMPTED_FIX_FAILED": 1,
  "DELIVERS": 5,
  "VERIFIED": 6,
  "INVESTIGATES": 4,
  "DEPLOYED_TO": 5,
  "HOSTED_ON": 1,
  "DEPLOYS": 3,
  "WATCHES": 3,
  "PARTICIPATED_IN": 10
 },
 "topEntities": [
  {
   "entity_key": "service:redis-server",
   "labels": [
    "Service"
   ],
   "name": "redis-server",
   "degree": 118
  },
  {
   "entity_key": "component:server-core",
   "labels": [
    "Component"
   ],
   "name": "Server Core",
   "degree": 45
  },
  {
   "entity_key": "component:replication-core",
   "labels": [
    "Component"
   ],
   "name": "Replication Core",
   "degree": 36
  },
  {
   "entity_key": "component:keyspace",
   "labels": [
    "Component"
   ],
   "name": "Keyspace (db.c)",
   "degree": 34
  },
  {
   "entity_key": "component:cluster-core",
   "labels": [
    "Component"
   ],
   "name": "Cluster Core (implementation-agnostic layer)",
   "degree": 33
  },
  {
   "entity_key": "component:module-system",
   "labels": [
    "Component"
   ],
   "name": "Redis Module System",
   "degree": 33
  },
  {
   "entity_key": "component:networking",
   "labels": [
    "Component"
   ],
   "name": "Client Networking",
   "degree": 30
  },
  {
   "entity_key": "component:zmalloc-layer",
   "labels": [
    "Component"
   ],
   "name": "zmalloc Allocation Layer",
   "degree": 30
  },
  {
   "entity_key": "component:aof-persistence",
   "labels": [
    "Component"
   ],
   "name": "AOF Persistence",
   "degree": 30
  },
  {
   "entity_key": "component:rdb-persistence",
   "labels": [
    "Component"
   ],
   "name": "RDB Persistence",
   "degree": 26
  }
 ]
} as const;

// The per-node relationship metadata (inspector + expand-frontier UX) is fully
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
);
