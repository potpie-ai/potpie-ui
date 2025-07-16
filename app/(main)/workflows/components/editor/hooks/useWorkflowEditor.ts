import { useState, useEffect, useCallback, useRef } from "react";
import { Workflow } from "@/services/WorkflowService";
import type {
  Node as RFNode,
  Edge as RFEdge,
  NodeChange,
  EdgeChange,
  Connection,
} from "reactflow";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  reconnectEdge,
} from "reactflow";
import {
  getLocalWorkflow,
  getLocalWorkflowInfo,
  saveLocalWorkflow,
  clearLocalWorkflow,
} from "../services/localStorageService";
import {
  generateNodes,
  generateEdges,
  createUpdatedWorkflow,
} from "../utils/workflowUtils";

interface UseWorkflowEditorProps {
  workflow: Workflow;
  mode: "view_only" | "edit";
  debugMode?: boolean;
  onSave?: (updatedWorkflow: Workflow) => void;
  onCancel?: () => void;
}

export const useWorkflowEditor = ({
  workflow,
  mode,
  debugMode = false,
  onSave,
  onCancel,
}: UseWorkflowEditorProps) => {
  const [localWorkflow, setLocalWorkflow] = useState<Workflow>(workflow);
  const [editingNodes, setEditingNodes] = useState<RFNode[]>([]);
  const [editingEdges, setEditingEdges] = useState<RFEdge[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalWorkflow, setOriginalWorkflow] = useState<Workflow>(workflow);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showLocalWorkflowBanner, setShowLocalWorkflowBanner] = useState(false);
  const [selectedNode, setSelectedNode] = useState<RFNode | null>(null);
  const [debugInfo, setDebugInfo] = useState({
    isInitialized: false,
    nodesCount: 0,
    edgesCount: 0,
    workflowId: "",
    hasLocalWorkflow: false,
    hasUnsavedChanges: false,
    mode,
    error: null as string | null,
  });

  // Get workflow ID (assuming it exists on the workflow object)
  const workflowId = workflow.id || "default";

  // Ref to prevent infinite loops in useEffect
  const isUpdatingRef = useRef(false);
  const currentWorkflowRef = useRef<Workflow>(workflow);

  // Check for local workflow on component mount
  useEffect(() => {
    try {
      const localWorkflowData = getLocalWorkflow(workflowId);
      const localWorkflowInfo = getLocalWorkflowInfo(workflowId);

      if (localWorkflowData && localWorkflowInfo) {
        // Show banner if there's a local copy with unsaved changes
        if (localWorkflowInfo.hasUnsavedChanges) {
          setShowLocalWorkflowBanner(true);
        }

        // Load local workflow if it exists
        setLocalWorkflow(localWorkflowData);
        currentWorkflowRef.current = localWorkflowData;
        setOriginalWorkflow(workflow); // Keep original for reset purposes
        setHasUnsavedChanges(localWorkflowInfo.hasUnsavedChanges);

        const nodes = generateNodes(localWorkflowData, debugMode);
        const edges = generateEdges(
          localWorkflowData,
          mode === "view_only",
          debugMode
        );
        setEditingNodes(nodes);
        setEditingEdges(edges);

        setDebugInfo((prev) => ({
          ...prev,
          isInitialized: true,
          nodesCount: nodes.length,
          edgesCount: edges.length,
          workflowId,
          hasLocalWorkflow: true,
          hasUnsavedChanges: localWorkflowInfo.hasUnsavedChanges,
          mode,
          error: null,
        }));
      } else {
        // No local copy, use the provided workflow
        setLocalWorkflow(workflow);
        currentWorkflowRef.current = workflow;
        setOriginalWorkflow(workflow);
        setHasUnsavedChanges(false);

        const nodes = generateNodes(workflow, debugMode);
        const edges = generateEdges(workflow, mode === "view_only", debugMode);
        setEditingNodes(nodes);
        setEditingEdges(edges);

        setDebugInfo((prev) => ({
          ...prev,
          isInitialized: true,
          nodesCount: nodes.length,
          edgesCount: edges.length,
          workflowId,
          hasLocalWorkflow: false,
          hasUnsavedChanges: false,
          mode,
          error: null,
        }));
      }

      setIsInitialized(true);
    } catch (error) {
      setDebugInfo((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }));
    }
  }, [workflow, workflowId, mode, debugMode]);

  // Save to local storage whenever workflow changes
  const updateLocalWorkflow = useCallback(
    (updatedWorkflow: Workflow, hasChanges: boolean = true) => {
      setLocalWorkflow(updatedWorkflow);
      currentWorkflowRef.current = updatedWorkflow;
      setHasUnsavedChanges(hasChanges);
      saveLocalWorkflow(workflowId, updatedWorkflow, hasChanges);
    },
    [workflowId]
  );

  // Update local workflow when nodes or edges change
  useEffect(() => {
    if (!isInitialized || isUpdatingRef.current) return;

    isUpdatingRef.current = true;

    const updatedWorkflow = createUpdatedWorkflow(
      currentWorkflowRef.current,
      editingNodes,
      editingEdges
    );

    // Only update if there are actual changes to prevent infinite loops
    const currentWorkflowString = JSON.stringify(
      currentWorkflowRef.current.graph
    );
    const newWorkflowString = JSON.stringify(updatedWorkflow.graph);

    if (currentWorkflowString !== newWorkflowString) {
      updateLocalWorkflow(updatedWorkflow, hasUnsavedChanges);
    }

    // Update debug info
    setDebugInfo((prev) => ({
      ...prev,
      nodesCount: editingNodes.length,
      edgesCount: editingEdges.length,
      hasUnsavedChanges,
    }));

    // Reset the flag after a short delay to allow state updates to complete
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  }, [
    editingNodes,
    editingEdges,
    isInitialized,
    updateLocalWorkflow,
    hasUnsavedChanges,
  ]);

  // Update edge properties when mode changes
  useEffect(() => {
    if (isInitialized) {
      setEditingEdges((prevEdges) =>
        prevEdges.map((edge) => ({
          ...edge,
          animated: mode !== "view_only",
          selectable: mode !== "view_only",
          deletable: mode !== "view_only",
          updatable: mode !== "view_only",
          reconnectable: mode !== "view_only",
          data: { ...edge.data, viewOnly: mode === "view_only" },
        }))
      );

      setDebugInfo((prev) => ({
        ...prev,
        mode,
      }));
    }
  }, [mode, isInitialized]);

  // Handle node changes
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (mode === "view_only") return;

      // Check if any of the changes involve removing the currently selected node
      const removedNodeIds = changes
        .filter((change) => change.type === "remove")
        .map((change) => change.id);

      // If the selected node is being removed, reset the selection
      if (selectedNode && removedNodeIds.includes(selectedNode.id)) {
        setSelectedNode(null);
      }

      setEditingNodes((nds) => applyNodeChanges(changes, nds));
      setHasUnsavedChanges(true);
    },
    [mode, selectedNode]
  );

  // Handle edge changes (selection, deletion, etc.)
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (mode === "view_only") return;

      setEditingEdges((eds) => applyEdgeChanges(changes, eds));
      setHasUnsavedChanges(true);
    },
    [mode]
  );

  // Handle new edge connections
  const onConnect = useCallback(
    (params: Connection) => {
      if (mode !== "edit" || !params.source || !params.target) return;

      // Prevent self-loops (connecting a node to itself)
      if (params.source === params.target) {
        console.warn("Cannot connect a node to itself");
        return;
      }

      // Prevent connecting source and target handles of the same node
      const sourceNodeId = params.source.split("-")[0];
      const targetNodeId = params.target.split("-")[0];

      if (sourceNodeId === targetNodeId) {
        console.warn(
          "Cannot connect source and target handles of the same node"
        );
        return;
      }

      const newEdge: RFEdge = {
        id: `e${params.source}-${params.target}`,
        source: params.source,
        target: params.target,
        type: "highlightable",
        animated: true,
        deletable: true,
        updatable: true,
        reconnectable: true,
        data: { viewOnly: false },
        style: { stroke: "#2563eb", strokeWidth: 2 },
        markerEnd: {
          type: "arrowclosed" as any,
          color: "#2563eb",
        },
      };

      setEditingEdges((eds) => addEdge(newEdge, eds));
      setHasUnsavedChanges(true);
    },
    [mode]
  );

  // Handle edge reconnection (dragging edge endpoints)
  const onEdgeUpdate = useCallback(
    (oldEdge: RFEdge, newConnection: Connection) => {
      if (mode !== "edit" || !newConnection.source || !newConnection.target)
        return;

      // Prevent self-loops (connecting a node to itself)
      if (newConnection.source === newConnection.target) {
        console.warn("Cannot connect a node to itself");
        return;
      }

      // Prevent connecting source and target handles of the same node
      const sourceNodeId = newConnection.source.split("-")[0];
      const targetNodeId = newConnection.target.split("-")[0];

      if (sourceNodeId === targetNodeId) {
        console.warn(
          "Cannot connect source and target handles of the same node"
        );
        return;
      }

      setEditingEdges((els) => reconnectEdge(oldEdge, newConnection, els));
      setHasUnsavedChanges(true);
    },
    [mode]
  );

  // Handle edge reconnection start
  const onEdgeUpdateStart = useCallback(() => {
    // Optional: Add visual feedback when edge reconnection starts
  }, []);

  // Handle edge reconnection end
  const onEdgeUpdateEnd = useCallback(
    (_: MouseEvent | TouchEvent, edge: RFEdge) => {
      // Optional: Add cleanup or validation when edge reconnection ends
    },
    []
  );

  // Handle node selection
  const onNodeSelect = useCallback((node: RFNode | null) => {
    setSelectedNode(node);
  }, []);

  // Handle node configuration changes
  const onNodeConfigChange = useCallback((nodeId: string, config: any) => {
    setEditingNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                data: config,
              },
            }
          : node
      )
    );
    setHasUnsavedChanges(true);
  }, []);

  // Handler to add a new node to the workflow (for drag-and-drop)
  const onNodeDrop = useCallback(
    (nodeInfo: any, dropPosition: { x: number; y: number }) => {
      // Generate a unique node ID
      const nodeId = `${nodeInfo.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Center the node on the cursor
      const nodeWidth = 256;
      const nodeHeight = 120;
      const position = {
        x: dropPosition.x - nodeWidth / 2,
        y: dropPosition.y - nodeHeight / 2,
      };

      // Add the new node to the workflow graph
      const updatedWorkflow = {
        ...localWorkflow,
        graph: {
          ...localWorkflow.graph,
          nodes: {
            ...localWorkflow.graph.nodes,
            [nodeId]: {
              id: nodeId,
              type: nodeInfo.type,
              category: nodeInfo.category,
              group: nodeInfo.group,
              position,
              data: nodeInfo.data || {},
            },
          },
          adjacency_list: {
            ...localWorkflow.graph.adjacency_list,
          },
        },
      };

      // Save to local state and trigger ReactFlow re-generation
      setLocalWorkflow(updatedWorkflow);
      currentWorkflowRef.current = updatedWorkflow;
      setHasUnsavedChanges(true);
      saveLocalWorkflow(workflowId, updatedWorkflow, true);

      // Regenerate nodes/edges for ReactFlow
      const nodes = generateNodes(updatedWorkflow, debugMode);
      const edges = generateEdges(
        updatedWorkflow,
        mode === "view_only",
        debugMode
      );
      setEditingNodes(nodes);
      setEditingEdges(edges);
    },
    [localWorkflow, debugMode, mode, workflowId]
  );

  // Save workflow with updated adjacency list
  const handleSave = useCallback(() => {
    if (!onSave) return;

    const updatedWorkflow = createUpdatedWorkflow(
      localWorkflow,
      editingNodes,
      editingEdges
    );

    onSave(updatedWorkflow);
    setOriginalWorkflow(updatedWorkflow);
    currentWorkflowRef.current = updatedWorkflow;

    // Clear local storage after successful save
    clearLocalWorkflow(workflowId);
    setHasUnsavedChanges(false);
    setShowLocalWorkflowBanner(false);
  }, [editingNodes, editingEdges, localWorkflow, onSave, workflowId]);

  // Cancel changes and revert to original
  const handleCancel = useCallback(() => {
    const nodes = generateNodes(originalWorkflow, debugMode);
    const edges = generateEdges(
      originalWorkflow,
      mode === "view_only",
      debugMode
    );
    setEditingNodes(nodes);
    setEditingEdges(edges);
    setLocalWorkflow(originalWorkflow);
    currentWorkflowRef.current = originalWorkflow;

    // Clear local storage
    clearLocalWorkflow(workflowId);
    setHasUnsavedChanges(false);
    setShowLocalWorkflowBanner(false);
    setSelectedNode(null);
    onCancel?.();
  }, [originalWorkflow, mode, onCancel, workflowId, debugMode]);

  // Load local workflow (for banner action)
  const handleLoadLocalWorkflow = useCallback(() => {
    const localWorkflowData = getLocalWorkflow(workflowId);
    if (localWorkflowData) {
      setLocalWorkflow(localWorkflowData);
      currentWorkflowRef.current = localWorkflowData;
      const nodes = generateNodes(localWorkflowData, debugMode);
      const edges = generateEdges(
        localWorkflowData,
        mode === "view_only",
        debugMode
      );
      setEditingNodes(nodes);
      setEditingEdges(edges);
      setHasUnsavedChanges(true);
    }
    setShowLocalWorkflowBanner(false);
  }, [workflowId, mode, debugMode]);

  // Discard local workflow (for banner action)
  const handleDiscardLocalWorkflow = useCallback(() => {
    clearLocalWorkflow(workflowId);
    setShowLocalWorkflowBanner(false);

    // Reset to original workflow
    const nodes = generateNodes(originalWorkflow, debugMode);
    const edges = generateEdges(
      originalWorkflow,
      mode === "view_only",
      debugMode
    );
    setEditingNodes(nodes);
    setEditingEdges(edges);
    setLocalWorkflow(originalWorkflow);
    currentWorkflowRef.current = originalWorkflow;
    setHasUnsavedChanges(false);
    setSelectedNode(null);
  }, [workflowId, originalWorkflow, mode, debugMode]);

  return {
    // State
    localWorkflow,
    editingNodes,
    editingEdges,
    hasUnsavedChanges,
    isInitialized,
    showLocalWorkflowBanner,
    selectedNode,
    debugInfo,

    // Handlers
    onNodesChange,
    onEdgesChange,
    onConnect,
    onEdgeUpdate,
    onEdgeUpdateStart,
    onEdgeUpdateEnd,
    onNodeSelect,
    onNodeConfigChange,
    onNodeDrop,
    handleSave,
    handleCancel,
    handleLoadLocalWorkflow,
    handleDiscardLocalWorkflow,
  };
};
