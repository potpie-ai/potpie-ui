"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const REPO_RECIPE_STORAGE_PREFIX = "repo_recipe_";

/**
 * Legacy /repo route: redirects to /task/[taskId]/qna with the same query params.
 * Recipe ID is taken from ?recipeId= or from localStorage (key repo_recipe_${projectId}) when projectId is present.
 */
export default function RepoRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const recipeIdFromUrl =
      searchParams.get("recipeId") ?? searchParams.get("recipeld");
    const projectId = searchParams.get("projectId");

    let recipeId: string | null = recipeIdFromUrl;

    if (!recipeId && projectId && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(
          `${REPO_RECIPE_STORAGE_PREFIX}${projectId}`
        );
        if (stored) recipeId = stored;
      } catch {
        // ignore
      }
    }

    if (recipeId) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("recipeId");
      params.delete("recipeld");
      const qs = params.toString();
      const path = qs ? `/task/${recipeId}/qna?${qs}` : `/task/${recipeId}/qna`;
      router.replace(path);
      return;
    }

    if (projectId) {
      router.replace(`/newchat?${searchParams.toString()}`);
      return;
    }

    router.replace("/newchat");
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
      Redirecting…
    </div>
  );
}
