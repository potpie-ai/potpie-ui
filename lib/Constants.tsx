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
    prompt: "Explain how a document is inserted into the database? or Explain how authorisation is implemented in the codebase.",
  },
  {
    id: "debugging_agent",
    name: "Debugging with Knowledge Graph Agent",
    description: "An agent specialized in debugging using knowledge graphs.",
    status: "SYSTEM",
    prompt: " I’m getting a 401 unauthorized error from @update_document API , help me debug or Help me fix the TypeError in this line query.lower().split() of @query_vector_store",
  },
  {
    id: "unit_test_agent",
    name: "Unit Test Agent",
    description:
      "An agent specialized in generating unit tests for code snippets for given function names.",
    status: "SYSTEM",
    prompt: "Help me plan and write a unit test for @create_document  or Add an additional test to assert that the value returned is not null",
  },
  {
    id: "integration_test_agent",
    name: "Integration Test Agent",
    description:
      "An agent specialized in generating integration tests for code snippets from the knowledge graph based on given function names of entry points. Works best with Py, JS, TS.",
    status: "SYSTEM",
    prompt: "Generate a test plan for the POST /documents/{collection_name} API at @create_document or This test fails to mock the MongoService class method, update the mocked path in all tests to follow the format `path.to.file.Class.function`",
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
    prompt: "Which APIs are impacted by my current change? or Help me under any cascading effects of my changes.",
  },
];
