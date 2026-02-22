"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { CalendarIcon, Plus, TrendingUp } from "lucide-react";
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
import SettingsService from "@/services/SettingsService";

const StackedBarChart = dynamic(() => import("./StackedBarChart"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">
      Loading chart…
    </div>
  ),
});

// ── Heatmap helpers ────────────────────────────────────────────────────────────
function intensityColor(val: number): string {
  if (val === 0) return "#e5e7eb";
  if (val < 0.25) return "#d1fae5";
  if (val < 0.5) return "#6ee7b7";
  if (val < 0.75) return "#34d399";
  return "#059669";
}

const intensityData: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.2, 0, 0.3, 0],
  [0, 0, 0, 0.1, 0, 0, 0, 0, 0, 0, 0.6, 0, 0],
  [0, 0.2, 0, 0.4, 0, 0.7, 0.8, 0.9, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0.1, 0, 0, 0.7, 0.8, 0, 0, 0, 0],
];

// ── Provider icons ────────────────────────────────────────────────────────────

function OpenAIIcon() {
  return <img src="/images/openai.svg" alt="OpenAI" width={16} height={16} />;
}

// TODO: replace the src with your actual SVG path, e.g. "/icons/anthropic.svg"
function AnthropicIcon() {
  return <img src="/images/anthropic.svg" alt="Anthropic" width={16} height={16} />;
}

