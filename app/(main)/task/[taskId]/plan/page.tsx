"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Roboto_Mono } from "next/font/google";
import { MermaidDiagram } from "@/components/chat/MermaidDiagram";

const robotoMono = Roboto_Mono({ subsets: ["latin"] });
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
  Pencil,
  Trash2,
  Undo2,
  Plus,
  SendHorizontal,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PlanService from "@/services/PlanService";
import SpecService from "@/services/SpecService";
import TaskSplittingService from "@/services/TaskSplittingService";
import { PlanStatusResponse, PlanItem } from "@/lib/types/spec";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border border-border-light text-primary-color">
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </div>
);

/** Chat pill badge (matches spec page) */
const ChatBadge = ({ children, icon: Icon }: { children: React.ReactNode; icon?: LucideIcon }) => (
  <div className="flex items-center gap-1.5 px-2 py-0.5 border border-border-light rounded text-xs font-medium text-primary-color">
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
      <div className="w-5 h-5 rounded-full flex items-center justify-center bg-primary-color">
        <Check className="w-3 h-3 text-white" />
      </div>
    );
  return <div className="w-5 h-5 rounded-full border border-border-light bg-card" />;
};

const PlanPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const recipeId = params?.taskId as string;

  const [planStatus, setPlanStatus] = useState<PlanStatusResponse | null>(null);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);
  const [repoName, setRepoName] = useState<string>("Repository");
  const [branchName, setBranchName] = useState<string>("Branch");
  const [userPrompt, setUserPrompt] = useState<string>("");

  type ChatMessage = { role: "user" | "assistant"; content: string };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasChatInitializedRef = useRef(false);
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"objective" | "reasoning" | "architecture">("objective");
  const [underlineStyle, setUnderlineStyle] = useState<{ left: number; width: number } | null>(null);
  const tabListRef = useRef<HTMLDivElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  const TAB_ORDER = ["objective", "reasoning", "architecture"] as const;

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
        setRepoName(recipeDetails.repo_name ?? fromStorage?.repo_name ?? "Unknown Repository");
        setBranchName(recipeDetails.branch_name ?? fromStorage?.branch_name ?? "main");
        setUserPrompt(
          (recipeDetails.user_prompt && recipeDetails.user_prompt.trim()) ||
            fromStorage?.user_prompt ||
            "Implementation plan generation"
        );
      } catch {
        setRepoName(fromStorage?.repo_name ?? "Unknown Repository");
        setBranchName(fromStorage?.branch_name ?? "main");
        setUserPrompt(fromStorage?.user_prompt ?? "Implementation plan generation");
      }
    };
    fetchRecipeDetails();
  }, [recipeId]);

  useEffect(() => {
    if (!userPrompt || hasChatInitializedRef.current) return;
    hasChatInitializedRef.current = true;
    setChatMessages([
      { role: "user", content: userPrompt },
      {
        role: "assistant",
        content:
          "I've generated a granular specification for the AI Chat Metadata logging. Review the goals below before we proceed to implementation.",
      },
    ]);
  }, [userPrompt]);

  const handleSendChatMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatInput("");
  };

  const handleChatAction = (_action: "add" | "modify" | "remove" | "undo") => {
    toast.info("Plan chat actions will be connected when the backend is ready.");
  };

  const { data: statusData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["plan-status", recipeId],
    queryFn: async () => {
      if (recipeId) return await PlanService.getPlanStatusByRecipeId(recipeId);
      return null;
    },
    enabled: !!recipeId,
    refetchInterval: (query) => {
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

  useEffect(() => {
    if (recipeId && !isLoadingStatus && !statusData) {
      PlanService.submitPlanGeneration({ recipe_id: recipeId }).catch(() => {});
    }
  }, [recipeId, isLoadingStatus, statusData]);

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

  // Keep selected phase index in bounds when phases load or change
  const phaseCount = planStatus?.plan?.phases?.length ?? 0;
  useEffect(() => {
    if (phaseCount > 0 && selectedPhaseIndex >= phaseCount) {
      setSelectedPhaseIndex(0);
    }
  }, [phaseCount, selectedPhaseIndex]);

  const isGenerating = planStatus?.generation_status === "processing" || planStatus?.generation_status === "pending";
  const isCompleted = planStatus?.generation_status === "completed";
  const isFailed = planStatus?.generation_status === "failed";
  const planId = searchParams.get("planId") ?? recipeId ?? "";

  useEffect(() => {
    if (!tabListRef.current || !isCompleted) return;
    const buttons = tabListRef.current.querySelectorAll("button");
    const index = TAB_ORDER.indexOf(activeTab);
    const btn = buttons[index];
    if (btn) {
      const run = () =>
        setUnderlineStyle({ left: btn.offsetLeft, width: btn.offsetWidth });
      requestAnimationFrame(() => requestAnimationFrame(run));
    }
  }, [activeTab, isCompleted]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-color" />
      </div>
    );
  }

  // Plan status card label and icon from API generation_status
  const planGenStatus = planStatus?.generation_status ?? "not_started";
  const planStatusCard = (() => {
    switch (planGenStatus) {
      case "completed":
        return { title: "Plan Generation Completed", icon: "check" as const };
      case "processing":
      case "pending":
        return { title: "Plan Generation In Progress", icon: "spinner" as const };
      case "failed":
        return { title: "Plan Generation Failed", icon: "failed" as const };
      case "not_started":
      default:
        return { title: "Plan Generation Pending", icon: "pending" as const };
    }
  })();

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground font-sans antialiased">
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Chat (same pattern as spec page) */}
        <div className="flex-[1] flex flex-col min-w-0 min-h-0 overflow-hidden border-r border-border-light" style={{ backgroundColor: "#FAF8F7" }}>
          <div className="flex justify-between items-center px-6 pt-6 pb-4 shrink-0">
            <h1 className="text-lg font-medium capitalize text-primary-color truncate">
              {userPrompt?.slice(0, 50) || "Chat Name"}
              {(userPrompt?.length ?? 0) > 50 ? "…" : ""}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              <ChatBadge icon={Github}>{repoName}</ChatBadge>
              <ChatBadge icon={GitBranch}>{branchName}</ChatBadge>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex items-center ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg shrink-0 mr-3 flex items-center justify-center bg-primary">
                    <Image src="/images/logo.svg" width={20} height={20} alt="Potpie" className="w-5 h-5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] text-sm ${
                    msg.role === "user"
                      ? "rounded-t-xl rounded-bl-xl px-4 py-3 bg-white border border-gray-200 text-gray-900"
                      : "rounded-t-xl rounded-br-xl px-4 py-3 text-gray-900"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {/* Status cards: same width, aligned with assistant message text */}
            <div className="flex flex-col gap-2 ml-[44px] w-full max-w-[85%]">
              <div className="rounded-lg border border-border-light px-4 py-3 flex flex-col gap-1 w-full">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 shrink-0 text-primary-color" />
                  <p className="text-sm font-bold text-primary-color">Spec Generation Completed</p>
                </div>
                <p className="text-xs font-medium text-muted-foreground pl-8">STATUS: 100% COMPLETED</p>
              </div>
              {/* Plan status: generating → eventually Generated Plan list */}
              {isGenerating && (
                <div className="rounded-lg border border-border-light px-4 py-3 flex flex-col gap-1 w-full">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 shrink-0 animate-spin text-primary-color" />
                    <p className="text-sm font-bold text-primary-color">Generating plan...</p>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground pl-8">Plan will appear here when ready.</p>
                </div>
              )}
              {/* Generated Plan: list of phases (clickable) */}
              {isCompleted && planStatus?.plan?.phases && planStatus.plan.phases.length > 0 && (
              <div className="rounded-lg border border-border-light overflow-hidden w-full">
                <div className="flex items-center gap-2 px-4 py-3">
                  <FileText className="w-4 h-4 text-primary-color" />
                  <p className="text-sm font-bold text-foreground">Generated Plan</p>
                </div>
                <div className="flex flex-col py-2">
                  {planStatus.plan.phases.map((phase, idx) => (
                    <button
                      key={phase.phase_id}
                      type="button"
                      onClick={() => setSelectedPhaseIndex(idx)}
                      className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-none hover:bg-muted/60 transition-colors ${
                        selectedPhaseIndex === idx ? "bg-muted" : ""
                      }`}
                    >
                      <span className={`text-sm font-bold shrink-0 text-primary-color ${robotoMono.className}`}>
                        PHASE {idx + 1} :
                      </span>
                      <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0">
                        {phase.name}
                      </span>
                      <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
              )}
            </div>
            <div ref={chatEndRef} />
          </div>

          <div className="px-6 py-2 flex flex-wrap gap-2 shrink-0">
            {[
              { id: "add" as const, label: "Add Item", icon: Plus },
              { id: "modify" as const, label: "Modify", icon: Pencil },
              { id: "remove" as const, label: "Remove", icon: Trash2 },
              { id: "undo" as const, label: "Undo", icon: Undo2 },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleChatAction(id)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-800 text-xs font-medium flex items-center gap-1.5 hover:bg-gray-50 transition-colors"
              >
                <Icon className="w-3.5 h-3.5 text-primary-color" />
                {label}
              </button>
            ))}
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
                className="w-full min-h-[88px] px-4 py-3 pr-14 pb-12 rounded-xl border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
              <button
                type="button"
                onClick={handleSendChatMessage}
                className="absolute right-2 bottom-4 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <SendHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Phase Plan panel (top bar matches Spec page) */}
        <aside className="flex-1 flex flex-col min-w-0 min-h-0 border-l border-border-light bg-white">
          <div className="p-6 border-b border-border-light shrink-0 bg-white">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0 flex-1 justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-[18px] font-bold leading-tight tracking-tight shrink-0 text-primary-color">
                    Phase Plan
                  </h2>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="p-1 rounded-full hover:bg-muted/50 transition-colors shrink-0"
                          aria-label="Phase Plan info"
                        >
                          <Info className="w-4 h-4 text-primary-color" />
                        </button>
                      </TooltipTrigger>
                      <TooltipPortal>
                        <TooltipContent
                          side="bottom"
                          align="start"
                          sideOffset={8}
                          className="max-w-[280px] bg-white text-gray-900 border border-gray-200 shadow-lg rounded-lg px-4 py-3 text-sm font-normal"
                        >
                          Phase Plan breaks the specification into ordered phases and implementation steps.
                        </TooltipContent>
                      </TooltipPortal>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <button
                  type="button"
                  className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors shrink-0"
                  aria-label="Refresh"
                >
                  <RotateCw className="w-4 h-4 text-primary-color" />
                </button>
              </div>
              {isCompleted && planItems.length > 0 && (
                <Button
                  onClick={async () => {
                    const firstItem = planItems[0];
                    try {
                      await TaskSplittingService.submitTaskSplitting({ plan_item_id: firstItem.id });
                    } catch (e) {
                      console.error("Failed to start implementation", e);
                    } finally {
                      router.push(`/task/${recipeId}/code?planId=${planId}&itemNumber=${firstItem.item_number}`);
                    }
                  }}
                  className="shrink-0 px-6 py-2 rounded-lg font-medium text-sm bg-primary text-primary-foreground hover:opacity-90"
                >
                  START IMPLEMENTATION
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6 xl:px-10 xl:py-8 2xl:px-12 2xl:py-10 flex flex-col">
            {isGenerating && (
              <div className="rounded-lg p-8 border border-border-light bg-white w-full max-w-2xl xl:max-w-4xl 2xl:max-w-5xl mx-auto">
                <Loader2 className="w-5 h-5 animate-spin mb-2 text-primary-color" />
                <p className="text-sm font-medium text-primary-color">Generating...</p>
              </div>
            )}

            {isFailed && (
              <div className="rounded-lg p-8 border border-red-200 bg-red-50 w-full max-w-2xl xl:max-w-4xl 2xl:max-w-5xl mx-auto">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-900 mb-1">Plan generation failed</p>
                    {planStatus?.error_message && (
                      <p className="text-xs text-red-700">{planStatus.error_message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isCompleted && planStatus?.plan?.phases && planStatus.plan.phases.length > 0 && (() => {
              const selectedPhase = planStatus.plan.phases[selectedPhaseIndex];
              const firstItem = selectedPhase?.plan_items?.[0];
              const firstPlanItem = planItems.find((p) => p.id === firstItem?.plan_item_id);
              return (
                <div className="w-full max-w-2xl xl:max-w-4xl 2xl:max-w-5xl mx-auto">
                  <div ref={tabListRef} className="relative flex gap-10 border-b border-border-light pb-0">
                    {TAB_ORDER.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-sm font-medium border-b-4 border-transparent transition-colors duration-200 capitalize ${
                          activeTab === tab ? "text-primary-color" : "text-muted-foreground hover:text-primary-color"
                        }`}
                      >
                        {tab === "objective" ? "Objective" : tab === "reasoning" ? "Reasoning" : "Architecture"}
                      </button>
                    ))}
                    {underlineStyle && (
                      <span
                        className="absolute bottom-0 left-0 h-1 bg-primary-foreground rounded-full transition-[left,width] duration-200 ease-out"
                        style={{
                          left: underlineStyle.left,
                          width: underlineStyle.width,
                        }}
                        aria-hidden
                      />
                    )}
                  </div>

                  <div className="mt-8">
                    {activeTab === "objective" && selectedPhase && (
                      <div className="space-y-10">
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <ListTodo className="w-4 h-4 shrink-0 text-primary-color" />
                            <span className={`text-xs font-bold uppercase tracking-wider text-primary-color ${robotoMono.className}`}>OBJECTIVE</span>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pl-6">
                            {firstItem?.description || selectedPhase.description || "No objective specified."}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <FileText className="w-4 h-4 shrink-0 text-primary-color" />
                            <span className={`text-xs font-bold uppercase tracking-wider text-primary-color ${robotoMono.className}`}>DESCRIPTION</span>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pl-6">
                            {selectedPhase.summary || firstItem?.description || selectedPhase.description || "No description specified."}
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTab === "reasoning" && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Lightbulb className="w-4 h-4 shrink-0 text-primary-color" />
                          <span className={`text-xs font-bold uppercase tracking-wider text-primary-color ${robotoMono.className}`}>REASONING</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pl-6">
                          {firstPlanItem?.reasoning || selectedPhase?.summary || "No reasoning provided for this phase."}
                        </p>
                      </div>
                    )}

                    {activeTab === "architecture" && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <GitMerge className="w-4 h-4 shrink-0 text-primary-color" />
                          <span className={`text-xs font-bold uppercase tracking-wider text-primary-color ${robotoMono.className}`}>ARCHITECTURE</span>
                        </div>
                        {firstPlanItem?.architecture ? (
                          <div className="border border-border-light rounded-lg p-4 overflow-x-auto bg-white mt-0 pl-0">
                            <MermaidDiagram chart={firstPlanItem.architecture} />
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground pl-6">No architecture diagram for this phase.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Phase navigation footer (sticky at bottom of right panel) */}
          {isCompleted && planStatus?.plan?.phases && planStatus.plan.phases.length > 0 && (
            <div className="border-t border-border-light bg-white px-8 py-4 xl:px-10 2xl:px-12">
              <div className="max-w-2xl xl:max-w-4xl 2xl:max-w-5xl mx-auto flex items-center justify-between gap-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={selectedPhaseIndex === 0}
                  onClick={() => setSelectedPhaseIndex((i) => Math.max(0, i - 1))}
                  className="bg-white shrink-0 px-4 py-2 rounded-lg border-border-light text-primary-color hover:bg-muted disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className={`text-sm font-medium text-foreground ${robotoMono.className}`}>
                  Phase {selectedPhaseIndex + 1} of {planStatus?.plan?.phases?.length ?? 0}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={selectedPhaseIndex === (planStatus?.plan?.phases?.length ?? 1) - 1}
                  onClick={() => setSelectedPhaseIndex((i) => Math.min((planStatus?.plan?.phases?.length ?? 1) - 1, i + 1))}
                  className="bg-white shrink-0 px-4 py-2 rounded-lg border-border-light text-primary-color hover:bg-muted disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default PlanPage;