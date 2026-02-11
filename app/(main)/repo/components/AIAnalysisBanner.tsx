"use client";

export default function AIAnalysisBanner() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 px-4 py-3 mb-6">
      <p className="text-sm text-zinc-600 leading-relaxed">
        The AI agent has analyzed your requirements and made assumptions for each question. Questions marked with &apos;Needs Input&apos; require your confirmation.
      </p>
    </div>
  );
}
