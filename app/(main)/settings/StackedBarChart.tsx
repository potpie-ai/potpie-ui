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

const labels = ["15 FEB", "16 FEB", "17 FEB", "18 FEB", "19 FEB", "20 FEB", "21 FEB"];

const data = {
  labels,
  datasets: [
    {
      label: "Others",
      data: [30, 60, 70, 50, 70, 75, 115],
      backgroundColor: "#1e1b4b",
    },
    {
      label: "Project 3",
      data: [30, 60, 85, 70, 80, 90, 120],
      backgroundColor: "#3b6fa0",
    },
    {
      label: "Project 2",
      data: [35, 45, 55, 40, 55, 65, 90],
      backgroundColor: "#4ade80",
    },
    {
      label: "Project 1",
      data: [40, 45, 50, 40, 55, 55, 90],
      backgroundColor: "#bbf7d0",
    },
  ],
};

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

export default function StackedBarChart() {
  return <Bar data={data} options={options} />;
}
