import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { parseApiError } from "@/lib/utils";
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
   * Start spec generation with SSE streaming.
   * POST /api/v1/recipes/{recipe_id}/spec/generate-stream
   * Returns run_id from X-Run-Id header; consumes stream and calls onEvent for each SSE event.
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
      headers: { ...headers, Accept: "text/event-stream" },
      credentials: "include",
      signal: options.signal,
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `Spec stream failed: ${response.status}`);
    }
    // Prefer X-Run-Id (case-insensitive per HTTP); some proxies normalize to lowercase
    let runId =
      response.headers.get("X-Run-Id")?.trim() ||
      response.headers.get("x-run-id")?.trim() ||
      "";
    // Fallback: some backends send run_id in the first SSE event instead of header
    if (!runId && response.body && (options.consumeStream === false || !options.onEvent)) {
      try {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (let i = 0; i < 8; i++) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // Match data: {...} (single line) or multi-line JSON
          const dataMatch = buffer.match(/data:\s*(\{[^]*?\})\s*\n/);
          if (dataMatch) {
            const data = JSON.parse(dataMatch[1]) as Record<string, unknown>;
            const fromData =
              typeof data.run_id === "string"
                ? data.run_id
                : data.data && typeof (data.data as Record<string, unknown>).run_id === "string"
                  ? (data.data as Record<string, unknown>).run_id
                  : "";
            if (fromData) runId = String(fromData).trim();
            break;
          }
        }
        reader.cancel();
      } catch {
        // ignore parse errors
      }
    }
    if (options.consumeStream === false || !options.onEvent) {
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
        }
      })();
    }
    return { runId };
  }

  /**
   * Reconnect to an existing spec stream (e.g. after page refresh).
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
    getHeaders().then((headers) => {
      fetch(url, {
        method: "GET",
        headers: { ...headers, Accept: "text/event-stream" },
        credentials: "include",
        signal: options.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Stream connect failed: ${response.status}`);
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader || !options.onEvent) return;
          let buffer = "";
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
        })
        .catch((e) => options.onError?.(e instanceof Error ? e.message : String(e)));
    });
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
        spec_output: (d.updated_spec ?? { add: [], modify: [], fix: [] }) as SpecChatResponse["spec_output"],
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
   * GET /api/v1/recipes/{recipe_id}/details
   * On 404 returns a minimal response so callers can use localStorage/fallbacks instead of throwing.
   */
  static async getRecipeDetails(
    recipeId: string,
  ): Promise<RecipeDetailsResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<RecipeDetailsResponse>(
        `${this.API_BASE}/${recipeId}/details`,
        { headers },
      );
      return response.data;
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
