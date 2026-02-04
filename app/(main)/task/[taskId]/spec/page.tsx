"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import SpecService from "@/services/SpecService";
import PlanService from "@/services/PlanService";
import { toast } from "sonner";
import specMockData from "@/lib/mock/specMock.json";

// Demo mode delay in milliseconds (35 seconds)
const DEMO_MODE_DELAY = 35000;
import {
  SpecPlanStatusResponse,
  SpecStatusResponse,
  SpecOutput,
  StepStatusValue,
} from "@/lib/types/spec";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/state/store";
import { setRepoAndBranchForTask } from "@/lib/state/Reducers/RepoAndBranch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SharedMarkdown } from "@/components/chat/SharedMarkdown";

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

const Badge = ({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) => (
  <div className="flex items-center gap-1.5 px-2 py-0.5 border border-[#D3E5E5] rounded text-xs font-medium text-primary-color">
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </div>
);

const PlanTabs = ({ plan }: { plan: Plan }) => {
  const [activeTab, setActiveTab] = useState("add");

  const categories = [
    { id: "add", label: "Create", count: plan.add.length },
    { id: "modify", label: "Update", count: plan.modify.length },
    { id: "fix", label: "Fix", count: plan.fix.length },
  ];

  // Get all item IDs for the active tab to set as default open values
  const defaultOpenValues = plan[activeTab].map((item) => item.id);

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-[#D3E5E5]">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`px-4 py-2 text-xs font-semibold transition-all relative ${
              activeTab === cat.id
                ? "text-primary-color"
                : "text-primary-color hover:text-primary-color"
            }`}
          >
            {cat.label} ({cat.count})
            {activeTab === cat.id && (
              <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary-color" />
            )}
          </button>
        ))}
      </div>

      <Accordion 
        key={activeTab}
        type="multiple" 
        defaultValue={defaultOpenValues} 
        className="space-y-4"
      >
        {plan[activeTab].map((item) => (
          <AccordionItem
            key={item.id}
            value={item.id}
            className="bg-background border border-[#D3E5E5] transition-all rounded-lg overflow-hidden data-[state=open]:border-[#D3E5E5] data-[state=open]:shadow-sm border-[#D3E5E5] hover:border-[#D3E5E5]"
          >
            <AccordionTrigger className="p-4 flex justify-between items-start cursor-pointer select-none hover:no-underline [&>svg]:hidden [&[data-state=open] svg:last-child]:rotate-180">
              <div className="flex gap-3 flex-1 min-w-0">
                <FileCode className="w-4 h-4 mt-1 flex-shrink-0 text-primary-color" />
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="text-sm font-semibold text-foreground font-sans leading-snug">
                      {item.title}
                    </h4>

                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed font-sans text-left [&_p]:my-2 [&_p]:leading-relaxed [&_p]:text-left [&_p]:text-muted-foreground">
                    <SharedMarkdown content={item.details} className="text-muted-foreground [&_p]:text-muted-foreground [&_*]:text-left" />
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 mt-1 ml-2">
                <ChevronDown className="w-4 h-4 text-primary-color transition-transform duration-200" />
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-5 pb-6 pt-5 space-y-6 border-t border-[#D3E5E5] font-sans">
              {/* Target Files */}
              {item.files?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-primary-color uppercase tracking-wide flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5" />
                    Target Files
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {item.files.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2.5 px-3 bg-zinc-50/50 border border-[#D3E5E5] rounded-md"
                      >
                        <code className="text-xs font-mono text-primary-color truncate pr-3">
                          {file.path}
                        </code>
                        <span
                          className={`text-xs font-medium uppercase shrink-0 ${file.type === "Create" ? "text-emerald-600" : "text-blue-600"}`}
                        >
                          {file.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Libraries & External Connections */}
              {((item.dependencies?.length ?? 0) > 0 || (item.externalConnections?.length ?? 0) > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  {/* Libraries */}
                  {(item.dependencies?.length ?? 0) > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-primary-color uppercase tracking-wide flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        Libraries
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {item.dependencies?.map((dep, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 bg-zinc-50 border border-[#D3E5E5] rounded-md text-xs font-mono text-primary-color"
                          >
                            {dep}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* External Connections */}
                  {(item.externalConnections?.length ?? 0) > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold  text-primary-color uppercase tracking-wide flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5" />
                        External
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {item.externalConnections?.map((conn, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md text-xs font-medium text-blue-600"
                          >
                            {conn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Context */}
              {item.context && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold mt-4 text-primary-color uppercase tracking-wide flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Context
                  </p>
                  <div className="bg-zinc-50 border border-[#D3E5E5] rounded-md p-4">
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      <SharedMarkdown content={item.context} className="text-muted-foreground [&_p]:text-muted-foreground [&_*]:text-left [&_p]:mb-2 [&_p:last-child]:mb-0" />
                    </div>
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

const SpecPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  // Note: taskId in URL is actually recipeId now
  const recipeId = params?.taskId as string;
  const isDemoMode = searchParams.get("showcase") === "1";
  const [demoDelayComplete, setDemoDelayComplete] = useState(!isDemoMode);
  const repoBranchByTask = useSelector(
    (state: RootState) => state.RepoAndBranch.byTaskId
  );
  const storedRepoContext = recipeId
    ? repoBranchByTask?.[recipeId]
    : undefined;
  
  // Reset initialization ref when recipeId changes
  useEffect(() => {
    hasInitializedRef.current = false;
  }, [recipeId]);

  const [recipeData, setRecipeData] = useState<{
    recipe_id: string;
    project_id: string;
    user_prompt: string;
  } | null>(null);

  const [projectData, setProjectData] = useState<{
    repo: string;
    branch: string;
    questions: Array<{ id: string; question: string }>;
  } | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [specProgress, setSpecProgress] = useState<SpecPlanStatusResponse | SpecStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlanExpanded, setIsPlanExpanded] = useState(true);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);

  const planContentRef = useRef<HTMLDivElement | null>(null);
  const hasInitializedRef = useRef(false);

  // Demo mode delay effect
  useEffect(() => {
    if (!isDemoMode) return;
    
    console.log("[Spec Page] Demo mode active - starting 35 second delay");
    const timer = setTimeout(() => {
      console.log("[Spec Page] Demo mode delay complete");
      setDemoDelayComplete(true);
    }, DEMO_MODE_DELAY);

    return () => clearTimeout(timer);
  }, [isDemoMode]);

  // Load mock data in demo mode after delay
  useEffect(() => {
    if (!isDemoMode || !demoDelayComplete || !recipeId) return;

    console.log("[Spec Page] Demo mode - loading mock data from specMock.json");
    
    // Mock recipe data for demo
    setRecipeData({
      recipe_id: recipeId,
      project_id: "demo-project-id",
      user_prompt: "Build an AI chat assistant that helps users with scheduling and booking management, integrated with the Cal.com platform.",
    });

    // Mock project data for demo
    setProjectData({
      repo: "cal.com",
      branch: "main",
      questions: [
        { id: "q1", question: "What is the primary use case for the AI?" },
        { id: "q2", question: "Where should the chat interface be located?" },
        { id: "q3", question: "Which LLM provider should be the default?" },
      ],
    });

    // Mock answers for demo
    setAnswers({
      q1: "Help users find a time to meet",
      q2: "Specific tab in Event Types",
      q3: "OpenAI",
    });

    // Use mock data from specMock.json with proper typing
    const mockSpecProgress: SpecStatusResponse = {
      recipe_id: specMockData.recipe_id,
      spec_id: specMockData.spec_id,
      spec_gen_status: specMockData.spec_gen_status as "COMPLETED" | "IN_PROGRESS" | "FAILED",
      step_index: specMockData.step_index,
      progress_percent: specMockData.progress_percent,
      step_statuses: Object.fromEntries(
        Object.entries(specMockData.step_statuses).map(([key, value]) => [
          key,
          { status: value.status as StepStatusValue, message: value.display_message }
        ])
      ),
      spec_output: specMockData.spec_output as SpecOutput,
    };

    setSpecProgress(mockSpecProgress);
    setIsLoading(false);
    setIsPlanExpanded(false);
    hasInitializedRef.current = true;
  }, [isDemoMode, demoDelayComplete, recipeId]);

  // Update projectData when storedRepoContext changes (from Redux)
  useEffect(() => {
    if (!storedRepoContext) return;
    setProjectData((prev) => {
      const repoName =
        storedRepoContext.repoName || prev?.repo || "Unknown Repository";
      const branchName =
        storedRepoContext.branchName || prev?.branch || "main";

      if (prev && prev.repo === repoName && prev.branch === branchName) {
        return prev;
      }

      return {
        repo: repoName,
        branch: branchName,
        questions: prev?.questions || [],
      };
    });
  }, [storedRepoContext]);

  // Fetch recipe details including repo and branch information
  useEffect(() => {
    const fetchRecipeDetails = async () => {
      if (!recipeId || isDemoMode) return;
      
      // Prevent multiple initializations
      if (hasInitializedRef.current) return;
      
      try {
        console.log("[Spec Page] Fetching recipe details for:", recipeId);
        
        // Fetch comprehensive recipe details from the API
        const recipeDetails = await SpecService.getRecipeDetails(recipeId);
        console.log("[Spec Page] Recipe details received:", recipeDetails);
        
        // Set recipe data
        setRecipeData({
          recipe_id: recipeDetails.recipe_id,
          project_id: recipeDetails.project_id,
          user_prompt: recipeDetails.user_prompt,
        });

        // Set project data with repo and branch
        const repoName = recipeDetails.repo_name || "Unknown Repository";
        const branchName = recipeDetails.branch_name || "main";
        
        setProjectData({
          repo: repoName,
          branch: branchName,
          questions: recipeDetails.questions_and_answers.map((qa) => ({
            id: qa.question_id,
            question: qa.question,
          })),
        });

        // Set answers
        const answersMap: Record<string, string> = {};
        recipeDetails.questions_and_answers.forEach((qa) => {
          if (qa.answer) {
            answersMap[qa.question_id] = qa.answer;
          }
        });
        setAnswers(answersMap);

        // Update Redux state
        dispatch(
          setRepoAndBranchForTask({
            taskId: recipeId,
            repoName: repoName,
            branchName: branchName,
            projectId: recipeDetails.project_id || undefined,
          })
        );
        
        hasInitializedRef.current = true;
      } catch (err: any) {
        console.error("[Spec Page] Failed to fetch recipe details:", err);
        // Set default values on error
        setRecipeData({
          recipe_id: recipeId,
          project_id: "",
          user_prompt: "Implementation plan generation",
        });
        setProjectData({
          repo: "Unknown Repository",
          branch: "main",
          questions: [],
        });
        hasInitializedRef.current = true;
      }
    };
    
    fetchRecipeDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId, isDemoMode]);

  // Poll for spec progress
  useEffect(() => {
    if (!recipeId || isDemoMode) return;
    if (hasInitializedRef.current) return;
    
    hasInitializedRef.current = true;
    
    let mounted = true;
    let interval: NodeJS.Timeout;

    const pollSpecProgress = async () => {
      try {
        console.log("[Spec Page] Starting to poll spec progress for recipeId:", recipeId);
        
        // Try to get spec_id from previous response if available
        // Otherwise use recipe_id
        let progress: SpecStatusResponse | SpecPlanStatusResponse;
        let currentSpecId: string | null = null;
        
        // Check if we have a spec_id stored
        const storedSpecId = localStorage.getItem(`spec_${recipeId}`);
        console.log("[Spec Page] Stored spec_id:", storedSpecId);
        
        if (storedSpecId) {
          currentSpecId = storedSpecId;
          console.log("[Spec Page] Using stored spec_id, calling getSpecProgressBySpecId");
          progress = await SpecService.getSpecProgressBySpecId(storedSpecId);
        } else {
          // Always use new recipe codegen endpoint - don't fall back to old endpoint
          console.log("[Spec Page] No stored spec_id, calling getSpecProgressByRecipeId");
          progress = await SpecService.getSpecProgressByRecipeId(recipeId);
          console.log("[Spec Page] Received progress response:", progress);
          
          // Store spec_id for future polling if available
          if ('spec_id' in progress && progress.spec_id) {
            currentSpecId = progress.spec_id;
            localStorage.setItem(`spec_${recipeId}`, progress.spec_id);
            console.log("[Spec Page] Stored spec_id:", currentSpecId);
          }
        }
        
        if (!mounted) return;

        setSpecProgress(progress);
        setError(null);
        setIsLoading(false);

        // Determine status based on response type
        const status = 'spec_gen_status' in progress 
          ? (progress as any).spec_gen_status 
          : (progress as any).spec_generation_step_status;

        // Stop polling when completed or failed
        if (status === 'COMPLETED' || status === 'FAILED') {
          if (interval) clearInterval(interval);
          if (status === 'COMPLETED') {
            setIsPlanExpanded(false);
          }
        } else {
          // Continue polling if in progress
          if (interval) clearInterval(interval);
          interval = setInterval(async () => {
            try {
              // Always check localStorage for the latest spec_id (in case it was updated)
              const latestSpecId = localStorage.getItem(`spec_${recipeId}`) || currentSpecId;
              
              let updated: SpecStatusResponse | SpecPlanStatusResponse;
              if (latestSpecId) {
                console.log("[Spec Page] Polling with spec_id:", latestSpecId);
                updated = await SpecService.getSpecProgressBySpecId(latestSpecId);
              } else {
                console.log("[Spec Page] Polling with recipeId:", recipeId);
                updated = await SpecService.getSpecProgressByRecipeId(recipeId);
                
                // Store spec_id if we got it from the response
                if ('spec_id' in updated && updated.spec_id) {
                  localStorage.setItem(`spec_${recipeId}`, updated.spec_id);
                  currentSpecId = updated.spec_id;
                  console.log("[Spec Page] Stored spec_id during polling:", currentSpecId);
                }
              }
              
              if (!mounted) return;
              
              console.log("[Spec Page] Updated progress:", updated);
              setSpecProgress(updated);
              
              const updatedStatus = 'spec_gen_status' in updated 
                ? (updated as any).spec_gen_status 
                : (updated as any).spec_generation_step_status;
              
              console.log("[Spec Page] Updated status:", updatedStatus);
              
              if (updatedStatus === 'COMPLETED' || updatedStatus === 'FAILED') {
                clearInterval(interval);
                if (updatedStatus === 'COMPLETED') {
                  setIsPlanExpanded(false);
                }
              }
            } catch (error) {
              console.error("[Spec Page] Error polling spec progress:", error);
              if (!mounted) return;
              // Don't clear interval on error - keep trying
            }
          }, 2000); // Poll every 2 seconds
        }
      } catch (err: any) {
        if (!mounted) return;
        console.error("Error fetching spec progress:", err);
        setError(err.message || "Failed to load spec progress");
        setIsLoading(false);
      }
    };
    
    pollSpecProgress();

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [recipeId, isDemoMode]);

  // Calculate progress from API response (support both old and new response formats)
  const planProgress = specProgress 
    ? (('progress_percent' in specProgress && specProgress.progress_percent !== null) 
        ? specProgress.progress_percent 
        : ('progress_percent' in specProgress ? specProgress.progress_percent : null)) ?? 0
    : 0;
  const status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PENDING' | null = specProgress 
    ? ('spec_gen_status' in specProgress 
        ? specProgress.spec_gen_status 
        : ('spec_generation_step_status' in specProgress 
            ? specProgress.spec_generation_step_status 
            : null))
    : null;
  const isGenerating = status === 'IN_PROGRESS' || status === 'PENDING';
  const currentStep = specProgress 
    ? (('step_index' in specProgress && specProgress.step_index !== null)
        ? specProgress.step_index
        : ('step_index' in specProgress ? specProgress.step_index : null)) ?? 0
    : 0;
  const stepStatuses: Record<string | number, { status: StepStatusValue; message: string }> | Record<number, { status: StepStatusValue; message: string }> | null = specProgress 
    ? ('step_statuses' in specProgress 
        ? (specProgress as any).step_statuses 
        : null) ?? {}
    : {};
  const specOutput: SpecOutput | null = specProgress?.spec_output ?? null;

  // Auto-scroll to bottom when plan is generated
  useEffect(() => {
    if (status === 'COMPLETED' && planContentRef.current) {
      setTimeout(() => {
        planContentRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [status]);

  if ((isLoading && !specProgress) || (isDemoMode && !demoDelayComplete)) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary-color" />
        <p className="ml-3 text-primary-color">
          {isDemoMode && !demoDelayComplete 
            ? "Generating plan specification..." 
            : "Loading spec generation..."}
        </p>
      </div>
    );
  }

  if (!recipeId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Recipe not found</h2>
          <p className="text-primary-color mb-6">
            The recipe ID was not found. Please start a new project.
          </p>
          <button
            onClick={() => router.push("/idea")}
            className="px-4 py-2 bg-primary-color text-accent-color rounded hover:opacity-90"
          >
            Create New Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-primary-color font-sans selection:bg-zinc-100 antialiased">
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs text-red-600 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Failed State */}
        {status === 'FAILED' && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <X className="w-5 h-5 text-red-600" />
              <h3 className="text-sm font-semibold text-red-900">
                Spec Generation Failed
              </h3>
            </div>
            <p className="text-sm text-red-700 mb-3">
              The spec generation process encountered an error. Please try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        <div className="flex justify-between items-start mb-10">
          <h1 className="text-2xl font-bold text-primary-color">Plan Spec</h1>
          {projectData && (
            <div className="flex items-center gap-2">
              <Badge icon={Github}>{projectData.repo}</Badge>
              <Badge icon={GitBranch}>{projectData.branch}</Badge>
            </div>
          )}
        </div>
        {/* Project Briefing */}
        <section className="mb-8 pb-8 border-b border-[#D3E5E5]">
          <div className="space-y-6">
            <p className="text-base font-medium tracking-tight text-primary-color leading-relaxed">
              {recipeData?.user_prompt || "Loading..."}
            </p>

            <div className="grid grid-cols-1 gap-6 pt-2">
              {/* Questions as Parameters */}
              {projectData?.questions
                .filter((q) => answers[q.id])
                .map((q) => (
                  <div key={q.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-primary-color">
                        PARAM
                      </span>
                      <p className="text-sm font-bold text-primary-color">
                        {q.question}
                      </p>
                    </div>
                    <div className="pl-14">
                      <p className="text-sm font-medium text-primary-color">
                        {answers[q.id]}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>

        {/* Dynamic Progress Indicator */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-primary-color" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-primary-color font-sans">
              Plan Specification
            </h2>
          </div>
          <p className="text-sm text-primary-color mb-6 leading-relaxed">
            Plan spec is a granular specification of the user prompt and
            question. These represent the specific goals of the workflow. It
            also makes approximation on what libraries to use, files to modify
            and external services that might be used. Make sure that you review
            the goals of the workflow before your proceed.
          </p>
          <div className="bg-zinc-50/50 border border-[#D3E5E5] rounded-xl overflow-hidden">
            <div
              onClick={() => setIsPlanExpanded(!isPlanExpanded)}
              role="button"
              tabIndex={0}
              className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-100/50 transition-colors border-b border-transparent"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  {isCancelled ? (
                    <X className="w-4 h-4 text-primary-color" />
                  ) : planProgress >= 100 ? (
                    <Check className="w-4 h-4 text-primary-color" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-primary-color animate-spin" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-primary-color">
                    {isCancelled
                      ? "Stopped"
                      : status === 'COMPLETED'
                        ? "Plan Ready"
                        : status === 'FAILED'
                          ? "Failed"
                          : "Architecting System"}
                  </span>
                  <span className="text-xs font-mono text-primary-color uppercase tracking-tighter">
                    Status: {planProgress}% Compiled
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-primary-color transition-transform ${isPlanExpanded ? "" : "-rotate-90"}`}
              />
            </div>

            {isPlanExpanded && (
              <div className="relative px-4 py-8">
                {/* Connecting Vertical Line */}
                <div className="absolute left-8 top-8 bottom-8 w-[1px] bg-[#D3E5E5]" />

                <div className="space-y-8 relative">
                  {PLAN_CHAPTERS.map((step, idx) => {
                    // Handle both old (Record<number, StepStatus>) and new (Record<string, StepStatus>) formats
                    const stepStatus = stepStatuses 
                      ? (typeof stepStatuses[idx] !== 'undefined' 
                          ? stepStatuses[idx] 
                          : (stepStatuses as any)[idx.toString()])
                      : undefined;
                    const isDone = stepStatus?.status === 'COMPLETED';
                    const isActive = stepStatus?.status === 'IN_PROGRESS';
                    const isFailed = stepStatus?.status === 'FAILED';
                    const Icon = step.icon;

                    return (
                      <div
                        key={step.id}
                        className={`flex items-start gap-5 transition-all duration-300 ${
                          !isDone && !isActive ? "opacity-30 grayscale" : "opacity-100"
                        }`}
                      >
                        {/* Icon Node */}
                        <div
                          className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-500 bg-background ${
                            isDone
                              ? "border-primary-color bg-primary-color text-accent-color shadow-sm"
                              : isActive
                                ? "border-primary-color animate-pulse text-primary-color"
                                : isFailed
                                  ? "border-red-500 bg-red-50 text-red-500"
                                  : "border-[#D3E5E5] text-primary-color"
                          }`}
                        >
                          {isDone ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : isFailed ? (
                            <X className="w-3.5 h-3.5" />
                          ) : (
                            <Icon className="w-3.5 h-3.5" />
                          )}
                        </div>

                        {/* Text Content */}
                        <div className="flex flex-col pt-0.5">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider ${
                              isActive ? "text-primary-color" : "text-primary-color"
                            }`}
                          >
                            {step.title}
                          </span>
                          <span className="text-xs text-primary-color mt-0.5 max-w-[240px]">
                            {stepStatus?.message || step.description}
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
          {status === 'COMPLETED' && 
           !isCancelled && 
           specOutput && (
            <section
              ref={planContentRef}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <PlanTabs plan={specOutput as unknown as Plan} />

              {/* Action Button */}
              <div className="mt-12 flex justify-end">
                <button
                  onClick={async () => {
                    if (isSubmittingPlan) return;
                    
                    setIsSubmittingPlan(true);
                    
                    // In demo mode, skip API call and navigate directly
                    if (isDemoMode) {
                      console.log("[Spec Page] Demo mode - skipping plan generation API call");
                      toast.success("Plan generation started successfully");
                      router.push(`/task/${recipeId}/plan?planId=demo-plan-id&showcase=1`);
                      return;
                    }
                    
                    try {
                      // Get spec_id from localStorage or from specProgress
                      const storedSpecId = localStorage.getItem(`spec_${recipeId}`);
                      const specId = storedSpecId || (specProgress && 'spec_id' in specProgress ? specProgress.spec_id : null);
                      
                      // Submit plan generation request
                      const response = await PlanService.submitPlanGeneration({
                        spec_id: specId || undefined,
                        recipe_id: specId ? undefined : recipeId,
                      });
                      
                      toast.success("Plan generation started successfully");
                      
                      // Navigate to plan page with planId
                      router.push(`/task/${recipeId}/plan?planId=${response.plan_id}${specId ? `&specId=${specId}` : ''}`);
                    } catch (error: any) {
                      console.error("Error submitting plan generation:", error);
                      toast.error(error.message || "Failed to start plan generation");
                      setIsSubmittingPlan(false);
                    }
                  }}
                  disabled={isSubmittingPlan}
                  className="px-6 py-2 bg-accent-color text-primary-color hover:opacity-90 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmittingPlan ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Starting Plan Generation...
                    </>
                  ) : (
                    "Generate Detailed Plan"
                  )}
                </button>
              </div>
            </section>
          )}
      </main>

      {/* Floating Interaction Footer */}
    </div>
  );
};

export default SpecPage;
