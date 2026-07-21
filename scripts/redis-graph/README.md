# Redis demo pot — graph dataset pipeline

Source data and assembler for `lib/mock/redisGraph.ts`, the hand-authored
project-memory graph the demo "Redis" pot renders on its Graph tab.

- `*.json` — subsystem surveys extracted from the actual redis/redis source
  tree by a multi-agent workflow (one file per subsystem), plus `history.json`
  (real PR history) and `narrative.json` (personas, ownership, decisions,
  bug/fix arcs, the Streams DLQ storyline).
- `assemble.mjs` — deterministic merge/validate/emit. Regenerate with:

  ```sh
  node scripts/redis-graph/assemble.mjs        # rewrites lib/mock/redisGraph.ts
  node scripts/redis-graph/assemble.mjs --dry  # validate + stats only
  ```

Edit the JSONs (or the curation lists at the top of `assemble.mjs`), then
re-run — don't hand-edit the generated TS.
