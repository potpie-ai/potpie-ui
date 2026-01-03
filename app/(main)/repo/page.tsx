"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import QuestionService from "@/services/QuestionService";
import SpecService from "@/services/SpecService";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import AIAnalysisBanner from "./components/AIAnalysisBanner";
import QuestionSection from "./components/QuestionSection";
import AdditionalContextSection from "./components/AdditionalContextSection";
import QuestionProgress from "./components/QuestionProgress";
import { Card, CardHeader } from "@/components/ui/card";
import { Github, FileText, Loader2 } from "lucide-react";
import { QAAnswer, SubmitSpecGenerationResponse, RecipeQuestionsResponse } from "@/lib/types/spec";
import type { MCQQuestion, QuestionAnswer, RepoPageState } from "@/types/question";
import { DEFAULT_SECTION_ORDER } from "@/types/question";
import { ParsingStatusEnum } from "@/lib/Constants";

export default function RepoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const recipeIdFromUrl = searchParams.get("recipeId");
  const repoNameFromUrl = searchParams.get("repoName");
  const featureIdeaFromUrl = searchParams.get("featureIdea");
  const questionsEndRef = useRef<HTMLDivElement>(null);
  
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [questionsPolling, setQuestionsPolling] = useState(false);

  const [state, setState] = useState<RepoPageState>({
    pageState: "generating",
    questions: [],
    visibleQuestions: new Set(),
    answers: new Map(),
    sections: new Map(),
    additionalContext: "",
    hoveredQuestion: null,
    expandedOptions: new Set(),
    skippedQuestions: new Set(),
    isGenerating: false,
  });

  // Fetch questions when recipeId is available (new recipe codegen flow)
  useEffect(() => {
    if (!recipeId) return;

    const fetchQuestions = async () => {
      setQuestionsPolling(true);
      setState((prev) => ({ ...prev, pageState: "generating" }));

      try {
        // First, try a direct fetch to see if questions are already available
        // This handles cases where status has moved to SPEC_IN_PROGRESS but questions exist
        let questionsData: RecipeQuestionsResponse;
        try {
          questionsData = await QuestionService.getRecipeQuestions(recipeId);
          
          // If questions are available, use them immediately
          if (questionsData.questions && questionsData.questions.length > 0) {
            console.log("[Repo Page] Questions already available, status:", questionsData.recipe_status);
            // Process questions immediately
            processQuestions(questionsData);
            return;
          }
        } catch (error) {
          console.log("[Repo Page] Direct fetch failed, will poll instead:", error);
        }

        // If direct fetch didn't return questions, poll for them
        console.log("[Repo Page] Polling for questions...");
        questionsData = await QuestionService.pollRecipeQuestions(recipeId);
        processQuestions(questionsData);
      } catch (error: any) {
        console.error("Error fetching questions:", error);
        toast.error(error.message || "Failed to load questions");
        setState((prev) => ({ ...prev, pageState: "questions" }));
      } finally {
        setQuestionsPolling(false);
      }
    };

    const processQuestions = (questionsData: RecipeQuestionsResponse) => {
      // Check if questions are available (regardless of status)
      // This handles cases where status is SPEC_IN_PROGRESS but questions are still available
      if (questionsData.questions && questionsData.questions.length > 0) {
        // Convert RecipeQuestion[] to MCQQuestion[] format
        const mcqQuestions: MCQQuestion[] = questionsData.questions.map((q) => ({
          id: q.id,
          section: "General", // Default section, could be enhanced later
          question: q.question,
          options: q.options,
          needsInput: q.allow_custom_answer,
          assumed: q.preferred_option,
        }));

        // Group by section and set state
        const sectionsMap = new Map<string, MCQQuestion[]>();
        mcqQuestions.forEach((q) => {
          if (!sectionsMap.has(q.section)) {
            sectionsMap.set(q.section, []);
          }
          sectionsMap.get(q.section)!.push(q);
        });

        setState((prev) => ({
          ...prev,
          questions: mcqQuestions,
          sections: sectionsMap,
          pageState: "questions",
        }));

        // Animate questions appearing
        mcqQuestions.forEach((q, index) => {
          setTimeout(() => {
            setState((prev) => {
              const newVisible = new Set(prev.visibleQuestions);
              newVisible.add(q.id);
              return { ...prev, visibleQuestions: newVisible };
            });
          }, index * 200);
        });
      } else {
        // No questions available
        console.warn("[Repo Page] No questions available, status:", questionsData.recipe_status);
        setState((prev) => ({ ...prev, pageState: "questions" }));
      }
    };

    fetchQuestions();
  }, [recipeId]);

  // Generate questions on page load (old flow - kept for backward compatibility)
  const {
    data: questionsData,
    isLoading: questionsLoading,
    error: questionsError,
  } = useQuery({
    queryKey: ["questions", projectId, featureIdeaFromUrl],
    queryFn: async () => {
      if (!projectId) return null;
      return await QuestionService.generateQuestions(
        projectId,
        featureIdeaFromUrl || undefined
      );
    },
    enabled: !!projectId && !recipeId, // Only use old flow if recipeId is not available
    retry: 2,
  });

  // Get existing questions and answers
  const { data: existingData } = useQuery({
    queryKey: ["project-questions", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      return await QuestionService.getQuestions(projectId);
    },
    enabled: !!projectId && !questionsLoading,
  });

  // Fetch project details (repo name, feature idea)
  const { data: projectData } = useQuery({
    queryKey: ["project-details", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      try {
        const projects = await BranchAndRepositoryService.getUserProjects();
        return projects.find((p: { id: string }) => p.id === projectId) || null;
      } catch {
        return null;
      }
    },
    enabled: !!projectId,
  });

  // Extract project info - prioritize URL params, then project data
  const repoName =
    repoNameFromUrl || projectData?.repo_name || "Unknown Repository";
  const branchName = projectData?.branch_name || "";

  // Parse feature idea from properties if not in URL
  let featureIdea: string | null = featureIdeaFromUrl || null;
  if (!featureIdea && projectData?.properties) {
    try {
      const props =
        typeof projectData.properties === "string"
          ? JSON.parse(projectData.properties)
          : projectData.properties;
      featureIdea = props?.idea || null;
    } catch {
      featureIdea = projectData.properties?.idea || projectData?.idea || null;
    }
  } else if (!featureIdea) {
    featureIdea = projectData?.idea || null;
  }

  // Show error toast if questions fail to load
  useEffect(() => {
    if (questionsError) {
      toast.error("Failed to generate questions. Please try again.");
    }
  }, [questionsError]);

  // Recover recipeId from URL (created in idea page)
  useEffect(() => {
    if (recipeIdFromUrl) {
      // Validate it's a UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(recipeIdFromUrl)) {
        console.log("[Repo Page] Recovered recipeId from URL:", recipeIdFromUrl);
        setRecipeId(recipeIdFromUrl);
      } else {
        console.warn("[Repo Page] Invalid recipeId format in URL:", recipeIdFromUrl);
      }
    } else {
      console.warn("[Repo Page] No recipeId in URL - recipe should have been created in idea page");
    }
  }, [recipeIdFromUrl]);

  // Process questions when received
  useEffect(() => {
    const questions = questionsData?.questions || existingData?.questions || [];
    if (questions.length === 0) return;

    // Group by section
    const sectionsMap = new Map<string, MCQQuestion[]>();
    questions.forEach((q: MCQQuestion) => {
      if (!sectionsMap.has(q.section)) {
        sectionsMap.set(q.section, []);
      }
      sectionsMap.get(q.section)!.push(q);
    });

    // Load existing answers
    const answersMap = new Map<string, QuestionAnswer>();
    if (existingData?.answers) {
      Object.entries(existingData.answers).forEach(
        ([qId, answer]: [string, unknown]) => {
          const ans = answer as {
            text_answer?: string;
            mcq_answer?: string;
            is_user_modified?: boolean;
          };
          answersMap.set(qId, {
            questionId: qId,
            textAnswer: ans.text_answer,
            mcqAnswer: ans.mcq_answer,
            isEditing: false,
            isUserModified: ans.is_user_modified || false,
          });
        }
      );
    }

    // Set AI assumptions as initial answers
    questions.forEach((q: MCQQuestion) => {
      if (q.assumed && !answersMap.has(q.id)) {
        answersMap.set(q.id, {
          questionId: q.id,
          mcqAnswer: q.assumed,
          isEditing: false,
          isUserModified: false,
        });
      }
    });

    setState((prev) => ({
      ...prev,
      questions,
      sections: sectionsMap,
      answers: answersMap,
      pageState: "questions",
    }));

    // Animate questions appearing one by one
    const timeoutIds: NodeJS.Timeout[] = [];
    questions.forEach((q: MCQQuestion, index: number) => {
      const timeoutId = setTimeout(() => {
        setState((prev) => {
          const newVisible = new Set(prev.visibleQuestions);
          newVisible.add(q.id);
          return { ...prev, visibleQuestions: newVisible };
        });
        // Scroll to new question on last item
        if (index === questions.length - 1) {
          questionsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }, index * 200);
      timeoutIds.push(timeoutId);
    });

    // Cleanup: clear all timeouts on unmount or when dependencies change
    return () => {
      timeoutIds.forEach((id) => clearTimeout(id));
    };
  }, [questionsData, existingData]);

  // Submit answers mutation
  const submitAnswersMutation = useMutation({
    mutationFn: async (
      answers: Record<string, { text_answer?: string; mcq_answer?: string }>
    ) => {
      if (!projectId) throw new Error("No project ID");
      return await QuestionService.submitAnswers(projectId, answers);
    },
    onSuccess: () => {
      toast.success("Answers saved successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save answers");
    },
  });


  // Generate plan mutation
  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      // Use recipeId from URL if available (new flow), otherwise fall back to projectId (old flow)
      const activeRecipeId = recipeId || recipeIdFromUrl;
      
      if (!activeRecipeId) {
        console.error("Recipe ID is not set. Current recipeId:", recipeId, "recipeIdFromUrl:", recipeIdFromUrl);
        throw new Error("Recipe not initialized. Please refresh the page.");
      }

      // Validate recipeId is a UUID (basic check - should be 36 chars with dashes)
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(activeRecipeId)) {
        console.error("Invalid recipeId format:", activeRecipeId, "Expected UUID format");
        throw new Error(`Invalid recipe ID format. Please refresh the page and try again.`);
      }

      console.log("Submitting QA answers with recipeId:", activeRecipeId);

      // Collect all answers in the new format
      const qaAnswers: Array<{ question_id: string; answer: string }> = [];
      
      state.answers.forEach((answer, qId) => {
        if (state.skippedQuestions.has(qId)) return;
        
        const question = state.questions.find(q => q.id === qId);
        if (!question) return;
        
        if (answer.textAnswer || answer.mcqAnswer) {
          qaAnswers.push({
            question_id: qId,
            answer: answer.textAnswer || answer.mcqAnswer || "",
          });
        }
      });
      
      // Add additional context if provided (as a special question)
      if (state.additionalContext.trim()) {
        qaAnswers.push({
          question_id: "additional_context",
          answer: state.additionalContext.trim(),
        });
      }

      // Call new spec generation API
      return await SpecService.submitSpecGeneration({
        recipe_id: activeRecipeId,
        qa_answers: qaAnswers,
      });
    },
    onSuccess: (response: SubmitSpecGenerationResponse) => {
      toast.success("Spec generation started successfully");
      // Navigate to spec page with recipeId
      const activeRecipeId = recipeId || recipeIdFromUrl;
      if (!activeRecipeId) {
        console.error("recipeId is not set after successful submission");
        toast.error("Navigation failed: Recipe ID missing");
        return;
      }
      router.push(`/task/${activeRecipeId}/spec`);
    },
    onError: (error: Error) => {
      console.error("Error in generatePlanMutation:", error);
      console.error("Current recipeId:", recipeId);
      console.error("Current projectId:", projectId);
      toast.error(error.message || "Failed to start spec generation");
      setState((prev) => ({ ...prev, isGenerating: false }));
    },
  });

  const handleAnswerChange = (
    questionId: string,
    answer: Partial<QuestionAnswer>
  ) => {
    setState((prev) => {
      const newAnswers = new Map(prev.answers);
      const existing = newAnswers.get(questionId) || {
        questionId,
        isEditing: false,
        isUserModified: false,
      };
      newAnswers.set(questionId, { ...existing, ...answer });
      return { ...prev, answers: newAnswers };
    });
  };

  const handleSaveAnswer = async (questionId: string) => {
    const answer = state.answers.get(questionId);
    if (!answer) return;

    const answersToSubmit: Record<
      string,
      { text_answer?: string; mcq_answer?: string }
    > = {
      [questionId]: {
        text_answer: answer.textAnswer,
        mcq_answer: answer.mcqAnswer,
      },
    };

    await submitAnswersMutation.mutateAsync(answersToSubmit);

    setState((prev) => {
      const newAnswers = new Map(prev.answers);
      const existing = newAnswers.get(questionId);
      if (existing) {
        newAnswers.set(questionId, {
          ...existing,
          isEditing: false,
          isUserModified: true,
        });
      }
      return { ...prev, answers: newAnswers };
    });
  };

  const handleCancelEdit = (questionId: string) => {
    setState((prev) => {
      const newAnswers = new Map(prev.answers);
      const existing = newAnswers.get(questionId);
      if (existing) {
        newAnswers.set(questionId, { ...existing, isEditing: false });
      }
      return { ...prev, answers: newAnswers };
    });
  };

  const handleToggleSkip = (questionId: string) => {
    setState((prev) => {
      const newSkipped = new Set(prev.skippedQuestions);
      if (newSkipped.has(questionId)) {
        newSkipped.delete(questionId);
      } else {
        newSkipped.add(questionId);
      }
      return { ...prev, skippedQuestions: newSkipped };
    });
  };

  const handleGeneratePlan = () => {
    setState((prev) => ({ ...prev, isGenerating: true }));
    generatePlanMutation.mutate();
  };

  // Count answered questions (excluding skipped ones)
  const answeredCount = Array.from(state.answers.entries()).filter(
    ([qId, a]) =>
      !state.skippedQuestions.has(qId) && (a.textAnswer || a.mcqAnswer)
  ).length;

  // Total questions minus skipped ones
  const activeQuestionCount =
    state.questions.length - state.skippedQuestions.size;
  const skippedCount = state.skippedQuestions.size;

  // Set repo and branch in Redux store when recipeId is available
  useEffect(() => {
    if (!recipeId) return;
    if (!repoName || repoName === "Unknown Repository") return;

    // Note: setRepoAndBranchForTask removed - not needed for current flow
  }, [recipeId, repoName, branchName, projectId]);

  // Allow either projectId (old flow) or recipeId (new recipe codegen flow)
  if (!projectId && !recipeId && !recipeIdFromUrl) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">No project ID or recipe ID provided</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-2xl font-bold text-zinc-900">
                  Implementation Plan
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Github className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-500">{repoName}</span>
                  {branchName && (
                    <>
                      <span className="text-zinc-300">•</span>
                      <span className="text-xs text-zinc-400">{branchName}</span>
                    </>
                  )}
                </div>
                {featureIdea && (
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-xs text-zinc-500">{featureIdea}</span>
                  </div>
                )}
              </div>
            </div>
            <QuestionProgress
              total={activeQuestionCount}
              answered={answeredCount}
              skipped={skippedCount}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {state.pageState === "questions" && <AIAnalysisBanner />}

            {/* Loading State - Only show if we don't have questions yet */}
            {(questionsLoading || (questionsPolling && state.questions.length === 0)) && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-400 mx-auto mb-3" />
                  <p className="text-xs text-zinc-500">
                    {questionsPolling ? "Loading questions..." : "Generating questions..."}
                  </p>
                </div>
              </div>
            )}

            {/* Question Sections */}
            {state.pageState === "questions" &&
              (() => {
                const allSections = Array.from(state.sections.keys());

                // Sort sections: prioritize DEFAULT_SECTION_ORDER, then alphabetically
                const sortedSections = allSections.sort((a, b) => {
                  const aIndex = DEFAULT_SECTION_ORDER.findIndex(
                    (s) =>
                      a.toLowerCase().includes(s.toLowerCase()) ||
                      s.toLowerCase().includes(a.toLowerCase())
                  );
                  const bIndex = DEFAULT_SECTION_ORDER.findIndex(
                    (s) =>
                      b.toLowerCase().includes(s.toLowerCase()) ||
                      s.toLowerCase().includes(b.toLowerCase())
                  );

                  if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                  if (aIndex !== -1) return -1;
                  if (bIndex !== -1) return 1;
                  return a.localeCompare(b);
                });

                return sortedSections.map((section) => {
                  const sectionQuestions = state.sections.get(section) || [];
                  if (sectionQuestions.length === 0) return null;

                  return (
                    <QuestionSection
                      key={section}
                      section={section}
                      questions={sectionQuestions.filter((q) =>
                        state.visibleQuestions.has(q.id)
                      )}
                      answers={state.answers}
                      hoveredQuestion={state.hoveredQuestion}
                      expandedOptions={state.expandedOptions}
                      skippedQuestions={state.skippedQuestions}
                      onHover={(questionId) =>
                        setState((prev) => ({
                          ...prev,
                          hoveredQuestion: questionId,
                        }))
                      }
                      onAnswerChange={handleAnswerChange}
                      onSave={handleSaveAnswer}
                      onCancel={handleCancelEdit}
                      onToggleOptions={(questionId) => {
                        setState((prev) => {
                          const newExpanded = new Set(prev.expandedOptions);
                          if (newExpanded.has(questionId)) {
                            newExpanded.delete(questionId);
                          } else {
                            newExpanded.add(questionId);
                          }
                          return { ...prev, expandedOptions: newExpanded };
                        });
                      }}
                      onToggleSkip={handleToggleSkip}
                    />
                  );
                });
              })()}

            <div ref={questionsEndRef} />
          </div>
        </div>

        {/* Additional Context Section */}
        {state.pageState === "questions" && (
          <AdditionalContextSection
            context={state.additionalContext}
            onContextChange={(context) =>
              setState((prev) => ({ ...prev, additionalContext: context }))
            }
            onGeneratePlan={handleGeneratePlan}
            isGenerating={state.isGenerating}
            recipeId={recipeId}
          />
        )}
      </div>
    </div>
  );
}
