"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Dataset {
  label: string;
  data: number[];
  backgroundColor: string;
}

interface StackedBarChartProps {
  labels: string[];
  datasets: Dataset[];
}

const baseOptions: ChartOptions<"bar"> = {
  plugins: {
    legend: {
      position: "top",
      align: "end",
      labels: {
        boxWidth: 12,
        boxHeight: 12,
        borderRadius: 3,
        useBorderRadius: true,
        font: {
          size: 12,
          family:
            "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        },
        color: "#6b7280",
      },
    },
    title: {
      display: true,
      text: "Tokens Used",
      align: "start",
      color: "#111827",
      font: {
        size: 14,
        weight: "bold",
        family:
          "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      },
      padding: { bottom: 16 },
    },
    tooltip: {
      mode: "index",
      intersect: false,
      bodyFont: {
        family:
          "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      },
      titleFont: {
        family:
          "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      },
    },
  },
  responsive: true,
  maintainAspectRatio: false,
};

export default function StackedBarChart({ labels, datasets }: StackedBarChartProps) {
  const chartData = {
    labels,
    datasets: datasets.map((d) => ({
      label: d.label,
      data: d.data,
      backgroundColor: d.backgroundColor,
    })),
  };

  const pointsCount = labels.length;
  const maxStackedTotal =
    pointsCount === 0
      ? 0
      : Math.max(
          ...Array.from({ length: pointsCount }, (_, idx) =>
            datasets.reduce((sum, d) => sum + (d.data[idx] ?? 0), 0)
          )
        );

  const scaledMax =
    maxStackedTotal === 0
      ? 10
      : maxStackedTotal <= 10
        ? maxStackedTotal * 4
        : maxStackedTotal <= 50
          ? maxStackedTotal * 2
          : maxStackedTotal * 1.2;

  const options: ChartOptions<"bar"> = {
    ...baseOptions,
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: {
          color: "#9ca3af",
          font: {
            size: 11,
            family:
              "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          },
          maxRotation: 0,
          autoSkip: false,
        },
        border: { display: false },
      },
      y: {
        stacked: true,
        grid: { color: "#f3f4f6", drawTicks: false },
        ticks: {
          color: "#9ca3af",
            font: {
              size: 11,
              family:
                "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            },
          maxTicksLimit: 5,
          padding: 8,
        },
        border: { display: false, dash: [4, 4] },
        beginAtZero: true,
        max: scaledMax,
      },
    },
  };

  return (
    <div className="h-[300px] w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
}
