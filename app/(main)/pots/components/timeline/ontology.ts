// Verb-class ontology for the pot activity timeline.
//
// Every timeline event carries a `verb_class` (pr_merged, deploy_succeeded,
// alert_fired, …). Each verb maps to one of the graph ontology categories so
// the timeline speaks the same colour language as the graph screen: amber =
// change & decision, emerald = delivery & operations, rose = debugging &
// reliability, indigo = knowledge & evidence.

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CheckCircle2,
  CircleDot,
  Eye,
  Flame,
  GitCommit,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  MessagesSquare,
  Rocket,
  ShieldCheck,
  Siren,
  Tag,
  Undo2,
} from "lucide-react";
import type { CategoryKey } from "../graph/ontology";

export type VerbMeta = {
  /** Human verb, e.g. "merged" — reads as "<actor> <verb> <title>". */
  label: string;
  icon: LucideIcon;
  category: CategoryKey;
};

export const VERB_META: Record<string, VerbMeta> = {
  pr_opened: { label: "opened PR", icon: GitPullRequest, category: "change_decision" },
  pr_merged: { label: "merged PR", icon: GitMerge, category: "change_decision" },
  pr_closed: { label: "closed PR", icon: GitPullRequestClosed, category: "change_decision" },
  pr_review_commented: { label: "reviewed", icon: Eye, category: "change_decision" },
  pr_review_approved: { label: "approved", icon: CheckCircle2, category: "change_decision" },
  commit_pushed: { label: "pushed", icon: GitCommit, category: "change_decision" },
  github_issue_opened: { label: "opened issue", icon: CircleDot, category: "change_decision" },
  github_issue_closed: { label: "closed issue", icon: CheckCircle2, category: "change_decision" },
  deploy_succeeded: { label: "deployed", icon: Rocket, category: "delivery_operations" },
  deploy_rolled_back: { label: "rolled back", icon: Undo2, category: "delivery_operations" },
  release_published: { label: "released", icon: Tag, category: "delivery_operations" },
  alert_fired: { label: "alert fired", icon: Siren, category: "debugging_reliability" },
  alert_resolved: { label: "alert resolved", icon: ShieldCheck, category: "debugging_reliability" },
  incident_opened: { label: "incident opened", icon: Flame, category: "debugging_reliability" },
  incident_resolved: { label: "incident resolved", icon: ShieldCheck, category: "debugging_reliability" },
  discussion_posted: { label: "posted", icon: MessagesSquare, category: "knowledge_evidence" },
};

const FALLBACK_VERB_META: VerbMeta = {
  label: "activity",
  icon: Activity,
  // Unknown verbs read as generic knowledge signals rather than inventing a
  // fifth colour the legend never explains.
  category: "knowledge_evidence",
};

export function verbMeta(verb: string | null | undefined): VerbMeta {
  if (!verb) return FALLBACK_VERB_META;
  return (
    VERB_META[verb] ?? {
      ...FALLBACK_VERB_META,
      label: verb.replaceAll("_", " "),
    }
  );
}

/** Fixed category order for the density strip stacking and filter groups. */
export const TIMELINE_CATEGORY_ORDER: CategoryKey[] = [
  "change_decision",
  "delivery_operations",
  "knowledge_evidence",
  "debugging_reliability",
];

// Density-strip fills, validated with the dataviz palette checker against the
// pot-theme surfaces (#fafcfb light / #0c1516 dark). The stack order above is
// part of the validation: emerald and rose must not sit adjacent (their CVD
// ΔE fails), so knowledge_evidence separates them. Dark mode uses the darker
// -600 amber/emerald steps to stay inside the dark lightness band.
export const STRIP_FILL_LIGHT: Record<string, string> = {
  change_decision: "#f59e0b",
  delivery_operations: "#10b981",
  knowledge_evidence: "#6366f1",
  debugging_reliability: "#f43f5e",
};

export const STRIP_FILL_DARK: Record<string, string> = {
  change_decision: "#d97706",
  delivery_operations: "#059669",
  knowledge_evidence: "#6366f1",
  debugging_reliability: "#f43f5e",
};

export function stripFill(category: CategoryKey, dark: boolean): string {
  return (dark ? STRIP_FILL_DARK : STRIP_FILL_LIGHT)[category] ?? "#94a3b8";
}

// Tailwind tint classes for the row icon discs — written out literally so the
// JIT compiler sees them. Hues match CATEGORY_META dots.
const CATEGORY_TINT: Record<string, { icon: string; disc: string }> = {
  change_decision: {
    icon: "text-amber-600 dark:text-amber-400",
    disc: "bg-amber-500/10 border-amber-500/30",
  },
  delivery_operations: {
    icon: "text-emerald-600 dark:text-emerald-400",
    disc: "bg-emerald-500/10 border-emerald-500/30",
  },
  knowledge_evidence: {
    icon: "text-indigo-600 dark:text-indigo-400",
    disc: "bg-indigo-500/10 border-indigo-500/30",
  },
  debugging_reliability: {
    icon: "text-rose-600 dark:text-rose-400",
    disc: "bg-rose-500/10 border-rose-500/30",
  },
};

const FALLBACK_TINT = {
  icon: "text-slate-600 dark:text-slate-400",
  disc: "bg-slate-500/10 border-slate-500/30",
};

export function categoryTint(category: CategoryKey): {
  icon: string;
  disc: string;
} {
  return CATEGORY_TINT[category] ?? FALLBACK_TINT;
}

// ---- Fetch config -----------------------------------------------------------

export const TIMELINE_WINDOWS = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "180d", label: "180d" },
  { value: "all", label: "All" },
] as const;

export type TimelineWindow = (typeof TIMELINE_WINDOWS)[number]["value"];

export const DEFAULT_TIMELINE_WINDOW: TimelineWindow = "30d";

/** Backend caps the timeline read at 50 rows; demo pots ignore it. */
export const TIMELINE_FETCH_LIMIT = 50;
