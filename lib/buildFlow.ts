/** Build flow steps: QnA → Spec → Plan → Codegen (task routes). */

export type BuildFlowStep = "qna" | "spec" | "plan" | "code";

export const BUILD_FLOW_STEP_ORDER: BuildFlowStep[] = [
  "qna",
  "spec",
  "plan",
  "code",
];

export const BUILD_FLOW_STEPS: Array<{
  id: BuildFlowStep;
  label: string;
  path: string;
}> = [
  { id: "qna", label: "Q&A", path: "/qna" },
  { id: "spec", label: "Spec", path: "/spec" },
  { id: "plan", label: "Plan", path: "/plan" },
  { id: "code", label: "Code", path: "/code" },
];

export function buildFlowStepFromPathname(pathname: string | null): BuildFlowStep {
  if (!pathname) return "qna";
  if (pathname.includes("/code")) return "code";
  if (pathname.includes("/plan")) return "plan";
  if (pathname.includes("/spec")) return "spec";
  if (pathname.includes("/qna")) return "qna";
  return "qna";
}

/** True while recipe is still in the clarifying-questions phase (spec not yet available). */
export function isRecipeInQuestionOnlyPhase(status: string | null | undefined): boolean {
  if (status == null || status === "") return true;
  const u = status.toUpperCase();
  if (u === "ANSWERS_SUBMITTED") return false;
  if (u === "QUESTIONS_READY" || u === "PENDING_QUESTIONS") return true;
  if (u.includes("SPEC") || u.includes("PLAN")) return false;
  if (u.includes("QUESTION")) return true;
  return false;
}

/**
 * Furthest step index (0–3) the user may move forward to, based on recipe status and current URL.
 * Back navigation always allows earlier steps; this caps forward jumps.
 */
export function computeMaxReachableStepIndex(
  recipeStatus: string | null | undefined,
  pathname: string | null
): number {
  const s = (recipeStatus ?? "").toUpperCase();
  const path = pathname ?? "";

  let max = 0;

  if (!isRecipeInQuestionOnlyPhase(recipeStatus)) {
    max = Math.max(max, 1);
  }

  if (
    s === "SPEC_READY" ||
    s.includes("PLAN") ||
    s.includes("CODEGEN") ||
    s.includes("TASK_SPLITTING") ||
    s.includes("IMPLEMENTATION")
  ) {
    max = Math.max(max, 2);
  }

  // Code tab: not unlocked by PLAN_READY alone — user must use "Start implementation"
  // on the plan page (or recipe status must reflect codegen / task-splitting).
  if (
    s.includes("CODEGEN") ||
    s.includes("TASK_SPLITTING") ||
    s.includes("IMPLEMENTATION")
  ) {
    max = Math.max(max, 3);
  }

  if (path.includes("/spec")) max = Math.max(max, 1);
  if (path.includes("/plan")) max = Math.max(max, 2);
  if (path.includes("/code")) max = Math.max(max, 3);

  return Math.min(max, 3);
}

export function canNavigateToBuildFlowStep(
  target: BuildFlowStep,
  active: BuildFlowStep,
  maxReachableIndex: number
): boolean {
  const ti = BUILD_FLOW_STEP_ORDER.indexOf(target);
  const ai = BUILD_FLOW_STEP_ORDER.indexOf(active);
  if (ti <= ai) return true;
  return ti <= maxReachableIndex;
}

/** sessionStorage key for last codegen query (planId / taskSplittingId) per recipe. */
const codegenQueryStorageKey = (recipeId: string) =>
  `potpie_codegen_query_${recipeId}`;

/** Set when implementation/codegen has been started so the Code tab stays reachable after leaving /code. */
const codegenStartedStorageKey = (recipeId: string) =>
  `potpie_codegen_started_${recipeId}`;

export const CODEGEN_STARTED_EVENT = "potpie-codegen-started";

export function markCodegenStartedForRecipe(recipeId: string): void {
  if (typeof window === "undefined" || !recipeId) return;
  try {
    sessionStorage.setItem(codegenStartedStorageKey(recipeId), "1");
    window.dispatchEvent(
      new CustomEvent(CODEGEN_STARTED_EVENT, { detail: { recipeId } }),
    );
  } catch {
    // ignore
  }
}

export function hasCodegenStartedForRecipe(recipeId: string): boolean {
  if (typeof window === "undefined" || !recipeId) return false;
  try {
    return sessionStorage.getItem(codegenStartedStorageKey(recipeId)) === "1";
  } catch {
    return false;
  }
}

/**
 * True when spec output has been produced at least once (recipe status reflects
 * SPEC_READY or later build stages). Used for QnA primary button label.
 */
export function hasSpecBeenCompletedOnce(
  recipeStatus: string | null | undefined,
): boolean {
  if (!recipeStatus) return false;
  const u = recipeStatus.toUpperCase();
  if (u === "SPEC_READY") return true;
  if (
    u.includes("PLAN") ||
    u.includes("CODEGEN") ||
    u.includes("TASK_SPLITTING") ||
    u.includes("IMPLEMENTATION")
  ) {
    return true;
  }
  if (u.includes("SPEC") && (u.includes("READY") || u.includes("COMPLETE"))) {
    return true;
  }
  return false;
}

/**
 * True when implementation/codegen has been started before (recipe status or session).
 * Used for Plan "Start implementation" button label.
 */
export function hasImplementationBeenStartedBefore(
  recipeStatus: string | null | undefined,
  sessionCodegenStarted: boolean,
): boolean {
  if (sessionCodegenStarted) return true;
  const s = (recipeStatus ?? "").toUpperCase();
  return (
    s.includes("CODEGEN") ||
    s.includes("TASK_SPLITTING") ||
    s.includes("IMPLEMENTATION")
  );
}

/**
 * Persist last codegen URL query for a recipe so build-flow tabs can return to the
 * same slice / taskSplittingId instead of `/code` bare (which defaults itemNumber=1).
 */
export function persistCodegenQueryString(
  recipeId: string,
  search: string
): void {
  if (typeof window === "undefined" || !recipeId) return;
  const trimmed = search.startsWith("?") ? search.slice(1) : search;
  if (!trimmed) return;
  const params = new URLSearchParams(trimmed);
  if (!params.get("planId") && !params.get("taskSplittingId")) return;
  try {
    sessionStorage.setItem(codegenQueryStorageKey(recipeId), trimmed);
  } catch {
    // ignore quota / private mode
  }
}

/** Prefer restoring last codegen query; fallback to bare code route. */
export function getCodegenHrefForRecipe(recipeId: string): string {
  const base = `/task/${recipeId}/code`;
  if (typeof window === "undefined") return base;
  try {
    const stored = sessionStorage.getItem(codegenQueryStorageKey(recipeId));
    if (stored) return `${base}?${stored}`;
  } catch {
    // ignore
  }
  return base;
}
