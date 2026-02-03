import { WorkflowNode } from "@/services/WorkflowService";
import {
  SentryTriggerConfigComponent,
  SentryTriggerNode,
  createSentryTriggerMetadata,
} from "./SentryTriggerBase";
import type { SentryTriggerMetadata } from "./SentryTriggerBase";
import type { NodeType } from "@/services/WorkflowService";

export type IssueCreatedTriggerNodeData = {
  hash: string;
};

// Re-export the config component for backward compatibility
export const IssueCreatedTriggerConfigComponent = (
  props: import("./SentryTriggerBase").SentryTriggerConfigProps<IssueCreatedTriggerNodeData>
) => (
  <SentryTriggerConfigComponent
    {...props}
    nodeType="trigger_sentry_issue_created"
  />
);

// Create metadata using the factory function
export const issueCreatedTriggerNodeMetadata: SentryTriggerMetadata = {
  type: "trigger_sentry_issue_created" as NodeType,
  category: "trigger",
  group: "sentry",
  name: "Sentry Issue Created",
  description: "Triggers when a new issue is created in Sentry",
  icon: createSentryTriggerMetadata(
    "trigger_sentry_issue_created",
    "Sentry Issue Created",
    "Triggers when a new issue is created in Sentry"
  ).icon,
  configComponent: IssueCreatedTriggerConfigComponent,
};

// Create the node component using the base component
export const IssueCreatedTriggerNode = ({
  data,
}: {
  data: import("@/services/WorkflowService").WorkflowNode & {
    data: IssueCreatedTriggerNodeData;
  };
}) => (
  <SentryTriggerNode data={data} metadata={issueCreatedTriggerNodeMetadata} />
);
