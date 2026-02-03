"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Github,
  GitBranch,
  Check,
  Loader2,
  ChevronDown,
  X,
  FileCode,
  Zap,
  Search,
  Layers,
  Wand2,
  ShieldCheck,
  Flag,
  FileText,
  Package,
  Link2,
  Info,
} from "lucide-react";
import {
  MockQuestion,
  MockTaskResponse,
  getMockTaskFromSession,
} from "@/lib/mock/taskMock";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import SpecService from "@/services/SpecService";
import {
  SpecStatusResponse,
  SpecPlanStatusResponse,
  SpecOutput,
} from "@/lib/types/spec";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import QuestionService from "@/services/QuestionService";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

const PLAN_CHAPTERS = [
  {
    id: 1,
    title: "Analyzing codebase",
    icon: Search,
    description: "Scanning repository structure and dependencies.",
    progressThreshold: 20,
  },
  {
    id: 2,
    title: "Identifying dependencies",
    icon: Layers,
    description: "Mapping module relationships and imports.",
    progressThreshold: 40,
  },
  {
    id: 3,
    title: "Generating implementation steps",
    icon: Wand2,
    description: "Creating detailed action items for the plan.",
    progressThreshold: 60,
  },
  {
    id: 4,
    title: "Validating plan",
    icon: ShieldCheck,
    description: "Checking feasibility and completeness.",
    progressThreshold: 80,
  },
  {
    id: 5,
    title: "Finalizing",
    icon: Flag,
    description: "Preparing the final implementation plan.",
    progressThreshold: 100,
  },
];

const MOCK_PLAN = {
  add: [
    {
      id: "add-1",
      title: "Core Auth Infrastructure",
      files: [
        { path: "src/services/UserAuthService.ts", type: "Create" },
        { path: "src/types/auth.d.ts", type: "Create" },
      ],
      dependencies: ["jsonwebtoken", "bcryptjs", "@types/jsonwebtoken"],
      externalConnections: ["Redis (Session Cache)"],
      details:
        "Implement the centralized authentication service responsible for token issuance and password hashing.",
      context:
        "Security: Using HS256 algorithm for JWTs. Refresh tokens should be stored in Redis with an sliding expiration of 7 days.",
    },
    {
      id: "add-2",
      title: "Authentication Middleware",
      files: [{ path: "src/middleware/auth.ts", type: "Create" }],
      dependencies: ["express"],
      details:
        "Higher-order middleware to intercept requests and validate bearer tokens against the Redis blacklist.",
      context:
        "Performance: Middleware should implement a local cache for the public keys to reduce Redis hit frequency.",
    },
  ],
  modify: [
    {
      id: "mod-1",
      title: "API Gateway Refactor",
      files: [
        { path: "src/routes/api.ts", type: "Modify" },
        { path: "src/app.ts", type: "Modify" },
      ],
      dependencies: [],
      details:
        "Injecting the new auth middleware into the main route definition and updating error handlers.",
      context:
        "Note: Ensure CORS is updated prior to this deployment to avoid blocking preflight requests on auth endpoints.",
    },
  ],
  fix: [
    {
      id: "fix-1",
      title: "CORS Credentials Patch",
      files: [{ path: "src/config/cors.ts", type: "Modify" }],
      details:
        "Patching existing configuration to allow access-control-allow-credentials header for cross-domain cookie support.",
      context:
        "Security: Limit 'allowedOrigins' to specific production domains in env variables.",
    },
  ],
};

