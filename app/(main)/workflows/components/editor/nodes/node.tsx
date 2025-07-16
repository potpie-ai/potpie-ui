import { Node, NodeCategory, NodeType } from "@/services/WorkflowService";
import { TriggerNode } from "./triggers/trigger";
import { GitHubTriggerNode } from "./triggers/github/github-trigger";
import { LinearTriggerNode } from "./triggers/linear/linear-trigger";
import { AgentNode } from "./agents/agent";
import { FlowControlNode } from "./flow-controls/flow-control";

export const SwitchComponent = ({ data }: { data: Node }) => {
  switch (data.category) {
    case NodeCategory.TRIGGER:
      // Handle different trigger types
      switch (data.type) {
        case NodeType.TRIGGER_GITHUB_PR_OPENED:
          return <GitHubTriggerNode data={data} />;
        case NodeType.TRIGGER_LINEAR_ISSUE_CREATED:
          return <LinearTriggerNode data={data} />;
        default:
          return <TriggerNode data={data} />;
      }
    case NodeCategory.AGENT:
      return <AgentNode data={data} />;
    case NodeCategory.FLOW_CONTROL:
      return <FlowControlNode data={data} />;
  }
};

export const NodeComponent = ({
  data,
  selected,
}: {
  data: Node;
  selected?: boolean;
}) => {
  return (
    <div
      className={`transition-all duration-200 rounded-xl ${selected ? "ring-2 ring-orange-500/20 ring-offset-2" : ""}`}
    >
      <div
        className={`bg-white rounded-xl border-2 ${
          selected ? "border-orange-500 shadow-lg" : "border-gray-200"
        } shadow-md w-64 overflow-hidden transition-all duration-200 ${
          data.isNewlyDropped ? "animate-bounce-drop" : ""
        }`}
      >
        <SwitchComponent data={data} />
      </div>
    </div>
  );
};
