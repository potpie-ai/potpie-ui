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
   * @param request - Recipe creation request with user_prompt, project_id, and additional_links
   * @returns Recipe creation response with recipe object containing id
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
      console.log("[SpecService] API endpoint:", `${this.API_BASE}/`);

      const response = await axios.post<CreateRecipeCodegenResponse>(
        `${this.API_BASE}/`,
        request,
        { headers },
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
   * Trigger question generation for a recipe
   * POST /api/v1/recipes/{recipe_id}/questions/generate
   * @param recipeId - The recipe ID
   * @param request - Request with user_prompt and optional additional_links
   * @returns Trigger response with status
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
   * @param recipeId - The recipe ID
   * @returns Questions response with generation_status and questions array
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
   * @param recipeId - The recipe ID
   * @param answers - Dictionary of question_id -> answer_text
   * @returns Submit response with new recipe status
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
   * Trigger spec generation for a recipe
   * POST /api/v1/recipes/{recipe_id}/spec/generate
   * Prerequisites: Recipe must be in ANSWERS_SUBMITTED state
   * @param recipeId - The recipe ID
   * @returns Trigger response with status
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
   * Get spec generation progress by recipe_id
   * GET /api/v1/recipes/{recipe_id}/spec
   * @param recipeId - The recipe ID
   * @returns Current spec status and specification data
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
   * Get comprehensive recipe details including repo and branch information
   * Note: This endpoint may not exist in the new /api/v1/recipes API.
   * Falls back gracefully if not available.
   * @param recipeId - The recipe ID
   * @returns Recipe details including repo_name, branch_name, and questions/answers
   */
  static async getRecipeDetails(
    recipeId: string,
  ): Promise<RecipeDetailsResponse> {
    try {
      console.log("[SpecService] Fetching recipe details for:", recipeId);
      const headers = await getHeaders();
      const response = await axios.get<RecipeDetailsResponse>(
        `${this.API_BASE}/${recipeId}/details`,
        { headers },
      );
      console.log("[SpecService] Recipe details response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[SpecService] Error fetching recipe details:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }
}
