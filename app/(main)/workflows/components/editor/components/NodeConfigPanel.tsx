import { FC, useState } from "react";
import { NodeType } from "@/services/WorkflowService";
import { getNodeColors } from "../nodes/color_utils";
import { availableNodes } from "../nodes";
import type { NodeInfo } from "../nodes";
import { ArrowLeft } from "lucide-react";
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
}) => {
  const [config, setConfig] = useState(selectedNode.data?.data || {});

  const handleConfigChange = (newConfig: any) => {
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const getNodeInfo = (nodeType: NodeType): NodeInfo | undefined => {
    return availableNodes.find((node) => node.type === nodeType);
  };

  const nodeInfo = getNodeInfo(selectedNode.data.type);
  const colors = nodeInfo
    ? getNodeColors(nodeInfo.group)
    : { primary: "#6b7280", secondary: "#f3f4f6" };
  const IconComponent = nodeInfo?.icon;
  const ConfigComponent = nodeInfo?.configComponent;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-1 h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            {IconComponent && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: colors.secondary }}
              >
                <IconComponent
                  className="w-3 h-3"
                  style={{ color: colors.primary }}
                />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">
                {nodeInfo?.name || "Unknown Node"}
              </h3>
              <p className="text-xs text-gray-500">Node Configuration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 p-4">
          {/* Node ID */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Node ID
            </label>
            <Input value={selectedNode.id} disabled className="text-gray-500" />
          </div>

          {/* Node Type */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Node Type
            </label>
            <Input
              value={selectedNode.data.type}
              disabled
              className="text-gray-500"
            />
          </div>

          {/* Dynamic Configuration Fields */}
          {ConfigComponent ? (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Configuration
              </label>
              <ConfigComponent
                config={config}
                onConfigChange={handleConfigChange}
              />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Configuration
              </label>
              <div className="text-sm text-gray-500 italic">
                No configuration options available for this node type.
              </div>
            </div>
          )}

          {/* Position Information */}
          <div className="pt-4 border-t border-gray-100">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Position
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">X</label>
                <Input
                  type="number"
                  value={Math.round(selectedNode.position.x)}
                  disabled
                  className="text-gray-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Y</label>
                <Input
                  type="number"
                  value={Math.round(selectedNode.position.y)}
                  disabled
                  className="text-gray-500"
                />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
