import { useDrag, useDrop } from "react-dnd";
import { NodeType, NodeCategory, NodeGroup } from "@/services/WorkflowService";
import { isValidNodeType } from "../utils/nodeValidation";

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
  cursorOffset?: { x: number; y: number };
}

// Drop result interface
export interface DropResult {
  dropped: boolean;
  position?: { x: number; y: number };
}

// Extend the Window interface to include __lastDragEvent
declare global {
  interface Window {
    __lastDragEvent?: MouseEvent;
  }
}

// Hook for drag sources (node palette items)
export const useNodeDrag = (nodeInfo: DragNodeItem["nodeInfo"]) => {
  if (!isValidNodeType(nodeInfo.type)) {
    throw new Error(`Invalid node type for drag: ${nodeInfo.type}`);
  }
  // We'll attach the offset dynamically in the drag start event
  const [{ isDragging }, drag, dragPreview] = useDrag<
    DragNodeItem,
    DropResult,
    { isDragging: boolean }
  >({
    type: ItemTypes.NODE,
    item: () => {
      // Get the current mouse position and the node's bounding rect
      const event = window.__lastDragEvent;
      let cursorOffset = undefined;
      if (
        event &&
        "target" in event &&
        event.target &&
        typeof (event.target as HTMLElement).getBoundingClientRect ===
          "function"
      ) {
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        cursorOffset = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
      }
      return {
        type: ItemTypes.NODE,
        nodeInfo,
        cursorOffset,
      };
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
    position: { x: number; y: number },
    cursorOffset?: { x: number; y: number }
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
        // Pass the raw client offset and cursorOffset to the ReactFlowCanvas
        onNodeDrop(item.nodeInfo, offset, item.cursorOffset);
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
