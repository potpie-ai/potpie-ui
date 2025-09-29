// Remove NodeType, NodeCategory, NodeGroup imports and define as string unions
export type NodeType =
  | "trigger_github_pr_opened"
  | "trigger_github_pr_closed"
  | "trigger_github_pr_reopened"
  | "trigger_github_pr_merged"
  | "trigger_github_issue_opened"
  | "trigger_linear_issue_created"
  | "trigger_sentry_issue_created"
  | "trigger_webhook"
  | "custom_agent"
  | "action_agent"
  | "flow_control_conditional"
  | "flow_control_collect"
  | "flow_control_selector"
  | "manual_step_approval"
  | "manual_step_input";
export type NodeCategory = "trigger" | "agent" | "flow_control" | "manual_step";
export type NodeGroup =
  | "github"
  | "linear"
  | "sentry"
  | "default"
  | "flow_control";

import { agentNodeMetadata } from "./agents/agent";
import { actionAgentNodeMetadata } from "./agents/action-agent";
import { ifConditionNodeMetadata } from "./flow-controls/if-condition";
import { linearTriggerNodeMetadata } from "./triggers/linear/linear-trigger";
import { prOpenedTriggerNodeMetadata } from "./triggers/github/pr-opened-trigger";
import { prClosedTriggerNodeMetadata } from "./triggers/github/pr-closed-trigger";
import { prReopenedTriggerNodeMetadata } from "./triggers/github/pr-reopened-trigger";
import { prMergedTriggerNodeMetadata } from "./triggers/github/pr-merged-trigger";
import { issueAddedTriggerNodeMetadata } from "./triggers/github/issue-added-trigger";
import { issueCreatedTriggerNodeMetadata } from "./triggers/sentry/issue-created-trigger";
import { webhookTriggerNodeMetadata } from "./triggers/webhook";

export interface NodeInfo {
  type: string;
  category: string;
  group: string;
  name: string;
  description: string;
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  configComponent?: React.ComponentType<{
    config: any;
    onConfigChange: (config: any) => void;
    readOnly?: boolean;
    workflowId?: string;
    workflow?: any;
  }>;
}

// Registry of all available nodes
export const availableNodes: NodeInfo[] = [
  prOpenedTriggerNodeMetadata,
  prClosedTriggerNodeMetadata,
  prReopenedTriggerNodeMetadata,
  prMergedTriggerNodeMetadata,
  issueAddedTriggerNodeMetadata,
  linearTriggerNodeMetadata,
  issueCreatedTriggerNodeMetadata,
  webhookTriggerNodeMetadata,
  agentNodeMetadata,
  actionAgentNodeMetadata,
  ifConditionNodeMetadata,
];

// Export individual metadata for direct access if needed
export {
  prOpenedTriggerNodeMetadata,
  prClosedTriggerNodeMetadata,
  prReopenedTriggerNodeMetadata,
  prMergedTriggerNodeMetadata,
  issueAddedTriggerNodeMetadata,
  linearTriggerNodeMetadata,
  issueCreatedTriggerNodeMetadata,
  webhookTriggerNodeMetadata,
  agentNodeMetadata,
  actionAgentNodeMetadata,
  ifConditionNodeMetadata,
};
