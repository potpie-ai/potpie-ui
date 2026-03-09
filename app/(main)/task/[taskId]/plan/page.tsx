"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { MermaidDiagram, looksLikeMermaid } from "@/components/chat/MermaidDiagram";
import {
  Check,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileCode,
  ShieldCheck,
  Database,
  BrainCircuit,
  Play,
  GitMerge,
  Target,
  Server,
  Layout,
  Settings,
  Code2,
  AlignLeft,
  ListTodo,
  AlertCircle,
  Github,
  GitBranch,
  LucideIcon,
  FileText,
  Lightbulb,
  ArrowRightLeft,
  Info,
  RefreshCw,
  SendHorizonal,
  RotateCw,
  Wrench,
  ArrowLeft,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import PlanService from "@/services/PlanService";
import SpecService from "@/services/SpecService";
import TaskSplittingService from "@/services/TaskSplittingService";
import { PlanStatusResponse, PlanItem, PlanPhase, PhasedPlanItem } from "@/lib/types/spec";
import { useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/state/store";
import { setRepoAndBranchForTask } from "@/lib/state/Reducers/RepoAndBranch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SharedMarkdown } from "@/components/chat/SharedMarkdown";
import { useNavigationProgress } from "@/contexts/NavigationProgressContext";
import { getStreamEventPayload, normalizeMarkdownForPreview } from "@/lib/utils";
import {
  StreamTimeline,
  type StreamTimelineItem,
} from "@/components/stream/StreamTimeline";

/**
 * VERTICAL SLICE PLANNER (Auto-Generation Mode)
 */

const FULL_PLAN = [
  {
    id: 1,
    title: "Persistence Layer & Schema",
    detailed_objective:
      "Establish the foundational data layer by defining the User schema in Prisma and setting up the PostgreSQL connection. This slice ensures that the database is reachable and the schema is correctly applied before any application logic is written.",
    implementation_steps: [
      "Define `User` model in `schema.prisma` with `id` as `uuid` to ensure collision-free IDs.",
      "Configure `db.ts` to instantiate a global `PrismaClient` singleton to prevent connection exhaustion in serverless envs.",
      "Add `DATABASE_URL` to `.env` and validate it using a robust env parser.",
      "Execute `prisma migrate dev` to synchronize the local Postgres container with the new schema.",
    ],
    description: "Initialize User entity and migration strategy.",
    verification_criteria:
      "PostgreSQL container starts; Schema migration applied.",
    files: [
      { path: "prisma/schema.prisma", type: "Create" },
      { path: "src/lib/db.ts", type: "Create" },
      { path: "package.json", type: "Modify" },
      { path: ".env", type: "Modify" },
    ],
    context_handoff: {
      db_strategy: "Prisma + PostgreSQL",
      user_id_format: "UUID v4",
      constraints: "Email unique",
    },
    reasoning: [
      "Selected Prisma for type-safe schema definitions.",
      "UUID v4 chosen over auto-increment for better security.",
      "Schema migration is the critical path dependency.",
    ],
    architecture: `flowchart TB
    subgraph DB["PostgreSQL Database"]
        User[("User Table<br/>id: UUID PK<br/>email: VARCHAR UNIQUE<br/>password: VARCHAR<br/>createdAt: TIMESTAMP<br/>updatedAt: TIMESTAMP")]
    end
    subgraph App["Application Layer"]
        Prisma["PrismaClient<br/>Singleton Pattern<br/>Connection Pool: 10<br/>Timeout: 5s"]
    end
    subgraph Config["Configuration"]
        Env[".env<br/>DATABASE_URL<br/>Validated on startup"]
    end
    Prisma -->|"TCP/5432"| User
    Env -->|"configures"| Prisma`,
  },
  {
    id: 2,
    title: "Auth Core Logic (JWT)",
    detailed_objective:
      "Implement the pure business logic for authentication, decoupled from the HTTP transport layer.",
    implementation_steps: [
      "Install `bcryptjs` for hashing and `jsonwebtoken` for token management.",
      "Create `hashPassword` and `verifyPassword` utilities.",
    ],
    description: "Implement token signing and password hashing utilities.",
    verification_criteria: "Unit tests pass for hashing; JWT issuance returns valid signature.",
    files: [{ path: "src/utils/auth.ts", type: "Create" }],
    context_handoff: { auth_algo: "HS256" },
    reasoning: ["Using HS256 for lower compute overhead."],
    architecture: `flowchart LR
    subgraph Password["Password Utils"]
        HP["hashPassword()"]
    end`,
  },
];

interface FileItem {
  path: string;
  type: string;
}

const groupFilesByModule = (files: FileItem[] | undefined) => {
  const modules: Record<string, FileItem[]> = {
    Database: [],
    "Core Logic": [],
    "API & Middleware": [],
    Frontend: [],
    Documentation: [],
    Configuration: [],
  };

  if (!files || !Array.isArray(files) || files.length === 0) return {};

  files.forEach((file) => {
    if (!file || !file.path) return;
    const path = file.path.toLowerCase();
    
    if (path.includes("prisma") || path.includes("db.ts") || path.includes("migrations")) {
      modules["Database"].push(file);
    } else if (path.includes("readme") || path.includes(".md") || path.includes("agents/")) {
      modules["Documentation"].push(file);
    } else if (
      path.includes("utils") ||
      path.includes("/lib/") ||
      path.includes("types") ||
      path.includes("hooks") ||
      path.includes("services") ||
      path.includes("providers")
    ) {
      modules["Core Logic"].push(file);
    } else if (path.includes("api") || path.includes("middleware") || path.includes("trpc")) {
      modules["API & Middleware"].push(file);
    } else if (
      path.includes("components") ||
      path.includes("app/") ||
      path.includes("apps/web") ||
      path.includes("tailwind") ||
      path.includes("pages")
    ) {
      modules["Frontend"].push(file);
    } else {
      modules["Configuration"].push(file);
    }
  });

  return Object.fromEntries(
    Object.entries(modules).filter(([_, v]) => v.length > 0)
  );
};

const getModuleIcon = (name: string) => {
  switch (name) {
    case "Database": return Database;
    case "Core Logic": return BrainCircuit;
    case "API & Middleware": return Server;
    case "Frontend": return Layout;
    case "Documentation": return FileCode;
    case "Configuration": return Settings;
    default: return Code2;
  }
};

const HeaderBadge = ({ children, icon: Icon }: { children: React.ReactNode; icon?: LucideIcon }) => (
  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium" style={{ border: "1px solid #CCD3CF", color: "#022019" }}>
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </div>
);

/** Chat pill badge (matches spec page) */
const ChatBadge = ({ children, icon: Icon }: { children: React.ReactNode; icon?: LucideIcon }) => (
  <div className="flex items-center gap-1.5 px-2 py-0.5 border border-[#D3E5E5] rounded text-xs font-medium text-[#022019]">
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </div>
);

const FormattedText = ({ text }: { text: string }) => {
  if (!text) return null;
  const parts = text.split("`");
  return (
    <>
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          return (
            <code key={index} className="font-mono text-[10px] font-medium text-primary-color bg-zinc-100 px-1 py-0.5 rounded border border-zinc-200 mx-0.5">
              {part}
            </code>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "generated")
    return (
      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#022019" }}>
        <Check className="w-3 h-3 text-[#FFFDFC]" />
      </div>
    );
  return <div className="w-5 h-5 rounded-full border" style={{ borderColor: "#CCD3CF", backgroundColor: "#FFFDFC" }} />;
};

const PlanPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const dispatch = useDispatch<AppDispatch>();
  const recipeId = params?.taskId as string;
  const runIdFromUrl = searchParams.get("run_id");
  const repoNameFromUrl = searchParams.get("repoName");

  const repoBranchByTask = useSelector((state: RootState) => state.RepoAndBranch.byTaskId);
  const storedRepoContext = recipeId ? repoBranchByTask?.[recipeId] : undefined;

  const [planStatus, setPlanStatus] = useState<PlanStatusResponse | null>(null);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);
  const [repoName, setRepoName] = useState<string>("Repository");
  const [branchName, setBranchName] = useState<string>("Branch");
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [streamProgress, setStreamProgress] = useState<{ step: string; message: string } | null>(null);
  /** Interleaved stream: chunks (thinking/response) and tool calls in arrival order. */
  const [streamItems, setStreamItems] = useState<StreamTimelineItem[]>([]);
  const streamAbortRef = useRef<AbortController | null>(null);
  const streamItemIdRef = useRef(0);
  const streamOutputEndRef = useRef<HTMLDivElement>(null);

  type ChatMessage = { role: "user" | "assistant"; content: string };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState(0);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([0]));
  const [isRegeneratingPlan, setIsRegeneratingPlan] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasChatInitializedRef = useRef(false);
  const hasAppliedRunIdFromApiRef = useRef(false);
  const hasRestoredThinkingRef = useRef<string | null>(null);
  const THINKING_STORAGE_KEY_PLAN = "potpie_thinking_plan";

  const bottomRef = useRef<HTMLDivElement>(null);
  const planContentRef = useRef<HTMLDivElement>(null);
  const { startNavigation } = useNavigationProgress();

  useEffect(() => {
    const fetchRecipeDetails = async () => {
      if (!recipeId) return;
      let fromStorage: { repo_name?: string; branch_name?: string; user_prompt?: string } | null = null;
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(`recipe_${recipeId}`);
          if (raw) fromStorage = JSON.parse(raw);
        } catch {
          fromStorage = null;
        }
      }
      try {
        const recipeDetails = await SpecService.getRecipeDetails(recipeId);
        // Repo/branch: API first, then localStorage, so we don't show "Unknown" when API omits them
        const repo =
          recipeDetails.repo_name?.trim() ||
          fromStorage?.repo_name?.trim() ||
          "Unknown Repository";
        const branch =
          recipeDetails.branch_name?.trim() || fromStorage?.branch_name?.trim() || "main";
        setRepoName(repo);
        setBranchName(branch);
        setUserPrompt(
          (recipeDetails.user_prompt && recipeDetails.user_prompt.trim()) ||
            fromStorage?.user_prompt ||
            "Implementation plan generation"
        );
        if (repo && repo !== "Unknown Repository" && typeof window !== "undefined" && !new URLSearchParams(window.location.search).get("repoName")?.trim()) {
          dispatch(setRepoAndBranchForTask({ taskId: recipeId, repoName: repo, branchName: branch }));
        }
      } catch {
        // On error, use localStorage if available so repo/branch/prompt can still show
        setRepoName(fromStorage?.repo_name?.trim() || "Unknown Repository");
        setBranchName(fromStorage?.branch_name?.trim() || "main");
        setUserPrompt(fromStorage?.user_prompt || "Implementation plan generation");
      }
    };
    fetchRecipeDetails();
  }, [recipeId, dispatch]);

  const displayRepoName =
    repoNameFromUrl || storedRepoContext?.repoName || repoName;
  const displayBranchName = storedRepoContext?.branchName || branchName;

  useEffect(() => {
    if (!userPrompt || hasChatInitializedRef.current) return;
    hasChatInitializedRef.current = true;
    setChatMessages([
      { role: "user", content: userPrompt },
      {
        role: "assistant",
        content:
          "Your implementation plan is ready. Review the phases below and tell me what you&apos;d like to change—we&apos;ll nail it before moving to code.",
      },
    ]);
  }, [userPrompt]);

  const handleSendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text || !recipeId || chatLoading) return;
    setChatMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await PlanService.planChat(recipeId, { message: text });
      const assistantContent = res.explanation || res.message || "Done.";
      setChatMessages((prev) => [...prev, { role: "assistant", content: assistantContent }]);
      // Update right pane when plan_output changed
      if (res.plan_output) {
        setPlanStatus((prev: PlanStatusResponse | null) => ({
          ...(prev ?? {
            recipe_id: recipeId,
            generation_status: "completed" as const,
            plan: null,
            generated_at: null,
            error_message: null,
          }),
          recipe_id: recipeId,
          generation_status: "completed" as const,
          plan: res.plan_output as PlanStatusResponse["plan"],
        }));
      }
    } catch (err: any) {
      const msg = err?.message ?? "Plan chat failed.";
      setChatMessages((prev) => [...prev, { role: "assistant", content: `Error: ${msg}` }]);
      toast.error(msg);
    } finally {
      setChatLoading(false);
    }
  };

  const { data: statusData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["plan-status", recipeId],
    queryFn: async () => {
      if (recipeId) return await PlanService.getPlanStatusByRecipeId(recipeId);
      return null;
    },
    enabled: !!recipeId,
    // When streaming (run_id in URL), skip polling; stream provides live updates (same as spec page)
    refetchInterval: runIdFromUrl
      ? false
      : (query: { state: { data?: PlanStatusResponse | null } }) => {
          const data = query.state.data;
          return (data?.generation_status === "processing" || data?.generation_status === "pending") ? 2000 : false;
        },
  });

  useEffect(() => {
    if (statusData) {
      setPlanStatus(statusData);
      setIsLoading(false);
    }
  }, [statusData]);

  // When we have run_id in URL, show plan page immediately (streaming UI); don't wait for initial poll (same as spec)
  useEffect(() => {
    if (recipeId && runIdFromUrl) setIsLoading(false);
  }, [recipeId, runIdFromUrl]);

  // If backend includes run_id in GET plan response, attach to stream by adding run_id to URL (once)
  useEffect(() => {
    if (!recipeId || runIdFromUrl || hasAppliedRunIdFromApiRef.current || !statusData) return;
    const runIdFromApi = "run_id" in statusData ? statusData.run_id : undefined;
    if (typeof runIdFromApi === "string" && runIdFromApi.trim()) {
      hasAppliedRunIdFromApiRef.current = true;
      router.replace(`/task/${recipeId}/plan?run_id=${encodeURIComponent(runIdFromApi.trim())}`, { scroll: false });
    }
  }, [recipeId, runIdFromUrl, statusData, router]);

  // When navigated from spec with run_id, connect to SSE stream (potpie-workflows events)
  // First check if plan is already completed before attempting stream connection
  useEffect(() => {
    if (!recipeId || !runIdFromUrl) return;

    let cancelled = false;

    const tryConnectStream = async () => {
      // First check plan status - if already completed/failed, skip streaming
      try {
        const currentStatus = await PlanService.getPlanStatusByRecipeId(recipeId);
        if (cancelled) return;
        
        const genStatus = currentStatus.generation_status;
        if (genStatus === "completed" || genStatus === "failed") {
          // Plan is already done, no need to stream - just update state and clear run_id from URL
          setPlanStatus(currentStatus);
          queryClient.invalidateQueries({ queryKey: ["plan-status", recipeId] });
          router.replace(`/task/${recipeId}/plan`, { scroll: false });
          return;
        }
      } catch {
        // If status check fails, still try to connect to stream
      }

      if (cancelled) return;

      streamAbortRef.current?.abort();
      streamAbortRef.current = new AbortController();
      setStreamProgress({ step: "Connecting…", message: "Opening live stream" });
      setStreamItems([]);

      PlanService.connectPlanStream(recipeId, runIdFromUrl, {
        signal: streamAbortRef.current.signal,
        onEvent: (eventType, data) => {
          const payload = getStreamEventPayload(data);
          if (eventType === "queued") {
            setStreamProgress({ step: "Queued", message: (payload?.message as string) ?? "Task queued for processing" });
          }
          if (eventType === "start") {
            setStreamProgress({ step: "Starting", message: (payload?.message as string) ?? "Starting plan generation" });
          }
          if (eventType === "progress" && payload) {
            setStreamProgress({
              step: (payload.step as string) ?? "Processing",
              message: (payload.message as string) ?? "",
            });
          }
          if (eventType === "chunk" && payload?.content) {
            const content = String(payload.content);
            setStreamItems((prev) => {
              const last = prev[prev.length - 1];
              if (last?.type === "chunk") {
                return [...prev.slice(0, -1), { ...last, content: last.content + content }];
              }
              return [...prev, { type: "chunk", id: `chunk-${++streamItemIdRef.current}`, content }];
            });
          }
          if (eventType === "tool_call_start" && payload?.tool) {
            const call_id = (payload.call_id as string) ?? `tool-${++streamItemIdRef.current}`;
            setStreamItems((prev) => [
              ...prev,
              { type: "tool", id: call_id, label: String(payload.tool), phase: "running" as const },
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
            setStreamItems((prev) => {
              const idx = call_id
                ? prev.findIndex((it) => it.type === "tool" && it.id === call_id)
                : prev.findLastIndex(
                    (it) => it.type === "tool" && it.phase === "running" && it.label === label
                  );
              if (idx === -1) return prev;
              const next = [...prev];
              const cur = next[idx];
              if (cur.type === "tool")
                next[idx] = { ...cur, phase: "done" as const, result: segmentContent };
              return next;
            });
          }
          if (eventType === "end") {
            setStreamProgress(null);
            queryClient.invalidateQueries({ queryKey: ["plan-status", recipeId] });
            PlanService.getPlanStatusByRecipeId(recipeId).then(setPlanStatus).catch(() => {});
            router.replace(`/task/${recipeId}/plan`, { scroll: false });
          }
          if (eventType === "error") {
            setStreamProgress(null);
            setStreamItems([]);
            queryClient.invalidateQueries({ queryKey: ["plan-status", recipeId] });
            PlanService.getPlanStatusByRecipeId(recipeId).then(setPlanStatus).catch(() => {});
            router.replace(`/task/${recipeId}/plan`, { scroll: false });
          }
        },
        onError: async (msg) => {
          // Don't treat abort as an error - expected when switching streams or regenerating
          if (/abort/i.test(msg)) return;
          // On stream error, check if plan is already completed - if so, don't show error toast
          try {
            const fallbackStatus = await PlanService.getPlanStatusByRecipeId(recipeId);
            const genStatus = fallbackStatus.generation_status;
            setPlanStatus(fallbackStatus);
            queryClient.invalidateQueries({ queryKey: ["plan-status", recipeId] });
            if (genStatus === "completed" || genStatus === "failed") {
              // Plan finished, stream just wasn't available - no error to show
              setStreamProgress(null);
              router.replace(`/task/${recipeId}/plan`, { scroll: false });
              return;
            }
          } catch {
            // Status check failed, show error
          }
          setStreamProgress(null);
          setStreamItems([]);
          toast.error("Live stream failed. Showing progress by polling.");
          router.replace(`/task/${recipeId}/plan`, { scroll: false });
        },
      });
    };

    tryConnectStream();

    return () => {
      cancelled = true;
      streamAbortRef.current?.abort();
    };
  }, [recipeId, runIdFromUrl, queryClient, router]);

  // Auto-scroll to end when stream items change
  useEffect(() => {
    if (streamItems.length > 0) {
      streamOutputEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [streamItems.length]);

  // When we land on the plan page with "not_started" status, start plan generation (run_id comes from GET plan response, then we connect to stream)
  const hasTriggeredPlanGenRef = useRef(false);
  useEffect(() => {
    if (!recipeId || isLoadingStatus || runIdFromUrl || hasTriggeredPlanGenRef.current) return;
    if (statusData?.generation_status !== "not_started") return;

    hasTriggeredPlanGenRef.current = true;
    PlanService.submitPlanGeneration({ recipe_id: recipeId })
      .then(() => queryClient.invalidateQueries({ queryKey: ["plan-status", recipeId] }))
      .catch(() => {});
  }, [recipeId, isLoadingStatus, statusData, runIdFromUrl, queryClient]);

  // Extract plan items from phases (new API)
  useEffect(() => {
    if (planStatus?.generation_status === "completed" && planStatus.plan && planItems.length === 0) {
      const items: PlanItem[] = [];
      let itemNumber = 1;
      planStatus.plan.phases.forEach((phase) => {
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
    }
  }, [planStatus?.generation_status, planStatus?.plan]);

  const phasesFromApi: PlanPhase[] = planStatus?.plan?.phases ?? [];
  useEffect(() => {
    if (phasesFromApi.length > 0 && selectedPhaseIndex >= phasesFromApi.length) {
      setSelectedPhaseIndex(Math.max(0, phasesFromApi.length - 1));
    }
  }, [phasesFromApi.length, selectedPhaseIndex]);

  const isGenerating =
    planStatus?.generation_status === "processing" ||
    planStatus?.generation_status === "pending" ||
    streamProgress !== null;
  const isCompleted = planStatus?.generation_status === "completed";
  const isFailed = planStatus?.generation_status === "failed";
  const planId = searchParams.get("planId") ?? recipeId ?? "";
  const hasPlanContent = Boolean(planStatus?.plan);

  // Auto-scroll to bottom when plan is generated
  useEffect(() => {
    if (isCompleted && planContentRef.current) {
      setTimeout(() => {
        planContentRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [isCompleted]);

  // Persist stream timeline when plan is completed so it survives refresh
  useEffect(() => {
    if (!recipeId || !isCompleted || !hasPlanContent) return;
    if (streamItems.length > 0) {
      try {
        sessionStorage.setItem(
          `${THINKING_STORAGE_KEY_PLAN}_${recipeId}`,
          JSON.stringify({ streamItems })
        );
      } catch {
        // ignore
      }
    }
  }, [recipeId, isCompleted, hasPlanContent, streamItems]);

  // Restore stream timeline on load when plan is completed (e.g. after refresh)
  useEffect(() => {
    if (!recipeId || !isCompleted || !hasPlanContent || runIdFromUrl) return;
    if (streamItems.length > 0) return;
    if (hasRestoredThinkingRef.current === recipeId) return;
    hasRestoredThinkingRef.current = recipeId;
    try {
      const raw = sessionStorage.getItem(`${THINKING_STORAGE_KEY_PLAN}_${recipeId}`);
      if (!raw) return;
      const data = JSON.parse(raw) as { streamItems?: StreamTimelineItem[] };
      const items = Array.isArray(data.streamItems) ? data.streamItems : [];
      if (items.length > 0) setStreamItems(items);
    } catch {
      // ignore
    }
  }, [recipeId, isCompleted, hasPlanContent, runIdFromUrl, streamItems.length]);

  useEffect(() => {
    if (!recipeId) return;
    return () => {
      hasRestoredThinkingRef.current = null;
    };
  }, [recipeId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-color" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#FAF8F7] text-[#000000] font-sans antialiased">
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Chat (same pattern as spec page) */}
        <div className="w-1/2 max-w-[50%] flex flex-col min-w-0 min-h-0 overflow-hidden border-r border-[#D3E5E5] bg-[#FAF8F7] chat-panel-contained">
          <div className="px-6 pt-4 pb-2 shrink-0 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                if (!recipeId) return;
                router.push(`/task/${recipeId}/spec`);
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#022019] px-0 py-0.5 rounded-md hover:underline w-fit"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to spec
            </button>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-lg font-bold text-[#022019] truncate capitalize">
                {userPrompt?.slice(0, 50) || "Chat Name"}
                {(userPrompt?.length ?? 0) > 50 ? "…" : ""}
              </h1>
              <div className="flex items-center gap-2 shrink-0 mt-1 sm:mt-0">
                <ChatBadge icon={Github}>{displayRepoName}</ChatBadge>
                <ChatBadge icon={GitBranch}>{displayBranchName}</ChatBadge>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4">
            {chatMessages.map((msg, i) => (
              <React.Fragment key={i}>
                {msg.role === "user" && (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] text-sm rounded-t-xl rounded-bl-xl px-4 py-3 bg-white border border-gray-200 text-gray-900">
                      {msg.content}
                    </div>
                  </div>
                )}
                {/* After first user message: assistant intro, then "Thinking" heading + thinking content */}
                {msg.role === "user" && i === 0 && (
                  <>
                    {/* Assistant intro message (above thinking) */}
                    <div className="flex justify-start">
                      <div className="w-10 h-10 rounded-lg shrink-0 mr-3 mt-0.5 flex items-center justify-center bg-[#102C2C] self-start">
                        <Image src="/images/logo.svg" width={24} height={24} alt="Potpie Logo" className="w-6 h-6" />
                      </div>
                      <div className="max-w-[85%] text-sm px-4 py-3 text-gray-900">
                        Your implementation plan is ready. Review the phases below and tell me what you&apos;d like to change—we&apos;ll nail it before moving to code.
                      </div>
                    </div>
                    {/* Agent output: interleaved thinking and tool calls */}
                    {(streamProgress || isGenerating || streamItems.length > 0) && (
                      <div className="flex justify-start w-full overflow-hidden" style={{ contain: "inline-size" }}>
                        <div className="w-10 h-10 rounded-lg shrink-0 mr-3 mt-0.5 flex items-center justify-center bg-[#102C2C] self-start opacity-0" aria-hidden />
                        <div className="min-w-0 flex-1 overflow-hidden" style={{ width: "calc(100% - 52px)" }}>
                          {(streamProgress || isGenerating) && streamItems.length === 0 && (
                            <p className="text-xs text-zinc-500 flex items-center gap-2 mb-2">
                              <span className="inline-block w-4 h-4 rounded-full border-2 border-[#102C2C] border-t-transparent animate-spin" />
                              {streamProgress ? `${streamProgress.step}: ${streamProgress.message}` : "Generating plan…"}
                            </p>
                          )}
                          <StreamTimeline
                            items={streamItems}
                            endRef={streamOutputEndRef}
                            loading={
                              streamItems.length > 0 &&
                              (streamProgress != null || isGenerating) &&
                              !isCompleted
                            }
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
                {msg.role === "assistant" && i !== 1 && (
                  <div className="flex justify-start">
                    <div className="w-10 h-10 rounded-lg shrink-0 mr-3 mt-0.5 flex items-center justify-center bg-[#102C2C]">
                      <Image src="/images/logo.svg" width={24} height={24} alt="Potpie" className="w-6 h-6" />
                    </div>
                    <div className="max-w-[85%] text-sm rounded-t-xl rounded-br-xl px-4 py-3 text-gray-900">
                      {msg.content}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
            {isCompleted && phasesFromApi.length > 0 && (
              <div className="max-w-[85%] mt-2 ml-[3.25rem]">
                <div className="rounded-lg border border-[#E5E7EB] bg-[#FAF8F7] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 shrink-0 text-[#022D2C]" />
                    <span className="text-sm font-bold text-[#022D2C]">Generated Plan</span>
                  </div>
                  <div className="space-y-1">
                    {phasesFromApi.map((phase, idx) => {
                      const isSelected = selectedPhaseIndex === idx;
                      const isExpanded = expandedPhases.has(idx);
                      const phaseTasks = phase.plan_items || [];
                      
                      return (
                        <div key={phase.phase_id}>
                          {/* Phase header */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPhaseIndex(idx);
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
                            className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors first:rounded-t last:rounded-b ${
                              isSelected ? "bg-[#F8F8F8] text-[#022D2C] font-semibold" : "bg-transparent text-[#374151] font-normal hover:bg-[#F8F8F8]/50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <ChevronDown
                                className={`w-4 h-4 text-[#6B7280] transition-transform ${
                                  isExpanded ? "" : "-rotate-90"
                                }`}
                              />
                              <span className="text-sm text-left">
                                PHASE {idx + 1}: {phase.name}
                              </span>
                            </div>
                            <span className="text-xs text-[#6B7280]">
                              {phaseTasks.length} tasks
                            </span>
                          </button>
                          
                          {/* Task list */}
                          {isExpanded && phaseTasks.length > 0 && (
                            <div className="ml-6 pl-4 border-l border-[#E5E7EB] mt-1 space-y-1">
                              {phaseTasks.map((task, taskIdx) => (
                                <div
                                  key={task.plan_item_id || taskIdx}
                                  className="flex items-center gap-2 py-2 px-3 text-left"
                                >
                                  <div className="w-2 h-2 rounded-full bg-[#022D2C] shrink-0" />
                                  <span className="text-xs text-[#374151] truncate">
                                    {task.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

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
                placeholder="Describe any change that you want...."
                rows={3}
                className="w-full min-h-[88px] px-4 py-3 pr-14 pb-12 rounded-xl border border-gray-200 bg-[#FFFDFC] text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#102C2C]/20 focus:border-[#102C2C] resize-none"
              />
              <button
                type="button"
                onClick={handleSendChatMessage}
                disabled={chatLoading}
                className="absolute right-2 bottom-4 h-10 w-10 rounded-full bg-[#102C2C] text-[#B6E343] flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {chatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <SendHorizonal className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Phase Plan panel (top bar matches Spec page) */}
        <aside className="w-1/2 max-w-[50%] flex flex-col min-w-0 min-h-0 border-l border-[#D3E5E5]">
          <div className="p-6 border-b border-[#D3E5E5] bg-[#FFFDFC] shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-bold leading-tight tracking-tight shrink-0 truncate min-w-0" style={{ color: "#022019" }} title={`Phase ${selectedPhaseIndex + 1}`}>
                {phasesFromApi.length > 0 ? `Phase ${selectedPhaseIndex + 1}` : "Phase Plan"}
              </h2>
              <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="p-1 rounded-full hover:bg-[#CCD3CF]/30 transition-colors shrink-0"
                        aria-label="Phase Plan info"
                      >
                        <Info className="w-4 h-4" style={{ color: "#022019" }} />
                      </button>
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipContent
                        side="bottom"
                        align="end"
                        sideOffset={8}
                        className="max-w-[280px] bg-white text-gray-900 border border-gray-200 shadow-lg rounded-lg px-4 py-3 text-sm font-normal"
                      >
                        Phase Plan breaks the specification into ordered phases and implementation steps.
                      </TooltipContent>
                    </TooltipPortal>
                  </Tooltip>
                </TooltipProvider>
                </div>
              <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!recipeId || isRegeneratingPlan) return;
                      setIsRegeneratingPlan(true);
                      try {
                        await PlanService.regeneratePlan(recipeId);
                        toast.success("Plan regeneration started");
                        setPlanStatus(null);
                        queryClient.invalidateQueries({ queryKey: ["plan-status", recipeId] });
                      } catch (err: any) {
                        console.error("Error regenerating plan:", err);
                        toast.error(err?.message ?? "Failed to regenerate plan");
                      } finally {
                        setIsRegeneratingPlan(false);
                      }
                    }}
                    disabled={isRegeneratingPlan}
                    className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Regenerate plan"
                  >
                    {isRegeneratingPlan ? (
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#022019" }} />
                    ) : (
                      <RotateCw className="w-4 h-4" style={{ color: "#022019" }} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPhaseIndex((i) => Math.max(0, i - 1))}
                    disabled={phasesFromApi.length === 0 || selectedPhaseIndex <= 0}
                    className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    aria-label="Previous phase"
                  >
                    <ChevronLeft className="w-4 h-4" style={{ color: "#022019" }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPhaseIndex((i) => Math.min((phasesFromApi.length || 1) - 1, i + 1))}
                    disabled={phasesFromApi.length === 0 || selectedPhaseIndex >= phasesFromApi.length - 1}
                    className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    aria-label="Next phase"
                  >
                    <ChevronRight className="w-4 h-4" style={{ color: "#022019" }} />
                  </button>
                
                </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
            <div className="absolute left-[26px] top-4 bottom-4 w-[1px] -z-10" style={{ backgroundColor: "#696D6D" }} />

          {(streamProgress || isGenerating || streamItems.length > 0) && !isCompleted && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <img src="/images/loader.gif" alt="Loading" className="w-16 h-16 mb-4" />
              <p className="text-sm font-medium text-[#102C2C]">Cooking ingredients for plan</p>
              <p className="text-xs text-zinc-500 mt-1">
                {streamProgress ? `${streamProgress.step}: ${streamProgress.message}` : "Preparing plan…"}
              </p>
            </div>
          )}

          {isFailed && (
            <div className="pl-16 py-8">
              <div className="rounded-lg p-8 border border-red-200 bg-red-50">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-900 mb-1">
                      Plan generation failed
                    </p>
                    {planStatus?.error_message && (
                      <p className="text-xs text-red-700">{planStatus.error_message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isCompleted && phasesFromApi.length > 0 && (() => {
            const phase = phasesFromApi[selectedPhaseIndex];
            if (!phase) return null;
            return (
              <div ref={planContentRef} className="space-y-4">
                <h3 className="text-xl font-bold tracking-tight text-[#022019]">
                  {phase.name}
                </h3>
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="w-full grid grid-cols-3 rounded-none border-b border-[#D3E5E5] bg-[#F7F6F5] p-0 h-11 gap-0">
                    <TabsTrigger
                      value="summary"
                      className="rounded-none h-11 px-0 text-sm font-medium text-[#022019] border-b-2 border-transparent shadow-none data-[state=active]:bg-[#EAF4C8] data-[state=active]:border-[#B4D13F]"
                    >
                      Summary
                    </TabsTrigger>
                    <TabsTrigger
                      value="architecture"
                      className="rounded-none h-11 px-0 text-sm font-medium text-[#022019] border-b-2 border-transparent shadow-none data-[state=active]:bg-[#EAF4C8] data-[state=active]:border-[#B4D13F]"
                    >
                      Architecture
                    </TabsTrigger>
                    <TabsTrigger
                      value="plan-items"
                      className="rounded-none h-11 px-0 text-sm font-medium text-[#022019] border-b-2 border-transparent shadow-none data-[state=active]:bg-[#EAF4C8] data-[state=active]:border-[#B4D13F]"
                    >
                      Plan items
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="summary" className="mt-4 pt-2 pb-12 pr-4">
                    <div className="py-5 pr-2">
                      <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-line">
                        {phase.summary || "No summary provided for this phase."}
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="architecture" className="mt-4 pt-2 pb-12 pr-4">
                    <div className="py-5 pr-2 space-y-6">
                      {phase.diagrams && phase.diagrams.length > 0 ? (
                        phase.diagrams.map((d) => (
                          <div
                            key={d.diagram_id}
                            className="border rounded-lg p-4 overflow-x-auto bg-[#FFFDFC]"
                            style={{ borderColor: "#CCD3CF" }}
                          >
                            <h4 className="text-sm font-semibold text-[#022019] mb-1">{d.title}</h4>
                            {d.description && (
                              <p className="text-xs text-[#374151] mb-3 leading-relaxed">{d.description}</p>
                            )}
                            {d.mermaid_code ? (
                              looksLikeMermaid(d.mermaid_code) ? (
                                <MermaidDiagram chart={d.mermaid_code} />
                              ) : (
                                <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap break-words m-0 p-0">
                                  {d.mermaid_code}
                                </pre>
                              )
                            ) : (
                              <p className="text-xs text-zinc-500 italic">No diagram content.</p>
                            )}
                            {d.validation_error && (
                              <p className="text-xs text-amber-700 mt-2">Validation: {d.validation_error}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[#374151] leading-relaxed">
                          No architecture diagram available for this phase.
                        </p>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="plan-items" className="mt-4 pt-2 pb-12 pr-4">
                    <div className="space-y-8">
                      {(phase.plan_items ?? []).map((item: PhasedPlanItem) => (
                        <div
                          key={item.plan_item_id}
                          className="rounded-lg border bg-[#FFFDFC] overflow-hidden"
                          style={{ borderColor: "#CCD3CF" }}
                        >
                          <h4 className="text-sm font-bold uppercase tracking-wide px-4 py-3 text-primary-color">
                            {item.title}
                          </h4>
                          <div className="border-t px-4 py-3 space-y-4" style={{ borderColor: "#CCD3CF" }}>
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-primary-color" />
                                <span className="text-xs font-bold uppercase tracking-wide text-primary-color">Description</span>
                              </div>
                              <p className="text-sm text-[#374151] leading-relaxed">
                                {item.detailed_description || item.description || "No description provided."}
                              </p>
                            </div>
                            {item.file_changes && item.file_changes.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <FileCode className="w-4 h-4 text-primary-color" />
                                  <span className="text-xs font-bold uppercase tracking-wide text-primary-color">File changes</span>
                                </div>
                                <ul className="space-y-1.5">
                                  {item.file_changes.map((fc, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm">
                                      <span
                                        className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                          fc.action?.toLowerCase() === "create"
                                            ? "bg-amber-100 text-amber-800"
                                            : fc.action?.toLowerCase() === "modify"
                                            ? "bg-blue-100 text-blue-800"
                                            : "bg-zinc-100 text-zinc-700"
                                        }`}
                                      >
                                        {fc.action || "change"}
                                      </span>
                                      <span className="font-mono text-[#374151] truncate" title={fc.path}>{fc.path}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {item.verification_criteria && item.verification_criteria.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <ListTodo className="w-4 h-4 text-primary-color" />
                                  <span className="text-xs font-bold uppercase tracking-wide text-primary-color">Verification criteria</span>
                                </div>
                                <ul className="space-y-1.5 list-disc list-inside text-sm text-[#374151]">
                                  {item.verification_criteria.map((c, i) => (
                                    <li key={i}>{c}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {(!phase.plan_items || phase.plan_items.length === 0) && (
                        <p className="text-sm text-[#374151]">No plan items in this phase.</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            );
          })()}

          {isCompleted && planItems.length > 0 && phasesFromApi.length === 0 && (
            <Accordion type="single" collapsible className="space-y-4">
              {planItems.map((item) => {
                const modules = groupFilesByModule(item.files);
                const itemValue = `plan-step-${item.order}`;
                const phaseNum = String(item.order + 1).padStart(2, "0");

                return (
                  <AccordionItem
                    key={itemValue}
                    value={itemValue}
                    className="group overflow-hidden transition-all rounded-lg border data-[state=open]:ring-1 data-[state=open]:ring-[#022019]"
                    style={{ backgroundColor: "#FFFDFC", borderColor: "#CCD3CF" }}
                  >
                    <AccordionTrigger className="p-4 flex gap-4 items-start hover:no-underline [&>svg]:hidden w-full">
                      <div className="pt-0.5 shrink-0"><StatusIcon status="generated" /></div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold tracking-wider" style={{ color: "#747575", letterSpacing: "0.04em" }}>
                            PHASE {phaseNum}
                          </span>
                          <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180 text-[#747575]" />
                        </div>
                        <h3 className="text-sm font-medium truncate leading-snug" style={{ color: "#000000", fontSize: 14 }}>{item.title}</h3>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="border-t pt-0" style={{ borderColor: "#CCD3CF", backgroundColor: "rgba(255,253,252,0.6)" }}>
                      <div className="px-5 py-4 border-b bg-[#FFFDFC]" style={{ borderColor: "#CCD3CF" }}>
                        <div className="flex items-center gap-2 mb-2"><AlignLeft className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">Objective</span></div>
                        <p className="text-xs">{item.detailed_objective}</p>
                      </div>

                      {item.description && (
                        <div className="px-5 py-4 border-b" style={{ borderColor: "#CCD3CF", backgroundColor: "rgba(255,253,252,0.6)" }}>
                          <div className="flex items-center gap-2 mb-2"><FileText className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">Description</span></div>
                          <p className="text-xs">{item.description}</p>
                        </div>
                      )}

                      <div className="px-5 py-4 border-b bg-[#FFFDFC]" style={{ borderColor: "#CCD3CF" }}>
                        <div className="flex items-center gap-2 mb-2"><ListTodo className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">Implementation Steps</span></div>
                        <ul className="space-y-2">
                          {item.implementation_steps && item.implementation_steps.length > 0 ? (
                            item.implementation_steps.map((step, i) => (
                              <li key={i} className="flex gap-2 text-xs text-left">
                                <div className="mt-1.5 w-1 h-1 rounded-full bg-zinc-300 shrink-0" />
                                <FormattedText text={step} />
                              </li>
                            ))
                          ) : (
                            <li className="text-xs text-zinc-400 italic">No implementation steps defined</li>
                          )}
                        </ul>
                      </div>

                      {item.verification_criteria && (
                        <div className="px-5 py-4 border-b" style={{ borderColor: "#CCD3CF", backgroundColor: "rgba(255,253,252,0.6)" }}>
                          <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">Verification Criteria</span></div>
                          <p className="text-xs">{item.verification_criteria}</p>
                        </div>
                      )}

                      {item.context_handoff && (
                        <div className="px-5 py-4 border-b bg-[#FFFDFC]" style={{ borderColor: "#CCD3CF" }}>
                          <div className="flex items-center gap-2 mb-2"><ArrowRightLeft className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">Context Handoff</span></div>
                          {item.context_handoff.summary ? (
                            <p className="text-xs">{item.context_handoff.summary}</p>
                          ) : (
                            <div className="text-xs">
                              {Object.entries(item.context_handoff).map(([key, value], i) => (
                                <div key={i} className="mb-2 last:mb-0">
                                  <span className="font-bold text-zinc-600">{key}:</span>{" "}
                                  <span>{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {item.reasoning && (
                        <div className="px-5 py-4 border-b" style={{ borderColor: "#CCD3CF", backgroundColor: "rgba(255,253,252,0.6)" }}>
                          <div className="flex items-center gap-2 mb-2"><Lightbulb className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">Reasoning</span></div>
                          {Array.isArray(item.reasoning) ? (
                            <ul className="space-y-2">
                              {item.reasoning.length > 0 ? (
                                item.reasoning.map((reason, i) => (
                                  <li key={i} className="flex gap-2 text-xs text-left">
                                    <div className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                                    <FormattedText text={reason} />
                                  </li>
                                ))
                              ) : (
                                <li className="text-xs text-zinc-400 italic">No reasoning provided</li>
                              )}
                            </ul>
                          ) : (
                            <p className="text-xs">{item.reasoning}</p>
                          )}
                        </div>
                      )}

                      {item.architecture && (
                        <div className="px-5 py-4 bg-[#FFFDFC]">
                          <div className="flex items-center gap-2 mb-2"><GitMerge className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase">Architecture</span></div>
                          <div className="border rounded-lg p-4 overflow-x-auto bg-[#FFFDFC]" style={{ borderColor: "#CCD3CF" }}>
                            {looksLikeMermaid(item.architecture) ? (
                              <MermaidDiagram chart={item.architecture} />
                            ) : (
                              <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap break-words m-0 p-0">
                                {item.architecture}
                              </pre>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Files changeset */}
                      {(Object.keys(modules).length > 0 || (item.files && item.files.length > 0)) && (
                        <div className="px-5 py-4 border-t" style={{ borderColor: "#CCD3CF" }}>
                           <div className="flex items-center gap-2 mb-3">
                              <FileCode className="w-3.5 h-3.5" style={{ color: "#022019" }} />
                              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#022019" }}>Specs to Generate</span>
                              <span className="text-[9px] text-zinc-400">({item.files?.length || 0} files)</span>
                            </div>
                            {Object.keys(modules).length > 0 ? (
                              <div className="grid grid-cols-1 gap-3">
                                {Object.entries(modules).map(([modName, files]) => (
                                  <div key={modName} className="rounded-lg p-3 border" style={{ backgroundColor: "#FFFDFC", borderColor: "#CCD3CF" }}>
                                    <div className="flex items-center gap-2 mb-2">
                                      {React.createElement(getModuleIcon(modName), { className: "w-3 h-3" })}
                                      <span className="text-[10px] font-bold uppercase">{modName}</span>
                                      <span className="text-[9px] text-zinc-400">({files.length})</span>
                                    </div>
                                    <ul className="space-y-1.5">
                                      {files.map((f, i) => (
                                        <li key={i} className="flex justify-between items-center text-[10px] gap-2">
                                          <span className="font-mono truncate text-zinc-600" title={f.path}>{f.path}</span>
                                          <span className={`font-bold uppercase text-[9px] px-1.5 py-0.5 rounded ${
                                            f.type?.toLowerCase() === 'create' ? 'bg-emerald-50 text-emerald-600' :
                                            f.type?.toLowerCase() === 'modify' ? 'bg-amber-50 text-amber-600' :
                                            f.type?.toLowerCase() === 'delete' ? 'bg-red-50 text-red-600' :
                                            'bg-zinc-100 text-zinc-600'
                                          }`}>{f.type}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-lg p-3 border" style={{ backgroundColor: "#FFFDFC", borderColor: "#CCD3CF" }}>
                                <ul className="space-y-1.5">
                                  {item.files?.map((f: FileItem, i: number) => (
                                    <li key={i} className="flex justify-between items-center text-[10px] gap-2">
                                      <span className="font-mono truncate text-zinc-600" title={f.path}>{f.path}</span>
                                      <span className={`font-bold uppercase text-[9px] px-1.5 py-0.5 rounded ${
                                        f.type?.toLowerCase() === 'create' ? 'bg-emerald-50 text-emerald-600' :
                                        f.type?.toLowerCase() === 'modify' ? 'bg-amber-50 text-amber-600' :
                                        f.type?.toLowerCase() === 'delete' ? 'bg-red-50 text-red-600' :
                                        'bg-zinc-100 text-zinc-600'
                                      }`}>{f.type}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </div>
                      )}
                    </AccordionContent> 
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}

          {/* Static Fallback (for demo/loading) */}
          {visibleCount > 0 && (
            <Accordion type="single" collapsible className="space-y-4">
              {FULL_PLAN.slice(0, visibleCount).map((slice, idx) => {
                const itemValue = `static-slice-${slice.id}`;
                const phaseNum = String(slice.id).padStart(2, "0");
                return (
                  <AccordionItem key={itemValue} value={itemValue} className="group overflow-hidden transition-all rounded-lg border data-[state=open]:ring-1 data-[state=open]:ring-[#022019]" style={{ backgroundColor: "#FFFDFC", borderColor: "#CCD3CF" }}>
                    <AccordionTrigger className="p-4 flex gap-4 hover:no-underline [&>svg]:hidden w-full">
                      <div className="pt-0.5 shrink-0"><StatusIcon status="generated" /></div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold tracking-wider" style={{ color: "#747575", letterSpacing: "0.04em" }}>PHASE {phaseNum}</span>
                          <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180 text-[#747575]" />
                        </div>
                        <h3 className="text-sm font-medium truncate leading-snug" style={{ color: "#000000", fontSize: 14 }}>{slice.title}</h3>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="border-t pt-0 p-5" style={{ borderColor: "#CCD3CF", backgroundColor: "rgba(255,253,252,0.6)" }}>
                      <p className="text-xs text-[#000000]">{slice.description}</p>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}

          <div ref={bottomRef} />
          </div>

          {isCompleted && planItems.length > 0 && (
            <div className="shrink-0 p-6 pt-4 border-t border-[#D3E5E5] bg-[#FFFDFC] flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  const firstItem = planItems[0];
                  startNavigation();
                  try {
                    const resp = await TaskSplittingService.submitTaskSplitting({
                      recipe_id: recipeId,
                      plan_item_id: firstItem.id,
                    });
                    const params = new URLSearchParams();
                    params.set("planId", planId);
                    params.set("itemNumber", String(firstItem.item_number));
                    params.set("taskSplittingId", resp.task_splitting_id);
                    router.push(`/task/${recipeId}/code?${params.toString()}`);
                  } catch (e) {
                    console.error("Failed to start implementation", e);
                    toast.error("Failed to start implementation");
                    router.push(
                      `/task/${recipeId}/code?planId=${planId}&itemNumber=${firstItem.item_number}`
                    );
                  }
                }}
                className="px-6 py-2.5 rounded-lg font-medium text-sm bg-[#022019] text-[#B4D13F] hover:opacity-90 shadow-sm"
              >
                START IMPLEMENTATION
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default PlanPage;