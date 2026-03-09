"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, startTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Play,
  Check,
  Layout,
  ChevronRight,
  Terminal,
  Loader2,
  Code2,
  ShieldCheck,
  GitBranch,
  Maximize2,
  CheckCircle2,
  Circle,
  Pause,
  Lock,
  ArrowRight,
  TerminalSquare,
  Sidebar,

  FileDiff,
  TestTube,
  ScrollText,
  ChevronDown,
  FileText,
  Copy,
  Clock,
  ExternalLink,
  Hourglass,
  List,
  ArrowLeft,
  Github,
  Sparkles,
  Info,
  RefreshCw,
  SendHorizonal,
  Wrench,
  AlertCircle,
  Download,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/lib/state/store";
import { RootState } from "@/lib/state/store";
import { setRepoAndBranchForTask } from "@/lib/state/Reducers/RepoAndBranch";
import JSZip from "jszip";
import TaskSplittingService from "@/services/TaskSplittingService";
import PlanService from "@/services/PlanService";
import SpecService from "@/services/SpecService";
import ChatService from "@/services/ChatService";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import {
  TaskSplittingStatusResponse,
  TaskSplittingItemsResponse,
  TaskLayer,
  TaskItem,
  PlanItem,
} from "@/lib/types/spec";
import { getStreamEventPayload } from "@/lib/utils";
import Image from "next/image";
import { TreeView, TreeNode } from "@/components/ui/tree-view";
import { MonacoDiffView } from "@/components/diff-editor/MonacoDiffView";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  StreamTimeline,
  type StreamTimelineItem,
} from "@/components/stream/StreamTimeline";

/** sessionStorage key for codegen thinking */
const THINKING_STORAGE_KEY_CODEGEN = "potpie_thinking_codegen";

/**
 * Code / implementation page: plan slices from API, task splitting (codegen), layers and tasks from getTaskSplittingItems.
 */

/** Agent activity event (tool call) from task splitting status */
type AgentActivityEvt = {
  params?: Record<string, unknown>;
  tool?: string;
  phase?: number;
  task?: number;
};

function getParamDisplayForEvt(evt: AgentActivityEvt): string {
  const params = evt.params || {};
  const tool = evt.tool || "";
  if (params._truncated) {
    return params.preview ? String(params.preview).slice(0, 50) + "…" : "(large payload)";
  }
  switch (tool) {
    case "read": {
      const filePath = String(params.file_path ?? params.path ?? "");
      const segments = filePath.split("/").filter(Boolean);
      return segments.length > 3 ? "…/" + segments.slice(-3).join("/") : filePath;
    }
    case "grep":
    case "search":
    case "ripgrep": {
      const patternStr = String(params.pattern ?? params.query ?? "");
      return `"${patternStr.slice(0, 40)}${patternStr.length > 40 ? "…" : ""}"`;
    }
    case "glob":
    case "find":
      return String(params.pattern ?? params.glob ?? "");
    case "edit":
    case "write":
    case "str_replace": {
      const editPath = String(params.file_path ?? params.path ?? "");
      const editSegments = editPath.split("/").filter(Boolean);
      return editSegments.length > 3 ? "…/" + editSegments.slice(-3).join("/") : editPath;
    }
    case "bash":
    case "shell":
    case "run": {
      const cmd = params.command ?? params.cmd ?? "";
      return String(cmd).slice(0, 40) + (String(cmd).length > 40 ? "…" : "");
    }
    case "list_dir":
    case "ls":
      return String(params.path ?? params.directory ?? ".");
    default: {
      const firstVal = Object.values(params).find((v) => typeof v === "string");
      if (firstVal) {
        const s = String(firstVal);
        return s.slice(0, 40) + (s.length > 40 ? "…" : "");
      }
      return "";
    }
  }
}

/** True if segment looks like a file (has an extension); otherwise treat as folder. */
function looksLikeFileName(segment: string): boolean {
  return /\.\w+(\?.*)?$/.test(segment) || segment.includes(".");
}

/** Build a tree of TreeNode from file paths (e.g. ["src/foo/bar.ts", "src/baz.ts"]). */
function buildFileTree(paths: string[]): TreeNode[] {
  const seen = new Set<string>();
  const root: Record<string, { node: TreeNode; children: Record<string, unknown> }> = {};

  for (const path of paths) {
    const trimmed = path.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);

    const parts = trimmed.split("/").filter(Boolean);
    if (parts.length === 0) continue;

    let current = root;
    let pathSoFar = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const isFile = isLast && looksLikeFileName(part);
      pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;
      const id = pathSoFar;

      if (!current[part]) {
        current[part] = {
          node: {
            id,
            label: part,
            children: isFile ? undefined : [],
          },
          children: {},
        };
      }

      if (isFile) {
        (current[part].node as TreeNode).children = undefined;
      }
      current = current[part].children as Record<string, { node: TreeNode; children: Record<string, unknown> }>;
    }
  }

  function toChildren(obj: Record<string, { node: TreeNode; children: Record<string, unknown> }>): TreeNode[] {
    return Object.values(obj)
      .map(({ node, children }) => ({
        ...node,
        children: node.children === undefined ? undefined : toChildren(children as Record<string, { node: TreeNode; children: Record<string, unknown> }>),
      }))
      .sort((a, b) => {
        const aIsDir = (a.children?.length ?? 0) > 0;
        const bIsDir = (b.children?.length ?? 0) > 0;
        if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
        return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
      });
  }

  return toChildren(root);
}

function getAllNodeIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  function walk(ns: TreeNode[]) {
    for (const n of ns) {
      ids.push(n.id);
      if (n.children?.length) walk(n.children);
    }
  }
  walk(nodes);
  return ids;
}

/**
 * Merge newly fetched layers into previous state, reusing object references for
 * unchanged layers/tasks. Reduces re-renders when codegen completes by avoiding
 * a full tree replace (which causes a visible "refresh").
 */
function mergeLayersForCompletion(
  prev: TaskLayer[],
  next: TaskLayer[]
): TaskLayer[] {
  if (prev.length !== next.length) return next;
  let usedPrev = true;
  const merged: TaskLayer[] = [];
  for (let i = 0; i < prev.length; i++) {
    const pLayer = prev[i];
    const nLayer = next[i];
    if (
      !pLayer ||
      !nLayer ||
      pLayer.id !== nLayer.id ||
      (pLayer.tasks?.length ?? 0) !== (nLayer.tasks?.length ?? 0)
    ) {
      merged.push(nLayer);
      usedPrev = false;
      continue;
    }
    const mergedTasks: TaskItem[] = [];
    const tasks = nLayer.tasks ?? [];
    for (let t = 0; t < tasks.length; t++) {
      const pTask = pLayer.tasks?.[t];
      const nTask = tasks[t];
      const taskUnchanged =
        pTask &&
        pTask.id === nTask.id &&
        pTask.status === nTask.status &&
        (pTask.changes?.length ?? 0) === (nTask.changes?.length ?? 0);
      mergedTasks.push(taskUnchanged ? pTask : nTask);
      if (!taskUnchanged) usedPrev = false;
    }
    const layerUnchanged =
      pLayer.status === nLayer.status &&
      mergedTasks.every((t, idx) => t === pLayer.tasks?.[idx]);
    if (layerUnchanged) {
      merged.push(pLayer);
    } else {
      merged.push({ ...pLayer, status: nLayer.status, tasks: mergedTasks });
      usedPrev = false;
    }
  }
  return usedPrev ? prev : merged;
}

// --- Sub-components ---

const StatusBadge = ({ status, tests }: { status: string; tests: any }) => {
  if (status === "completed") {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold border border-emerald-100">
        <CheckCircle2 className="w-3 h-3" />
        <span>PASS</span>
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-bold border border-amber-200">
        <Info className="w-3 h-3" />
        <span>REVIEW</span>
      </div>
    );
  }
  if (status === "running") {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black text-white rounded text-[9px] font-bold border border-black">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>RUNNING</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-50 text-primary-color rounded text-[9px] font-bold border border-zinc-100">
      <Circle className="w-3 h-3" />
      <span>WAITING</span>
    </div>
  );
};

