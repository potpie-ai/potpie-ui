import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { getDemoRecipe } from "@/lib/mock/demoBuildFlow";

export interface Recipe {
  id: string;
  recipe_id?: string; // Support both id and recipe_id for backward compatibility
  project_id: string;
  user_prompt: string;
  status: string;
  created_at: string;
  repo_name?: string;
  branch_name?: string;
  current_question_task_id?: string | null;
  current_spec_task_id?: string | null;
  current_plan_task_id?: string | null;
}

export interface RecipeDetails {
  recipe_id: string;
  project_id: string;
  user_prompt: string;
  repo_name?: string;
  branch_name?: string;
  questions_and_answers: Array<{
    question_id: string;
    question: string;
    answer?: string;
  }>;
}

export interface AllRecipesResponse {
  recipes: Recipe[];
  total: number;
}

export default class RecipeService {
  private static readonly DEMO_VISIBLE_EMAILS = new Set([
    "tools@potpie.ai",
    "nandan@potpie.ai",
  ]);

  private static getBaseUrl() {
    // Use workflows URL directly for recipe operations
    return process.env.NEXT_PUBLIC_WORKFLOWS_URL;
  }

  private static shouldIncludeDemoRecipe(email?: string | null) {
    const normalizedEmail = email?.trim().toLowerCase();
    return !!normalizedEmail && this.DEMO_VISIBLE_EMAILS.has(normalizedEmail);
  }

  static async getAllRecipes(
    start: number = 0,
    limit: number = 100,
    userEmail?: string | null
  ): Promise<Recipe[]> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<AllRecipesResponse>(
        `${this.getBaseUrl()}/api/v1/recipes/`,
        {
          params: { start, limit },
          headers,
        }
      );
      // Normalize the response - API returns { recipes: [...] }
      const recipes = response.data.recipes || [];
      // Map id to recipe_id for backward compatibility
      const normalizedRecipes = recipes.map((recipe: any) => ({
        ...recipe,
        recipe_id: recipe.id || recipe.recipe_id,
      }));
      return this.shouldIncludeDemoRecipe(userEmail)
        ? [getDemoRecipe(), ...normalizedRecipes]
        : normalizedRecipes;
    } catch (error) {
      console.error("Error fetching recipes:", error);
      return this.shouldIncludeDemoRecipe(userEmail) ? [getDemoRecipe()] : [];
    }
  }

  static async getRecipeDetails(recipeId: string): Promise<RecipeDetails> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<RecipeDetails>(
        `${this.getBaseUrl()}/api/v1/recipe/codegen/${recipeId}/details`,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching recipe details:", error);
      throw new Error("Failed to fetch recipe details");
    }
  }
}
