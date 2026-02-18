"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import QuestionService from "@/services/QuestionService";
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

export default function RepoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const recipeIdFromUrl = searchParams.get("recipeId") ?? searchParams.get("recipeld"); // support typo "recipeld"
  const repoNameFromUrl = searchParams.get("repoName");
  const featureIdeaFromUrl = searchParams.get("featureIdea") ?? searchParams.get("featureldea"); // support typo "featureldea"
  const questionsEndRef = useRef<HTMLDivElement>(null);

  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [questionsPolling, setQuestionsPolling] = useState(false);
  const [recipeRepoName, setRecipeRepoName] = useState<string | null>(null);
  const [recipeBranchName, setRecipeBranchName] = useState<string | null>(null);

  const [additionalContextDialogOpen, setAdditionalContextDialogOpen] =
    useState(false);
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
    attachmentIds: [],
    attachmentUploading: false,
    questionGenerationStatus: null,
    questionGenerationError: null,
  });

  // Fetch recipe details when recipeId is available (same priority as spec: API then localStorage)
  useEffect(() => {
    const fetchRecipeDetails = async () => {
      if (!recipeId) return;

      let fromStorage: { repo_name?: string; branch_name?: string } | null = null;
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(`recipe_${recipeId}`);
          if (raw) fromStorage = JSON.parse(raw);
        } catch {
          fromStorage = null;
        }
      }

      try {
        console.log("[Repo Page] Fetching recipe details for:", recipeId);
        const recipeDetails = await SpecService.getRecipeDetails(recipeId);
        console.log("[Repo Page] Recipe details received:", recipeDetails);

        // Persist recipeId by project_id so we can restore when navigating back with only projectId
        const projectIdFromRecipe =
          (recipeDetails as { project_id?: string }).project_id;
        if (
          projectIdFromRecipe &&
          typeof window !== "undefined"
        ) {
          try {
            localStorage.setItem(
              `${REPO_RECIPE_STORAGE_PREFIX}${projectIdFromRecipe}`,
              recipeId
            );
          } catch {
            // ignore
          }
        }

        // Same as spec: API first, then localStorage, then fallbacks
        const repo =
          recipeDetails.repo_name?.trim() ||
          fromStorage?.repo_name?.trim() ||
          null;
        const branch =
          recipeDetails.branch_name?.trim() ||
          fromStorage?.branch_name?.trim() ||
          null;
        setRecipeRepoName(repo);
        setRecipeBranchName(branch ?? "main");
      } catch (error: any) {
        console.error("[Repo Page] Failed to fetch recipe details:", error);
        // On error, use localStorage so repo/branch can still show (same as spec)
        setRecipeRepoName(
          fromStorage?.repo_name?.trim() || null
        );
        setRecipeBranchName(
          fromStorage?.branch_name?.trim() || "main"
        );
      }
    };

    fetchRecipeDetails();
  }, [recipeId]);

  // Fetch questions when recipeId is available (new recipe codegen flow)
  useEffect(() => {
    if (!recipeId) return;

    const pollInterval = 3000;
    const maxAttempts = 60;

    const fetchQuestions = async () => {
      setQuestionsPolling(true);
      setState((prev) => ({
        ...prev,
        pageState: "generating",
        questionGenerationStatus: null,
        questionGenerationError: null,
      }));

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
              const recIdx =
                typeof recIdxRaw === "number"
                  ? recIdxRaw
                  : typeof recIdxRaw === "string"
                    ? parseInt(recIdxRaw, 10)
                    : null;
              const recIdxValid =
                recIdx != null && !Number.isNaN(recIdx) ? recIdx : null;
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
        if (stored && RECIPE_ID_UUID_REGEX.test(stored)) {
          console.log(
            "[Repo Page] Restored recipeId from localStorage for project:",
            projectId
          );
          setRecipeId(stored);
          const url = new URL(window.location.href);
          url.searchParams.set("recipeId", stored);
          router.replace(url.pathname + url.search, { scroll: false });
        }
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
    questions.forEach((q: MCQQuestion) => {
      if (answersMap.has(q.id)) return;
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
            answerStr = typeof options[idx] === "string" ? options[idx] : options[idx].label;
          }
        }

        if (answerStr) {
          answersPayload[qId] = answerStr;
        }
      });

      // Add additional context if provided
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

      await SpecService.submitAnswers(activeRecipeId, answersPayload);
      const { runId } = await SpecService.startSpecGenerationStream(activeRecipeId, {
        consumeStream: false,
      });
      return { runId };
    },
    onSuccess: (data: { runId?: string } | void) => {
      toast.success("Spec generation started successfully");
      const activeRecipeId = recipeId || recipeIdFromUrl;
      if (!activeRecipeId) {
        console.error("recipeId is not set after successful submission");
        toast.error("Navigation failed: Recipe ID missing");
        return;
      }
      const runId = data?.runId?.trim();
      if (!runId) {
        toast.info("Live streaming unavailable for this run. You’ll see progress by polling.");
      }
      const specPath = runId
        ? `/task/${activeRecipeId}/spec?run_id=${encodeURIComponent(runId)}`
        : `/task/${activeRecipeId}/spec`;
      router.push(specPath);
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

  const handleToggleOptions = (questionId: string) => {
    setState((prev) => {
      const newExpanded = new Set(prev.expandedOptions);
      if (newExpanded.has(questionId)) newExpanded.delete(questionId);
      else newExpanded.add(questionId);
      return { ...prev, expandedOptions: newExpanded };
    });
  };

  const handleSaveQuestion = (_questionId: string) => {
    // No-op: inline edits are persisted via onAnswerChange
  };

  const handleCancelQuestion = (_questionId: string) => {
    // No-op: collapse options if needed
  };

  const handleGeneratePlan = () => {
    setState((prev) => ({ ...prev, isGenerating: true }));
    generatePlanMutation.mutate();
  };

  const handleAttachmentChange = async (
    files: File[],
    removedIndex?: number
  ) => {
    const idsAfterRemove =
      removedIndex !== undefined
        ? state.attachmentIds.filter((_, i) => i !== removedIndex)
        : [...state.attachmentIds];
    if (files.length <= idsAfterRemove.length) {
      setState((prev) => ({ ...prev, attachmentIds: idsAfterRemove }));
      return;
    }
    setState((prev) => ({ ...prev, attachmentUploading: true }));
    try {
      const newIds: string[] = [];
      for (let i = idsAfterRemove.length; i < files.length; i++) {
        const result = await MediaService.uploadFile(files[i]);
        newIds.push(result.id);
      }
      setState((prev) => ({
        ...prev,
        attachmentIds: idsAfterRemove.concat(newIds),
        attachmentUploading: false,
      }));
    } catch (err: unknown) {
      setState((prev) => ({ ...prev, attachmentUploading: false }));
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : null;
      toast.error(
        typeof message === "string" ? message : "Failed to upload attachment."
      );
    }
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

  // Figma: flat list for right sidebar
  const sortedSections = getSortedSections(state.sections.keys());
  const questionsInOrder = sortedSections.flatMap(
    (s) => state.sections.get(s) || []
  ).filter((q) => state.visibleQuestions.has(q.id));
  const focusedQuestion =
    (state.hoveredQuestion &&
      questionsInOrder.find((q) => q.id === state.hoveredQuestion)) ||
    questionsInOrder[0];

  // Allow either projectId (old flow) or recipeId (new recipe codegen flow)
  if (!projectId && !recipeId && !recipeIdFromUrl) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">No project ID or recipe ID provided</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-primary-color font-sans antialiased">
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: questions area — same structure as spec chat */}
        <div
          className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden"
          style={{ backgroundColor: "#FAF8F7" }}
        >
          {/* Chat-style header: title only (repo/branch moved to right panel top) */}
          <div className="flex justify-between items-center px-6 pt-6 pb-4 shrink-0">
            <h1 className="text-lg font-bold text-primary-color truncate capitalize">
              {featureIdea?.slice(0, 50) || "Clarifying Questions"}
              {(featureIdea?.length ?? 0) > 50 ? "…" : ""}
            </h1>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            <div className="max-w-3xl mx-auto space-y-6">
              {state.pageState === "questions" && <AIAnalysisBanner />}
            {/* Status / loading: show backend status instead of generic spinner when we have recipeId */}
            {(questionsLoading ||
              (questionsPolling && state.questions.length === 0)) && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center max-w-md space-y-3">
                  {!questionsLoading && state.questionGenerationStatus ? (
                    <>
                      {state.questionGenerationStatus !== "failed" && (
                        <Loader2 className="w-5 h-5 animate-spin text-[#102C2C] mx-auto mb-2" />
                      )}
                      <p className="text-sm font-medium text-primary-color">
                        {state.questionGenerationStatus === "pending" &&
                          "Questions are queued for generation…"}
                        {state.questionGenerationStatus === "processing" &&
                          "Analyzing repository and generating questions…"}
                        {state.questionGenerationStatus === "completed" &&
                          "Preparing questions…"}
                        {state.questionGenerationStatus === "failed" &&
                          "Question generation failed"}
                        {!state.questionGenerationStatus && "Loading…"}
                      </p>
                      {state.questionGenerationError && (
                        <p className="text-xs text-red-600 mt-1">
                          {state.questionGenerationError}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-[#102C2C] mx-auto mb-2" />
                      <p className="text-sm text-zinc-600">
                        {questionsLoading
                          ? "Creating recipe and generating questions…"
                          : "Loading…"}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
            {state.pageState === "questions" &&
              (() => {
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
                      unansweredQuestionIds={
                        state.unansweredQuestionIds ?? new Set()
                      }
                      onHover={(questionId) =>
                        setState((prev) => ({
                          ...prev,
                          hoveredQuestion: questionId,
                        }))
                      }
                      onAnswerChange={handleAnswerChange}
                      onSave={handleSaveQuestion}
                      onCancel={handleCancelQuestion}
                      onToggleOptions={handleToggleOptions}
                      onToggleSkip={handleToggleSkip}
                    />
                  );
                });
              })()}
            {state.pageState === "questions" && (
              <AdditionalContextSection
                open={additionalContextDialogOpen}
                onOpenChange={setAdditionalContextDialogOpen}
                context={state.additionalContext}
                onContextChange={(context) =>
                  setState((prev) => ({ ...prev, additionalContext: context }))
                }
                onGeneratePlan={handleGeneratePlan}
                isGenerating={state.isGenerating}
                recipeId={recipeId}
                onAttachmentChange={handleAttachmentChange}
                attachmentUploading={state.attachmentUploading}
              />
            )}
            <div ref={questionsEndRef} />
          </div>
          </div>
        </div>

        {/* Right: question list — half-and-half like spec */}
        {state.pageState === "questions" && questionsInOrder.length > 0 && (
          <div
            className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden"
            style={{ backgroundColor: "#FAF8F7" }}
          >
            <aside className="h-full w-full min-w-[280px] flex flex-col overflow-hidden min-h-0">
              <div className="px-10 py-3 flex items-center gap-2 flex-wrap shrink-0 justify-end">
                {repoName && <Badge icon={Github}>{repoName}</Badge>}
                {branchName && <Badge icon={GitBranch}>{branchName}</Badge>}
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 py-3 pl-6 pr-8">
                <h2 className="text-sm font-bold mb-2 text-left text-primary-color">
                  Clarifying Questions
                </h2>
                <ul className="space-y-0.5">
                  {questionsInOrder.map((q) => {
                    const isFocused = q.id === focusedQuestion?.id;
                    return (
                      <li key={q.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setState((prev) => ({
                              ...prev,
                              hoveredQuestion: q.id,
                            }));
                            const el = document.getElementById(`question-${q.id}`);
                            el?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className={`w-full text-left text-xs leading-relaxed py-1.5 pl-3 pr-2 rounded-r border-l-2 flex items-start gap-2 cursor-pointer transition-colors hover:opacity-90 ${isFocused ? "font-medium" : "font-normal"}`}
                          style={{
                            color: isFocused ? "#000000" : "#506561",
                            backgroundColor: isFocused ? "#B6E3431A" : "transparent",
                            borderLeftColor: isFocused ? "#B6E343" : "#E4E4E4",
                          }}
                        >
                          <span className="flex-1">{q.question}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
