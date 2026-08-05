import { DEMO_RECIPE_ID, getDemoRecipeStatus } from "@/lib/mock/demoBuildFlow";

/**
 * Deep-link for a build flow (recipe) by status. Kept in sync with all-chats routing.
 */
export function getRecipeRedirectUrl(recipe: {
  id?: string;
  recipe_id?: string;
  project_id?: string;
  status?: string;
}): string {
  const recipeId = recipe.id || recipe.recipe_id;
  const status = (recipe.status || "").toUpperCase();

  if (recipeId === DEMO_RECIPE_ID) {
    const demoStatus = getDemoRecipeStatus().toUpperCase();
    const step = demoStatus.includes("TASK_SPLITTING") || demoStatus.includes("IMPLEMENTATION")
      ? "code"
      : demoStatus.includes("PLAN")
        ? "plan"
        : demoStatus.includes("SPEC") || demoStatus === "ANSWERS_SUBMITTED"
          ? "spec"
          : "qna";
    return `/task/${recipeId}/${step}`;
  }

  if (status.includes("QUESTIONS")) {
    const params = new URLSearchParams();
    if (recipe.project_id) {
      params.set("projectId", recipe.project_id);
    }
    if (recipeId) {
      params.set("recipeId", recipeId);
    }
    return `/repo?${params.toString()}`;
  }

  if (status.includes("SPEC") || status === "ANSWERS_SUBMITTED") {
    return `/task/${recipeId}/spec`;
  }

  if (status.includes("PLAN")) {
    return `/task/${recipeId}/plan`;
  }

  const params = new URLSearchParams();
  if (recipe.project_id) {
    params.set("projectId", recipe.project_id);
  }
  if (recipeId) {
    params.set("recipeId", recipeId);
  }
  return `/repo?${params.toString()}`;
}
