import axios, { AxiosError } from "axios";
import getHeaders from "@/app/utils/headers.util";
import {
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
  GetQuestionsResponse,
  SubmitAnswersRequest,
  SubmitAnswersResponse,
  GeneratePlanRequest,
  GeneratePlanResponse,
} from "@/lib/types/questions";
import { RecipeQuestionsResponse } from "@/lib/types/spec";

/**
 * Service for interacting with the Questions API
 */
export default class QuestionService {
  private static readonly BASE_URL = `${process.env.NEXT_PUBLIC_WORKFLOWS_URL}/api/v1`;

  /**
   * Extract error message from axios error
   */
  private static getErrorMessage(error: unknown, defaultMessage: string): string {
    if (error instanceof AxiosError) {
      return error.response?.data?.detail || defaultMessage;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return defaultMessage;
  }

  /**
   * Generate questions for a project
   * @param projectId - The project ID
   * @param featureIdea - Optional feature idea/description to generate relevant questions
   */
  static async generateQuestions(
    projectId: string,
    featureIdea?: string
  ): Promise<GenerateQuestionsResponse> {
    if (!projectId?.trim()) {
      throw new Error("Project ID is required");
    }

    const headers = await getHeaders();
    const payload: GenerateQuestionsRequest = {
      project_id: projectId.trim(),
    };

    // Include feature_idea if provided and not empty
    const trimmedIdea = featureIdea?.trim();
    if (trimmedIdea) {
      payload.feature_idea = trimmedIdea;
    }

    try {
      const response = await axios.post<GenerateQuestionsResponse>(
        `${this.BASE_URL}/repos/analyze`,
        payload,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(this.getErrorMessage(error, "Failed to generate questions"));
    }
  }

  /**
   * Get questions and answers for a project
   */
  static async getQuestions(projectId: string): Promise<GetQuestionsResponse> {
    if (!projectId?.trim()) {
      throw new Error("Project ID is required");
    }

    const headers = await getHeaders();

    try {
      const response = await axios.get<GetQuestionsResponse>(
        `${this.BASE_URL}/projects/${projectId.trim()}/questions`,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(this.getErrorMessage(error, "Failed to get questions"));
    }
  }

  /**
   * Submit answers for questions
   */
  static async submitAnswers(
    projectId: string,
    answers: SubmitAnswersRequest["answers"]
  ): Promise<SubmitAnswersResponse> {
    if (!projectId?.trim()) {
      throw new Error("Project ID is required");
    }
    if (!answers || Object.keys(answers).length === 0) {
      throw new Error("Answers are required");
    }

    const headers = await getHeaders();

    try {
      const response = await axios.post<SubmitAnswersResponse>(
        `${this.BASE_URL}/projects/${projectId.trim()}/questions/answers`,
        { answers },
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(this.getErrorMessage(error, "Failed to submit answers"));
    }
  }

  /**
   * Generate implementation plan with answers
   */
  static async generatePlan(
    projectId: string,
    answers: SubmitAnswersRequest["answers"],
    additionalContext?: string
  ): Promise<GeneratePlanResponse> {
    if (!projectId?.trim()) {
      throw new Error("Project ID is required");
    }

    const headers = await getHeaders();
    const payload: GeneratePlanRequest = {
      project_id: projectId.trim(),
      answers: answers || {},
      additional_context: additionalContext?.trim() || "",
    };

    try {
      const response = await axios.post<GeneratePlanResponse>(
        `${this.BASE_URL}/plans/generate`,
        payload,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(this.getErrorMessage(error, "Failed to generate plan"));
    }
  }

  /**
   * Poll recipe questions until they're ready
   * GET /api/v1/recipes/{recipe_id}/questions
   * Polls every 4 seconds, max 60 attempts (4 minutes)
   * @param recipeId - The recipe ID
   * @param pollInterval - Polling interval in ms (default: 4000)
   * @param maxAttempts - Maximum polling attempts (default: 60)
   * @returns Questions when ready
   */
  static async pollRecipeQuestions(
    recipeId: string,
    pollInterval: number = 4000,
    maxAttempts: number = 60
  ): Promise<RecipeQuestionsResponse> {
    if (!recipeId?.trim()) {
      throw new Error("Recipe ID is required");
    }

    const headers = await getHeaders();
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get<RecipeQuestionsResponse>(
          `${this.BASE_URL}/recipes/${recipeId.trim()}/questions`,
          { headers }
        );

        const data = response.data;

        // If questions are available and generation is completed, return them
        if (data.generation_status === 'completed' && data.questions && data.questions.length > 0) {
          return data;
        }

        // If questions are available (even if still processing), return them
        if (data.questions && data.questions.length > 0) {
          return data;
        }

        // If generation failed, throw
        if (data.generation_status === 'failed') {
          throw new Error(data.error_message || "Failed to generate questions");
        }

        // Otherwise, wait and poll again
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        attempts++;
      } catch (error) {
        // If it's a known error (not a network issue), throw
        if (error instanceof Error && error.message.includes("Failed to generate")) {
          throw error;
        }
        // If it's a 404 or other error, wait and retry
        if (attempts < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          attempts++;
          continue;
        }
        throw new Error(this.getErrorMessage(error, "Failed to fetch questions"));
      }
    }

    throw new Error("Timeout waiting for questions to be ready");
  }

  /**
   * Get recipe questions directly (without polling)
   * GET /api/v1/recipes/{recipe_id}/questions
   * @param recipeId - The recipe ID
   * @returns Questions response (may have questions even if generation not completed)
   */
  static async getRecipeQuestions(
    recipeId: string
  ): Promise<RecipeQuestionsResponse> {
    if (!recipeId?.trim()) {
      throw new Error("Recipe ID is required");
    }

    const headers = await getHeaders();

    try {
      const response = await axios.get<RecipeQuestionsResponse>(
        `${this.BASE_URL}/recipes/${recipeId.trim()}/questions`,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(this.getErrorMessage(error, "Failed to fetch questions"));
    }
  }
}
