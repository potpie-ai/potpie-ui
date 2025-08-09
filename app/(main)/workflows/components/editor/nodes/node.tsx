import { WorkflowNode } from "@/services/WorkflowService";
import { TriggerNode } from "./triggers/trigger";
import { LinearTriggerNode } from "./triggers/linear/linear-trigger";
import { AgentNode } from "./agents/agent";
import { IfConditionNode } from "./flow-controls/if-condition";

export const SwitchComponent = ({ data }: { data: WorkflowNode }) => {
  switch (data.category) {
    case "trigger":
      // Handle different trigger types
      switch (data.type) {
        case "trigger_github_pr_opened":
          return <TriggerNode data={data} />;
        case "trigger_linear_issue_created":
          return <LinearTriggerNode data={data} />;
        default:
          return <TriggerNode data={data} />;
      }
    case "agent":
      return <AgentNode data={data} />;
    case "flow_control":
      return <IfConditionNode data={data} />;
  }
};

export const NodeComponent = ({
  data,
  selected,
}: {
  data: WorkflowNode & { isNewlyDropped?: boolean };
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
