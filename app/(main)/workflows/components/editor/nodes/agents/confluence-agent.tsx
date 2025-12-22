import { WorkflowNode } from "@/services/WorkflowService";
import { getNodeColors } from "../color_utils";
import { SourceHandle, TargetHandle } from "../../handles";
import { BookOpen } from "lucide-react";
import { FC } from "react";
import { ConfluenceIntegrationSelector } from "../actions/confluence/ConfluenceIntegrationSelector";
import { ConfluenceSpaceSelector } from "../actions/confluence/ConfluenceSpaceSelector";

interface ConfluenceAgentConfigProps {
    config: any;
    onConfigChange: (config: any) => void;
    readOnly?: boolean;
    workflow?: any;
}

export const ConfluenceAgentConfigComponent: FC<ConfluenceAgentConfigProps> = ({
    config,
    onConfigChange,
    readOnly = false,
}) => {
    // Handle config changes
    const handleChange = (updates: Partial<any>) => {
        if (readOnly) return;
        onConfigChange({ ...(config || {}), ...updates });
    };

    // Handle task change
    const handleTaskChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (readOnly) return;
        handleChange({ task: e.target.value });
    };

    // Handle integration change
    const handleIntegrationChange = (integrationId: string, cloudId: string) => {
        handleChange({
            integration_id: integrationId,
            cloud_id: cloudId,
            // Reset space when integration changes
            space_key: null,
            space_name: null,
        });
    };

    // Handle space change
    const handleSpaceChange = (spaceKey: string, spaceName: string) => {
        handleChange({
            space_key: spaceKey,
            space_name: spaceName,
        });
    };

    return (
        <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                        Confluence Documentation Agent
                    </span>
                </div>
                <p className="text-xs text-blue-600">
                    This agent is specialized for creating and managing Confluence
                    documentation. It has access to Confluence-specific tools and doesn't
                    require repository context.
                </p>
            </div>

            {/* Integration Selector */}
            <ConfluenceIntegrationSelector
                selectedIntegrationId={config?.integration_id || null}
                onIntegrationChange={handleIntegrationChange}
            />

            {/* Space Selector */}
            <ConfluenceSpaceSelector
                integrationId={config?.integration_id || null}
                selectedSpaceKey={config?.space_key || null}
                onSpaceChange={handleSpaceChange}
            />

            {/* Task input field */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Description
                </label>
                <textarea
                    className="w-full min-h-[100px] border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition resize-y"
                    placeholder="Describe what documentation you want to create or update..."
                    value={config?.task || ""}
                    onChange={handleTaskChange}
                    disabled={readOnly}
                />
                <p className="mt-1 text-xs text-gray-500">
                    Be specific about the content structure and where it should be published.
                </p>
            </div>
        </div>
    );
};

// Node metadata for the palette
export const confluenceAgentNodeMetadata = {
    type: "system_workflow_agent_confluence",
    category: "agent",
    group: "confluence",
    name: "Confluence Documentation Agent",
    description: "Specialized agent for creating and managing Confluence documentation",
    icon: BookOpen,
    configComponent: ConfluenceAgentConfigComponent,
};

export const ConfluenceAgentNode = ({ data }: { data: WorkflowNode }) => {
    const colors = getNodeColors(data.group);
    const task = data.data?.task;
    const integrationId = data.data?.integration_id;
    const spaceKey = data.data?.space_key;
    const spaceName = data.data?.space_name;

    return (
        <div className="w-full">
            <div
                className="p-3 border-b border-gray-200"
                style={{ backgroundColor: colors.secondary }}
            >
                <div className="flex items-center">
                    <BookOpen className="w-5 h-5 mr-2" style={{ color: colors.primary }} />
                    <h3 className="font-semibold text-gray-800">Confluence Agent</h3>
                </div>
            </div>
            <div className="p-4 space-y-2">
                {/* Integration Status */}
                <div className="flex flex-col gap-1">
                    <div className="text-xs text-gray-500">Integration</div>
                    <div className="text-sm font-medium text-gray-800">
                        {integrationId ? (
                            <span className="text-green-600">✓ Connected</span>
                        ) : (
                            <span className="italic text-gray-400">
                                No integration selected
                            </span>
                        )}
                    </div>
                </div>

                {/* Space (if selected) */}
                {spaceKey && spaceName && (
                    <div className="flex flex-col gap-1">
                        <div className="text-xs text-gray-500">Space</div>
                        <div className="text-sm font-medium text-gray-800 truncate" title={spaceName}>
                            {spaceName}
                        </div>
                    </div>
                )}

                {/* Task (if provided) */}
                {task && (
                    <div className="flex flex-col gap-1">
                        <div className="text-xs text-gray-500">Task</div>
                        <p
                            className="text-xs text-gray-700 line-clamp-2 max-w-full break-words"
                            title={task}
                            style={{ wordBreak: "break-word" }}
                        >
                            {task}
                        </p>
                    </div>
                )}
            </div>
            <TargetHandle />
            <SourceHandle />
        </div>
    );
};
