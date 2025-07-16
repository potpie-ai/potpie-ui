import { FC } from "react";

interface DebugInfo {
  isInitialized: boolean;
  nodesCount: number;
  edgesCount: number;
  workflowId: string;
  hasLocalWorkflow: boolean;
  hasUnsavedChanges: boolean;
  mode: string;
  error: string | null;
}

interface DebugPanelProps {
  debugMode: boolean;
  debugInfo: DebugInfo;
  workflow: any;
  localWorkflow: any;
  editingNodes: any[];
  editingEdges: any[];
}

export const DebugPanel: FC<DebugPanelProps> = ({
  debugMode,
  debugInfo,
  workflow,
  localWorkflow,
  editingNodes,
  editingEdges,
}) => {
  if (!debugMode) return null;

  return (
    <div className="bg-gray-100 border-b p-2 text-xs font-mono">
      <div className="flex flex-wrap gap-4">
        <span>Initialized: {debugInfo.isInitialized ? "✅" : "❌"}</span>
        <span>Nodes: {debugInfo.nodesCount}</span>
        <span>Edges: {debugInfo.edgesCount}</span>
        <span>Workflow ID: {debugInfo.workflowId}</span>
        <span>Mode: {debugInfo.mode}</span>
        <span>Local Workflow: {debugInfo.hasLocalWorkflow ? "✅" : "❌"}</span>
        <span>
          Unsaved Changes: {debugInfo.hasUnsavedChanges ? "✅" : "❌"}
        </span>
        {debugInfo.error && (
          <span className="text-red-600">Error: {debugInfo.error}</span>
        )}
      </div>

      {/* Workflow Structure Debug */}
      <details className="mt-2">
        <summary className="cursor-pointer text-blue-600">
          Workflow Structure
        </summary>
        <div className="mt-1 p-2 bg-white rounded border">
          <div>
            <strong>Original Workflow:</strong>
          </div>
          <pre className="text-xs overflow-auto max-h-32">
            {JSON.stringify(workflow, null, 2)}
          </pre>
          <div className="mt-2">
            <strong>Local Workflow:</strong>
          </div>
          <pre className="text-xs overflow-auto max-h-32">
            {JSON.stringify(localWorkflow, null, 2)}
          </pre>
          <div className="mt-2">
            <strong>Editing Nodes:</strong>
          </div>
          <pre className="text-xs overflow-auto max-h-32">
            {JSON.stringify(editingNodes, null, 2)}
          </pre>
          <div className="mt-2">
            <strong>Editing Edges:</strong>
          </div>
          <pre className="text-xs overflow-auto max-h-32">
            {JSON.stringify(editingEdges, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
};
