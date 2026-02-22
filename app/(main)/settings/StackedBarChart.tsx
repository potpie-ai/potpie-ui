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

const options: ChartOptions<"bar"> = {
  plugins: {
    legend: {
      position: "top",
      align: "end",
      labels: {
        boxWidth: 12,
        boxHeight: 12,
        borderRadius: 3,
        useBorderRadius: true,
        font: { size: 12 },
        color: "#6b7280",
      },
    },
    title: {
      display: true,
      text: "Tokens Used",
      align: "start",
      color: "#111827",
      font: { size: 14, weight: "bold" },
      padding: { bottom: 16 },
    },
    tooltip: { mode: "index", intersect: false },
  },
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      ticks: { color: "#9ca3af", font: { size: 11 } },
      border: { display: false },
    },
    y: {
      stacked: true,
      grid: { color: "#f3f4f6", drawTicks: false },
      ticks: {
        color: "#9ca3af",
        font: { size: 11 },
        maxTicksLimit: 5,
        padding: 8,
      },
      border: { display: false, dash: [4, 4] },
    },
  },
};

export default function StackedBarChart({ labels, datasets }: StackedBarChartProps) {
  return <Bar data={{ labels, datasets }} options={options} />;
}
