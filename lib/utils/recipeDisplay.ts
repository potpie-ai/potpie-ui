import { DEMO_RECIPE_ID, DEMO_RECIPE_TITLE } from "@/lib/mock/demoBuildFlow";
import {
  VECTOR_DEMO_RECIPE_ID,
  VECTOR_DEMO_RECIPE_TITLE,
} from "@/lib/mock/demoVectorSearchFlow";

export function getRecipeDisplayTitle(recipe?: {
  id?: string | null;
  recipe_id?: string | null;
  user_prompt?: string | null;
  title?: string | null;
} | null): string {
  if (!recipe) return "";

  const recipeId = recipe.id || recipe.recipe_id;
  if (recipeId === DEMO_RECIPE_ID) {
    return DEMO_RECIPE_TITLE;
  }
  if (recipeId === VECTOR_DEMO_RECIPE_ID) {
    return VECTOR_DEMO_RECIPE_TITLE;
  }

  return recipe.user_prompt || recipe.title || "";
}
