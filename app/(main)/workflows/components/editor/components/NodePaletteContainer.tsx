import { FC, useState, useEffect, useRef, useCallback } from "react";
import { NodeType } from "@/services/WorkflowService";
import { NodePalette } from "./NodePalette";
import { NodeConfigPanel } from "./NodeConfigPanel";
import type { Node as RFNode } from "reactflow";
import { GripHorizontal } from "lucide-react";

/**
 * Props for the NodePaletteContainer component
 */
interface NodePaletteContainerProps {
  /** Callback when node dragging starts */
  onNodeDragStart?: (nodeType: NodeType) => void;
  /** Currently selected node in the workflow */
  selectedNode?: RFNode | null;
  /** Callback when node configuration changes */
  onNodeConfigChange?: (nodeId: string, config: any) => void;
}

/**
 * NodePaletteContainer Component
 *
 * A container component that manages both the node palette and node configuration panel.
 * Automatically switches to config view when a node is selected, and provides navigation
 * between the two views.
 *
 * Features:
 * - Automatic switching to config view when node is selected
 * - Manual navigation between palette and config views
 * - Resizable bottom tray
 * - Node palette with search and category filtering
 * - Node configuration panel for selected nodes
 *
 * @param props - Component props
 * @returns JSX element
 */
export const NodePaletteContainer: FC<NodePaletteContainerProps> = ({
  onNodeDragStart,
  selectedNode,
  onNodeConfigChange,
}) => {
  const [currentView, setCurrentView] = useState<"palette" | "config">(
    "palette"
  );
  const [height, setHeight] = useState(300); // Default height in pixels
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Auto-switch to config view when a node is selected
  useEffect(() => {
    if (selectedNode) {
      setCurrentView("config");
    }
  }, [selectedNode]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleResize = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const container = resizeRef.current?.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newHeight = containerRect.bottom - e.clientY;

      // Set min and max height constraints
      const minHeight = 150;
      const maxHeight = window.innerHeight * 0.8;

      setHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)));
    },
    [isResizing]
  );

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleResize);
      document.addEventListener("mouseup", handleResizeEnd);

      return () => {
        document.removeEventListener("mousemove", handleResize);
        document.removeEventListener("mouseup", handleResizeEnd);
      };
    }
  }, [isResizing, handleResize, handleResizeEnd]);

  const handleBackToPalette = () => {
    setCurrentView("palette");
  };

  const handleSwitchToConfig = () => {
    if (selectedNode) {
      setCurrentView("config");
    }
  };

  const handleConfigChange = (config: any) => {
    if (selectedNode && onNodeConfigChange) {
      onNodeConfigChange(selectedNode.id, config);
    }
  };

  return (
    <div
      ref={resizeRef}
      className="border-t border-gray-200 bg-white absolute bottom-0 left-0 right-0 z-10"
      style={{ height: `${height}px` }}
    >
      {/* Resize Handle */}
      <div
        className={`h-1 bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-all duration-200 ease-in-out cursor-ns-resize ${
          isResizing ? "bg-gray-400 cursor-grabbing" : ""
        }`}
        onMouseDown={handleResizeStart}
      >
        <div className="w-6 h-6 rounded-full bg-white border border-gray-300 flex items-center justify-center shadow-sm">
          <GripHorizontal
            className={`w-3 h-3 transition-colors duration-200 ${
              isResizing ? "text-gray-600" : "text-gray-500"
            }`}
          />
        </div>
      </div>

      {/* Content */}
      {currentView === "config" && selectedNode ? (
        <div className="h-full p-4">
          <NodeConfigPanel
            selectedNode={selectedNode}
            onBack={handleBackToPalette}
            onConfigChange={handleConfigChange}
          />
        </div>
      ) : (
        <div className="h-full p-4">
          <NodePalette onNodeDragStart={onNodeDragStart} />
        </div>
      )}
    </div>
  );
};
