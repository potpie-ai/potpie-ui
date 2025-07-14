import { Workflow } from "@/services/WorkflowService";
import { FC, useState } from "react";
import { useWorkflowEditor } from "./hooks/useWorkflowEditor";
import { DebugPanel } from "./components/DebugPanel";
import { LocalWorkflowBanner } from "./components/LocalWorkflowBanner";
import { EditorControls } from "./components/EditorControls";
import { ReactFlowCanvas } from "./components/ReactFlowCanvas";
import { NodePaletteContainer } from "./components/NodePaletteContainer";
import { WorkflowDnDProvider } from "./components/WorkflowDnDProvider";

interface WorkflowEditorProps {
  workflow: Workflow;
  mode?: "view_only" | "edit";
  onSave?: (updatedWorkflow: Workflow) => void;
  onCancel?: () => void;
  debugMode?: boolean;
}

export const WorkflowEditor: FC<WorkflowEditorProps> = ({
  workflow,
  mode: initialMode = "edit",
  onSave,
  onCancel,
  debugMode = false,
}) => {
  const [mode, setMode] = useState<"view_only" | "edit">(initialMode);

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
  } = useWorkflowEditor({
    workflow,
    mode,
    debugMode,
    onSave,
    onCancel,
  });

  return (
    <WorkflowDnDProvider>
      <div className="flex flex-col h-full">
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
          show={showLocalWorkflowBanner}
          onLoadLocalWorkflow={handleLoadLocalWorkflow}
          onDiscardLocalWorkflow={handleDiscardLocalWorkflow}
        />

        {/* Editor Controls */}
        <EditorControls
          mode={mode}
          hasUnsavedChanges={hasUnsavedChanges}
          onModeChange={setMode}
          onSave={handleSave}
          onCancel={handleCancel}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* ReactFlow Canvas */}
          <div className="flex-1">
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

          {/* Node Palette */}
          {mode === "edit" && (
            <NodePaletteContainer
              selectedNode={selectedNode}
              onNodeConfigChange={onNodeConfigChange}
              onNodeDragStart={(nodeType) => {
                // Optional: Add any additional logic when dragging starts
                console.log("Dragging node:", nodeType);
              }}
            />
          )}
        </div>
      </div>
    </WorkflowDnDProvider>
  );
};
