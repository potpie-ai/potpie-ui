import axios, { AxiosError } from "axios";
import getHeaders from "@/app/utils/headers.util";
import { RecipeQuestionsResponse } from "@/lib/types/spec";

/** Normalized option for UI (supports both string and {label, description} formats) */
export interface MCQOption {
  label: string;
  description?: string;
}

export interface MCQQuestion {
  id: string;
  section: string;
  question: string;
  /** Options as strings (legacy) or MCQOption[] (new API) - normalized to MCQOption[] internally */
  options: string[] | MCQOption[];
  needsInput: boolean;
  /** Whether multiple options can be selected (true) or only one (false) */
  multipleChoice?: boolean;
  /** Legacy: preferred option label. New: derived from answer_recommendation.idx */
  assumed?: string;
  /** AI reasoning for recommended option */
  reasoning?: string;
  /** New API: index of recommended option (0-based) */
  answerRecommendationIdx?: number | null;
  /** New API: expected answer type (e.g., "mcq (bool)") */
  expectedAnswerType?: string;
  /** New API: optional context references */
  contextRefs?: Array<{ path?: string; type?: string; [key: string]: unknown }> | null;
}

export interface QuestionAnswer {
  question_id: string;
  text_answer?: string;
  mcq_answer?: string;
  is_user_modified?: boolean;
  is_skipped?: boolean;
}

export interface GenerateQuestionsResponse {
  questions: MCQQuestion[];
}

export interface GetQuestionsResponse {
  questions: MCQQuestion[];
  answers: { [question_id: string]: QuestionAnswer };
}

export interface SubmitAnswersRequest {
  answers: {
    [question_id: string]: {
      text_answer?: string;
      mcq_answer?: string;
    };
  };
}

export interface SubmitAnswersResponse {
  status: string;
  saved_count: number;
}

export interface GeneratePlanResponse {
  plan_id: string;
  plan_document: string;
}

/**
 * Service for interacting with the Questions API
 */
export default class QuestionService {
  private static readonly BASE_URL = `${process.env.NEXT_PUBLIC_WORKFLOWS_URL}/api/v1`;

