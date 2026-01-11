"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  X,
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
} from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import TaskSplittingService from "@/services/TaskSplittingService";
import PlanService from "@/services/PlanService";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  TaskSplittingStatusResponse,
  TaskSplittingItemsResponse,
  TaskLayer,
  PlanItem,
} from "@/lib/types/spec";

/**
 * VERTICAL TASK EXECUTION ENGINE
 * Uses real API data from TaskSplittingService and PlanService
 * - Fetches plan items from PlanService
 * - Submits task splitting via TaskSplittingService
 * - Polls task splitting status and items
 * - Displays real execution graph from API
 */

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
    'PENDING': 'pending',
    'IN_PROGRESS': 'running',
    'COMPLETED': 'completed',
    'FAILED': 'failed',
  };
  return statusMap[apiStatus] || apiStatus.toLowerCase();
};

// New TaskCard component handling inline expansion
const TaskCard = ({ 
  task, 
  isExpanded, 
  onToggle 
}: { 
  task: import("@/lib/types/spec").TaskItem; 
  isExpanded: boolean; 
  onToggle: () => void;
}) => {
  const hasChanges = task.changes && task.changes.length > 0;
  // Default to 'logs' if no changes (Verification task), otherwise 'diff'
  const [activeTab, setActiveTab] = React.useState(
    hasChanges ? "diff" : "logs",
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
            <StatusBadge status={uiStatus} tests={task.tests} />
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
                width: `${(task.tests.passed / (task.tests.total || 1)) * 100}%`,
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
                  {task.tests.passed}/{task.tests.total}
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
                  {task.changes?.map((change: { path: string; lang: string; content: string }, idx: number) => (
                    <div
                      key={idx}
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
                          <Copy className="w-3 h-3 text-primary-color cursor-pointer hover:text-primary-color" />
                        </div>
                      </div>
                      {change.content ? (
                        <pre className="p-3 overflow-x-auto text-[10px] font-mono leading-relaxed bg-background">
                          {change.content.split("\n").map((line: string, i: number) => (
                            <div
                              key={i}
                              className={`${line.startsWith("+") ? "bg-emerald-50 text-emerald-900 w-full block -mx-3 px-3" : "text-primary-color"}`}
                            >
                              <span className="inline-block w-6 text-primary-color select-none text-right mr-3 border-r border-zinc-100 pr-2">
                                {i + 1}
                              </span>
                              {line}
                            </div>
                          ))}
                        </pre>
                      ) : (
                        <div className="p-4 text-center text-[10px] font-mono text-primary-color italic bg-background flex flex-col items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary-color" />
                          <span className="text-primary-color">Generating diff...</span>
                        </div>
                      )}
                    </div>
                  ))}
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
                      task.testResults.map((test: import("@/lib/types/spec").TaskTestResult, i: number) => (
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
                            {uiStatus === "completed" ? (test.status === "PASSED" ? "PASSED" : "FAILED") : "PENDING"}
                          </span>
                        </div>
                      ))
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
                      <span className="text-primary-color select-none">{">"}</span>
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
  // Note: taskId in URL is actually recipeId now
  const recipeId = params?.taskId as string;
  const planIdFromUrl = searchParams.get("planId");
  const itemNumberFromUrl = searchParams.get("itemNumber");
  const taskSplittingIdFromUrl = searchParams.get("taskSplittingId");
  
  const [activeSliceId, setActiveSliceId] = useState(itemNumberFromUrl ? parseInt(itemNumberFromUrl) : 1);
  const [completedSlices, setCompletedSlices] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Task Splitting API State
  const [planId, setPlanId] = useState<string | null>(planIdFromUrl);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [isLoadingPlanItems, setIsLoadingPlanItems] = useState(false);
  const [taskSplittingId, setTaskSplittingId] = useState<string | null>(
    taskSplittingIdFromUrl || null
  );
  const [taskSplittingStatus, setTaskSplittingStatus] = useState<TaskSplittingStatusResponse | null>(null);
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

  const terminalRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Get plan_id from URL or try to get latest plan for recipe
  useEffect(() => {
    if (!planId && recipeId) {
      // Try to get latest plan for this recipe
      PlanService.getPlanStatusByRecipeId(recipeId)
        .then((status) => {
          if (status.plan_id) {
            setPlanId(status.plan_id);
            const params = new URLSearchParams(searchParams.toString());
            params.set("planId", status.plan_id);
            // Default to item 1 if no itemNumber specified
            if (!params.get("itemNumber")) {
              params.set("itemNumber", "1");
            }
            router.replace(`/task/${recipeId}/code?${params.toString()}`);
          }
        })
        .catch((error) => {
          console.error("Error fetching plan status:", error);
        });
    }
  }, [planId, recipeId]);

  // Submit task splitting when we have planId and itemNumber but no taskSplittingId
  useEffect(() => {
    if (!planId || !activeSliceId || taskSplittingId) return;
    // Wait for plan items to be loaded before submitting
    if (planItems.length === 0 || isLoadingPlanItems) return;

    // Priority 1: Check URL parameter
    if (taskSplittingIdFromUrl) {
      setTaskSplittingId(taskSplittingIdFromUrl);
      localStorage.setItem(`task_splitting_${planId}_${activeSliceId}`, taskSplittingIdFromUrl);
      return;
    }

    // Priority 2: Check localStorage
    const storedTaskSplittingId = localStorage.getItem(`task_splitting_${planId}_${activeSliceId}`);
    if (storedTaskSplittingId) {
      setTaskSplittingId(storedTaskSplittingId);
      return;
    }

    // Priority 3: Submit new task splitting request
    const submitTaskSplitting = async () => {
      try {
        // Find the plan item by item_number to get its id (plan_item_id)
        const planItem = planItems.find((item) => item.item_number === activeSliceId);
        if (!planItem) {
          console.error("[Code Page] Plan item not found for item_number:", activeSliceId);
          console.error("[Code Page] Available plan items:", planItems.map(item => item.item_number));
          // Don't show error toast - just wait for plan items to load or user to select valid item
          return;
        }

        console.log("[Code Page] Submitting task splitting for plan_item_id:", planItem.id);
        const response = await TaskSplittingService.submitTaskSplitting({
          plan_item_id: planItem.id,
        });
        console.log("[Code Page] Task splitting submitted:", response);
        setTaskSplittingId(response.task_splitting_id);
        localStorage.setItem(`task_splitting_${planId}_${activeSliceId}`, response.task_splitting_id);
        
        // Update URL with taskSplittingId
        const params = new URLSearchParams(searchParams.toString());
        params.set("taskSplittingId", response.task_splitting_id);
        router.replace(`/task/${recipeId}/code?${params.toString()}`);
        
        toast.success("Task splitting started");
      } catch (error: any) {
        console.error("[Code Page] Error submitting task splitting:", error);
        toast.error(error.message || "Failed to start task splitting");
      }
    };

    submitTaskSplitting();
  }, [planId, activeSliceId, taskSplittingId, taskSplittingIdFromUrl, searchParams, recipeId, router, planItems, isLoadingPlanItems]);

  // Fetch plan items for sidebar display
  useEffect(() => {
    if (!planId || planItems.length > 0) return;

    const fetchPlanItems = async () => {
      setIsLoadingPlanItems(true);
      try {
        console.log("[Code Page] Fetching plan items for planId:", planId);
        let allItems: any[] = [];
        let start = 0;
        let hasMore = true;

        while (hasMore) {
          const response = await PlanService.getPlanItems(planId, start, 20);
          allItems = [...allItems, ...response.plan_items];
          if (response.next_start === null) {
            hasMore = false;
          } else {
            start = response.next_start;
          }
        }

        console.log("[Code Page] Fetched plan items:", allItems.length);
        setPlanItems(allItems);
      } catch (error) {
        console.error("[Code Page] Error fetching plan items:", error);
      } finally {
        setIsLoadingPlanItems(false);
      }
    };

    fetchPlanItems();
  }, [planId, planItems.length]);


  // 1. Reset State when Slice Changes
  useEffect(() => {
    // Only reset if we haven't completed this slice
    if (!completedSlices.includes(activeSliceId)) {
      setCurrentDag([]);
      setAllLayers([]);
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
        const storedTaskSplittingId = localStorage.getItem(`task_splitting_${planId}_${activeSliceId}`);
        if (storedTaskSplittingId && storedTaskSplittingId !== taskSplittingId) {
          setTaskSplittingId(storedTaskSplittingId);
        }
      }
      setCurrentDag(allLayers);
      setIsGraphLoading(false); // Already loaded
      setGraphLoadIndex(allLayers.length);
    }
  }, [activeSliceId, planId]);

  // 2. Poll for task splitting status and fetch layers
  useEffect(() => {
    if (!taskSplittingId) return;

    let mounted = true;
    let pollInterval: NodeJS.Timeout;

    // Fetch layers with pagination
    const fetchLayersWithPagination = async () => {
      try {
        console.log("[Code Page] Fetching layers with pagination");
        let allLayersData: TaskLayer[] = [];
        let start = 0;
        let hasMore = true;

        while (hasMore) {
          const response = await TaskSplittingService.getTaskSplittingItems(taskSplittingId, start, 10);
          console.log("[Code Page] Fetched layers:", response.layers.length, "next_layer_order:", response.next_layer_order);
          allLayersData = [...allLayersData, ...response.layers];

          if (response.next_layer_order === null) {
            hasMore = false;
          } else {
            start = response.next_layer_order;
          }
        }

        if (!mounted) return;

        setAllLayers(allLayersData);
        setNextLayerOrder(null);

        // Update current DAG for display
        if (allLayersData.length > 0) {
          setCurrentDag(allLayersData);
          setGraphLoadIndex(allLayersData.length);
        }
      } catch (error) {
        console.error("[Code Page] Error fetching layers:", error);
      }
    };

    const fetchStatusAndLayers = async () => {
      try {
        console.log("[Code Page] Polling task splitting status for:", taskSplittingId);
        const status = await TaskSplittingService.getTaskSplittingStatus(taskSplittingId);

        if (!mounted) return;

        console.log("[Code Page] Task splitting status:", status);
        setTaskSplittingStatus(status);

        // Always fetch layers if available (even during IN_PROGRESS)
        if (status.status === "COMPLETED" || status.status === "IN_PROGRESS") {
          await fetchLayersWithPagination();
        }

        // Stop polling if task splitting is done
        if (status.status === "COMPLETED" || status.status === "FAILED") {
          if (pollInterval) clearInterval(pollInterval);

          if (status.status === "COMPLETED") {
            setIsGraphLoading(false);
          }
        }
      } catch (error) {
        console.error("[Code Page] Error polling task splitting status:", error);
      }
    };

    // Initial fetch
    fetchStatusAndLayers();

    // Set up polling every 2 seconds
    pollInterval = setInterval(fetchStatusAndLayers, 2000);

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [taskSplittingId]);

  // 3. Step-by-Step Graph Discovery (Loading Phase) - progressive reveal
  useEffect(() => {
    if (!isGraphLoading) return;

    // Wait for task splitting to complete and layers to be fetched
    if (taskSplittingStatus?.status !== "COMPLETED" || allLayers.length === 0) {
      return;
    }

    // Load layers progressively
    if (graphLoadIndex < allLayers.length) {
      const timer = setTimeout(() => {
        const nextLayer = allLayers[graphLoadIndex];
        setCurrentDag((prev) => [...prev, nextLayer]);
        setGraphLoadIndex((prev) => prev + 1);
      }, 600); // 600ms delay between levels appearing

      return () => clearTimeout(timer);
    } else {
      // Done loading graph
      setIsGraphLoading(false);
    }
  }, [isGraphLoading, graphLoadIndex, activeSliceId, allLayers, taskSplittingStatus]);

  // 4. Poll for codegen updates (when running)
  useEffect(() => {
    if (!taskSplittingId || !isRunning) return;

    let mounted = true;

    const pollCodegenStatus = async () => {
      try {
        const status = await TaskSplittingService.getTaskSplittingStatus(taskSplittingId);

        if (!mounted) return;

        setTaskSplittingStatus(status);

        // If codegen is in progress or completed, fetch updated layers
        if (status.codegen_status === "IN_PROGRESS" || status.codegen_status === "COMPLETED") {
          // Fetch all layers to get updated task statuses
          let allLayersData: TaskLayer[] = [];
          let start = 0;
          let hasMore = true;

          try {
            while (hasMore) {
              const response = await TaskSplittingService.getTaskSplittingItems(taskSplittingId, start, 10);
              allLayersData = [...allLayersData, ...response.layers];
              if (response.next_layer_order === null) {
                hasMore = false;
              } else {
                start = response.next_layer_order;
              }
            }

            if (!mounted) return;

            setAllLayers(allLayersData);
            setCurrentDag(allLayersData);
          } catch (layerError) {
            console.error("[Code Page] Error fetching layers:", layerError);
          }

          // Check if all tasks are completed
          const allCompleted = allLayersData.every(
            (layer) => {
              const layerStatus = mapApiStatusToUI(layer.status);
              return layerStatus === "completed" || layer.tasks.every((task) => {
                const taskStatus = mapApiStatusToUI(task.status);
                return taskStatus === "completed";
              });
            }
          );

          if (allCompleted && !completedSlices.includes(activeSliceId)) {
            setCompletedSlices((prev) => [...prev, activeSliceId]);
            setGlobalLogs((prev) => [
              ...prev,
              `SUCCESS: Vertical Slice ${String(activeSliceId).padStart(2, '0')} verified.`,
            ]);

            // Auto-advance to next slice if available
            const nextSlice = planItems.find((item) => item.item_number > activeSliceId);
            if (nextSlice) {
              setTimeout(() => {
                setActiveSliceId(nextSlice.item_number);
              }, 1000);
            } else {
              setIsRunning(false);
            }
          }
        }

        if (status.codegen_status === "COMPLETED" || status.codegen_status === "FAILED") {
          setIsRunning(false);
        }
      } catch (error) {
        console.error("[Code Page] Error polling codegen status:", error);
      }
    };

    const pollInterval = setInterval(pollCodegenStatus, 2000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
    };
  }, [taskSplittingId, isRunning, activeSliceId, completedSlices, planItems]);

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
  const activeSliceMeta = planItems.find((item) => item.item_number === activeSliceId);

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

  // Show loading if we don't have planId or recipeId
  if (!planId && !recipeId) {
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
  //         <p className="text-sm text-primary-color mt-2">Preparing execution plan for Slice {String(activeSliceId).padStart(2, '0')}</p>
  //       </div>
  //     </div>
  //   );
  // }

  // Show loading if task splitting is in progress and no layers yet
  if (taskSplittingStatus?.status === "IN_PROGRESS" && allLayers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-color" />
          <p className="text-primary-color">Generating task execution plan...</p>
          <p className="text-sm text-primary-color mt-2">Step {taskSplittingStatus.current_step + 1}/2</p>
        </div>
      </div>
    );
  }

  // Show loading if task splitting is submitted and waiting
  if (taskSplittingStatus?.status === "SUBMITTED" && allLayers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-color" />
          <p className="text-primary-color">Task splitting submitted, waiting to start...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-primary-color font-sans flex flex-col md:flex-row overflow-hidden relative">
      {/* --- SIDEBAR: Timeline --- */}
      <aside className="w-80 bg-zinc-50/50 border-r border-zinc-200 flex flex-col z-20 shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-zinc-100 bg-zinc-50/80 backdrop-blur-sm sticky top-0">
          <h2 className="text-base font-bold text-primary-color">Slices</h2>
        </div>

        <div ref={sidebarRef} className="flex-1 overflow-y-auto p-6 relative">
          {/* Continuous Vertical Line */}
          <div
            className="absolute left-[35px] top-6 bottom-6 w-[1px] bg-zinc-200 z-0"
          />

          <div className="space-y-8 relative z-10">
            {planItems.length > 0 ? (
              planItems.map((slice: PlanItem, idx: number) => {
                const sliceId = slice.item_number;
                const isCompleted = completedSlices.includes(sliceId);
                const isLocked =
                  idx > 0 && !completedSlices.includes(planItems[idx - 1]?.item_number);
                const isActive = activeSliceId === sliceId;

                return (
                  <div
                    key={slice.id}
                    data-active={isActive}
                    className={`group flex gap-4 ${isLocked ? " pointer-events-none" : "cursor-pointer"}`}
                    onClick={() => !isLocked && handleManualSliceChange(sliceId)}
                  >
                    {/* Timeline Node */}
                    <div
                      className={`
                      w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 bg-background relative z-10
                      ${
                        isCompleted
                          ? "border-emerald-500 text-emerald-500"
                          : isActive
                            ? "border-primary-color text-primary-color scale-110 shadow-sm"
                            : "border-zinc-200 text-primary-color"
                      }
                    `}
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <span className="text-[10px] font-bold">{slice.item_number}</span>
                      )}
                    </div>

                    {/* Text Content */}
                    <div
                      className={`flex-1 pt-0.5 transition-all duration-300 ${isActive ? "translate-x-1" : ""}`}
                    >
                      <h3
                        className={`text-xs font-bold leading-tight ${isActive ? "text-primary-color" : "text-primary-color group-hover:text-primary-color"}`}
                      >
                        {slice.title}
                      </h3>
                      <p className="text-[10px] text-primary-color leading-relaxed mt-1 line-clamp-2">
                        {slice.description}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-primary-color text-sm">
                {isLoadingPlanItems ? "Loading plan items..." : "No plan items available"}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT: Right Part --- */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-background">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-100">
          <div>
            <h1 className="text-lg font-bold text-primary-color tracking-tight">
              {activeSliceMeta?.title || `Slice ${activeSliceId}`}
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-primary-color font-medium uppercase tracking-widest">
                Execution Graph
              </p>
              {isGraphLoading && (
                <Loader2 className="w-3 h-3 animate-spin text-primary-color" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGlobalLogs(!showGlobalLogs)}
              className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border
                  ${
                    showGlobalLogs
                      ? "bg-zinc-100 border-zinc-200 text-primary-color"
                      : "bg-background border-zinc-200 text-primary-color hover:bg-[#006B66] hover:text-accent-color"
                  }
                `}
            >
              <TerminalSquare className="w-3.5 h-3.5" />
              {showGlobalLogs ? "Hide Logs" : "Show Logs"}
            </button>

            {isSliceComplete ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 text-primary-color rounded-md border border-zinc-100 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified
              </div>
            ) : (
              <button
                onClick={() => setIsRunning(!isRunning)}
                disabled={isGraphLoading}
                className={`
                   flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all
                   ${
                     isGraphLoading
                       ? "bg-zinc-100 text-primary-color cursor-not-allowed"
                       : isRunning
                         ? "bg-background border border-zinc-200 text-primary-color hover:bg-[#006B66] hover:text-accent-color"
                         : "bg-accent-color text-primary-color hover:bg-[#006B66] hover:text-accent-color shadow-sm"
                   }
                 `}
              >
                {isGraphLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-color" /> Loading
                    Plan...
                  </>
                ) : isRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Start Codegen
                  </>
                )}
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* DAG Visualization (Fills available space) */}
          <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/30">
            {/* If loading graph, show simple indicator */}
            {currentDag.length === 0 && isGraphLoading && (
              <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-primary-color rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-primary-color rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-primary-color rounded-full animate-bounce"></div>
                </div>
                <p className="text-xs text-primary-color font-mono">
                  Discovering dependencies...
                </p>
              </div>
            )}

            {currentDag.length > 0 && (
              <div className="max-w-2xl mx-auto space-y-8 pb-12">
                {currentDag.map((level, idx) => {
                  // Map API status to UI status
                  const levelStatus = mapApiStatusToUI(level.status);
                  const isActive = levelStatus === "running" || level.status === "IN_PROGRESS";
                  const isDone = levelStatus === "completed" || level.status === "COMPLETED";

                  return (
                    <div
                      key={idx}
                      className="relative animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"
                    >
                      {/* Level Connector */}
                      {idx !== currentDag.length - 1 && (
                        <div className="absolute left-[19px] top-10 bottom-[-32px] w-[2px] bg-zinc-100" />
                      )}

                      <div className="flex items-start gap-6">
                        {/* Level Icon */}
                        <div
                          className={`
                              w-10 h-10 rounded-xl flex items-center justify-center border-2 shrink-0 z-10 bg-background transition-colors duration-300
                              ${isActive ? "border-primary-color text-primary-color shadow-md" : isDone ? "border-emerald-500 text-emerald-600" : "border-zinc-200 text-primary-color"}
                            `}
                        >
                          {isDone ? (
                            <Check className="w-5 h-5" />
                          ) : isActive ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary-color" />
                          ) : (
                            <GitBranch className="w-5 h-5" />
                          )}
                        </div>

                        {/* Level Content */}
                        <div className="flex-1 pt-1">
                          <div className="flex items-center justify-between mb-3">
                            <h3
                              className={`text-sm font-bold ${isActive ? "text-primary-color" : "text-primary-color"}`}
                            >
                              {level.title}
                            </h3>
                            <span className="text-[9px] uppercase font-bold text-primary-color">
                              {isDone
                                ? "Completed"
                                : isActive
                                  ? "Processing..."
                                  : "Pending"}
                            </span>
                          </div>

                          {/* Tasks Grid */}
                          <div className="grid grid-cols-1 gap-3">
                            {level.tasks.map((task) => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                isExpanded={expandedTaskId === task.id}
                                onToggle={() =>
                                  setExpandedTaskId(
                                    expandedTaskId === task.id ? null : task.id,
                                  )
                                }
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Completion Banner */}
                {isSliceComplete && activeSliceMeta && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pl-16">
                    <div className="bg-background rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
                      <div className="bg-emerald-50/50 px-6 py-4 border-b border-emerald-100 flex items-center gap-3">
                        <div className="bg-emerald-100 p-2 rounded-full">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-emerald-900">
                            Slice Verified
                          </h3>
                          <p className="text-xs text-emerald-700">
                            Ready for integration
                          </p>
                        </div>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <h4 className="text-[10px] font-bold text-primary-color uppercase tracking-wider mb-2">
                            What was done
                          </h4>
                          <p className="text-sm text-primary-color leading-relaxed">
                            {activeSliceMeta?.detailed_objective || "Slice completed successfully"}
                          </p>
                        </div>
                        <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                          <h4 className="text-[10px] font-bold text-primary-color uppercase tracking-wider mb-2 flex items-center gap-2">
                            <ExternalLink className="w-3.5 h-3.5" />
                            How to Verify
                          </h4>
                          <p className="text-xs font-mono text-primary-color">
                            {activeSliceMeta?.verification_criteria || "All tests passed"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Terminal */}
          {showGlobalLogs && (
            <div className="w-80 border-l border-zinc-200 bg-background flex flex-col shrink-0 animate-in slide-in-from-right duration-300">
              <div className="h-10 border-b border-zinc-100 flex items-center justify-between px-4 bg-zinc-50/50">
                <div className="flex items-center gap-2">
                  <TerminalSquare className="w-3.5 h-3.5 text-primary-color" />
                  <span className="text-[10px] font-bold text-primary-color uppercase tracking-wider">
                    Live Logs
                  </span>
                </div>
                <div
                  className={`w-2 h-2 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-zinc-300"}`}
                />
              </div>

              <div
                ref={terminalRef}
                className="flex-1 p-4 overflow-y-auto font-mono text-[10px] space-y-2 bg-background"
              >
                {globalLogs.length === 0 && (
                  <div className="text-primary-color italic text-center mt-10">
                    Ready to execute.
                    <br />
                    Logs will appear here.
                  </div>
                )}
                {globalLogs.map((log, i) => (
                  <div
                    key={i}
                    className="flex gap-2 animate-in slide-in-from-left-1 duration-200"
                  >
                    <span className="text-primary-color select-none">{">"}</span>
                    <span
                      className={`break-words leading-relaxed ${
                        log.includes("SUCCESS")
                          ? "text-emerald-600 font-bold"
                          : log.includes("Starting")
                            ? "text-blue-600"
                            : "text-primary-color"
                      }`}
                    >
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
