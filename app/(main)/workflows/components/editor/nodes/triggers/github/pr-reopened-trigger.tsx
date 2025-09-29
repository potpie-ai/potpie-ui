import { WorkflowNode } from "@/services/WorkflowService";
import {
  GitHubTriggerConfigComponent,
  GitHubTriggerNode,
  createGitHubTriggerMetadata,
} from "./GitHubTriggerBase";
import { Github } from "lucide-react";
import type { GitHubTriggerMetadata } from "./GitHubTriggerBase";
import type { NodeType } from "@/services/WorkflowService";

export type PRReopenedTriggerNodeData = {
  repo_name: string;
  hash: string;
  branch?: string;
};

// Re-export the config component for backward compatibility
export const PRReopenedTriggerConfigComponent = (
  props: import("./GitHubTriggerBase").GitHubTriggerConfigProps<PRReopenedTriggerNodeData>
) => (
  <GitHubTriggerConfigComponent
    {...props}
    nodeType="trigger_github_pr_reopened"
  />
);

// Create metadata using the factory function
export const prReopenedTriggerNodeMetadata: GitHubTriggerMetadata = {
  type: "trigger_github_pr_reopened" as NodeType,
  category: "trigger",
  group: "github",
  name: "GitHub PR Reopened",
  description: "Triggers when a pull request is reopened in GitHub",
  icon: Github,
  configComponent: PRReopenedTriggerConfigComponent,
};

// Create the node component using the base component
export const PRReopenedTriggerNode = ({
  data,
}: {
  data: import("@/services/WorkflowService").WorkflowNode & {
    data: PRReopenedTriggerNodeData;
  };
}) => (
  <GitHubTriggerNode data={data} metadata={prReopenedTriggerNodeMetadata} />
);
