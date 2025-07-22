import { FC } from "react";
import { useState } from "react";

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
        <div
          className="mt-1 p-2 bg-white rounded border resize-y overflow-auto min-h-[180px] max-h-[600px] flex flex-col"
          style={{ minHeight: 180, maxHeight: 600 }}
        >
          <WorkflowJsonDropdown
            workflow={workflow}
            localWorkflow={localWorkflow}
            editingNodes={editingNodes}
            editingEdges={editingEdges}
          />
        </div>
      </details>
    </div>
  );
};

const CopyableJsonSection: FC<{ label: string; jsonData: any }> = ({
  label,
  jsonData,
}) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="mt-2 flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2">
        <strong>{label}:</strong>
        <button
          className="px-2 py-0.5 border rounded text-xs bg-gray-200 hover:bg-gray-300"
          onClick={handleCopy}
          type="button"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre
        className="text-xs overflow-auto flex-1 min-h-0 max-h-full"
        style={{ margin: 0 }}
      >
        {JSON.stringify(jsonData, null, 2)}
      </pre>
    </div>
  );
};

const WorkflowJsonDropdown: FC<{
  workflow: any;
  localWorkflow: any;
  editingNodes: any[];
  editingEdges: any[];
}> = ({ workflow, localWorkflow, editingNodes, editingEdges }) => {
  const options = [
    { label: "Original Workflow", value: "workflow", data: workflow },
    { label: "Local Workflow", value: "localWorkflow", data: localWorkflow },
    { label: "Editing Nodes", value: "editingNodes", data: editingNodes },
    { label: "Editing Edges", value: "editingEdges", data: editingEdges },
  ];
  const [selected, setSelected] = useState(options[0].value);
  const selectedOption =
    options.find((opt) => opt.value === selected) || options[0];
  return (
    <div>
      <label className="block mb-1 font-semibold">Select JSON to view:</label>
      <select
        className="mb-2 p-1 border rounded text-xs bg-gray-50"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <CopyableJsonSection
        label={selectedOption.label}
        jsonData={selectedOption.data}
      />
    </div>
  );
};