const Badge = ({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) => (
  <div className="flex items-center gap-1.5 px-2 py-0.5 border border-zinc-200 rounded text-xs font-medium text-zinc-500">
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </div>
);

interface FileItem {
  path: string;
  type: string;
}

interface PlanItem {
  id: string;
  files: FileItem[];
  dependencies?: string[];
  externalConnections?: string[];
  [key: string]: any;
}

interface Plan {
  add: PlanItem[];
  modify: PlanItem[];
  fix: PlanItem[];
  [key: string]: PlanItem[];
}

const PlanTabs = ({ plan }: { plan: Plan }) => {
  const [activeTab, setActiveTab] = useState("add");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = [
    { id: "add", label: "Create", count: plan.add.length },
    { id: "modify", label: "Update", count: plan.modify.length },
    { id: "fix", label: "Fix", count: plan.fix.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-zinc-100">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`px-4 py-2 text-xs font-semibold transition-all relative ${
              activeTab === cat.id
                ? "text-zinc-900"
                : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            {cat.label} ({cat.count})
            {activeTab === cat.id && (
              <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-zinc-900" />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {plan[activeTab].map((item) => (
          <div
            key={item.id}
            className={`bg-background border transition-all rounded-lg overflow-hidden ${
              expandedId === item.id
                ? "border-zinc-300 shadow-sm"
                : "border-zinc-200 hover:border-zinc-300"
            }`}
          >
            {/* Summary Row */}
            <div
              onClick={() =>
                setExpandedId(expandedId === item.id ? null : item.id)
              }
              className="p-4 flex justify-between items-start cursor-pointer select-none"
            >
              <div className="flex gap-3">
                <FileCode
                  className={`w-4 h-4 mt-0.5 flex-shrink-0 ${expandedId === item.id ? "text-zinc-900" : "text-zinc-400"}`}
                />
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-medium text-zinc-900 font-sans">
                      {item.title}
                    </h4>
                    {item.files?.length > 0 && (
                      <span className="text-xs font-medium px-1.5 py-0.5 bg-zinc-50 border border-zinc-100 rounded text-zinc-400 font-sans">
                        {item.files.length}{" "}
                        {item.files.length === 1 ? "File" : "Files"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed font-sans">
                    {item.details}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-zinc-300 transition-transform flex-shrink-0 mt-0.5 ${expandedId === item.id ? "rotate-180" : ""}`}
              />
            </div>

            {/* Detailed Content */}
            {expandedId === item.id && (
              <div className="px-11 pb-5 pt-2 space-y-5 animate-in fade-in slide-in-from-top-1 duration-200 border-t border-zinc-50 font-sans">
                {item.files?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                      Target Files
                    </p>
                    <div className="grid grid-cols-1 gap-1">
                      {item.files.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-1 border-b border-zinc-50 last:border-0"
                        >
                          <code className="text-xs font-mono text-zinc-600">
                            {file.path}
                          </code>
                          <span
                            className={`text-xs font-medium uppercase ${file.type === "Create" ? "text-emerald-500" : "text-blue-500"}`}
                          >
                            {file.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {((item.dependencies?.length ?? 0) > 0 ||
                  (item.externalConnections?.length ?? 0) > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(item.dependencies?.length ?? 0) > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Package className="w-3 h-3" /> Libraries
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {item.dependencies?.map((dep, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 bg-zinc-50 border border-zinc-100 rounded text-xs font-mono text-zinc-500"
                            >
                              {dep}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(item.externalConnections?.length ?? 0) > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Link2 className="w-3 h-3" /> External
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {item.externalConnections?.map((conn, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded text-xs font-medium text-blue-600"
                            >
                              {conn}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {item.context && (
                  <div className="bg-zinc-50 rounded p-3 border-l-2 border-zinc-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Info className="w-3 h-3 text-zinc-400" />
                      <span className="text-xs font-medium text-zinc-400 uppercase">
                        Context
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 leading-relaxed italic">
                      {item.context}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const PlanOverviewPage = () => {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.taskId as string;
  const repoBranchByTask = useSelector(
    (state: RootState) => state.RepoAndBranch.byTaskId
  );
  const storedRepoContext = taskId
    ? repoBranchByTask?.[taskId]
    : undefined;

  // Note: taskId in URL is actually recipeId now
  const recipeId = taskId;
  
  // Debug: Log recipeId to help diagnose "task not found" issues
  useEffect(() => {
    if (recipeId) {
      console.log("[Plan Overview] Recipe ID from URL:", recipeId);
    } else {
      console.warn("[Plan Overview] No recipe ID found in URL params. taskId:", taskId);
    }
  }, [recipeId, taskId]);
  
  const [mockTask, setMockTask] = useState<MockTaskResponse | null>(null);
  const [specOutput, setSpecOutput] = useState<SpecOutput | null>(null);
  const [specProgress, setSpecProgress] = useState<SpecStatusResponse | SpecPlanStatusResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [planProgress, setPlanProgress] = useState(0);
  const [isPlanExpanded, setIsPlanExpanded] = useState(true);
  const [isGenerating, setIsGenerating] = useState(true);
  const [isCancelled, setIsCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!storedRepoContext) return;
    setMockTask((prev) => {
      const repoName =
        storedRepoContext.repoName || prev?.repo || "Unknown Repository";
      const branchName =
        storedRepoContext.branchName || prev?.branch || "main";

      if (prev) {
        if (prev.repo === repoName && prev.branch === branchName) {
          return prev;
        }
        return {
          ...prev,
          repo: repoName,
          branch: branchName,
        };
      }

      if (!taskId) {
        return prev;
      }

      return {
        task_id: taskId,
        prompt: "",
        repo: repoName,
        branch: branchName,
        questions: [],
      };
    });
  }, [storedRepoContext, taskId]);

  // Fetch spec data from API
  useEffect(() => {
    if (!recipeId) return;

    const fetchSpecData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get spec progress from recipe codegen API
        let progress: SpecStatusResponse | SpecPlanStatusResponse;
        const storedSpecId = localStorage.getItem(`spec_${recipeId}`);
        
        if (storedSpecId) {
          progress = await SpecService.getSpecProgressBySpecId(storedSpecId);
        } else {
          progress = await SpecService.getSpecProgressByRecipeId(recipeId);
          
          // Store spec_id if available
          if ('spec_id' in progress && progress.spec_id) {
            localStorage.setItem(`spec_${recipeId}`, progress.spec_id);
          }
        }

        // Store progress for display
        setSpecProgress(progress);

        // Extract spec output
        if (progress.spec_output) {
          setSpecOutput(progress.spec_output);
          setIsGenerating(false);
          setIsPlanExpanded(false);
          setPlanProgress(100);
        } else {
          // If spec is not ready, show generating state
          const status = 'spec_gen_status' in progress 
            ? (progress as any).spec_gen_status 
            : (progress as any).spec_generation_step_status;
          
          const progressPercent = (progress as any).progress_percent ?? 0;
          setPlanProgress(progressPercent);
          
          if (status === 'COMPLETED') {
            setIsGenerating(false);
            setPlanProgress(100);
          } else if (status === 'IN_PROGRESS' || status === 'PENDING') {
            setIsGenerating(true);
          } else if (status === 'FAILED') {
            setIsGenerating(false);
            setError("Spec generation failed");
          }
        }

        // Get repo and branch info from localStorage or Redux
        const storedRecipeData = localStorage.getItem(`recipe_${recipeId}`);
        let repoName = "Unknown Repository";
        let branchName = "main";
        
        if (storedRecipeData) {
          try {
            const parsed = JSON.parse(storedRecipeData);
            repoName = parsed.repo_name || repoName;
            branchName = parsed.branch_name || branchName;
          } catch (e) {
            console.error("Error parsing stored recipe data:", e);
          }
        }

        // Set mockTask for display purposes (using real data)
        setMockTask({
          task_id: recipeId,
          prompt: "",
          repo: repoName,
          branch: branchName,
          questions: [],
        });

        // Try to get project_id to fetch questions/answers
        let projectId: string | null = null;
        if (storedRecipeData) {
          try {
            const parsed = JSON.parse(storedRecipeData);
            projectId = parsed.project_id;
          } catch (e) {
            // Ignore
          }
        }

        // Fetch questions and answers if project_id is available
        if (projectId) {
          try {
            const questionsData = await QuestionService.getQuestions(projectId);
            if (questionsData?.answers) {
              const answersMap: Record<string, string> = {};
              Object.entries(questionsData.answers).forEach(
                ([qId, ans]: [string, any]) => {
                  answersMap[qId] = ans.text_answer || ans.mcq_answer || "";
                }
              );
              setAnswers(answersMap);
            }
          } catch (e) {
            console.error("Error fetching questions:", e);
            // Non-critical, continue without questions
          }
        }

        setIsLoading(false);
      } catch (err: any) {
        console.warn("API call failed, using mock data for preview:", err.message);
        // Use mock data when API fails
        const mockSpecOutput: SpecOutput = MOCK_PLAN as unknown as SpecOutput;
        
        // Generate random repo and branch names for demo
        const mockRepos = ["my-awesome-project", "web-app", "api-server", "frontend-app", "backend-service"];
        const mockBranches = ["main", "develop", "feature/auth", "staging", "production"];
        const randomRepo = mockRepos[Math.floor(Math.random() * mockRepos.length)];
        const randomBranch = mockBranches[Math.floor(Math.random() * mockBranches.length)];
        
        // Set mock task data
        setMockTask({
          task_id: recipeId,
          prompt: "Build a comprehensive authentication system with JWT tokens, password hashing, and session management",
          repo: randomRepo,
          branch: randomBranch,
          questions: [
            {
              id: "q1",
              question: "Which authentication provider would you prefer?",
              type: "select",
              options: ["JWT", "OAuth2", "Session-based"],
            },
            {
              id: "q2",
              question: "Include password reset functionality?",
              type: "select",
              options: ["Yes", "No"],
            },
          ],
        });

        // Set mock answers
        setAnswers({
          q1: "JWT",
          q2: "Yes",
        });

        // Set mock spec output
        setSpecOutput(mockSpecOutput);
        setSpecProgress({
          recipe_id: recipeId,
          spec_id: `mock-spec-${recipeId}`,
          spec_gen_status: "COMPLETED",
          step_index: 5,
          progress_percent: 100,
          step_statuses: {},
          spec_output: mockSpecOutput,
        });
        setIsGenerating(false);
        setIsPlanExpanded(false);
        setPlanProgress(100);
        setIsLoading(false);
        setError(null);
      }
    };

    fetchSpecData();
  }, [recipeId]);

  // Auto-scroll to bottom when plan is generated
  useEffect(() => {
    if (planProgress >= 100 && planContentRef.current) {
      setTimeout(() => {
        planContentRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [planProgress]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <p className="text-gray-600">Loading plan overview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Error loading plan</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push("/idea")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Idea Page
          </button>
        </div>
      </div>
    );
  }

  // Check if recipeId is missing from URL (this should be checked first, before loading)
  if (!recipeId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Task not found</h2>
          <p className="text-gray-600 mb-6">
            The recipe ID was not found in the URL. Please start a new task.
          </p>
          <button
            onClick={() => router.push("/idea")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Idea Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-zinc-900 font-sans selection:bg-zinc-100 antialiased">
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex justify-between items-start mb-10">
          <h1 className="text-2xl font-bold text-zinc-900">Plan Spec</h1>
          {mockTask && (
            <div className="flex items-center gap-2">
              <Badge icon={Github}>{mockTask.repo}</Badge>
              <Badge icon={GitBranch}>{mockTask.branch}</Badge>
            </div>
          )}
        </div>
        {/* Project Briefing */}
        <section className="mb-8 pb-8 border-b border-zinc-100">
          <div className="space-y-6">
            <p className="text-base font-medium tracking-tight text-zinc-900 leading-relaxed">
              {mockTask?.prompt || "Implementation plan generation"}
            </p>

            {mockTask && mockTask.questions && mockTask.questions.length > 0 && (
              <div className="grid grid-cols-1 gap-6 pt-2">
                {/* Questions as Parameters */}
                {mockTask.questions
                  .filter((q) => answers[q.id])
                  .map((q) => (
                    <div key={q.id} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-zinc-300">
                          PARAM
                        </span>
                        <p className="text-sm font-bold text-zinc-500">
                          {q.question}
                        </p>
                      </div>
                      <div className="pl-14">
                        <p className="text-sm font-medium text-zinc-900">
                          {answers[q.id]}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>

        {/* Dynamic Progress Indicator */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-zinc-900" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-900 font-sans">
              Plan Specification
            </h2>
          </div>
          <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
            Plan spec is a granular specification of the user prompt and
            question. These represent the specific goals of the workflow. It
            also makes approximation on what libraries to use, files to modify
            and external services that might be used. Make sure that you review
            the goals of the workflow before your proceed.
          </p>
          <div className="bg-zinc-50/50 border border-zinc-100 rounded-xl overflow-hidden">
            <div
              onClick={() => setIsPlanExpanded(!isPlanExpanded)}
              role="button"
              tabIndex={0}
              className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-100/50 transition-colors border-b border-transparent"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  {isCancelled ? (
                    <X className="w-4 h-4 text-zinc-400" />
                  ) : planProgress >= 100 ? (
                    <Check className="w-4 h-4 text-zinc-900" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-zinc-900 animate-spin" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-zinc-900">
                    {isCancelled
                      ? "Stopped"
                      : planProgress >= 100
                        ? "Plan Ready"
                        : "Architecting System"}
                  </span>
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-tighter">
                    Status: {planProgress}% Compiled
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-zinc-300 transition-transform ${isPlanExpanded ? "" : "-rotate-90"}`}
              />
            </div>

            {isPlanExpanded && (
              <div className="relative px-4 py-8">
                {/* Connecting Vertical Line */}
                <div className="absolute left-8 top-8 bottom-8 w-[1px] bg-zinc-200" />

                <div className="space-y-8 relative">
                  {PLAN_CHAPTERS.map((step, idx) => {
                    const isDone = planProgress >= step.progressThreshold;
                    const isActive =
                      !isDone &&
                      (idx === 0 ||
                        planProgress >=
                          PLAN_CHAPTERS[idx - 1].progressThreshold);
                    const Icon = step.icon;

                    return (
                      <div
                        key={step.id}
                        className={`flex items-start gap-5 transition-all duration-300 ${!isDone && !isActive ? "opacity-30 grayscale" : "opacity-100"}`}
                      >
                        {/* Icon Node */}
                        <div
                          className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-500 bg-background ${
                            isDone
                              ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                              : isActive
                                ? "border-zinc-900 animate-pulse text-zinc-900"
                                : "border-zinc-200 text-zinc-300"
                          }`}
                        >
                          {isDone ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Icon className="w-3.5 h-3.5" />
                          )}
                        </div>

                        {/* Text Content */}
                        <div className="flex flex-col pt-0.5">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider ${isActive ? "text-zinc-900" : "text-zinc-500"}`}
                          >
                            {step.title}
                          </span>
                          <span className="text-xs text-zinc-400 mt-0.5 max-w-[240px]">
                            {step.description}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Implementation Output */}
        {specOutput && !isCancelled && (
          <section
            ref={planContentRef}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <PlanTabs plan={specOutput as unknown as Plan} />

            {/* Action Button */}
            <div className="mt-12 flex justify-end">
              <button
                onClick={() => {
                  // Navigate to plan page with recipeId
                  const params = new URLSearchParams();
                  params.set("recipeId", recipeId);
                  // Also include spec_id if available
                  const storedSpecId = localStorage.getItem(`spec_${recipeId}`);
                  if (storedSpecId) {
                    params.set("specId", storedSpecId);
                  }
                  router.push(`/plan?${params.toString()}`);
                }}
                className="px-6 py-2 bg-zinc-900 text-white rounded-lg font-medium text-sm hover:bg-zinc-800 transition-colors"
              >
                Generate Detailed Plan
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Floating Interaction Footer */}
    </div>
  );
};

export default PlanOverviewPage;
