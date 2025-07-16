import { FC, useMemo, useCallback, useState } from "react";
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
import { NodeType, NodeCategory, NodeGroup } from "@/services/WorkflowService";
import { useCanvasDrop } from "../hooks/useWorkflowDnD";

interface ReactFlowCanvasProps {
  nodes: RFNode[];
  edges: RFEdge[];
  mode: "view_only" | "edit";
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

const WorkflowNode = ({
  data,
  selected,
}: {
  data: any;
  selected?: boolean;
}) => {
  return <NodeComponent data={data} selected={selected} />;
};

const ReactFlowWrapper = ({
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
}: any) => {
  const { project } = useReactFlow();

  const handleNodeDrop = useCallback(
    (nodeInfo: any, dropPosition: { x: number; y: number }) => {
      if (onNodeDrop) {
        onNodeDrop(nodeInfo, dropPosition);
      }
    },
    [onNodeDrop]
  );

  const { isOver, drop } = useCanvasDrop(handleNodeDrop);

  const handleNodeClick = useCallback(
    (event: any, node: RFNode) => {
      if (mode === "edit" && onNodeSelect) {
        onNodeSelect(node);
      }
    },
    [mode, onNodeSelect]
  );

  const handlePaneClick = useCallback(
    (event: any) => {
      if (mode === "edit" && onNodeSelect) {
        onNodeSelect(null);
      }
    },
    [mode, onNodeSelect]
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
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

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
  // Memoize types to prevent unnecessary re-renders
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

  // Memoize ReactFlow props for performance
  const reactFlowProps = useMemo(
    () => ({
      nodes,
      edges,
      nodeTypes,
      edgeTypes,
      fitView: true,
      attributionPosition: "bottom-left" as const,
      nodesDraggable: mode === "edit",
      nodesConnectable: mode === "edit",
      elementsSelectable: mode === "edit",
      selectNodesOnDrag: mode === "edit",
      panOnDrag: true,
      zoomOnScroll: true,
      zoomOnPinch: true,
      onNodesChange,
      onEdgesChange,
      onConnect,
      onEdgeUpdate,
      onEdgeUpdateStart,
      onEdgeUpdateEnd,
      proOptions: { hideAttribution: true },
    }),
    [
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
    ]
  );

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {!isInitialized ? (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading workflow...</p>
          </div>
        </div>
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

          {/* Debug overlay for ReactFlow */}
          {debugMode && (
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
          )}
        </ReactFlowProvider>
      )}
    </div>
  );
};
