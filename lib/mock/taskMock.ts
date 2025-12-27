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

// Generate a mock task ID
export const generateMockTaskId = (): string => {
  return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