// Code File Card Component with collapsible sections
const CodeFileCard = ({
  change,
}: {
  change: {
    layerTitle: string;
    taskTitle: string;
    path: string;
    lang: string;
    content: string;
    status: string;
  };
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-[#F5F5F5] border-b border-gray-200 flex items-center justify-between gap-3 hover:bg-[#EEEEEE] transition-colors"
      >
        <span className="text-xs font-medium text-[#022019] truncate">
          {change.path}
        </span>
      </button>
      {isExpanded && (
        <div className="min-h-[280px]">
          <MonacoDiffView
            change={{ path: change.path, lang: change.lang, content: change.content }}
            height={280}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
};

// Simple Syntax Highlighter
const SimpleCodeBlock = ({ code }: { code: string }) => {
  if (!code)
    return (
      <span className="text-primary-color italic font-mono text-[10px]">
        Waiting for generation...
      </span>
    );

  const KEYWORDS = new Set([
    "import",
    "from",
    "const",
    "let",
    "var",
    "async",
    "await",
    "function",
    "return",
    "if",
    "else",
    "try",
    "catch",
    "describe",
    "test",
    "it",
    "expect",
    "new",
    "export",
    "default",
    "class",
    "interface",
    "type",
  ]);

  const lines = code.split("\n");

  return (
    <div className="font-mono text-[10px] leading-relaxed">
      {lines.map((line: string, i: number) => {
        if (line.trim().startsWith("//")) {
          return (
            <div key={i} className="text-primary-color whitespace-pre">
              {line}
            </div>
          );
        }
        const parts = line.split(/(\s+|[(){}[\].,;:'"`])/);

        return (
          <div key={i} className="whitespace-pre">
            {parts.map((part: string, j: number) => {
              if (KEYWORDS.has(part))
                return (
                  <span key={j} className="text-purple-500 font-semibold">
                    {part}
                  </span>
                );
              if (part.match(/^['"`].*['"`]$/))
                return (
                  <span key={j} className="text-emerald-600">
                    {part}
                  </span>
                );
              if (part.match(/^['"`]/))
                return (
                  <span key={j} className="text-emerald-600">
                    {part}
                  </span>
                );
              if (
                /^\w+$/.test(part) &&
                j < parts.length - 1 &&
                parts[j + 1].trim() === "("
              ) {
                return (
                  <span key={j} className="text-primary-color">
                    {part}
                  </span>
                );
              }
              if (/^\d+$/.test(part))
                return (
                  <span key={j} className="text-orange-500">
                    {part}
                  </span>
                );

              return (
                <span key={j} className="text-primary-color">
                  {part}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// Helper function to map API status to UI status
const mapApiStatusToUI = (apiStatus: string): string => {
  const statusMap: Record<string, string> = {
    PENDING: "pending",
    IN_PROGRESS: "running",
    COMPLETED: "completed",
    FAILED: "failed",
  };
  return statusMap[apiStatus] || apiStatus.toLowerCase();
};

// TaskCard for API task items (layers from getTaskSplittingItems)
const TaskCard = ({
  task,
  isExpanded,
  onToggle,
}: {
  task: import("@/lib/types/spec").TaskItem;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const hasChanges = task.changes && task.changes.length > 0;
  // Default to 'logs' if no changes (Verification task), otherwise 'diff'
  const [activeTab, setActiveTab] = React.useState(
    hasChanges ? "diff" : "logs"
  );
  // Map API status to UI status
  const uiStatus = mapApiStatusToUI(task.status);
  const isPending = uiStatus === "pending";

  return (
    <div
      className={`
      bg-background border rounded-xl transition-all duration-300 overflow-hidden
      ${isExpanded ? "ring-1 ring-zinc-900 border-zinc-900 shadow-md" : "border-zinc-200 hover:border-zinc-300"}
      ${uiStatus === "running" && !isExpanded ? "shadow-lg shadow-blue-50 border-blue-200" : ""}
    `}
    >
      {/* Header (Clickable for toggle) */}
      <div
        onClick={onToggle}
        className="p-4 cursor-pointer flex flex-col gap-3 relative"
      >
        {uiStatus === "running" && !isExpanded && (
          <div className="absolute inset-0 bg-black/10 pointer-events-none" />
        )}

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-md ${uiStatus === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-primary-color"}`}
            >
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-primary-color">
                {task.title}
              </div>
              <div className="text-[10px] font-mono text-primary-color">
                {task.file}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={uiStatus} tests={task.tests ?? { total: 0, passed: 0 }} />
            <ChevronDown
              className={`w-4 h-4 text-primary-color transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
            />
          </div>
        </div>

        {/* Mini Progress Bar */}
        {uiStatus === "running" && !isExpanded && (
          <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-300 ease-out"
              style={{
                width: `${((task.tests?.passed ?? 0) / ((task.tests?.total ?? 0) || 1)) * 100}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Expanded Content Area */}
      {isExpanded && (
        <div className="border-t border-zinc-100 bg-zinc-50/50 animate-in slide-in-from-top-2 duration-200">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 border-b border-zinc-100 bg-background">
            {hasChanges && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("diff");
                }}
                className={`flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === "diff" ? "border-primary-color text-primary-color" : "border-transparent text-primary-color hover:text-primary-color"}`}
              >
                <FileDiff className="w-3 h-3" />
                Code Changes{" "}
                <span className="text-primary-color font-normal">
                  ({task.changes?.length || 0})
                </span>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab("tests");
              }}
              className={`flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === "tests" ? "border-primary-color text-primary-color" : "border-transparent text-primary-color hover:text-primary-color"}`}
            >
              <TestTube className="w-3 h-3" />
              Verification
              {uiStatus === "completed" && (
                <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-[9px]">
                  {task.tests?.passed ?? 0}/{task.tests?.total ?? 0}
                </span>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab("logs");
              }}
              className={`flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold border-b-2 transition-colors ${activeTab === "logs" ? "border-primary-color text-primary-color" : "border-transparent text-primary-color hover:text-primary-color"}`}
            >
              <ScrollText className="w-3 h-3" />
              Logs
            </button>
          </div>

          {/* Tab Views */}
          <div className="p-4 min-h-[160px]">
            {activeTab === "diff" &&
              hasChanges &&
              (isPending ? (
                <div className="h-32 flex flex-col items-center justify-center text-primary-color border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                  <Hourglass className="w-6 h-6 mb-3 opacity-50 animate-pulse text-primary-color" />
                  <p className="text-xs font-bold text-primary-color">
                    Waiting to generate code...
                  </p>
                  <p className="text-[10px] text-primary-color mt-1">
                    Files will appear here when execution starts.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {task.changes?.map(
                    (
                      change: { path: string; lang: string; content: string },
                      idx: number
                    ) => (
                      <div
                        key={change.path ?? idx}
                        className="bg-background rounded-lg border border-zinc-200 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        <div className="px-3 py-2 bg-zinc-50/80 border-b border-zinc-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3 text-primary-color" />
                            <span className="text-[10px] font-mono font-medium text-primary-color">
                              {change.path}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-primary-color uppercase">
                              {change.lang}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(change.content || "").then(
                                  () => toast.success("Copied to clipboard"),
                                  () => toast.error("Failed to copy")
                                );
                              }}
                              className="p-0.5 rounded hover:bg-zinc-100"
                              title="Copy file content"
                            >
                              <Copy className="w-3 h-3 text-primary-color cursor-pointer" />
                            </button>
                          </div>
                        </div>
                        {change.content ? (
                          <div className="min-h-[280px] rounded-b-lg overflow-hidden">
                            <MonacoDiffView
                              change={{ path: change.path, lang: change.lang, content: change.content }}
                              height={280}
                              className="w-full"
                            />
                          </div>
                        ) : (
                          <div className="p-4 text-center text-[10px] font-mono text-primary-color italic bg-background flex flex-col items-center gap-2 min-h-[200px] justify-center">
                            <Loader2 className="w-4 h-4 animate-spin text-primary-color" />
                            <span className="text-primary-color">
                              Generating diff...
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              ))}

            {activeTab === "tests" && (
              <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* 1. Test Definition */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary-color" />
                    <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                      Test Suite Definition
                    </span>
                  </div>
                  <div className="bg-background rounded-lg border border-zinc-200 overflow-hidden relative group">
                    <div className="p-4 overflow-x-auto">
                      <SimpleCodeBlock code={task.testCode || ""} />
                    </div>
                  </div>
                </div>

                {/* 2. Live Results */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Play className="w-3.5 h-3.5 text-primary-color" />
                    <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                      Live Execution Results
                    </span>
                  </div>
                  <div className="bg-background border border-zinc-200 rounded-lg divide-y divide-zinc-50">
                    {task.testResults && task.testResults.length > 0 ? (
                      task.testResults.map(
                        (
                          test: import("@/lib/types/spec").TaskTestResult,
                          i: number
                        ) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3"
                          >
                            <div className="flex items-center gap-3">
                              {uiStatus === "completed" ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-primary-color" />
                              )}
                              <span
                                className={`text-[11px] font-medium ${uiStatus === "completed" ? "text-primary-color" : "text-primary-color"}`}
                              >
                                {test.name}
                              </span>
                            </div>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                uiStatus === "completed"
                                  ? test.status === "PASSED"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                  : "bg-zinc-100 text-primary-color"
                              }`}
                            >
                              {uiStatus === "completed"
                                ? test.status === "PASSED"
                                  ? "PASSED"
                                  : "FAILED"
                                : "PENDING"}
                            </span>
                          </div>
                        )
                      )
                    ) : (
                      <div className="p-3 text-[11px] text-primary-color italic">
                        No test results available yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "logs" && (
              <div className="bg-zinc-900 rounded-lg p-3 font-mono text-[10px] text-zinc-300 space-y-1.5 min-h-[150px] max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                {task.logs && task.logs.length > 0 ? (
                  task.logs.map((log: string, i: number) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-primary-color select-none">
                        {">"}
                      </span>
                      <span>{log}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-primary-color italic">
                    Waiting for logs...
                  </div>
                )}

                {uiStatus === "running" && (
                  <div className="animate-pulse text-primary-color">_</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function VerticalTaskExecution() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  // Note: taskId in URL is actually recipeId now
  const recipeId = params?.taskId as string;
  const planIdFromUrl = searchParams.get("planId");
  const itemNumberFromUrl = searchParams.get("itemNumber");
  const taskSplittingIdFromUrl = searchParams.get("taskSplittingId");
  const repoNameFromUrl = searchParams.get("repoName");

  const repoBranchByTask = useSelector((state: RootState) => state.RepoAndBranch.byTaskId);
  const storedRepoContext = recipeId ? repoBranchByTask?.[recipeId] : undefined;

  const [activeSliceId, setActiveSliceId] = useState(
    itemNumberFromUrl ? parseInt(itemNumberFromUrl) : 1
  );
  // Persist completed slices in localStorage to survive page refresh
  const [completedSlices, setCompletedSlices] = useState<number[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(`completed_slices_${recipeId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isRunning, setIsRunning] = useState(false);
  
  // Persist completedSlices changes to localStorage
  useEffect(() => {
    if (!recipeId || completedSlices.length === 0) return;
    try {
      localStorage.setItem(`completed_slices_${recipeId}`, JSON.stringify(completedSlices));
    } catch {
      // Ignore storage errors
    }
  }, [recipeId, completedSlices]);

  // Task Splitting API State
  const [planId, setPlanId] = useState<string | null>(planIdFromUrl);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [isLoadingPlanItems, setIsLoadingPlanItems] = useState(false);
  const [taskSplittingId, setTaskSplittingId] = useState<string | null>(
    taskSplittingIdFromUrl || null
  );
  const [taskSplittingStatus, setTaskSplittingStatus] =
    useState<TaskSplittingStatusResponse | null>(null);
  const [allLayers, setAllLayers] = useState<TaskLayer[]>([]);
  const [nextLayerOrder, setNextLayerOrder] = useState<number | null>(0);
  const [isLoadingLayers, setIsLoadingLayers] = useState(false);

  // Graph Loading & Data State
  const [currentDag, setCurrentDag] = useState<TaskLayer[]>([]); // Array of layers from API
  const [isGraphLoading, setIsGraphLoading] = useState(true); // Start as loading
  const [graphLoadIndex, setGraphLoadIndex] = useState(0); // Tracks how many levels are shown

  const [globalLogs, setGlobalLogs] = useState<string[]>([]);
  const [showGlobalLogs, setShowGlobalLogs] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [changedFilesSliderOpen, setChangedFilesSliderOpen] = useState(false);
  const [selectedChangedFilePath, setSelectedChangedFilePath] = useState<string | null>(null);
  const hasShownFailedToastRef = useRef(false);
  const thinkingListRef = useRef<HTMLDivElement>(null);
  
  // Refs for polling optimization - avoid dependency array issues while accessing current values
  const allLayersRef = useRef<TaskLayer[]>([]);
  const taskSplittingStatusRef = useRef<TaskSplittingStatusResponse | null>(null);
  const planItemsRef = useRef<PlanItem[]>([]);
  
  // Keep refs in sync with state
  useEffect(() => {
    allLayersRef.current = allLayers;
  }, [allLayers]);
  
  useEffect(() => {
    taskSplittingStatusRef.current = taskSplittingStatus;
  }, [taskSplittingStatus]);

  useEffect(() => {
    planItemsRef.current = planItems;
  }, [planItems]);

  // --- UI-only: recipe/project info for the left header ---
  const [recipePrompt, setRecipePrompt] = useState<string>("");
  const [repoName, setRepoName] = useState<string>("Unknown Repository");
  const [branchName, setBranchName] = useState<string>("main");
  const [projectId, setProjectId] = useState<string | null>(null); // For Q&A conversation (recipe context)
  const recipeFetchDoneRef = useRef<string | null>(null); // Track which recipeId was fetched

  // Code gen chat: same backend as ask flow (codebase_qna_agent), one conversation per recipe
  const { user } = useAuthContext();
  const [codegenConversationId, setCodegenConversationId] = useState<string | null>(null);
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const codegenChatInitRef = useRef<string | null>(null);
  const prevRecipeIdForChatRef = useRef<string | null>(null);

  // When recipe (task) changes, reset codegen chat state so we don't use the previous recipe's conversation
  useEffect(() => {
    if (!recipeId) return;
    if (prevRecipeIdForChatRef.current !== null && prevRecipeIdForChatRef.current !== recipeId) {
      setCodegenConversationId(null);
      codegenChatInitRef.current = null;
    }
    prevRecipeIdForChatRef.current = recipeId;
  }, [recipeId]);

  // --- UI-only: plan phases for the "Generated Plan" card (keep backend intact) ---
  const [planPhases, setPlanPhases] = useState<Array<{ name: string; total: number }>>(
    []
  );

  // --- Selected phase and task for code display ---
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState<number>(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([0]));
  const [thinkingAccordionValue, setThinkingAccordionValue] = useState<string>("");

  // --- UI-only: chat messages (visual only; backend chat wiring can come later) ---
  type ChatMessage = { role: "user" | "assistant"; content: string };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInitDoneForRecipeRef = useRef<string | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const prevLayerCountRef = useRef<number>(0);

  // Collect all changed file paths from layers and build tree for "Changed files" modal
  const changedFilesTreeData = useMemo(() => {
    const paths: string[] = [];
    for (const layer of allLayers) {
      for (const task of layer.tasks ?? []) {
        if (task.file?.trim()) paths.push(task.file.trim());
        for (const change of task.changes ?? []) {
          if (change.path?.trim()) paths.push(change.path.trim());
        }
      }
    }
    const unique = Array.from(new Set(paths));
    return buildFileTree(unique);
  }, [allLayers]);

  // Map file path -> change content for the slider detail view (first occurrence per path)
  const pathToChange = useMemo(() => {
    const map: Record<string, { path: string; lang: string; content: string }> = {};
    for (const layer of allLayers) {
      for (const task of layer.tasks ?? []) {
        for (const change of task.changes ?? []) {
          if (change.path?.trim() && !map[change.path.trim()]) {
            map[change.path.trim()] = {
              path: change.path.trim(),
              lang: change.lang ?? "text",
              content: change.content ?? "",
            };
          }
        }
        if (task.file?.trim() && !map[task.file.trim()]) {
          const fromChange = task.changes?.find((c) => c.path?.trim() === task.file.trim());
          map[task.file.trim()] = {
            path: task.file.trim(),
            lang: fromChange?.lang ?? "text",
            content: fromChange?.content ?? "",
          };
        }
      }
    }
    return map;
  }, [allLayers]);

  // Download generated code as a zip (all changed files from layers)
  const handleDownloadCode = useCallback(async () => {
    const files: { path: string; content: string }[] = [];
    const seen = new Set<string>();
    for (const layer of allLayers) {
      for (const task of layer.tasks ?? []) {
        for (const change of task.changes ?? []) {
          const path = change.path?.trim();
          if (!path || seen.has(path)) continue;
          seen.add(path);
          files.push({ path, content: change.content ?? "" });
        }
      }
    }
    if (files.length === 0) {
      toast.error("No generated code to download.");
      return;
    }
    try {
      const zip = new JSZip();
      for (const { path, content } of files) {
        zip.file(path, content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const name = `codegen-${taskSplittingId ?? "export"}-${Date.now()}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      try {
        a.click();
      } finally {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      toast.success(`Downloaded ${files.length} file(s) as ${name}`);
    } catch (err) {
      toast.error("Failed to create download.");
    }
  }, [allLayers, taskSplittingId]);

  // Fetch recipe details (prompt + repo/branch) for the left header.
  // Only fetch once per recipeId to avoid re-renders on page refresh.
  useEffect(() => {
    if (!recipeId) return;
    // Skip if we already fetched for this recipeId
    if (recipeFetchDoneRef.current === recipeId) return;
    
    let mounted = true;
    const fromStorage = (() => {
      if (typeof window === "undefined") return null;
      try {
        const raw = localStorage.getItem(`recipe_${recipeId}`);
        return raw ? (JSON.parse(raw) as any) : null;
      } catch {
        return null;
      }
    })();

    // Mark as fetched before async call to prevent double fetches
    recipeFetchDoneRef.current = recipeId;

    const run = async () => {
      try {
        const details = await SpecService.getRecipeDetails(recipeId);
        if (!mounted) return;
        const prompt = (details.user_prompt || "").trim();
        setRecipePrompt(prompt);
        setProjectId(details.project_id?.trim() || null);
        const repo = details.repo_name?.trim() || fromStorage?.repo_name?.trim() || null;
        const branch = details.branch_name?.trim() || fromStorage?.branch_name?.trim() || "main";
        setRepoName(repo || "Unknown Repository");
        setBranchName(branch);
        if (repo && typeof window !== "undefined" && !new URLSearchParams(window.location.search).get("repoName")?.trim()) {
          dispatch(setRepoAndBranchForTask({ taskId: recipeId, repoName: repo, branchName: branch }));
        }
      } catch (e) {
        if (!mounted) return;
        setRecipePrompt(fromStorage?.user_prompt || "");
        setRepoName(fromStorage?.repo_name?.trim() || "Unknown Repository");
        setBranchName(fromStorage?.branch_name?.trim() || "main");
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [recipeId, dispatch]);

  // Prefer URL/Redux for repo/branch so we don't show "Unknown Repository" when API is empty or wrong
  const displayRepoName =
    repoNameFromUrl || storedRepoContext?.repoName || repoName;
  const displayBranchName = storedRepoContext?.branchName || branchName;

  // Initialize the left "chat" with the prompt + a codegen helper message (once per recipe).
  // Run once per recipeId; use fallback prompt if recipePrompt not loaded yet so the pane is never empty.
  useEffect(() => {
    if (!recipeId) return;
    if (chatInitDoneForRecipeRef.current === recipeId) return;

    const prompt = recipePrompt?.trim() || "Can you implement this feature?";
    chatInitDoneForRecipeRef.current = recipeId;
    setChatMessages([
      { role: "user", content: prompt },
      {
        role: "assistant",
        content:
          "Your code generation setup is complete. Check the implementation below.",
      },
    ]);
  }, [recipeId, recipePrompt]);

  // Get-or-create codegen Q&A conversation (same agent as ask flow) and load messages
  useEffect(() => {
    if (!recipeId || !user?.uid) return;
    if (codegenChatInitRef.current === recipeId) return;
    // Backend requires project_ids[0] for conversation creation; repo_name/branch_name are optional context
    if (!projectId || projectId.length === 0) return;

    const storageKey = `codegen_conversation_${recipeId}`;
    let existingId: string | null = null;
    if (typeof window !== "undefined") {
      try {
        existingId = localStorage.getItem(storageKey);
      } catch {
        // ignore
      }
    }
    // When creating a new conversation, wait for user prompt so we can name it like spec/plan
    const promptForTitle = recipePrompt?.trim();
    if (!existingId && !promptForTitle) return;

    let mounted = true;
    codegenChatInitRef.current = recipeId;

    const run = async () => {
      try {
        let conversationId: string | null = existingId;

        if (!conversationId) {
          const title = promptForTitle!.slice(0, 50) + (promptForTitle!.length > 50 ? "…" : "");
          const agentId = "codebase_qna_agent";
          const res = await ChatService.createConversation(
            user.uid,
            title,
            projectId || null,
            agentId,
            true, // hidden
            displayRepoName !== "Unknown Repository" ? displayRepoName : undefined,
            displayBranchName !== "main" ? displayBranchName : undefined
          );
          conversationId = res?.conversation_id ?? null;
          if (conversationId && typeof window !== "undefined") {
            try {
              localStorage.setItem(storageKey, conversationId);
            } catch {
              // ignore
            }
          }
        }

        if (!mounted) return;
        if (conversationId) {
          setCodegenConversationId(conversationId);
          try {
            const loaded = await ChatService.loadMessages(conversationId, 0, 500);
            if (!mounted) return;
            if (loaded && loaded.length > 0) {
              const mapped: ChatMessage[] = loaded.map((m: { sender: string; text: string }) => ({
                role: m.sender === "user" ? "user" : "assistant",
                content: m.text ?? "",
              }));
              setChatMessages(mapped);
            }
          } catch (loadErr) {
            console.error("[Code Page] Load messages failed (stale conversation?):", loadErr);
            if (!mounted) return;
            // Stale or deleted conversation: clear so we can create a new one on next run
            try {
              localStorage.removeItem(storageKey);
            } catch {
              // ignore
            }
            setCodegenConversationId(null);
            codegenChatInitRef.current = null;
            toast.error("Chat session expired. It will be recreated when you send a message.");
          }
        }
      } catch (e) {
        console.error("[Code Page] Codegen chat init error:", e);
        if (mounted) {
          codegenChatInitRef.current = null;
          try {
            const storageKey = `codegen_conversation_${recipeId}`;
            localStorage.removeItem(storageKey);
          } catch {
            // ignore
          }
          toast.error("Could not set up chat. You can try again later.");
        }
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [recipeId, user?.uid, projectId, displayRepoName, displayBranchName, recipePrompt]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [chatMessages.length]);

  // Notify when a new phase layer arrives during this session (not on initial load)
  useEffect(() => {
    if (prevLayerCountRef.current === 0 && allLayers.length > 0) {
      prevLayerCountRef.current = allLayers.length;
      return;
    }
    if (allLayers.length <= prevLayerCountRef.current) return;
    const newLayers = allLayers.slice(prevLayerCountRef.current);
    for (const layer of newLayers) {
      toast.success(`Phase completed: ${layer.title}`);
    }
    prevLayerCountRef.current = allLayers.length;
  }, [allLayers]);

  // Reset local PR creation spinner if backend state updates
  useEffect(() => {
    if (taskSplittingStatus?.pr_status !== "IN_PROGRESS") {
      setIsCreatingPR(false);
    }
  }, [taskSplittingStatus?.pr_status]);

  // Poll for PR status after user clicks "Create PR".
  // The main polling effects stop once codegen completes, so we need a
  // dedicated poller that runs while pr_status is IN_PROGRESS.
  // Use a ref to track if we've shown the success/error toast to avoid duplicates.
  const prToastShownRef = useRef(false);
  useEffect(() => {
    if (!taskSplittingId) return;
    const prStatus = taskSplittingStatus?.pr_status;
    
    // Don't start polling if PR is already done (COMPLETED/FAILED with URL or no isCreatingPR)
    if (taskSplittingStatus?.pr_url) {
      // PR already exists, no need to poll
      setIsCreatingPR(false);
      return;
    }
    if (prStatus !== "IN_PROGRESS" && !isCreatingPR) return;
    
    // Reset toast flag when starting new PR creation
    if (isCreatingPR && prStatus !== "IN_PROGRESS") {
      prToastShownRef.current = false;
    }

    let mounted = true;
    const poll = async () => {
      try {
        const status =
          await TaskSplittingService.getTaskSplittingStatus(taskSplittingId);
        if (!mounted) return;
        
        // Only update if status changed
        setTaskSplittingStatus((prev) => {
          if (!prev) return status;
          if (
            prev.status === status.status &&
            prev.codegen_status === status.codegen_status &&
            prev.pr_status === status.pr_status &&
            prev.pr_url === status.pr_url
          ) {
            return prev;
          }
          return status;
        });

        // Show toast only once per PR creation attempt
        if (status.pr_url && !prToastShownRef.current) {
          prToastShownRef.current = true;
          toast.success("Pull request created!");
          setIsCreatingPR(false);
        } else if (status.pr_status === "FAILED" && !prToastShownRef.current) {
          prToastShownRef.current = true;
          toast.error(status.pr_error_message || "PR creation failed");
          setIsCreatingPR(false);
        }
      } catch (e) {
        console.error("[Code Page] PR status poll error:", e);
      }
    };

    const interval = setInterval(poll, 3000);
    // Also poll immediately
    poll();

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [taskSplittingId, taskSplittingStatus?.pr_status, taskSplittingStatus?.pr_url, isCreatingPR]);

  // Fetch plan by recipeId (new API: plan items come from getPlanStatusByRecipeId)
  // Only skip fetch when we already have plan items for this recipe (avoid re-fetch on re-renders).
  useEffect(() => {
    if (!recipeId) return;
    // If we already have plan items, only update URL if needed; don't re-fetch
    if (planItems.length > 0 && planId === recipeId) return;

    setIsLoadingPlanItems(true);

    PlanService.getPlanStatusByRecipeId(recipeId)
      .then((status) => {
        if (status.plan) {
          // Keep phase-level meta for "Generated Plan" card
          try {
            const phases = Array.isArray(status.plan.phases) ? status.plan.phases : [];
            setPlanPhases(
              phases.map((p: any, i: number) => ({
                name: String(p?.name || `PHASE ${i + 1}`),
                total: Array.isArray(p?.plan_items) ? p.plan_items.length : 0,
              }))
            );
          } catch {
            setPlanPhases([]);
          }
          const items: PlanItem[] = [];
          let itemNumber = 1;
          status.plan.phases.forEach((phase) => {
            phase.plan_items.forEach((item) => {
              items.push({
                id: item.plan_item_id,
                item_number: itemNumber++,
                order: item.order,
                title: item.title,
                detailed_objective: item.description,
                implementation_steps: [],
                description: item.description,
                verification_criteria: "",
                files: [],
                context_handoff: {},
                reasoning: "",
                architecture: "",
              });
            });
          });
          setPlanItems(items);
          setPlanId(recipeId);
          // Only update URL when it's missing planId or itemNumber to avoid unnecessary re-renders
          const currentUrl = new URL(window.location.href);
          const currentPlanId = currentUrl.searchParams.get("planId");
          const currentItemNumber = currentUrl.searchParams.get("itemNumber");
          if (currentPlanId !== recipeId || !currentItemNumber) {
            const params = new URLSearchParams(currentUrl.search);
            params.set("planId", recipeId);
            if (!params.get("itemNumber")) params.set("itemNumber", "1");
            router.replace(`/task/${recipeId}/code?${params.toString()}`);
          }
        }
      })
      .catch((error) => {
        console.error("Error fetching plan status:", error);
      })
      .finally(() => {
        setIsLoadingPlanItems(false);
      });
  }, [recipeId, planId, planItems.length, router]);

  // Submit task splitting when we have planId and itemNumber but no taskSplittingId
  // Use planItemsRef to avoid re-running when planItems array updates
  const planItemsLength = planItems.length;
  useEffect(() => {
    if (!planId || !activeSliceId || taskSplittingId) return;
    // Wait for plan items to be loaded before submitting
    if (planItemsLength === 0 || isLoadingPlanItems) return;

    // Priority 1: Check URL parameter
    if (taskSplittingIdFromUrl) {
      setTaskSplittingId(taskSplittingIdFromUrl);
      setIsRunning(true); // Ensure codegen polling runs for this job
      localStorage.setItem(
        `task_splitting_${planId}_${activeSliceId}`,
        taskSplittingIdFromUrl
      );
      return;
    }

    // Priority 2: Check localStorage
    const storedTaskSplittingId = localStorage.getItem(
      `task_splitting_${planId}_${activeSliceId}`
    );
    if (storedTaskSplittingId) {
      setTaskSplittingId(storedTaskSplittingId);
      setIsRunning(true); // Ensure codegen polling runs when revisiting
      return;
    }

    // Priority 3: Submit new task splitting request
    const submitTaskSplitting = async () => {
      try {
        // Find the plan item by item_number to get its id (plan_item_id)
        // Use ref to get current plan items to avoid stale closure
        const currentPlanItems = planItemsRef.current;
        const planItem = currentPlanItems.find(
          (item) => item.item_number === activeSliceId
        );
        if (!planItem) {
          console.error(
            "[Code Page] Plan item not found for item_number:",
            activeSliceId
          );
          console.error(
            "[Code Page] Available plan items:",
            currentPlanItems.map((item) => item.item_number)
          );
          // Don't show error toast - just wait for plan items to load or user to select valid item
          return;
        }

        console.log(
          "[Code Page] Submitting task splitting for plan_item_id:",
          planItem.id
        );
        const response = await TaskSplittingService.submitTaskSplitting({
          recipe_id: recipeId,
          plan_item_id: planItem.id,
        });
        console.log("[Code Page] Task splitting submitted:", response);
        setTaskSplittingId(response.task_splitting_id);
        setIsRunning(true); // Start codegen polling for live updates
        localStorage.setItem(
          `task_splitting_${planId}_${activeSliceId}`,
          response.task_splitting_id
        );

        // Update URL with taskSplittingId - use window.location to get fresh URL
        const currentUrl = new URL(window.location.href);
        const params = new URLSearchParams(currentUrl.search);
        params.set("taskSplittingId", response.task_splitting_id);
        router.replace(`/task/${recipeId}/code?${params.toString()}`);

        toast.success("Task splitting started");
      } catch (error: any) {
        console.error("[Code Page] Error submitting task splitting:", error);
        toast.error(error.message || "Failed to start task splitting");
      }
    };

    submitTaskSplitting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    planId,
    activeSliceId,
    taskSplittingId,
    taskSplittingIdFromUrl,
    recipeId,
    planItemsLength,
    isLoadingPlanItems,
  ]);

  // 1. Reset State when Slice Changes
  // Track if this is the initial mount to avoid resetting state on page refresh
  const isInitialMountRef = useRef(true);
  const prevActiveSliceIdRef = useRef<number | null>(null);
  
  useEffect(() => {
    // On initial mount, don't reset - let the task splitting effect handle loading existing data
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevActiveSliceIdRef.current = activeSliceId;
      
      // On initial mount, check if we have a stored task splitting ID and use it
      if (planId) {
        const storedTaskSplittingId = localStorage.getItem(
          `task_splitting_${planId}_${activeSliceId}`
        );
        if (storedTaskSplittingId && !taskSplittingId) {
          setTaskSplittingId(storedTaskSplittingId);
          // If already completed, don't show graph loading animation
          if (completedSlices.includes(activeSliceId)) {
            setIsGraphLoading(false);
          }
        }
      }
      return;
    }
    
    // Only run reset logic if activeSliceId actually changed (not just on re-renders)
    if (prevActiveSliceIdRef.current === activeSliceId) {
      return;
    }
    prevActiveSliceIdRef.current = activeSliceId;
    
    // Only reset if we haven't completed this slice
    if (!completedSlices.includes(activeSliceId)) {
      setCurrentDag([]);
      setAllLayers([]);
      prevLayerCountRef.current = 0;
      setGlobalLogs([]);
      setGraphLoadIndex(0);
      setIsRunning(false);
      setIsGraphLoading(true); // Start the step-by-step graph loading
      setTaskSplittingId(null); // Reset task splitting ID to trigger new submission
      setTaskSplittingStatus(null); // Reset status
    } else {
      // If revisiting completed slice, show full graph immediately
      // Try to get stored task_splitting_id for this slice
      if (planId) {
        const storedTaskSplittingId = localStorage.getItem(
          `task_splitting_${planId}_${activeSliceId}`
        );
        if (
          storedTaskSplittingId &&
          storedTaskSplittingId !== taskSplittingId
        ) {
          setTaskSplittingId(storedTaskSplittingId);
        }
      }
      setCurrentDag(allLayers);
      setIsGraphLoading(false); // Already loaded
      setGraphLoadIndex(allLayers.length);
    }
  }, [activeSliceId, planId, completedSlices, taskSplittingId, allLayers]);

  // 2. UNIFIED poll for task splitting status, layers, and codegen status
  // This consolidates what was previously 2 separate polling effects to avoid duplicate API calls
  useEffect(() => {
    if (!taskSplittingId) return;

    let mounted = true;
    let pollInterval: NodeJS.Timeout;

    // Prevent concurrent fetches
    let isFetchingLayers = false;
    
    // Fetch layers with pagination
    const fetchLayersWithPagination = async (): Promise<TaskLayer[]> => {
      // Skip if already fetching (prevents pile-up during slow connections)
      if (isFetchingLayers) {
        return allLayersRef.current;
      }
      
      isFetchingLayers = true;
      try {
        let allLayersData: TaskLayer[] = [];
        let start = 0;
        let hasMore = true;

        while (hasMore) {
          const response = await TaskSplittingService.getTaskSplittingItems(
            taskSplittingId,
            start,
            10
          );
          allLayersData = [...allLayersData, ...response.layers];

          if (response.next_layer_order === null) {
            hasMore = false;
          } else {
            start = response.next_layer_order;
          }
        }

        if (!mounted) return [];

        // Apply layer updates in a transition to avoid a visible "refresh" when codegen completes
        startTransition(() => {
          // Only update if layers actually changed - use merge to preserve refs
          setAllLayers((prev) => {
            if (prev.length !== allLayersData.length) return allLayersData;

            const hasChanged = allLayersData.some((layer, idx) => {
              const prevLayer = prev[idx];
              if (!prevLayer) return true;
              if (layer.status !== prevLayer.status) return true;
              if (layer.tasks?.length !== prevLayer.tasks?.length) return true;
              return layer.tasks?.some((task, tIdx) => {
                const prevTask = prevLayer.tasks?.[tIdx];
                if (!prevTask) return true;
                if (task.status !== prevTask.status) return true;
                return (
                  (task.changes?.length ?? 0) !== (prevTask.changes?.length ?? 0)
                );
              });
            });

            return hasChanged
              ? mergeLayersForCompletion(prev, allLayersData)
              : prev;
          });
          setNextLayerOrder(null);

          if (allLayersData.length > 0) {
            setCurrentDag((prev) => {
              if (prev.length < allLayersData.length) return allLayersData;
              return prev;
            });
            setGraphLoadIndex((prev) =>
              prev < allLayersData.length ? allLayersData.length : prev
            );
          }
        });
        return allLayersData;
      } catch (error) {
        console.error("[Code Page] Error fetching layers:", error);
        return allLayersRef.current; // Return cached on error
      } finally {
        isFetchingLayers = false;
      }
    };

    const fetchStatusAndLayers = async () => {
      try {
        const status =
          await TaskSplittingService.getTaskSplittingStatus(taskSplittingId);

        if (!mounted) return;

        // Only update state if status actually changed - avoid unnecessary re-renders
        setTaskSplittingStatus((prev) => {
          if (!prev) return status;
          
          // Compare key fields to avoid unnecessary re-renders
          const statusChanged = 
            prev.status !== status.status ||
            prev.codegen_status !== status.codegen_status ||
            prev.current_step !== status.current_step ||
            prev.pr_status !== status.pr_status ||
            prev.pr_url !== status.pr_url ||
            prev.error_message !== status.error_message;
          
          // Only compare activity length, not full content (content shown separately)
          const activityChanged = 
            (prev.agent_activity?.length ?? 0) !== (status.agent_activity?.length ?? 0);
          
          if (!statusChanged && !activityChanged) {
            return prev; // No change, return same reference to prevent re-render
          }
          
          return status;
        });

        // Only fetch layers when:
        // 1. We don't have any layers yet, OR
        // 2. Codegen is actively running (IN_PROGRESS), OR
        // 3. Current phase changed (new layer might be available), OR
        // 4. Codegen just completed (refetch so tasks have final "changes" for Changed files view)
        // Use refs to access current values without causing dependency issues
        let fetchedLayers: TaskLayer[] = [];
        const cachedLayers = allLayersRef.current;
        const prevStatus = taskSplittingStatusRef.current;
        
        const codegenJustCompleted =
          status.codegen_status === "COMPLETED" && prevStatus?.codegen_status !== "COMPLETED";

        const shouldFetchLayers =
          (status.status === "COMPLETED" || status.status === "IN_PROGRESS") &&
          (cachedLayers.length === 0 ||
            status.codegen_status === "IN_PROGRESS" ||
            status.current_step !== prevStatus?.current_step ||
            codegenJustCompleted);

        if (shouldFetchLayers) {
          fetchedLayers = await fetchLayersWithPagination();
        } else {
          fetchedLayers = cachedLayers; // Use cached layers - no API call needed
        }

        // Handle codegen completion/failure logic (previously in separate effect)
        if (status.codegen_status === "IN_PROGRESS" || status.codegen_status === "COMPLETED") {
          // Check if all tasks are completed for auto-advance logic
          const allCompleted = fetchedLayers.length > 0 && fetchedLayers.every((layer) => {
            const layerStatus = mapApiStatusToUI(layer.status);
            return (
              layerStatus === "completed" ||
              layer.tasks.every((task) => {
                const taskStatus = mapApiStatusToUI(task.status);
                return taskStatus === "completed";
              })
            );
          });

          if (allCompleted && !completedSlices.includes(activeSliceId)) {
            setCompletedSlices((prev) => [...prev, activeSliceId]);
            setGlobalLogs((prev) => [
              ...prev,
              `SUCCESS: Vertical Slice ${String(activeSliceId).padStart(2, "0")} verified.`,
            ]);

            // Auto-advance to next slice if available
            const nextSlice = planItemsRef.current.find(
              (item) => item.item_number > activeSliceId
            );
            if (nextSlice) {
              setTimeout(() => {
                setActiveSliceId(nextSlice.item_number);
              }, 1000);
            } else {
              setIsRunning(false);
            }
          }
        }

        // Stop polling and update state when codegen completes or fails
        if (status.codegen_status === "COMPLETED" || status.codegen_status === "FAILED") {
          setIsRunning(false);
        }

        // Stop polling if task splitting is done (but codegen may still be running)
        if (status.status === "COMPLETED" || status.status === "FAILED") {
          // Only stop polling if codegen is also done
          if (status.codegen_status === "COMPLETED" || status.codegen_status === "FAILED" || !status.codegen_status) {
            if (pollInterval) clearInterval(pollInterval);
          }
          if (status.status === "COMPLETED") {
            setIsGraphLoading(false);
          }
        }

        // Show toast when job fails (only once)
        if (status.codegen_status === "FAILED" && !hasShownFailedToastRef.current) {
          hasShownFailedToastRef.current = true;
          toast.error("Code generation failed. Please try again.", { title: "Error" });
        }
        
        // Show warning toast when completed with errors (only once)
        if (
          status.codegen_status === "COMPLETED" && 
          status.error_message && 
          !hasShownFailedToastRef.current
        ) {
          hasShownFailedToastRef.current = true;
          toast.warning(
            status.error_message || "Code generation completed with some errors. Review the results.",
            { title: "Completed with Errors" }
          );
        }

        // Reset toast flag when job recovers or is reset
        if (status.codegen_status !== "FAILED" && !status.error_message && hasShownFailedToastRef.current) {
          hasShownFailedToastRef.current = false;
        }
      } catch (error) {
        console.error(
          "[Code Page] Error polling task splitting status:",
          error
        );
      }
    };

    // Initial fetch - check if already complete before starting polling
    const initPolling = async () => {
      // First, do initial fetch
      await fetchStatusAndLayers();
      
      if (!mounted) return;
      
      // After initial fetch, check if we even need to poll
      // Use the latest status from ref (updated by fetchStatusAndLayers)
      const currentStatus = taskSplittingStatusRef.current;
      const isAlreadyComplete = 
        currentStatus?.codegen_status === "COMPLETED" || 
        currentStatus?.codegen_status === "FAILED";
      
      // Only start polling if codegen is still in progress
      if (!isAlreadyComplete) {
        pollInterval = setInterval(fetchStatusAndLayers, 3000);
      } else {
        // Codegen already done - no need to poll, just ensure UI is updated
        setIsGraphLoading(false);
        setIsRunning(false);
      }
    };
    
    initPolling();

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
    // Only re-run when taskSplittingId or activeSliceId changes. Do NOT depend on planItems.length:
    // when plan loads, planItems.length 0->N would restart polling and cause a visible refresh.
    // planItemsRef is used inside for auto-advance; completedSlices omitted to avoid restarting interval.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskSplittingId, activeSliceId]);

  // Codegen "stream" timeline from polled agent_activity (same display pattern as spec/plan)
  const codegenStreamItems: StreamTimelineItem[] = useMemo(() => {
    const activity = taskSplittingStatus?.agent_activity ?? [];
    return activity.map((evt, i) => {
      const tool = evt.tool || "unknown";
      const paramDisplay = getParamDisplayForEvt(evt as AgentActivityEvt);
      const phaseTask =
        evt.phase != null ? `P${evt.phase + 1}.T${(evt.task ?? 0) + 1}` : "";
      const oneLine = [tool, paramDisplay, phaseTask].filter(Boolean).join(" · ");
      const result =
        evt.params && typeof evt.params === "object"
          ? JSON.stringify(evt.params, null, 2)
          : oneLine || "";
      return {
        type: "tool" as const,
        id: `codegen-${i}-${evt.tool ?? i}`,
        label: oneLine.length > 60 ? oneLine.slice(0, 60) + "…" : oneLine,
        phase: "done" as const,
        result,
      };
    });
  }, [taskSplittingStatus?.agent_activity]);

  // Live codegen stream (when backend supports SSE) – same event shape as spec/plan
  const [codegenLiveStreamItems, setCodegenLiveStreamItems] = useState<StreamTimelineItem[]>([]);
  const codegenStreamAbortRef = useRef<AbortController | null>(null);
  const codegenStreamItemIdRef = useRef(0);
  const codegenStreamEndRef = useRef<HTMLDivElement>(null);
  const hasRestoredCodegenThinkingRef = useRef<string | null>(null);

  useEffect(() => {
    const taskId = taskSplittingId;
    const inProgress =
      taskSplittingStatus?.codegen_status === "IN_PROGRESS" ||
      taskSplittingStatus?.status === "IN_PROGRESS";
    if (!taskId || !inProgress) return;

    codegenStreamAbortRef.current?.abort();
    codegenStreamAbortRef.current = new AbortController();
    setCodegenLiveStreamItems([]);

    TaskSplittingService.connectCodegenStream(taskId, {
      signal: codegenStreamAbortRef.current.signal,
      onEvent(eventType: string, data: Record<string, unknown>) {
        const payload = getStreamEventPayload(data);
        if (eventType === "chunk" && payload?.content) {
          const content = String(payload.content);
          setCodegenLiveStreamItems((prev) => {
            const last = prev[prev.length - 1];
            if (last?.type === "chunk") {
              return [...prev.slice(0, -1), { ...last, content: last.content + content }];
            }
            return [...prev, { type: "chunk", id: `codegen-chunk-${++codegenStreamItemIdRef.current}`, content }];
          });
        }
        if (eventType === "tool_call_start" && payload?.tool) {
          const call_id = (payload.call_id as string) ?? `codegen-tool-${++codegenStreamItemIdRef.current}`;
          setCodegenLiveStreamItems((prev) => [
            ...prev,
            { type: "tool", id: call_id, label: String(payload.tool), phase: "running" },
          ]);
        }
        if (eventType === "tool_call_end" && payload?.tool) {
          const call_id = payload.call_id as string | undefined;
          const label = String(payload.tool);
          const result = payload.result;
          const segmentContent =
            result !== undefined && result !== null
              ? typeof result === "object"
                ? JSON.stringify(result, null, 2)
                : String(result)
              : "";
          setCodegenLiveStreamItems((prev) => {
            const idx = call_id
              ? prev.findIndex((it) => it.type === "tool" && it.id === call_id)
              : prev.findLastIndex(
                  (it) => it.type === "tool" && it.phase === "running" && it.label === label
                );
            if (idx === -1) return prev;
            const next = [...prev];
            const cur = next[idx];
            if (cur.type === "tool")
              next[idx] = { ...cur, phase: "done", result: segmentContent };
            return next;
          });
        }
        if (eventType === "end" || eventType === "error") {
          codegenStreamAbortRef.current?.abort();
        }
      },
      onError() {
        setCodegenLiveStreamItems((prev) => prev);
      },
    });

    return () => {
      codegenStreamAbortRef.current?.abort();
    };
  }, [
    taskSplittingId,
    taskSplittingStatus?.codegen_status,
    taskSplittingStatus?.status,
  ]);

  const displayCodegenItems =
    codegenLiveStreamItems.length > 0 ? codegenLiveStreamItems : codegenStreamItems;
  const codegenStreamItemsLength = displayCodegenItems.length;
  useEffect(() => {
    if (codegenStreamItemsLength > 0) {
      codegenStreamEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [codegenStreamItemsLength]);

  // Determine if codegen is complete for persistence
  const codegenIsComplete =
    taskSplittingStatus?.status === "COMPLETED" ||
    taskSplittingStatus?.codegen_status === "COMPLETED";

  // Persist codegen thinking when done so it survives refresh
  useEffect(() => {
    if (!taskSplittingId || !codegenIsComplete) return;
    const items = codegenLiveStreamItems.length > 0 ? codegenLiveStreamItems : codegenStreamItems;
    if (items.length > 0) {
      try {
        sessionStorage.setItem(
          `${THINKING_STORAGE_KEY_CODEGEN}_${taskSplittingId}`,
          JSON.stringify({ streamItems: items })
        );
      } catch {
        // ignore
      }
    }
  }, [taskSplittingId, codegenIsComplete, codegenLiveStreamItems, codegenStreamItems]);

  // Restore codegen thinking on load when already complete but no stream state (e.g. after refresh)
  useEffect(() => {
    if (!taskSplittingId || !codegenIsComplete) return;
    if (codegenLiveStreamItems.length > 0 || codegenStreamItems.length > 0) return;
    if (hasRestoredCodegenThinkingRef.current === taskSplittingId) return;
    hasRestoredCodegenThinkingRef.current = taskSplittingId;
    try {
      const raw = sessionStorage.getItem(`${THINKING_STORAGE_KEY_CODEGEN}_${taskSplittingId}`);
      if (!raw) return;
      const data = JSON.parse(raw) as { streamItems?: StreamTimelineItem[] };
      const items = Array.isArray(data.streamItems) ? data.streamItems : [];
      if (items.length > 0) {
        setCodegenLiveStreamItems(items);
      }
    } catch {
      // ignore
    }
  }, [taskSplittingId, codegenIsComplete, codegenLiveStreamItems.length, codegenStreamItems.length]);

  // 3. Step-by-Step Graph Discovery (Loading Phase) - progressive reveal
  // Depend on primitive values (length, status string) so polling updates to allLayers/taskSplittingStatus
  // (new refs, same content) don't re-run this effect and cause refresh/jank.
  const layersLength = allLayers.length;
  const taskSplittingStatusStatus = taskSplittingStatus?.status;
  useEffect(() => {
    if (!isGraphLoading) return;

    // Wait for task splitting to complete and layers to be fetched
    if (taskSplittingStatusStatus !== "COMPLETED" || layersLength === 0) {
      return;
    }

    // Load layers progressively
    if (graphLoadIndex < layersLength) {
      const layerIndexToAdd = graphLoadIndex;
      const timer = setTimeout(() => {
        const layers = allLayersRef.current;
        const nextLayer = layers[layerIndexToAdd];
        if (nextLayer) {
          setCurrentDag((prev) => [...prev, nextLayer]);
        }
        setGraphLoadIndex((prev) => prev + 1);
      }, 600); // 600ms delay between levels appearing

      return () => clearTimeout(timer);
    } else {
      // Done loading graph
      setIsGraphLoading(false);
    }
  }, [
    isGraphLoading,
    graphLoadIndex,
    activeSliceId,
    layersLength,
    taskSplittingStatusStatus,
  ]);

  // 4. NOTE: Codegen polling was consolidated into effect #2 above to avoid duplicate API calls

  // Auto-scroll logic
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [globalLogs, showGlobalLogs]);

  // Auto-scroll sidebar
  useEffect(() => {
    if (sidebarRef.current) {
      const activeEl = sidebarRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [activeSliceId]);

  const isSliceComplete = completedSlices.includes(activeSliceId);
  const activeSliceMeta = planItems.find(
    (item) => item.item_number === activeSliceId
  );

  // Manual navigation
  const handleManualSliceChange = (id: number) => {
    setActiveSliceId(id);
    // Update URL with itemNumber
    const params = new URLSearchParams(searchParams.toString());
    params.set("itemNumber", id.toString());
    if (planId) {
      params.set("planId", planId);
    }
    router.replace(`/task/${recipeId}/code?${params.toString()}`);
  };

  // Build a simple feed of file diffs/contents from layers->tasks->changes
  // Include phase index for filtering - memoized to prevent re-renders
  // MUST be before any early returns (React hooks rule)
  const changeFeedAll = useMemo(
    () =>
      allLayers.flatMap((layer, layerIdx) =>
        layer.tasks.flatMap((t) =>
          (t.changes || []).map((c) => ({
            layerTitle: layer.title,
            layerIdx,
            taskTitle: t.title,
            path: c.path,
            lang: c.lang,
            content: c.content,
            status: t.status,
          }))
        )
      ),
    [allLayers]
  );

  // Filter change feed by selected phase - memoized
  // MUST be before any early returns (React hooks rule)
  const changeFeed = useMemo(
    () => changeFeedAll.filter((c) => c.layerIdx === selectedPhaseIndex),
    [changeFeedAll, selectedPhaseIndex]
  );

  // Invalid route: missing task/recipe id
  if (!recipeId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-primary-color font-medium">Invalid task.</p>
          <p className="text-sm text-primary-color mt-2">Go back and open a task from the plan.</p>
        </div>
      </div>
    );
  }

  // Show loading if we don't have planId yet (plan items loading)
  if (!planId && isLoadingPlanItems) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-color" />
          <p className="text-primary-color">Loading task data...</p>
        </div>
      </div>
    );
  }

  // Show loading if task splitting is being submitted
  // if (planId && !taskSplittingId && !taskSplittingStatus) {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <div className="text-center">
  //         <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-color" />
  //         <p className="text-primary-color">Starting task splitting...</p>
  //         <p className="text-sm text-primary-color mt-2">Preparing code generation for Slice {String(activeSliceId).padStart(2, '0')}</p>
  //       </div>
  //     </div>
  //   );
  // }

  const Badge = ({
    children,
    icon: Icon,
  }: {
    children: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
  }) => (
    <div className="flex items-center gap-1.5 px-2 py-0.5 border border-[#D3E5E5] rounded text-xs font-medium text-primary-color bg-white">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span className="truncate">{children}</span>
      </div>
    );

  const handleSendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text) return;
    if (isChatStreaming) return;

    if (!user?.uid) {
      toast.error("Sign in to use chat.");
      return;
    }
    if (!codegenConversationId) {
      toast.error("Chat is still setting up. Try again in a moment.");
      return;
    }

    setIsChatStreaming(true);
    setChatInput("");
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);

    try {
      await ChatService.streamMessage(
        codegenConversationId,
        text,
        [], // selectedNodes
        [], // images
        (message: string) => {
          setChatMessages((prev) => {
            const next = [...prev];
            const lastIdx = next.length - 1;
            if (lastIdx >= 0 && next[lastIdx]?.role === "assistant") {
              next[lastIdx] = { role: "assistant", content: message };
            }
            return next;
          });
        }
      );
    } catch (e: unknown) {
      console.error("[Code Page] Chat stream error:", e);
      const errMsg = e instanceof Error ? e.message : "Failed to send message";
      toast.error(errMsg);
      setChatMessages((prev) => {
        const next = [...prev];
        const lastIdx = next.length - 1;
        if (lastIdx >= 0 && next[lastIdx]?.role === "assistant" && next[lastIdx]?.content === "") {
          next[lastIdx] = { role: "assistant", content: "Sorry, something went wrong. Please try again." };
        }
        return next;
      });
    } finally {
      setIsChatStreaming(false);
      setChatMessages((prev) => {
        const next = [...prev];
        const lastIdx = next.length - 1;
        if (
          lastIdx >= 0 &&
          next[lastIdx]?.role === "assistant" &&
          next[lastIdx]?.content.trim() === ""
        ) {
          next[lastIdx] = { role: "assistant", content: "No response." };
        }
        return next;
      });
    }
  };

    return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-primary-color font-sans selection:bg-zinc-100 antialiased">
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Chat + plan */}
        <div className="flex-[1] flex flex-col min-w-0 min-h-0 overflow-hidden border-r border-[#D3E5E5] bg-[#FAF8F7]">
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 shrink-0">
            <h1 className="text-lg font-bold text-primary-color truncate capitalize">
              {recipePrompt?.slice(0, 50) ?? "Chat Name"}
              {(recipePrompt?.length ?? 0) > 50 ? "…" : ""}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              <Badge icon={Github}>{displayRepoName}</Badge>
              <Badge icon={GitBranch}>{displayBranchName}</Badge>
        </div>
      </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            {chatMessages.map((msg, i) => (
              <React.Fragment key={i}>
                <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-10 h-10 rounded-lg shrink-0 mr-3 mt-0.5 flex items-center justify-center bg-[#102C2C]">
                      <Image
                        src="/images/logo.svg"
                        width={24}
                        height={24}
                        alt="Potpie Logo"
                        className="w-6 h-6"
                      />
          </div>
                  )}
                  <div
                    className={`max-w-[85%] text-sm ${
                      msg.role === "user"
                        ? "rounded-t-xl rounded-bl-xl px-4 py-3 bg-white border border-gray-200 text-gray-900"
                        : "px-4 py-3 text-gray-900"
                    }`}
                  >
                    {msg.role === "assistant" &&
                    !msg.content &&
                    isChatStreaming &&
                    i === chatMessages.length - 1 ? (
                      <span className="inline-flex items-center gap-3 text-[#022D2C]">
                        <span
                          className="inline-block w-5 h-5 rounded-full border-2 border-[#102C2C] border-t-transparent animate-spin shrink-0"
                          aria-hidden
                        />
                        <span className="flex items-center gap-1 font-medium">
                          <Sparkles className="w-3.5 h-3.5 text-[#00291C] shrink-0" />
                          Crafting response
                          <span className="inline-flex gap-0.5 ml-0.5 [&>span]:w-1 [&>span]:h-1 [&>span]:rounded-full [&>span]:bg-[#022D2C] [&>span]:animate-bounce">
                            <span />
                            <span />
                            <span />
                          </span>
                        </span>
                      </span>
                    ) : (
                      msg.content
                    )}
                  </div>
                    </div>

                {/* Spec Generation Completed card - separate */}
                {i === 1 && (
                  <div className="flex justify-start ml-[3.25rem]">
                    <div className="max-w-[85%] w-full space-y-3">
                      {/* Spec Generation Status - separate card */}
                      <div className="rounded-lg border border-gray-200 bg-[#FAF8F7] px-4 py-4">
                        <div className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-[#022D2C] shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-[#00291C]">Spec Generation Completed</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">STATUS: COMPLETED</p>
                    </div>
                  </div>
            </div>

                      {/* Generated Plan - separate card with expandable phases and tasks */}
                      <div className="rounded-lg border border-gray-200 bg-[#FAF8F7] px-4 py-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-3.5 h-3.5 text-[#00291C]" />
                          <p className="text-xs font-bold text-[#00291C]">Generated Plan</p>
            </div>
                        <div className="space-y-1">
                          {(planPhases.length > 0 ? planPhases : []).map((p, idx) => {
                            // Get tasks from planItems (pre-populated from plan API)
                            const phasePlanItems = planItems.filter((item) => {
                              // Find which phase this item belongs to based on order
                              const itemPhaseIndex = planPhases.findIndex((ph, i) => {
                                const prevTotal = planPhases
                                  .slice(0, i)
                                  .reduce((sum, ph) => sum + (ph.total || 0), 0);
                                const itemIdx = item.item_number - 1;
                                return itemIdx >= prevTotal && itemIdx < prevTotal + (ph.total || 0);
                              });
                              return itemPhaseIndex === idx;
                            });
                            
                            // Get runtime status from allLayers (codegen)
                            const layer = allLayers[idx];
                            const runtimeTasks = layer?.tasks || [];
                            
                            // Merge plan items with runtime status
                            const tasks = phasePlanItems.map((planItem, i) => {
                              const runtimeTask = runtimeTasks[i];
                              return {
                                id: planItem.id,
                                title: planItem.title,
                                status: runtimeTask?.status || "PENDING",
                              };
                            });
                            
                            const total = p.total || 0;
                            const done = tasks.filter((t) => t.status === "COMPLETED").length;
                            const isActiveCodegen =
                              taskSplittingStatus?.current_step === idx &&
                              (taskSplittingStatus?.status === "IN_PROGRESS" ||
                                taskSplittingStatus?.codegen_status === "IN_PROGRESS");
                            const isCompleted = done >= total && total > 0;
                            const isExpanded = expandedPhases.has(idx);
                            
                    return (
                              <div key={`${p.name}-${idx}`} className="">
                                {/* Phase header */}
                                <button
                                  onClick={() => {
                                    setSelectedPhaseIndex(idx);
                                    setSelectedTaskId(null); // Clear selected task when clicking phase
                                    setExpandedPhases((prev) => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(idx)) {
                                        newSet.delete(idx);
                                      } else {
                                        newSet.add(idx);
                                      }
                                      return newSet;
                                    });
                                  }}
                                  className={`w-full flex items-center justify-between gap-3 py-1.5 transition-colors text-left rounded px-2 ${
                                    selectedPhaseIndex === idx && !selectedTaskId ? "bg-zinc-100" : "hover:bg-zinc-50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <ChevronDown
                                      className={`w-3 h-3 text-zinc-400 transition-transform ${
                                        isExpanded ? "" : "-rotate-90"
                                      }`}
                                    />
                                    <p className="text-xs truncate" style={{ color: "#022D2C" }}>
                                      <span className="text-zinc-400">PHASE {idx + 1}:</span>{" "}
                                      <span className={isCompleted ? "text-zinc-400" : ""}>{p.name}</span>
                  </p>
                </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {isActiveCodegen && (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#022D2C]" />
                                    )}
                                    <span className={`text-xs font-medium ${isCompleted ? "text-zinc-400" : "text-zinc-600"}`}>
                                      {`${done}/${Math.max(total, 0)}`}
                    </span>
                  </div>
                                </button>
                                
                                {/* Task list from plan items */}
                                {isExpanded && tasks.length > 0 && (
                                  <div className="ml-4 pl-3 border-l border-zinc-200 mt-1 space-y-1">
                                    {tasks.map((task, taskIdx) => {
                                      const isTaskCompleted = task.status === "COMPLETED";
                                      const isTaskRunning = task.status === "IN_PROGRESS";
                                      const isTaskFailed = task.status === "FAILED";
                                      const isTaskSelected = selectedTaskId === task.id;
                                      
                                      return (
                                        <button
                                          key={task.id || taskIdx}
                                          onClick={() => {
                                            setSelectedTaskId(task.id);
                                            setSelectedPhaseIndex(idx);
                                          }}
                                          className={`w-full flex items-center gap-2 py-1.5 px-2 rounded text-left transition-colors ${
                                            isTaskSelected ? "bg-zinc-100" : "hover:bg-zinc-50"
                                          }`}
                                          title={isTaskFailed ? (task as any).error || "Task failed" : undefined}
                                        >
                                          {isTaskCompleted ? (
                                            <Check className="w-3 h-3 text-green-500 shrink-0" />
                                          ) : isTaskFailed ? (
                                            <Info className="w-3 h-3 text-amber-500 shrink-0" />
                                          ) : isTaskRunning ? (
                                            <Loader2 className="w-3 h-3 animate-spin text-[#022D2C] shrink-0" />
                                          ) : (
                                            <Circle className="w-3 h-3 text-zinc-300 shrink-0" />
                                          )}
                                          <span className={`text-[11px] truncate ${
                                            isTaskCompleted ? "text-zinc-400" : isTaskFailed ? "text-amber-600" : "text-[#022D2C]"
                                          }`}>
                                            {task.title || `Task ${taskIdx + 1}`}
                                            {isTaskFailed && " (review patch)"}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                    </div>
                            );
                          })}
                          {planPhases.length === 0 && (
                            <p className="text-xs text-zinc-500">
                              Loading phases…
                            </p>
                          )}
                    </div>
                  </div>

                      {/* Codegen stream timeline (same pattern as spec/plan): tool calls + loading dots */}
                      {taskSplittingId &&
                        (taskSplittingStatus?.codegen_status === "COMPLETED" ||
                          taskSplittingStatus?.codegen_status === "IN_PROGRESS" ||
                          taskSplittingStatus?.status === "IN_PROGRESS" ||
                          (taskSplittingStatus?.agent_activity?.length ?? 0) > 0) && (
                          <div className="space-y-3 min-w-0">
                            {taskSplittingStatus?.codegen_status === "COMPLETED" && (
                              <div className="rounded-lg border border-[#CCD3CF] bg-[#FAF8F7] px-4 py-4 min-w-0">
                                <div className="flex items-center gap-3">
                                  <Check className="w-5 h-5 text-[#022D2C] shrink-0" />
                                  <div>
                                    <p className="text-sm font-bold text-[#00291C]">Code generation completed</p>
                                    <p className="text-[10px] text-zinc-500 mt-0.5">STATUS: COMPLETED</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            {(displayCodegenItems.length > 0 ||
                              taskSplittingStatus?.codegen_status === "IN_PROGRESS" ||
                              taskSplittingStatus?.status === "IN_PROGRESS") && (
                              <div className="min-w-0">
                                <StreamTimeline
                                  items={displayCodegenItems}
                                  endRef={codegenStreamEndRef}
                                  loading={
                                    (taskSplittingStatus?.codegen_status === "IN_PROGRESS" ||
                                      taskSplittingStatus?.status === "IN_PROGRESS") &&
                                    taskSplittingStatus?.codegen_status !== "FAILED"
                                  }
                                />
                              </div>
                            )}
                            {taskSplittingStatus?.codegen_status === "FAILED" && displayCodegenItems.length === 0 && (
                              <p className="text-xs text-zinc-500 italic">Codegen failed</p>
                            )}
                          </div>
                        )}
                    </div>
              </div>
            )}
              </React.Fragment>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div className="p-4 shrink-0">
            <div className="relative">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChatMessage();
                  }
                }}
                placeholder={
                  taskSplittingStatus?.codegen_status === "IN_PROGRESS"
                    ? "Code generation in progress..."
                    : "Ask about the code or request changes..."
                }
                rows={3}
                disabled={taskSplittingStatus?.codegen_status === "IN_PROGRESS"}
                className="w-full min-h-[88px] px-4 py-3 pr-14 pb-12 rounded-xl border border-gray-200 bg-[#FFFDFC] text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#102C2C]/20 focus:border-[#102C2C] resize-none disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={handleSendChatMessage}
                disabled={isChatStreaming || !codegenConversationId || taskSplittingStatus?.codegen_status === "IN_PROGRESS"}
                className="absolute right-2 bottom-4 h-10 w-10 rounded-full bg-[#102C2C] text-[#B6E343] flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChatStreaming ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <SendHorizonal className="w-5 h-5" />
                )}
              </button>
            </div>
            </div>
          </div>

        {/* Right: Code generation */}
        <div className="overflow-hidden flex-none flex flex-col w-1/2 min-w-0">
          <aside className="h-full w-full min-w-[320px] flex flex-col border-l border-[#D3E5E5]">
            <div className="p-6 border-b border-[#D3E5E5] bg-white">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-[18px] font-bold leading-tight tracking-tight shrink-0" style={{ color: "#022019" }}>
                    Code generation
                  </h2>
            <button
                    type="button"
                    className="p-1 rounded-full hover:bg-[#CCD3CF]/30 transition-colors shrink-0"
                    aria-label="Code generation info"
                    title="See patches as phases complete; click MAKE PR when done."
                  >
                    <Info className="w-4 h-4" style={{ color: "#022019" }} />
            </button>
              </div>

                <div className="flex items-center gap-4">
                {/* View files (slider with tree + diff) */}
                {taskSplittingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedChangedFilePath(null);
                      setChangedFilesSliderOpen(true);
                    }}
                    className="shrink-0 px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-2 border border-[#D3E5E5] bg-white text-[#022019] hover:bg-[#F5F5F5] transition-colors"
                    title="View all files and diffs"
                  >
                    View files
                  </button>
                )}

                {/* Download generated code (zip) — when codegen completed and no PR yet */}
                {taskSplittingId &&
                  taskSplittingStatus?.codegen_status === "COMPLETED" &&
                  !taskSplittingStatus?.pr_url && (
                    <button
                      type="button"
                      onClick={handleDownloadCode}
                      className="shrink-0 px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-2 border border-[#D3E5E5] bg-white text-[#022019] hover:bg-[#F5F5F5] transition-colors"
                      title="Download generated code as zip"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download code
                    </button>
                  )}
            </div>
          </div>
                </div>

            <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAFA]">
              <div className="space-y-4 max-w-3xl mx-auto">
                {/* Show selected task details or all phase files */}
                {(() => {
                  const currentLayer = allLayers[selectedPhaseIndex];
                  const tasks = currentLayer?.tasks || [];
                  
                  // If a specific task is selected, show its details
                  if (selectedTaskId) {
                    const selectedTask = tasks.find((t) => t.id === selectedTaskId);
                    if (selectedTask) {
                      const taskChanges = selectedTask.changes || [];
                  return (
                        <>
                          {/* Task header */}
                          <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <div className="flex items-center gap-2 mb-2">
                              {selectedTask.status === "COMPLETED" ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : selectedTask.status === "IN_PROGRESS" ? (
                                <Loader2 className="w-4 h-4 animate-spin text-[#022D2C]" />
                              ) : (
                                <Circle className="w-4 h-4 text-zinc-300" />
                              )}
                              <h3 className="text-sm font-semibold text-[#022019]">
                                {selectedTask.title}
                            </h3>
                            </div>
                            <p className="text-xs text-zinc-500">
                              {selectedTask.file && (
                                <span className="font-mono text-zinc-400">{selectedTask.file}</span>
                              )}
                            </p>
                          </div>

                          {/* Task file changes */}
                          {taskChanges.length > 0 ? (
                            taskChanges.map((change: any, i: number) => (
                              <CodeFileCard
                                key={i}
                                change={{
                                  layerTitle: currentLayer?.title || "",
                                  taskTitle: selectedTask.title,
                                  path: change.path,
                                  lang: change.lang,
                                  content: change.content,
                                  status: selectedTask.status,
                                }}
                              />
                            ))
                          ) : selectedTask.status === "FAILED" ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
                              <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                              <p className="text-sm text-red-700">Task failed</p>
                              {(selectedTask as any).error && (
                                <p className="text-xs text-red-600 mt-1">{(selectedTask as any).error}</p>
                              )}
                            </div>
                          ) : selectedTask.status === "COMPLETED" ? (
                            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                              <Check className="w-6 h-6 text-green-500 mx-auto mb-2" />
                              <p className="text-sm text-zinc-600">Task completed with no file changes</p>
                            </div>
                          ) : selectedTask.status === "IN_PROGRESS" ? (
                            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                              <img src="/images/loader.gif" alt="Loading" className="w-12 h-12 mx-auto mb-2" />
                              <p className="text-sm text-zinc-600">Generating code...</p>
                            </div>
                          ) : (
                            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                              <Circle className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                              <p className="text-sm text-zinc-600">Waiting to start...</p>
                            </div>
                          )}
                        </>
                      );
                    }
                  }
                  
                  // Otherwise show all files from the phase
                  return (
                    <>
                      {/* Phase header */}
                      <div className="rounded-lg border border-gray-200 bg-white p-4 mb-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-[#022019]">
                            Phase {selectedPhaseIndex + 1}: {currentLayer?.title || planPhases[selectedPhaseIndex]?.name}
                          </h3>
                          <span className="text-xs text-zinc-500">
                            {tasks.filter((t) => t.status === "COMPLETED").length}/{tasks.length} tasks
                          </span>
                        </div>
                      </div>
                      
                      {/* All file changes from phase */}
                      {changeFeed.length > 0 ? (
                        changeFeed.map((c, i) => <CodeFileCard key={`${c.path}-${i}`} change={c} />)
                      ) : isRunning ? (
                        // Skeleton loading
                        <>
                          {[0, 1, 2].map((k) => (
                            <div key={k} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                              <div className="px-4 py-2.5 border-b border-gray-200">
                                <div className="h-3 w-52 bg-zinc-200 rounded animate-pulse" />
                        </div>
                              <div className="bg-zinc-50 px-4 py-3 space-y-2">
                                <div className="h-3 w-full bg-zinc-200 rounded animate-pulse" />
                                <div className="h-3 w-5/6 bg-zinc-200 rounded animate-pulse" />
                                <div className="h-3 w-3/4 bg-zinc-200 rounded animate-pulse" />
                        </div>
                      </div>
                          ))}
                        </>
                      ) : (
                        // Empty state
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                            <FileText className="w-6 h-6 text-zinc-400" />
                    </div>
                          <p className="text-sm font-medium text-zinc-600">
                            No code generated yet for Phase {selectedPhaseIndex + 1}
                          </p>
                          <p className="text-xs text-zinc-400 mt-1">
                            Code will appear here once this phase starts generating
                          </p>
                  </div>
                )}
                    </>
                  );
                })()}
              </div>
          </div>

            {/* Sticky MAKE PR / VIEW PR at end of code gen panel */}
            {taskSplittingId && (
              <div className="sticky bottom-0 shrink-0 border-t border-[#D3E5E5] bg-white px-6 py-4 flex justify-end">
                {taskSplittingStatus?.pr_url ? (
                  <a
                    href={taskSplittingStatus.pr_url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 px-5 py-2.5 rounded-lg font-semibold text-xs bg-[#022019] text-[#B4D13F] hover:opacity-90"
                  >
                    VIEW PR
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled={
                      !taskSplittingId ||
                      !taskSplittingStatus ||
                      taskSplittingStatus.codegen_status !== "COMPLETED" ||
                      isCreatingPR ||
                      taskSplittingStatus.pr_status === "IN_PROGRESS"
                    }
                    onClick={async () => {
                      if (!taskSplittingId) return;
                      toast.dismiss();
                      try {
                        setIsCreatingPR(true);
                        await TaskSplittingService.createPullRequest(taskSplittingId);
                        toast.success("PR creation started", { title: "Success" });
                      } catch (e: any) {
                        setIsCreatingPR(false);
                        const msg = e?.message ?? "Failed to start PR creation";
                        const isAppNotInstalled =
                          typeof msg === "string" &&
                          (msg.includes("not installed") ||
                            msg.includes("GitHub App") ||
                            msg.includes("404"));
                        if (isAppNotInstalled) {
                          toast.error(
                            "Cannot create PR since Potpie app is not installed on this repository. You can download the generated code below.",
                            { title: "PR not available", duration: 8000 }
                          );
                        } else {
                          toast.error(msg, { title: "Error" });
                        }
                      }
                    }}
                    className="shrink-0 px-5 py-2.5 rounded-lg font-semibold text-xs flex items-center gap-2 bg-[#022019] text-[#B4D13F] hover:opacity-90 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:hover:opacity-100 disabled:cursor-not-allowed"
                    title={
                      !taskSplittingId
                        ? "Start code generation before creating a PR"
                        : taskSplittingStatus?.codegen_status !== "COMPLETED"
                          ? "Finish code generation before creating a PR"
                          : taskSplittingStatus?.pr_status === "FAILED"
                            ? taskSplittingStatus?.pr_error_message || "PR creation failed"
                            : taskSplittingStatus?.pr_status === "IN_PROGRESS"
                              ? "PR creation is in progress"
                              : "Create a PR from completed changes"
                    }
                  >
                    {isCreatingPR || taskSplittingStatus?.pr_status === "IN_PROGRESS" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        MAKING PR…
                      </>
                    ) : (
                      "MAKE PR"
                    )}
                  </button>
                )}
              </div>
            )}
          </aside>
                </div>
              </div>

      {/* View files slider: tree + file diff */}
      <Sheet open={changedFilesSliderOpen} onOpenChange={setChangedFilesSliderOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-[90vw] sm:max-w-6xl flex flex-col gap-0 p-0 overflow-hidden bg-white"
        >
          <SheetHeader className="px-6 py-4 shrink-0 border-b border-[#E5E7EB]">
            <SheetTitle className="text-base font-semibold text-[#022019]">
              View files
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Left: file tree */}
            <div className="w-[280px] shrink-0 border-r border-[#E5E7EB] flex flex-col overflow-hidden">
              {changedFilesTreeData.length > 0 ? (
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-2">
                  <TreeView
                    data={changedFilesTreeData}
                    showLines
                    showIcons
                    folderIconUrl="/images/figma/folder.svg"
                    fileIconUrl="/images/figma/file.svg"
                    selectable
                    selectedIds={selectedChangedFilePath ? [selectedChangedFilePath] : []}
                    onSelectionChange={(ids) => setSelectedChangedFilePath(ids[0] ?? null)}
                    onNodeClick={(node) => {
                      const hasChildren = (node.children?.length ?? 0) > 0;
                      if (!hasChildren) setSelectedChangedFilePath(node.id);
                    }}
                    defaultExpandedIds={changedFilesTreeData.map((n) => n.id)}
                    animateExpand
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-zinc-500">
                  <FileText className="w-10 h-10 mb-3 opacity-50" />
                  <p className="text-sm font-medium">No files yet</p>
                  <p className="text-xs mt-1">Files will appear here as code generation runs</p>
                </div>
              )}
            </div>
            {/* Right: file diff — constrain width so content scrolls inside panel */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-white">
              {selectedChangedFilePath && pathToChange[selectedChangedFilePath] ? (
                <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
                  <div className="px-4 py-2 border-b border-[#E5E7EB] bg-white shrink-0">
                    <p className="text-xs font-medium text-[#022019] truncate" title={selectedChangedFilePath}>
                      {selectedChangedFilePath}
                    </p>
                  </div>
                  <div className="flex-1 min-h-[300px] min-w-0 overflow-hidden flex flex-col">
                    <MonacoDiffView
                      change={pathToChange[selectedChangedFilePath]}
                      height="100%"
                      className="flex-1 min-h-0 w-full"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-6">
                  <FileDiff className="w-10 h-10 mb-3 opacity-50" />
                  <p className="text-sm font-medium">Select a file</p>
                  <p className="text-xs mt-1">Click a file in the tree to view its changes</p>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
