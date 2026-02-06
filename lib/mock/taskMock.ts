/**
 * @deprecated This file is part of Flow A (mock flow) and will be removed in a future version.
 * 
 * Flow A has been replaced by Flow B which uses real API integration:
 * - Entry: /newchat (instead of /newtask)
 * - Q&A: /repo (instead of /task/[taskId]/userqa)
 * - Spec: /task/[recipeId]/spec (now uses real API instead of mock data)
 * - Plan: /task/[recipeId]/plan_overview
 * 
 * This file should be removed after Flow B is fully tested and stable.
 * 
 * @see IMPLEMENTATION_PLAN_FLOW_B_SPEC_INTEGRATION.md
 * @see /app/(main)/newchat/page.tsx - New entry point
 * @see /app/(main)/repo/page.tsx - Real Q&A flow
 */
import { v4 as uuidv4 } from "uuid";

export interface MockQuestion {
  id: string;
  question: string;
  type: "select" | "text";
  options?: string[];
  optional?: boolean;
}

export interface MockTaskResponse {
  task_id: string;
  prompt: string;
  repo: string;
  branch: string;
  questions: MockQuestion[];
}

// Generate a mock task ID as UUID
export const generateMockTaskId = (): string => {
  return uuidv4();
};

// Generate mock questions based on a query
export const generateMockQuestions = (query: string): MockQuestion[] => {
  return [
    {
      id: "q1",
      question: "Which authentication provider would you prefer?",
      type: "select",
      options: ["JWT", "OAuth2", "Session-based", "API Keys"],
    },
    {
      id: "q2",
      question: "Include password reset functionality?",
      type: "select",
      options: ["Yes", "No"],
    },
    {
      id: "q3",
      question: "Should multi-factor authentication be enabled?",
      type: "select",
      options: ["Yes", "No"],
    },
    {
      id: "q4",
      question: "Any additional requirements or constraints?",
      type: "text",
      optional: true,
    },
  ];
};

// Create a mock task response
export const createMockTaskResponse = (query: string, repo?: string, branch?: string): MockTaskResponse => {
  return {
    task_id: generateMockTaskId(),
    prompt: query,
    repo: repo || "",
    branch: branch || "",
    questions: generateMockQuestions(query),
  };
};

// Store mock response in sessionStorage
export const saveMockTaskToSession = (
  taskId: string,
  response: MockTaskResponse
): void => {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(`task-${taskId}`, JSON.stringify(response));
  }
};

// Retrieve mock response from sessionStorage
export const getMockTaskFromSession = (taskId: string): MockTaskResponse | null => {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem(`task-${taskId}`);
    return stored ? JSON.parse(stored) : null;
  }
  return null;
};
