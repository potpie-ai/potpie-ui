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
    prompt: "Explain how a document is inserted into the database?",
  },
  {
    id: "debugging_agent",
    name: "Debugging with Knowledge Graph Agent",
    description: "An agent specialized in debugging using knowledge graphs.",
    status: "SYSTEM",
    prompt:
      " I’m getting a 401 unauthorized error from @update_document API , help me debug this error : <stacktrace>",
  },
  {
    id: "unit_test_agent",
    name: "Unit Test Agent",
    description:
      "An agent specialized in generating unit tests for code snippets for given function names.",
    status: "SYSTEM",
    prompt: "Help me plan and write a unit test for @create_document ",
  },
  {
    id: "integration_test_agent",
    name: "Integration Test Agent",
    description:
      "An agent specialized in generating integration tests for code snippets from the knowledge graph based on given function names of entry points. Works best with Py, JS, TS.",
    status: "SYSTEM",
    prompt:
      "Generate a test plan for the POST /documents/{collection_name} API at @create_document",
  },
  {
    id: "LLD_agent",
    name: "Low-Level Design Agent",
    description:
      "An agent specialized in generating a low-level design plan for implementing a new feature.",
    status: "SYSTEM",
    prompt:
      "Refer existing implementation and generate a low level design for implementing Firebase auth in our cart API",
  },
  {
    id: "code_changes_agent",
    name: "Code Changes Agent",
    description:
      "An agent specialized in generating detailed analysis of code changes in your current branch compared to the default branch. Works best with Py, JS, TS.",
    status: "SYSTEM",
    prompt:
      "Which APIs are impacted by my current change? Help me under any cascading effects of my changes.",
  },
];

export const agentsRequireNodes = ["integration_test_agent", "unit_test_agent"];

export const SidebarItems = [
  {
    title: "Codebase Chat",
    links: [
      {
        icons: "/images/msg.svg",
        title: "All chats",
        href: "/all-chats",
        upgrade: false,
      },
      {
        icons: "/images/robot.svg",
        title: "Custom Agents",
        href: "https://potpie.ai/pricing",
        upgrade: true,
      },
    ],
  },
  {
    title: "Knowledge Base",
    links: [
      {
        icons: "/images/git.svg",
        title: "Repositories",
        href: "/repositories",
        upgrade: false,
      },
      {
        icons: "/images/document.svg",
        title: "Text resources",
        soon: true,
        href: "#",
        upgrade: false,
      },
    ],
  },
  {
    title: "Support",
    links: [
      {
        icons: "/images/document.svg",
        title: "Documentation",
        href: "https://docs.potpie.ai",
        upgrade: false,
      },
      {
        icons: "/images/git.svg",
        title: "Open source",
        href: "https://github.com/potpie-ai/potpie",
        upgrade: false,
      },
      {
        icons: "/images/discord.svg",
        title: "Discord",
        href: "https://discord.gg/ryk5CMD5v6",
        upgrade: false,
      },
    ],
  },
];
