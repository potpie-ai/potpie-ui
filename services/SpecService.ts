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
  CreateRecipeApiResponse,
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
  RecipeQuestionsResponse,
  RecipeQuestionsApiResponse,
  RecipeQuestion,
  RecipeQuestionApi,
  SubmitRecipeAnswersRequest,
  SubmitRecipeAnswersResponse,
  SubmitSpecGenerationRequest,
  SubmitSpecGenerationResponse,
  SpecStatusResponse,
  RecipeDetailsResponse,
  SpecChatRequest,
  SpecChatResponse,
  SpecUndoRequest,
  SpecUndoResponse,
} from "@/lib/types/spec";

export default class SpecService {
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_WORKFLOWS_URL;
  private static readonly RECIPES_BASE = `${this.BASE_URL}/api/v1/recipes`;
  private static readonly SPEC_URL = `${this.BASE_URL}/api/v1/recipe/spec`;
  private static readonly API_BASE = `${this.BASE_URL}/api/v1/recipe/codegen`;

  /** Transform API question format to UI RecipeQuestion format */
  private static transformQuestion(q: RecipeQuestionApi, index: number): RecipeQuestion {
    const id = q.id ?? `q-${index}`;
    const options = (q.options ?? []).map((o) =>
      o.description ? `${o.label} - ${o.description}` : o.label
    );
    const preferredOption =
      q.answer_recommendation?.idx != null && q.options?.[q.answer_recommendation.idx]
        ? q.options[q.answer_recommendation.idx].label
        : undefined;
    return {
      id,
      question: q.question,
      options,
      preferred_option: preferredOption,
      allow_custom_answer: !(q.multiple_choice ?? true),
      optional: (q.criticality ?? "IMPORTANT") === "NICE_TO_HAVE",
      order: index,
    };
  }

