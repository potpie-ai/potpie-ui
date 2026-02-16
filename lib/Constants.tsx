import { auth } from "@/configs/Firebase-config";
import formbricksApp from "@formbricks/js";
import { CircleAlert, Code2 } from "lucide-react";
import Image from "next/image";

const user = auth.currentUser || ("" as any);

export enum planTypesEnum {
  FREE = "free",
  PRO = "pro",
  ENTERPRISE = "enterprise",
  STARTUP = "startup",
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
      " I'm getting a 401 unauthorized error from @update_document API , help me debug this error : <stacktrace>",
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
        icons: (
          <Image
            src="/images/All chat.svg"
            alt="All chats"
            width={20}
            height={20}
          />
        ),
        title: "All chats",
        href: "/all-chats",
        disabled: false,
      },
      {
        icons: (
          <Image
            src="/images/Custom Agents.svg"
            alt="Custom Agents"
            width={20}
            height={20}
          />
        ),
        title: "Custom Agents",
        href: "/all-agents",
        disabled: false,
      },
      {
        icons: (
          <Image
            src="/images/Build.svg"
            alt="Workflows"
            width={20}
            height={20}
          />
        ),
        title: "Workflows",
        href: "/workflows",
        disabled: false,
      },
      {
        icons: (
          <Image
            src="/images/Integration.svg"
            alt="Integrations"
            width={20}
            height={20}
          />
        ),
        title: "Integrations",
        href: "/integrations",
        disabled: false,
      },
      {
        icons: (
          <Image
            src="/images/VS Code.svg"
            alt="VS Code"
            width={20}
            height={20}
          />
        ),
        title: "VS Code",
        href: "#",
        disabled: false,
        showProModal: true,
      },
      {
        icons: (
          <Image
            src="/images/Jet Brains.svg"
            alt="JetBrains"
            width={20}
            height={20}
          />
        ),
        title: "JetBrains",
        href: "#",
        disabled: false,
        showProModal: true,
      },
    ],
  },
  {
    title: "Support",
    links: [
      {
        icons: (
          <Image
            src="/images/Documentation.svg"
            alt="Documentation"
            width={20}
            height={20}
          />
        ),
        title: "Documentation",
        href: "https://docs.potpie.ai",
        disabled: false,
      },
      {
        icons: (
          <Image
            src="/images/Open Source.svg"
            alt="Open source"
            width={20}
            height={20}
          />
        ),
        title: "Open source",
        href: "https://github.com/potpie-ai/potpie",
        disabled: false,
      },
      {
        icons: <CircleAlert size={20} strokeWidth={1.5} />,
        title: "Report a bug",
        href: "#",
        handleTrack: true,
        disabled: true,
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
