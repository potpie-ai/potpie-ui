import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { parseApiError } from "@/lib/utils";
import { throwIfProFeatureError } from "@/lib/hooks/useProFeatureError";
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
      
      throwIfProFeatureError(error, "Build a feature is not available");
      
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
      
      throwIfProFeatureError(error, "Build a feature is not available");
      
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
   * Get comprehensive recipe details including repo and branch information
   * GET /api/v1/recipes/{recipe_id}/details
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
