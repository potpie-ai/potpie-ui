/**
 * @deprecated This file is part of Flow A (mock flow) and will be removed in a future version.
 * 
 * Flow A has been replaced by Flow B which uses real API integration:
 * - Entry: /newchat (instead of /newtask)
 * - Q&A: /task/[taskId]/qna
 * - Spec: /task/[recipeId]/spec (now uses real API instead of mock data)
 * - Plan: /task/[recipeId]/plan_overview
 * 
 * This file should be removed after Flow B is fully tested and stable.
 * 
 * @see IMPLEMENTATION_PLAN_FLOW_B_SPEC_INTEGRATION.md
 * @see /app/(main)/newchat/page.tsx - New entry point
 * @see /app/(main)/task/[taskId]/qna/page.tsx - Real Q&A flow
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import {
  createMockTaskResponse,
  saveMockTaskToSession,
} from "@/lib/mock/taskMock";
import {
  RepoBranchDropdown,
  type RepoIdentifier,
  getRepoIdentifier,
} from "@/components/RepoBranchDropdown";
import { NEW_TASK_CONSTANTS } from "./constants";

interface ValidationError {
  field: "repository" | "message";
  message: string;
}

interface TaskError extends Error {
  message: string;
}

const NewTask = () => {
  const router = useRouter();
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [repoOpen, setRepoOpen] = useState<boolean>(false);
  const [branchOpen, setBranchOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { data: userRepositories, isLoading: userRepositoriesLoading } =
    useQuery({
      queryKey: ["user-repository"],
      queryFn: async () => {
        const repos = await BranchAndRepositoryService.getUserRepositories();
        return repos;
      },
    });

  const { data: userBranches, isLoading: userBranchesLoading } = useQuery({
    queryKey: ["user-branch", selectedRepo],
    queryFn: () => {
      return BranchAndRepositoryService.getBranchList(selectedRepo);
    },
    enabled: !!selectedRepo && selectedRepo !== "",
  });

  // Auto-select first branch when branches are loaded
  useEffect(() => {
    if (userBranches && userBranches.length >= 1 && !selectedBranch) {
      setSelectedBranch(userBranches[0]);
    }
  }, [userBranches, selectedBranch]);

  // Reset branch when repo changes
  useEffect(() => {
    setSelectedBranch("");
  }, [selectedRepo]);

  const validateInput = (): ValidationError | null => {
    if (!selectedRepo) {
      return { field: "repository", message: "Please select a repository" };
    }
    if (!message.trim()) {
      return { field: "message", message: "Please enter a message" };
    }
    return null;
  };

  const handleSend = async (): Promise<void> => {
    const validationError = validateInput();
    if (validationError) {
      toast.error(validationError.message);
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate mock task response
      const mockTask = createMockTaskResponse(
        message.trim(),
        selectedRepo,
        selectedBranch,
      );

      // Save to session storage
      saveMockTaskToSession(mockTask.task_id, mockTask);

      // Redirect to user Q&A page
      router.push(`/task/${mockTask.task_id}/userqa`);
    } catch (error: unknown) {
      const taskError = error as TaskError;
      toast.error(
        `${NEW_TASK_CONSTANTS.ERROR_MESSAGES.CREATE_TASK}${taskError.message}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string): void => {
    setMessage(suggestion);
  };

  return (
    <div
      className={`relative flex flex-col h-full ${NEW_TASK_CONSTANTS.UI.MIN_HEIGHT} px-4 md:px-10 py-6 items-center justify-center`}
    >
      <div className="absolute top-1/4 text-center">
        <h1 className="text-4xl font-semibold mb-2">
          {NEW_TASK_CONSTANTS.UI.TITLE}
        </h1>
      </div>

      {/* Input Area with Repo/Branch Selection */}
      <div className={`w-full ${NEW_TASK_CONSTANTS.UI.MAX_WIDTH}`}>
        <div className="flex flex-col gap-3 p-4 border rounded-xl bg-background shadow-sm overflow-visible">
          {/* Textarea with Send Button */}
          <div className="relative">
            <textarea
              placeholder={NEW_TASK_CONSTANTS.PLACEHOLDERS.MESSAGE}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`w-full ${NEW_TASK_CONSTANTS.UI.TEXTAREA_MIN_HEIGHT} ${NEW_TASK_CONSTANTS.UI.TEXTAREA_MAX_HEIGHT} resize-none border-0 focus-visible:outline-none bg-transparent text-sm px-1 py-2 pr-10`}
              onKeyDown={handleKeyDown}
              aria-label="Task message"
              disabled={isSubmitting}
            />
            <Button
              className="absolute bottom-2 right-2 h-8 px-2"
              size="sm"
              disabled={!selectedRepo || !message.trim() || isSubmitting}
              onClick={handleSend}
              aria-label="Create task"
            >
              <ArrowUp
                className={NEW_TASK_CONSTANTS.STYLING.ICON_SIZE}
                strokeWidth={NEW_TASK_CONSTANTS.STYLING.ICON_STROKE_WIDTH}
              />
            </Button>
          </div>

          {/* Repo/Branch Dropdowns Row */}
          <div className="flex items-center gap-2">
            {/* Repository Dropdown */}
            <RepoBranchDropdown<RepoIdentifier>
              type="repository"
              isLoading={userRepositoriesLoading}
              items={userRepositories || []}
              selectedItem={selectedRepo}
              placeholder={NEW_TASK_CONSTANTS.PLACEHOLDERS.REPOSITORY}
              searchPlaceholder={NEW_TASK_CONSTANTS.PLACEHOLDERS.SEARCH_REPO}
              emptyMessage={NEW_TASK_CONSTANTS.EMPTY_MESSAGES.REPOSITORY}
              onSelect={setSelectedRepo}
              open={repoOpen}
              onOpenChange={setRepoOpen}
              disabled={isSubmitting}
              getItemKey={(repo) => getRepoIdentifier(repo)}
              getItemValue={(repo) => getRepoIdentifier(repo)}
              getItemDisplay={(repo) => getRepoIdentifier(repo)}
            />

            {/* Branch Dropdown */}
            <RepoBranchDropdown<string>
              type="branch"
              isLoading={userBranchesLoading}
              items={userBranches || []}
              selectedItem={selectedBranch}
              placeholder={NEW_TASK_CONSTANTS.PLACEHOLDERS.BRANCH}
              searchPlaceholder={NEW_TASK_CONSTANTS.PLACEHOLDERS.SEARCH_BRANCH}
              emptyMessage={NEW_TASK_CONSTANTS.EMPTY_MESSAGES.BRANCH}
              onSelect={setSelectedBranch}
              open={branchOpen}
              onOpenChange={setBranchOpen}
              disabled={!selectedRepo || isSubmitting}
              getItemKey={(branch) => branch}
              getItemValue={(branch) => branch}
              getItemDisplay={(branch) => branch}
            />
          </div>
        </div>

        {/* Suggestion Bubbles */}
        <div
          className="flex flex-wrap gap-2 mt-3"
          role="group"
          aria-label="Task suggestions"
        >
          {NEW_TASK_CONSTANTS.SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full border border-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={isSubmitting}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewTask;
