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
import { Github, FileText, Loader2, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QAAnswer } from "@/lib/types/spec";
import type { MCQQuestion, QuestionAnswer, RepoPageState } from "@/types/question";
import { DEFAULT_SECTION_ORDER } from "@/types/question";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/lib/state/store";
import { setRepoAndBranchForTask } from "@/lib/state/Reducers/RepoAndBranch";
import { useAuthContext } from "@/contexts/AuthContext";
import ChatService from "@/services/ChatService";
import { setPendingMessage } from "@/lib/state/Reducers/chat";
import { ParsingStatusEnum } from "@/lib/Constants";

export default function RepoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuthContext();
  const projectId = searchParams.get("projectId");
  const repoNameFromUrl = searchParams.get("repoName");
  const featureIdeaFromUrl = searchParams.get("featureIdea");
  const questionsEndRef = useRef<HTMLDivElement>(null);
  
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [userQuery, setUserQuery] = useState<string>("");

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

  // Recover recipeId from URL (created in idea page)
  useEffect(() => {
    const existingRecipeId = searchParams.get("recipeId");
    if (existingRecipeId) {
      // Validate it's a UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(existingRecipeId)) {
        console.log("[Repo Page] Recovered recipeId from URL:", existingRecipeId);
        setRecipeId(existingRecipeId);
      } else {
        console.warn("[Repo Page] Invalid recipeId format in URL:", existingRecipeId);
      }
    } else {
      console.warn("[Repo Page] No recipeId in URL - recipe should have been created in idea page");
    }
  }, [searchParams]);

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

  // Create conversation mutation for agent selection
  const createConversationMutation = useMutation({
    mutationFn: async (agentId: string) => {
      // Validate all required fields
      if (!user?.uid) throw new Error("User not authenticated");
      if (!projectId) throw new Error("Project ID is required");
      
      // CRITICAL: Validate repo and branch are available
      if (!repoName || repoName === "Unknown Repository") {
        throw new Error("Repository name is required. Please ensure repository is properly selected.");
      }
      
      const finalBranchName = branchName || "main";
      
      // CRITICAL: Verify project is parsed and ready
      try {
        const status = await BranchAndRepositoryService.getParsingStatus(projectId);
        if (status !== ParsingStatusEnum.READY) {
          throw new Error(`Repository parsing status: ${status}. Must be 'ready' to create conversation.`);
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("parsing status")) {
          throw error;
        }
        throw new Error("Failed to verify repository parsing status");
      }
      
      const title = agentId === "codebase_qna_agent" 
        ? "Codebase Q&A Chat" 
        : "Debug Chat";
      
      console.log("[Repo Page] Creating conversation with full context:", {
        userId: user.uid,
        projectId,
        repoName,
        branchName: finalBranchName,
        agentId,
        title
      });
      
      // CRITICAL: Pass repo_name and branch_name to ensure backend has context
      return await ChatService.createConversation(
        user.uid,
        title,
        projectId,
        agentId,
        false,
        repoName,
        finalBranchName
      );
    },
    onSuccess: (data) => {
      // Clear the query field after successful creation
      setUserQuery("");
      router.push(`/chat/${data.conversation_id}`);
    },
    onError: (error: Error) => {
      console.error("[Repo Page] Failed to create conversation:", error);
      
      // Clear pending message on error so it doesn't get sent later
      dispatch(setPendingMessage(""));
      
      // Show user-friendly error message
      if (error.message.includes("Project ID")) {
        toast.error("Repository not found. Please select a valid repository.");
      } else if (error.message.includes("not authenticated")) {
        toast.error("Please sign in to continue.");
      } else if (error.message.includes("parsing status")) {
        toast.error(error.message);
      } else {
        toast.error(error.message || "Failed to create conversation. Please try again.");
      }
    },
  });

  // Handle agent selection
  const handleAgentSelect = (agent: string) => {
    // Validate that user has entered a query
    if (!userQuery.trim()) {
      toast.error("Please enter a question or issue description before selecting an agent");
      return;
    }

    setSelectedAgent(agent);
    setAgentDropdownOpen(false);
    
    // Store the query in Redux for auto-send in chat page
    dispatch(setPendingMessage(userQuery.trim()));
    
    // Map agent selection to agent IDs
    const agentIdMap: Record<string, string> = {
      qna: "codebase_qna_agent",
      debug: "debugging_agent",
    };
    
    const agentId = agentIdMap[agent];
    if (agentId) {
      createConversationMutation.mutate(agentId);
    }
  };

  // Generate plan mutation
  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      // Validate recipeId is set and is a valid UUID format
      if (!recipeId) {
        console.error("Recipe ID is not set. Current recipeId:", recipeId);
        throw new Error("Recipe not initialized. Please refresh the page.");
      }

      // Validate recipeId is a UUID (basic check - should be 36 chars with dashes)
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(recipeId)) {
        console.error("Invalid recipeId format:", recipeId, "Expected UUID format");
        throw new Error(`Invalid recipe ID format. Please refresh the page and try again.`);
      }

      console.log("Submitting QA answers with recipeId:", recipeId);

      // Collect all answers, excluding skipped questions
      const qaAnswers: QAAnswer[] = [];
      
      state.answers.forEach((answer, qId) => {
        if (state.skippedQuestions.has(qId)) return;
        
        const question = state.questions.find(q => q.id === qId);
        if (!question) return;
        
        // Only include questions with answers
        if (answer.textAnswer || answer.mcqAnswer) {
          qaAnswers.push({
            id: qId, // Include question ID for backend reference
            question: question.question,
            answer: answer.textAnswer || answer.mcqAnswer || "",
          });
        }
      });
      
      // Add additional context as a separate QA item if provided
      if (state.additionalContext.trim()) {
        qaAnswers.push({
          question: "Additional Context",
          answer: state.additionalContext.trim(),
        });
      }

      // Call spec generation API with recipeId
      return await SpecService.submitQAAnswers(recipeId, qaAnswers);
    },
    onSuccess: (response) => {
      if (response.status === 'spec_generation_started' || 
          response.status === 'spec_generation_in_progress') {
        toast.success("Spec generation started successfully");
        // Navigate to spec page with recipeId (validate it's set)
        if (!recipeId) {
          console.error("recipeId is not set after successful submission");
          toast.error("Navigation failed: Recipe ID missing");
          return;
        }
        router.push(`/task/${recipeId}/spec`);
      }
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

    dispatch(
      setRepoAndBranchForTask({
        taskId: recipeId,
        repoName,
        branchName: branchName || "main",
        projectId: projectId || undefined,
      })
    );
  }, [dispatch, recipeId, repoName, branchName, projectId]);

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">No project ID provided</p>
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
              {/* Query Input */}
              <div className="w-full mb-3">
                <Textarea
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Ask a question about your codebase or describe an issue to debug..."
                  className={`min-h-[80px] resize-none focus:border-zinc-900 ${
                    selectedAgent !== null && !userQuery.trim()
                      ? "border-red-500 focus:border-red-600"
                      : "border-zinc-200"
                  }`}
                  maxLength={500}
                  disabled={createConversationMutation.isPending}
                />
                {userQuery.length > 0 && (
                  <p className="text-xs text-zinc-400 mt-1">
                    {userQuery.length}/500 characters
                  </p>
                )}
                {selectedAgent !== null && !userQuery.trim() && (
                  <p className="text-xs text-red-600 mt-1">
                    Please enter a question before selecting an agent
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 mb-3">
                {/* Agent Selector Dropdown */}
                <DropdownMenu open={agentDropdownOpen} onOpenChange={setAgentDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-8 justify-between gap-2 min-w-[120px] ${
                        selectedAgent 
                          ? "bg-zinc-900 border-zinc-900 text-white hover:bg-zinc-800" 
                          : "border-zinc-200 hover:bg-zinc-50 text-zinc-600"
                      }`}
                      disabled={createConversationMutation.isPending}
                    >
                      <span className="text-xs font-medium truncate">
                        {selectedAgent === "qna" 
                          ? "Q&A" 
                          : selectedAgent === "debug" 
                          ? "Debug" 
                          : "Select agent"}
                      </span>
                      <ChevronDown className={`h-3 w-3 flex-shrink-0 ${selectedAgent ? 'text-white' : 'text-zinc-400'}`} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[180px] max-h-[300px] overflow-y-auto p-2 bg-white border border-zinc-200 rounded-xl shadow-lg" align="start">
                    <div className="space-y-0.5">
                      <DropdownMenuItem
                        onClick={() => handleAgentSelect("qna")}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg
                          transition-colors
                          ${selectedAgent === "qna"
                            ? 'bg-zinc-50 border border-zinc-200 text-zinc-900' 
                            : 'hover:bg-zinc-50 text-zinc-900'
                          }
                        `}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium truncate ${selectedAgent === "qna" ? 'text-zinc-900' : 'text-zinc-700'}`}>
                              Q&A
                            </span>
                            {selectedAgent === "qna" && (
                              <Check className="h-3.5 w-3.5 text-zinc-900 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAgentSelect("debug")}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg
                          transition-colors
                          ${selectedAgent === "debug"
                            ? 'bg-zinc-50 border border-zinc-200 text-zinc-900' 
                            : 'hover:bg-zinc-50 text-zinc-900'
                          }
                        `}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium truncate ${selectedAgent === "debug" ? 'text-zinc-900' : 'text-zinc-700'}`}>
                              Debug
                            </span>
                            {selectedAgent === "debug" && (
                              <Check className="h-3.5 w-3.5 text-zinc-900 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
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

            {/* Loading State */}
            {questionsLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-400 mx-auto mb-3" />
                  <p className="text-xs text-zinc-500">Generating questions...</p>
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
