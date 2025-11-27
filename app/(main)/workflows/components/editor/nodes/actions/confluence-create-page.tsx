import { WorkflowNode } from "@/services/WorkflowService";
import { getNodeColors } from "../color_utils";
import { SourceHandle, TargetHandle } from "../../handles";
import { FileText } from "lucide-react";
import { FC } from "react";

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
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Connection ID
                </label>
                <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                    placeholder="confluence-connection-id"
                    value={config?.connection_id || ""}
                    onChange={(e) =>
                        onConfigChange({ ...config, connection_id: e.target.value })
                    }
                    disabled={readOnly}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Space Key
                </label>
                <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                    placeholder="DOCS"
                    value={config?.space_key || ""}
                    onChange={(e) =>
                        onConfigChange({ ...config, space_key: e.target.value })
                    }
                    disabled={readOnly}
                />
            </div>

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
    const spaceKey = data.data?.space_key;

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
                <div className="w-full">
                    <p className="font-semibold truncate text-gray-900" title={title || undefined}>
                        {title || "No title specified"}
                    </p>
                    {spaceKey && (
                        <p className="mt-1 text-xs text-gray-600 truncate" title={spaceKey}>
                            📁 Space: {spaceKey}
                        </p>
                    )}
                </div>
            </div>
            <TargetHandle />
            <SourceHandle />
        </div>
    );
};
