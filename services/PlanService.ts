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
}

