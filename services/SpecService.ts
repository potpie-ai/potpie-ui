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
  RecipeQuestionsResponse,
  SubmitSpecGenerationRequest,
  SubmitSpecGenerationResponse,
  SpecStatusResponse,
} from "@/lib/types/spec";

export default class SpecService {
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_WORKFLOWS_URL;
  private static readonly SPEC_URL = `${this.BASE_URL}/api/v1/recipe/spec`;
  private static readonly API_BASE = `${this.BASE_URL}/api/v1/recipe/codegen`;

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

  /**
   * Create a new recipe and trigger QA question generation
   * @param request - Recipe creation request with user_prompt, repo_slug, and branch/commit
   * @returns Recipe creation response with recipe_id
   */
  static async createRecipeCodegen(
    request: CreateRecipeCodegenRequest
  ): Promise<CreateRecipeCodegenResponse> {
    try {
      console.log("[SpecService] Creating recipe codegen with request:", {
        user_prompt: request.user_prompt,
        repo_slug: request.repo_slug,
        branch: request.branch,
        commit: request.commit,
        additional_links: request.additional_links,
      });
      
      // Validate repo_slug is provided
      if (!request.repo_slug || request.repo_slug.trim() === "") {
        throw new Error("Repository slug is required");
      }

      const headers = await getHeaders();
      console.log("[SpecService] API endpoint:", `${this.API_BASE}`);
      
      const response = await axios.post<CreateRecipeCodegenResponse>(
        `${this.API_BASE}`,
        request,
        { headers }
      );

      console.log("[SpecService] Recipe creation response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[SpecService] Error creating recipe:", error);
      console.error("[SpecService] Error response:", error.response?.data);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get QA questions for a recipe (polling endpoint)
   * @param recipeId - The recipe ID
   * @returns Questions response with recipe_status and questions array
   */
  static async getRecipeQuestions(
    recipeId: string
  ): Promise<RecipeQuestionsResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<RecipeQuestionsResponse>(
        `${this.API_BASE}/${recipeId}/questions`,
        { headers }
      );

      return response.data;
    } catch (error: any) {
      console.error("Error fetching recipe questions:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Submit QA answers and trigger spec generation
   * @param request - Request with recipe_id and qa_answers
   * @returns Response with spec_id and status
   */
  static async submitSpecGeneration(
    request: SubmitSpecGenerationRequest
  ): Promise<SubmitSpecGenerationResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.post<SubmitSpecGenerationResponse>(
        `${this.API_BASE}/spec`,
        request,
        { headers }
      );

      return response.data;
    } catch (error: any) {
      console.error("Error submitting spec generation:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get spec generation progress by spec_id
   * @param specId - The spec ID
   * @returns Current progress and status
   */
  static async getSpecProgressBySpecId(
    specId: string
  ): Promise<SpecStatusResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<SpecStatusResponse>(
        `${this.API_BASE}/spec/${specId}`,
        { headers }
      );

      return response.data;
    } catch (error: any) {
      console.error("Error fetching spec progress:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get latest spec generation progress by recipe_id
   * @param recipeId - The recipe ID
   * @returns Current progress and status
   */
  static async getSpecProgressByRecipeId(
    recipeId: string
  ): Promise<SpecStatusResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<SpecStatusResponse>(
        `${this.API_BASE}/spec/recipe/${recipeId}`,
        { headers }
      );

      return response.data;
    } catch (error: any) {
      console.error("Error fetching spec progress:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }
}

