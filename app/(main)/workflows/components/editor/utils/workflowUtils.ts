import { Workflow, Node as WorkflowNodeType } from "@/services/WorkflowService";
import type { Node as RFNode, Edge as RFEdge } from "reactflow";
import { MarkerType } from "reactflow";

export const generateNodes = (
  workflow: Workflow,
  debugMode: boolean = false
): RFNode[] => {
  const nodes: RFNode[] = [];

  if (!workflow.graph || !workflow.graph.nodes) {
    if (debugMode) {
      console.warn("Workflow graph or nodes is undefined:", workflow);
    }
    return nodes;
  }

  for (const node of Object.values(workflow.graph.nodes)) {
    if (!node.position) {
      if (debugMode) {
        console.warn("Node missing position:", node);
      }
      // Add default position if missing
      node.position = { x: Math.random() * 400, y: Math.random() * 300 };
    }

    nodes.push({
      type: "workflowNode",
      id: node.id,
      position: node.position,
      data: node,
      draggable: true,
      selectable: true,
    });
  }

  if (debugMode) {
    console.log("Generated nodes:", nodes.length, nodes);
  }
  return nodes;
};

export const generateEdges = (
  workflow: Workflow,
  isViewOnly: boolean = false,
  debugMode: boolean = false
): RFEdge[] => {
  const edges: RFEdge[] = [];

  if (
    !workflow.graph ||
    !workflow.graph.nodes ||
    !workflow.graph.adjacency_list
  ) {
    if (debugMode) {
      console.warn(
        "Workflow graph, nodes, or adjacency_list is undefined:",
        workflow
      );
    }
    return edges;
  }

  const nodeIds = Object.keys(workflow.graph.nodes);

  for (const nodeId of nodeIds) {
    if (workflow.graph.adjacency_list[nodeId]) {
      for (const targetNodeId of workflow.graph.adjacency_list[nodeId]) {
        edges.push({
          id: `e${nodeId}-${targetNodeId}`,
          source: nodeId,
          target: targetNodeId,
          type: "highlightable",
          animated: !isViewOnly,
          deletable: !isViewOnly,
          updatable: !isViewOnly,
          reconnectable: !isViewOnly,
          data: { viewOnly: isViewOnly },
          style: { stroke: "#2563eb", strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#2563eb",
          },
        });
      }
    }
  }

  if (debugMode) {
    console.log("Generated edges:", edges.length, edges);
  }
  return edges;
};

// Helper function to convert edges back to adjacency list
export const edgesToAdjacencyList = (
  edges: RFEdge[]
): { [key: string]: string[] } => {
  const adjacencyList: { [key: string]: string[] } = {};

  edges.forEach((edge) => {
    if (!adjacencyList[edge.source]) {
      adjacencyList[edge.source] = [];
    }
    if (!adjacencyList[edge.source].includes(edge.target)) {
      adjacencyList[edge.source].push(edge.target);
    }
  });

  return adjacencyList;
};

// Helper function to convert ReactFlow nodes back to workflow nodes
export const nodesToWorkflowNodes = (
  nodes: RFNode[]
): { [key: string]: any } => {
  return nodes.reduce(
    (acc, node) => {
      acc[node.id] = {
        id: node.id,
        type: node.data?.type || "default",
        group: node.data?.group || "default",
        category: node.data?.category, // Preserve category for rendering
        position: node.position,
        data: node.data?.data || node.data, // Only the payload, not the whole node
      };
      return acc;
    },
    {} as { [key: string]: any }
  );
};

// Helper function to create updated workflow from nodes and edges
export const createUpdatedWorkflow = (
  originalWorkflow: Workflow,
  nodes: RFNode[],
  edges: RFEdge[]
): Workflow => {
  return {
    ...originalWorkflow,
    graph: {
      nodes: nodesToWorkflowNodes(nodes),
      adjacency_list: edgesToAdjacencyList(edges),
    },
  };
};
