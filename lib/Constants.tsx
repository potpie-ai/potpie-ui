export enum planTypes {
  FREE = "FREE",
  PRO = "PRO",
  ENTERPRISE = "ENTERPRISE",
}

export enum Visibility {
  PUBLIC = "public",
  PRIVATE = "private",
}

export const systemAgents = [
  {
    id: "codebase_qna_agent",
    name: "Codebase Q&A Agent",
    description:
      "An agent specialized in answering questions about the codebase using the knowledge graph and code analysis tools.",
    status: "SYSTEM",
    prompt: "What are the main components of this codebase?",
  },
  {
    id: "debugging_agent",
    name: "Debugging with Knowledge Graph Agent",
    description: "An agent specialized in debugging using knowledge graphs.",
    status: "SYSTEM",
    prompt: "Why is this function throwing an error?",
  },
  {
    id: "unit_test_agent",
    name: "Unit Test Agent",
    description:
      "An agent specialized in generating unit tests for code snippets for given function names.",
    status: "SYSTEM",
    prompt: "What tests should I write for this function?",
  },
  {
    id: "integration_test_agent",
    name: "Integration Test Agent",
    description:
      "An agent specialized in generating integration tests for code snippets from the knowledge graph based on given function names of entry points. Works best with Py, JS, TS.",
    status: "SYSTEM",
    prompt: "How do I test this integration?",
  },
  {
    id: "LLD_agent",
    name: "Low-Level Design Agent",
    description:
      "An agent specialized in generating a low-level design plan for implementing a new feature.",
    status: "SYSTEM",
    prompt: "What should be included in my low-level design?",
  },
  {
    id: "code_changes_agent",
    name: "Code Changes Agent",
    description:
      "An agent specialized in generating detailed analysis of code changes in your current branch compared to the default branch. Works best with Py, JS, TS.",
    status: "SYSTEM",
    prompt: "What has changed in my branch compared to the main branch?",
  },
];
