import {
  Node,
  NodeCategory,
  NodeType,
  NodeGroup,
} from "@/services/WorkflowService";
import { getNodeColors } from "../color_utils";
import { SourceHandle, TargetHandle } from "../../handles";
import { GitBranch } from "lucide-react";
import { FC } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FlowControlConfigProps {
  config: any;
  onConfigChange: (config: any) => void;
}

export const FlowControlConfigComponent: FC<FlowControlConfigProps> = ({
  config,
  onConfigChange,
}) => {
  const handleChange = (key: string, value: any) => {
    onConfigChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="control-name">Control Name</Label>
        <Input
          id="control-name"
          value={config.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Enter control name"
        />
      </div>

      <div>
        <Label htmlFor="control-description">Description</Label>
        <Textarea
          id="control-description"
          value={config.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Enter control description"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="condition-type">Condition Type</Label>
        <Select
          value={config.conditionType || "boolean"}
          onValueChange={(value) => handleChange("conditionType", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select condition type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="boolean">Boolean</SelectItem>
            <SelectItem value="comparison">Comparison</SelectItem>
            <SelectItem value="regex">Regular Expression</SelectItem>
            <SelectItem value="custom">Custom Expression</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="condition-expression">Condition Expression</Label>
        <Textarea
          id="condition-expression"
          value={config.conditionExpression || ""}
          onChange={(e) => handleChange("conditionExpression", e.target.value)}
          placeholder="Enter condition expression (e.g., data.status === 'completed')"
          rows={4}
        />
      </div>

      <div>
        <Label htmlFor="true-label">True Branch Label</Label>
        <Input
          id="true-label"
          value={config.trueLabel || "True"}
          onChange={(e) => handleChange("trueLabel", e.target.value)}
          placeholder="True"
        />
      </div>

      <div>
        <Label htmlFor="false-label">False Branch Label</Label>
        <Input
          id="false-label"
          value={config.falseLabel || "False"}
          onChange={(e) => handleChange("falseLabel", e.target.value)}
          placeholder="False"
        />
      </div>

      <div>
        <Label htmlFor="timeout">Timeout (seconds)</Label>
        <Input
          id="timeout"
          type="number"
          min="0"
          value={config.timeout || 30}
          onChange={(e) => handleChange("timeout", parseInt(e.target.value))}
          placeholder="30"
        />
      </div>
    </div>
  );
};

// Node metadata for the palette
export const flowControlNodeMetadata = {
  type: NodeType.FLOW_CONTROL_CONDITIONAL,
  category: NodeCategory.FLOW_CONTROL,
  group: NodeGroup.DEFAULT,
  name: "Conditional",
  description: "Controls flow based on conditions",
  icon: GitBranch,
  configComponent: FlowControlConfigComponent,
};

export const FlowControlNode = ({ data }: { data: Node }) => {
  const colors = getNodeColors(data.group);
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
          <h3 className="font-semibold text-gray-800">Flow Control</h3>
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
          <p className="text-sm text-gray-700">If condition</p>
        </div>
      </div>
      <TargetHandle />
      <SourceHandle />
    </div>
  );
};
