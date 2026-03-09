"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { CalendarIcon, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import getHeaders from "@/app/utils/headers.util";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import SettingsService, {
  type TokensByDayItem,
  type AnalyticsSummary,
} from "@/services/SettingsService";
import dayjs from "dayjs";

const StackedBarChart = dynamic(() => import("./StackedBarChart"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">
      Loading chart…
    </div>
  ),
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

// ── Heatmap helpers ────────────────────────────────────────────────────────────
function intensityColor(val: number): string {
  if (val === 0) return "bg-gray-200";
  if (val < 0.25) return "bg-emerald-100";
  if (val < 0.5) return "bg-emerald-300";
  if (val < 0.75) return "bg-emerald-400";
  return "bg-emerald-600";
}

const HEATMAP_ROWS = 4;
const HEATMAP_COLS = 9;

/** Build heatmap grid from daily token usage. Each cell = that day's tokens normalized 0–1 by max in period. */
function buildIntensityData(
  dailyTokens: { date: string; tokens: number }[]
): number[][] {
  const sorted = [...dailyTokens].sort((a, b) => a.date.localeCompare(b.date));
  const maxTokens = Math.max(1, ...sorted.map((d) => d.tokens));
  const grid: number[][] = [];
  for (let r = 0; r < HEATMAP_ROWS; r++) {
    const row: number[] = [];
    for (let c = 0; c < HEATMAP_COLS; c++) {
      const i = r * HEATMAP_COLS + c;
      const cell = sorted[i];
      const normalized = cell ? cell.tokens / maxTokens : 0;
      row.push(normalized);
    }
    grid.push(row);
  }
  return grid;
}

interface TokenIntensityGridProps {
  intensityData: number[][];
}

function TokenIntensityGrid({ intensityData }: TokenIntensityGridProps) {
  return (
    <div className="mb-5 pt-8 w-full flex items-center justify-start">
      <div
        className="grid gap-x-2 gap-y-2 w-fit max-w-full -ml-1"
        style={{
          gridTemplateColumns: `repeat(${HEATMAP_COLS}, auto)`,
        }}
      >
        {intensityData.map((row, ri) =>
          row.map((val, ci) => (
            <div
              key={`${ri}-${ci}`}
              className="rounded-xs w-11 h-11 sm:w-11 sm:h-11"
              style={{ backgroundColor: intensityColor(val) }}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Date range & chart data ───────────────────────────────────────────────────
function getDateRange(range: string): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (range === "last_week") {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  }
  return {
    startDate: start.toLocaleDateString("en-CA"),
    endDate: end.toLocaleDateString("en-CA"),
  };
}

const CHART_COLORS = ["#2B1C37", "#366C9F", "#7FD7AF", "#D8F2DF"];

function parseDateISO(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function formatDateISO(date: Date): string {
  return date.toLocaleDateString("en-CA");
}

function formatDisplayDate(dateStr: string): string {
  const d = dayjs(dateStr);
  if (!d.isValid()) return dateStr;
  return d.format("D MMM").toUpperCase();
}

function getAllDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = parseDateISO(startDate);
  const end = parseDateISO(endDate);

  while (current <= end) {
    dates.push(formatDateISO(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function getWeekStartDatesInRange(startDate: string, endDate: string): string[] {
  const weekStarts: string[] = [];
  let current = parseDateISO(startDate);
  const end = parseDateISO(endDate);

  while (current <= end) {
    weekStarts.push(formatDateISO(current));
    current.setDate(current.getDate() + 7);
  }

  return weekStarts;
}

function buildChartData(
  items: TokensByDayItem[]
  ,
  range: string,
  startDate?: string,
  endDate?: string,
  resolveProjectLabel?: (projectId: string) => string | undefined
): { labels: string[]; datasets: { label: string; data: number[]; backgroundColor: string }[] } {
  const byDate = new Map<string, Map<string, number>>();
  const projectLastSeen = new Map<string, string>(); // projectId -> latest date (ISO)
  const projectTotals = new Map<string, number>(); // projectId -> total tokens across range
  for (const item of items) {
    const projectKey = item.project_id ?? "__others__";
    if (!byDate.has(item.date)) byDate.set(item.date, new Map());
    const dayMap = byDate.get(item.date)!;
    dayMap.set(projectKey, (dayMap.get(projectKey) ?? 0) + item.total_tokens);

    projectTotals.set(projectKey, (projectTotals.get(projectKey) ?? 0) + item.total_tokens);
    const prevLast = projectLastSeen.get(projectKey);
    if (!prevLast || item.date > prevLast) projectLastSeen.set(projectKey, item.date);
  }
  const sortedDates = Array.from(byDate.keys()).sort();

  let labels: string[];

  if ((range === "last_week" || range === "last_month") && startDate && endDate) {
    // Ensure all days in the selected period are represented on the x-axis.
    labels = getAllDatesInRange(startDate, endDate);
  } else {
    // Default: use the dates that exist in the data.
    labels = sortedDates;
  }

  // Pick the 3 most recently active (by lastSeen date) projects; aggregate the rest into "Others".
  const projectKeys = Array.from(projectTotals.keys()).filter((k) => k !== "__others__");
  projectKeys.sort((a, b) => {
    const da = projectLastSeen.get(a) ?? "0000-00-00";
    const db = projectLastSeen.get(b) ?? "0000-00-00";
    if (da !== db) return db.localeCompare(da); // newest first
    const ta = projectTotals.get(a) ?? 0;
    const tb = projectTotals.get(b) ?? 0;
    return tb - ta;
  });

  const top3 = projectKeys.slice(0, 3);
  const includeOthers = projectTotals.has("__others__") || projectKeys.length > 3;
  const datasetKeys = includeOthers ? [...top3, "__others__"] : top3;

  const datasets = datasetKeys.map((projectKey, i) => {
    // Per-label data depends on whether we're in daily or weekly aggregation mode.
    let data: number[];

    if ((range === "last_week" || range === "last_month") && startDate && endDate) {
      if (projectKey === "__others__") {
        data = labels.map((d) => {
          const day = byDate.get(d);
          if (!day) return 0;
          let sum = 0;
          for (const [k, v] of day.entries()) {
            if (k === "__others__" || !top3.includes(k)) sum += v ?? 0;
          }
          return sum;
        });
      } else {
        data = labels.map((d) => byDate.get(d)?.get(projectKey) ?? 0);
      }
    } else {
      if (projectKey === "__others__") {
        data = labels.map((d) => {
          const day = byDate.get(d);
          if (!day) return 0;
          let sum = 0;
          for (const [k, v] of day.entries()) {
            if (k === "__others__" || !top3.includes(k)) sum += v ?? 0;
          }
          return sum;
        });
      } else {
        data = labels.map((d) => byDate.get(d)?.get(projectKey) ?? 0);
      }
    }

    return {
      label:
        projectKey === "__others__"
          ? "Others"
          : (resolveProjectLabel?.(projectKey) ?? projectKey),
      data,
      backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
    };
  });
  return { labels, datasets };
}

function buildChartDataFromDailyCosts(
  dailyCosts: AnalyticsSummary["daily_costs"] | undefined,
  range: string,
  startDate?: string,
  endDate?: string
): { labels: string[]; datasets: { label: string; data: number[]; backgroundColor: string }[] } {
  if (!dailyCosts || dailyCosts.length === 0) {
    return { labels: [], datasets: [] };
  }
  const sorted = [...dailyCosts].sort((a, b) => a.date.localeCompare(b.date));
  const baseDates = sorted.map((d) => d.date);

  let labels: string[];
  let data: number[];

  if ((range === "last_week" || range === "last_month") && startDate && endDate) {
    // Ensure all days in the selected period are represented on the x-axis.
    labels = getAllDatesInRange(startDate, endDate);
    data = labels.map((dateKey) => {
      const found = sorted.find((d) => d.date === dateKey);
      return found?.tokens ?? 0;
    });
  } else {
    labels = baseDates;
    data = sorted.map((d) => d.tokens ?? 0);
  }

  return {
    labels,
    datasets: [
      {
        label: "All projects",
        data,
        backgroundColor: CHART_COLORS[0],
      },
    ],
  };
}

// ── Provider icons ────────────────────────────────────────────────────────────

function OpenAIIcon() {
  return <img src="/images/openai.svg" alt="OpenAI" width={16} height={16} />;
}


function AnthropicIcon() {
  return <img src="/images/anthropic.svg" alt="Anthropic" width={16} height={16} />;
}


function OpenRouterIcon() {
  return <img src="/images/openrouter.svg" alt="OpenRouter" width={16} height={16} />;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface KeySecrets {
  inference_config: {
    api_key: string;
    provider?: string;
  };
}

interface ApiKeyState {
  api_key: string;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const queryClient = useQueryClient();

  const [dateRange, setDateRange] = useState("today");

  const { data: userProjects } = useQuery({
    queryKey: ["user-projects"],
    queryFn: () => BranchAndRepositoryService.getUserProjects(),
  });

  // Provider key inputs
  const [openAIInput, setOpenAIInput] = useState("");
  const [anthropicInput, setAnthropicInput] = useState("");
  const [openRouterInput, setOpenRouterInput] = useState("");

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: apiKeyData, isLoading: isLoadingKey } = useQuery<ApiKeyState>({
    queryKey: ["api-key"],
    queryFn: async () => {
      const headers = await getHeaders();
      const res = await axios.get<{ api_key: string }>(
        `${BASE_URL}/api/v1/api-keys`,
        { headers }
      );
      return { api_key: res.data.api_key };
    },
  });

  const { data: keySecrets } = useQuery<KeySecrets>({
    queryKey: ["secrets"],
    queryFn: async () => {
      const headers = await getHeaders();
      const res = await axios.get<KeySecrets>(
        `${BASE_URL}/api/v1/secrets/all`,
        { headers }
      );
      return res.data;
    },
  });

  const { startDate, endDate } = useMemo(() => getDateRange(dateRange), [dateRange]);

  const projectIdToRepoName = useMemo(() => {
    const m = new Map<string, string>();
    const projects = Array.isArray(userProjects) ? userProjects : [];
    for (const p of projects) {
      if (p?.id && typeof p?.repo_name === "string" && p.repo_name.length > 0) {
        m.set(p.id, p.repo_name);
      }
    }
    return m;
  }, [userProjects]);

  const {
    data: tokensByDay,
    isLoading: isLoadingTokens,
    isError: isErrorTokens,
    error: errorTokens,
  } = useQuery({
    queryKey: ["analytics-tokens-by-day", startDate, endDate],
    queryFn: () => SettingsService.getTokensByDay(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });

  const {
    data: analyticsSummary,
    isLoading: isLoadingSummary,
    isError: isErrorSummary,
    error: errorSummary,
  } = useQuery({
    queryKey: ["analytics-summary", startDate, endDate],
    queryFn: () => SettingsService.getAnalyticsSummary(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });

  const chartData = useMemo(() => {
    if (tokensByDay && tokensByDay.length > 0) {
      return buildChartData(
        tokensByDay,
        dateRange,
        startDate,
        endDate,
        (projectId) => projectIdToRepoName.get(projectId)
      );
    }
    if (analyticsSummary?.daily_costs?.length) {
      return buildChartDataFromDailyCosts(analyticsSummary.daily_costs, dateRange, startDate, endDate);
    }
    return { labels: [], datasets: [] as { label: string; data: number[]; backgroundColor: string }[] };
  }, [tokensByDay, analyticsSummary?.daily_costs, dateRange, startDate, endDate, projectIdToRepoName]);

  const {
    totalTokens,
    totalRequests,
    totalThreads,
    intensityData,
  } = useMemo(() => {
    type DayAgg = { date: string; tokens: number; runCount: number };
    let daily: DayAgg[] = [];

    if (analyticsSummary?.daily_costs?.length) {
      daily = analyticsSummary.daily_costs.map((d) => ({
        date: d.date,
        tokens: d.tokens ?? 0,
        runCount: d.run_count ?? 0,
      }));
    } else if (tokensByDay?.length) {
      const byDate = new Map<string, DayAgg>();
      for (const item of tokensByDay) {
        const existing =
          byDate.get(item.date) ??
          ({
            date: item.date,
            tokens: 0,
            runCount: 0,
          } as DayAgg);
        existing.tokens += item.total_tokens;
        byDate.set(item.date, existing);
      }
      daily = Array.from(byDate.values());
    }

    const totalTokens =
      daily.length > 0
        ? daily.reduce((sum, d) => sum + d.tokens, 0)
        : (null as number | null);

    const totalRequests =
      daily.length > 0
        ? daily.reduce((sum, d) => sum + d.runCount, 0)
        : (null as number | null);

    const totalThreads =
      analyticsSummary?.conversation_stats?.length
        ? analyticsSummary.conversation_stats.reduce((sum, d) => sum + (d.count ?? 0), 0)
        : daily.length > 0
          ? daily.filter((d) => (d.tokens ?? 0) > 0 || (d.runCount ?? 0) > 0).length
          : (null as number | null);

    const intensityData =
      daily.length > 0
        ? buildIntensityData(
          daily.map(({ date, tokens }) => ({ date, tokens }))
        )
        : Array(HEATMAP_ROWS)
          .fill(0)
          .map(() => Array(HEATMAP_COLS).fill(0));

    return { totalTokens, totalRequests, totalThreads, intensityData };
  }, [analyticsSummary?.daily_costs, tokensByDay]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: generateApiKey, isPending: isGenerating } = useMutation({
    mutationFn: async () => {
      const headers = await getHeaders();
      return axios.post(`${BASE_URL}/api/v1/api-keys`, {}, { headers });
    },
    onSuccess: () => {
      toast.success("API Key generated successfully");
      queryClient.invalidateQueries({ queryKey: ["api-key"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to generate API key");
    },
  });

  const { mutate: saveProviderKey, isPending: isSavingProvider } = useMutation({
    mutationFn: async (data: { provider: string; api_key: string }) => {
      await SettingsService.saveProviderKey(data.provider, data.api_key);
    },
    onSuccess: (_data, variables) => {
      toast.success(`${variables.provider} key saved`);
      queryClient.invalidateQueries({ queryKey: ["secrets"] });
    },
    onError: () => toast.error("Failed to save key"),
  });

  const maskedKey = (key: string) =>
    key ? `${key.slice(0, 4)}${"•".repeat(24)}${key.slice(-4)}` : "";

  const savedProvider = keySecrets?.inference_config?.provider?.toLowerCase();

  return (
    <div className="flex flex-col min-h-screen bg-stone-50 w-full">
      {/* ── Top Bar ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-emerald-950">Settings</h1>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40 bg-white text-sm text-gray-600 border-gray-200">
            <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="last_week">Last Week</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="p-8 w-full min-w-0">

        {/* ── Tokens Used card ────────────────────────────────────────────────── */}
        <div className="border border-gray-200 rounded-xl mb-5 flex overflow-hidden bg-white">
          {/* Chart */}
          <div className="flex-1 min-w-0 p-5 h-[300px]">
            {isErrorTokens || isErrorSummary ? (
              <div className="h-full flex items-center justify-center text-sm text-amber-600">
                {typeof (errorTokens as any)?.response?.data?.detail === "string"
                  ? (errorTokens as any).response.data.detail
                  : typeof (errorSummary as any)?.response?.data?.detail === "string"
                    ? (errorSummary as any).response.data.detail
                    : "Analytics temporarily unavailable"}
              </div>
            ) : isLoadingTokens || isLoadingSummary ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Loading analytics…
              </div>
            ) : chartData.labels.length > 0 ? (
              <StackedBarChart
                labels={chartData.labels.map((label) => formatDisplayDate(label))}
                datasets={chartData.datasets}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                No token usage data for this period.
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="w-[22%] min-w-[190px] border-l border-gray-200 flex flex-col divide-y divide-gray-200">
            <div className="flex-1 flex flex-col justify-center px-6 py-5">
              <p className="text-sm font-semibold text-gray-500 mb-1">Total Tokens</p>
              <div className="flex items-end mt-1">
                <span className="text-2xl font-bold text-gray-900 font-uncut">
                  {totalTokens != null ? totalTokens.toLocaleString() : "—"}
                </span>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center px-6 py-5">
              <p className="text-sm font-semibold text-gray-500 mb-1">Total Requests</p>
              <div className="flex items-end mt-1">
                <span className="text-2xl font-bold text-gray-900 font-uncut">
                  {totalRequests != null ? totalRequests.toLocaleString() : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom row ──────────────────────────────────────────────────────── */}
        <div className="flex gap-5 items-start">

          {/* Left column – two stacked cards */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Your API Key */}
            <div className="border border-gray-200 rounded-xl p-5 bg-white">
              <p className="text-sm font-semibold text-gray-800 mb-4">Your API Key</p>
              <div className="flex items-center gap-3">
                <Input
                  readOnly
                  className="flex-1 bg-gray-50 text-gray-400 text-sm"
                  value={isLoadingKey ? "Loading…" : apiKeyData?.api_key ? maskedKey(apiKeyData.api_key) : ""}
                  placeholder="No API key found. Generate one to get started."
                />
                {!apiKeyData?.api_key && (
                  <Button size="sm" onClick={() => generateApiKey()} disabled={isGenerating} className="whitespace-nowrap">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    {isGenerating ? "Generating…" : "Generate API Key"}
                  </Button>
                )}
              </div>
            </div>

            {/* External Providers */}
            <div className="border border-gray-200 rounded-xl p-5 bg-white">
              <p className="text-sm font-semibold text-gray-800 mb-5">External Providers</p>

              {/* OpenAI */}
              <div className="mb-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <OpenAIIcon />
                  <span className="text-sm text-gray-700">OpenAI API Key</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    className="flex-1 bg-white text-sm"
                    placeholder={savedProvider === "openai" && keySecrets?.inference_config.api_key ? maskedKey(keySecrets.inference_config.api_key) : ""}
                    value={openAIInput}
                    onChange={(e) => setOpenAIInput(e.target.value)}
                  />
                  {openAIInput && (
                    <Button size="sm" disabled={isSavingProvider}
                      onClick={() => { saveProviderKey({ provider: "openai", api_key: openAIInput }); setOpenAIInput(""); }}>
                      Save
                    </Button>
                  )}
                </div>
              </div>

              {/* Anthropic */}
              <div className="mb-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <AnthropicIcon />
                  <span className="text-sm text-gray-700">Anthropic API Key</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    className="flex-1 bg-white text-sm"
                    placeholder={savedProvider === "anthropic" && keySecrets?.inference_config.api_key ? maskedKey(keySecrets.inference_config.api_key) : ""}
                    value={anthropicInput}
                    onChange={(e) => setAnthropicInput(e.target.value)}
                  />
                  {anthropicInput && (
                    <Button size="sm" disabled={isSavingProvider}
                      onClick={() => { saveProviderKey({ provider: "anthropic", api_key: anthropicInput }); setAnthropicInput(""); }}>
                      Save
                    </Button>
                  )}
                </div>
              </div>

              {/* OpenRouter */}
              <div className="mb-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <OpenRouterIcon />
                  <span className="text-sm text-gray-700">OpenRouter API Key</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    className="flex-1 bg-white text-sm"
                    placeholder={savedProvider === "openrouter" && keySecrets?.inference_config.api_key ? maskedKey(keySecrets.inference_config.api_key) : ""}
                    value={openRouterInput}
                    onChange={(e) => setOpenRouterInput(e.target.value)}
                  />
                  {openRouterInput && (
                    <Button size="sm" disabled={isSavingProvider}
                      onClick={() => { saveProviderKey({ provider: "openrouter", api_key: openRouterInput }); setOpenRouterInput(""); }}>
                      Save
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right card – Token Use Intensity (from backend) */}
          <div className="w-[28%] min-w-[260px] border border-gray-200 rounded-xl p-5 bg-white">
            <p className="text-sm font-semibold text-gray-800 mb-4">Token Use Intensity</p>

            {/* Heatmap grid – driven by daily token usage */}
            <TokenIntensityGrid intensityData={intensityData} />

            {/* Stats – derived from analytics data */}
            <div className="flex flex-col gap-2 pt-[53px]">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-gray-900 font-roboto-mono">
                  {totalRequests != null ? totalRequests.toLocaleString() : "—"}
                </span>
                <span className="text-xs font-semibold text-gray-400 tracking-wider font-roboto-mono">
                  MSGS
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-gray-900 font-roboto-mono">
                  {totalThreads != null ? totalThreads.toLocaleString() : "—"}
                </span>
                <span className="text-xs font-semibold text-gray-400 tracking-wider font-roboto-mono">
                  THREADS
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
