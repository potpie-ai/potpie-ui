import { Workflow, WorkflowNode } from "@/services/WorkflowService";
import type { Node as RFNode, Edge as RFEdge } from "reactflow";
import { MarkerType } from "reactflow";
import type { NodeType, NodeGroup } from "@/services/WorkflowService";

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

  console.log("=== GENERATE EDGES DEBUG ===");
  console.log("generateEdges called with workflow:", workflow);
  console.log("Workflow graph:", workflow.graph);
  console.log("Workflow nodes:", workflow.graph?.nodes);
  console.log("Workflow adjacency_list:", workflow.graph?.adjacency_list);
  console.log(
    "Workflow adjacency_list type:",
    typeof workflow.graph?.adjacency_list
  );

  if (
    !workflow.graph ||
    !workflow.graph.nodes ||
    !workflow.graph.adjacency_list
  ) {
    console.warn(
      "Workflow graph, nodes, or adjacency_list is undefined:",
      workflow
    );
    console.log("=== END GENERATE EDGES DEBUG ===");
    return edges;
  }

  const nodeIds = Object.keys(workflow.graph.nodes);

  console.log("Node IDs:", nodeIds);
  console.log(
    "Adjacency list keys:",
    Object.keys(workflow.graph.adjacency_list)
  );

  for (const nodeId of nodeIds) {
    if (workflow.graph.adjacency_list[nodeId]) {
      console.log(
        `Processing node ${nodeId}, targets:`,
        workflow.graph.adjacency_list[nodeId]
      );
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

  console.log("Generated edges:", edges.length, edges);
  console.log("=== END GENERATE EDGES DEBUG ===");
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

// Helper: runtime type guard for NodeType
const validNodeTypes: Set<string> = new Set([
  "trigger_github_pr_opened",
  "trigger_github_pr_closed",
  "trigger_github_pr_reopened",
  "trigger_github_pr_merged",
  "trigger_github_issue_opened",
  "trigger_linear_issue_created",
  "custom_agent",
  "flow_control_conditional",
  "flow_control_collect",
  "flow_control_selector",
  "manual_step_approval",
  "manual_step_input",
]);
function isValidNodeType(type: any): type is NodeType {
  return typeof type === "string" && validNodeTypes.has(type);
}

// Helper function to convert ReactFlow nodes back to workflow nodes
export const nodesToWorkflowNodes = (
  nodes: RFNode[]
): { [key: string]: any } => {
  return nodes.reduce(
    (acc, node) => {
      const type = node.data?.type;
      const group = node.data?.group;
      if (!isValidNodeType(type)) {
        console.error(
          `Invalid or missing node type for node ${node.id}:`,
          type
        );
        throw new Error(
          `Invalid or missing node type for node ${node.id}: ${type}`
        );
      }
      acc[node.id] = {
        id: node.id,
        type: type as NodeType,
        group: group as NodeGroup,
        category: node.data?.category, // Preserve category for rendering
        position: node.position,
        data: node.data?.data || {}, // Extract the configuration data
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
      id: originalWorkflow.graph.id,
      workflow_id: originalWorkflow.graph.workflow_id,
      created_at: originalWorkflow.graph.created_at,
      updated_at: new Date().toISOString(), // update timestamp
      nodes: nodesToWorkflowNodes(nodes),
      adjacency_list: edgesToAdjacencyList(edges),
    },
  };
};