// TODO: replace the src with your actual SVG path, e.g. "/icons/openrouter.svg"
function OpenRouterIcon() {
  return <img src="/images/openrouter.svg" alt="OpenRouter" width={16} height={16} />;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProviderConfig {
  provider: string;
  model: string;
  api_key: string;
}

interface KeySecrets {
  chat_config: ProviderConfig | null;
  inference_config: ProviderConfig | null;
  integration_keys: Array<{ service: string; api_key: string }>;
}

interface ApiKeyState {
  api_key: string;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const queryClient = useQueryClient();

  const [dateRange, setDateRange] = useState("today");

  // Provider key inputs
  const [openAIInput, setOpenAIInput] = useState("");
  const [anthropicInput, setAnthropicInput] = useState("");
const [openRouterInput, setOpenRouterInput] = useState("");

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: apiKeyData, isLoading: isLoadingKey } = useQuery<ApiKeyState>({
    queryKey: ["api-key"],
    queryFn: () => SettingsService.getApiKey(),
  });

  const { data: keySecrets } = useQuery<KeySecrets | null>({
    queryKey: ["secrets"],
    queryFn: () => SettingsService.getSecrets(),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: generateApiKey, isPending: isGenerating } = useMutation({
    mutationFn: () => SettingsService.generateApiKey(),
    onSuccess: () => {
      toast.success("API Key generated successfully");
      queryClient.invalidateQueries({ queryKey: ["api-key"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to generate API key");
    },
  });

  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const { mutate: saveProviderKey } = useMutation({
    mutationFn: async (data: { provider: string; api_key: string }) => {
      setSavingProvider(data.provider);
      return SettingsService.saveProviderKey(data.provider, data.api_key);
    },
    onSuccess: (_data, variables) => {
      toast.success(`${variables.provider} key saved`);
      queryClient.invalidateQueries({ queryKey: ["secrets"] });
      if (variables.provider === "openai") setOpenAIInput("");
      else if (variables.provider === "anthropic") setAnthropicInput("");
      else if (variables.provider === "openrouter") setOpenRouterInput("");
      setSavingProvider(null);
    },
    onError: () => { toast.error("Failed to save key"); setSavingProvider(null); },
  });

  const maskedKey = (key: string) => {
    if (!key) return "";
    if (key.length <= 8) return "•".repeat(key.length);
    const visibleStart = 4;
    const visibleEnd = 4;
    const maskLen = key.length - visibleStart - visibleEnd;
    return `${key.slice(0, visibleStart)}${"•".repeat(maskLen)}${key.slice(-visibleEnd)}`;
  };

  const savedProvider =
    (keySecrets?.inference_config?.provider ?? keySecrets?.chat_config?.provider)?.toLowerCase();
  const savedApiKey =
    keySecrets?.inference_config?.api_key ?? keySecrets?.chat_config?.api_key;

  return (
    <div className="p-6 w-full min-w-0 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
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

      {/* ── Tokens Used card ────────────────────────────────────────────────── */}
      <div className="border border-gray-200 rounded-xl mb-5 flex overflow-hidden bg-white">
        {/* Chart */}
        <div className="flex-1 min-w-0 p-5 h-[300px]">
          <StackedBarChart />
        </div>

        {/* Stats */}
        <div className="w-[22%] min-w-[190px] border-l border-gray-200 flex flex-col divide-y divide-gray-200">
          <div className="flex-1 flex flex-col justify-center px-6 py-5">
            <p className="text-sm font-semibold text-gray-500 mb-1">Total Tokens</p>
            <div className="flex items-end justify-between mt-1">
              <span className="text-2xl font-bold text-gray-900">29,67,879</span>
              <span className="text-sm font-semibold text-emerald-500 flex items-center gap-0.5">
                4.0% <TrendingUp className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center px-6 py-5">
            <p className="text-sm font-semibold text-gray-500 mb-1">Total Requests</p>
            <div className="flex items-end justify-between mt-1">
              <span className="text-2xl font-bold text-gray-900">29,67,879</span>
              <span className="text-sm font-semibold text-emerald-500 flex items-center gap-0.5">
                4.0% <TrendingUp className="w-3.5 h-3.5" />
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
                  placeholder={savedProvider === "openai" && savedApiKey ? maskedKey(savedApiKey) : ""}
                  value={openAIInput}
                  onChange={(e) => setOpenAIInput(e.target.value)}
                />
                {openAIInput && (
                  <Button size="sm" disabled={savingProvider === "openai"}
                    onClick={() => saveProviderKey({ provider: "openai", api_key: openAIInput })}>
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
                  placeholder={savedProvider === "anthropic" && savedApiKey ? maskedKey(savedApiKey) : ""}
                  value={anthropicInput}
                  onChange={(e) => setAnthropicInput(e.target.value)}
                />
                {anthropicInput && (
                  <Button size="sm" disabled={savingProvider === "anthropic"}
                    onClick={() => saveProviderKey({ provider: "anthropic", api_key: anthropicInput })}>
                    Save
                  </Button>
                )}
              </div>
            </div>

            {/* OpenRouter */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <OpenRouterIcon />
                <span className="text-sm text-gray-700">OpenRouter API Key</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="password"
                  className="flex-1 bg-white text-sm"
                  placeholder={savedProvider === "openrouter" && savedApiKey ? maskedKey(savedApiKey) : ""}
                  value={openRouterInput}
                  onChange={(e) => setOpenRouterInput(e.target.value)}
                />
                {openRouterInput && (
                  <Button size="sm" disabled={savingProvider === "openrouter"}
                    onClick={() => saveProviderKey({ provider: "openrouter", api_key: openRouterInput })}>
                    Save
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right card – Token Use Intensity */}
        <div className="w-[32%] min-w-[280px] border border-gray-200 rounded-xl p-5 bg-white">
          <p className="text-sm font-semibold text-gray-800 mb-4">Token Use Intensity</p>

          {/* Heatmap grid */}
          <div
            className="grid gap-1 mb-5"
            style={{ gridTemplateColumns: `repeat(${intensityData[0]?.length ?? 13}, 1fr)` }}
          >
            {intensityData.map((row, ri) =>
              row.map((val, ci) => (
                <div
                  key={`${ri}-${ci}`}
                  className="aspect-square rounded-sm w-full"
                  style={{ backgroundColor: intensityColor(val) }}
                />
              ))
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-gray-900">2,546</span>
              <span className="text-xs font-semibold text-gray-400 tracking-wider">MSGS</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-gray-900">342</span>
                <span className="text-xs font-semibold text-gray-400 tracking-wider">THREADS</span>
              </div>
              <div className="flex flex-col items-end gap-1 text-xs font-semibold">
                <span className="text-emerald-500">+45,546 <span className="text-gray-400 font-normal">ADDED</span></span>
                <span className="text-red-500">-12,546 <span className="text-gray-400 font-normal">REMOVED</span></span>
                <span className="text-amber-500">~2,054 <span className="text-gray-400 font-normal">CHANGED</span></span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
