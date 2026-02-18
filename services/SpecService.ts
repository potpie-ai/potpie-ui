import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { parseApiError, extractJsonObjects, parseSSEBuffer, isSSEResponse } from "@/lib/utils";
import {
  SpecPlanRequest,
  SpecPlanSubmitResponse,
  SpecPlanStatusResponse,
  QAAnswer,
  CreateRecipeRequest,
  CreateRecipeResponse,
  CreateRecipeCodegenRequest,
  CreateRecipeCodegenResponse,
  TriggerQuestionGenerationRequest,
  TriggerQuestionGenerationResponse,
  RecipeQuestionsResponse,
  SubmitRecipeAnswersRequest,
  SubmitRecipeAnswersResponse,
  TriggerSpecGenerationResponse,
  SpecStatusResponse,
  RecipeDetailsResponse,
  SpecChatRequest,
  SpecChatResponse,
} from "@/lib/types/spec";

export default class SpecService {
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_WORKFLOWS_URL;
  private static readonly SPEC_URL = `${this.BASE_URL}/api/v1/recipe/spec`;
  /** New API base: /api/v1/recipes */
  private static readonly API_BASE = `${this.BASE_URL}/api/v1/recipes`;

  /**
   * Create a new recipe for spec generation (Legacy)
   */
  static async createRecipe(
    request: CreateRecipeRequest,
  ): Promise<CreateRecipeResponse> {
    try {
      console.log("[SpecService] Creating recipe with request:", request);
      const headers = await getHeaders();
      const response = await axios.post<CreateRecipeResponse>(
        `${this.BASE_URL}/api/v1/recipe`,
        request,
        { headers },
      );
      console.log("[SpecService] Recipe creation response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[SpecService] Error creating recipe:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Submit QA answers and trigger spec generation (Legacy)
   */
  static async submitQAAnswers(
    recipeId: string,
    qaAnswers: QAAnswer[],
  ): Promise<SpecPlanSubmitResponse> {
    try {
      const headers = await getHeaders();
      const request: SpecPlanRequest = {
        recipe_id: recipeId,
        qa_answers: qaAnswers,
      };
      const response = await axios.post<SpecPlanSubmitResponse>(
        this.SPEC_URL,
        request,
        { headers },
      );
      return response.data;
    } catch (error: any) {
      console.error("Error submitting QA answers:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get spec generation progress (Legacy)
   */
  static async getSpecProgress(
    recipeId: string,
  ): Promise<SpecPlanStatusResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<SpecPlanStatusResponse>(
        `${this.SPEC_URL}/${recipeId}`,
        { headers },
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching spec progress:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  // ====== New /api/v1/recipes endpoints ======

  /**
   * Create a new recipe
   * POST /api/v1/recipes/
   */
  static async createRecipeCodegen(
    request: CreateRecipeCodegenRequest,
  ): Promise<CreateRecipeCodegenResponse> {
    try {
      console.log("[SpecService] Creating recipe with request:", {
        user_prompt: request.user_prompt,
        project_id: request.project_id,
        additional_links: request.additional_links,
      });

      if (!request.project_id || request.project_id.trim() === "") {
        throw new Error("Project ID is required");
      }

      const headers = await getHeaders();
      const response = await axios.post<CreateRecipeCodegenResponse>(
        `${this.API_BASE}/`,
        request,
        { headers },
      );

      console.log("[SpecService] Recipe creation response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[SpecService] Error creating recipe:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Trigger question generation for a recipe
   * POST /api/v1/recipes/{recipe_id}/questions/generate
   */
  static async triggerQuestionGeneration(
    recipeId: string,
    request: TriggerQuestionGenerationRequest,
  ): Promise<TriggerQuestionGenerationResponse> {
    try {
      console.log("[SpecService] Triggering question generation for recipe:", recipeId);
      const headers = await getHeaders();
      const response = await axios.post<TriggerQuestionGenerationResponse>(
        `${this.API_BASE}/${recipeId}/questions/generate`,
        request,
        { headers },
      );
      console.log("[SpecService] Question generation trigger response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[SpecService] Error triggering question generation:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get QA questions for a recipe (polling endpoint)
   * GET /api/v1/recipes/{recipe_id}/questions
   */
  static async getRecipeQuestions(
    recipeId: string,
  ): Promise<RecipeQuestionsResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<RecipeQuestionsResponse>(
        `${this.API_BASE}/${recipeId}/questions`,
        { headers },
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching recipe questions:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Submit answers to recipe questions
   * POST /api/v1/recipes/{recipe_id}/answers
   */
  static async submitAnswers(
    recipeId: string,
    answers: Record<string, string>,
  ): Promise<SubmitRecipeAnswersResponse> {
    try {
      console.log("[SpecService] Submitting answers for recipe:", recipeId);
      const headers = await getHeaders();
      const request: SubmitRecipeAnswersRequest = { answers };
      const response = await axios.post<SubmitRecipeAnswersResponse>(
        `${this.API_BASE}/${recipeId}/answers`,
        request,
        { headers },
      );
      console.log("[SpecService] Submit answers response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[SpecService] Error submitting answers:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Trigger spec generation (only when recipe is in ANSWERS_SUBMITTED).
   * To regenerate after spec is ready, use regenerateSpec() which calls .../spec/regenerate.
   * POST /api/v1/recipes/{recipe_id}/spec/generate
   */
  static async triggerSpecGeneration(
    recipeId: string,
  ): Promise<TriggerSpecGenerationResponse> {
    try {
      console.log("[SpecService] Triggering spec generation for recipe:", recipeId);
      const headers = await getHeaders();
      const response = await axios.post<TriggerSpecGenerationResponse>(
        `${this.API_BASE}/${recipeId}/spec/generate`,
        {},
        { headers },
      );
      console.log("[SpecService] Spec generation trigger response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[SpecService] Error triggering spec generation:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Regenerate spec for a recipe (e.g. when already in SPEC_READY).
   * Backend resets recipe to ANSWERS_SUBMITTED and triggers new spec generation.
   * API: POST /api/v1/recipes/{recipe_id}/spec/regenerate → 202 Accepted.
   * Response: { recipe_id, status, created_at } (same shape as triggerSpecGeneration).
   */
  static async regenerateSpec(recipeId: string): Promise<TriggerSpecGenerationResponse> {
    try {
      console.log("[SpecService] Regenerating spec for recipe:", recipeId);
      const headers = await getHeaders();
      const response = await axios.post<TriggerSpecGenerationResponse>(
        `${this.API_BASE}/${recipeId}/spec/regenerate`,
        {},
        { headers },
      );
      console.log("[SpecService] Spec regenerate response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[SpecService] Error regenerating spec:", error);
      if (error?.response?.status === 404) {
        throw new Error(
          "Spec regeneration is not available. The workflows backend needs to implement POST /api/v1/recipes/{id}/spec/regenerate."
        );
      }
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get spec generation progress by recipe_id
   * GET /api/v1/recipes/{recipe_id}/spec
   */
  static async getSpecProgressByRecipeId(
    recipeId: string,
  ): Promise<SpecStatusResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<SpecStatusResponse>(
        `${this.API_BASE}/${recipeId}/spec`,
        { headers },
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching spec progress:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Start spec generation with streaming (same pattern as ChatService /message).
   * POST /api/v1/recipes/{recipe_id}/spec/generate-stream
   * Returns run_id from X-Run-Id header; consumes stream and calls onEvent for each JSON object.
   */
  static async startSpecGenerationStream(
    recipeId: string,
    options: {
      streamTokens?: boolean;
      /** If false, only start the task and return runId without consuming the stream (e.g. for redirect to spec page). */
      consumeStream?: boolean;
      onEvent?: (eventType: string, data: Record<string, unknown>) => void;
      onError?: (error: string) => void;
      signal?: AbortSignal;
    }
  ): Promise<{ runId: string }> {
    const headers = await getHeaders();
    const url = `${this.API_BASE}/${recipeId}/spec/generate-stream${options.streamTokens ? "?stream_tokens=true" : ""}`;
    const response = await fetch(url, {
      method: "POST",
      headers: headers as HeadersInit,
      credentials: "include",
      signal: options.signal,
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `Spec stream failed: ${response.status}`);
    }
    let runId =
      response.headers.get("X-Run-Id")?.trim() ||
      response.headers.get("x-run-id")?.trim() ||
      "";
    if (options.consumeStream === false || !options.onEvent) {
      if (!runId && response.body) {
        try {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          for (let i = 0; i < 16; i++) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const { objects } = extractJsonObjects(buffer);
            if (objects.length > 0) {
              const data = JSON.parse(objects[0]) as Record<string, unknown>;
              const inner = data.data as Record<string, unknown> | undefined;
              runId =
                (typeof data.run_id === "string" ? data.run_id : inner && typeof inner.run_id === "string" ? inner.run_id : "")?.trim() || runId;
              break;
            }
          }
          reader.cancel();
        } catch {
          // ignore
        }
      }
      return { runId };
    }
    const reader = response.body?.getReader();
    if (reader && options.onEvent) {
      const contentType = response.headers.get("Content-Type");
      const decoder = new TextDecoder();
      let buffer = "";
      let useSSE = isSSEResponse(contentType);
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            if (!useSSE && buffer.includes("event:") && buffer.includes("data:")) useSSE = true;
            if (useSSE) {
              const { events, remaining } = parseSSEBuffer(buffer);
              buffer = remaining;
              for (const { eventType, data } of events) {
                const payload =
                  data?.data && typeof data.data === "object" && data.data !== null
                    ? (data.data as Record<string, unknown>)
                    : data ?? {};
                options.onEvent?.(eventType, payload);
                if (eventType === "end" || eventType === "error") return;
              }
            } else {
              const { objects, remaining } = extractJsonObjects(buffer);
              buffer = remaining;
              for (const jsonStr of objects) {
                try {
                  const data = JSON.parse(jsonStr) as Record<string, unknown>;
                  const eventType = (typeof data.event === "string" ? data.event : "message") as string;
                  const payload =
                    data.data && typeof data.data === "object" && data.data !== null
                      ? (data.data as Record<string, unknown>)
                      : data;
                  if (typeof data.eventId === "string") payload.eventId = data.eventId;
                  options.onEvent?.(eventType, payload);
                  if (eventType === "end" || eventType === "error") return;
                } catch {
                  options.onEvent?.("message", { raw: jsonStr });
                }
              }
            }
          }
        } catch (e) {
          options.onError?.(e instanceof Error ? e.message : String(e));
        }
      })();
    }
    return { runId };
  }

  /**
   * Reconnect to an existing spec stream (e.g. after page refresh). Same pattern as ChatService.
   * GET /api/v1/recipes/{recipe_id}/spec/stream?run_id=...&cursor=...
   */
  static connectSpecStream(
    recipeId: string,
    runId: string,
    options: {
      cursor?: string | null;
      onEvent?: (eventType: string, data: Record<string, unknown>) => void;
      onError?: (error: string) => void;
      signal?: AbortSignal;
    }
  ): void {
    const url = `${this.API_BASE}/${recipeId}/spec/stream?run_id=${encodeURIComponent(runId)}${options.cursor ? `&cursor=${encodeURIComponent(options.cursor)}` : ""}`;
    getHeaders()
      .then((headers) => {
        return fetch(url, {
          method: "GET",
          headers: headers as HeadersInit,
          credentials: "include",
          signal: options.signal,
        });
      })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Stream connect failed: ${response.status}`);
        const reader = response.body?.getReader();
        if (!reader || !options.onEvent) return;
        const contentType = response.headers.get("Content-Type");
        const decoder = new TextDecoder();
        let buffer = "";
        let useSSE = isSSEResponse(contentType);
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            if (!useSSE && buffer.includes("event:") && buffer.includes("data:")) useSSE = true;
            if (useSSE) {
              const { events, remaining } = parseSSEBuffer(buffer);
              buffer = remaining;
              for (const { eventType, data } of events) {
                const payload =
                  data?.data && typeof data.data === "object" && data.data !== null
                    ? (data.data as Record<string, unknown>)
                    : data ?? {};
                options.onEvent(eventType, payload);
                if (eventType === "end" || eventType === "error") return;
              }
            } else {
              const { objects, remaining } = extractJsonObjects(buffer);
              buffer = remaining;
              for (const jsonStr of objects) {
                try {
                  const data = JSON.parse(jsonStr) as Record<string, unknown>;
                  const eventType = (typeof data.event === "string" ? data.event : "message") as string;
                  const payload =
                    data.data && typeof data.data === "object" && data.data !== null
                      ? (data.data as Record<string, unknown>)
                      : data;
                  if (typeof data.eventId === "string") payload.eventId = data.eventId;
                  options.onEvent(eventType, payload);
                  if (eventType === "end" || eventType === "error") return;
                } catch {
                  options.onEvent("message", { raw: jsonStr });
                }
              }
            }
          }
        } catch (e) {
          options.onError?.(e instanceof Error ? e.message : String(e));
        }
      })
      .catch((e) => options.onError?.(e instanceof Error ? e.message : String(e)));
  }

  /**
   * Spec chat - send message to Spec Editor Agent
   * POST /api/v1/recipes/{recipe_id}/edit?edit_type=spec
   * Backend builds edit history from DB; we only send user_message.
   */
  static async specChat(
    recipeId: string,
    request: SpecChatRequest,
  ): Promise<SpecChatResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.post<{
        edit_type: string;
        intent: string;
        change_percentage?: number;
        requires_regeneration?: boolean;
        target_agent?: string;
        updated_spec?: Record<string, unknown>;
        explanation: string;
        edits?: unknown[];
        task_id?: string;
      }>(
        `${this.API_BASE}/${recipeId}/edit?edit_type=spec`,
        { user_message: request.message },
        { headers },
      );
      const d = response.data;
      return {
        intent: (d.intent ?? "clarify") as SpecChatResponse["intent"],
        message: d.explanation,
        explanation: d.explanation,
        spec_output: (d.updated_spec ?? { add: [], modify: [], fix: [] }) as unknown as SpecChatResponse["spec_output"],
        undo_token: "",
        next_actions: [],
        regenerate_triggered: d.requires_regeneration ?? false,
      };
    } catch (error: any) {
      console.error("[SpecService] Spec chat error:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get comprehensive recipe details including repo and branch information
   * GET /api/v1/recipes/{recipe_id}
   * On 404 returns a minimal response so callers can use localStorage/fallbacks instead of throwing.
   */
  static async getRecipeDetails(
    recipeId: string,
  ): Promise<RecipeDetailsResponse> {
    try {
      const headers = await getHeaders();
      // Use the new recipe API endpoint that returns { recipe: {...} }
      const response = await axios.get<{ recipe: any }>(
        `${this.API_BASE}/${recipeId}`,
        { headers },
      );
      
      const recipe = response.data.recipe;
      
      // Transform the response to match RecipeDetailsResponse format
      // Also fetch questions if needed
      let questionsAndAnswers: Array<{
        question_id: string;
        question: string;
        answer: string | null;
      }> = [];
      
      // Try to fetch questions if they exist
      try {
        const questionsResponse = await axios.get<RecipeQuestionsResponse>(
          `${this.API_BASE}/${recipeId}/questions`,
          { headers },
        );
        if (questionsResponse.data.questions) {
          questionsAndAnswers = questionsResponse.data.questions.map((q) => ({
            question_id: q.id,
            question: q.question,
            answer: null, // Answers are submitted separately and not returned in questions endpoint
          }));
        }
      } catch (questionsError) {
        // Questions might not be available yet, that's okay
        console.log("[SpecService] Questions not available yet for recipe:", recipeId);
      }
      
      return {
        recipe_id: recipe.id || recipeId,
        project_id: recipe.project_id || "",
        user_prompt: recipe.user_prompt || "Implementation plan generation",
        repo_name: recipe.repo_name || null,
        branch_name: recipe.branch_name || null,
        questions_and_answers: questionsAndAnswers,
      };
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return {
          recipe_id: recipeId,
          project_id: "",
          user_prompt: "Implementation plan generation",
          repo_name: null,
          branch_name: null,
          questions_and_answers: [],
        };
      }
      console.error("[SpecService] Error fetching recipe details:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }
}
