import { BotIcon, Github, LucideFileText, MessagesSquare } from "lucide-react";
import Image from "next/image";

export enum planTypes {
  FREE = "FREE",
  PRO = "PRO",
  ENTERPRISE = "ENTERPRISE",
}

export enum Visibility {
  PUBLIC = "public",
  PRIVATE = "private",
}

export enum ParsingStatusEnum {
  SUBMITTED = "submitted",
  CLONED = "cloned",
  PARSED = "parsed",
  PROCESSING = "processing",
  READY = "ready",
  ERROR = "error",
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
  {
    id: "code_generation_agent",
    name: "Code Generation Agent",
    description:
      "An agent specialized in generating code for new features or fixing bugs.",
    status: "SYSTEM",
    prompt:
      "Generate complete code to implement redis caching in the @get_user_subscription method with 60 min TTL",
  },
];

export const agentsRequireNodes = ["integration_test_agent", "unit_test_agent"];

export const SidebarItems: { title: string; links: any[] }[] = [
  {
    title: "Codebase Chat",
    links: [
      {
        icons: <MessagesSquare size={20} strokeWidth={1.5} />,
        title: "All chats",
        href: "/all-chats",
        disabled: false,
      },
      {
        icons: <BotIcon size={20} strokeWidth={1.5} />,
        title: "Custom Agents",
        href: "https://potpie.ai/pricing",
        disabled: false,
        description: "Upgrade",
      },
    ],
  },
  {
    title: "Knowledge Base",
    links: [
      {
        icons: <Github size={20} strokeWidth={1.5} />,
        icon: Github,
        title: "Repositories",
        href: "/repositories",
        disabled: false,
      },
      {
        icons: <LucideFileText size={20} strokeWidth={1.5} />,
        title: "Text resources",
        href: "#",
        disabled: true,
        description: "Coming soon",
      },
    ],
  },
  {
    title: "Support",
    links: [
      {
        icons: <LucideFileText size={20} strokeWidth={1.5} />,
        title: "Documentation",
        href: "https://docs.potpie.ai",
        disabled: false,
      },
      {
        icons: <Github size={20} strokeWidth={1.5} />,
        title: "Open source",
        href: "https://github.com/potpie-ai/potpie",
        disabled: false,
      },
      {
        icons: (
          <Image
            src="/images/discord.svg"
            alt="Discord"
            width={20}
            height={20}
          />
        ),
        title: "Discord",
        href: "https://discord.gg/ryk5CMD5v6",
        disabled: false,
      },
    ],
  },
];
