import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { parseApiError } from "@/lib/utils";
import {
  PlanGenerationRequest,
  PlanSubmitResponse,
  PlanStatusResponse,
  PlanItemsResponse,
} from "@/lib/types/spec";

export default class PlanService {
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_WORKFLOWS_URL;
  /** New API base: /api/v1/recipes */
  private static readonly API_BASE = `${this.BASE_URL}/api/v1/recipes`;

  /**
   * Trigger plan generation for a recipe
   * POST /api/v1/recipes/{recipe_id}/plan/generate
   * Prerequisites: Recipe must be in SPEC_READY state
   * @param recipeId - The recipe ID
   * @returns Trigger response with status
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
        {}, // Empty body per API contract
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
   * @param recipeId - Recipe UUID
   * @returns Plan status, items, and generation details
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

