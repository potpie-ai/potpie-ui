import { FC, useState, useEffect } from "react";
// NodeType is now just string
// import { NodeType } from "@/services/WorkflowService";
import { getNodeColors } from "../nodes/color_utils";
import { availableNodes } from "../nodes";
import type { NodeInfo } from "../nodes";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Node as RFNode } from "reactflow";

/**
 * Props for the NodeConfigPanel component
 */
interface NodeConfigPanelProps {
  /** The node being configured */
  selectedNode: RFNode;
  /** Callback to go back to palette view */
  onBack: () => void;
  /** Callback when configuration changes */
  onConfigChange: (config: any) => void;
  /** Whether the config panel should be read-only */
  readOnly?: boolean;
  /** The workflow ID for webhook generation */
  workflowId?: string;
  /** The workflow object for webhook information */
  workflow?: any;
}

/**
 * Node Configuration Panel Component
 *
 * Displays configuration options for a selected node in the workflow.
 * Provides a form interface for editing node properties like name, description,
 * and node-specific configuration fields using dynamic config components from nodes.
 */
export const NodeConfigPanel: FC<NodeConfigPanelProps> = ({
  selectedNode,
  onBack,
  onConfigChange,
  readOnly = false,
  workflowId,
  workflow,
}) => {
  const [config, setConfig] = useState(selectedNode.data?.data || {});
  const [copied, setCopied] = useState(false);

  // Update config when selectedNode changes
  useEffect(() => {
    setConfig(selectedNode.data?.data || {});
  }, [selectedNode.data?.data]);

  const handleConfigChange = (newConfig: any) => {
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(selectedNode.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy node ID:", err);
    }
  };

  const getNodeInfo = (nodeType: string): NodeInfo | undefined => {
    return availableNodes.find((node) => node.type === nodeType);
  };

  const nodeInfo = getNodeInfo(selectedNode.data.type);
  // getNodeColors now accepts string for group
  const colors = nodeInfo
    ? getNodeColors(nodeInfo.group as any)
    : { primary: "#6b7280", secondary: "#f3f4f6" };
  const IconComponent = nodeInfo?.icon;
  const ConfigComponent = nodeInfo?.configComponent;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-2 h-9 w-9 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            {IconComponent && (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                style={{ backgroundColor: colors.secondary }}
              >
                <IconComponent
                  className="w-4 h-4"
                  style={{ color: colors.primary }}
                />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900 text-base">
                {nodeInfo?.name || "Unknown Node"}
              </h3>
              <p className="text-xs text-gray-600 font-medium">
                Node Configuration
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Node Info Row */}
          <div
            className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
            style={{ maxWidth: "1000px" }}
          >
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Node Information
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block uppercase tracking-wide">
                  Node ID
                </label>
                <div className="text-sm text-gray-900 font-mono bg-gray-50 px-3 py-2 rounded-md border border-gray-200 shadow-sm flex items-center justify-between">
                  <span className="truncate">{selectedNode.id}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyId}
                    className="p-1 h-6 w-6 hover:bg-gray-200 transition-colors ml-2 flex-shrink-0"
                    title="Copy Node ID"
                    disabled={readOnly}
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-600" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block uppercase tracking-wide">
                  Node Type
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200 shadow-sm">
                  {selectedNode.data.type}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block uppercase tracking-wide">
                  Position
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200 shadow-sm">
                  x={Math.round(selectedNode.position.x)}, y=
                  {Math.round(selectedNode.position.y)}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Configuration Fields */}
          {ConfigComponent ? (
            <div
              className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
              style={{ maxWidth: "1000px" }}
            >
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Configuration
              </h4>
              <ConfigComponent
                config={config}
                onConfigChange={handleConfigChange}
                readOnly={readOnly}
                workflowId={workflowId}
                workflow={workflow}
              />
            </div>
          ) : (
            <div
              className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
              style={{ maxWidth: "1000px" }}
            >
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                Configuration
              </h4>
              <div className="text-sm text-gray-500 italic bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                No configuration options available for this node type.
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
