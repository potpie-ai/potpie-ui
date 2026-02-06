import axios, { AxiosError } from "axios";
import getHeaders from "@/app/utils/headers.util";
import { parseApiError } from "@/lib/utils";
import {
  PlanGenerationRequest,
  PlanSubmitResponse,
  PlanStatusResponse,
  PlanItemsResponse,
  PlanEditRequest,
  PlanEditResponse,
  PlanUndoRequest,
  PlanUndoResponse,
} from "@/lib/types/spec";

export default class PlanService {
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_WORKFLOWS_URL;
  private static readonly API_BASE = `${this.BASE_URL}/api/v1/recipe/codegen/plan`;

  /**
   * Submit a plan generation request
   * @param request - Plan generation request with spec_id or recipe_id
   * @returns Plan submission response with plan_id
   */
  static async submitPlanGeneration(
    request: PlanGenerationRequest
  ): Promise<PlanSubmitResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.post<PlanSubmitResponse>(
        this.API_BASE,
        request,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error submitting plan generation:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get plan generation status by plan_id
   * @param planId - Plan UUID
   * @returns Current plan generation status
   */
  static async getPlanStatus(planId: string): Promise<PlanStatusResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<PlanStatusResponse>(
        `${this.API_BASE}/${planId}`,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching plan status:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get latest plan status by spec_id
   * @param specId - Spec UUID
   * @returns Latest plan generation status for the spec
   */
  static async getPlanStatusBySpecId(
    specId: string
  ): Promise<PlanStatusResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<PlanStatusResponse>(
        `${this.API_BASE}/spec/${specId}`,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching plan status by spec_id:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get latest plan status by recipe_id
   * @param recipeId - Recipe UUID
   * @returns Latest plan generation status for the recipe
   */
  static async getPlanStatusByRecipeId(
    recipeId: string
  ): Promise<PlanStatusResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<PlanStatusResponse>(
        `${this.API_BASE}/recipe/${recipeId}`,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching plan status by recipe_id:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Fetch plan items with pagination
   * @param planId - Plan UUID
   * @param start - Starting item number (0-indexed, default: 0)
   * @param limit - Maximum items to return (default: 10, max: 100)
   * @returns Plan items response with pagination info
   */
  static async getPlanItems(
    planId: string,
    start: number = 0,
    limit: number = 10
  ): Promise<PlanItemsResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<PlanItemsResponse>(
        `${this.API_BASE}/${planId}/items`,
        {
          headers,
          params: { start, limit },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching plan items:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Extract error message from axios error
   */
  private static getErrorMessage(error: unknown, defaultMessage: string): string {
    if (error instanceof AxiosError) {
      return error.response?.data?.detail || error.response?.data?.message || defaultMessage;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return defaultMessage;
  }

  /**
   * Edit plan via Plan Editor Agent
   * POST /api/v1/recipe/codegen/plan/edit
   * @param request - Edit request with plan_id and user_message
   * @returns Edit response with applied edits, errors, conflicts, etc.
   */
  static async editPlan(request: PlanEditRequest): Promise<PlanEditResponse> {
    if (!request.plan_id?.trim()) {
      throw new Error("Plan ID is required");
    }
    if (!request.user_message?.trim()) {
      throw new Error("User message is required");
    }

    const headers = await getHeaders();

    try {
      const response = await axios.post<PlanEditResponse>(
        `${this.API_BASE}/edit`,
        request,
        { headers }
      );
      return response.data;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error, "Failed to edit plan");
      if (error instanceof AxiosError) {
        if (error.response?.status === 403) {
          throw new Error("Access denied");
        }
        if (error.response?.status === 404) {
          throw new Error("Plan not found");
        }
        if (error.response?.status === 400) {
          const detail = error.response?.data?.detail || error.response?.data?.message;
          throw new Error(detail || "Invalid request");
        }
      }
      throw new Error(errorMessage);
    }
  }

  /**
   * Undo plan edit
   * POST /api/v1/recipe/codegen/plan/undo
   * @param request - Undo request with plan_id and undo_token
   */
  static async undoPlanEdit(
    request: PlanUndoRequest
  ): Promise<PlanUndoResponse> {
    if (!request.plan_id?.trim()) {
      throw new Error("Plan ID is required");
    }
    if (!request.undo_token?.trim()) {
      throw new Error("Undo token is required");
    }

    const headers = await getHeaders();

    try {
      const response = await axios.post<PlanUndoResponse>(
        `${this.API_BASE}/undo`,
        request,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error("[PlanService] Error undoing plan edit:", error);
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        const responseData = error.response?.data;

        // Extract detailed error message
        const detail = responseData?.detail || responseData?.message || responseData?.error;
        const errorMessage = detail || this.getErrorMessage(error, "Failed to undo edit");

        if (status === 403) {
          throw new Error("Access denied. You don't have permission to undo this edit.");
        }
        if (status === 404) {
          throw new Error("Plan not found. The plan may have been deleted or the ID is incorrect.");
        }
        if (status === 400) {
          throw new Error(errorMessage || "Invalid undo token or plan not completed. The undo token may have expired or already been used.");
        }
        if (status === 405) {
          throw new Error("Method not allowed. The undo endpoint may not be available.");
        }
        if (status === 500) {
          // Server error - try to extract more details
          const serverError = errorMessage || "Internal server error occurred while undoing the edit.";
          console.error("[PlanService] Server error details:", responseData);
          throw new Error(`Server error: ${serverError}`);
        }
        // For other status codes, use the detailed error message
        throw new Error(errorMessage);
      }
      // For non-axios errors (network errors, etc.)
      const errorMessage = this.getErrorMessage(error, "Failed to undo edit");
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete chat history for a plan
   * DELETE /api/v1/recipe/codegen/plan/{planId}/chat-history
   * @param planId - The plan ID
   */
  static async deletePlanChatHistory(planId: string): Promise<void> {
    if (!planId?.trim()) {
      throw new Error("Plan ID is required");
    }

    const headers = await getHeaders();

    try {
      await axios.delete(
        `${this.API_BASE}/${planId.trim()}/chat-history`,
        { headers }
      );
    } catch (error) {
      // Log error but don't throw - don't block navigation
      console.error("[PlanService] Failed to delete plan chat history:", error);
      // Silently fail - navigation should not be blocked
    }
  }
}

