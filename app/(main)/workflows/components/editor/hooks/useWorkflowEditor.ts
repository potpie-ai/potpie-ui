import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Workflow, WorkflowResponse } from "@/services/WorkflowService";
import WorkflowService from "@/services/WorkflowService";
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
import { parseApiError } from "@/lib/utils";
import { toast } from "sonner";

interface UseWorkflowEditorProps {
  workflow: Workflow;
  mode: "view_only" | "edit" | "preview";
  debugMode?: boolean;
  onSave?: (
    updatedWorkflow: Workflow,
    isNewWorkflow: boolean,
    validation?: any
  ) => void;
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
  const [isLoading, setIsLoading] = useState(false);
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

  // Always use the latest localWorkflow.id for workflowId
  // For new workflows, use a unique identifier to avoid conflicts
  // Use a stable ID that doesn't change when switching modes
  const stableWorkflowId = useMemo(() => {
    const baseId =
      workflow.id && workflow.id !== "" && workflow.id !== "default"
        ? workflow.id
        : `new-workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return baseId;
  }, [workflow.id]);

  const workflowId = stableWorkflowId;

  // Ref to prevent infinite loops in useEffect
  const isUpdatingRef = useRef(false);
  const currentWorkflowRef = useRef<Workflow>(workflow);

  // Utility function to convert adjacency_list from different formats to adjacency list
  const convertEdgesToAdjacencyList = useCallback(
    (workflow: any, debugMode: boolean = false) => {
      console.log("=== CONVERT EDGES TO ADJACENCY LIST DEBUG ===");
      console.log("Input workflow:", workflow);
      console.log("Workflow.graph:", workflow.graph);
      console.log(
        "Workflow.graph.adjacency_list:",
        workflow.graph?.adjacency_list
      );
      console.log(
        "Adjacency list keys:",
        Object.keys(workflow.graph?.adjacency_list || {})
      );

      // If the workflow has nodes but no adjacency_list, try to convert them
      if (
        workflow.graph &&
        workflow.graph.nodes &&
        (!workflow.graph.adjacency_list ||
          Object.keys(workflow.graph.adjacency_list).length === 0)
      ) {
        console.log(
          "Workflow has no adjacency_list, checking for adjacency_list in different format"
        );
        console.log("Full workflow object:", workflow);

        // Try to find adjacency_list in the workflow object
        const edges =
          (workflow as any).edges ||
          (workflow as any).adjacency_list ||
          (workflow.graph as any).edges ||
          (workflow.graph as any).adjacency_list;

        console.log("Found edges/adjacency_list:", edges);
        console.log("Edges type:", typeof edges);
        console.log("Is array:", Array.isArray(edges));

        if (edges && Array.isArray(edges)) {
          console.log("Found edges array:", edges);

          // Convert edges array to adjacency list
          const adjacencyList: { [key: string]: string[] } = {};
          edges.forEach((edge: any) => {
            const source = edge.source || edge.from;
            const target = edge.target || edge.to;
            console.log(
              "Processing edge:",
              edge,
              "source:",
              source,
              "target:",
              target
            );
            if (source && target) {
              if (!adjacencyList[source]) {
                adjacencyList[source] = [];
              }
              if (!adjacencyList[source].includes(target)) {
                adjacencyList[source].push(target);
              }
            }
          });

          const processedWorkflow = {
            ...workflow,
            graph: {
              ...workflow.graph,
              adjacency_list: adjacencyList,
            },
          };

          console.log("Converted edges to adjacency list:", adjacencyList);
          console.log("Processed workflow:", processedWorkflow);
          console.log("=== END CONVERT EDGES TO ADJACENCY LIST DEBUG ===");
          return processedWorkflow;
        } else if (
          edges &&
          typeof edges === "object" &&
          !Array.isArray(edges)
        ) {
          console.log(
            "Found edges object (already adjacency list format):",
            edges
          );
          const processedWorkflow = {
            ...workflow,
            graph: {
              ...workflow.graph,
              adjacency_list: edges,
            },
          };
          console.log("=== END CONVERT EDGES TO ADJACENCY LIST DEBUG ===");
          return processedWorkflow;
        }
      } else {
        console.log("Workflow already has adjacency_list or no nodes");
      }

      console.log("=== END CONVERT EDGES TO ADJACENCY LIST DEBUG ===");
      return workflow;
    },
    []
  );

  // Check for local workflow on component mount or when workflow prop changes
  useEffect(() => {
    try {
      const localWorkflowData = getLocalWorkflow(workflowId);
      const localWorkflowInfo = getLocalWorkflowInfo(workflowId);
      const isNewWorkflow =
        !workflow.id ||
        workflow.id === "" ||
        workflow.id === "default" ||
        workflowId.startsWith("new-workflow-");

      // Handle non-edit modes (view_only and preview)
      if (mode === "view_only" || mode === "preview") {
        setLocalWorkflow(workflow);
        currentWorkflowRef.current = workflow;
        setOriginalWorkflow(workflow);
        setHasUnsavedChanges(false);
        setShowLocalWorkflowBanner(false);

        const nodes = generateNodes(workflow, debugMode);
        const edges = generateEdges(workflow, true, debugMode);
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
        setIsInitialized(true);
        return;
      }

      // In edit mode, check for local copy
      if (localWorkflowData) {
        // Load local workflow if it exists
        setLocalWorkflow(localWorkflowData);
        currentWorkflowRef.current = localWorkflowData;
        // Only set original workflow if we don't have one yet or if this is a different workflow
        if (!originalWorkflow.id || originalWorkflow.id !== workflow.id) {
          setOriginalWorkflow(workflow); // Keep original for reset purposes
        }
        setHasUnsavedChanges(localWorkflowInfo?.hasUnsavedChanges || false);
        setShowLocalWorkflowBanner(
          localWorkflowInfo?.hasUnsavedChanges || false
        );

        const nodes = generateNodes(localWorkflowData, debugMode);
        const edges = generateEdges(
          localWorkflowData,
          (mode as "view_only" | "edit" | "preview") === "view_only" ||
            (mode as "view_only" | "edit" | "preview") === "preview",
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
          hasUnsavedChanges: localWorkflowInfo?.hasUnsavedChanges || false,
          mode,
          error: null,
        }));
      } else {
        // No local copy, use the provided workflow
        setLocalWorkflow(workflow);
        currentWorkflowRef.current = workflow;
        // Only set original workflow if we don't have one yet or if this is a different workflow
        if (!originalWorkflow.id || originalWorkflow.id !== workflow.id) {
          setOriginalWorkflow(workflow);
        }
        setHasUnsavedChanges(false);

        const nodes = generateNodes(workflow, debugMode);
        const edges = generateEdges(
          workflow,
          (mode as "view_only" | "edit" | "preview") === "view_only",
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
  }, [workflow, mode, debugMode]);

  // Update banner visibility when mode changes
  useEffect(() => {
    // In view mode, always use saved copy and hide banner
    if (mode !== "edit") {
      setShowLocalWorkflowBanner(false);
      setIsLoading(false);
      // Reload the saved copy from the server
      setLocalWorkflow(workflow);
      currentWorkflowRef.current = workflow;
      // Only set original workflow if we don't have one yet or if this is a different workflow
      if (!originalWorkflow.id || originalWorkflow.id !== workflow.id) {
        setOriginalWorkflow(workflow);
      }
      setHasUnsavedChanges(false);

      const nodes = generateNodes(workflow, debugMode);
      const edges = generateEdges(workflow, true, debugMode);
      setEditingNodes(nodes);
      setEditingEdges(edges);
      return;
    }

    // In edit mode, show loading and fetch latest from API
    const handleEditModeSwitch = async () => {
      setIsLoading(true);

      try {
        // Check for local copy first
        const localWorkflowData = getLocalWorkflow(workflowId);
        const localWorkflowInfo = getLocalWorkflowInfo(workflowId);

        // Fetch latest workflow from API if we have a valid ID
        let latestWorkflow = workflow;
        if (workflowId && !workflowId.startsWith("new-workflow-")) {
          try {
            const apiWorkflow =
              await WorkflowService.getWorkflowById(workflowId);
            if (apiWorkflow) {
              latestWorkflow = apiWorkflow;
              // Update the original workflow with the latest from API
              setOriginalWorkflow(latestWorkflow);
            }
          } catch (error) {
            console.error("Failed to fetch latest workflow from API:", error);
            // Continue with the current workflow if API call fails
          }
        }

        if (localWorkflowData) {
          // Load local copy if it exists
          setLocalWorkflow(localWorkflowData);
          currentWorkflowRef.current = localWorkflowData;
          setHasUnsavedChanges(localWorkflowInfo?.hasUnsavedChanges || false);
          setShowLocalWorkflowBanner(
            localWorkflowInfo?.hasUnsavedChanges || false
          );

          const nodes = generateNodes(localWorkflowData, debugMode);
          const edges = generateEdges(localWorkflowData, false, debugMode);
          setEditingNodes(nodes);
          setEditingEdges(edges);
        } else {
          // No local copy, create one from the latest workflow
          setLocalWorkflow(latestWorkflow);
          currentWorkflowRef.current = latestWorkflow;
          setHasUnsavedChanges(false);
          setShowLocalWorkflowBanner(false);

          const nodes = generateNodes(latestWorkflow, debugMode);
          const edges = generateEdges(latestWorkflow, false, debugMode);
          setEditingNodes(nodes);
          setEditingEdges(edges);
        }
      } catch (error) {
        console.error("Error switching to edit mode:", error);
        // Fallback to current workflow on error
        setLocalWorkflow(workflow);
        currentWorkflowRef.current = workflow;
        setHasUnsavedChanges(false);
        setShowLocalWorkflowBanner(false);

        const nodes = generateNodes(workflow, debugMode);
        const edges = generateEdges(workflow, false, debugMode);
        setEditingNodes(nodes);
        setEditingEdges(edges);
      } finally {
        setIsLoading(false);
      }
    };

    handleEditModeSwitch();
  }, [mode, workflowId, workflow, debugMode]);

  // Save to local storage whenever workflow changes
  const updateLocalWorkflow = useCallback(
    (updatedWorkflow: Workflow, hasChanges: boolean = true) => {
      setLocalWorkflow(updatedWorkflow);
      currentWorkflowRef.current = updatedWorkflow;
      setHasUnsavedChanges(hasChanges);
      // Only save to localStorage when in edit mode
      if (mode === "edit") {
        saveLocalWorkflow(workflowId, updatedWorkflow, hasChanges);
      }
    },
    [workflowId, mode]
  );

  // Update local workflow when nodes or edges change
  useEffect(() => {
    if (!isInitialized || isUpdatingRef.current || mode !== "edit") return;

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
    mode,
  ]);

  // Update edge properties when mode changes
  useEffect(() => {
    if (isInitialized) {
      setEditingEdges((prevEdges) =>
        prevEdges.map((edge) => ({
          ...edge,
          animated: mode !== "view_only" && mode !== "preview",
          selectable: mode !== "view_only" && mode !== "preview",
          deletable: mode !== "view_only" && mode !== "preview",
          updatable: mode !== "view_only" && mode !== "preview",
          reconnectable: mode !== "view_only" && mode !== "preview",
          data: {
            ...edge.data,
            viewOnly: mode === "view_only" || mode === "preview",
          },
        }))
      );

      setDebugInfo((prev) => ({
        ...prev,
        mode,
      }));
    }
  }, [mode, isInitialized]);

  // Handle node selection
  const onNodeSelect = useCallback((node: RFNode | null) => {
    setSelectedNode(node);
  }, []);

  // Handle node changes
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (mode === "view_only" || mode === "preview") return;

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

      // Update the local workflow when nodes are deleted
      if (removedNodeIds.length > 0) {
        setLocalWorkflow((prevWorkflow) => {
          const updatedNodes = { ...prevWorkflow.graph.nodes };
          const updatedAdjacencyList = { ...prevWorkflow.graph.adjacency_list };

          // Remove deleted nodes from the workflow
          removedNodeIds.forEach((nodeId) => {
            delete updatedNodes[nodeId];
            delete updatedAdjacencyList[nodeId];
          });

          // Remove edges that reference deleted nodes
          Object.keys(updatedAdjacencyList).forEach((sourceId) => {
            updatedAdjacencyList[sourceId] = updatedAdjacencyList[
              sourceId
            ].filter((targetId) => !removedNodeIds.includes(targetId));
          });

          const updatedWorkflow = {
            ...prevWorkflow,
            graph: {
              ...prevWorkflow.graph,
              nodes: updatedNodes,
              adjacency_list: updatedAdjacencyList,
            },
          };

          // Save to localStorage
          saveLocalWorkflow(workflowId, updatedWorkflow, true);
          currentWorkflowRef.current = updatedWorkflow;

          return updatedWorkflow;
        });
      }
    },
    [mode, selectedNode, workflowId]
  );

  // Handle edge changes (selection, deletion, etc.)
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (mode === "view_only" || mode === "preview") return;

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

  // Handle node configuration changes
  const onNodeConfigChange = useCallback(
    (nodeId: string, config: any) => {
      // Set the updating flag to prevent the useEffect from interfering
      isUpdatingRef.current = true;

      // Update the editing nodes
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

      // Update the selected node if it's the one being configured
      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode({
          ...selectedNode,
          data: {
            ...selectedNode.data,
            data: config,
          },
        });
      }

      // Update the local workflow to persist the configuration
      setLocalWorkflow((prevWorkflow) => {
        const updatedWorkflow = {
          ...prevWorkflow,
          graph: {
            ...prevWorkflow.graph,
            nodes: {
              ...prevWorkflow.graph.nodes,
              [nodeId]: {
                ...prevWorkflow.graph.nodes[nodeId],
                data: config,
              },
            },
          },
        };

        // Save to localStorage
        saveLocalWorkflow(workflowId, updatedWorkflow, true);
        currentWorkflowRef.current = updatedWorkflow;

        return updatedWorkflow;
      });

      setHasUnsavedChanges(true);

      // Reset the updating flag after a short delay
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    },
    [workflowId, selectedNode]
  );

  // Handler to add a new node to the workflow (for drag-and-drop)
  const onNodeDrop = useCallback(
    (
      nodeInfo: any,
      dropPosition: { x: number; y: number },
      cursorOffset?: { x: number; y: number }
    ) => {
      // Generate a unique node ID
      const nodeId = `${nodeInfo.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Always center the node at the drop position
      const nodeWidth = 256;
      const nodeHeight = 120;
      const position = {
        x: dropPosition.x - nodeWidth / 2 - 100, // nudged 100px to the left
        y: dropPosition.y - nodeHeight / 2 - 300, // nudged -300px higher (lower)
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
        mode === "view_only" || mode === "preview",
        debugMode
      );
      setEditingNodes(nodes);
      setEditingEdges(edges);
    },
    [localWorkflow, debugMode, mode, workflowId]
  );

  // Add a handler for title change
  const onTitleChange = useCallback(
    (newTitle: string) => {
      const updatedWorkflow = { ...localWorkflow, title: newTitle };
      updateLocalWorkflow(updatedWorkflow, true);
    },
    [localWorkflow, updateLocalWorkflow]
  );

  // Helper: Create workflow and sync local state
  async function createAndSyncWorkflow(
    payload: any,
    onSave: (wf: Workflow, isNewWorkflow: boolean, validation?: any) => void,
    setOriginalWorkflow: any,
    setLocalWorkflow: any,
    currentWorkflowRef: any,
    clearLocalWorkflow: any,
    setHasUnsavedChanges: any,
    setShowLocalWorkflowBanner: any,
    debugMode: boolean = false,
    convertEdgesToAdjacencyList: any
  ) {
    try {
      const response = await WorkflowService.createWorkflow(payload);
      const savedWorkflow = response.workflow;

      if (savedWorkflow && savedWorkflow.id) {
        // Debug logging to understand the API response
        if (debugMode) {
          console.log("API response from createWorkflow:", response);
          console.log("Saved workflow graph:", savedWorkflow.graph);
          console.log(
            "Saved workflow adjacency_list:",
            savedWorkflow.graph?.adjacency_list
          );
          console.log("Validation:", response.validation);
        }

        const safeWorkflow = {
          ...savedWorkflow,
          title: savedWorkflow.title || "",
          id: savedWorkflow.id,
          graph: savedWorkflow.graph || { nodes: {}, adjacency_list: {} },
        };

        if (debugMode) {
          console.log("Safe workflow after fallback:", safeWorkflow);
          console.log(
            "Safe workflow adjacency_list:",
            safeWorkflow.graph.adjacency_list
          );
        }

        // Check if the workflow has adjacency_list in a different format and convert them
        const processedWorkflow = convertEdgesToAdjacencyList(
          safeWorkflow,
          debugMode
        );

        // Fallback: If the processed workflow still doesn't have adjacency_list, use the original
        let finalWorkflow = processedWorkflow;
        if (
          !processedWorkflow.graph?.adjacency_list ||
          Object.keys(processedWorkflow.graph.adjacency_list).length === 0
        ) {
          console.log(
            "WARNING: Processed workflow has no adjacency_list, using original workflow"
          );
          console.log(
            "Original workflow adjacency_list:",
            originalWorkflow.graph?.adjacency_list
          );
          finalWorkflow = {
            ...processedWorkflow,
            graph: {
              ...processedWorkflow.graph,
              adjacency_list: originalWorkflow.graph?.adjacency_list || {},
            },
          };
        }

        setOriginalWorkflow(finalWorkflow);
        setLocalWorkflow(finalWorkflow);
        currentWorkflowRef.current = finalWorkflow;
        onSave(finalWorkflow, true, response.validation);
        clearLocalWorkflow(finalWorkflow.id);
        setHasUnsavedChanges(false);
        setShowLocalWorkflowBanner(false);
      }
    } catch (error) {
      console.error("Error creating workflow:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  // Helper: Update workflow and sync local state
  async function updateAndSyncWorkflow(
    id: string,
    payload: any,
    onSave: (wf: Workflow, isNewWorkflow: boolean, validation?: any) => void,
    setOriginalWorkflow: any,
    setLocalWorkflow: any,
    currentWorkflowRef: any,
    clearLocalWorkflow: any,
    setHasUnsavedChanges: any,
    setShowLocalWorkflowBanner: any,
    debugMode: boolean = false,
    convertEdgesToAdjacencyList: any
  ) {
    try {
      const response = await WorkflowService.updateWorkflow(id, payload);
      const savedWorkflow = response.workflow;

      if (savedWorkflow) {
        // Debug logging to understand the API response
        if (debugMode) {
          console.log("API response from updateWorkflow:", response);
          console.log("Saved workflow graph:", savedWorkflow.graph);
          console.log(
            "Saved workflow adjacency_list:",
            savedWorkflow.graph?.adjacency_list
          );
          console.log("Validation:", response.validation);
        }

        const safeWorkflow = {
          ...savedWorkflow,
          title: savedWorkflow.title || "",
          id: savedWorkflow.id,
          graph: savedWorkflow.graph || { nodes: {}, adjacency_list: {} },
        };

        if (debugMode) {
          console.log("Safe workflow after fallback:", safeWorkflow);
          console.log(
            "Safe workflow adjacency_list:",
            safeWorkflow.graph.adjacency_list
          );
        }

        // Check if the workflow has adjacency_list in a different format and convert them
        const processedWorkflow = convertEdgesToAdjacencyList(
          safeWorkflow,
          debugMode
        );

        // Fallback: If the processed workflow still doesn't have adjacency_list, use the original
        let finalWorkflow = processedWorkflow;
        if (
          !processedWorkflow.graph?.adjacency_list ||
          Object.keys(processedWorkflow.graph.adjacency_list).length === 0
        ) {
          console.log(
            "WARNING: Processed workflow has no adjacency_list, using original workflow"
          );
          console.log(
            "Original workflow adjacency_list:",
            originalWorkflow.graph?.adjacency_list
          );
          finalWorkflow = {
            ...processedWorkflow,
            graph: {
              ...processedWorkflow.graph,
              adjacency_list: originalWorkflow.graph?.adjacency_list || {},
            },
          };
        }

        setOriginalWorkflow(finalWorkflow);
        setLocalWorkflow(finalWorkflow);
        currentWorkflowRef.current = finalWorkflow;
        onSave(finalWorkflow, false, response.validation);
        clearLocalWorkflow(finalWorkflow.id);
        setHasUnsavedChanges(false);
        setShowLocalWorkflowBanner(false);
      }
    } catch (error) {
      console.error("Error updating workflow:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  // Save workflow with updated adjacency list
  const handleSave = useCallback(async () => {
    if (!onSave) return;

    const updatedWorkflow = createUpdatedWorkflow(
      localWorkflow,
      editingNodes,
      editingEdges
    );

    // Prepare payload for API
    const payload = {
      title: updatedWorkflow.title,
      description: updatedWorkflow.description,
      nodes: updatedWorkflow.graph.nodes,
      adjacency_list: updatedWorkflow.graph.adjacency_list,
      variables: updatedWorkflow.variables,
    };

    if (debugMode) {
      console.log("Saving workflow with payload:", payload);
      console.log("Editing edges:", editingEdges);
      console.log(
        "Adjacency list being sent:",
        updatedWorkflow.graph.adjacency_list
      );
    }

    try {
      if (!localWorkflow.id || localWorkflow.id === "") {
        // Create new workflow, then sync local state with backend id
        await createAndSyncWorkflow(
          payload,
          onSave,
          setOriginalWorkflow,
          setLocalWorkflow,
          currentWorkflowRef,
          clearLocalWorkflow,
          setHasUnsavedChanges,
          setShowLocalWorkflowBanner,
          debugMode,
          convertEdgesToAdjacencyList
        );
      } else {
        // Update existing workflow
        await updateAndSyncWorkflow(
          localWorkflow.id,
          payload,
          onSave,
          setOriginalWorkflow,
          setLocalWorkflow,
          currentWorkflowRef,
          clearLocalWorkflow,
          setHasUnsavedChanges,
          setShowLocalWorkflowBanner,
          debugMode,
          convertEdgesToAdjacencyList
        );
      }
    } catch (error) {
      console.error("Error saving workflow:", error);
      const errorMessage = parseApiError(error);
      console.log("Showing toast notification for error:", errorMessage);

      // Show a more user-friendly error message
      let userFriendlyMessage = "Save failed";
      if (errorMessage.includes("Validation errors:")) {
        userFriendlyMessage =
          "Please complete all required fields in your workflow nodes";
      } else if (errorMessage.includes("repo_name is required")) {
        userFriendlyMessage =
          "Please configure repository settings for your trigger nodes";
      } else if (errorMessage.includes("agent id is required")) {
        userFriendlyMessage =
          "Please configure agent settings for your workflow";
      } else if (errorMessage.includes("condition is required")) {
        userFriendlyMessage =
          "Please configure conditions for your conditional nodes";
      }

      toast.error(userFriendlyMessage, {
        description: "Please fix the issues and try saving again",
        duration: 4000,
        style: {
          backgroundColor: "#ef4444",
          color: "white",
          border: "2px solid #dc2626",
        },
      });
      // Re-throw the error with the parsed message so the parent component can handle it
      throw new Error(errorMessage);
    }
  }, [editingNodes, editingEdges, localWorkflow, onSave, debugMode]);

  // Cancel changes and revert to original
  const handleCancel = useCallback(() => {
    const nodes = generateNodes(originalWorkflow, debugMode);
    const edges = generateEdges(
      originalWorkflow,
      mode === "view_only" || mode === "preview",
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
    const localWorkflowInfo = getLocalWorkflowInfo(workflowId);
    if (localWorkflowData) {
      setLocalWorkflow(localWorkflowData);
      currentWorkflowRef.current = localWorkflowData;
      const nodes = generateNodes(localWorkflowData, debugMode);
      const edges = generateEdges(
        localWorkflowData,
        mode === "view_only" || mode === "preview",
        debugMode
      );
      setEditingNodes(nodes);
      setEditingEdges(edges);
      setHasUnsavedChanges(localWorkflowInfo?.hasUnsavedChanges || false);
      setShowLocalWorkflowBanner(localWorkflowInfo?.hasUnsavedChanges || false);
    }
  }, [workflowId, mode, debugMode]);

  // Discard local workflow and load latest from API (for banner action)
  const handleDiscardLocalWorkflow = useCallback(async () => {
    const isNewWorkflow =
      !workflow.id ||
      workflow.id === "" ||
      workflow.id === "default" ||
      workflowId.startsWith("new-workflow-");

    clearLocalWorkflow(workflowId);
    setShowLocalWorkflowBanner(false);

    // For new workflows, just clear local storage and start fresh
    if (isNewWorkflow) {
      setLocalWorkflow(workflow);
      currentWorkflowRef.current = workflow;
      setOriginalWorkflow(workflow);
      setHasUnsavedChanges(false);

      const nodes = generateNodes(workflow, debugMode);
      const edges = generateEdges(workflow, mode === "view_only", debugMode);
      setEditingNodes(nodes);
      setEditingEdges(edges);
      setSelectedNode(null);
      return;
    }

    try {
      // Only fetch from API if we have a valid workflow ID (not a new workflow ID)
      if (workflowId && !workflowId.startsWith("new-workflow-")) {
        console.log("Fetching workflow from API with ID:", workflowId);
        const latestWorkflow =
          await WorkflowService.getWorkflowById(workflowId);
        if (latestWorkflow) {
          // Debug logging to understand the workflow structure
          console.log("=== WORKFLOW DEBUG INFO ===");
          console.log("Latest workflow from API:", latestWorkflow);
          console.log("Workflow graph:", latestWorkflow.graph);
          console.log("Workflow graph type:", typeof latestWorkflow.graph);
          console.log("Adjacency list:", latestWorkflow.graph?.adjacency_list);
          console.log(
            "Adjacency list type:",
            typeof latestWorkflow.graph?.adjacency_list
          );
          console.log(
            "Adjacency list keys:",
            Object.keys(latestWorkflow.graph?.adjacency_list || {})
          );
          console.log("Nodes:", latestWorkflow.graph?.nodes);
          console.log("Nodes type:", typeof latestWorkflow.graph?.nodes);
          console.log(
            "Nodes keys:",
            Object.keys(latestWorkflow.graph?.nodes || {})
          );

          // Check for edges in different locations
          console.log("Workflow.edges:", (latestWorkflow as any).edges);
          console.log(
            "Workflow.graph.edges:",
            (latestWorkflow.graph as any).edges
          );
          console.log("=== END WORKFLOW DEBUG INFO ===");

          // Check if the workflow has adjacency_list in a different format and convert them
          const processedWorkflow = convertEdgesToAdjacencyList(
            latestWorkflow,
            debugMode
          );

          console.log("=== PROCESSED WORKFLOW DEBUG INFO ===");
          console.log("Processed workflow:", processedWorkflow);
          console.log(
            "Processed adjacency list:",
            processedWorkflow.graph?.adjacency_list
          );
          console.log(
            "Processed adjacency list keys:",
            Object.keys(processedWorkflow.graph?.adjacency_list || {})
          );
          console.log("=== END PROCESSED WORKFLOW DEBUG INFO ===");

          // Fallback: If the processed workflow still doesn't have adjacency_list, use the original
          let finalWorkflow = processedWorkflow;
          if (
            !processedWorkflow.graph?.adjacency_list ||
            Object.keys(processedWorkflow.graph.adjacency_list).length === 0
          ) {
            console.log(
              "WARNING: Processed workflow has no adjacency_list, using original workflow"
            );
            console.log(
              "Original workflow adjacency_list:",
              originalWorkflow.graph?.adjacency_list
            );
            finalWorkflow = {
              ...processedWorkflow,
              graph: {
                ...processedWorkflow.graph,
                adjacency_list: originalWorkflow.graph?.adjacency_list || {},
              },
            };
          }

          // Update both original and local workflow with the final workflow
          setOriginalWorkflow(finalWorkflow);
          setLocalWorkflow(finalWorkflow);
          currentWorkflowRef.current = finalWorkflow;

          const nodes = generateNodes(finalWorkflow, debugMode);
          const edges = generateEdges(
            finalWorkflow,
            mode === "view_only" || mode === "preview",
            debugMode
          );

          console.log("=== GENERATED DATA DEBUG INFO ===");
          console.log("Generated nodes:", nodes.length);
          console.log("Generated edges:", edges.length);
          console.log("Generated edges details:", edges);
          console.log("=== END GENERATED DATA DEBUG INFO ===");

          setEditingNodes(nodes);
          setEditingEdges(edges);
          setHasUnsavedChanges(false);
          setSelectedNode(null);
          return;
        }
      }

      // Fallback to original workflow if no valid ID or API call fails
      const nodes = generateNodes(originalWorkflow, debugMode);
      const edges = generateEdges(
        originalWorkflow,
        mode === "view_only" || mode === "preview",
        debugMode
      );
      setEditingNodes(nodes);
      setEditingEdges(edges);
      setLocalWorkflow(originalWorkflow);
      currentWorkflowRef.current = originalWorkflow;
      setHasUnsavedChanges(false);
      setSelectedNode(null);
    } catch (error) {
      console.error("Error fetching latest workflow from API:", error);
      // Fallback to original workflow on error
      const nodes = generateNodes(originalWorkflow, debugMode);
      const edges = generateEdges(
        originalWorkflow,
        mode === "view_only" || mode === "preview",
        debugMode
      );
      setEditingNodes(nodes);
      setEditingEdges(edges);
      setLocalWorkflow(originalWorkflow);
      currentWorkflowRef.current = originalWorkflow;
      setHasUnsavedChanges(false);
      setSelectedNode(null);
    }
  }, [
    workflowId,
    originalWorkflow,
    mode,
    debugMode,
    convertEdgesToAdjacencyList,
    workflow,
  ]);

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
    isLoading,

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
    onTitleChange,
  };
};
