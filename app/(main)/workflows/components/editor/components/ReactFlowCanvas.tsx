import { FC, useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import type { Node as RFNode, Edge as RFEdge } from "reactflow";
import { NodeComponent } from "../nodes/node";
import { HighlightableEdge } from "./HighlightableEdge";
import { useCanvasDrop } from "../hooks/useWorkflowDnD";

interface ReactFlowCanvasProps {
  nodes: RFNode[];
  edges: RFEdge[];
  mode: "view_only" | "edit" | "preview";
  isInitialized: boolean;
  debugMode?: boolean;
  onNodesChange: (changes: any[]) => void;
  onEdgesChange: (changes: any[]) => void;
  onConnect: (params: any) => void;
  onEdgeUpdate: (oldEdge: RFEdge, newConnection: any) => void;
  onEdgeUpdateStart: () => void;
  onEdgeUpdateEnd: (event: MouseEvent | TouchEvent, edge: RFEdge) => void;
  onNodeDrop?: (nodeInfo: any, position: { x: number; y: number }) => void;
  selectedNode?: RFNode | null;
  onNodeSelect?: (node: RFNode | null) => void;
  onNodeDelete?: (nodeId: string) => void;
}

interface ReactFlowWrapperProps {
  nodes: RFNode[];
  edges: RFEdge[];
  nodeTypes: Record<string, any>;
  edgeTypes: Record<string, any>;
  mode: "view_only" | "edit" | "preview";
  onNodesChange: (changes: any[]) => void;
  onEdgesChange: (changes: any[]) => void;
  onConnect: (params: any) => void;
  onEdgeUpdate: (oldEdge: RFEdge, newConnection: any) => void;
  onEdgeUpdateStart: () => void;
  onEdgeUpdateEnd: (event: MouseEvent | TouchEvent, edge: RFEdge) => void;
  onNodeDrop?: (nodeInfo: any, position: { x: number; y: number }) => void;
  onNodeSelect?: (node: RFNode | null) => void;
  onNodeDelete?: (nodeId: string) => void;
}

const WorkflowNode: FC<{
  data: any;
  selected?: boolean;
  onDelete?: (nodeId: string) => void;
  mode?: "view_only" | "edit" | "preview";
}> = ({ data, selected, onDelete, mode }) => {
  return (
    <NodeComponent
      data={data}
      selected={selected}
      onDelete={onDelete}
      mode={mode}
    />
  );
};

const ReactFlowWrapper: FC<ReactFlowWrapperProps> = ({
  nodes,
  edges,
  nodeTypes,
  edgeTypes,
  mode,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onEdgeUpdate,
  onEdgeUpdateStart,
  onEdgeUpdateEnd,
  onNodeDrop,
  onNodeSelect,
  onNodeDelete,
}) => {
  const { project } = useReactFlow();

  const handleNodeDrop = useCallback(
    (
      nodeInfo: any,
      dropPosition: { x: number; y: number },
      cursorOffset?: { x: number; y: number }
    ) => {
      if (onNodeDrop && project) {
        let adjustedPosition = dropPosition;
        if (cursorOffset) {
          adjustedPosition = {
            x: dropPosition.x - cursorOffset.x,
            y: dropPosition.y - cursorOffset.y,
          };
        }
        const canvasPosition = project(adjustedPosition);
        onNodeDrop(nodeInfo, canvasPosition);
      }
    },
    [onNodeDrop, project]
  );

  const { isOver, drop } = useCanvasDrop(handleNodeDrop);

  const handleNodeClick = useCallback(
    (event: any, node: RFNode) => {
      // Don't prevent default - let ReactFlow handle the selection
      if (onNodeSelect) {
        onNodeSelect(node);
      }
    },
    [onNodeSelect]
  );

  const handlePaneClick = useCallback(
    (event: any) => {
      // Don't prevent default - let ReactFlow handle the deselection
      if (onNodeSelect) {
        onNodeSelect(null);
      }
    },
    [onNodeSelect]
  );

  // Add keyboard event handler to ensure delete events are captured
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // If delete key is pressed and we're in edit mode
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        mode === "edit"
      ) {
        // Manual fallback: if ReactFlow's delete isn't working, manually trigger it
        const selectedNodes = nodes.filter((node) => node.selected);
        if (selectedNodes.length > 0) {
          const deleteChanges = selectedNodes.map((node) => ({
            type: "remove" as const,
            id: node.id,
          }));
          onNodesChange(deleteChanges);
        }
      }
    },
    [mode, nodes, onNodesChange]
  );

  return (
    <div
      ref={(node) => {
        if (drop) drop(node);
      }}
      className={`relative w-full h-full transition-all duration-200 ${
        isOver ? "bg-blue-50 border-2 border-blue-300 border-dashed" : ""
      }`}
      onKeyDown={handleKeyDown}
      tabIndex={0} // Make the container focusable
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeUpdate={onEdgeUpdate}
        onEdgeUpdateStart={onEdgeUpdateStart}
        onEdgeUpdateEnd={onEdgeUpdateEnd}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onKeyDown={handleKeyDown}
        fitView={true}
        fitViewOptions={{ padding: 0.1, maxZoom: 0.7 }}
        attributionPosition="bottom-left"
        nodesDraggable={mode === "edit"}
        nodesConnectable={mode === "edit"}
        elementsSelectable={mode === "edit"}
        selectNodesOnDrag={mode === "edit"}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        proOptions={{ hideAttribution: true }}
        multiSelectionKeyCode="Shift"
        deleteKeyCode="Backspace"
        selectionKeyCode="Shift"
        snapToGrid={false}
        snapGrid={[15, 15]}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.1}
        maxZoom={1.5}
      >
        <Background variant={BackgroundVariant.Cross} size={5} gap={40} />
        <Controls className="z-20" />
        {mode !== "preview" && <MiniMap className="z-20" />}
      </ReactFlow>
    </div>
  );
};

