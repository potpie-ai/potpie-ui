import axios, { AxiosError } from "axios";
import getHeaders from "@/app/utils/headers.util";
import { RecipeQuestionsResponse } from "@/lib/types/spec";
import SpecService from "@/services/SpecService";

export interface MCQQuestion {
  id: string;
  section: string;
  question: string;
  options: string[];
  needsInput: boolean;
  assumed?: string;
  reasoning?: string;
}

export interface QuestionAnswer {
  question_id: string;
  text_answer?: string;
  mcq_answer?: string;
  is_user_modified?: boolean;
  is_skipped?: boolean;
}

export interface GenerateQuestionsResponse {
  questions: MCQQuestion[];
}

export interface GetQuestionsResponse {
  questions: MCQQuestion[];
  answers: { [question_id: string]: QuestionAnswer };
}

export interface SubmitAnswersRequest {
  answers: {
    [question_id: string]: {
      text_answer?: string;
      mcq_answer?: string;
    };
  };
}

export interface SubmitAnswersResponse {
  status: string;
  saved_count: number;
}

export interface GeneratePlanResponse {
  plan_id: string;
  plan_document: string;
}

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
    const payload: { project_id: string; feature_idea?: string } = {
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

    try {
      const response = await axios.post<GeneratePlanResponse>(
        `${this.BASE_URL}/plans/generate`,
        {
          project_id: projectId.trim(),
          answers: answers || {},
          additional_context: additionalContext?.trim() || "",
        },
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(this.getErrorMessage(error, "Failed to generate plan"));
    }
  }

  /**
   * Poll recipe questions until they're ready
   * Delegates to SpecService (API: GET /api/v1/recipes/{recipe_id}/questions)
   * @param recipeId - The recipe ID
   * @param onUpdate - Optional callback called when questions become available
   * @param pollInterval - Interval between polls in ms (default 3000)
   */
  static async pollRecipeQuestions(
    recipeId: string,
    onUpdate?: (data: RecipeQuestionsResponse) => void,
    pollInterval: number = 3000
  ): Promise<RecipeQuestionsResponse> {
    if (!recipeId?.trim()) {
      throw new Error("Recipe ID is required");
    }

    while (true) {
      try {
        const data = await SpecService.getRecipeQuestions(recipeId.trim());

        // Immediately notify caller with current data when questions are available
        if (onUpdate && data.questions && data.questions.length > 0) {
          onUpdate(data);
        }

        if (data.questions && data.questions.length > 0) {
          return data;
        }

        if (data.recipe_status === "QUESTIONS_READY") {
          return data;
        }

        if (data.recipe_status === "ERROR") {
          throw new Error(
            data.generation_status === "error"
              ? "Failed to generate questions"
              : "Questions generation failed"
          );
        }

        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error) {
        // If it's a real API error, throw it
        if (
          error instanceof Error &&
          (error.message.includes("Failed") ||
            error.message.includes("generation failed"))
        ) {
          throw error;
        }
        // For transient errors, wait and retry
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }
  }

  /**
   * Get recipe questions directly (without polling)
   * Delegates to SpecService (API: GET /api/v1/recipes/{recipe_id}/questions)
   */
  static async getRecipeQuestions(
    recipeId: string
  ): Promise<RecipeQuestionsResponse> {
    if (!recipeId?.trim()) {
      throw new Error("Recipe ID is required");
    }

    try {
      return await SpecService.getRecipeQuestions(recipeId.trim());
    } catch (error) {
      throw new Error(this.getErrorMessage(error, "Failed to fetch questions"));
    }
  }
}