  /**
   * Extract error message from axios error
   */
  private static getErrorMessage(error: unknown, defaultMessage: string): string {
    if (error instanceof AxiosError) {
      return error.response?.data?.detail || defaultMessage;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return defaultMessage;
  }

  /**
   * Generate questions for a project
   * @param projectId - The project ID
   * @param featureIdea - Optional feature idea/description to generate relevant questions
   */
  static async generateQuestions(
    projectId: string,
    featureIdea?: string
  ): Promise<GenerateQuestionsResponse> {
    if (!projectId?.trim()) {
      throw new Error("Project ID is required");
    }

    const headers = await getHeaders();
    const payload: { project_id: string; feature_idea?: string } = {
      project_id: projectId.trim(),
    };

    // Include feature_idea if provided and not empty
    const trimmedIdea = featureIdea?.trim();
    if (trimmedIdea) {
      payload.feature_idea = trimmedIdea;
    }

    try {
      const response = await axios.post<GenerateQuestionsResponse>(
        `${this.BASE_URL}/repos/analyze`,
        payload,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(this.getErrorMessage(error, "Failed to generate questions"));
    }
  }

  /**
   * Get questions and answers for a project
   */
  static async getQuestions(projectId: string): Promise<GetQuestionsResponse> {
    if (!projectId?.trim()) {
      throw new Error("Project ID is required");
    }

    const headers = await getHeaders();

    try {
      const response = await axios.get<GetQuestionsResponse>(
        `${this.BASE_URL}/projects/${projectId.trim()}/questions`,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(this.getErrorMessage(error, "Failed to get questions"));
    }
  }

  /**
   * Submit answers for questions
   */
  static async submitAnswers(
    projectId: string,
    answers: SubmitAnswersRequest["answers"]
  ): Promise<SubmitAnswersResponse> {
    if (!projectId?.trim()) {
      throw new Error("Project ID is required");
    }
    if (!answers || Object.keys(answers).length === 0) {
      throw new Error("Answers are required");
    }

    const headers = await getHeaders();

    try {
      const response = await axios.post<SubmitAnswersResponse>(
        `${this.BASE_URL}/projects/${projectId.trim()}/questions/answers`,
        { answers },
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(this.getErrorMessage(error, "Failed to submit answers"));
    }
  }

  /**
   * Generate implementation plan with answers
   */
  static async generatePlan(
    projectId: string,
    answers: SubmitAnswersRequest["answers"],
    additionalContext?: string
  ): Promise<GeneratePlanResponse> {
    if (!projectId?.trim()) {
      throw new Error("Project ID is required");
    }

    const headers = await getHeaders();

    try {
      const response = await axios.post<GeneratePlanResponse>(
        `${this.BASE_URL}/plans/generate`,
        {
          project_id: projectId.trim(),
          answers: answers || {},
          additional_context: additionalContext?.trim() || "",
        },
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(this.getErrorMessage(error, "Failed to generate plan"));
    }
  }

  /** New recipes API base for recipe questions */
  private static readonly RECIPES_URL = `${process.env.NEXT_PUBLIC_WORKFLOWS_URL}/api/v1/recipes`;

  /**
   * Poll recipe questions until they're ready
   * Uses GET /api/v1/recipes/{recipe_id}/questions
   */
  static async pollRecipeQuestions(
    recipeId: string,
    pollInterval: number = 3000,
    maxAttempts: number = 60
  ): Promise<RecipeQuestionsResponse> {
    if (!recipeId?.trim()) {
      throw new Error("Recipe ID is required");
    }
    const headers = await getHeaders();
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get<RecipeQuestionsResponse>(
          `${this.RECIPES_URL}/${recipeId.trim()}/questions`,
          { headers }
        );

        const data = response.data;

        if (data.questions && data.questions.length > 0) {
          return data;
        }

        // Workflows API: generation_status "completed" or legacy recipe_status "QUESTIONS_READY"
        const status = data.generation_status;
        const legacyStatus = (data as { recipe_status?: string }).recipe_status;
        if (status === "completed" || legacyStatus === "QUESTIONS_READY") {
          return data;
        }

        // Failed: workflows "failed" or legacy "ERROR"
        if (status === "failed" || legacyStatus === "ERROR") {
          throw new Error(data.error_message || "Failed to generate questions");
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
        attempts++;
      } catch (error) {
        if (attempts < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          attempts++;
          continue;
        }
        throw new Error(this.getErrorMessage(error, "Failed to fetch questions"));
      }
    }

    throw new Error("Timeout waiting for questions to be ready");
  }

  /**
   * Get recipe questions directly (without polling)
   * Uses GET /api/v1/recipes/{recipe_id}/questions
   */
  static async getRecipeQuestions(
    recipeId: string
  ): Promise<RecipeQuestionsResponse> {
    if (!recipeId?.trim()) {
      throw new Error("Recipe ID is required");
    }
    const headers = await getHeaders();

    try {
      const response = await axios.get<RecipeQuestionsResponse>(
        `${this.RECIPES_URL}/${recipeId.trim()}/questions`,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(this.getErrorMessage(error, "Failed to fetch questions"));
    }
  }

  /**
   * Start question generation with SSE streaming.
   * POST /api/v1/recipes/{recipe_id}/questions/generate-stream
   * Returns run_id from X-Run-Id header; optionally consumes stream and calls onEvent.
   */
  static async startQuestionsGenerationStream(
    recipeId: string,
    options: {
      streamTokens?: boolean;
      consumeStream?: boolean;
      onEvent?: (eventType: string, data: Record<string, unknown>) => void;
      onError?: (error: string) => void;
      signal?: AbortSignal;
    }
  ): Promise<{ runId: string }> {
    const headers = await getHeaders();
    const url = `${this.RECIPES_URL}/${recipeId}/questions/generate-stream${options.streamTokens ? "?stream_tokens=true" : ""}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { ...headers, Accept: "text/event-stream" },
      credentials: "include",
      signal: options.signal,
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `Questions stream failed: ${response.status}`);
    }
    const runId =
      response.headers.get("X-Run-Id")?.trim() ||
      response.headers.get("x-run-id")?.trim() ||
      "";
    if (options.consumeStream === false || !options.onEvent) {
      response.body?.cancel?.();
      return { runId };
    }
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (reader && options.onEvent) {
      (async () => {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || "";
            for (const block of lines) {
              if (!block.trim()) continue;
              let eventType = "message";
              let eventId: string | undefined;
              let data: Record<string, unknown> = {};
              for (const line of block.split("\n")) {
                if (line.startsWith("event:")) eventType = line.replace(/^event:\s*/, "").trim();
                if (line.startsWith("id:")) eventId = line.replace(/^id:\s*/, "").trim();
                if (line.startsWith("data:")) {
                  try {
                    data = JSON.parse(line.replace(/^data:\s*/, "").trim()) as Record<string, unknown>;
                  } catch {
                    data = { raw: line.replace(/^data:\s*/, "").trim() };
                  }
                }
              }
              if (eventId) data.eventId = eventId;
              options.onEvent?.(eventType, data);
              if (eventType === "end" || eventType === "error") return;
            }
          }
        } catch (e) {
          options.onError?.(e instanceof Error ? e.message : String(e));
        } finally {
          try {
            reader.releaseLock();
          } catch {
            // ignore if already released or stream closed
          }
        }
      })();
    }
    return { runId };
  }

  /**
   * Reconnect to an existing questions stream.
   * GET /api/v1/recipes/{recipe_id}/questions/stream?run_id=...&cursor=...
   */
  static connectQuestionsStream(
    recipeId: string,
    runId: string,
    options: {
      cursor?: string | null;
      onEvent?: (eventType: string, data: Record<string, unknown>) => void;
      onError?: (error: string) => void;
      signal?: AbortSignal;
    }
  ): void {
    const url = `${this.RECIPES_URL}/${recipeId}/questions/stream?run_id=${encodeURIComponent(runId)}${options.cursor ? `&cursor=${encodeURIComponent(options.cursor)}` : ""}`;
    console.log("[QuestionService.connectQuestionsStream] Connecting to:", url);
    getHeaders().then((headers) => {
      // Check if already aborted before starting fetch
      if (options.signal?.aborted) {
        console.log("[QuestionService.connectQuestionsStream] Aborted before fetch");
        return;
      }
      fetch(url, {
        method: "GET",
        headers: { ...headers, Accept: "text/event-stream" },
        credentials: "include",
        signal: options.signal,
      })
        .then(async (response) => {
          console.log("[QuestionService.connectQuestionsStream] Response status:", response.status);
          if (!response.ok) throw new Error(`Stream connect failed: ${response.status}`);
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader || !options.onEvent) return;
          let buffer = "";
          try {
            while (true) {
              // Check abort signal before each read
              if (options.signal?.aborted) {
                console.log("[QuestionService.connectQuestionsStream] Aborted during read loop");
                reader.cancel();
                return;
              }
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n\n");
              buffer = lines.pop() || "";
              for (const block of lines) {
                if (!block.trim()) continue;
                let eventType = "message";
                let eventId: string | undefined;
                let data: Record<string, unknown> = {};
                for (const line of block.split("\n")) {
                  if (line.startsWith("event:")) eventType = line.replace(/^event:\s*/, "").trim();
                  if (line.startsWith("id:")) eventId = line.replace(/^id:\s*/, "").trim();
                  if (line.startsWith("data:")) {
                    try {
                      data = JSON.parse(line.replace(/^data:\s*/, "").trim()) as Record<string, unknown>;
                    } catch {
                      data = { raw: line.replace(/^data:\s*/, "").trim() };
                    }
                  }
                }
                if (eventId) data.eventId = eventId;
                console.log("[QuestionService.connectQuestionsStream] Parsed event:", eventType, data);
                options.onEvent?.(eventType, data);
                if (eventType === "end" || eventType === "error") return;
              }
            }
          } finally {
            // Ensure reader is released
            reader.releaseLock();
          }
        })
        .catch((e) => {
          // Don't report abort errors as failures - this is expected cleanup behavior
          if (e instanceof Error && e.name === "AbortError") {
            console.log("[QuestionService.connectQuestionsStream] Stream aborted (cleanup)");
            return;
          }
          console.error("[QuestionService.connectQuestionsStream] Error:", e);
          options.onError?.(e instanceof Error ? e.message : String(e));
        });
    }).catch((e) => {
      // Don't report abort errors as failures
      if (e instanceof Error && e.name === "AbortError") {
        console.log("[QuestionService.connectQuestionsStream] getHeaders aborted");
        return;
      }
      console.error("[QuestionService.connectQuestionsStream] getHeaders failed:", e);
      options.onError?.(e instanceof Error ? e.message : String(e));
    });
  }
}
