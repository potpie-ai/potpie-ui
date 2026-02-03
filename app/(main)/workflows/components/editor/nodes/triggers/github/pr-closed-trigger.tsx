import { WorkflowNode } from "@/services/WorkflowService";
import {
  GitHubTriggerConfigComponent,
  GitHubTriggerNode,
  createGitHubTriggerMetadata,
} from "./GitHubTriggerBase";
import { Github } from "lucide-react";
import type { GitHubTriggerMetadata } from "./GitHubTriggerBase";
import type { NodeType } from "@/services/WorkflowService";

export type PRClosedTriggerNodeData = {
  repo_name: string;
  hash: string;
  branch?: string;
};

// Re-export the config component for backward compatibility
export const PRClosedTriggerConfigComponent = (
  props: import("./GitHubTriggerBase").GitHubTriggerConfigProps<PRClosedTriggerNodeData>
) => (
  <GitHubTriggerConfigComponent
    {...props}
    nodeType="trigger_github_pr_closed"
  />
);

// Create metadata using the factory function
export const prClosedTriggerNodeMetadata: GitHubTriggerMetadata = {
  type: "trigger_github_pr_closed" as NodeType,
  category: "trigger",
  group: "github",
  name: "GitHub PR Closed",
  description: "Triggers when a pull request is closed in GitHub",
  icon: Github,
  configComponent: PRClosedTriggerConfigComponent,
};

// Create the node component using the base component
export const PRClosedTriggerNode = ({
  data,
}: {
  data: import("@/services/WorkflowService").WorkflowNode & {
    data: PRClosedTriggerNodeData;
  };
}) => <GitHubTriggerNode data={data} metadata={prClosedTriggerNodeMetadata} />;
