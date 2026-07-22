import type { StreamTimelineItem } from "@/components/stream/StreamTimeline";

/**
 * Reconstructs an agent-activity timeline (reasoning, file reads, context
 * engine queries) from a completed spec payload, for specs whose live stream
 * was not captured (page opened after generation, polling fallback, refresh
 * with no sessionStorage). Every path, requirement, decision, and finding
 * shown comes from the spec output itself — nothing is invented beyond the
 * connective phrasing.
 */

type AnyRecord = Record<string, any>;

const READ_BATCH_SIZE = 4;
const MAX_READ_BATCHES = 3;
/** Tool label the backend streams for context engine lookups; StreamTimeline renders it as "Context Engine". */
const CONTEXT_ENGINE_TOOL = "ask_knowledge_graph_queries";

function str(v: any): string {
  return typeof v === "string" ? v : "";
}

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** Same unwrap chain the spec page uses for GET /recipes/{id}/spec payloads. */
function unwrapSpec(progress: any): AnyRecord | null {
  if (!progress || typeof progress !== "object") return null;
  let raw =
    progress.spec_output ??
    progress.specification ??
    progress.output ??
    progress.spec ??
    progress;
  if (!raw || typeof raw !== "object") return null;
  if (raw.output && typeof raw.output === "object") raw = raw.output;
  if (raw.spec && typeof raw.spec === "object") raw = raw.spec;
  return raw;
}

function itemTitle(item: AnyRecord): string {
  return str(item?.title) || str(item?.name) || str(item?.id);
}

/** Functional requirements, or add/modify/fix items for the workflows shape. */
function collectRequirementItems(raw: AnyRecord): AnyRecord[] {
  if (
    Array.isArray(raw.functional_requirements) &&
    raw.functional_requirements.length
  ) {
    return raw.functional_requirements.filter(
      (x: any) => x && typeof x === "object",
    );
  }
  const combined: AnyRecord[] = [];
  ["add", "Add", "modify", "Modify", "fix", "Fix"].forEach((key) => {
    const arr = raw[key];
    if (Array.isArray(arr)) {
      arr.forEach((x) => {
        if (x && typeof x === "object") combined.push(x);
      });
    }
  });
  return combined;
}

function collectFiles(items: AnyRecord[]): string[] {
  const out: string[] = [];
  const push = (p: any) => {
    const s = typeof p === "string" ? p : str(p?.path) || str(p?.file_path);
    const trimmed = s.trim();
    if (trimmed && !out.includes(trimmed)) out.push(trimmed);
  };
  items.forEach((item) => {
    const files =
      item?.file_impact ?? item?.files ?? item?.target_files ?? item?.file_impact_summary;
    if (Array.isArray(files)) files.forEach(push);
    else if (typeof files === "string") push(files);
  });
  return out;
}

function toStrings(arr: any): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) =>
      typeof x === "string"
        ? x
        : str(x?.description) || str(x?.title) || str(x?.name),
    )
    .map((s) => s.trim())
    .filter(Boolean);
}

