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
import { Github, FileText, Loader2, GitBranch } from "lucide-react";
import {
  QAAnswer,
  TriggerSpecGenerationResponse,
  RecipeQuestionsResponse,
  RecipeQuestion,
  RecipeQuestionNew,
  QuestionOption,
} from "@/lib/types/spec";
import type {
  MCQQuestion,
  QuestionAnswer,
  RepoPageState,
} from "@/types/question";
import { DEFAULT_SECTION_ORDER } from "@/types/question";
import { ParsingStatusEnum } from "@/lib/Constants";
import { Badge as UIBadge } from "@/components/ui/badge";

// Criticality order for sorting (lower value = higher priority)
const CRITICALITY_ORDER: Record<string, number> = {
  BLOCKER: 0,
  IMPORTANT: 1,
  NICE_TO_HAVE: 2,
};

const Badge = ({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) => (
  <div className="flex items-center gap-1.5 px-2 py-0.5 border border-zinc-200 rounded text-xs font-medium text-zinc-500">
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </div>
);

export default function RepoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const recipeIdFromUrl = searchParams.get("recipeId");
  const repoNameFromUrl = searchParams.get("repoName");
  const branchNameFromUrl = searchParams.get("branch");
  const featureIdeaFromUrl = searchParams.get("featureIdea");
  const questionsEndRef = useRef<HTMLDivElement>(null);
  const questionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [questionsPolling, setQuestionsPolling] = useState(false);
  const [recipeRepoName, setRecipeRepoName] = useState<string | null>(null);
  const [recipeBranchName, setRecipeBranchName] = useState<string | null>(null);

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
    unansweredQuestionIds: new Set(),
    isGenerating: false,
  });

  // Fetch recipe details when recipeId is available
  useEffect(() => {
    const fetchRecipeDetails = async () => {
      if (!recipeId) return;

      try {
        console.log("[Repo Page] Fetching recipe details for:", recipeId);
        const recipeDetails = await SpecService.getRecipeDetails(recipeId);
        console.log("[Repo Page] Recipe details received:", recipeDetails);

        // Set repo and branch from recipe details
        setRecipeRepoName(recipeDetails.repo_name ?? null);
        setRecipeBranchName(recipeDetails.branch_name ?? null);
      } catch (error: any) {
        console.error("[Repo Page] Failed to fetch recipe details:", error);
        // Keep null values on error - will fall back to URL params or projectData
      }
    };

    fetchRecipeDetails();
  }, [recipeId]);

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
            console.log(
              "[Repo Page] Questions already available, status:",
              questionsData.generation_status
            );
            // Process questions immediately
            processQuestions(questionsData);
            return;
          }
        } catch (error) {
          console.log(
            "[Repo Page] Direct fetch failed, will poll instead:",
            error
          );
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
        // Load localStorage answers for this recipeId to preserve user changes
        let localStorageAnswers: Record<string, any> = {};
        if (typeof window !== "undefined" && recipeId) {
          try {
            const storageKey = `qa_answers_${recipeId}`;
            const stored = localStorage.getItem(storageKey);
            if (stored) {
              localStorageAnswers = JSON.parse(stored);
            }
          } catch (error) {
            console.warn("Failed to load answers from localStorage:", error);
          }
        }
        // Convert RecipeQuestion[] or RecipeQuestionNew[] to MCQQuestion[] format
        const mcqQuestions: MCQQuestion[] = questionsData.questions.map(
          (q, index) => {
            const isNewFormat = "answer_recommendation" in q || ("options" in q && q.options && q.options.length > 0 && typeof q.options[0] === "object");
            const newQ = q as RecipeQuestionNew;

            if (isNewFormat && newQ.options && Array.isArray(newQ.options) && newQ.options.length > 0 && typeof newQ.options[0] === "object") {
              // New API format: options are {label, description}[]
              const options = (newQ.options as QuestionOption[]).map((opt) => ({
                label: opt.label,
                description: opt.description,
              }));
              const recIdxRaw = newQ.answer_recommendation?.idx;
              const recIdx = typeof recIdxRaw === "number" ? recIdxRaw : null;
              const assumedLabel =
                recIdx != null && recIdx >= 0 && recIdx < options.length
                  ? options[recIdx].label
                  : undefined;
              // Parse criticality from API response
              const criticality = (newQ as any).criticality as "BLOCKER" | "IMPORTANT" | "NICE_TO_HAVE" | undefined;
              return {
                id: newQ.id ?? `q-${index}`,
                section: "General",
                question: newQ.question,
                options,
                needsInput: true, // "Other" always available for MCQs
                multipleChoice: newQ.multiple_choice ?? false,
                assumed: assumedLabel,
                reasoning: newQ.answer_recommendation?.reasoning,
                answerRecommendationIdx: recIdx ?? null,
                expectedAnswerType: newQ.expected_answer_type,
                contextRefs: newQ.context_refs ?? null,
                criticality,
              };
            }

            // Legacy format: options are string[]
            const legacyQ = q as unknown as RecipeQuestion;
            const strOptions = legacyQ.options || [];
            const options = strOptions.map((opt) =>
              typeof opt === "string" ? { label: opt, description: undefined } : opt
            );
            return {
              id: legacyQ.id,
              section: "General",
              question: legacyQ.question,
              options,
              needsInput: legacyQ.allow_custom_answer ?? true,
              assumed: legacyQ.preferred_option,
              answerRecommendationIdx: null,
            };
          }
        );

        // Sort questions by criticality
        mcqQuestions.sort((a, b) => {
          const aOrder = CRITICALITY_ORDER[a.criticality || "NICE_TO_HAVE"] ?? 2;
          const bOrder = CRITICALITY_ORDER[b.criticality || "NICE_TO_HAVE"] ?? 2;
          return aOrder - bOrder;
        });

        // Group by section and set state
        const sectionsMap = new Map<string, MCQQuestion[]>();
        mcqQuestions.forEach((q) => {
          if (!sectionsMap.has(q.section)) {
            sectionsMap.set(q.section, []);
          }
          sectionsMap.get(q.section)!.push(q);
        });

        // Initialize answers - prioritize localStorage, then AI recommendation
        const initialAnswers = new Map<string, QuestionAnswer>();
        
        // First, load from localStorage if available
        mcqQuestions.forEach((q) => {
          if (localStorageAnswers[q.id]?.isUserModified) {
            const storedAnswer = localStorageAnswers[q.id];
            initialAnswers.set(q.id, {
              questionId: q.id,
              textAnswer: storedAnswer.textAnswer,
              mcqAnswer: storedAnswer.mcqAnswer,
              selectedOptionIdx: storedAnswer.selectedOptionIdx,
              selectedOptionIndices: storedAnswer.selectedOptionIndices,
              isOther: storedAnswer.isOther,
              otherText: storedAnswer.otherText,
              isUserModified: true,
            });
          }
        });
        
        // Then, set AI recommendations for questions without localStorage answers
        // Auto-select most questions, only leave 1-2 key business questions requiring input
        const QUESTIONS_REQUIRING_INPUT = new Set([3, 7]); // "Does AI need access to private data?" and "Should AI perform actions?"
        mcqQuestions.forEach((q, index) => {
          if (initialAnswers.has(q.id)) return; // Skip if already loaded from localStorage
          
          // Skip questions that require user input
          if (QUESTIONS_REQUIRING_INPUT.has(index)) return;
          
          const options = Array.isArray(q.options)
            ? q.options.map((o) => (typeof o === "string" ? { label: o } : o))
            : [];
          let recIdx: number | undefined;
          if (typeof q.answerRecommendationIdx === "number") {
            recIdx = q.answerRecommendationIdx;
          } else if (q.assumed) {
            const found = options.findIndex(
              (o) => (typeof o === "string" ? o : o.label) === q.assumed
            );
            if (found >= 0) recIdx = found;
            else if (/^[A-Z]$/.test(q.assumed))
              recIdx = q.assumed.charCodeAt(0) - 65;
          }
          if (recIdx != null && recIdx >= 0 && recIdx < options.length) {
            const opt = options[recIdx];
            const label = typeof opt === "string" ? opt : opt.label;
            initialAnswers.set(q.id, {
              questionId: q.id,
              mcqAnswer: String.fromCharCode(65 + recIdx),
              selectedOptionIdx: recIdx,
              textAnswer: label,
              isOther: false,
              isUserModified: false,
            });
          }
        });

        setState((prev) => ({
          ...prev,
          questions: mcqQuestions,
          sections: sectionsMap,
          answers: initialAnswers,
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
        console.warn(
          "[Repo Page] No questions available, status:",
          questionsData.generation_status
        );
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

  // Extract project info - prioritize Recipe Details API, then URL params, then project data
  let repoName =
    recipeRepoName ||
    repoNameFromUrl ||
    projectData?.repo_name ||
    "Unknown Repository";
  let branchName = recipeBranchName || branchNameFromUrl || projectData?.branch_name || "";

  // Split repoName if it contains "/" (format: reponame/branchname) and no branch is set
  if (repoName.includes("/") && !branchName) {
    const parts = repoName.split("/");
    if (parts.length >= 2) {
      repoName = parts[0];
      branchName = parts.slice(1).join("/"); // Handle cases where branch name might contain "/"
    }
  }

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
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(recipeIdFromUrl)) {
        console.log(
          "[Repo Page] Recovered recipeId from URL:",
          recipeIdFromUrl
        );
        setRecipeId(recipeIdFromUrl);
      } else {
        console.warn(
          "[Repo Page] Invalid recipeId format in URL:",
          recipeIdFromUrl
        );
      }
    } else {
      console.warn(
        "[Repo Page] No recipeId in URL - recipe should have been created in idea page"
      );
    }
  }, [recipeIdFromUrl]);

  // Process questions when received (skip when in recipe flow - recipe has its own data source)
  useEffect(() => {
    if (recipeId) return;

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

    // Load existing answers - prioritize localStorage (user modifications), then API, then current state
    const answersMap = new Map<string, QuestionAnswer>();
    const currentAnswers = state.answers; // Get current state answers to preserve user modifications
    
    // First, try to load from localStorage (preserves user changes across navigation)
    let localStorageAnswers: Record<string, any> = {};
    if (typeof window !== "undefined" && recipeId) {
      try {
        const storageKey = `qa_answers_${recipeId}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          localStorageAnswers = JSON.parse(stored);
        }
      } catch (error) {
        console.warn("Failed to load answers from localStorage:", error);
      }
    }
    
    if (existingData?.answers) {
      Object.entries(existingData.answers).forEach(
        ([qId, answer]: [string, unknown]) => {
          // Priority 1: Check localStorage for user-modified answers
          if (localStorageAnswers[qId]?.isUserModified) {
            const storedAnswer = localStorageAnswers[qId];
            answersMap.set(qId, {
              questionId: qId,
              textAnswer: storedAnswer.textAnswer,
              mcqAnswer: storedAnswer.mcqAnswer,
              selectedOptionIdx: storedAnswer.selectedOptionIdx,
              selectedOptionIndices: storedAnswer.selectedOptionIndices,
              isOther: storedAnswer.isOther,
              otherText: storedAnswer.otherText,
              isUserModified: true,
            });
            return;
          }
          
          // Priority 2: Check if user has modified this answer in current state
          const currentAnswer = currentAnswers.get(qId);
          if (currentAnswer?.isUserModified) {
            // User has modified this answer locally, preserve it instead of loading from backend
            answersMap.set(qId, currentAnswer);
            return;
          }
          
          const ans = answer as {
            text_answer?: string;
            mcq_answer?: string;
            is_user_modified?: boolean;
          };
          const question = questions.find((qu: MCQQuestion) => qu.id === qId);
          const isMultipleChoice = question?.multipleChoice ?? false;
          const options = question?.options
            ? (Array.isArray(question.options)
                ? question.options.map((o) =>
                    typeof o === "string" ? { label: o } : o
                  )
                : [])
            : [];
          let selectedOptionIdx: number | undefined;
          let selectedOptionIndices: number[] | undefined;
          let textAnswer = ans.text_answer;
          
          if (ans.mcq_answer && options.length > 0) {
            const mcqAnswer = ans.mcq_answer.trim().toUpperCase();
            
            if (isMultipleChoice && mcqAnswer.includes(",")) {
              // Multiple selections: parse comma-separated letters (e.g., "A,B,C")
              const letters = mcqAnswer.split(",").map(l => l.trim());
              const indices = letters
                .filter(l => l.length === 1 && l >= "A" && l <= "Z")
                .map(l => l.charCodeAt(0) - 65)
                .filter(idx => idx >= 0 && idx < options.length)
                .sort((a, b) => a - b);
              
              if (indices.length > 0) {
                selectedOptionIndices = indices;
                const selectedLabels = indices
                  .map(idx => {
                    const opt = options[idx];
                    return typeof opt === "string" ? opt : opt.label;
                  })
                  .join(", ");
                textAnswer = selectedLabels;
              }
            } else {
              // Single selection: parse single letter (e.g., "A")
              const letter = mcqAnswer.split(",")[0].trim(); // Take first if comma-separated
              if (letter.length === 1 && letter >= "A" && letter <= "Z") {
                selectedOptionIdx = letter.charCodeAt(0) - 65;
                if (
                  selectedOptionIdx >= 0 &&
                  selectedOptionIdx < options.length
                ) {
                  const selOpt = options[selectedOptionIdx];
                  textAnswer =
                    typeof selOpt === "string" ? selOpt : selOpt.label;
                }
              }
            }
          } else if (isMultipleChoice && ans.text_answer && options.length > 0) {
            // Fallback: reconstruct selectedOptionIndices from text_answer for multiple choice
            // This handles cases where mcq_answer wasn't saved but text_answer contains comma-separated labels
            const textAnswerStr = ans.text_answer.trim();
            if (textAnswerStr.includes(",")) {
              // Try to match text_answer labels to options
              const answerLabels = textAnswerStr.split(",").map(l => l.trim());
              const matchedIndices: number[] = [];
              
              answerLabels.forEach(answerLabel => {
                const matchedIdx = options.findIndex(opt => {
                  const optLabel = typeof opt === "string" ? opt : opt.label;
                  return optLabel.trim() === answerLabel || optLabel.trim().includes(answerLabel);
                });
                if (matchedIdx >= 0 && !matchedIndices.includes(matchedIdx)) {
                  matchedIndices.push(matchedIdx);
                }
              });
              
              if (matchedIndices.length > 0) {
                selectedOptionIndices = matchedIndices.sort((a, b) => a - b);
                // Reconstruct mcq_answer from indices
                const reconstructedMcqAnswer = matchedIndices
                  .map(idx => String.fromCharCode(65 + idx))
                  .join(",");
                // Update textAnswer to ensure consistency
                const reconstructedLabels = matchedIndices
                  .map(idx => {
                    const opt = options[idx];
                    return typeof opt === "string" ? opt : opt.label;
                  })
                  .join(", ");
                textAnswer = reconstructedLabels;
              }
            } else if (textAnswerStr && !textAnswerStr.startsWith("Other:")) {
              // Single label match for multiple choice (edge case)
              const matchedIdx = options.findIndex(opt => {
                const optLabel = typeof opt === "string" ? opt : opt.label;
                return optLabel.trim() === textAnswerStr || optLabel.trim().includes(textAnswerStr);
              });
              if (matchedIdx >= 0) {
                selectedOptionIndices = [matchedIdx];
              }
            }
          } else if (!isMultipleChoice && ans.text_answer && options.length > 0 && !ans.mcq_answer) {
            // Fallback: reconstruct selectedOptionIdx from text_answer for single choice
            const textAnswerStr = ans.text_answer.trim();
            if (!textAnswerStr.startsWith("Other:")) {
              const matchedIdx = options.findIndex(opt => {
                const optLabel = typeof opt === "string" ? opt : opt.label;
                return optLabel.trim() === textAnswerStr || optLabel.trim().includes(textAnswerStr);
              });
              if (matchedIdx >= 0) {
                selectedOptionIdx = matchedIdx;
              }
            }
          }
          
          answersMap.set(qId, {
            questionId: qId,
            textAnswer,
            mcqAnswer: ans.mcq_answer,
            selectedOptionIdx,
            selectedOptionIndices,
            isUserModified: ans.is_user_modified || false,
          });
        }
      );
    }
    
    // Preserve any user-modified answers that aren't in existingData
    currentAnswers.forEach((answer, qId) => {
      if (answer.isUserModified && !answersMap.has(qId)) {
        answersMap.set(qId, answer);
      }
    });

    // Set AI assumptions as initial answers (answer_recommendation.idx or assumed)
    // Auto-select most questions, only leave 1-2 key business questions requiring input
    const QUESTIONS_REQUIRING_INPUT_SET = new Set([3, 7]); // "Does AI need access to private data?" and "Should AI perform actions?"
    questions.forEach((q: MCQQuestion, qIndex: number) => {
      if (answersMap.has(q.id)) return;
      
      // Skip questions that require user input
      if (QUESTIONS_REQUIRING_INPUT_SET.has(qIndex)) return;
      
      const options = Array.isArray(q.options)
        ? q.options.map((o) => (typeof o === "string" ? { label: o } : o))
        : [];
      let idx: number | undefined;
      const qWithRec = q as MCQQuestion & { answerRecommendationIdx?: number };
      if (typeof qWithRec.answerRecommendationIdx === "number") {
        idx = qWithRec.answerRecommendationIdx;
      } else if (q.assumed) {
        const found = options.findIndex(
          (o) => (typeof o === "string" ? o : o.label) === q.assumed
        );
        if (found >= 0) idx = found;
        else if (/^[A-Z]$/.test(q.assumed))
          idx = q.assumed.charCodeAt(0) - 65;
      }
      if (idx != null && idx >= 0 && idx < options.length) {
        const opt = options[idx];
        const label = typeof opt === "string" ? opt : opt.label;
        answersMap.set(q.id, {
          questionId: q.id,
          mcqAnswer: String.fromCharCode(65 + idx),
          selectedOptionIdx: idx,
          textAnswer: label,
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
  }, [questionsData, existingData, recipeId]);

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
      // Validate: all questions must be answered (no NULL in payload)
      const unansweredIds: string[] = [];
      state.questions.forEach((q) => {
        if (state.skippedQuestions.has(q.id)) return;
        const answer = state.answers.get(q.id);
        const options = Array.isArray(q.options)
          ? q.options.map((o) => (typeof o === "string" ? { label: o } : o))
          : [];
        let hasAnswer = false;
        const isMultipleChoice = q.multipleChoice ?? false;
        if (answer?.isOther && answer.otherText?.trim()) {
          hasAnswer = true;
        } else if (isMultipleChoice) {
          // Multiple choice: check if any options are selected
          if (answer?.selectedOptionIndices && answer.selectedOptionIndices.length > 0) {
            hasAnswer = answer.selectedOptionIndices.some(
              idx => idx >= 0 && idx < options.length
            );
          } else if (answer?.textAnswer?.trim()) {
            hasAnswer = true;
          }
        } else {
          // Single choice
          if (answer?.selectedOptionIdx != null && answer.selectedOptionIdx >= 0 && answer.selectedOptionIdx < options.length) {
            hasAnswer = true;
          } else if (answer?.textAnswer?.trim()) {
            hasAnswer = true;
          } else if (answer?.mcqAnswer && options.length > 0) {
            const idx = (answer.mcqAnswer.charCodeAt(0) ?? 65) - 65;
            if (idx >= 0 && idx < options.length) hasAnswer = true;
          }
        }
        if (!hasAnswer) {
          unansweredIds.push(q.id);
        }
      });

      if (unansweredIds.length > 0) {
        setState((prev) => ({
          ...prev,
          unansweredQuestionIds: new Set(unansweredIds),
        }));
        throw new Error(
          `Please answer all questions before submitting. ${unansweredIds.length} question(s) need your input.`
        );
      }

      // Use recipeId from URL if available (new flow), otherwise fall back to projectId (old flow)
      const activeRecipeId = recipeId || recipeIdFromUrl;

      if (!activeRecipeId) {
        console.error(
          "Recipe ID is not set. Current recipeId:",
          recipeId,
          "recipeIdFromUrl:",
          recipeIdFromUrl
        );
        throw new Error("Recipe not initialized. Please refresh the page.");
      }

      // Validate recipeId is a UUID (basic check - should be 36 chars with dashes)
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(activeRecipeId)) {
        console.error(
          "Invalid recipeId format:",
          activeRecipeId,
          "Expected UUID format"
        );
        throw new Error(
          `Invalid recipe ID format. Please refresh the page and try again.`
        );
      }

      console.log("Submitting QA answers with recipeId:", activeRecipeId);

      // Collect all answers - format: { question_id: answer_text }
      const answersPayload: Record<string, string> = {};

      state.questions.forEach((question) => {
        const qId = question.id;
        if (state.skippedQuestions.has(qId)) return;

        const answer = state.answers.get(qId);
        let answerStr: string | undefined;
        const isMultipleChoice = question.multipleChoice ?? false;

        if (answer?.isOther && answer.otherText?.trim()) {
          answerStr = `Other: ${answer.otherText.trim()}`;
        } else if (isMultipleChoice && answer?.selectedOptionIndices && answer.selectedOptionIndices.length > 0) {
          // Multiple choice: format selected options as comma-separated labels
          const options = Array.isArray(question.options)
            ? question.options.map((o) => (typeof o === "string" ? { label: o } : o))
            : [];
          const selectedLabels = answer.selectedOptionIndices
            .filter(idx => idx >= 0 && idx < options.length)
            .map(idx => {
              const opt = options[idx];
              return typeof opt === "string" ? opt : opt.label;
            })
            .join(", ");
          if (selectedLabels) {
            answerStr = selectedLabels;
          } else if (answer?.textAnswer?.trim()) {
            answerStr = answer.textAnswer.trim();
          }
        } else if (answer?.textAnswer?.trim()) {
          answerStr = answer.textAnswer.trim();
        } else if (answer?.mcqAnswer && question.options) {
          const options = Array.isArray(question.options)
            ? question.options.map((o) => (typeof o === "string" ? { label: o } : o))
            : [];
          const idx = answer.selectedOptionIdx ?? (answer.mcqAnswer?.charCodeAt(0) ?? 65) - 65;
          if (idx >= 0 && idx < options.length) {
            const opt = options[idx];
            answerStr = typeof opt === "string" ? opt : opt.label;
          }
        }

        if (answerStr) {
          answersPayload[qId] = answerStr;
        }
      });

      // Add additional context if provided (as a special question)
      if (state.additionalContext.trim()) {
        answersPayload["additional_context"] = state.additionalContext.trim();
      }

      // Clear localStorage after successful submission since answers are now saved on backend
      if (typeof window !== "undefined" && activeRecipeId) {
        try {
          const storageKey = `qa_answers_${activeRecipeId}`;
          localStorage.removeItem(storageKey);
        } catch (error) {
          console.warn("Failed to clear localStorage after submission:", error);
        }
      }
      
      // Step 1: Submit answers to the recipe
      console.log("[Repo Page] Submitting answers...");
      await SpecService.submitAnswers(activeRecipeId, answersPayload);
      
      // Step 2: Trigger spec generation
      console.log("[Repo Page] Triggering spec generation...");
      const specResponse = await SpecService.triggerSpecGeneration(activeRecipeId);
      
      return specResponse;
    },
    onSuccess: (response: TriggerSpecGenerationResponse) => {
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
      // Always mark as user modified when answer changes
      const updatedAnswer = { ...existing, ...answer, isUserModified: true };
      newAnswers.set(questionId, updatedAnswer);
      
      // Persist to localStorage to survive page navigation
      if (typeof window !== "undefined" && recipeId) {
        try {
          const storageKey = `qa_answers_${recipeId}`;
          const storedAnswers = localStorage.getItem(storageKey);
          const answersToStore = storedAnswers ? JSON.parse(storedAnswers) : {};
          answersToStore[questionId] = {
            textAnswer: updatedAnswer.textAnswer,
            mcqAnswer: updatedAnswer.mcqAnswer,
            selectedOptionIdx: updatedAnswer.selectedOptionIdx,
            selectedOptionIndices: updatedAnswer.selectedOptionIndices,
            isOther: updatedAnswer.isOther,
            otherText: updatedAnswer.otherText,
            isUserModified: true,
          };
          localStorage.setItem(storageKey, JSON.stringify(answersToStore));
        } catch (error) {
          console.warn("Failed to persist answer to localStorage:", error);
        }
      }
      
      // Clear validation highlight when user provides an answer
      const newUnanswered = new Set(prev.unansweredQuestionIds ?? []);
      newUnanswered.delete(questionId);
      return { ...prev, answers: newAnswers, unansweredQuestionIds: newUnanswered };
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

  // Helper function to scroll to the first unanswered question
  const scrollToFirstUnansweredQuestion = (unansweredIds: string[]) => {
    if (unansweredIds.length === 0) return;
    
    // Find the first unanswered question (they're already sorted by criticality)
    const firstUnansweredId = unansweredIds[0];
    const questionRef = questionRefs.current.get(firstUnansweredId);
    
    if (questionRef) {
      questionRef.scrollIntoView({ behavior: "smooth", block: "center" });
      // Add a brief highlight effect
      questionRef.classList.add("ring-2", "ring-amber-400");
      setTimeout(() => {
        questionRef.classList.remove("ring-2", "ring-amber-400");
      }, 2000);
    }
  };

  const handleGeneratePlan = () => {
    // Check for unanswered questions before starting generation
    const unansweredIds: string[] = [];
    state.questions.forEach((q) => {
      if (state.skippedQuestions.has(q.id)) return;
      const answer = state.answers.get(q.id);
      const options = Array.isArray(q.options)
        ? q.options.map((o) => (typeof o === "string" ? { label: o } : o))
        : [];
      let hasAnswer = false;
      const isMultipleChoice = q.multipleChoice ?? false;
      if (answer?.isOther && answer.otherText?.trim()) {
        hasAnswer = true;
      } else if (isMultipleChoice) {
        if (answer?.selectedOptionIndices && answer.selectedOptionIndices.length > 0) {
          hasAnswer = answer.selectedOptionIndices.some(
            idx => idx >= 0 && idx < options.length
          );
        } else if (answer?.textAnswer?.trim()) {
          hasAnswer = true;
        }
      } else {
        if (answer?.selectedOptionIdx != null && answer.selectedOptionIdx >= 0 && answer.selectedOptionIdx < options.length) {
          hasAnswer = true;
        } else if (answer?.textAnswer?.trim()) {
          hasAnswer = true;
        } else if (answer?.mcqAnswer && options.length > 0) {
          const idx = (answer.mcqAnswer.charCodeAt(0) ?? 65) - 65;
          if (idx >= 0 && idx < options.length) hasAnswer = true;
        }
      }
      if (!hasAnswer) {
        unansweredIds.push(q.id);
      }
    });

    // If there are unanswered questions, scroll to the first one and show error
    if (unansweredIds.length > 0) {
      setState((prev) => ({
        ...prev,
        unansweredQuestionIds: new Set(unansweredIds),
      }));
      toast.error(`Please answer all questions. ${unansweredIds.length} question(s) need your input.`);
      scrollToFirstUnansweredQuestion(unansweredIds);
      return;
    }

    setState((prev) => ({ ...prev, isGenerating: true }));
    generatePlanMutation.mutate();
  };

  // Count answered questions (excluding skipped ones)
  const answeredCount = Array.from(state.answers.entries()).filter(
    ([qId, a]) => {
      if (state.skippedQuestions.has(qId)) return false;
      const question = state.questions.find(q => q.id === qId);
      const isMultipleChoice = question?.multipleChoice ?? false;
      
      if (a.isOther && a.otherText?.trim()) return true;
      if (isMultipleChoice && a.selectedOptionIndices && a.selectedOptionIndices.length > 0) return true;
      if (a.selectedOptionIdx != null && a.selectedOptionIdx >= 0) return true;
      if (a.textAnswer?.trim()) return true;
      if (a.mcqAnswer) return true;
      return false;
    }
  ).length;

  // Total questions minus skipped ones
  const activeQuestionCount =
    state.questions.length - state.skippedQuestions.size;
  const skippedCount = state.skippedQuestions.size;

  // Count unanswered (for validation display)
  const unansweredCount = state.questions.filter((q) => {
    if (state.skippedQuestions.has(q.id)) return false;
    const a = state.answers.get(q.id);
    const opts = Array.isArray(q.options)
      ? q.options.map((o) => (typeof o === "string" ? { label: o } : o))
      : [];
    const isMultipleChoice = q.multipleChoice ?? false;
    
    // Check if question has an answer
    const hasAnswer =
      (a?.isOther && a.otherText?.trim()) ||
      (isMultipleChoice && a?.selectedOptionIndices && a.selectedOptionIndices.length > 0 && 
        a.selectedOptionIndices.some(idx => idx >= 0 && idx < opts.length)) ||
      (a?.selectedOptionIdx != null &&
        a.selectedOptionIdx >= 0 &&
        a.selectedOptionIdx < opts.length) ||
      a?.textAnswer?.trim() ||
      (a?.mcqAnswer && opts.length > 0);
    
    return !hasAnswer;
  }).length;

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
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Content */}
        <div className="mt-6 flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex justify-between items-start mb-10">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-primary mb-3">
                  Clarifying Questions
                </h1>
                {featureIdea && (
                  <p className="text-sm text-zinc-600 leading-relaxed max-w-2xl">
                    {featureIdea}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-4">
                <div className="flex items-center gap-3">
                  <Badge icon={Github}>{repoName}</Badge>
                  {branchName && <Badge icon={GitBranch}>{branchName}</Badge>}
                </div>
                {/* <QuestionProgress
                  total={activeQuestionCount}
                  answered={answeredCount}
                  skipped={skippedCount}
                /> */}
              </div>
            </div>
            {state.pageState === "questions" && <AIAnalysisBanner />}
            {/* Loading State - Only show if we don't have questions yet */}
            {(questionsLoading ||
              (questionsPolling && state.questions.length === 0)) && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-400 mx-auto mb-3" />
                  <p className="text-xs text-zinc-500">
                    {questionsPolling
                      ? "Loading questions..."
                      : "Generating questions..."}
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
                      unansweredQuestionIds={state.unansweredQuestionIds}
                      questionRefs={questionRefs}
                      onHover={(questionId) =>
                        setState((prev) => ({
                          ...prev,
                          hoveredQuestion: questionId,
                        }))
                      }
                      onAnswerChange={handleAnswerChange}
                      onToggleOptions={(questionId) =>
                        setState((prev) => {
                          const newExpanded = new Set(prev.expandedOptions);
                          if (newExpanded.has(questionId)) {
                            newExpanded.delete(questionId);
                          } else {
                            newExpanded.add(questionId);
                          }
                          return { ...prev, expandedOptions: newExpanded };
                        })
                      }
                    />
                  );
                });
              })()}
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
             
            <div ref={questionsEndRef} />
          </div>
        </div>

        {/* Additional Context Section */}
      </div>
    </div>
  );
}
