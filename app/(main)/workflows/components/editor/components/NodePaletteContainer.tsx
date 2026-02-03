import { FC, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { NodePalette } from "./NodePalette";
import { NodeConfigPanel } from "./NodeConfigPanel";
import type { Node as RFNode } from "reactflow";
import { GripHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Props for the NodePaletteContainer component
 */
interface NodePaletteContainerProps {
  /** Callback when node dragging starts */
  onNodeDragStart?: (nodeType: string) => void;
  /** Currently selected node in the workflow */
  selectedNode?: RFNode | null;
  /** Callback when node configuration changes */
  onNodeConfigChange?: (nodeId: string, config: any) => void;
  /** Whether the config panel should be read-only */
  readOnly?: boolean;
  /** Whether the container should be visible (controls layout, not display) */
  visible?: boolean;
  /** The workflow ID for webhook generation */
  workflowId?: string;
  /** The workflow object for webhook information */
  workflow?: any;
}

type PanelView = "collapsed" | "palette" | "config";

export const NodePaletteContainer: FC<NodePaletteContainerProps> = ({
  onNodeDragStart,
  selectedNode,
  onNodeConfigChange,
  readOnly = false,
  visible = true,
  workflowId,
  workflow,
}) => {
  const [panelHeight, setPanelHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [manualView, setManualView] = useState<PanelView | null>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const lastSelectedNodeId = useRef<string | null>(null);

  // Determine the current panel view
  const currentView = useMemo((): PanelView => {
    if (!visible) return "collapsed";
    if (selectedNode) return "config";
    if (!readOnly) return "palette";
    return "collapsed";
  }, [visible, selectedNode, readOnly]);

  const effectiveView = manualView || currentView;

  // Enhanced node selection handling
  useEffect(() => {
    if (selectedNode) {
      const nodeId = selectedNode.id;

      // Only update if the selected node has actually changed
      if (lastSelectedNodeId.current !== nodeId) {
        lastSelectedNodeId.current = nodeId;

        // Force config view when a node is selected
        if (manualView === "collapsed" || manualView === "palette") {
          setManualView("config");
        }

        // Ensure the panel is expanded when a node is selected
        if (panelHeight < 200) {
          setPanelHeight(300);
        }

        // Add a fallback timeout to ensure config view is shown
        const timeoutId = setTimeout(() => {
          if (selectedNode && effectiveView !== "config") {
            setManualView("config");
          }
        }, 100);

        return () => clearTimeout(timeoutId);
      }
    } else {
      // Clear the last selected node when no node is selected
      lastSelectedNodeId.current = null;

      // Reset manual view when no node is selected and we're not in edit mode
      if (readOnly && manualView === "config") {
        setManualView("collapsed");
      }
    }
  }, [selectedNode, manualView, readOnly, panelHeight, effectiveView]);

  // Calculate panel height with viewport constraints
  const isExpanded = effectiveView === "palette" || effectiveView === "config";
  const maxAvailableHeight = Math.max(200, window.innerHeight * 0.4); // Max 40% of viewport height
  const currentHeight = isExpanded
    ? Math.min(panelHeight, maxAvailableHeight)
    : 60;

  // Handlers
  const handleOpenPalette = () => setManualView("palette");
  const handleBackToPalette = () => setManualView("palette");
  const handleCollapse = () => setManualView("collapsed");

  // Reset manual view when node is selected (legacy logic - kept for compatibility)
  useEffect(() => {
    if (selectedNode && manualView === "collapsed") {
      setManualView(null);
    }
  }, [selectedNode, manualView]);

  // Resize handlers
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
      const minHeight = 200;
      const maxHeight = Math.max(200, window.innerHeight * 0.4); // Max 40% of viewport height

      setPanelHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)));
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

  // Handle window resize to ensure panel height stays within bounds
  useEffect(() => {
    const handleWindowResize = () => {
      const maxAvailableHeight = Math.max(200, window.innerHeight * 0.4);
      if (panelHeight > maxAvailableHeight) {
        setPanelHeight(maxAvailableHeight);
      }
    };

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, [panelHeight]);

  const handleConfigChange = (config: any) => {
    if (selectedNode && onNodeConfigChange) {
      onNodeConfigChange(selectedNode.id, config);
    }
  };

  // Don't render anything if not visible
  if (!visible) {
    return null;
  }

  return (
    <div
      ref={resizeRef}
      className="border-t border-gray-200 bg-background transition-all duration-500 ease-out flex-shrink-0"
      style={{
        height: `${currentHeight}px`,
      }}
    >
      {/* Resize Handle - Only show when expanded */}
      {isExpanded && (
        <div
          className={`h-1 bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-all duration-200 ease-in-out cursor-ns-resize ${
            isResizing ? "bg-gray-400 cursor-grabbing" : ""
          }`}
          onMouseDown={handleResizeStart}
        >
          <div className="w-6 h-6 rounded-full bg-background border border-gray-300 flex items-center justify-center shadow-sm">
            <GripHorizontal
              className={`w-3 h-3 transition-colors duration-200 ${
                isResizing ? "text-gray-600" : "text-gray-500"
              }`}
            />
          </div>
        </div>
      )}

      {/* Panel Content */}
      <div className="h-full overflow-hidden">
        {effectiveView === "config" && selectedNode ? (
          <NodeConfigPanel
            selectedNode={selectedNode}
            onBack={handleBackToPalette}
            onConfigChange={handleConfigChange}
            readOnly={readOnly}
            workflowId={workflowId}
            workflow={workflow}
          />
        ) : effectiveView === "palette" ? (
          <NodePalette
            onNodeDragStart={onNodeDragStart}
            onClose={handleCollapse}
          />
        ) : (
          // Collapsed state - always show this when not expanded
          <div className="h-full flex items-center justify-center px-4">
            <div className="text-center">
              <p className="text-gray-500 text-sm">
                {`Select a node to check it's configuration`}
              </p>
              {!readOnly && (
                <Button
                  onClick={handleOpenPalette}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Open Palette
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
