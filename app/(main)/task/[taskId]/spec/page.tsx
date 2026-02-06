"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Github,
  GitBranch,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
  X,
  Zap,
  FileText,
  Database,
  Shield,
  Layers,
  ExternalLink,
  BookOpen,
  Target,
} from "lucide-react";
import SpecService from "@/services/SpecService";
import PlanService from "@/services/PlanService";
import { toast } from "sonner";
import {
  SpecStatusResponse,
  SpecificationOutput,
  PlanStatusResponse,
} from "@/lib/types/spec";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/state/store";
import { setRepoAndBranchForTask } from "@/lib/state/Reducers/RepoAndBranch";
import { SharedMarkdown } from "@/components/chat/SharedMarkdown";

const Badge = ({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) => (
  <div className="flex items-center gap-1.5 px-2 py-0.5 border border-[#D3E5E5] rounded text-xs font-medium text-primary-color">
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </div>
);

/** Collapsible section for spec content */
const SpecSection = ({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = true 
}: { 
  title: string; 
  icon?: React.ComponentType<{ className?: string }>; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-[#D3E5E5] rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-primary-color" />}
          <h3 className="text-sm font-semibold text-primary-color">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-primary-color" />
        ) : (
          <ChevronRight className="w-4 h-4 text-primary-color" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-[#D3E5E5]">
          {children}
        </div>
      )}
    </div>
  );
};

/** Render any value - handles strings, arrays, objects gracefully */
const RenderValue = ({ value, depth = 0 }: { value: any; depth?: number }) => {
  if (value === null || value === undefined) return null;
  
  if (typeof value === "string") {
    // Check if it looks like markdown
    if (value.includes("\n") || value.includes("#") || value.includes("```") || value.includes("- ")) {
      return (
        <div className="prose prose-sm max-w-none text-primary-color [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-sm [&_code]:text-xs [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-zinc-50 [&_pre]:border [&_pre]:border-[#D3E5E5] [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:text-xs">
          <SharedMarkdown content={value} />
        </div>
      );
    }
    return <p className="text-sm text-primary-color leading-relaxed">{value}</p>;
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) return <p className="text-xs text-primary-color/50 italic">None</p>;
    
    return (
      <div className="space-y-3 mt-2">
        {value.map((item, idx) => (
          <div key={idx} className={`${depth === 0 ? 'p-3 bg-zinc-50/50 rounded-lg border border-[#D3E5E5]/50' : ''}`}>
            <RenderValue value={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }
  
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return <p className="text-xs text-primary-color/50 italic">None</p>;
    
    return (
      <div className="space-y-2 mt-1">
        {entries.map(([key, val]) => {
          const formattedKey = key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          
          return (
            <div key={key}>
              <span className="text-xs font-semibold text-primary-color/70 uppercase tracking-wide">
                {formattedKey}
              </span>
              <div className="ml-0 mt-0.5">
                <RenderValue value={val} depth={depth + 1} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  
  // Primitive values (number, boolean, etc.)
  return <p className="text-sm text-primary-color">{String(value)}</p>;
};

/** Render the structured specification */
const SpecificationView = ({ specification }: { specification: SpecificationOutput }) => {
  // Define the section mapping with icons and display names
  const sectionConfig: Array<{
    key: keyof SpecificationOutput;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    defaultOpen?: boolean;
  }> = [
    { key: "tl_dr", title: "Executive Summary (TL;DR)", icon: BookOpen, defaultOpen: true },
    { key: "context", title: "Context", icon: Layers, defaultOpen: true },
    { key: "success_metrics", title: "Success Metrics", icon: Target, defaultOpen: true },
    { key: "functional_requirements", title: "Functional Requirements", icon: FileText, defaultOpen: true },
    { key: "non_functional_requirements", title: "Non-Functional Requirements", icon: Shield, defaultOpen: false },
    { key: "architectural_decisions", title: "Architectural Decisions", icon: Layers, defaultOpen: true },
    { key: "data_models", title: "Data Models", icon: Database, defaultOpen: false },
    { key: "interfaces", title: "Interfaces", icon: ExternalLink, defaultOpen: false },
    { key: "external_dependencies_summary", title: "External Dependencies", icon: ExternalLink, defaultOpen: false },
  ];
  
  // Also collect any extra keys not in the predefined list
  const knownKeys = new Set(sectionConfig.map(s => s.key));
  const extraKeys = Object.keys(specification).filter(k => !knownKeys.has(k as keyof SpecificationOutput));

  return (
    <div className="space-y-2">
      {sectionConfig.map(({ key, title, icon, defaultOpen }) => {
        const value = specification[key];
        if (value === null || value === undefined) return null;
        // Skip empty arrays
        if (Array.isArray(value) && value.length === 0) return null;
        // Skip empty objects
        if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return null;
        
        return (
          <SpecSection key={key} title={title} icon={icon} defaultOpen={defaultOpen}>
            <div className="pt-3">
              <RenderValue value={value} />
            </div>
          </SpecSection>
        );
      })}
      
      {/* Render any extra/unknown sections */}
      {extraKeys.map((key) => {
        const value = specification[key];
        if (value === null || value === undefined) return null;
        if (Array.isArray(value) && value.length === 0) return null;
        
        const title = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        
        return (
          <SpecSection key={key} title={title} icon={FileText} defaultOpen={false}>
            <div className="pt-3">
              <RenderValue value={value} />
            </div>
          </SpecSection>
        );
      })}
    </div>
  );
};

const SpecPage = () => {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  // Note: taskId in URL is actually recipeId now
  const recipeId = params?.taskId as string;
  const repoBranchByTask = useSelector(
    (state: RootState) => state.RepoAndBranch.byTaskId
  );
  const storedRepoContext = recipeId
    ? repoBranchByTask?.[recipeId]
    : undefined;
  
  // Reset initialization ref when recipeId changes
  useEffect(() => {
    hasInitializedRef.current = false;
    hasStartedPollingRef.current = false;
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
  const [specProgress, setSpecProgress] = useState<SpecStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProgressExpanded, setIsProgressExpanded] = useState(true);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);
  const [planStatus, setPlanStatus] = useState<PlanStatusResponse | null>(null);
  const [isLoadingPlanStatus, setIsLoadingPlanStatus] = useState(false);

  const specContentRef = useRef<HTMLDivElement | null>(null);
  const hasInitializedRef = useRef(false);
  const hasStartedPollingRef = useRef(false);

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
      if (!recipeId) return;
      
      // Prevent multiple initializations
      if (hasInitializedRef.current) return;
      
      try {
        console.log("[Spec Page] Fetching recipe details for:", recipeId);
        
        // Try to fetch recipe details - may not exist in new API
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
        
        // Try to load from localStorage
        try {
          const stored = localStorage.getItem(`recipe_${recipeId}`);
          if (stored) {
            const recipeInfo = JSON.parse(stored);
            setRecipeData({
              recipe_id: recipeId,
              project_id: recipeInfo.project_id || "",
              user_prompt: recipeInfo.user_prompt || "Implementation plan generation",
            });
            setProjectData({
              repo: recipeInfo.repo_name || "Unknown Repository",
              branch: recipeInfo.branch_name || "main",
              questions: [],
            });
          } else {
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
          }
        } catch {
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
        }
        hasInitializedRef.current = true;
      }
    };
    
    fetchRecipeDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId]);

  /**
   * Helper: safely extract the specification from API response.
   * Handles cases where the API may return specification as a JSON string.
   */
  const extractSpecification = (response: SpecStatusResponse): SpecStatusResponse => {
    if (!response.specification) return response;
    
    // If specification is a string (double-serialized JSON), parse it
    if (typeof response.specification === "string") {
      try {
        console.log("[Spec Page] specification is a string, attempting JSON parse...");
        const parsed = JSON.parse(response.specification as unknown as string);
        return { ...response, specification: parsed };
      } catch {
        console.warn("[Spec Page] Failed to parse specification string, using as-is");
      }
    }
    
    return response;
  };

  /**
   * Helper: retry fetching spec until specification is non-null.
   * Per the updated API contract, when status is "completed", specification should be present.
   * However, we retry as a safety measure for network issues or edge cases.
   */
  const fetchSpecWithRetries = async (
    recipeId: string,
    maxRetries: number = 5,
    delayMs: number = 2000,
  ): Promise<SpecStatusResponse> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[Spec Page] Fetching specification (attempt ${attempt}/${maxRetries})...`);
      const progress = extractSpecification(
        await SpecService.getSpecProgressByRecipeId(recipeId)
      );
      console.log(`[Spec Page] Attempt ${attempt} - specification:`, progress.specification ? "present" : "null");
      
      if (progress.specification) {
        return progress;
      }
      
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    
    // Return last response even if specification is null
    console.warn("[Spec Page] Exhausted retries, specification still null");
    return extractSpecification(
      await SpecService.getSpecProgressByRecipeId(recipeId)
    );
  };

  // Poll for spec progress using GET /api/v1/recipes/{recipe_id}/spec
  useEffect(() => {
    if (!recipeId) return;
    if (hasStartedPollingRef.current) return;
    
    hasStartedPollingRef.current = true;
    
    let mounted = true;
    let interval: NodeJS.Timeout;

    const pollSpecProgress = async () => {
      try {
        console.log("[Spec Page] Starting to poll spec progress for recipeId:", recipeId);
        
        // Initial fetch
        let progress = extractSpecification(
          await SpecService.getSpecProgressByRecipeId(recipeId)
        );
        
        if (!mounted) return;

        console.log("[Spec Page] Initial progress:", {
          generation_status: progress.generation_status,
          has_specification: !!progress.specification,
          specification_type: typeof progress.specification,
          raw_response: progress,
        });

        setSpecProgress(progress);
        setError(null);
        setIsLoading(false);

        const currentStatus = progress.generation_status;

        // If completed, ensure specification is loaded (retry with delay as safety measure)
        if (currentStatus === 'completed') {
          if (!progress.specification) {
            console.warn("[Spec Page] Completed but specification is null (unexpected), retrying...");
            const retryProgress = await fetchSpecWithRetries(recipeId);
            if (mounted) {
              setSpecProgress(retryProgress);
            }
          }
          setIsProgressExpanded(false);
          return;
        }

        // If failed, stop polling
        if (currentStatus === 'failed') {
          return;
        }

        // Continue polling for pending/processing/not_started
        interval = setInterval(async () => {
          try {
            const updated = extractSpecification(
              await SpecService.getSpecProgressByRecipeId(recipeId)
            );
            
            if (!mounted) return;
            
            console.log("[Spec Page] Poll update:", {
              generation_status: updated.generation_status,
              has_specification: !!updated.specification,
            });
            setSpecProgress(updated);
            
            const updatedStatus = updated.generation_status;
            
            if (updatedStatus === 'completed') {
              clearInterval(interval);
              
              // If specification is null, retry with delay (safety measure)
              if (!updated.specification) {
                console.warn("[Spec Page] Completed but specification null (unexpected), retrying...");
                const finalProgress = await fetchSpecWithRetries(recipeId);
                if (mounted) {
                  setSpecProgress(finalProgress);
                }
              }
              
              setIsProgressExpanded(false);
            } else if (updatedStatus === 'failed') {
              clearInterval(interval);
            }
          } catch (pollError) {
            console.error("[Spec Page] Error polling spec progress:", pollError);
            // Don't clear interval on error - keep trying
          }
        }, 5000); // Poll every 5 seconds per API contract
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
  }, [recipeId]);

  // Derive status and progress from API response
  const generationStatus = specProgress?.generation_status ?? null;
  const isGenerating = generationStatus === 'processing' || generationStatus === 'pending' || generationStatus === 'not_started';
  const errorMessage = specProgress?.error_message ?? null;
  
  // Extract specification, handling possible string serialization
  const specification: SpecificationOutput | null = (() => {
    const raw = specProgress?.specification;
    if (!raw) return null;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return raw;
  })();

  // Compute a visual progress percentage from generation_status
  const progressPercentage = (() => {
    switch (generationStatus) {
      case 'not_started': return 0;
      case 'pending': return 15;
      case 'processing': return 50;
      case 'completed': return 100;
      case 'failed': return 0;
      default: return 0;
    }
  })();

  // Auto-scroll to spec content when generation completes
  useEffect(() => {
    if (generationStatus === 'completed' && specContentRef.current) {
      setTimeout(() => {
        specContentRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [generationStatus]);

  // Poll for plan status when spec is completed
  useEffect(() => {
    if (!recipeId) return;
    if (generationStatus !== 'completed') return;

    let mounted = true;
    let interval: NodeJS.Timeout;

    const checkPlanStatus = async () => {
      try {
        setIsLoadingPlanStatus(true);
        const status = await PlanService.getPlanStatusByRecipeId(recipeId);
        if (!mounted) return;

        setPlanStatus(status);
        setIsLoadingPlanStatus(false);

        // Stop polling if plan is completed or failed
        if (status.generation_status === 'completed' || status.generation_status === 'failed') {
          if (interval) clearInterval(interval);
        }
      } catch (err) {
        console.error('[Spec Page] Error checking plan status:', err);
        if (mounted) {
          setIsLoadingPlanStatus(false);
        }
      }
    };

    // Initial check
    checkPlanStatus();

    // Poll every 5 seconds if plan is pending/processing
    interval = setInterval(() => {
      if (planStatus?.generation_status === 'pending' || planStatus?.generation_status === 'processing' || !planStatus) {
        checkPlanStatus();
      }
    }, 5000);

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [recipeId, generationStatus]);

  if (isLoading && !specProgress) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary-color" />
        <p className="ml-3 text-primary-color">
          Loading spec generation...
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
        {generationStatus === 'failed' && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <X className="w-5 h-5 text-red-600" />
              <h3 className="text-sm font-semibold text-red-900">
                Spec Generation Failed
              </h3>
            </div>
            <p className="text-sm text-red-700 mb-3">
              {errorMessage || "The spec generation process encountered an error. Please try again."}
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

        {/* Progress Indicator */}
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
            the goals of the workflow before you proceed.
          </p>
          <div className="bg-zinc-50/50 border border-[#D3E5E5] rounded-xl overflow-hidden">
            <div
              onClick={() => setIsProgressExpanded(!isProgressExpanded)}
              role="button"
              tabIndex={0}
              className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-100/50 transition-colors border-b border-transparent"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  {isCancelled ? (
                    <X className="w-4 h-4 text-primary-color" />
                  ) : generationStatus === 'completed' ? (
                    <Check className="w-4 h-4 text-primary-color" />
                  ) : generationStatus === 'failed' ? (
                    <X className="w-4 h-4 text-red-500" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-primary-color animate-spin" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-primary-color">
                    {isCancelled
                      ? "Stopped"
                      : generationStatus === 'completed'
                        ? "Spec Ready"
                        : generationStatus === 'failed'
                          ? "Failed"
                          : "Generating Spec..."}
                  </span>
                  <span className="text-xs font-mono text-primary-color uppercase tracking-tighter">
                    Status: {generationStatus || "waiting"}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-primary-color transition-transform ${isProgressExpanded ? "" : "-rotate-90"}`}
              />
            </div>

            {isProgressExpanded && (
              <div className="px-4 py-6">
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="w-full bg-zinc-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        generationStatus === 'failed' ? 'bg-red-500' : generationStatus === 'completed' ? 'bg-emerald-500' : 'bg-primary-color'
                      }`}
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-primary-color">
                    <span>
                      {generationStatus === 'not_started' && "Waiting to start..."}
                      {generationStatus === 'pending' && "Queued for generation..."}
                      {generationStatus === 'processing' && "Generating specification..."}
                      {generationStatus === 'completed' && "Specification complete!"}
                      {generationStatus === 'failed' && (errorMessage || "Generation failed")}
                    </span>
                    <span>{progressPercentage}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Spec completed but specification still loading */}
        {generationStatus === 'completed' && 
         !isCancelled && 
         !specification && (
          <section className="mb-8 p-6 bg-zinc-50/50 border border-[#D3E5E5] rounded-xl">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary-color" />
              <div>
                <p className="text-sm font-medium text-primary-color">
                  Spec generation completed — loading specification data...
                </p>
                <p className="text-xs text-primary-color/60 mt-1">
                  The specification is being prepared. This page will update automatically.
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  const progress = await SpecService.getSpecProgressByRecipeId(recipeId);
                  console.log("[Spec Page] Manual refresh - specification:", progress.specification ? "present" : "null", progress);
                  setSpecProgress(
                    typeof progress.specification === "string"
                      ? { ...progress, specification: JSON.parse(progress.specification as unknown as string) }
                      : progress
                  );
                } catch (e) {
                  console.error("[Spec Page] Manual refresh failed:", e);
                }
              }}
              className="mt-3 text-xs text-primary-color underline hover:opacity-70"
            >
              Refresh now
            </button>
          </section>
        )}

        {/* Spec Document Output */}
        {generationStatus === 'completed' && 
         !isCancelled && 
         specification && (
          <section
            ref={specContentRef}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-primary-color" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-primary-color font-sans">
                Generated Specification
              </h2>
            </div>
            
            {/* Render structured specification or fallback to raw display */}
            <div className="mb-8">
              {typeof specification === "object" && specification !== null && Object.keys(specification).length > 0 ? (
                <SpecificationView specification={specification} />
              ) : (
                <div className="p-4 bg-zinc-50 border border-[#D3E5E5] rounded-xl">
                  <p className="text-xs text-primary-color/50 mb-2 font-mono uppercase">Raw Specification Data</p>
                  <pre className="text-xs text-primary-color whitespace-pre-wrap overflow-auto max-h-[600px]">
                    {JSON.stringify(specification, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Spec metadata */}
            {specProgress && (
              <div className="flex items-center gap-4 text-xs text-primary-color/60 mb-6">
                {specProgress.recipe_id && (
                  <span>Recipe ID: <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs">{specProgress.recipe_id}</code></span>
                )}
                {specProgress.generated_at && (
                  <span>Generated: {new Date(specProgress.generated_at).toLocaleString()}</span>
                )}
              </div>
            )}

            {/* Action Button */}
            <div className="mt-12 flex justify-end">
              {(() => {
                // Determine button state based on plan status
                const hasPlanGenerating = planStatus?.generation_status === 'processing' || planStatus?.generation_status === 'pending';
                const hasPlanCompleted = planStatus?.generation_status === 'completed';
                const hasPlanFailed = planStatus?.generation_status === 'failed';

                if (hasPlanGenerating) {
                  return (
                    <button
                      onClick={() => router.push(`/task/${recipeId}/plan`)}
                      className="px-6 py-2 bg-accent-color/80 text-primary-color hover:opacity-90 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                    >
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Plan Generating... View Progress
                    </button>
                  );
                }

                if (hasPlanCompleted) {
                  return (
                    <button
                      onClick={() => router.push(`/task/${recipeId}/plan`)}
                      className="px-6 py-2 bg-green-600 text-white hover:opacity-90 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      View Generated Plan
                    </button>
                  );
                }

                return (
                  <button
                    onClick={async () => {
                      if (isSubmittingPlan) return;

                      setIsSubmittingPlan(true);

                      try {
                        // Submit plan generation request using recipe_id
                        await PlanService.submitPlanGeneration({
                          recipe_id: recipeId,
                        });

                        toast.success("Plan generation started successfully");

                        // Navigate to plan page (recipeId is the taskId in URL)
                        router.push(`/task/${recipeId}/plan`);
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
                );
              })()}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default SpecPage;
