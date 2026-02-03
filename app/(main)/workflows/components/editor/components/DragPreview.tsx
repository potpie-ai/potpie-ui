import { FC } from "react";
import { NodeType, NodeCategory, NodeGroup } from "@/services/WorkflowService";
import { getNodeColors } from "../nodes/color_utils";

interface DragPreviewProps {
  nodeInfo: {
    type: NodeType;
    category: NodeCategory;
    group: NodeGroup;
    name: string;
    description: string;
    icon?: React.ComponentType<any>;
  };
}

export const DragPreview: FC<DragPreviewProps> = ({ nodeInfo }) => {
  const colors = getNodeColors(nodeInfo.group);
  const IconComponent = nodeInfo.icon;

  return (
    <div className="bg-background border border-gray-300 rounded-lg shadow-lg p-3 max-w-xs opacity-90 h-28 flex flex-col">
      <div className="flex items-center mb-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center mr-2"
          style={{ backgroundColor: colors.secondary }}
        >
          {IconComponent ? (
            <IconComponent
              className="w-4 h-4"
              style={{ color: colors.primary }}
            />
          ) : (
            <div style={{ color: colors.primary }}>●</div>
          )}
        </div>
        <span className="text-sm font-medium text-gray-800 flex-1">
          {nodeInfo.name}
        </span>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed mb-auto">
        {nodeInfo.description}
      </p>
    </div>
  );
};
