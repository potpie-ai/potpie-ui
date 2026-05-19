import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { parseApiError, extractJsonObjects, parseSSEBuffer, isSSEResponse } from "@/lib/utils";
import {
  PlanGenerationRequest,
  PlanSubmitResponse,
  PlanStatusResponse,
  PlanItemsResponse,
  PlanChatRequest,
  PlanChatResponse,
} from "@/lib/types/spec";

export default class PlanService {
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_WORKFLOWS_URL;
  /** New API base: /api/v1/recipes */
  private static readonly API_BASE = `${this.BASE_URL}/api/v1/recipes`;

  /**
   * Regenerate plan for a recipe (reset to SPEC_READY and trigger new plan generation).
   * POST /api/v1/recipes/{recipe_id}/plan/regenerate → 202 Accepted.
   */
  static async regeneratePlan(recipeId: string): Promise<PlanSubmitResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.post<PlanSubmitResponse>(
        `${this.API_BASE}/${recipeId}/plan/regenerate`,
        {},
        { headers },
      );
      return response.data;
    } catch (error: any) {
      console.error("[PlanService] Error regenerating plan:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Trigger plan generation for a recipe
   * POST /api/v1/recipes/{recipe_id}/plan/generate
   */
  static async submitPlanGeneration(
    request: PlanGenerationRequest
  ): Promise<PlanSubmitResponse> {
    try {
      const recipeId = request.recipe_id;
      if (!recipeId) {
        throw new Error("recipe_id is required for plan generation");
      }

      console.log("[PlanService] Triggering plan generation for recipe:", recipeId);
      const headers = await getHeaders();
      const response = await axios.post<PlanSubmitResponse>(
        `${this.API_BASE}/${recipeId}/plan/generate`,
        {},
        { headers }
      );
      console.log("[PlanService] Plan generation trigger response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error submitting plan generation:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get plan status and result by recipe_id
   * GET /api/v1/recipes/{recipe_id}/plan
   */
  static async getPlanStatusByRecipeId(
    recipeId: string
  ): Promise<PlanStatusResponse> {
    try {
      console.log("[PlanService] Fetching plan status for recipe:", recipeId);
      const headers = await getHeaders();
      const response = await axios.get<PlanStatusResponse>(
        `${this.API_BASE}/${recipeId}/plan`,
        { headers }
      );
      console.log("[PlanService] Plan status response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error fetching plan status by recipe_id:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * @deprecated Use getPlanStatusByRecipeId instead. The new API only supports fetching by recipe_id.
   */
  static async getPlanStatus(planId: string): Promise<PlanStatusResponse> {
    console.warn("[PlanService] getPlanStatus(planId) is deprecated. The new API requires recipe_id.");
    throw new Error("getPlanStatus by planId is not supported in the new API. Use getPlanStatusByRecipeId instead.");
  }

  /**
   * @deprecated Use getPlanStatusByRecipeId instead. The new API only supports fetching by recipe_id.
   */
  static async getPlanStatusBySpecId(specId: string): Promise<PlanStatusResponse> {
    console.warn("[PlanService] getPlanStatusBySpecId is deprecated. The new API requires recipe_id.");
    throw new Error("getPlanStatusBySpecId is not supported in the new API. Use getPlanStatusByRecipeId instead.");
  }

  /**
   * Start plan generation with streaming (same pattern as ChatService /message).
   * POST /api/v1/recipes/{recipe_id}/plan/generate-stream
   * Returns run_id from X-Run-Id header; consumes stream and calls onEvent for each JSON object.
   */
  static async startPlanGenerationStream(
    recipeId: string,
    options: {
      streamTokens?: boolean;
      /** If false, only start the task and return runId without consuming the stream (e.g. for redirect to plan page). */
      consumeStream?: boolean;
      onEvent?: (eventType: string, data: Record<string, unknown>) => void;
      onError?: (error: string) => void;
      signal?: AbortSignal;
    }
  ): Promise<{ runId: string }> {
    const headers = await getHeaders();
    const url = `${this.API_BASE}/${recipeId}/plan/generate-stream${options.streamTokens !== false ? "?stream_tokens=true" : ""}`;
    const response = await fetch(url, {
      method: "POST",
      headers: headers as HeadersInit,
      credentials: "include",
      signal: options.signal,
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `Plan stream failed: ${response.status}`);
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
   * Plan chat - send message to Plan Editor Agent
   * POST /api/v1/recipes/{recipe_id}/edit?edit_type=plan
   * Backend builds edit history from DB; we only send user_message.
   */
  static async planChat(
    recipeId: string,
    request: PlanChatRequest,
  ): Promise<PlanChatResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.post<{
        edit_type: string;
        intent: string;
        plan_edits?: unknown[];
        explanation: string;
        spec_sync_required?: boolean;
        spec_impact?: Record<string, unknown>;
        updated_plan?: Record<string, unknown>;
        task_id?: string;
      }>(
        `${this.API_BASE}/${recipeId}/edit?edit_type=plan`,
        { user_message: request.message },
        { headers },
      );
      const d = response.data;
      return {
        intent: d.intent ?? "clarify",
        message: d.explanation,
        explanation: d.explanation,
        plan_output: d.updated_plan ?? null,
        undo_token: "",
        next_actions: [],
      };
    } catch (error: any) {
      console.error("[PlanService] Plan chat error:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Reconnect to an existing plan stream. Same pattern as ChatService.
   * GET /api/v1/recipes/{recipe_id}/plan/stream?run_id=...&cursor=...
   */
  static connectPlanStream(
    recipeId: string,
    runId: string,
    options: {
      cursor?: string | null;
      onEvent?: (eventType: string, data: Record<string, unknown>) => void;
      onError?: (error: string) => void;
      signal?: AbortSignal;
    }
  ): void {
    const url = `${this.API_BASE}/${recipeId}/plan/stream?run_id=${encodeURIComponent(runId)}${options.cursor ? `&cursor=${encodeURIComponent(options.cursor)}` : ""}`;
    getHeaders()
      .then((headers) =>
        fetch(url, {
          method: "GET",
          headers: headers as HeadersInit,
          credentials: "include",
          signal: options.signal,
        })
      )
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
   * @deprecated Plan items are now included in the plan object from getPlanStatusByRecipeId.
   */
  static async getPlanItems(
    planId: string,
    start: number = 0,
    limit: number = 10
  ): Promise<PlanItemsResponse> {
    console.warn("[PlanService] getPlanItems is deprecated. Plan items are now included in getPlanStatusByRecipeId response.");
    throw new Error("getPlanItems is not supported in the new API. Plan items are included in the plan object from getPlanStatusByRecipeId.");
  }
}