const LoadingSpinner: FC = () => (
  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
      <p className="text-gray-600">Loading workflow...</p>
    </div>
  </div>
);

const DebugOverlay: FC<{
  nodes: RFNode[];
  edges: RFEdge[];
  mode: string;
  selectedNode?: RFNode | null;
}> = ({ nodes, edges, mode, selectedNode }) => (
  <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white p-2 rounded text-xs font-mono z-20">
    <div>ReactFlow Debug:</div>
    <div>Nodes: {nodes.length}</div>
    <div>Edges: {edges.length}</div>
    <div>Mode: {mode}</div>
    <div>Selected Node: {selectedNode?.id || "None"}</div>
    {nodes.length === 0 && (
      <div className="text-yellow-400">⚠️ No nodes to display</div>
    )}
    {edges.length === 0 && nodes.length > 1 && (
      <div className="text-yellow-400">⚠️ No edges to display</div>
    )}
  </div>
);

export const ReactFlowCanvas: FC<ReactFlowCanvasProps> = ({
  nodes,
  edges,
  mode,
  isInitialized,
  debugMode = false,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onEdgeUpdate,
  onEdgeUpdateStart,
  onEdgeUpdateEnd,
  onNodeDrop,
  selectedNode,
  onNodeSelect,
  onNodeDelete,
}) => {
  const nodeTypes = useMemo(
    () => ({
      workflowNode: (props: any) => (
        <WorkflowNode {...props} onDelete={onNodeDelete} mode={mode} />
      ),
    }),
    [onNodeDelete, mode]
  );

  const edgeTypes = useMemo(
    () => ({
      highlightable: HighlightableEdge,
    }),
    []
  );

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {!isInitialized ? (
        <LoadingSpinner />
      ) : (
        <ReactFlowProvider>
          <ReactFlowWrapper
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            mode={mode}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeUpdate={onEdgeUpdate}
            onEdgeUpdateStart={onEdgeUpdateStart}
            onEdgeUpdateEnd={onEdgeUpdateEnd}
            onNodeDrop={onNodeDrop}
            onNodeSelect={onNodeSelect}
            onNodeDelete={onNodeDelete}
          />
        </ReactFlowProvider>
      )}
      {debugMode && (
        <DebugOverlay
          nodes={nodes}
          edges={edges}
          mode={mode}
          selectedNode={selectedNode}
        />
      )}
    </div>
  );
};
