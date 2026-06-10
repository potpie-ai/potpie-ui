// Activity timeline vocabulary. The verb_class values mirror the backend
// ontology (code_change / deployment / alert / discussion / decision).

export const WINDOW_OPTIONS = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
] as const;

export const DEFAULT_WINDOW = "14d";

export const VERB_CLASSES = [
  "code_change",
  "deployment",
  "alert",
  "discussion",
  "decision",
] as const;

export const VERB_CLASS_LABELS: Record<string, string> = {
  code_change: "Code change",
  deployment: "Deploy",
  alert: "Alert",
  discussion: "Discussion",
  decision: "Decision",
};

// Chip classes per kind — mirrors the events screen STATUS_COLORS palette.
const FALLBACK_COLOR = "bg-slate-500/15 text-slate-700 border-slate-400/40";
export const VERB_CLASS_COLORS: Record<string, string> = {
  code_change: "bg-blue-500/15 text-blue-700 border-blue-400/40",
  deployment: "bg-green-500/15 text-green-700 border-green-400/40",
  alert: "bg-red-500/15 text-red-700 border-red-400/40",
  discussion: "bg-amber-500/15 text-amber-700 border-amber-400/40",
  decision: "bg-purple-500/15 text-purple-700 border-purple-400/40",
};

export function verbClassLabel(kind: string | null | undefined): string {
  if (!kind) return "Activity";
  return VERB_CLASS_LABELS[kind] ?? kind;
}

export function verbClassColor(kind: string | null | undefined): string {
  if (!kind) return FALLBACK_COLOR;
  return VERB_CLASS_COLORS[kind] ?? FALLBACK_COLOR;
}
