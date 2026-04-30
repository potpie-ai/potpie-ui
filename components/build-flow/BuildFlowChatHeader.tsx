"use client";

import { Github, GitBranch } from "lucide-react";
import { BuildFlowStepNav } from "./BuildFlowStepNav";
import { cn } from "@/lib/utils";

type BuildFlowChatHeaderProps = {
  recipeId: string;
  title: string;
  repoName: string;
  branchName: string;
  className?: string;
  /** Plan page uses a darker title color to match existing layout */
  variant?: "default" | "plan";
};

export function BuildFlowChatHeader({
  recipeId,
  title,
  repoName,
  branchName,
  className,
  variant = "default",
}: BuildFlowChatHeaderProps) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-row items-center justify-between gap-4",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <h1
          className={cn(
            "text-lg font-bold truncate capitalize",
            variant === "plan" ? "text-[#022019]" : "text-primary-color"
          )}
        >
          {title}
        </h1>
        <div className="mt-0.5 flex flex-row flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#506561]">
          <span className="flex min-w-0 items-center gap-1.5">
            <Github className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            <span className="truncate">{repoName || "Unknown Repository"}</span>
          </span>
          <span className="flex min-w-0 shrink-0 items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            <span className="truncate">{branchName || "main"}</span>
          </span>
        </div>
      </div>
      <BuildFlowStepNav
        recipeId={recipeId}
        className="ml-auto shrink-0 overflow-x-auto pb-0.5 [scrollbar-width:thin]"
      />
    </div>
  );
}
