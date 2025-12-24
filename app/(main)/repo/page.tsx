"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import QuestionService from "@/services/QuestionService";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import AIAnalysisBanner from "./components/AIAnalysisBanner";
import QuestionSection from "./components/QuestionSection";
import AdditionalContextSection from "./components/AdditionalContextSection";
import QuestionProgress from "./components/QuestionProgress";
import { Card, CardHeader } from "@/components/ui/card";
import { Github, FileText } from "lucide-react";

interface MCQQuestion {
  id: string;
  section: string;
  question: string;
  options: string[];
  needsInput: boolean;
  assumed?: string;
  reasoning?: string;
}

interface QuestionAnswer {
  questionId: string;
  textAnswer?: string;
  mcqAnswer?: string;
  isEditing: boolean;
  isUserModified: boolean;
}

interface RepoPageState {
  pageState: "generating" | "questions";
  questions: MCQQuestion[];
  visibleQuestions: Set<string>;
  answers: Map<string, QuestionAnswer>;
  sections: Map<string, MCQQuestion[]>;
  additionalContext: string;
  hoveredQuestion: string | null;
  expandedOptions: Set<string>;
  skippedQuestions: Set<string>;
  isGenerating: boolean;
}

// Default section order for UI display prioritization only
// All sections from questions will be displayed regardless of this list
const DEFAULT_SECTION_ORDER = [
  "Architecture",
  "Database",
  "API Design",
  "Security",
  "Performance",
  "Integration",
];

export default function RepoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const repoNameFromUrl = searchParams.get("repoName");
  const featureIdeaFromUrl = searchParams.get("featureIdea");
  const questionsEndRef = useRef<HTMLDivElement>(null);

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

  // Generate questions on page load
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
    enabled: !!projectId,
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
    questions.forEach((q: MCQQuestion, index: number) => {
      setTimeout(() => {
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
    });
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
      if (!projectId) throw new Error("No project ID");

      // Collect all answers, excluding skipped questions
      const answers: Record<
        string,
        { text_answer?: string; mcq_answer?: string }
      > = {};
      state.answers.forEach((answer, qId) => {
        if (state.skippedQuestions.has(qId)) return;
        if (answer.textAnswer || answer.mcqAnswer) {
          answers[qId] = {
            text_answer: answer.textAnswer,
            mcq_answer: answer.mcqAnswer,
          };
        }
      });

      return await QuestionService.generatePlan(
        projectId,
        answers,
        state.additionalContext
      );
    },
    onSuccess: () => {
      toast.success("Implementation plan generated successfully");
      router.push(`/plan?projectId=${projectId}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to generate plan");
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

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">No project ID provided</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4">
          <Card className="border-blue-200 bg-gradient-to-br from-card to-card/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-blue-600 rounded" />
                    <h1 className="text-lg font-semibold text-gray-900">
                      Implementation Plan
                    </h1>
                  </div>
                  <div className="space-y-1.5 ml-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Github className="h-4 w-4" />
                      <span className="font-medium">Repository:</span>
                      <span>{repoName}</span>
                      {branchName && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500">{branchName}</span>
                        </>
                      )}
                    </div>
                    {featureIdea && (
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="font-medium">Feature Idea:</span>
                          <span className="ml-1">{featureIdea}</span>
                        </div>
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
            </CardHeader>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {state.pageState === "questions" && <AIAnalysisBanner />}

            {/* Loading State */}
            {questionsLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Generating questions...</p>
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
          />
        )}
      </div>
    </div>
  );
}
