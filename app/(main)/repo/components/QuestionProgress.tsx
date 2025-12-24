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
      <div className="text-sm text-gray-600">
        <span>{answered} of {total} answered</span>
        {skipped > 0 && (
          <span className="text-gray-400 ml-1">
            ({skipped} skipped)
          </span>
        )}
      </div>
      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-sm font-medium text-gray-900">{percentage}%</div>
    </div>
  );
}


