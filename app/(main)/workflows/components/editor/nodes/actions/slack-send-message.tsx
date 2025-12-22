import { WorkflowNode } from "@/services/WorkflowService";
import { getNodeColors } from "../color_utils";
import { SourceHandle, TargetHandle } from "../../handles";
import { MessageSquare } from "lucide-react";
import { FC } from "react";

interface SlackConfigProps {
    config: any;
    onConfigChange: (config: any) => void;
    readOnly?: boolean;
}

export const SlackConfigComponent: FC<SlackConfigProps> = ({
    config,
    onConfigChange,
    readOnly = false,
}) => {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Connection ID
                </label>
                <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                    placeholder="slack-connection-id"
                    value={config?.connection_id || ""}
                    onChange={(e) =>
                        onConfigChange({ ...config, connection_id: e.target.value })
                    }
                    disabled={readOnly}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Channel ID
                </label>
                <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                    placeholder="C01234567"
                    value={config?.channel_id || ""}
                    onChange={(e) =>
                        onConfigChange({ ...config, channel_id: e.target.value })
                    }
                    disabled={readOnly}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                </label>
                <textarea
                    className="w-full min-h-[100px] border border-gray-300 rounded-md p-2 text-sm resize-y"
                    placeholder="Message to send to Slack channel"
                    value={config?.message || ""}
                    onChange={(e) =>
                        onConfigChange({ ...config, message: e.target.value })
                    }
                    disabled={readOnly}
                />
            </div>
        </div>
    );
};

// Node metadata for the palette
export const slackSendMessageNodeMetadata = {
    type: "action_slack_send_message",
    category: "action",
    group: "slack",
    name: "Send Slack Message",
    description: "Send a message to a Slack channel",
    icon: MessageSquare,
    configComponent: SlackConfigComponent,
};

export const SlackSendMessageNode = ({ data }: { data: WorkflowNode }) => {
    const colors = getNodeColors(data.group);
    const message = data.data?.message;
    const channelId = data.data?.channel_id;

    return (
        <div className="w-full">
            <div
                className="p-3 border-b border-gray-200"
                style={{ backgroundColor: colors.secondary }}
            >
                <div className="flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" style={{ color: colors.primary }} />
                    <h3 className="font-semibold text-gray-800">Send Slack Message</h3>
                </div>
            </div>
            <div className="p-4 flex flex-col items-start gap-2">
                <div className="w-full">
                    {channelId && (
                        <p className="text-xs text-gray-600 truncate mb-2" title={channelId}>
                            📢 Channel: {channelId}
                        </p>
                    )}
                    <p className="text-xs text-gray-700 line-clamp-3" title={message || undefined}>
                        {message || "No message specified"}
                    </p>
                </div>
            </div>
            <TargetHandle />
            <SourceHandle />
        </div>
    );
};
