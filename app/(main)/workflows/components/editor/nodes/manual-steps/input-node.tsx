import { FC, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WorkflowNode } from "@/services/WorkflowService";
import { getNodeColors } from "../color_utils";
import { SourceHandle, TargetHandle } from "../../handles";
import { Edit, Plus, Trash2 } from "lucide-react";

interface InputField {
  name: string;
  type: "text" | "number" | "select" | "multi_select" | "file";
  required?: boolean;
  options?: string[];
}

interface InputNodeData {
  input_fields?: InputField[];
  assignee?: string;
  timeout_hours?: number;
  channel?: "email" | "app" | "chat" | "slack";
  loop_back_node_id?: string;
  loop_back_condition?: string;
}

interface InputConfigProps {
  config: InputNodeData;
  onConfigChange: (config: InputNodeData) => void;
  readOnly?: boolean;
  workflow?: any;
}

export const InputConfigComponent: FC<InputConfigProps> = ({
  config,
  onConfigChange,
  readOnly = false,
  workflow,
}) => {
  const [fields, setFields] = useState<InputField[]>(
    config.input_fields || [{ name: "", type: "text", required: false }]
  );

  const handleChange = (key: string, value: any) => {
    if (readOnly) return;
    onConfigChange({ ...config, [key]: value });
  };

  const updateFields = (newFields: InputField[]) => {
    setFields(newFields);
    handleChange("input_fields", newFields);
  };

  const addField = () => {
    if (readOnly) return;
    updateFields([...fields, { name: "", type: "text", required: false }]);
  };

  const removeField = (index: number) => {
    if (readOnly) return;
    updateFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<InputField>) => {
    if (readOnly) return;
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    updateFields(newFields);
  };

  const updateFieldOptions = (index: number, value: string) => {
    if (readOnly) return;
    const options = value
      .split(",")
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
    updateField(index, { options });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="assignee">Assignee (User ID or Email)</Label>
        <Input
          id="assignee"
          value={config.assignee || ""}
          onChange={(e) => handleChange("assignee", e.target.value)}
          placeholder="user@example.com"
          disabled={readOnly}
        />
        <p className="text-xs text-gray-500 mt-1">
          User who will provide input for this step
        </p>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Input Fields</Label>
          {!readOnly && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addField}
              className="h-7"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Field
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={index}
              className="p-3 border border-gray-200 rounded-md space-y-2"
            >
              <div className="flex items-center justify-between">
                <Label className="text-xs">Field {index + 1}</Label>
                {!readOnly && fields.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeField(index)}
                    className="h-6 w-6 p-0 text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <Input
                placeholder="Field name"
                value={field.name}
                onChange={(e) => updateField(index, { name: e.target.value })}
                disabled={readOnly}
              />
              <select
                value={field.type}
                onChange={(e) =>
                  updateField(index, {
                    type: e.target.value as InputField["type"],
                  })
                }
                disabled={readOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="select">Select</option>
                <option value="multi_select">Multi-Select</option>
                <option value="file">File</option>
              </select>
              {(field.type === "select" || field.type === "multi_select") && (
                <Input
                  placeholder="Options (comma-separated)"
                  value={(field.options || []).join(", ")}
                  onChange={(e) => updateFieldOptions(index, e.target.value)}
                  disabled={readOnly}
                />
              )}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`required-${index}`}
                  checked={field.required || false}
                  onChange={(e) =>
                    updateField(index, { required: e.target.checked })
                  }
                  disabled={readOnly}
                  className="rounded"
                />
                <Label htmlFor={`required-${index}`} className="text-xs">
                  Required
                </Label>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="timeout_hours">Timeout (hours)</Label>
        <Input
          id="timeout_hours"
          type="number"
          min="1"
          max="168"
          value={config.timeout_hours || 24}
          onChange={(e) =>
            handleChange("timeout_hours", parseInt(e.target.value) || 24)
          }
          disabled={readOnly}
        />
        <p className="text-xs text-gray-500 mt-1">
          Request will expire after this many hours (1-168)
        </p>
      </div>
      <div>
        <Label htmlFor="channel">Notification Channel</Label>
        <select
          id="channel"
          value={config.channel || "app"}
          onChange={(e) =>
            handleChange("channel", e.target.value as "email" | "app" | "chat" | "slack")
          }
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="app">App (Web UI)</option>
          <option value="email">Email</option>
          <option value="chat">Chat (In Conversation)</option>
          <option value="slack">Slack</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {config.channel === "email"
            ? "Request will be sent via email. Make sure SMTP is configured."
            : config.channel === "chat"
            ? "Request will appear as a message in the conversation."
            : config.channel === "slack"
            ? "Request will be sent via Slack with a link to respond in the app. Make sure SLACK_BOT_TOKEN is configured."
            : "Request will appear in the app's pending requests page."}
        </p>
      </div>

      {/* Loop Back Configuration */}
      <div className="border-t pt-4 mt-4">
        <Label className="text-sm font-semibold mb-2 block">Loop Back Configuration (Optional)</Label>
        <p className="text-xs text-gray-500 mb-3">
          Enable backward routing to allow users to request changes and loop back to a previous node.
        </p>
        
        <div className="space-y-3">
          <div>
            <Label htmlFor="loop_back_node_id" className="text-xs">
              Loop Back Node ID
            </Label>
            <Input
              id="loop_back_node_id"
              value={config.loop_back_node_id || ""}
              onChange={(e) => handleChange("loop_back_node_id", e.target.value)}
              placeholder="e.g., custom_agent_1234567890_abc123"
              disabled={readOnly}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              The node ID to route back to when user requests changes. This enables review mode in the UI.
            </p>
          </div>
          
          <div>
            <Label htmlFor="loop_back_condition" className="text-xs">
              Loop Back Condition Field Name
            </Label>
            <Input
              id="loop_back_condition"
              value={config.loop_back_condition || "needs_changes"}
              onChange={(e) => handleChange("loop_back_condition", e.target.value)}
              placeholder="needs_changes"
              disabled={readOnly}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Field name in the response that triggers loop back (default: &quot;needs_changes&quot;). 
              When this field is true, the workflow will route back to the loop back node.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const inputNodeMetadata = {
  type: "manual_step_input",
  category: "manual_step",
  group: "default",
  name: "Input",
  description: "Collects data from users",
  icon: Edit,
  configComponent: InputConfigComponent,
};

export const InputNode = ({ data }: { data: WorkflowNode }) => {
  const colors = getNodeColors(data.group);
  const fields = data.data?.input_fields || [];
  const assignee = data.data?.assignee;

  return (
    <div className="w-full">
      <div
        className="p-3 border-b border-gray-200"
        style={{ backgroundColor: colors.secondary }}
      >
        <div className="flex items-center">
          <Edit
            className="w-5 h-5 mr-2"
            style={{ color: colors.primary }}
          />
          <h3 className="font-semibold text-gray-800">Input</h3>
        </div>
      </div>
      <div className="p-4">
        {fields.length > 0 && (
          <div className="text-xs text-gray-600 mb-2">
            {fields.length} field{fields.length !== 1 ? "s" : ""} required
          </div>
        )}
        {assignee && (
          <div className="text-xs text-gray-500">
            Assignee: {assignee}
          </div>
        )}
      </div>
      <TargetHandle />
      <SourceHandle />
    </div>
  );
};

