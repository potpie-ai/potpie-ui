"use client";

interface QuestionProgressProps {
  total: number;
  answered: number;
  skipped?: number;
}

export default function QuestionProgress({ total, answered, skipped = 0 }: QuestionProgressProps) {
  if (total === 0 && skipped === 0) return null;

  const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="text-xs text-zinc-500">
        <span className="font-bold text-zinc-900">{answered}</span>
        <span className="text-zinc-400">/{total}</span>
        {skipped > 0 && (
          <span className="text-zinc-400 ml-1.5">
            ({skipped} skipped)
          </span>
        )}
      </div>
      <div className="w-24 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-zinc-900 transition-all duration-300 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs font-bold text-zinc-900 min-w-[2.5rem] text-right">{percentage}%</div>
    </div>
  );
}
