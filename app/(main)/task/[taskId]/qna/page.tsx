"use client";

import { useState, useEffect, useRef, useMemo, useCallback, startTransition } from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/state/store";
import { setRepoAndBranchForTask } from "@/lib/state/Reducers/RepoAndBranch";
import QuestionService from "@/services/QuestionService";
import SpecService from "@/services/SpecService";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import MediaService from "@/services/MediaService";
import QuestionSection from "./components/QuestionSection";
import AdditionalContextSection from "./components/AdditionalContextSection";
import QuestionProgress from "./components/QuestionProgress";
import { SharedMarkdown } from "@/components/chat/SharedMarkdown";
import { getStreamEventPayload, normalizeMarkdownForPreview } from "@/lib/utils";
import {
  StreamTimeline,
  type StreamTimelineItem,
} from "@/components/stream/StreamTimeline";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Check,
  ChevronDown,
  FileText,
  Github,
  GitBranch,
  Info,
  Loader2,
  Wrench,
} from "lucide-react";
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

function getParsingDisplayStatus(status: string): string {
  switch (status) {
    case ParsingStatusEnum.SUBMITTED:
      return "Cloning your repository";
    case ParsingStatusEnum.CLONED:
      return "Parsing your code";
    case ParsingStatusEnum.PARSED:
    case ParsingStatusEnum.INFERRING:
      return "Understanding your codebase";
    default:
      return status;
  }
}

