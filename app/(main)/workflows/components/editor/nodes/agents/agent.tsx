import {
  Node,
  NodeCategory,
  NodeType,
  NodeGroup,
} from "@/services/WorkflowService";
import { getNodeColors } from "../color_utils";
import { SourceHandle, TargetHandle } from "../../handles";
import { Bot, Code } from "lucide-react";
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

interface AgentConfigProps {
  config: any;
  onConfigChange: (config: any) => void;
}

export const AgentConfigComponent: FC<AgentConfigProps> = ({
  config,
  onConfigChange,
}) => {
  const handleChange = (key: string, value: any) => {
    onConfigChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="agent-name">Agent Name</Label>
        <Input
          id="agent-name"
          value={config.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Enter agent name"
        />
      </div>

      <div>
        <Label htmlFor="agent-description">Description</Label>
        <Textarea
          id="agent-description"
          value={config.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Enter agent description"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="agent-id">Agent ID</Label>
        <Input
          id="agent-id"
          value={config.agentId || ""}
          onChange={(e) => handleChange("agentId", e.target.value)}
          placeholder="Enter agent ID"
        />
      </div>

      <div>
        <Label htmlFor="agent-model">Model</Label>
        <Select
          value={config.model || "gpt-4"}
          onValueChange={(value) => handleChange("model", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gpt-4">GPT-4</SelectItem>
            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
            <SelectItem value="claude-3">Claude 3</SelectItem>
            <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="agent-temperature">Temperature</Label>
        <Input
          id="agent-temperature"
          type="number"
          min="0"
          max="2"
          step="0.1"
          value={config.temperature || 0.7}
          onChange={(e) =>
            handleChange("temperature", parseFloat(e.target.value))
          }
          placeholder="0.7"
        />
      </div>
    </div>
  );
};

// Node metadata for the palette
export const agentNodeMetadata = {
  type: NodeType.CUSTOM_AGENT,
  category: NodeCategory.AGENT,
  group: NodeGroup.DEFAULT,
  name: "Custom Agent",
  description: "A custom AI agent that can perform tasks",
  icon: Bot,
  configComponent: AgentConfigComponent,
};

export const AgentNode = ({ data }: { data: Node }) => {
  const colors = getNodeColors(data.group);
  return (
    <div className="w-full">
      <div
        className="p-3 border-b border-gray-200"
        style={{ backgroundColor: colors.secondary }}
      >
        <div className="flex items-center">
          <Bot className="w-5 h-5 mr-2" style={{ color: colors.primary }} />
          <h3 className="font-semibold text-gray-800">Agent</h3>
        </div>
      </div>
      <div className="p-4">
        <div className="w-12 h-12 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-3">
          <Code className="w-6 h-6 text-purple-600" />
        </div>
        <p className="text-center font-medium text-gray-800">{data.type}</p>
      </div>
      <TargetHandle />
      <SourceHandle />
    </div>
  );
};
