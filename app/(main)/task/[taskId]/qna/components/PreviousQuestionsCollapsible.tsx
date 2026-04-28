"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { MCQQuestion } from "@/types/question";
import type { QuestionAnswer } from "@/types/question";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

function formatAnswerSnippet(
  q: MCQQuestion,
  ans?: QuestionAnswer,
): string {
  if (!ans) return "—";
  if (ans.isOther && ans.otherText?.trim()) return `Other: ${ans.otherText.trim()}`;
  const opts = Array.isArray(q.options)
    ? q.options.map((o) => (typeof o === "string" ? { label: o } : o))
    : [];
  if (opts.length === 0) {
    const t = ans.textAnswer?.trim();
    if (t) return t;
    return ans.mcqAnswer?.trim() || "—";
  }
  if (q.multipleChoice && ans.selectedOptionIndices?.length) {
    const labels = ans.selectedOptionIndices
      .filter((i) => i >= 0 && i < opts.length)
      .map((i) =>
        typeof opts[i] === "string" ? opts[i] : (opts[i] as { label: string }).label,
      )
      .filter(Boolean)
      .join(", ");
    if (labels) return labels;
  }
  if (ans.selectedOptionIdx != null && ans.selectedOptionIdx >= 0 && ans.selectedOptionIdx < opts.length) {
    const o = opts[ans.selectedOptionIdx];
    return typeof o === "string" ? o : o.label;
  }
  const txt = ans.textAnswer?.trim();
  if (txt && !txt.startsWith("Other:")) return txt;
  return ans.mcqAnswer?.trim() || "—";
}

interface PreviousQuestionsCollapsibleProps {
  /** Questions from earlier batches (answered / read-only) */
  questions: MCQQuestion[];
  answers: Map<string, QuestionAnswer>;
}

/**
 * Collapsed summary for prior batches in multi-batch Q&A; expandable for review.
 */
export default function PreviousQuestionsCollapsible({
  questions,
  answers,
}: PreviousQuestionsCollapsibleProps) {
  const [open, setOpen] = useState(false);

  if (questions.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-50/80 rounded-lg">
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 ${
              open ? "rotate-90" : ""
            }`}
            aria-hidden
          />
          <span className="flex-1">
            Previous questions · {questions.length}{" "}
            {questions.length === 1 ? "question" : "questions"}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-3 border-t border-zinc-100 px-4 py-3">
            {questions.map((q) => (
              <div
                key={q.id}
                className="rounded-md bg-zinc-50/90 px-3 py-2.5 text-xs text-zinc-800"
              >
                <p className="font-medium text-zinc-900 leading-snug">{q.question}</p>
                <p className="mt-1.5 text-zinc-600 leading-relaxed whitespace-pre-wrap break-words">
                  {formatAnswerSnippet(q, answers.get(q.id))}
                </p>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
