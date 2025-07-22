import { FC } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkflowNode } from "@/services/WorkflowService";
import { getNodeColors } from "../color_utils";
import { SourceHandle, TargetHandle } from "../../handles";
import { GitBranch } from "lucide-react";

interface IfConditionConfigProps {
  config: any;
  onConfigChange: (config: any) => void;
  readOnly?: boolean;
}

export const IfConditionConfigComponent: FC<IfConditionConfigProps> = ({
  config,
  onConfigChange,
  readOnly = false,
}) => {
  const handleChange = (key: string, value: any) => {
    if (readOnly) return;
    onConfigChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="condition">Condition</Label>
        <Textarea
          id="condition"
          value={config.condition || ""}
          onChange={(e) => handleChange("condition", e.target.value)}
          placeholder="e.g. Continue if the previous step's status is 'success' and the user is an admin."
          rows={3}
          disabled={readOnly}
        />
      </div>
    </div>
  );
};

export const ifConditionNodeMetadata = {
  type: "flow_control_conditional",
  category: "flow_control",
  group: "default",
  name: "If Condition",
  description: "Controls flow based on a user-defined condition",
  icon: GitBranch,
  configComponent: IfConditionConfigComponent,
};

export const IfConditionNode = ({ data }: { data: WorkflowNode }) => {
  const colors = getNodeColors(data.group);
  const condition = data.data?.condition;
  return (
    <div className="w-full">
      <div
        className="p-3 border-b border-gray-200"
        style={{ backgroundColor: colors.secondary }}
      >
        <div className="flex items-center">
          <GitBranch
            className="w-5 h-5 mr-2"
            style={{ color: colors.primary }}
          />
          <h3 className="font-semibold text-gray-800">If Condition</h3>
        </div>
      </div>
      <div className="p-4">
        <div
          className="p-3 rounded-md border"
          style={{
            backgroundColor: colors.secondary + "20",
            borderColor: colors.primary + "40",
          }}
        >
          <p className="text-sm text-gray-700">
            {condition ? (
              condition
            ) : (
              <span className="italic text-gray-400">
                No condition specified
              </span>
            )}
          </p>
        </div>
      </div>
      <TargetHandle />
      <SourceHandle />
    </div>
  );
};
