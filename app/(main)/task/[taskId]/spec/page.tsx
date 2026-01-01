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
import SpecService from "@/services/SpecService";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import QuestionService from "@/services/QuestionService";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import {
  SpecPlanStatusResponse,
  SpecOutput,
  StepStatusValue,
} from "@/lib/types/spec";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/state/store";
import { setRepoAndBranchForTask } from "@/lib/state/Reducers/RepoAndBranch";

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


const Badge = ({ children, icon: Icon }) => (
  <div className="flex items-center gap-1.5 px-2 py-0.5 border border-zinc-200 rounded text-xs font-medium text-zinc-500">
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </div>
);

const PlanTabs = ({ plan }) => {
  const [activeTab, setActiveTab] = useState("add");
  const [expandedId, setExpandedId] = useState(null);

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
            className={`bg-white border transition-all rounded-lg overflow-hidden ${
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

                {(item.dependencies?.length > 0 ||
                  item.externalConnections?.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {item.dependencies?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Package className="w-3 h-3" /> Libraries
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {item.dependencies.map((dep, i) => (
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
                    {item.externalConnections?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Link2 className="w-3 h-3" /> External
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {item.externalConnections.map((conn, i) => (
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
  const [specProgress, setSpecProgress] = useState<SpecPlanStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlanExpanded, setIsPlanExpanded] = useState(true);
  const [isCancelled, setIsCancelled] = useState(false);

  const planContentRef = useRef(null);
  const hasInitializedRef = useRef(false);

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

  // Fetch recipe and project data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!recipeId) return;
      
      // Prevent multiple initializations
      if (hasInitializedRef.current) return;
      
      try {
        const headers = await getHeaders();
        
        // Try to get project_id from recipe creation response stored in localStorage
        // (We store it when creating recipe in repo page)
        let projectId: string | null = null;
        let storedRepoName: string | null = null;
        let storedBranchName: string | null = null;
        try {
          const storedRecipeData = localStorage.getItem(`recipe_${recipeId}`);
          if (storedRecipeData) {
            const parsed = JSON.parse(storedRecipeData);
            projectId = parsed.project_id;
            storedRepoName = parsed.repo_name || null;
            storedBranchName = parsed.branch_name || null;
          }
        } catch {
          // Ignore localStorage errors
        }

        // Get current Redux state to check if we need to dispatch
        const currentRepoContext = repoBranchByTask?.[recipeId];
        const needsDispatch = !currentRepoContext || 
          currentRepoContext.repoName !== (storedRepoName || storedRepoContext?.repoName) ||
          currentRepoContext.branchName !== (storedBranchName || storedRepoContext?.branchName);

        if (storedRepoName || storedBranchName) {
          setProjectData((prev) => {
            const repoName =
              storedRepoName ||
              storedRepoContext?.repoName ||
              prev?.repo ||
              "Unknown Repository";
            const branchName =
              storedBranchName ||
              storedRepoContext?.branchName ||
              prev?.branch ||
              "main";

            if (prev && prev.repo === repoName && prev.branch === branchName) {
              return prev;
            }

            return {
              repo: repoName,
              branch: branchName,
              questions: prev?.questions || [],
            };
          });

          const repoForStore =
            storedRepoName ||
            storedRepoContext?.repoName ||
            undefined;
          const branchForStore =
            storedBranchName ||
            storedRepoContext?.branchName ||
            undefined;

          // Only dispatch if values are different from what's already in Redux
          if (recipeId && needsDispatch && (repoForStore || branchForStore)) {
            dispatch(
              setRepoAndBranchForTask({
                taskId: recipeId,
                repoName: repoForStore || "Unknown Repository",
                branchName: branchForStore || "main",
                projectId: projectId || undefined,
              })
            );
          }
        }

        // If we have project_id, fetch project details
        if (projectId) {
          try {
            const projects = await BranchAndRepositoryService.getUserProjects();
            const project = Array.isArray(projects) 
              ? projects.find((p: any) => p.id === projectId)
              : null;
            
            if (project) {
              const repoCandidate =
                project.repo_name ||
                storedRepoContext?.repoName ||
                storedRepoName ||
                "";
              const branchCandidate =
                project.branch_name ||
                storedRepoContext?.branchName ||
                storedBranchName ||
                "";
              let promptRepoName = "Unknown Repository";

              setProjectData((prev) => {
                const repoValue =
                  repoCandidate || prev?.repo || "Unknown Repository";
                const branchValue =
                  branchCandidate || prev?.branch || "main";
                promptRepoName = repoValue;
                return {
                  repo: repoValue,
                  branch: branchValue,
                  questions: prev?.questions || [],
                };
              });
              
              // Update recipe data with project info
              setRecipeData(prev => prev ? {
                ...prev,
                user_prompt: `Implementation plan for ${promptRepoName}`,
              } : null);

              // Only dispatch if values are different from what's already in Redux
              const currentRepoContext = repoBranchByTask?.[recipeId];
              const needsUpdate = !currentRepoContext ||
                currentRepoContext.repoName !== promptRepoName ||
                currentRepoContext.branchName !== (branchCandidate || storedBranchName || storedRepoContext?.branchName || "main");
              
              if (needsUpdate) {
                dispatch(
                  setRepoAndBranchForTask({
                    taskId: recipeId,
                    repoName: promptRepoName,
                    branchName:
                      branchCandidate ||
                      storedBranchName ||
                      storedRepoContext?.branchName ||
                      "main",
                    projectId: projectId || undefined,
                  })
                );
              }

              // Try to fetch questions and answers
              try {
                const questionsData = await QuestionService.getQuestions(projectId);
                if (questionsData?.questions) {
                  setProjectData(prev => prev ? {
                    ...prev,
                    questions: questionsData.questions.map((q: any) => ({
                      id: q.id,
                      question: q.question,
                    })),
                  } : null);
                }
                if (questionsData?.answers) {
                  const answersMap: Record<string, string> = {};
                  Object.entries(questionsData.answers).forEach(
                    ([qId, ans]: [string, any]) => {
                      answersMap[qId] = ans.text_answer || ans.mcq_answer || "";
                    }
                  );
                  setAnswers(answersMap);
                }
              } catch {
                // Non-critical, continue without questions
              }
            }
          } catch {
            // Non-critical error, continue without project data
          }
        }

        // Set recipe data (will update user_prompt after projectData is set)
        setRecipeData({
          recipe_id: recipeId,
          project_id: projectId || "",
          user_prompt: "Implementation plan generation",
        });
        
        hasInitializedRef.current = true;
      } catch (err: any) {
        console.error("Failed to fetch data:", err);
        // Non-critical error, just log it
        hasInitializedRef.current = true;
      }
    };
    
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId]); // Removed storedRepoContext and dispatch from deps to prevent infinite loop

  // Poll for spec progress
  useEffect(() => {
    if (!recipeId) return;

    let mounted = true;
    let interval: NodeJS.Timeout;

    const fetchProgress = async () => {
      try {
        const progress = await SpecService.getSpecProgress(recipeId);
        
        if (!mounted) return;

        setSpecProgress(progress);
        setError(null);
        setIsLoading(false);

        // Stop polling when completed or failed
        if (
          progress.spec_generation_step_status === 'COMPLETED' ||
          progress.spec_generation_step_status === 'FAILED'
        ) {
          if (interval) clearInterval(interval);
          if (progress.spec_generation_step_status === 'COMPLETED') {
            setIsPlanExpanded(false);
          }
        }
      } catch (err: any) {
        if (!mounted) return;
        console.error("Failed to fetch progress:", err);
        setError(err.message || "Failed to fetch progress");
        setIsLoading(false);
        // Continue polling even on error (will retry on next interval)
      }
    };

    // Initial fetch
    fetchProgress();

    // Poll every 1000ms (1 second)
    interval = setInterval(fetchProgress, 1000);

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [recipeId]);

  // Auto-scroll to bottom when plan is generated
  useEffect(() => {
    if (specProgress?.spec_generation_step_status === 'COMPLETED' && planContentRef.current) {
      setTimeout(() => {
        planContentRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [specProgress?.spec_generation_step_status]);

  // Calculate progress from API response
  const planProgress = specProgress?.progress_percent ?? 0;
  const isGenerating = specProgress?.spec_generation_step_status === 'IN_PROGRESS' || 
                       specProgress?.spec_generation_step_status === 'PENDING';

  if (isLoading && !specProgress) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        <p className="ml-3 text-gray-600">Loading spec generation...</p>
      </div>
    );
  }

  if (!recipeId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Recipe not found</h2>
          <p className="text-gray-600 mb-6">
            The recipe ID was not found. Please start a new project.
          </p>
          <button
            onClick={() => router.push("/idea")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create New Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-100 antialiased">
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
        {specProgress?.spec_generation_step_status === 'FAILED' && (
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
          <h1 className="text-2xl font-bold text-zinc-900">Plan Spec</h1>
          {projectData && (
            <div className="flex items-center gap-2">
              <Badge icon={Github}>{projectData.repo}</Badge>
              <Badge icon={GitBranch}>{projectData.branch}</Badge>
            </div>
          )}
        </div>
        {/* Project Briefing */}
        <section className="mb-8 pb-8 border-b border-zinc-100">
          <div className="space-y-6">
            <p className="text-base font-medium tracking-tight text-zinc-900 leading-relaxed">
              {recipeData?.user_prompt || "Loading..."}
            </p>

            <div className="grid grid-cols-1 gap-6 pt-2">
              {/* Questions as Parameters */}
              {projectData?.questions
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
                      : specProgress?.spec_generation_step_status === 'COMPLETED'
                        ? "Plan Ready"
                        : specProgress?.spec_generation_step_status === 'FAILED'
                          ? "Failed"
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
                    const stepStatus = specProgress?.step_statuses?.[idx];
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
                          className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-500 bg-white ${
                            isDone
                              ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                              : isActive
                                ? "border-zinc-900 animate-pulse text-zinc-900"
                                : isFailed
                                  ? "border-red-500 bg-red-50 text-red-500"
                                  : "border-zinc-200 text-zinc-300"
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
                              isActive ? "text-zinc-900" : "text-zinc-500"
                            }`}
                          >
                            {step.title}
                          </span>
                          <span className="text-xs text-zinc-400 mt-0.5 max-w-[240px]">
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
          {specProgress?.spec_generation_step_status === 'COMPLETED' && 
           !isCancelled && 
           specProgress?.spec_output && (
            <section
              ref={planContentRef}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <PlanTabs plan={specProgress.spec_output} />

              {/* Action Button */}
              <div className="mt-12 flex justify-end">
                <button
                  onClick={() => router.push(`/task/${recipeId}/plan_overview`)}
                  className="px-6 py-2 bg-[#0575E6] bg-gradient-to-r from-[#0575E6] to-[#021B79] hover:bg-[#0575E6] hover:text-white rounded-lg font-medium text-sm hover:bg-zinc-800 transition-colors text-white"
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

export default SpecPage;
