import { Workflow } from "@/services/WorkflowService";
import { FC, useState, useMemo, useEffect, useCallback } from "react";
import { useWorkflowEditor } from "./hooks/useWorkflowEditor";
import { DebugPanel } from "./components/DebugPanel";
import { LocalWorkflowBanner } from "./components/LocalWorkflowBanner";
import { EditorControls } from "./components/EditorControls";
import { ReactFlowCanvas } from "./components/ReactFlowCanvas";
import { NodePaletteContainer } from "./components/NodePaletteContainer";
import { WorkflowDnDProvider } from "./components/WorkflowDnDProvider";
import { AgentDataProvider } from "./contexts/AgentDataContext";

interface WorkflowEditorProps {
  workflow?: Workflow;
  mode?: "view_only" | "edit" | "preview";
  onSave?: (
    updatedWorkflow: Workflow,
    isNewWorkflow: boolean,
    validation?: any
  ) => void;
  onCancel?: () => void;
  onModeChange?: (mode: "view_only" | "edit" | "preview") => void;
  onExecutionsClick?: () => void;
  debugMode?: boolean;
  validation?: {
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

function createEmptyWorkflow(): Workflow {
  const now = new Date().toISOString();
  return {
    id: "",
    title: "",
    description: "",
    created_by: "",
    created_at: now,
    updated_at: now,
    is_paused: false,
    version: "1.0.0",
    graph: {
      id: "graph-" + Math.random().toString(36).substr(2, 9),
      workflow_id: "",
      nodes: {},
      adjacency_list: {},
      created_at: now,
      updated_at: now,
    },
    variables: {},
  };
}

export const WorkflowEditor: FC<WorkflowEditorProps> = ({
  workflow: workflowProp,
  mode: initialMode = "edit",
  onSave,
  onCancel,
  onModeChange,
  onExecutionsClick,
  debugMode = false,
  validation,
}) => {
  const workflow = useMemo(
    () => workflowProp ?? createEmptyWorkflow(),
    [workflowProp]
  );
  const [mode, setMode] = useState<"view_only" | "edit" | "preview">(
    initialMode
  );

  // Update local mode when prop changes (for URL syncing)
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const handleModeChange = (newMode: "view_only" | "edit" | "preview") => {
    setMode(newMode);
    onModeChange?.(newMode);
  };

  const {
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
    handleSave,
    handleCancel,
    handleLoadLocalWorkflow,
    handleDiscardLocalWorkflow,
    onNodeDrop,
    onTitleChange,
  } = useWorkflowEditor({
    workflow,
    mode,
    debugMode,
    onSave,
    onCancel,
  });

  // Handle node deletion
  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      const deleteChanges = [
        {
          type: "remove" as const,
          id: nodeId,
        },
      ];
      onNodesChange(deleteChanges);
    },
    [onNodesChange]
  );

  return (
    <WorkflowDnDProvider>
      <AgentDataProvider>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Debug Panel */}
          <DebugPanel
            debugMode={debugMode}
            debugInfo={debugInfo}
            workflow={workflow}
            localWorkflow={localWorkflow}
            editingNodes={editingNodes}
            editingEdges={editingEdges}
          />

          {/* Local workflow banner */}
          <LocalWorkflowBanner
            show={showLocalWorkflowBanner && mode === "edit"}
            onLoadLocalWorkflow={handleLoadLocalWorkflow}
            onDiscardLocalWorkflow={handleDiscardLocalWorkflow}
            isNewWorkflow={
              !localWorkflow.id ||
              localWorkflow.id === "" ||
              localWorkflow.id === "default" ||
              (!!localWorkflow.id &&
                localWorkflow.id.startsWith("new-workflow-"))
            }
          />

          {/* Editor Controls */}
          <EditorControls
            mode={mode}
            hasUnsavedChanges={hasUnsavedChanges}
            onModeChange={handleModeChange}
            onSave={handleSave}
            onCancel={handleCancel}
            workflowTitle={localWorkflow.title || ""}
            onTitleChange={onTitleChange}
            isNewWorkflow={!localWorkflow.id || localWorkflow.id === ""}
            onExecutionsClick={onExecutionsClick}
            validation={validation}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
            {/* ReactFlow Canvas */}
            <div className="flex-1 min-h-0 overflow-hidden relative">
              <ReactFlowCanvas
                nodes={editingNodes}
                edges={editingEdges}
                mode={mode}
                isInitialized={isInitialized}
                debugMode={debugMode}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgeUpdate={onEdgeUpdate}
                onEdgeUpdateStart={onEdgeUpdateStart}
                onEdgeUpdateEnd={onEdgeUpdateEnd}
                selectedNode={selectedNode}
                onNodeSelect={onNodeSelect}
                onNodeDrop={onNodeDrop}
                onNodeDelete={handleNodeDelete}
              />

              {/* Loading Overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-background/80 dark:bg-gray-900/80 flex items-center justify-center z-50">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Loading workflow...
                    </p>
                  </div>
                </div>
              )}
            </div>
            {/* Node Palette & Config Panel */}
            {mode !== "preview" && (
              <NodePaletteContainer
                selectedNode={selectedNode}
                onNodeConfigChange={onNodeConfigChange}
                onNodeDragStart={
                  mode === "edit"
                    ? (nodeType) => {
                        // Optional: Add any additional logic when dragging starts
                        console.log("Dragging node:", nodeType);
                      }
                    : undefined
                }
                readOnly={mode !== "edit"}
                visible={true}
                workflowId={workflow.id}
                workflow={workflow}
              />
            )}
          </div>
        </div>
      </AgentDataProvider>
    </WorkflowDnDProvider>
  );
};
