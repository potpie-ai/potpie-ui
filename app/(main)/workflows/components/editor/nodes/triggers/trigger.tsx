import { WorkflowNode } from "@/services/WorkflowService";
import { getNodeColors } from "../color_utils";
import { AlertTriangle, CircleDot } from "lucide-react";
import { SourceHandle } from "../../handles";
import {
  PROpenedTriggerNode,
  PROpenedTriggerNodeData,
} from "./github/pr-opened-trigger";
import {
  PRClosedTriggerNode,
  PRClosedTriggerNodeData,
} from "./github/pr-closed-trigger";
import {
  PRReopenedTriggerNode,
  PRReopenedTriggerNodeData,
} from "./github/pr-reopened-trigger";
import {
  PRMergedTriggerNode,
  PRMergedTriggerNodeData,
} from "./github/pr-merged-trigger";
import {
  IssueAddedTriggerNode,
  IssueAddedTriggerNodeData,
} from "./github/issue-added-trigger";
import { LinearTriggerNode } from "./linear/linear-trigger";
import {
  IssueCreatedTriggerNode,
  IssueCreatedTriggerNodeData,
} from "./sentry/issue-created-trigger";
import { WebhookTriggerNode } from "./webhook";

// Generic trigger node for unhandled trigger types
export const TriggerNode = ({ data }: { data: WorkflowNode }) => {
  // Render specific node UIs for known trigger types
  switch (data.type) {
    case "trigger_github_pr_opened":
      return (
        <PROpenedTriggerNode
          data={data as WorkflowNode & { data: PROpenedTriggerNodeData }}
        />
      );
    case "trigger_github_pr_closed":
      return (
        <PRClosedTriggerNode
          data={data as WorkflowNode & { data: PRClosedTriggerNodeData }}
        />
      );
    case "trigger_github_pr_reopened":
      return (
        <PRReopenedTriggerNode
          data={data as WorkflowNode & { data: PRReopenedTriggerNodeData }}
        />
      );
    case "trigger_github_pr_merged":
      return (
        <PRMergedTriggerNode
          data={data as WorkflowNode & { data: PRMergedTriggerNodeData }}
        />
      );
    case "trigger_github_issue_opened":
      return (
        <IssueAddedTriggerNode
          data={data as WorkflowNode & { data: IssueAddedTriggerNodeData }}
        />
      );
    case "trigger_linear_issue_created":
      return <LinearTriggerNode data={data} />;
    case "trigger_sentry_issue_created":
      return (
        <IssueCreatedTriggerNode
          data={data as WorkflowNode & { data: IssueCreatedTriggerNodeData }}
        />
      );
    case "trigger_webhook":
      return <WebhookTriggerNode data={data} />;
    default:
      break;
  }

  // Fallback generic trigger node UI
  const colors = getNodeColors(data.group);
  return (
    <div className="w-full">
      <div
        className="p-3 border-b border-gray-200"
        style={{ backgroundColor: colors.secondary }}
      >
        <div className="flex items-center">
          <AlertTriangle
            className="w-5 h-5 mr-2"
            style={{ color: colors.primary }}
          />
          <h3 className="font-semibold text-gray-800">Trigger</h3>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center bg-orange-50 rounded-md p-2">
          <CircleDot className="w-3 h-3 text-orange-500 mr-2" />
          <span className="text-sm text-gray-700">{data.type}</span>
        </div>
      </div>
      <SourceHandle />
    </div>
  );
};
