"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import QuestionService from "@/services/QuestionService";
import type { MCQOption } from "@/services/QuestionService";
import SpecService from "@/services/SpecService";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import MediaService from "@/services/MediaService";
import AIAnalysisBanner from "./components/AIAnalysisBanner";
import QuestionSection from "./components/QuestionSection";
import AdditionalContextSection from "./components/AdditionalContextSection";
import QuestionProgress from "./components/QuestionProgress";
import { Card, CardHeader } from "@/components/ui/card";
import { Github, FileText, Loader2, GitBranch, Info } from "lucide-react";
import {
  RecipeQuestionsResponse,
  RecipeQuestion,
  RecipeQuestionNew,
  QuestionOption,
  TriggerSpecGenerationResponse,
} from "@/lib/types/spec";
import type {
  MCQQuestion,
  QuestionAnswer,
  QuestionGenerationStatus,
  RepoPageState,
} from "@/types/question";
import { DEFAULT_SECTION_ORDER } from "@/types/question";
import { ParsingStatusEnum } from "@/lib/Constants";

/** Sort section keys by DEFAULT_SECTION_ORDER, then alphabetically. */
function getSortedSections(sectionKeys: Iterable<string>): string[] {
  return Array.from(sectionKeys).sort((a, b) => {
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
}

const Badge = ({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) => (
  <div className="flex items-center gap-1.5 px-2 py-0.5 border border-border-light rounded text-xs font-medium text-primary-color">
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </div>
);

const RECIPE_ID_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REPO_RECIPE_STORAGE_PREFIX = "repo_recipe_";

/**
 * Legacy /repo route: redirects to /task/[taskId]/qna with the same query params.
 * Recipe ID is taken from ?recipeId= or from localStorage (key repo_recipe_${projectId}) when projectId is present.
 */
export default function RepoRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const recipeIdFromUrl =
      searchParams.get("recipeId") ?? searchParams.get("recipeld");
    const projectId = searchParams.get("projectId");

    let recipeId: string | null = recipeIdFromUrl;

      try {
        // First, try a direct fetch to see if questions are already available
        let questionsData: RecipeQuestionsResponse;
        try {
          questionsData = await QuestionService.getRecipeQuestions(recipeId);

          // If questions are available, use them immediately
          if (questionsData.questions && questionsData.questions.length > 0) {
            console.log(
              "[Repo Page] Questions already available, status:",
              questionsData.generation_status
            );
            processQuestions(questionsData);
            return;
          }

          // No questions yet: show status from API and poll
          setState((prev) => ({
            ...prev,
            questionGenerationStatus:
              questionsData.generation_status as QuestionGenerationStatus,
            questionGenerationError: questionsData.error_message ?? null,
          }));

          if (questionsData.generation_status === "failed") {
            toast.error(
              questionsData.error_message || "Question generation failed"
            );
            setState((prev) => ({ ...prev, pageState: "questions" }));
            return;
          }
        } catch (error) {
          console.log(
            "[Repo Page] Direct fetch failed, will poll instead:",
            error
          );
        }

        // Poll until we have questions or failed
        let attempts = 0;
        while (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, pollInterval));
          attempts++;
          try {
            questionsData = await QuestionService.getRecipeQuestions(recipeId);
            setState((prev) => ({
              ...prev,
              questionGenerationStatus:
                questionsData.generation_status as QuestionGenerationStatus,
              questionGenerationError:
                questionsData.error_message ?? null,
            }));

            if (
              questionsData.questions &&
              questionsData.questions.length > 0
            ) {
              processQuestions(questionsData);
              return;
            }
            if (questionsData.generation_status === "failed") {
              toast.error(
                questionsData.error_message || "Question generation failed"
              );
              setState((prev) => ({ ...prev, pageState: "questions" }));
              return;
            }
          } catch (err: any) {
            if (attempts >= maxAttempts - 1) {
              throw err;
            }
          }
        }

        toast.error("Timeout waiting for questions");
        setState((prev) => ({ ...prev, pageState: "questions" }));
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

            if (isNewFormat) {
              // New API format: options may be {label, description}[] or empty (free-text question)
              const rawOptions = newQ.options && Array.isArray(newQ.options) ? newQ.options : [];
              const options =
                rawOptions.length > 0 && typeof rawOptions[0] === "object"
                  ? (rawOptions as QuestionOption[]).map((opt) => ({
                      label: opt.label,
                      description: opt.description,
                    }))
                  : [];
              const recIdxRaw = newQ.answer_recommendation?.idx;
              let recIdx: number | null = null;
              if (typeof recIdxRaw === "number") {
                recIdx = recIdxRaw;
              } else if (typeof recIdxRaw === "string") {
                const parsed = parseInt(recIdxRaw, 10);
                recIdx = !Number.isNaN(parsed) ? parsed : null;
              }
              // Validate: must be a valid integer, finite, and within bounds of available options
              // If options array is empty or index is invalid, set to null (no recommendation)
              const recIdxValid =
                recIdx != null &&
                Number.isInteger(recIdx) &&
                Number.isFinite(recIdx) &&
                recIdx >= 0 &&
                options.length > 0 &&
                recIdx < options.length &&
                options[recIdx] != null
                  ? recIdx
                  : null;
              const assumedLabel =
                recIdxValid != null &&
                recIdxValid >= 0 &&
                recIdxValid < options.length
                  ? options[recIdxValid].label
                  : undefined;
              return {
                id: newQ.id ?? `q-${index}`,
                section: "General",
                question: newQ.question,
                options,
                needsInput: true, // free-text when no options; "Other" for MCQs
                multipleChoice: newQ.multiple_choice ?? false,
                assumed: assumedLabel,
                reasoning: newQ.answer_recommendation?.reasoning,
                answerRecommendationIdx: recIdxValid,
                expectedAnswerType: newQ.expected_answer_type,
                contextRefs: newQ.context_refs ?? null,
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
        mcqQuestions.forEach((q) => {
          if (initialAnswers.has(q.id)) return; // Skip if already loaded from localStorage
          
          const options = Array.isArray(q.options)
            ? q.options.map((o) => (typeof o === "string" ? { label: o } : o))
            : [];
          
          // Skip if no options available (can't select from empty array)
          if (options.length === 0) return;
          
          let recIdx: number | undefined;
          if (typeof q.answerRecommendationIdx === "number") {
            recIdx = q.answerRecommendationIdx;
          } else if (q.assumed) {
            const found = options.findIndex(
              (o) => (typeof o === "string" ? o : o.label) === q.assumed
            );
            if (found >= 0) recIdx = found;
            else if (/^[A-Z]$/.test(q.assumed)) {
              const letterIdx = q.assumed.charCodeAt(0) - 65;
              // Validate letter index is within bounds
              if (letterIdx >= 0 && letterIdx < options.length) {
                recIdx = letterIdx;
              }
            }
          }
          
          // Validate: must be a valid integer, finite, and within bounds
          if (
            recIdx != null &&
            Number.isInteger(recIdx) &&
            Number.isFinite(recIdx) &&
            recIdx >= 0 &&
            recIdx < options.length &&
            options[recIdx] != null
          ) {
            const opt = options[recIdx];
            const label = typeof opt === "string" ? opt : opt.label;
            const isMultipleChoice = q.multipleChoice ?? false;
            initialAnswers.set(q.id, {
              questionId: q.id,
              mcqAnswer: String.fromCharCode(65 + recIdx),
              selectedOptionIdx: isMultipleChoice ? undefined : recIdx,
              selectedOptionIndices: isMultipleChoice ? [recIdx] : undefined,
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

  // Same as spec: repo = owner/repo (full slug), branch = branch name. Do not split owner/repo.
  const repoName =
    recipeRepoName ||
    repoNameFromUrl ||
    projectData?.repo_name ||
    "Unknown Repository";
  const branchName =
    recipeBranchName || projectData?.branch_name || "main";

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

  // Recover recipeId from URL, or restore from localStorage (e.g. when navigating back from spec)
  useEffect(() => {
    if (recipeIdFromUrl) {
      if (RECIPE_ID_UUID_REGEX.test(recipeIdFromUrl)) {
        console.log(
          "[Repo Page] Recovered recipeId from URL:",
          recipeIdFromUrl
        );
        setRecipeId(recipeIdFromUrl);
        // Persist so we can restore when coming back without recipeId in URL
        if (projectId && typeof window !== "undefined") {
          try {
            localStorage.setItem(
              `${REPO_RECIPE_STORAGE_PREFIX}${projectId}`,
              recipeIdFromUrl
            );
          } catch {
            // ignore
          }
        }
      } else {
        console.warn(
          "[Repo Page] Invalid recipeId format in URL:",
          recipeIdFromUrl
        );
      }
      return;
    }
    // No recipeId in URL: restore from localStorage when projectId is present (e.g. back from spec)
    if (projectId && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(
          `${REPO_RECIPE_STORAGE_PREFIX}${projectId}`
        );
        if (stored) recipeId = stored;
      } catch {
        // ignore
      }
    }
  }, [recipeIdFromUrl, projectId, router]);

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
                ? question.options.map((o: string | MCQOption) =>
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
              
              answerLabels.forEach((answerLabel: string) => {
                const matchedIdx = options.findIndex((opt: string | MCQOption) => {
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
              const matchedIdx = options.findIndex((opt: string | MCQOption) => {
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
              const matchedIdx = options.findIndex((opt: string | MCQOption) => {
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
    questions.forEach((q: MCQQuestion) => {
      if (answersMap.has(q.id)) return;
      const options = Array.isArray(q.options)
        ? q.options.map((o) => (typeof o === "string" ? { label: o } : o))
        : [];
      
      // Skip if no options available (can't select from empty array)
      if (options.length === 0) return;
      
      let idx: number | undefined;
      const qWithRec = q as MCQQuestion & { answerRecommendationIdx?: number };
      if (typeof qWithRec.answerRecommendationIdx === "number") {
        idx = qWithRec.answerRecommendationIdx;
      } else if (q.assumed) {
        const found = options.findIndex(
          (o) => (typeof o === "string" ? o : o.label) === q.assumed
        );
        if (found >= 0) idx = found;
        else if (/^[A-Z]$/.test(q.assumed)) {
          const letterIdx = q.assumed.charCodeAt(0) - 65;
          // Validate letter index is within bounds
          if (letterIdx >= 0 && letterIdx < options.length) {
            idx = letterIdx;
          }
        }
      }
      
      // Validate: must be a valid integer, finite, and within bounds
      if (
        idx != null &&
        Number.isInteger(idx) &&
        Number.isFinite(idx) &&
        idx >= 0 &&
        idx < options.length &&
        options[idx] != null
      ) {
        const opt = options[idx];
        const label = typeof opt === "string" ? opt : opt.label;
        const isMultipleChoice = q.multipleChoice ?? false;
        answersMap.set(q.id, {
          questionId: q.id,
          mcqAnswer: String.fromCharCode(65 + idx),
          selectedOptionIdx: isMultipleChoice ? undefined : idx,
          selectedOptionIndices: isMultipleChoice ? [idx] : undefined,
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

    if (recipeId) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("recipeId");
      params.delete("recipeld");
      const qs = params.toString();
      const path = qs ? `/task/${recipeId}/qna?${qs}` : `/task/${recipeId}/qna`;
      router.replace(path);
      return;
    }

    if (projectId) {
      router.replace(`/newchat?${searchParams.toString()}`);
      return;
    }

    router.replace("/newchat");
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
      Redirecting…
    </div>
  );
}
