import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

export default class SpecService {
  static async createRecipe(data: {
    project_id: string;
    user_prompt: string;
    user_requirements: Record<string, any>;
  }) {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      const response = await axios.post(
        `${baseUrl}/api/v1/recipes/`,
        data,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error("Error creating recipe:", error);
      throw new Error("Error creating recipe");
    }
  }

  static async submitQAAnswers(recipeId: string, qaAnswers: any) {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      const response = await axios.post(
        `${baseUrl}/api/v1/recipes/${recipeId}/submit-qa`,
        { qa_answers: qaAnswers },
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error("Error submitting QA answers:", error);
      throw new Error("Error submitting QA answers");
    }
  }
}