export default function QnaPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const recipeIdFromPath = (params?.taskId as string) ?? null;
  const recipeIdFromUrl = searchParams.get("recipeId") ?? searchParams.get("recipeld");
  const recipeId = recipeIdFromPath ?? recipeIdFromUrl ?? null;
  const projectId = searchParams.get("projectId");
  const runIdFromUrl = searchParams.get("run_id");
  const repoNameFromUrl = searchParams.get("repoName");
  const featureIdeaFromUrl = searchParams.get("featureIdea") ?? searchParams.get("featureldea");
  const questionsEndRef = useRef<HTMLDivElement>(null);
  
  // Redux state for repo/branch context (same as spec page)
  const repoBranchByTask = useSelector(
    (state: RootState) => state.RepoAndBranch.byTaskId
  );
  const storedRepoContext = recipeId
    ? repoBranchByTask?.[recipeId]
    : undefined;
  const [questionsPolling, setQuestionsPolling] = useState(false);
  const [recipeRepoName, setRecipeRepoName] = useState<string | null>(null);
  const [recipeBranchName, setRecipeBranchName] = useState<string | null>(null);
  const [parsingStatus, setParsingStatus] = useState<string>("");
  /** Real stream state (SSE); interleaved timeline when streaming */
  const [streamProgress, setStreamProgress] = useState<{ step: string; message: string } | null>(null);
  const [streamItems, setStreamItems] = useState<StreamTimelineItem[]>([]);
  const [isStreamingActive, setIsStreamingActive] = useState(false);
  const streamAbortRef = useRef<AbortController | null>(null);
  const streamItemIdRef = useRef(0);
  const streamOutputEndRef = useRef<HTMLDivElement>(null);
  /** Guard: avoid starting question generation (POST) more than once per recipe (e.g. Strict Mode or effect re-run) */
  const questionGenerationStartedForRecipeRef = useRef<string | null>(null);
  /** Run ID from POST response so stream connects immediately without waiting for URL update */
  const [runIdForStream, setRunIdForStream] = useState<string | null>(null);
  const hasRestoredThinkingRef = useRef<string | null>(null);
  /** Used to persist answer to localStorage after setState (keeps updater pure) */
  const answerPersistRef = useRef<{
    recipeId: string;
    questionId: string;
    updatedAnswer: QuestionAnswer;
  } | null>(null);
  const THINKING_STORAGE_KEY_QNA = "potpie_thinking_qna";

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

      const repoFromUrl =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("repoName")
          : null;

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
        console.log("[QnA Page] Fetching recipe details for:", recipeId);
        const recipeDetails = await SpecService.getRecipeDetails(recipeId);
        console.log("[QnA Page] Recipe details received:", recipeDetails);

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
        startTransition(() => {
          setRecipeRepoName(repo);
          setRecipeBranchName(branch ?? "main");
        });

        // Don't overwrite Redux when user navigated with ?repoName= (explicit selection);
        // backend can return a different repo and would replace the user's choice.
        if (repo && !repoFromUrl?.trim()) {
          dispatch(
            setRepoAndBranchForTask({
              taskId: recipeId,
              repoName: repo,
              branchName: branch ?? "main",
            })
          );
        }
      } catch (error: any) {
        console.error("[QnA Page] Failed to fetch recipe details:", error);
        // On error, use localStorage so repo/branch can still show (same as spec)
        startTransition(() => {
          setRecipeRepoName(
            fromStorage?.repo_name?.trim() || null
          );
          setRecipeBranchName(
            fromStorage?.branch_name?.trim() || "main"
          );
        });
      }
    };

    fetchRecipeDetails();
  }, [recipeId, dispatch]);

  // Poll cloning/parsing status when projectId is present (build flow: same messages as newchat)
  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    const pollIntervalMs = 5000;
    const maxDurationMs = 45 * 60 * 1000;
    const startTime = Date.now();

    const poll = async () => {
      try {
        let status = await BranchAndRepositoryService.getParsingStatus(projectId);
        if (cancelled) return;
        setParsingStatus(status === ParsingStatusEnum.READY || status === ParsingStatusEnum.ERROR ? status : getParsingDisplayStatus(status));

        while (
          status !== ParsingStatusEnum.READY &&
          status !== ParsingStatusEnum.ERROR &&
          Date.now() - startTime < maxDurationMs
        ) {
          await new Promise((r) => setTimeout(r, pollIntervalMs));
          if (cancelled) return;
          status = await BranchAndRepositoryService.getParsingStatus(projectId);
          if (cancelled) return;
          setParsingStatus(status === ParsingStatusEnum.READY || status === ParsingStatusEnum.ERROR ? status : getParsingDisplayStatus(status));
        }

        if (Date.now() - startTime >= maxDurationMs && status !== ParsingStatusEnum.READY) {
          setParsingStatus(ParsingStatusEnum.ERROR);
        }
      } catch {
        if (!cancelled) setParsingStatus(ParsingStatusEnum.ERROR);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Shared: process questions response and update state (used by polling and stream "end")
  const processQuestions = useCallback((questionsData: RecipeQuestionsResponse) => {
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
              const recIdx = typeof recIdxRaw === "number" ? recIdxRaw : null;
              const assumedLabel =
                recIdx != null && recIdx >= 0 && recIdx < options.length
                  ? options[recIdx].label
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
                answerRecommendationIdx: recIdx ?? null,
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
            "[QnA Page] No questions available, status:",
            questionsData.generation_status
        );
        setState((prev) => ({ ...prev, pageState: "questions" }));
      }
  }, [recipeId]);

  // When run_id in URL, connect to questions stream (streaming part from last working commit – no poll inside this effect)
  useEffect(() => {
    if (!recipeId || !runIdFromUrl) return;

    let cancelled = false;
    streamAbortRef.current?.abort();
    streamAbortRef.current = new AbortController();
    setIsStreamingActive(true);
    setStreamProgress({ step: "Connecting…", message: "Opening live stream" });
    setStreamItems([]);

    const onEvent = (eventType: string, data: Record<string, unknown>) => {
      if (cancelled) return;
      const payload = getStreamEventPayload(data);
      console.log("[QnA Stream] Event:", eventType, payload);
      if (eventType === "queued") {
        setStreamProgress({ step: "Queued", message: (payload?.message as string) ?? "Task queued for processing" });
      }
      if (eventType === "start") {
        setStreamProgress({ step: "Starting", message: (payload?.message as string) ?? "Starting question generation" });
      }
      if (eventType === "progress" && payload) {
        const msg = (payload.message as string) ?? (typeof payload.message === "object" ? "" : String(payload.message ?? ""));
        setStreamProgress({
          step: (payload.step as string) ?? "Processing",
          message: msg,
        });
      }
      if (eventType === "chunk" && payload?.content) {
        const content = String(payload.content);
        setStreamItems((prev) => {
          const last = prev[prev.length - 1];
          if (last?.type === "chunk") {
            return [...prev.slice(0, -1), { ...last, content: last.content + content }];
          }
          return [...prev, { type: "chunk", id: `chunk-${++streamItemIdRef.current}`, content }];
        });
      }
      if (eventType === "tool_call_start" && payload?.tool) {
        const call_id = (payload.call_id as string) ?? `tool-${++streamItemIdRef.current}`;
        setStreamItems((prev) => [
          ...prev,
          { type: "tool", id: call_id, label: String(payload.tool), phase: "running" as const },
        ]);
      }
      if (eventType === "tool_call_end" && payload?.tool) {
        const call_id = payload.call_id as string | undefined;
        const label = String(payload.tool);
        const result = payload.result;
        const segmentContent =
          result !== undefined && result !== null
            ? typeof result === "object"
              ? JSON.stringify(result, null, 2)
              : String(result)
            : "";
        setStreamItems((prev) => {
          const idx = call_id
            ? prev.findIndex((it) => it.type === "tool" && it.id === call_id)
            : prev.findLastIndex(
                (it) => it.type === "tool" && it.phase === "running" && it.label === label
              );
          if (idx === -1) return prev;
          const next = [...prev];
          const cur = next[idx];
          if (cur.type === "tool")
            next[idx] = { ...cur, phase: "done" as const, result: segmentContent };
          return next;
        });
      }
      if (eventType === "subagent_start" && payload?.agent) {
        const id = `subagent-${++streamItemIdRef.current}`;
        setStreamItems((prev) => [
          ...prev,
          { type: "tool", id, label: `Agent: ${String(payload.agent)}`, phase: "running" as const },
        ]);
      }
      if (eventType === "subagent_end" && payload?.agent) {
        const duration = payload.duration_ms != null ? ` (${payload.duration_ms}ms)` : "";
        const label = `Agent: ${String(payload.agent)}`;
        setStreamItems((prev) => {
          const idx = prev.findLastIndex(
            (it) => it.type === "tool" && it.phase === "running" && it.label === label
          );
          if (idx === -1) return prev;
          const next = [...prev];
          const cur = next[idx];
          if (cur.type === "tool")
            next[idx] = { ...cur, phase: "done" as const, result: `Done${duration}` };
          return next;
        });
      }
      if (eventType === "end") {
        setStreamProgress(null);
        setIsStreamingActive(false);
        setRunIdForStream(null);
        QuestionService.getRecipeQuestions(recipeId).then(processQuestions).catch(() => {});
        const params = new URLSearchParams(searchParams.toString());
        params.delete("run_id");
        router.replace(`/task/${recipeId}/qna?${params.toString()}`, { scroll: false });
      }
      if (eventType === "error") {
        setStreamProgress(null);
        setStreamItems([]);
        setIsStreamingActive(false);
        setRunIdForStream(null);
        QuestionService.getRecipeQuestions(recipeId).then(processQuestions).catch(() => {});
        const params = new URLSearchParams(searchParams.toString());
        params.delete("run_id");
        router.replace(`/task/${recipeId}/qna?${params.toString()}`, { scroll: false });
      }
    };

    QuestionService.connectQuestionsStream(recipeId, runIdFromUrl, {
      signal: streamAbortRef.current?.signal,
      onEvent,
      onError: (msg) => {
        if (cancelled) return;
        setStreamProgress(null);
        setStreamItems([]);
        setIsStreamingActive(false);
        setRunIdForStream(null);
        toast.error(msg || "Stream failed.");
        QuestionService.getRecipeQuestions(recipeId).then(processQuestions).catch(() => {});
        const params = new URLSearchParams(searchParams.toString());
        params.delete("run_id");
        router.replace(`/task/${recipeId}/qna?${params.toString()}`, { scroll: false });
      },
    });

    return () => {
      cancelled = true;
      streamAbortRef.current?.abort();
    };
  }, [recipeId, runIdFromUrl, processQuestions, router, searchParams]);

  // Reset questionGenerationStartedForRecipeRef when recipeId changes (cleanup-based)
  useEffect(() => {
    if (!recipeId) return;
    // On mount or recipeId change, reset is handled via cleanup
    return () => {
      // When recipeId changes or component unmounts, reset the guard
      // This ensures each recipe can trigger one POST
      questionGenerationStartedForRecipeRef.current = null;
    };
  }, [recipeId]);

  // Fetch questions when recipeId is available: try GET first (run_id from response like plan); else POST to start and get run_id; then run_id effect connects stream
  useEffect(() => {
    if (!recipeId) return;
    if (runIdFromUrl) return;

    const pollInterval = 3000;
    const maxAttempts = 60;

    const fetchQuestions = async () => {
      // Avoid redundant setState on start: pageState is already "generating" from initial state.
      // Setting questionsPolling(true) here caused a re-render flicker; we set it only when polling.
      try {
        // Same as plan: try GET first; if backend includes run_id, add to URL so stream connects (no POST needed)
        let questionsData: RecipeQuestionsResponse;
        try {
          questionsData = await QuestionService.getRecipeQuestions(recipeId);
          const runIdFromApi = questionsData.run_id ?? (questionsData as unknown as Record<string, unknown>).run_id;
          
          // If generation is in terminal state (completed/failed), clear any stale run_id from URL
          const isTerminal = questionsData.generation_status === "completed" || questionsData.generation_status === "failed";
          if (isTerminal && runIdFromUrl) {
            const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
            params.delete("run_id");
            router.replace(`/task/${recipeId}/qna?${params.toString()}`, { scroll: false });
          }
          
          if (typeof runIdFromApi === "string" && runIdFromApi.trim()) {
            setRunIdForStream(runIdFromApi.trim());
            const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
            params.set("run_id", runIdFromApi.trim());
            router.replace(`/task/${recipeId}/qna?${params.toString()}`, { scroll: false });
            return;
          }
          if (questionsData.questions && questionsData.questions.length > 0) {
            processQuestions(questionsData);
            return;
          }
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
            "[QnA Page] Initial GET failed, will try POST then poll:",
            error
          );
        }

        // No run_id from GET: start generation via POST at most once per recipe (avoid double-start from Strict Mode or effect re-run)
        let gotRunId = false;
        const alreadyStartedForThisRecipe = questionGenerationStartedForRecipeRef.current === recipeId;
        if (!alreadyStartedForThisRecipe) {
          questionGenerationStartedForRecipeRef.current = recipeId;
          try {
            streamAbortRef.current?.abort();
            streamAbortRef.current = new AbortController();
            const { runId } = await QuestionService.startQuestionsGenerationStream(recipeId, {
              consumeStream: false,
              signal: streamAbortRef.current?.signal,
            });
            if (runId?.trim()) {
              setRunIdForStream(runId.trim());
              const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
              params.set("run_id", runId.trim());
              router.replace(`/task/${recipeId}/qna?${params.toString()}`, { scroll: false });
              gotRunId = true;
            } else {
              const noRunIdMessage =
                "Server did not return a stream ID. If generation was already started, refresh the page to reconnect.";
              console.warn("[QnA Page] POST succeeded but X-Run-Id header was empty or missing");
              setState((prev) => ({
                ...prev,
                pageState: "questions",
                questionGenerationError: noRunIdMessage,
              }));
              toast.error(noRunIdMessage);
            }
          } catch (e) {
            const errMessage =
              e instanceof Error ? e.message : String(e);
            console.warn("[QnA Page] Questions stream POST failed:", errMessage);
            questionGenerationStartedForRecipeRef.current = null;
            // Surface error so user sees why questions aren't generating (e.g. 400 "Recipe must be in PENDING_QUESTIONS state")
            let displayMessage = errMessage;
            try {
              if (typeof errMessage === "string" && errMessage.startsWith("{")) {
                const parsed = JSON.parse(errMessage) as { detail?: string };
                if (parsed?.detail) displayMessage = parsed.detail;
              }
            } catch {
              // use errMessage as-is
            }
            setState((prev) => ({
              ...prev,
              pageState: "questions",
              questionGenerationError: displayMessage,
            }));
            toast.error(displayMessage);
            return; // Don't fall through to polling when POST failed
          }
        }

        if (gotRunId) return;

        // Fallback: poll GET until questions ready or run_id appears
        try {
          questionsData = await QuestionService.getRecipeQuestions(recipeId);
          const runIdFromFallback = questionsData.run_id ?? (questionsData as unknown as Record<string, unknown>).run_id;
          if (typeof runIdFromFallback === "string" && runIdFromFallback.trim()) {
            setRunIdForStream(runIdFromFallback.trim());
            const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
            params.set("run_id", runIdFromFallback.trim());
            router.replace(`/task/${recipeId}/qna?${params.toString()}`, { scroll: false });
            return;
          }
          if (questionsData.questions && questionsData.questions.length > 0) {
            processQuestions(questionsData);
            return;
          }
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
            "[QnA Page] Direct fetch failed, will poll instead:",
            error
          );
        }

        let attempts = 0;
        setQuestionsPolling(true); // Show polling state only when we actually poll
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

            const runIdFromPoll = questionsData.run_id ?? (questionsData as unknown as Record<string, unknown>).run_id;
            if (typeof runIdFromPoll === "string" && runIdFromPoll.trim()) {
              setRunIdForStream(runIdFromPoll.trim());
              const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
              params.set("run_id", runIdFromPoll.trim());
              router.replace(`/task/${recipeId}/qna?${params.toString()}`, { scroll: false });
              return;
            }
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
          } catch (err: unknown) {
            if (attempts >= maxAttempts - 1) throw err;
          }
        }

        const timeoutMessage = "Timeout waiting for questions";
        toast.error(timeoutMessage);
        setState((prev) => ({
          ...prev,
          pageState: "questions",
          questionGenerationError: timeoutMessage,
        }));
      } catch (error: unknown) {
        const err = error as { message?: string };
        const errMessage = err?.message || "Failed to load questions";
        console.error("Error fetching questions:", error);
        toast.error(errMessage);
        setState((prev) => ({
          ...prev,
          pageState: "questions",
          questionGenerationError: errMessage,
        }));
      } finally {
        setQuestionsPolling(false);
      }
    };

    fetchQuestions();
  }, [recipeId, runIdFromUrl, processQuestions, router]);

  // Generate questions on page load (old flow - kept for backward compatibility)
  // IMPORTANT: This page is /task/[taskId]/qna, so recipeIdFromPath should ALWAYS be present.
  // We disable this query entirely on this route to avoid race conditions where recipeId is
  // briefly null on first render (before useParams hydrates). The new recipe-based flow
  // (fetch effect above) handles question generation via startQuestionsGenerationStream.
  const isOnTaskRoute = typeof params?.taskId === "string" && params.taskId.length > 0;
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
    // Disable on task routes entirely; only use old flow on non-task pages (if any)
    enabled: !!projectId && !recipeId && !isOnTaskRoute,
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

  // Prefer URL param (user's explicit selection from newchat) so it's not overwritten by backend/Redux
  const repoName =
    repoNameFromUrl ||
    storedRepoContext?.repoName ||
    recipeRepoName ||
    projectData?.repo_name ||
    "Unknown Repository";
  const branchName =
    storedRepoContext?.branchName ||
    recipeBranchName ||
    projectData?.branch_name ||
    "main";

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

  // Restore recipeId from localStorage and redirect to task/qna when projectId present but no taskId in path (e.g. old /repo link)
  useEffect(() => {
    if (recipeIdFromPath) return;
    if (projectId && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(
          `${REPO_RECIPE_STORAGE_PREFIX}${projectId}`
        );
        if (stored && RECIPE_ID_UUID_REGEX.test(stored)) {
          const qs = new URLSearchParams(searchParams.toString());
          router.replace(`/task/${stored}/qna?${qs.toString()}`, { scroll: false });
        }
      } catch {
        // ignore
      }
    }
  }, [recipeIdFromPath, projectId, router, searchParams]);

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
                ? question.options.map(
                    (o: string | { label: string; description?: string }) =>
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
                const matchedIdx = options.findIndex((opt: string | { label: string }) => {
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
              const matchedIdx = options.findIndex((opt: string | { label: string }) => {
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
              const matchedIdx = options.findIndex((opt: string | { label: string }) => {
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
      if (!recipeId) {
        throw new Error("Recipe not initialized. Please refresh the page.");
      }

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(recipeId)) {
        throw new Error(
          `Invalid recipe ID format. Please refresh the page and try again.`
        );
      }

      console.log("[QnA Page] Submitting QA answers with recipeId:", recipeId);

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

      // Submit answers (idempotent on backend)
      await SpecService.submitAnswers(recipeId, answersPayload);

      // Decide whether to start first-time spec generation or force a fresh regeneration.
      let shouldRegenerate = false;
      try {
        const current = await SpecService.getSpecProgressByRecipeId(recipeId);
        const genStatus =
          "generation_status" in current
            ? (current as any).generation_status
            : "spec_gen_status" in current
              ? (current as any).spec_gen_status
              : "spec_generation_step_status" in current
                ? (current as any).spec_generation_step_status
                : null;
        // If any spec generation has already been started (pending/processing/completed/failed),
        // treat this click as an explicit request to regenerate.
        if (genStatus && genStatus !== "not_started") {
          shouldRegenerate = true;
        }
      } catch {
        // If status lookup fails, assume first-time generation.
      }

      let runId: string | undefined;

      if (shouldRegenerate) {
        // Start a fresh spec generation run; SpecPage will poll /spec and, if provided,
        // attach to the new run's stream via its own run_id handshake.
        await SpecService.regenerateSpec(recipeId);
      } else {
        // First-time generation: start via generate-stream to get run_id for live updates.
        const res = await SpecService.startSpecGenerationStream(recipeId, {
          consumeStream: false,
        });
        runId = res.runId;
      }

      // Clear localStorage only after both calls succeed so we don't lose answers on submission failure
      if (typeof window !== "undefined" && recipeId) {
        try {
          const storageKey = `qa_answers_${recipeId}`;
          localStorage.removeItem(storageKey);
        } catch (error) {
          console.warn("Failed to clear localStorage after submission:", error);
        }
      }

      return { runId };
    },
    onSuccess: (data: { runId?: string } | void) => {
      toast.success("Spec generation started successfully");
      if (!recipeId) {
        console.error("recipeId is not set after successful submission");
        toast.error("Navigation failed: Recipe ID missing");
        return;
      }
      const runId = data?.runId?.trim();
      if (!runId) {
        toast.info("Live streaming unavailable for this run. You’ll see progress by polling.");
      }
      const specPath = runId
        ? `/task/${recipeId}/spec?run_id=${encodeURIComponent(runId)}`
        : `/task/${recipeId}/spec`;
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
      const updatedAnswer = { ...existing, ...answer, isUserModified: true };
      newAnswers.set(questionId, updatedAnswer);
      const newUnanswered = new Set(prev.unansweredQuestionIds ?? []);
      newUnanswered.delete(questionId);

      if (recipeId) {
        answerPersistRef.current = { recipeId, questionId, updatedAnswer };
      }

      return { ...prev, answers: newAnswers, unansweredQuestionIds: newUnanswered };
    });

    // Persist to localStorage after state update (keeps setState updater pure)
    queueMicrotask(() => {
      const p = answerPersistRef.current;
      if (!p || typeof window === "undefined") return;
      answerPersistRef.current = null;
      try {
        const storageKey = `qa_answers_${p.recipeId}`;
        const storedAnswers = localStorage.getItem(storageKey);
        const answersToStore = storedAnswers ? JSON.parse(storedAnswers) : {};
        answersToStore[p.questionId] = {
          textAnswer: p.updatedAnswer.textAnswer,
          mcqAnswer: p.updatedAnswer.mcqAnswer,
          selectedOptionIdx: p.updatedAnswer.selectedOptionIdx,
          selectedOptionIndices: p.updatedAnswer.selectedOptionIndices,
          isOther: p.updatedAnswer.isOther,
          otherText: p.updatedAnswer.otherText,
          isUserModified: true,
        };
        localStorage.setItem(storageKey, JSON.stringify(answersToStore));
      } catch (error) {
        console.warn("Failed to persist answer to localStorage:", error);
      }
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

  // Drive thinking stream UI from parsing + question status (same layout as spec)
  // Include pageState so generating UI shows from first frame (avoids flicker before fetch starts)
  const questionsCount = state.questions.length;
  const isGenerating =
    isStreamingActive ||
    (parsingStatus && parsingStatus !== ParsingStatusEnum.READY && parsingStatus !== ParsingStatusEnum.ERROR) ||
    questionsLoading ||
    (questionsPolling && questionsCount === 0) ||
    (state.pageState === "generating" && questionsCount === 0);

  const {
    streamProgress: derivedProgress,
    derivedItems,
  } = useMemo(() => {
    const events: { id: string; type: string; label: string; call_id?: string }[] = [];
    const segments: { id: string; label: string; content: string; call_id?: string }[] = [];
    let chunks = "";
    let idx = 0;

    if (parsingStatus && parsingStatus !== ParsingStatusEnum.READY && parsingStatus !== ParsingStatusEnum.ERROR) {
      const label = getParsingDisplayStatus(parsingStatus);
      events.push({ id: `ev-${idx++}`, type: "tool_start", label });
      chunks = label;
    } else if (parsingStatus === ParsingStatusEnum.READY) {
      const repoEvId = `ev-${idx}`;
      events.push({ id: repoEvId, type: "tool_end", label: "Cloning your repository" });
      events.push({ id: `ev-${++idx}`, type: "tool_end", label: "Parsing your code" });
      events.push({ id: `ev-${++idx}`, type: "tool_end", label: "Understanding your codebase" });
      idx++;
      segments.push({ id: `seg-${repoEvId}`, label: "Repository", content: "Cloned and parsed successfully." });
    }

    const qStatus = state.questionGenerationStatus;
    const qLoading =
      questionsLoading ||
      (questionsPolling && questionsCount === 0) ||
      (state.pageState === "generating" && questionsCount === 0);
    if (qLoading) {
      const msg =
        qStatus === "pending"
          ? "Questions are queued for generation…"
          : qStatus === "processing"
            ? "Analyzing repository and generating questions…"
            : qStatus === "completed"
              ? "Preparing questions…"
              : questionsLoading
                ? "Creating recipe and generating questions…"
                : "Loading…";
      events.push({ id: `ev-${idx++}`, type: "tool_start", label: msg });
      chunks = chunks ? `${chunks}\n\n${msg}` : msg;
    } else if (questionsCount > 0) {
      const questionsEvId = `ev-${idx}`;
      events.push({ id: questionsEvId, type: "tool_end", label: "Generating questions" });
      idx++;
      segments.push({
        id: `seg-${questionsEvId}`,
        label: "Questions",
        content: `Generated ${questionsCount} clarifying questions.`,
      });
    }

    const stepMessage =
      (parsingStatus && parsingStatus !== ParsingStatusEnum.READY && parsingStatus !== ParsingStatusEnum.ERROR && getParsingDisplayStatus(parsingStatus)) ||
      (qLoading &&
        (qStatus === "pending"
          ? "Questions are queued for generation…"
          : qStatus === "processing"
            ? "Analyzing repository and generating questions…"
            : qStatus === "completed"
              ? "Preparing questions…"
              : questionsLoading
                ? "Creating recipe and generating questions…"
                : "Loading…")) ||
      "";
    const streamProgressValue =
      stepMessage ? { step: "Processing", message: stepMessage } : null;

    const items: StreamTimelineItem[] = [];
    if (chunks)
      items.push({ type: "chunk", id: "derived-chunk", content: chunks });
    const seen = new Set<string>();
    for (const ev of events) {
      if (ev.type === "tool_start") {
        const cid = ev.call_id ?? ev.id;
        if (!seen.has(cid)) {
          seen.add(cid);
          const seg = segments.find((s) => s.id === `seg-${cid}` || s.call_id === cid);
          if (seg)
            items.push({ type: "tool", id: cid, label: seg.label, phase: "done", result: seg.content });
          else
            items.push({ type: "tool", id: cid, label: ev.label.replace(/^Running\s+/, ""), phase: "running" });
        }
      }
    }
    for (const seg of segments) {
      const cid = seg.call_id ?? seg.id.replace(/^seg-/, "");
      if (!seen.has(cid)) {
        seen.add(cid);
        items.push({ type: "tool", id: cid, label: seg.label, phase: "done", result: seg.content });
      }
    }

    return {
      streamProgress: streamProgressValue,
      derivedItems: items,
    };
  }, [
    parsingStatus,
    questionsLoading,
    questionsPolling,
    questionsCount,
    state.pageState,
    state.questionGenerationStatus,
    state.questions.length,
  ]);

  const hasStreamData = streamItems.length > 0;
  const displayProgress = isStreamingActive ? streamProgress : derivedProgress;
  const displayItems = isStreamingActive || hasStreamData ? streamItems : derivedItems;

  useEffect(() => {
    if (displayItems.length > 0) {
      streamOutputEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [displayItems.length]);

  const hasQuestionsReady = state.pageState === "questions" && state.questions.length > 0;

  // Persist thinking when questions are ready so it survives refresh
  useEffect(() => {
    if (!recipeId || !hasQuestionsReady) return;
    if (streamItems.length > 0) {
      try {
        sessionStorage.setItem(
          `${THINKING_STORAGE_KEY_QNA}_${recipeId}`,
          JSON.stringify({ streamItems })
        );
      } catch {
        // ignore
      }
    }
  }, [recipeId, hasQuestionsReady, streamItems]);

  // Restore thinking on load when questions are ready but we have no stream state (e.g. after refresh)
  useEffect(() => {
    if (!recipeId || !hasQuestionsReady || runIdFromUrl) return;
    if (streamItems.length > 0) return;
    if (isStreamingActive) return;
    if (hasRestoredThinkingRef.current === recipeId) return;
    hasRestoredThinkingRef.current = recipeId;
    try {
      const raw = sessionStorage.getItem(`${THINKING_STORAGE_KEY_QNA}_${recipeId}`);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        streamItems?: StreamTimelineItem[];
        segments?: { id: string; label: string; content: string; call_id?: string }[];
        events?: { id: string; type: string; label: string; call_id?: string }[];
      };
      const items = Array.isArray(data.streamItems) ? data.streamItems : [];
      if (items.length > 0) {
        setStreamItems(items);
        return;
      }
      const segments = Array.isArray(data.segments) ? data.segments : [];
      const events = Array.isArray(data.events) ? data.events : [];
      if (segments.length > 0 || events.length > 0) {
        const legacy: StreamTimelineItem[] = [];
        const seen = new Set<string>();
        for (const ev of events) {
          if (ev.type === "tool_start") {
            const cid = ev.call_id ?? ev.id;
            if (!seen.has(cid)) {
              seen.add(cid);
              const seg = segments.find((s) => s.id === `seg-${cid}` || s.call_id === cid);
              const label = ev.label.replace(/^Running\s+/, "");
              if (seg)
                legacy.push({ type: "tool", id: cid, label: seg.label, phase: "done", result: seg.content });
              else
                legacy.push({ type: "tool", id: cid, label, phase: "running" });
            }
          }
        }
        for (const seg of segments) {
          const cid = seg.call_id ?? seg.id.replace(/^seg-/, "");
          if (!seen.has(cid)) {
            seen.add(cid);
            legacy.push({ type: "tool", id: cid, label: seg.label, phase: "done", result: seg.content });
          }
        }
        if (legacy.length > 0) setStreamItems(legacy);
      }
    } catch {
      // ignore
    }
  }, [recipeId, hasQuestionsReady, runIdFromUrl, isStreamingActive, streamItems.length]);

  useEffect(() => {
    if (!recipeId) return;
    return () => {
      hasRestoredThinkingRef.current = null;
    };
  }, [recipeId]);

  // Figma: flat list for right sidebar
  const sortedSections = getSortedSections(state.sections.keys());
  const questionsInOrder = sortedSections.flatMap(
    (s) => state.sections.get(s) || []
  ).filter((q) => state.visibleQuestions.has(q.id));
  const focusedQuestion =
    (state.hoveredQuestion &&
      questionsInOrder.find((q) => q.id === state.hoveredQuestion)) ||
    questionsInOrder[0];

  if (!recipeId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">No task ID. Go to Build to create a recipe first.</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-primary-color font-sans antialiased">
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: questions area — same structure as spec chat */}
        {/* Full width when no questions, half width when questions ready */}
        <div
          className={`flex flex-col min-w-0 min-h-0 overflow-hidden transition-all duration-300 ${hasQuestionsReady ? 'flex-1' : 'w-full'}`}
          style={{ backgroundColor: "#FAF8F7" }}
        >
          {/* Title on left side */}
          <div className="shrink-0 px-6 pt-6 pb-4">
            <h1 className="text-lg font-bold text-primary-color truncate capitalize min-w-0">
              {featureIdea?.slice(0, 50) || "Clarifying Questions"}
              {(featureIdea?.length ?? 0) > 50 ? "…" : ""}
            </h1>
          </div>
          <div
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ msOverflowStyle: "none" }}
            onMouseLeave={() =>
              setState((prev) => ({ ...prev, hoveredQuestion: null }))
            }
          >
            {/* Chat UI like spec: user message + assistant intro + Thinking block */}
            {/* User message (feature idea) */}
            <div className="flex justify-end">
              <div className="max-w-[85%] text-sm rounded-t-xl rounded-bl-xl px-4 py-3 bg-white border border-gray-200 text-gray-900">
                {featureIdea || "Generating clarifying questions for your repository…"}
              </div>
            </div>
            {/* Assistant intro (above thinking) */}
            <div className="flex justify-start">
              <div className="w-10 h-10 rounded-lg shrink-0 mr-3 mt-0.5 flex items-center justify-center bg-[#102C2C] self-start">
                <Image src="/images/logo.svg" width={24} height={24} alt="Potpie Logo" className="w-6 h-6" />
              </div>
              <div className="max-w-[85%] text-sm px-4 py-3 text-gray-900">
                Analyzing your repository and generating clarifying questions. They&apos;ll appear below once ready—you can then answer and we&apos;ll create a plan together.
              </div>
            </div>
            {/* Agent output: interleaved timeline (chunks + tool rows in stream order) */}
            {(displayProgress || isGenerating || displayItems.length > 0) && (
              <div className="flex justify-start w-full overflow-hidden" style={{ contain: "inline-size" }}>
                <div className="w-10 h-10 rounded-lg shrink-0 mr-3 mt-0.5 flex items-center justify-center bg-[#102C2C] self-start opacity-0" aria-hidden />
                <div className="min-w-0 flex-1 overflow-hidden" style={{ width: "calc(100% - 52px)" }}>
                  {(displayProgress || isGenerating) && displayItems.length === 0 && (
                    <p className="text-xs text-zinc-500 flex items-center gap-2 mb-2">
                      <span className="inline-block w-4 h-4 rounded-full border-2 border-[#102C2C] border-t-transparent animate-spin" />
                      {displayProgress ? `${displayProgress.step}: ${displayProgress.message}` : "Generating questions…"}
                    </p>
                  )}
                  <StreamTimeline
                    items={displayItems}
                    endRef={streamOutputEndRef}
                    loading={
                      displayItems.length > 0 &&
                      (isStreamingActive || isGenerating) &&
                      state.pageState !== "questions"
                    }
                  />
                  {state.questionGenerationError && (
                    <p className="text-xs text-red-600 mt-1">{state.questionGenerationError}</p>
                  )}
                </div>
              </div>
            )}

            {/* Align with Thinking block content above (52px = avatar width + margin) */}
            <div className="space-y-6 ml-[52px] min-w-0" style={{ width: "calc(100% - 52px)" }}>
            {/* Show error card when there's an error - full card when no questions, banner when questions exist */}
            {state.pageState === "questions" && state.questionGenerationError && (
              state.questions.length === 0 ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <p className="font-medium">Question generation failed</p>
                  <p className="mt-1 text-red-700">{state.questionGenerationError}</p>
                </div>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Some questions may not have been generated: {state.questionGenerationError}</span>
                </div>
              )
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

        {/* Right: question list — only show when questions are ready */}
        {hasQuestionsReady && (
          <div
            className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden"
            style={{ backgroundColor: "#FAF8F7" }}
          >
            {/* Repo/branch badges on right side */}
            <div className="flex justify-end items-center px-6 pt-6 pb-4 shrink-0 gap-2">
              {repoName && repoName !== "Unknown Repository" && (
                <Badge icon={Github}>{repoName}</Badge>
              )}
              {branchName && <Badge icon={GitBranch}>{branchName}</Badge>}
            </div>
            <aside className="flex-1 min-h-0 w-full min-w-[280px] flex flex-col overflow-hidden">
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
