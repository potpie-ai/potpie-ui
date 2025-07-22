import { WorkflowNode } from "@/services/WorkflowService";
import {
  GitHubTriggerConfigComponent,
  GitHubTriggerNode,
  createGitHubTriggerMetadata,
} from "./GitHubTriggerBase";
import { Github } from "lucide-react";
import type { GitHubTriggerMetadata } from "./GitHubTriggerBase";
import type { NodeType } from "@/services/WorkflowService";

export type PRMergedTriggerNodeData = {
  repo_name: string;
  hash: string;
  branch?: string;
};

// Re-export the config component for backward compatibility
export const PRMergedTriggerConfigComponent = (
  props: import("./GitHubTriggerBase").GitHubTriggerConfigProps<PRMergedTriggerNodeData>
) => (
  <GitHubTriggerConfigComponent
    {...props}
    nodeType="trigger_github_pr_merged"
  />
);

// Create metadata using the factory function
export const prMergedTriggerNodeMetadata: GitHubTriggerMetadata = {
  type: "trigger_github_pr_merged" as NodeType,
  category: "trigger",
  group: "github",
  name: "GitHub PR Merged",
  description: "Triggers when a pull request is merged in GitHub",
  icon: Github,
  configComponent: PRMergedTriggerConfigComponent,
};

// Create the node component using the base component
export const PRMergedTriggerNode = ({
  data,
}: {
  data: import("@/services/WorkflowService").WorkflowNode & {
    data: PRMergedTriggerNodeData;
  };
}) => <GitHubTriggerNode data={data} metadata={prMergedTriggerNodeMetadata} />;
