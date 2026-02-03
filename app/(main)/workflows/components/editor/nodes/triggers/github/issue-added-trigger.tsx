import { WorkflowNode } from "@/services/WorkflowService";
import {
  GitHubTriggerConfigComponent,
  GitHubTriggerNode,
  createGitHubTriggerMetadata,
} from "./GitHubTriggerBase";
import { Github } from "lucide-react";
import type { GitHubTriggerMetadata } from "./GitHubTriggerBase";
import type { NodeType } from "@/services/WorkflowService";

export type IssueAddedTriggerNodeData = {
  repo_name: string;
  hash: string;
  branch?: string;
};

// Re-export the config component for backward compatibility
export const IssueAddedTriggerConfigComponent = (
  props: import("./GitHubTriggerBase").GitHubTriggerConfigProps<IssueAddedTriggerNodeData>
) => (
  <GitHubTriggerConfigComponent
    {...props}
    nodeType="trigger_github_issue_opened"
  />
);

// Create metadata using the factory function
export const issueAddedTriggerNodeMetadata: GitHubTriggerMetadata = {
  type: "trigger_github_issue_opened" as NodeType,
  category: "trigger",
  group: "github",
  name: "GitHub Issue Opened",
  description: "Triggers when an issue is opened in GitHub",
  icon: Github,
  configComponent: IssueAddedTriggerConfigComponent,
};

// Create the node component using the base component
export const IssueAddedTriggerNode = ({
  data,
}: {
  data: import("@/services/WorkflowService").WorkflowNode & {
    data: IssueAddedTriggerNodeData;
  };
}) => (
  <GitHubTriggerNode data={data} metadata={issueAddedTriggerNodeMetadata} />
);
