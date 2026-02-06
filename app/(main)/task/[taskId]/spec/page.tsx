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
  Zap,
  FileText,
} from "lucide-react";
import SpecService from "@/services/SpecService";
import PlanService from "@/services/PlanService";
import { toast } from "sonner";
import {
  SpecStatusResponse,
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
  }, [recipeId]);

  // Poll for spec progress
  useEffect(() => {
    if (!recipeId) return;
    if (hasStartedPollingRef.current) return;
    
    hasStartedPollingRef.current = true;
    
    let mounted = true;
    let interval: NodeJS.Timeout;

    const pollSpecProgress = async () => {
      try {
        console.log("[Spec Page] Starting to poll spec progress for recipeId:", recipeId);
        
        let progress: SpecStatusResponse;
        let currentSpecId: string | null = null;
        
        // Check if we have a spec_id stored (set by repo page after submitting)
        const storedSpecId = localStorage.getItem(`spec_${recipeId}`);
        console.log("[Spec Page] Stored spec_id:", storedSpecId);
        
        if (storedSpecId) {
          currentSpecId = storedSpecId;
          console.log("[Spec Page] Using stored spec_id, calling getSpecProgressBySpecId");
          progress = await SpecService.getSpecProgressBySpecId(storedSpecId);
        } else {
          console.log("[Spec Page] No stored spec_id, calling getSpecProgressByRecipeId");
          progress = await SpecService.getSpecProgressByRecipeId(recipeId);
          console.log("[Spec Page] Received progress response:", progress);
          
          // Store spec_id for future polling if available
          if (progress.spec_id) {
            currentSpecId = progress.spec_id;
            localStorage.setItem(`spec_${recipeId}`, progress.spec_id);
            console.log("[Spec Page] Stored spec_id:", currentSpecId);
          }
        }
        
        if (!mounted) return;

        setSpecProgress(progress);
        setError(null);
        setIsLoading(false);

        const currentStatus = progress.status;

        // Stop polling when completed or failed
        if (currentStatus === 'COMPLETED' || currentStatus === 'FAILED') {
          if (interval) clearInterval(interval);
          if (currentStatus === 'COMPLETED') {
            setIsProgressExpanded(false);
          }
        } else {
          // Continue polling if in progress
          if (interval) clearInterval(interval);
          interval = setInterval(async () => {
            try {
              const latestSpecId = localStorage.getItem(`spec_${recipeId}`) || currentSpecId;
              
              let updated: SpecStatusResponse;
              if (latestSpecId) {
                console.log("[Spec Page] Polling with spec_id:", latestSpecId);
                updated = await SpecService.getSpecProgressBySpecId(latestSpecId);
              } else {
                console.log("[Spec Page] Polling with recipeId:", recipeId);
                updated = await SpecService.getSpecProgressByRecipeId(recipeId);
                
                // Store spec_id if we got it from the response
                if (updated.spec_id) {
                  localStorage.setItem(`spec_${recipeId}`, updated.spec_id);
                  currentSpecId = updated.spec_id;
                  console.log("[Spec Page] Stored spec_id during polling:", currentSpecId);
                }
              }
              
              if (!mounted) return;
              
              console.log("[Spec Page] Updated progress:", updated);
              setSpecProgress(updated);
              
              const updatedStatus = updated.status;
              console.log("[Spec Page] Updated status:", updatedStatus);
              
              if (updatedStatus === 'COMPLETED' || updatedStatus === 'FAILED') {
                clearInterval(interval);
                if (updatedStatus === 'COMPLETED') {
                  setIsProgressExpanded(false);
                }
              }
            } catch (pollError) {
              console.error("[Spec Page] Error polling spec progress:", pollError);
              if (!mounted) return;
              // Don't clear interval on error - keep trying
            }
          }, 3000); // Poll every 3 seconds
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
  }, [recipeId]);

  // Derive status and progress from API response
  const status = specProgress?.status ?? null;
  const progressPercentage = specProgress?.progress_percentage ?? 0;
  const isGenerating = status === 'IN_PROGRESS' || status === 'PENDING';
  const specDocument = specProgress?.spec_document ?? null;
  const errorMessage = specProgress?.error_message ?? null;

  // Auto-scroll to spec content when generation completes
  useEffect(() => {
    if (status === 'COMPLETED' && specContentRef.current) {
      setTimeout(() => {
        specContentRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [status]);

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
        {status === 'FAILED' && (
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
                  ) : status === 'COMPLETED' ? (
                    <Check className="w-4 h-4 text-primary-color" />
                  ) : status === 'FAILED' ? (
                    <X className="w-4 h-4 text-red-500" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-primary-color animate-spin" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-primary-color">
                    {isCancelled
                      ? "Stopped"
                      : status === 'COMPLETED'
                        ? "Spec Ready"
                        : status === 'FAILED'
                          ? "Failed"
                          : "Generating Spec..."}
                  </span>
                  <span className="text-xs font-mono text-primary-color uppercase tracking-tighter">
                    Status: {progressPercentage}% Complete
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
                        status === 'FAILED' ? 'bg-red-500' : status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-primary-color'
                      }`}
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-primary-color">
                    <span>
                      {status === 'PENDING' && "Waiting to start..."}
                      {status === 'IN_PROGRESS' && "Generating specification..."}
                      {status === 'COMPLETED' && "Specification complete!"}
                      {status === 'FAILED' && (errorMessage || "Generation failed")}
                    </span>
                    <span>{progressPercentage}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Spec Document Output */}
        {status === 'COMPLETED' && 
         !isCancelled && 
         specDocument && (
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
            
            <div className="bg-background border border-[#D3E5E5] rounded-xl p-6 mb-8">
              <div className="prose prose-sm max-w-none text-primary-color [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_p]:leading-relaxed [&_p]:mb-3 [&_ul]:mb-3 [&_ol]:mb-3 [&_li]:mb-1 [&_code]:text-xs [&_code]:bg-zinc-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-zinc-50 [&_pre]:border [&_pre]:border-[#D3E5E5] [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:mb-4 [&_pre]:overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-[#D3E5E5] [&_th]:px-3 [&_th]:py-2 [&_th]:bg-zinc-50 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_td]:border [&_td]:border-[#D3E5E5] [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_blockquote]:border-l-4 [&_blockquote]:border-[#D3E5E5] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-primary-color/70 [&_hr]:border-[#D3E5E5] [&_hr]:my-6">
                <SharedMarkdown content={specDocument} />
              </div>
            </div>

            {/* Spec metadata */}
            {specProgress && (
              <div className="flex items-center gap-4 text-xs text-primary-color/60 mb-6">
                {specProgress.spec_id && (
                  <span>Spec ID: <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs">{specProgress.spec_id}</code></span>
                )}
                {specProgress.created_at && (
                  <span>Created: {new Date(specProgress.created_at).toLocaleString()}</span>
                )}
                {specProgress.updated_at && (
                  <span>Updated: {new Date(specProgress.updated_at).toLocaleString()}</span>
                )}
              </div>
            )}

            {/* Action Button */}
            <div className="mt-12 flex justify-end">
              <button
                onClick={async () => {
                  if (isSubmittingPlan) return;
                  
                  setIsSubmittingPlan(true);
                  
                  try {
                    // Get spec_id from localStorage or from specProgress
                    const storedSpecId = localStorage.getItem(`spec_${recipeId}`);
                    const specId = storedSpecId || specProgress?.spec_id || null;
                    
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
    </div>
  );
};

export default SpecPage;
