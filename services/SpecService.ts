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
} from "@/lib/types/spec";

export default class SpecService {
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_WORKFLOWS_URL;
  private static readonly SPEC_URL = `${this.BASE_URL}/api/v1/recipe/spec`;

  /**
   * Create a new recipe for spec generation
   * @param request - Recipe creation request with project_id and user_prompt
   * @returns Recipe creation response with recipe_id
   */
  static async createRecipe(
    request: CreateRecipeRequest
  ): Promise<CreateRecipeResponse> {
    try {
      console.log("[SpecService] Creating recipe with request:", request);
      console.log("[SpecService] API endpoint:", `${this.BASE_URL}/api/v1/recipe`);
      
      const headers = await getHeaders();
      console.log("[SpecService] Making POST request to create recipe...");
      
      const response = await axios.post<CreateRecipeResponse>(
        `${this.BASE_URL}/api/v1/recipe`,
        request,
        {
          headers,
        }
      );

      console.log("[SpecService] Recipe creation response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[SpecService] Error creating recipe:", error);
      console.error("[SpecService] Error response:", error.response?.data);
      console.error("[SpecService] Error status:", error.response?.status);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Submit QA answers and trigger spec generation
   * @param recipeId - The recipe/task ID (taskId maps directly to recipe_id)
   * @param qaAnswers - Array of QA answers
   * @returns Response indicating if spec generation started
   */
  static async submitQAAnswers(
    recipeId: string,
    qaAnswers: QAAnswer[]
  ): Promise<SpecPlanSubmitResponse> {
    try {
      const headers = await getHeaders();
      const request: SpecPlanRequest = {
        recipe_id: recipeId, // taskId maps directly to recipe_id
        qa_answers: qaAnswers,
      };

      const response = await axios.post<SpecPlanSubmitResponse>(
        this.SPEC_URL,
        request,
        {
          headers,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("Error submitting QA answers:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get spec generation progress
   * @param recipeId - The recipe/task ID (taskId maps directly to recipe_id)
   * @returns Current progress and status
   */
  static async getSpecProgress(
    recipeId: string
  ): Promise<SpecPlanStatusResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<SpecPlanStatusResponse>(
        `${this.SPEC_URL}/${recipeId}`,
        {
          headers,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("Error fetching spec progress:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }
}

