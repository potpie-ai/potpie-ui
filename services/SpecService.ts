import axios, { AxiosError } from "axios";
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
  RecipeDetailsResponse,
  SpecChatRequest,
  SpecChatResponse,
  SpecUndoRequest,
  SpecUndoResponse,
  SpecOutput,
  SpecEditRequest,
  SpecEditResponse,
} from "@/lib/types/spec";

/**
 * Service for interacting with the Spec API
 */
export default class SpecService {
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_WORKFLOWS_URL;
  private static readonly SPEC_URL = `${this.BASE_URL}/api/v1/recipe/spec`;
  private static readonly API_BASE = `${this.BASE_URL}/api/v1/recipe/codegen`;
  private static readonly CODEGEN_BASE = `${this.BASE_URL}/api/v1`;

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
   * Create a new recipe for spec generation
   * @param request - Recipe creation request with project_id and user_prompt
   * @returns Recipe creation response with recipe_id
   */
  static async createRecipe(
    request: CreateRecipeRequest,
  ): Promise<CreateRecipeResponse> {
    try {
      console.log("[SpecService] Creating recipe with request:", request);
      console.log(
        "[SpecService] API endpoint:",
        `${this.BASE_URL}/api/v1/recipe`,
      );

      const headers = await getHeaders();
      console.log("[SpecService] Making POST request to create recipe...");

      const response = await axios.post<CreateRecipeResponse>(
        `${this.BASE_URL}/api/v1/recipe`,
        request,
        {
          headers,
        },
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
    qaAnswers: QAAnswer[],
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
        },
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
    recipeId: string,
  ): Promise<SpecPlanStatusResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<SpecPlanStatusResponse>(
        `${this.SPEC_URL}/${recipeId}`,
        {
          headers,
        },
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
    request: CreateRecipeCodegenRequest,
  ): Promise<CreateRecipeCodegenResponse> {
    try {
      console.log("[SpecService] Creating recipe codegen with request:", {
        user_prompt: request.user_prompt,
        project_id: request.project_id,
        additional_links: request.additional_links,
      });

      if (!request.project_id || request.project_id.trim() === "") {
        throw new Error("Project ID is required");
      }

      const headers = await getHeaders();
      console.log("[SpecService] API endpoint:", `${this.API_BASE}`);

      const response = await axios.post<CreateRecipeCodegenResponse>(
        `${this.API_BASE}`,
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
   * Get spec by spec_id
   * GET /api/v1/recipe/codegen/spec/{specId}
   * @param specId - The spec ID
   */
  static async getSpec(specId: string): Promise<SpecStatusResponse> {
    if (!specId?.trim()) {
      throw new Error("Spec ID is required");
    }

    const headers = await getHeaders();

    try {
      const response = await axios.get<SpecStatusResponse>(
        `${this.CODEGEN_BASE}/recipe/codegen/spec/${specId.trim()}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error, "Failed to fetch spec");
      if (error instanceof AxiosError) {
        if (error.response?.status === 403) {
          throw new Error("Access denied");
        }
        if (error.response?.status === 404) {
          throw new Error("Spec not found");
        }
      }
      throw new Error(errorMessage);
    }
  }

  /**
   * Get QA questions for a recipe (polling endpoint)
   * @param recipeId - The recipe ID
   * @returns Questions response with recipe_status and questions array
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
   * Get spec by recipe_id (path param, no query)
   * GET /api/v1/recipe/codegen/spec/recipe/{recipe_id}
   * @param recipeId - The recipe ID
   */
  static async getSpecByRecipeId(recipeId: string): Promise<SpecStatusResponse> {
    if (!recipeId?.trim()) {
      throw new Error("Recipe ID is required");
    }

    const headers = await getHeaders();

    try {
      const response = await axios.get<SpecStatusResponse>(
        `${this.CODEGEN_BASE}/recipe/codegen/spec/recipe/${recipeId.trim()}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error, "Failed to fetch spec");
      if (error instanceof AxiosError) {
        if (error.response?.status === 403) {
          throw new Error("Access denied");
        }
        if (error.response?.status === 404) {
          throw new Error("Spec not found");
        }
      }
      throw new Error(errorMessage);
    }
  }

  /**
   * Submit QA answers and trigger spec generation
   * POST /api/v1/recipe/codegen/spec — recipe_id and qa_answers in body only
   * @param request - Request with recipe_id and qa_answers (question_id, answer)[]
   * @returns Response with spec_id and status
   */
  static async submitSpecGeneration(
    request: SubmitSpecGenerationRequest,
  ): Promise<SubmitSpecGenerationResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.post<SubmitSpecGenerationResponse>(
        `${this.CODEGEN_BASE}/recipe/codegen/spec`,
        request,
        { headers },
      );

      return response.data;
    } catch (error) {
      throw new Error(this.getErrorMessage(error, "Failed to submit spec generation"));
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
   * GET /api/v1/recipe/codegen/{recipe_id}/details
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
        `${this.CODEGEN_BASE}/recipe/codegen/${recipeId.trim()}/details`,
        { headers },
      );

      console.log("[SpecService] Recipe details response:", response.data);
      return response.data;
    } catch (error) {
      throw new Error(this.getErrorMessage(error, "Failed to fetch recipe details"));
    }
  }

  /**
   * Chat with Spec Editor Agent
   * @param specId - The spec ID
   * @param request - Chat request with message and optional edit_history
   */
  static async chatWithSpecEditor(
    specId: string,
    request: SpecChatRequest
  ): Promise<SpecChatResponse> {
    if (!specId?.trim()) {
      throw new Error("Spec ID is required");
    }
    if (!request.message?.trim()) {
      throw new Error("Message is required");
    }

    const headers = await getHeaders();

    try {
      const response = await axios.post<SpecChatResponse>(
        `${this.CODEGEN_BASE}/recipe/codegen/spec/${specId.trim()}/chat`,
        request,
        { headers }
      );
      return response.data;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error, "Failed to send message");
      if (error instanceof AxiosError) {
        if (error.response?.status === 403) {
          throw new Error("Access denied");
        }
        if (error.response?.status === 404) {
          throw new Error("Spec not found");
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
   * Undo spec edit
   * POST /api/v1/recipe/codegen/spec/undo
   * @param request - Undo request with spec_id and undo_token
   */
  static async undoSpecEdit(
    request: SpecUndoRequest
  ): Promise<SpecUndoResponse> {
    if (!request.spec_id?.trim()) {
      throw new Error("Spec ID is required");
    }
    if (!request.undo_token?.trim()) {
      throw new Error("Undo token is required");
    }

    const headers = await getHeaders();

    try {
      const response = await axios.post<SpecUndoResponse>(
        `${this.API_BASE}/spec/undo`,
        request,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error("[SpecService] Error undoing spec edit:", error);
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
          throw new Error("Spec not found. The spec may have been deleted or the ID is incorrect.");
        }
        if (status === 400) {
          throw new Error(errorMessage || "Invalid undo token or spec not completed. The undo token may have expired or already been used.");
        }
        if (status === 405) {
          throw new Error("Method not allowed. The undo endpoint may not be available.");
        }
        if (status === 500) {
          // Server error - try to extract more details
          const serverError = errorMessage || "Internal server error occurred while undoing the edit.";
          console.error("[SpecService] Server error details:", responseData);
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
   * Delete chat history for a spec
   * DELETE /api/v1/recipe/codegen/spec/{specId}/chat-history
   * @param specId - The spec ID
   */
  static async deleteChatHistory(specId: string): Promise<void> {
    if (!specId?.trim()) {
      throw new Error("Spec ID is required");
    }

    const headers = await getHeaders();

    try {
      await axios.delete(
        `${this.API_BASE}/spec/${specId.trim()}/chat-history`,
        { headers }
      );
    } catch (error) {
      // Log error but don't throw - don't block navigation
      console.error("[SpecService] Failed to delete chat history:", error);
      // Silently fail - navigation should not be blocked
    }
  }

  /**
   * Edit spec via Spec Editor Agent
   * POST /api/v1/recipe/codegen/spec/edit
   * @param request - Edit request with spec_id and user_message
   * @returns Edit response with applied edits, errors, conflicts, etc.
   */
  static async editSpec(request: SpecEditRequest): Promise<SpecEditResponse> {
    if (!request.spec_id?.trim()) {
      throw new Error("Spec ID is required");
    }
    if (!request.user_message?.trim()) {
      throw new Error("User message is required");
    }

    const headers = await getHeaders();

    try {
      const response = await axios.post<SpecEditResponse>(
        `${this.API_BASE}/spec/edit`,
        request,
        { headers }
      );
      return response.data;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error, "Failed to edit spec");
      if (error instanceof AxiosError) {
        if (error.response?.status === 403) {
          throw new Error("Access denied");
        }
        if (error.response?.status === 404) {
          throw new Error("Spec not found");
        }
        if (error.response?.status === 400) {
          const detail = error.response?.data?.detail || error.response?.data?.message;
          throw new Error(detail || "Invalid request");
        }
      }
      throw new Error(errorMessage);
    }
  }
}
