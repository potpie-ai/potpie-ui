/**
 * @deprecated This file is part of Flow A (mock flow) and will be removed in a future version.
 * 
 * Flow A has been replaced by Flow B which uses real API integration:
 * - Entry: /idea (instead of /newtask)
 * - Q&A: /repo (instead of /task/[taskId]/userqa)
 * - Spec: /task/[recipeId]/spec (now uses real API instead of mock data)
 * - Plan: /task/[recipeId]/plan_overview
 * 
 * This file should be removed after Flow B is fully tested and stable.
 * 
 * @see IMPLEMENTATION_PLAN_FLOW_B_SPEC_INTEGRATION.md
 * @see /app/(main)/idea/page.tsx - New entry point
 * @see /app/(main)/repo/page.tsx - Real Q&A flow
 */
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Github, GitBranch } from "lucide-react";
import {
  MockQuestion,
  MockTaskResponse,
  getMockTaskFromSession,
} from "@/lib/mock/taskMock";
import SpecService from "@/services/SpecService";
import { QAAnswer } from "@/lib/types/spec";
import { toast } from "sonner";

// Constants
const MIN_HEIGHT = "min-h-[80vh]";
const MAX_WIDTH_MAIN = "max-w-3xl";

// Reusable components
const RepositoryDisplay = ({
  repo,
  branch,
}: {
  repo: string;
  branch: string;
}) => (
  <div className="flex items-center gap-4 text-sm justify-end">
    <div className="flex items-center gap-2">
      <Github className="w-4 h-4 text-gray-500" strokeWidth={1.5} />
      <span className="text-gray-900 font-medium">{repo}</span>
    </div>
    <div className="flex items-center gap-2">
      <GitBranch className="w-4 h-4 text-gray-500" strokeWidth={1.5} />
      <span className="text-gray-900 font-medium">{branch}</span>
    </div>
  </div>
);

const FormField = ({
  question,
  answer,
  onAnswerChange,
}: {
  question: MockQuestion;
  answer: string;
  onAnswerChange: (value: string) => void;
}) => (
  <div className="flex flex-col gap-3">
    <label className="text-base font-medium text-gray-900">
      {question.question}
      {question.optional && (
        <span className="ml-2 text-sm font-normal text-gray-500">
          (optional)
        </span>
      )}
    </label>
    {question.type === "select" ? (
      <select
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-sm"
      >
        <option value="">Select an option</option>
        {question.options?.map((option: string) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    ) : (
      <textarea
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        placeholder="Type your answer here..."
        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-h-[100px] resize-none"
      />
    )}
  </div>
);

const UserQAPage = () => {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.taskId as string;

  const [mockTask, setMockTask] = useState<MockTaskResponse | null>(null);
  const [state, setState] = useState({
    answers: {} as Record<string, string>,
    isSubmitting: false,
    error: null as string | null,
    isLoading: true,
  });

  useEffect(() => {
    if (taskId) {
      setState((prev) => ({ ...prev, isLoading: true }));
      const stored = getMockTaskFromSession(taskId);
      setMockTask(stored);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [taskId]);

  const handleAnswerChange = useCallback(
    (questionId: string, value: string) => {
      setState((prev) => ({
        ...prev,
        answers: {
          ...prev.answers,
          [questionId]: value,
        },
      }));
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (!mockTask) return;

    setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      // Prepare QA answers from state
      const qaAnswers: QAAnswer[] = mockTask.questions
        .filter((q) => state.answers[q.id])
        .map((q) => ({
          question: q.question,
          answer: state.answers[q.id],
        }));

      // Call API to submit QA answers and trigger spec generation
      await SpecService.submitQAAnswers(taskId, qaAnswers);

      // Store answers in sessionStorage for spec page (keep existing)
      sessionStorage.setItem(
        `task_${taskId}_answers`,
        JSON.stringify(state.answers),
      );
      sessionStorage.setItem(`task_${taskId}_submitted`, "true");

      // Navigate to spec page
      router.push(`/task/${taskId}/spec`);
    } catch (error: any) {
      console.error("Error submitting QA answers:", error);
      const errorMessage = error.message || "Failed to submit answers. Please try again.";
      setState((prev) => ({ ...prev, error: errorMessage, isSubmitting: false }));
      toast.error(errorMessage);
    }
  }, [mockTask, state.answers, taskId, router]);

  if (state.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading task data...</p>
        </div>
      </div>
    );
  }

  if (!mockTask) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Task not found</h2>
          <p className="text-gray-600 mb-6">
            The task data was not found. Please start a new task.
          </p>
          <Button onClick={() => router.push("/newtask")}>
            Create New Task
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${MIN_HEIGHT} flex flex-col`}>
      {/* Error Display */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mx-4 md:mx-10 mt-4 rounded-lg">
          {state.error}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 px-4 md:px-10 py-8">
        <div className={`${MAX_WIDTH_MAIN} mx-auto`}>
          {/* Back button */}
          <button
            onClick={() => router.push("/newtask")}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to task creation
          </button>

          {/* Task Information Card */}
          <div className="bg-gray-50 rounded-lg p-4 border mb-8">
            <div className="space-y-3">
              {/* User Prompt */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Task
                </p>
                <p className="text-sm text-gray-900">{mockTask.prompt}</p>
              </div>

              {/* Repository and Branch */}
              <RepositoryDisplay
                repo={mockTask.repo}
                branch={mockTask.branch}
              />
            </div>
          </div>

          <div className="space-y-6">
            {mockTask.questions.map((question: MockQuestion) => (
              <FormField
                key={question.id}
                question={question}
                answer={state.answers[question.id] || ""}
                onAnswerChange={(value) =>
                  handleAnswerChange(question.id, value)
                }
              />
            ))}
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/newtask")}
              className="px-6"
              disabled={state.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="px-6"
              disabled={
                state.isSubmitting ||
                mockTask.questions.some(
                  (q: MockQuestion) => !q.optional && !state.answers[q.id],
                )
              }
            >
              {state.isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserQAPage;