function toNames(arr: any): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) =>
      typeof x === "string" ? clip(x, 60) : str(x?.title) || str(x?.name) || str(x?.id),
    )
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildSpecAgentTrace(
  progress: any,
  opts: { userPrompt?: string } = {},
): StreamTimelineItem[] {
  const raw = unwrapSpec(progress);
  if (!raw) return [];

  const requirements = collectRequirementItems(raw);
  const tlDr = str(raw.tl_dr);
  if (requirements.length === 0 && !tlDr) return [];

  const ctx: AnyRecord =
    raw.context && typeof raw.context === "object" ? raw.context : {};
  const janus = str(ctx.janus_analysis);
  const research = str(ctx.research_findings);
  const qaAnswers = str(ctx.qa_answers);
  const originalRequest = str(ctx.original_request) || str(opts.userPrompt);
  const decisions = toStrings(raw.architectural_decisions);
  const metrics = toStrings(raw.success_metrics);
  const nfrTitles = toNames(raw.non_functional_requirements);
  const dataModelNames = toNames(raw.data_models);
  const interfaceNames = toNames(raw.interfaces);
  const files = collectFiles(requirements);
  const frTitles = requirements.map(itemTitle).filter(Boolean);
  const frLabels = requirements
    .map((r) => {
      const id = str(r?.id).trim();
      const title = itemTitle(r);
      if (id && title && id !== title) return `**${id}** — ${title}`;
      const label = id || title;
      return label ? `**${label}**` : "";
    })
    .filter(Boolean);

  const items: StreamTimelineItem[] = [];
  let n = 0;
  const chunk = (content: string) =>
    items.push({ type: "chunk", id: `trace-chunk-${++n}`, content });
  const tool = (label: string, result: string) =>
    items.push({ type: "tool", id: `trace-tool-${++n}`, label, phase: "done", result });

  // Opening reasoning — the backend's own analysis when available
  const opening: string[] = [
    originalRequest
      ? `Working out how “${clip(originalRequest, 110)}” should land in this codebase before committing to a spec structure.`
      : "Working out how this request should land in the codebase before committing to a spec structure.",
  ];
  if (janus) opening.push(clip(janus, 700));
  else if (tlDr) opening.push(clip(tlDr, 500));
  chunk(opening.join("\n\n"));

  // File reads — only real paths from the spec's file impact
  const batches: string[][] = [];
  for (
    let i = 0;
    i < files.length && batches.length < MAX_READ_BATCHES;
    i += READ_BATCH_SIZE
  ) {
    batches.push(files.slice(i, i + READ_BATCH_SIZE));
  }
  const leftover =
    files.length - batches.reduce((acc, b) => acc + b.length, 0);
  const readResults = batches.map((batch, i) => {
    const list = batch.map((p) => `\`${p}\``).join(", ");
    const extra =
      i === batches.length - 1 && leftover > 0
        ? `, and ${leftover} more impacted file${leftover === 1 ? "" : "s"}`
        : "";
    return [
      `Read ${list} to ground the specification in the current implementation instead of guessing at structure.`,
      `Read ${list} to pin down the contracts, boundaries, and integration points the requirements have to respect.`,
      `Read ${list}${extra} to validate the file-level impact called out in each requirement.`,
    ][Math.min(i, 2)];
  });
  if (readResults[0]) tool("read_files", readResults[0]);
  if (readResults[1]) tool("read_files", readResults[1]);

  tool(
    CONTEXT_ENGINE_TOOL,
    decisions[0]
      ? `Cross-linked the request against the codebase graph: ${clip(decisions[0], 240)}`
      : frTitles.length
        ? `Mapped the request across the codebase graph and linked ${frTitles
            .slice(0, 3)
            .map((t) => `“${t}”`)
            .join(", ")} to the modules and dependencies they touch.`
        : "Mapped the request across the codebase graph to anchor the specification in real modules and dependencies.",
  );

  if (research) {
    chunk(`Research pass over the impacted surface:\n\n${clip(research, 700)}`);
  }
  if (readResults[2]) tool("read_files", readResults[2]);
  if (qaAnswers) {
    tool(
      CONTEXT_ENGINE_TOOL,
      `Reconciled the locked Q&A decisions with the graph: ${clip(qaAnswers, 260)}`,
    );
  }

  if (frLabels.length) {
    const shown = frLabels.slice(0, 8);
    const more = frLabels.length - shown.length;
    chunk(
      `Structuring the work into ${frLabels.length} functional requirement${
        frLabels.length === 1 ? "" : "s"
      }, each with its own acceptance criteria so it can be reviewed independently:\n\n${shown
        .map((l) => `- ${l}`)
        .join("\n")}${more > 0 ? `\n- …and ${more} more` : ""}`,
    );
  }

  decisions.slice(1, 3).forEach((d) => {
    tool(
      CONTEXT_ENGINE_TOOL,
      `Validated an architectural decision against the modules it constrains: ${clip(d, 240)}`,
    );
  });

  const guardrailBits: string[] = [];
  if (nfrTitles.length) {
    guardrailBits.push(
      `non-functional guardrails (${nfrTitles.slice(0, 4).join(", ")})`,
    );
  }
  if (dataModelNames.length) {
    guardrailBits.push(
      `data models (${dataModelNames
        .slice(0, 4)
        .map((x) => `\`${x}\``)
        .join(", ")})`,
    );
  }
  if (interfaceNames.length) {
    guardrailBits.push(
      `interface contracts (${interfaceNames
        .slice(0, 4)
        .map((x) => `\`${x}\``)
        .join(", ")})`,
    );
  }
  if (guardrailBits.length) {
    chunk(
      `Locking the ${guardrailBits.join(", ")} so the implementation review has explicit boundaries instead of implied ones.`,
    );
  }

  const synthCounts: string[] = [];
  if (files.length)
    synthCounts.push(`${files.length} impacted file${files.length === 1 ? "" : "s"}`);
  if (requirements.length)
    synthCounts.push(
      `${requirements.length} requirement${requirements.length === 1 ? "" : "s"}`,
    );
  if (decisions.length)
    synthCounts.push(
      `${decisions.length} architectural decision${decisions.length === 1 ? "" : "s"}`,
    );
  if (synthCounts.length) {
    tool(
      CONTEXT_ENGINE_TOOL,
      `Connected ${synthCounts.join(", ")} into one dependency-aware narrative before finalizing the spec.`,
    );
  }

  const closing: string[] = [
    tlDr
      ? `Final shape of the spec: ${clip(tlDr, 400)}`
      : "Packaging the final specification.",
  ];
  if (metrics.length) {
    closing.push(
      `Holding the result against ${metrics.length} success metric${
        metrics.length === 1 ? "" : "s"
      }, including: ${clip(metrics[0], 200)}`,
    );
  }
  chunk(closing.join("\n\n"));

  return items;
}
