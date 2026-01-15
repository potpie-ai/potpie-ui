import { WorkflowNode } from "@/services/WorkflowService";
import { getNodeColors } from "../color_utils";
import { SourceHandle, TargetHandle } from "../../handles";
import { FileText } from "lucide-react";
import { FC } from "react";
import { ConfluenceIntegrationSelector } from "./confluence/ConfluenceIntegrationSelector";
import { ConfluenceSpaceSelector } from "./confluence/ConfluenceSpaceSelector";

interface ConfluenceConfigProps {
    config: any;
    onConfigChange: (config: any) => void;
    readOnly?: boolean;
}

export const ConfluenceConfigComponent: FC<ConfluenceConfigProps> = ({
    config,
    onConfigChange,
    readOnly = false,
}) => {
    // Handle integration change
    const handleIntegrationChange = (integrationId: string, cloudId: string) => {
        onConfigChange({
            ...config,
            connection_id: integrationId,
            cloud_id: cloudId,
            // Reset space when integration changes
            space_key: null,
            space_name: null,
        });
    };

    // Handle space change
    const handleSpaceChange = (spaceKey: string, spaceName: string) => {
        onConfigChange({
            ...config,
            space_key: spaceKey,
            space_name: spaceName,
        });
    };

    return (
        <div className="space-y-4">
            {/* Integration Selector */}
            <ConfluenceIntegrationSelector
                selectedIntegrationId={config?.connection_id || null}
                onIntegrationChange={handleIntegrationChange}
            />

            {/* Space Selector */}
            <ConfluenceSpaceSelector
                integrationId={config?.connection_id || null}
                selectedSpaceKey={config?.space_key || null}
                onSpaceChange={handleSpaceChange}
            />

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Page Title
                </label>
                <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                    placeholder="Documentation Page"
                    value={config?.title || ""}
                    onChange={(e) =>
                        onConfigChange({ ...config, title: e.target.value })
                    }
                    disabled={readOnly}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content (XHTML)
                </label>
                <textarea
                    className="w-full min-h-[100px] border border-gray-300 rounded-md p-2 text-sm resize-y"
                    placeholder="<p>Page content in XHTML format</p>"
                    value={config?.content || ""}
                    onChange={(e) =>
                        onConfigChange({ ...config, content: e.target.value })
                    }
                    disabled={readOnly}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Page ID (Optional)
                </label>
                <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                    placeholder="123456"
                    value={config?.parent_page_id || ""}
                    onChange={(e) =>
                        onConfigChange({ ...config, parent_page_id: e.target.value })
                    }
                    disabled={readOnly}
                />
            </div>
        </div>
    );
};

// Node metadata for the palette
export const confluenceCreatePageNodeMetadata = {
    type: "action_confluence_create_page",
    category: "action",
    group: "confluence",
    name: "Create Confluence Page",
    description: "Create a new page in Confluence",
    icon: FileText,
    configComponent: ConfluenceConfigComponent,
};

export const ConfluenceCreatePageNode = ({ data }: { data: WorkflowNode }) => {
    const colors = getNodeColors(data.group);
    const title = data.data?.title;
    const spaceName = data.data?.space_name;
    const integrationId = data.data?.connection_id;

    return (
        <div className="w-full">
            <div
                className="p-3 border-b border-gray-200"
                style={{ backgroundColor: colors.secondary }}
            >
                <div className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" style={{ color: colors.primary }} />
                    <h3 className="font-semibold text-gray-800">Create Confluence Page</h3>
                </div>
            </div>
            <div className="p-4 flex flex-col items-start gap-2">
                <div className="w-full space-y-2">
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
                    {spaceName && (
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-gray-500">Space</div>
                            <div className="text-sm font-medium text-gray-800 truncate" title={spaceName}>
                                {spaceName}
                            </div>
                        </div>
                    )}

                    {/* Title */}
                    <div className="flex flex-col gap-1">
                        <div className="text-xs text-gray-500">Page Title</div>
                        <p className="text-sm font-medium text-gray-900 truncate" title={title || undefined}>
                            {title || <span className="italic text-gray-400">No title specified</span>}
                        </p>
                    </div>
                </div>
            </div>
            <TargetHandle />
            <SourceHandle />
        </div>
    );
};
