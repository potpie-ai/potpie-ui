import {
  GitHubTriggerNode,
  createGitHubTriggerMetadata,
} from "./GitHubTriggerBase";
import type { WorkflowNode, NodeType } from "@/services/WorkflowService";
import type { GitHubTriggerMetadata } from "./GitHubTriggerBase";
export type PROpenedTriggerNodeData = {
  repo_name: string;
  hash: string;
  branch?: string;
};
// Create metadata using the factory function
export const prOpenedTriggerNodeMetadata: GitHubTriggerMetadata =
  createGitHubTriggerMetadata(
    "trigger_github_pr_opened" as NodeType,
    "GitHub PR Opened",
    "Triggers when a pull request is opened in GitHub"
  );

// Create the node component using the base component
export const PROpenedTriggerNode = ({
  data,
}: {
  data: WorkflowNode & {
    data: PROpenedTriggerNodeData;
  };
}) => <GitHubTriggerNode data={data} metadata={prOpenedTriggerNodeMetadata} />;