  /**
   * Create a new recipe for spec generation
   * API: POST /api/v1/recipes/
   */
  static async createRecipe(
    request: CreateRecipeRequest,
  ): Promise<CreateRecipeResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.post<CreateRecipeApiResponse>(
        `${this.RECIPES_BASE}/`,
        request,
        { headers },
      );
      return {
        recipe_id: response.data.recipe.id,
        project_id: response.data.recipe.project_id,
        status: response.data.recipe.status,
        message: "Recipe created successfully",
      };
    } catch (error: any) {
      console.error("[SpecService] Error creating recipe:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Submit QA answers and trigger spec generation (legacy endpoint)
   * @param recipeId - The recipe/task ID (taskId maps directly to recipe_id)
   * @param qaAnswers - Array of QA answers
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
   * Get spec generation progress
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

  /**
   * Create a new recipe and trigger QA question generation
   * API: POST /api/v1/recipes/ then POST /api/v1/recipes/{id}/questions/generate
   */
  static async createRecipeCodegen(
    request: CreateRecipeCodegenRequest,
  ): Promise<CreateRecipeCodegenResponse> {
    try {
      if (!request.project_id || request.project_id.trim() === "") {
        throw new Error("Project ID is required");
      }

      const headers = await getHeaders();

      // 1. Create recipe - POST /api/v1/recipes/
      const createResponse = await axios.post<CreateRecipeApiResponse>(
        `${this.RECIPES_BASE}/`,
        {
          user_prompt: request.user_prompt,
          project_id: request.project_id,
          additional_links: request.additional_links,
        },
        { headers },
      );

      const recipeId = createResponse.data.recipe.id;
      const projectId = createResponse.data.recipe.project_id;

      // 2. Trigger question generation - POST /api/v1/recipes/{recipe_id}/questions/generate
      await axios.post<GenerateQuestionsResponse>(
        `${this.RECIPES_BASE}/${recipeId}/questions/generate`,
        {
          user_prompt: request.user_prompt,
          additional_links: request.additional_links,
        },
        { headers },
      );

      return {
        recipe_id: recipeId,
        project_id: projectId,
        status: createResponse.data.recipe.status,
        message: "Recipe created and question generation started",
      };
    } catch (error: any) {
      console.error("[SpecService] Error creating recipe:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get QA questions for a recipe
   * API: GET /api/v1/recipes/{recipe_id}/questions
   */
  static async getRecipeQuestions(
    recipeId: string,
  ): Promise<RecipeQuestionsResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<RecipeQuestionsApiResponse>(
        `${this.RECIPES_BASE}/${recipeId}/questions`,
        { headers },
      );

      const api = response.data;
      const recipeStatus =
        api.generation_status === "completed"
          ? "QUESTIONS_READY"
          : api.generation_status === "error"
            ? "ERROR"
            : "PENDING_QUESTIONS";

      return {
        recipe_id: api.recipe_id,
        recipe_status: recipeStatus,
        generation_status: api.generation_status,
        questions: api.questions.map((q, i) =>
          this.transformQuestion(q, i),
        ),
      };
    } catch (error: any) {
      console.error("Error fetching recipe questions:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Submit answers for a recipe
   * API: POST /api/v1/recipes/{recipe_id}/answers
   */
  static async submitRecipeAnswers(
    recipeId: string,
    request: SubmitRecipeAnswersRequest,
  ): Promise<SubmitRecipeAnswersResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.post<SubmitRecipeAnswersResponse>(
        `${this.RECIPES_BASE}/${recipeId}/answers`,
        request,
        { headers },
      );
      return response.data;
    } catch (error: any) {
      console.error("Error submitting recipe answers:", error);
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
    request: SubmitSpecGenerationRequest,
  ): Promise<SubmitSpecGenerationResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.post<SubmitSpecGenerationResponse>(
        `${this.API_BASE}/spec`,
        request,
        { headers },
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
    specId: string,
  ): Promise<SpecStatusResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<SpecStatusResponse>(
        `${this.API_BASE}/spec/${specId}`,
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
   * Get latest spec generation progress by recipe_id
   * @param recipeId - The recipe ID
   * @returns Current progress and status
   */
  static async getSpecProgressByRecipeId(
    recipeId: string,
  ): Promise<SpecStatusResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<SpecStatusResponse>(
        `${this.API_BASE}/spec/recipe/${recipeId}`,
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
   * API: GET /api/v1/recipes/{recipe_id}
   * Note: potpie-workflows does not store repo_name/branch_name; use URL params or localStorage as fallback
   * @param recipeId - The recipe ID
   * @returns Recipe details including repo_name, branch_name, and questions/answers
   */
  static async getRecipeDetails(
    recipeId: string,
  ): Promise<RecipeDetailsResponse> {
    try {
      console.log("[SpecService] Fetching recipe details for:", recipeId);
      const headers = await getHeaders();
      const response = await axios.get<{ recipe: { id: string; project_id: string; user_prompt: string } }>(
        `${this.RECIPES_BASE}/${recipeId}`,
        { headers },
      );

      const recipe = response.data.recipe;
      const details: RecipeDetailsResponse = {
        recipe_id: String(recipe.id),
        project_id: recipe.project_id,
        user_prompt: recipe.user_prompt,
        repo_name: null,
        branch_name: null,
        questions_and_answers: [],
      };

      console.log("[SpecService] Recipe details response:", details);
      return details;
    } catch (error: any) {
      console.error("[SpecService] Error fetching recipe details:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Chat with the spec agent to modify the spec
   * @param specId - The spec ID
   * @param request - Chat request with message and edit_history for multi-turn context
   */
  static async chatSpec(
    specId: string,
    request: SpecChatRequest,
  ): Promise<SpecChatResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.post<SpecChatResponse>(
        `${this.API_BASE}/spec/${specId}/chat`,
        request,
        { headers },
      );
      return response.data;
    } catch (error: any) {
      console.error("Error in spec chat:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Undo the last spec edit using the undo token from chat response
   * @param specId - The spec ID
   * @param request - Undo request with undo_token
   */
  static async undoSpecEdit(
    specId: string,
    request: SpecUndoRequest,
  ): Promise<SpecUndoResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.post<SpecUndoResponse>(
        `${this.API_BASE}/spec/${specId}/undo`,
        request,
        { headers },
      );
      return response.data;
    } catch (error: any) {
      console.error("Error undoing spec edit:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }
}