import { Workflow } from "@/services/WorkflowService";
import { FC, useState, useMemo, useEffect } from "react";
import { useWorkflowEditor } from "./hooks/useWorkflowEditor";
import { DebugPanel } from "./components/DebugPanel";
import { LocalWorkflowBanner } from "./components/LocalWorkflowBanner";
import { EditorControls } from "./components/EditorControls";
import { ReactFlowCanvas } from "./components/ReactFlowCanvas";
import { NodePaletteContainer } from "./components/NodePaletteContainer";
import { WorkflowDnDProvider } from "./components/WorkflowDnDProvider";

interface WorkflowEditorProps {
  workflow?: Workflow;
  mode?: "view_only" | "edit" | "preview";
  onSave?: (updatedWorkflow: Workflow, isNewWorkflow: boolean) => void;
  onCancel?: () => void;
  onModeChange?: (mode: "view_only" | "edit" | "preview") => void;
  onExecutionsClick?: () => void;
  debugMode?: boolean;
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

  return (
    <WorkflowDnDProvider>
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
          show={showLocalWorkflowBanner && mode !== "preview"}
          onLoadLocalWorkflow={handleLoadLocalWorkflow}
          onDiscardLocalWorkflow={handleDiscardLocalWorkflow}
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
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          {/* ReactFlow Canvas */}
          <div className="flex-1 min-h-0 overflow-hidden">
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
            />
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
    </WorkflowDnDProvider>
  );
};
