/**
 * Navigation utilities for the spec generation flow
 */

export const SpecFlowRoutes = {
  idea: () => "/idea",
  repo: (projectId: string, recipeId?: string) => {
    const params = new URLSearchParams({ projectId });
    if (recipeId) params.set("recipeId", recipeId);
    return `/repo?${params.toString()}`;
  },
  spec: (recipeId: string) => `/task/${recipeId}/spec`,
  planOverview: (recipeId: string) => `/task/${recipeId}/plan_overview`,
} as const;

/**
 * Navigate to the spec generation page for a recipe
 */
export const navigateToSpec = (recipeId: string, router: any) => {
  router.push(SpecFlowRoutes.spec(recipeId));
};

/**
 * Navigate to the repository Q&A page for a project
 */
export const navigateToRepo = (projectId: string, recipeId?: string, router?: any) => {
  const url = SpecFlowRoutes.repo(projectId, recipeId);
  if (router) {
    router.push(url);
  }
  return url;
};

/**
 * Extract projectId from URL search params
 */
export const getProjectIdFromParams = (searchParams: URLSearchParams): string | null => {
  return searchParams.get("projectId");
};

/**
 * Extract recipeId from URL search params
 */
export const getRecipeIdFromParams = (searchParams: URLSearchParams): string | null => {
  return searchParams.get("recipeId");
};


