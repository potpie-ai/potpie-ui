import { WorkflowNode } from "@/services/WorkflowService";
import { TriggerNode } from "./triggers/trigger";
import { LinearTriggerNode } from "./triggers/linear/linear-trigger";
import { JiraTriggerNode } from "./triggers/jira/jira-trigger";
import { AgentNode } from "./agents/agent";
import { ActionAgentNode } from "./agents/action-agent";
import { IfConditionNode } from "./flow-controls/if-condition";
import { ConfluenceCreatePageNode } from "./actions/confluence-create-page";
import { SlackSendMessageNode } from "./actions/slack-send-message";
import { ConfluenceAgentNode } from "./agents/confluence-agent";
import { X } from "lucide-react";

export const SwitchComponent = ({ data }: { data: WorkflowNode }) => {
  switch (data.category) {
    case "trigger":
      // Handle different trigger types
      switch (data.type) {
        case "trigger_github_pr_opened":
          return <TriggerNode data={data} />;
        case "trigger_linear_issue_created":
          return <LinearTriggerNode data={data} />;
        case "trigger_jira_issue_created":
          return <JiraTriggerNode data={data} />;
        default:
          return <TriggerNode data={data} />;
      }
    case "agent":
      // Handle different agent types
      switch (data.type) {
        case "action_agent":
          return <ActionAgentNode data={data} />;
        case "system_workflow_agent_confluence":
          return <ConfluenceAgentNode data={data} />;
        default:
          return <AgentNode data={data} />;
      }
    case "flow_control":
      return <IfConditionNode data={data} />;
    case "action":
      // Handle different action types
      switch (data.type) {
        case "action_confluence_create_page":
          return <ConfluenceCreatePageNode data={data} />;
        case "action_slack_send_message":
          return <SlackSendMessageNode data={data} />;
        default:
          return <div>Unknown action type</div>;
      }
  }
};

export const NodeComponent = ({
  data,
  selected,
  onDelete,
  mode = "edit",
}: {
  data: WorkflowNode & { isNewlyDropped?: boolean };
  selected?: boolean;
  onDelete?: (nodeId: string) => void;
  mode?: "view_only" | "edit" | "preview";
}) => {
  const handleClick = (e: React.MouseEvent) => {
    // Don't prevent default or stop propagation - let ReactFlow handle the click
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't prevent default - let ReactFlow handle keyboard events
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(data.id);
    }
  };

  return (
    <div
      className={`transition-all duration-200 rounded-xl relative ${selected ? "ring-2 ring-orange-500/20 ring-offset-2" : ""}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Delete button - only visible when selected and in edit mode */}
      {selected && onDelete && mode === "edit" && (
        <button
          onClick={handleDeleteClick}
          className="absolute -top-4 -right-4 z-10 w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 border-2 border-white"
          title="Delete node"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div
        className={`bg-white rounded-xl border-2 ${selected ? "border-orange-500 shadow-lg" : "border-gray-200"
          } shadow-md w-64 overflow-hidden transition-all duration-200 ${data.isNewlyDropped ? "animate-bounce-drop" : ""
          }`}
      >
        <SwitchComponent data={data} />
      </div>
    </div>
  );
};
