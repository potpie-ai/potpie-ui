import { useDrag, useDrop } from "react-dnd";
import { NodeType, NodeCategory, NodeGroup } from "@/services/WorkflowService";

// DnD Item Types
export const ItemTypes = {
  NODE: "node",
} as const;

// Drag item interface
export interface DragNodeItem {
  type: typeof ItemTypes.NODE;
  nodeInfo: {
    type: NodeType;
    category: NodeCategory;
    group: NodeGroup;
    name: string;
    description: string;
    icon?: React.ComponentType<any>;
  };
}

// Drop result interface
export interface DropResult {
  dropped: boolean;
  position?: { x: number; y: number };
}

// Hook for drag sources (node palette items)
export const useNodeDrag = (nodeInfo: DragNodeItem["nodeInfo"]) => {
  const [{ isDragging }, drag, dragPreview] = useDrag<
    DragNodeItem,
    DropResult,
    { isDragging: boolean }
  >({
    type: ItemTypes.NODE,
    item: {
      type: ItemTypes.NODE,
      nodeInfo,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return { isDragging, drag, dragPreview };
};

// Hook for drop targets (React Flow canvas)
export const useCanvasDrop = (
  onNodeDrop: (
    nodeInfo: DragNodeItem["nodeInfo"],
    position: { x: number; y: number }
  ) => void
) => {
  const [{ isOver }, drop] = useDrop<
    DragNodeItem,
    DropResult,
    { isOver: boolean }
  >({
    accept: ItemTypes.NODE,
    drop: (item, monitor) => {
      const offset = monitor.getClientOffset();
      if (offset) {
        // Pass the raw client offset to the ReactFlowCanvas
        // The ReactFlowCanvas will handle the coordinate transformation
        onNodeDrop(item.nodeInfo, offset);
        return { dropped: true, position: offset };
      }
      return { dropped: false };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return { isOver, drop };
};
