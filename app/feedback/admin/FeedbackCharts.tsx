"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ChartOptions,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { FC, useMemo } from "react";

import type { AdminSummary, ComparisonStats, ModelCounts } from "../types";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
);

// Match the page palette: primary (Potpie), amber (Copilot), blue (tie), rose (neither).
const COLORS = {
  potpie: "#295245",
  copilot: "#F59E0B",
  tie: "#60A5FA",
  neither: "#FB7185",
} as const;

const TYPOGRAPHY_FAMILY =
  "var(--font-geist-sans), system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

function truncate(text: string, max = 56): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

const sharedLegend = {
  position: "bottom" as const,
  align: "center" as const,
  labels: {
    color: "#022D2C",
    font: { size: 11, family: TYPOGRAPHY_FAMILY },
    boxWidth: 10,
    boxHeight: 10,
    borderRadius: 3,
    useBorderRadius: true,
    padding: 14,
  },
};

const sharedTooltip = {
  backgroundColor: "#022D2C",
  titleFont: { family: TYPOGRAPHY_FAMILY, size: 12, weight: "bold" as const },
  bodyFont: { family: TYPOGRAPHY_FAMILY, size: 12 },
  padding: 10,
  cornerRadius: 8,
  displayColors: true,
};

const OverallDonut: FC<{ counts: ModelCounts }> = ({ counts }) => {
  const data = {
    labels: ["Potpie", "Copilot", "Tie", "Neither"],
    datasets: [
      {
        data: [counts.potpie, counts.copilot, counts.tie, counts.neither],
        backgroundColor: [
          COLORS.potpie,
          COLORS.copilot,
          COLORS.tie,
          COLORS.neither,
        ],
        borderColor: "#FFF9F5",
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const total = counts.total;
  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "62%",
    plugins: {
      legend: sharedLegend,
      tooltip: {
        ...sharedTooltip,
        callbacks: {
          label(ctx) {
            const value = (ctx.raw as number) ?? 0;
            const pct = total ? Math.round((value / total) * 100) : 0;
            return ` ${ctx.label}: ${value} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="relative h-[260px] w-full">
      <Doughnut data={data} options={options} />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center -translate-y-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-text">
          Votes
        </span>
        <span
          className="text-3xl font-semibold text-foreground-color"
          style={{ fontFamily: "var(--font-uncut)" }}
        >
          {total}
        </span>
      </div>
    </div>
  );
};

const PerQuestionStacked: FC<{ rows: ComparisonStats[] }> = ({ rows }) => {
  // Filter out questions with no votes so the chart stays meaningful.
  const visible = useMemo(
    () => rows.filter((row) => row.counts.total > 0),
    [rows],
  );

  const labels = visible.map((row) => truncate(row.question, 56));
  const datasets = [
    {
      label: "Potpie",
      data: visible.map((row) => row.counts.potpie),
      backgroundColor: COLORS.potpie,
      borderRadius: 6,
      borderSkipped: false,
      maxBarThickness: 22,
    },
    {
      label: "Copilot",
      data: visible.map((row) => row.counts.copilot),
      backgroundColor: COLORS.copilot,
      borderRadius: 6,
      borderSkipped: false,
      maxBarThickness: 22,
    },
    {
      label: "Tie",
      data: visible.map((row) => row.counts.tie),
      backgroundColor: COLORS.tie,
      borderRadius: 6,
      borderSkipped: false,
      maxBarThickness: 22,
    },
    {
      label: "Neither",
      data: visible.map((row) => row.counts.neither),
      backgroundColor: COLORS.neither,
      borderRadius: 6,
      borderSkipped: false,
      maxBarThickness: 22,
    },
  ];

  const options: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    scales: {
      x: {
        stacked: true,
        grid: { color: "rgba(2,45,44,0.05)" },
        border: { display: false },
        ticks: {
          color: "#656969",
          font: { size: 11, family: TYPOGRAPHY_FAMILY },
          precision: 0,
        },
      },
      y: {
        stacked: true,
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: "#022D2C",
          font: { size: 11, family: TYPOGRAPHY_FAMILY },
          autoSkip: false,
          callback(value) {
            const label = labels[value as number];
            return label ?? "";
          },
        },
      },
    },
    plugins: {
      legend: sharedLegend,
      tooltip: {
        ...sharedTooltip,
        callbacks: {
          title(items) {
            const idx = items[0]?.dataIndex ?? -1;
            if (idx < 0) return "";
            return visible[idx]?.question ?? "";
          },
        },
      },
    },
  };

  // Dynamic height: ~44px per bar with a sensible floor.
  const height = Math.max(160, visible.length * 44 + 64);

  if (visible.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-text">
        No votes yet — chart will appear once submissions arrive.
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <Bar data={{ labels, datasets }} options={options} />
    </div>
  );
};

export const FeedbackCharts: FC<{ summary: AdminSummary }> = ({ summary }) => (
  <div className="grid gap-4 lg:grid-cols-5">
    <section className="rounded-2xl border border-border-light bg-card p-5 shadow-[0_10px_30px_-22px_rgba(2,45,44,0.2)] lg:col-span-2">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground-color">
          Overall split
        </h3>
        <span className="text-[11px] text-muted-text">
          {summary.unique_voters} voter
          {summary.unique_voters === 1 ? "" : "s"}
        </span>
      </header>
      <OverallDonut counts={summary.by_model} />
    </section>

    <section className="rounded-2xl border border-border-light bg-card p-5 shadow-[0_10px_30px_-22px_rgba(2,45,44,0.2)] lg:col-span-3">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground-color">
          Per-question breakdown
        </h3>
        <span className="text-[11px] text-muted-text">
          Stacked counts &middot; Potpie / Copilot / Tie / Neither
        </span>
      </header>
      <PerQuestionStacked rows={summary.by_comparison} />
    </section>
  </div>
);
