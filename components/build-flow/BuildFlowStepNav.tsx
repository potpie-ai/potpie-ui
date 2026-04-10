"use client";

import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import SpecService from "@/services/SpecService";
import {
  BUILD_FLOW_STEPS,
  buildFlowStepFromPathname,
  canNavigateToBuildFlowStep,
  computeMaxReachableStepIndex,
  type BuildFlowStep,
} from "@/lib/buildFlow";
import { cn } from "@/lib/utils";
import { getCodegenHrefForRecipe } from "@/lib/buildFlow";

type BuildFlowStepNavProps = {
  recipeId: string;
  className?: string;
};

export function BuildFlowStepNav({ recipeId, className }: BuildFlowStepNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const { data: recipeDetails } = useQuery({
    queryKey: ["recipe-details", recipeId, "build-flow-nav"],
    queryFn: () => SpecService.getRecipeDetails(recipeId),
    enabled: Boolean(recipeId),
    staleTime: 10_000,
  });

  const recipeStatus = recipeDetails?.status ?? null;
  const maxReachableIndex = computeMaxReachableStepIndex(recipeStatus, pathname);
  const activeStep = buildFlowStepFromPathname(pathname);

  const go = (step: BuildFlowStep, href: string) => {
    if (!canNavigateToBuildFlowStep(step, activeStep, maxReachableIndex)) return;
    if (step === activeStep) return;
    router.push(step === "code" ? getCodegenHrefForRecipe(recipeId) : href);
  };

  return (
    <nav
      className={cn(
        "font-uncut flex h-[34px] w-[min(194px,100%)] max-w-full shrink-0 items-center gap-0 rounded-[8px] bg-[#F5F5F5] px-1 py-0",
        className
      )}
      aria-label="Build flow"
    >
      {BUILD_FLOW_STEPS.map((step) => {
        const enabled = canNavigateToBuildFlowStep(
          step.id,
          activeStep,
          maxReachableIndex
        );
        const isActive = step.id === activeStep;
        const href =
          step.id === "code"
            ? getCodegenHrefForRecipe(recipeId)
            : `/task/${recipeId}${step.path}`;

        return (
          <div
            key={step.id}
            className="flex h-full min-w-0 flex-1 items-center justify-center"
          >
            <button
              type="button"
              disabled={!enabled}
              title={
                !enabled
                  ? "Complete the current step to unlock this stage"
                  : undefined
              }
              onClick={() => go(step.id, href)}
              className={cn(
                "relative flex items-center justify-center whitespace-nowrap text-center font-semibold leading-none tracking-tight transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#022019]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F5F5]",
                isActive
                  ? "box-border h-[23px] w-[49px] max-w-full -translate-y-px rounded-[7px] bg-[#FFFFFF] px-0.5 text-[10px] text-[#022019] shadow-[0_1px_2px_#00000026]"
                  : "h-full min-h-0 w-full rounded-md px-1 py-0 text-xs",
                !isActive &&
                  enabled &&
                  "text-[#5C6663] hover:text-[#022019]",
                !isActive &&
                  !enabled &&
                  "cursor-not-allowed text-zinc-400",
              )}
            >
              {step.label}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
