import { FC } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { WorkflowNode } from "@/services/WorkflowService";
import { getNodeColors } from "../color_utils";
import { SourceHandle, TargetHandle } from "../../handles";
import { CheckCircle } from "lucide-react";

interface ApprovalNodeData {
  approvers?: string[];
  approval_message?: string;
  timeout_hours?: number;
  timeout_action?: "approve" | "reject";
  channel?: "email" | "app" | "chat" | "slack";
}

interface ApprovalConfigProps {
  config: ApprovalNodeData;
  onConfigChange: (config: ApprovalNodeData) => void;
  readOnly?: boolean;
  workflow?: any;
}

export const ApprovalConfigComponent: FC<ApprovalConfigProps> = ({
  config,
  onConfigChange,
  readOnly = false,
  workflow,
}) => {
  const handleChange = (key: string, value: any) => {
    if (readOnly) return;
    onConfigChange({ ...config, [key]: value });
  };

  const handleApproversChange = (value: string) => {
    if (readOnly) return;
    // Split by comma and trim
    const approvers = value
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a.length > 0);
    handleChange("approvers", approvers);
  };

  const approversString = (config.approvers || []).join(", ");

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="approvers">Approvers (comma-separated user IDs)</Label>
        <Input
          id="approvers"
          value={approversString}
          onChange={(e) => handleApproversChange(e.target.value)}
          placeholder="user1@example.com, user2@example.com"
          disabled={readOnly}
        />
        <p className="text-xs text-gray-500 mt-1">
          Enter user IDs or emails separated by commas
        </p>
      </div>
      <div>
        <Label htmlFor="approval_message">Approval Message</Label>
        <Textarea
          id="approval_message"
          value={config.approval_message || ""}
          onChange={(e) => handleChange("approval_message", e.target.value)}
          placeholder="Please review and approve this request"
          rows={3}
          disabled={readOnly}
        />
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
        <Label htmlFor="timeout_action">Action on Timeout</Label>
        <select
          id="timeout_action"
          value={config.timeout_action || "reject"}
          onChange={(e) =>
            handleChange("timeout_action", e.target.value as "approve" | "reject")
          }
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="reject">Reject</option>
          <option value="approve">Approve</option>
        </select>
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
          <option value="chat">Chat</option>
          <option value="slack">Slack</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {config.channel === "email"
            ? "Request will be sent via email. Make sure SMTP is configured."
            : config.channel === "chat"
            ? "Request will appear in the chat conversation for this workflow."
            : config.channel === "slack"
            ? "Request will be sent via Slack with a link to respond in the app. Make sure SLACK_BOT_TOKEN is configured."
            : "Request will appear in the app's pending requests page."}
        </p>
      </div>
    </div>
  );
};

export const approvalNodeMetadata = {
  type: "manual_step_approval",
  category: "manual_step",
  group: "default",
  name: "Approval",
  description: "Requires human approval before continuing",
  icon: CheckCircle,
  configComponent: ApprovalConfigComponent,
};

export const ApprovalNode = ({ data }: { data: WorkflowNode }) => {
  const colors = getNodeColors(data.group);
  const message = data.data?.approval_message;
  const approvers = data.data?.approvers || [];

  return (
    <div className="w-full">
      <div
        className="p-3 border-b border-gray-200"
        style={{ backgroundColor: colors.secondary }}
      >
        <div className="flex items-center">
          <CheckCircle
            className="w-5 h-5 mr-2"
            style={{ color: colors.primary }}
          />
          <h3 className="font-semibold text-gray-800">Approval</h3>
        </div>
      </div>
      <div className="p-4">
        {message && (
          <div
            className="p-3 rounded-md border mb-2"
            style={{
              backgroundColor: colors.secondary + "20",
              borderColor: colors.primary + "40",
            }}
          >
            <p className="text-sm text-gray-700">{message}</p>
          </div>
        )}
        {approvers.length > 0 && (
          <div className="text-xs text-gray-500">
            Approvers: {approvers.join(", ")}
          </div>
        )}
      </div>
      <TargetHandle />
      <SourceHandle />
    </div>
  );
};

