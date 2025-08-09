import { WorkflowNode } from "@/services/WorkflowService";
import { getNodeColors } from "../../color_utils";
import { AlertTriangle, CircleDot, MessageSquare } from "lucide-react";
import { SourceHandle } from "../../../handles";
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
import { Switch } from "@/components/ui/switch";

interface LinearTriggerConfigProps {
  config: any;
  onConfigChange: (config: any) => void;
  readOnly?: boolean;
  workflow?: any;
}

export const LinearTriggerConfigComponent: FC<LinearTriggerConfigProps> = ({
  config,
  onConfigChange,
  readOnly = false,
  workflow,
}) => {
  const handleChange = (key: string, value: any) => {
    if (readOnly) return;
    onConfigChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="trigger-name">Trigger Name</Label>
        <Input
          id="trigger-name"
          value={config.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Enter trigger name"
          disabled={readOnly}
        />
      </div>

      <div>
        <Label htmlFor="trigger-description">Description</Label>
        <Textarea
          id="trigger-description"
          value={config.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Enter trigger description"
          rows={3}
          disabled={readOnly}
        />
      </div>

      <div>
        <Label htmlFor="team">Team</Label>
        <Input
          id="team"
          value={config.team || ""}
          onChange={(e) => handleChange("team", e.target.value)}
          placeholder="Enter team name"
          disabled={readOnly}
        />
      </div>

      <div>
        <Label htmlFor="event-type">Event Type</Label>
        <Select
          value={config.eventType || "issue_created"}
          onValueChange={(value) => handleChange("eventType", value)}
          disabled={readOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select event type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="issue_created">Issue Created</SelectItem>
            <SelectItem value="issue_updated">Issue Updated</SelectItem>
            <SelectItem value="issue_commented">Issue Commented</SelectItem>
            <SelectItem value="cycle_created">Cycle Created</SelectItem>
            <SelectItem value="project_created">Project Created</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="priority">Priority Filter</Label>
        <Select
          value={config.priority || "all"}
          onValueChange={(value) => handleChange("priority", value)}
          disabled={readOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="no_priority">No Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="include-subtasks"
          checked={config.includeSubtasks || false}
          onCheckedChange={(checked) =>
            handleChange("includeSubtasks", checked)
          }
          disabled={readOnly}
        />
        <Label htmlFor="include-subtasks">Include Subtasks</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="auto-assign"
          checked={config.autoAssign || false}
          onCheckedChange={(checked) => handleChange("autoAssign", checked)}
          disabled={readOnly}
        />
        <Label htmlFor="auto-assign">Auto-assign to creator</Label>
      </div>
    </div>
  );
};

// Node metadata for the palette
export const linearTriggerNodeMetadata = {
  type: "trigger_linear_issue_created",
  category: "trigger",
  group: "linear",
  name: "Linear Issue Created",
  description: "Triggers when an issue is created in Linear",
  icon: MessageSquare,
  configComponent: LinearTriggerConfigComponent,
};

export const LinearTriggerNode = ({ data }: { data: WorkflowNode }) => {
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
          <h3 className="font-semibold text-gray-800">Linear Trigger</h3>
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
