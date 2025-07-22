import { FC, useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
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
}

const WorkflowNode: FC<{ data: any; selected?: boolean }> = ({
  data,
  selected,
}) => {
  return <NodeComponent data={data} selected={selected} />;
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
      onNodeSelect?.(node);
    },
    [onNodeSelect]
  );

  const handlePaneClick = useCallback(
    (event: any) => {
      onNodeSelect?.(null);
    },
    [onNodeSelect]
  );

  return (
    <div
      ref={(node) => {
        if (drop) drop(node);
      }}
      className={`relative w-full h-full transition-all duration-200 ${
        isOver ? "bg-blue-50 border-2 border-blue-300 border-dashed" : ""
      }`}
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
      >
        <Background />
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
}) => {
  const nodeTypes = useMemo(
    () => ({
      workflowNode: WorkflowNode,
    }),
    []
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
          />

          {debugMode && (
            <DebugOverlay
              nodes={nodes}
              edges={edges}
              mode={mode}
              selectedNode={selectedNode}
            />
          )}
        </ReactFlowProvider>
      )}
    </div>
  );
};
