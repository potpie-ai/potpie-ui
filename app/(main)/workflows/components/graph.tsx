import { FC } from "react";
import ReactFlow, {
  Controls,
  Background,
  Node,
  Edge,
  MarkerType,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  GitFork,
  BookOpen,
  GitBranch,
  AlertTriangle,
  CircleDot,
  Bot,
  Code,
  ClipboardCheck,
  CheckSquare,
  Tag,
  ExternalLink,
} from "lucide-react";
import { Trigger, Workflow } from "@/services/WorkflowService";
import Link from "next/link";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { TooltipTrigger } from "@radix-ui/react-tooltip";

// Repository Node
const RepositoryNode: FC<any> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md w-64 overflow-hidden">
      <div className="bg-gray-100 p-3 border-b border-gray-200">
        <div className="flex items-center">
          <GitFork className="w-5 h-5 mr-2 text-gray-600" />
          <h3 className="font-semibold text-gray-800">Repository</h3>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center mb-2">
          <BookOpen className="w-4 h-4 mr-1 text-gray-500" />
          <span className="text-sm font-medium text-gray-800">
            <Link
              href={`https://github.com/${data.repoName}`}
              target="_blank"
              className="hover:underline hover:text-blue-700 flex justify-start items-center gap-1"
            >
              {data.repoName}
              <ExternalLink className="h-4 w-4" />
            </Link>
          </span>
        </div>
        <div className="flex items-center">
          <GitBranch className="w-4 h-4 mr-1 text-gray-500" />
          <span className="text-xs text-gray-500">
            Branch: {data.branch || "current branch in context"}
          </span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500"
      />
    </div>
  );
};

// Trigger Node
const TriggerNode: FC<any> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md w-64 overflow-hidden">
      <div className="bg-orange-50 p-3 border-b border-gray-200">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
          <h3 className="font-semibold text-gray-800">Triggers</h3>
        </div>
      </div>
      <div className="p-4">
        <Tooltip>
          <TooltipTrigger className="space-y-2">
            {data.selected_triggers.map((current: string, index: number) =>
              index == 2 ? (
                <>+{data.selected_triggers.length - 2}</>
              ) : index > 2 ? (
                <></>
              ) : (
                <div
                  key={index}
                  className="flex items-center bg-orange-50 rounded-md p-2"
                >
                  <CircleDot className="w-3 h-3 text-orange-500 mr-2" />
                  <span className="text-sm text-gray-700">
                    {data.all_triggers.find(
                      (trigger: any) => trigger.id == current
                    )?.name || "<Unknown Trigger>"}
                  </span>
                </div>
              )
            )}
          </TooltipTrigger>
          <TooltipContent side="top" className="space-y-2">
            {data.selected_triggers.map((current: string, index: number) => (
              <div
                key={index}
                className="flex items-center bg-orange-50 rounded-md p-2"
              >
                <CircleDot className="w-3 h-3 text-orange-500 mr-2" />
                <span className="text-sm text-gray-700">
                  {data.all_triggers.find(
                    (trigger: any) => trigger.id == current
                  )?.name || "<Unknown Trigger>"}
                </span>
              </div>
            ))}
          </TooltipContent>
        </Tooltip>
        {/* <div className="space-y-2">
          {data.selected_triggers.map((current: string, index: number) => (
            <div
              key={index}
              className="flex items-center bg-orange-50 rounded-md p-2"
            >
              <CircleDot className="w-3 h-3 text-orange-500 mr-2" />
              <span className="text-sm text-gray-700">
                {data.all_triggers.find((trigger: any) => trigger.id == current)
                  ?.name || "<Unknown Trigger>"}
              </span>
            </div>
          ))}
        </div> */}
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-orange-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-orange-500"
      />
    </div>
  );
};

// Agent Node
const AgentNode: FC<any> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md w-64 overflow-hidden">
      <div className="bg-purple-50 p-3 border-b border-gray-200">
        <div className="flex items-center">
          <Bot className="w-5 h-5 mr-2 text-purple-600" />
          <h3 className="font-semibold text-gray-800">Agent</h3>
        </div>
      </div>
      <div className="p-4">
        <div className="w-12 h-12 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-3">
          <Code className="w-6 h-6 text-purple-600" />
        </div>
        <p className="text-center font-medium text-gray-800">
          {data.agentName}
        </p>
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-purple-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500"
      />
    </div>
  );
};

// Task Node
const TaskNode: FC<any> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md w-64 overflow-hidden">
      <div className="bg-green-50 p-3 border-b border-gray-200">
        <div className="flex items-center">
          <ClipboardCheck className="w-5 h-5 mr-2 text-green-600" />
          <h3 className="font-semibold text-gray-800">Task</h3>
        </div>
      </div>
      <div className="p-4">
        <div className="bg-green-50 p-3 rounded-md border border-green-100">
          <p className="text-sm text-gray-700">{data.task}</p>
        </div>
        {/* <div className="flex items-center justify-end mt-3">
          <div className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-500 flex items-center">
            <CheckSquare className="w-3 h-3 mr-1" />
            Tools at disposal
          </div>
        </div> */}
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-green-500"
      />
    </div>
  );
};

// Generate nodes based on workflow data
const generateNodes = (
  workflow: Workflow,
  agent_name: string,
  triggers: Trigger[]
): Node[] => {
  return [
    {
      id: "1",
      type: "repositoryNode",
      position: { x: 50, y: 100 },
      data: {
        repoName: workflow.repo_name,
        branch: workflow.branch,
      },
    },
    {
      id: "2",
      type: "triggerNode",
      position: { x: 100, y: 300 },
      data: {
        selected_triggers: workflow.triggers,
        all_triggers: triggers,
      },
    },
    {
      id: "3",
      type: "agentNode",
      position: { x: 50, y: 530 },
      data: {
        agentName: agent_name,
      },
    },
    {
      id: "4",
      type: "taskNode",
      position: { x: 100, y: 750 },
      data: {
        task: workflow.task,
      },
    },
  ];
};

// Generate edges connecting the nodes
const generateEdges = (): Edge[] => {
  return [
    {
      id: "e1-2",
      source: "1",
      target: "2",
      animated: true,
      style: { stroke: "#2563eb", strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#2563eb",
      },
    },
    {
      id: "e2-3",
      source: "2",
      target: "3",
      animated: true,
      style: { stroke: "#2563eb", strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#2563eb",
      },
    },
    {
      id: "e3-4",
      source: "3",
      target: "4",
      animated: true,
      style: { stroke: "#2563eb", strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#2563eb",
      },
    },
  ];
};

interface WorkflowDiagramProps {
  workflow: Workflow;
  agent_name: string;
  triggers: Trigger[];
}

// Main component
const WorkflowDiagram: FC<WorkflowDiagramProps> = ({
  workflow,
  agent_name,
  triggers,
}) => {
  // Node types mapping for custom nodes
  const nodeTypes = {
    repositoryNode: RepositoryNode,
    triggerNode: TriggerNode,
    agentNode: AgentNode,
    taskNode: TaskNode,
  };

  // Generate nodes and edges from workflow data
  const nodes = generateNodes(workflow, agent_name, triggers);
  const edges = generateEdges();

  return (
    <div
      className="h-[900px] w-full bg-gray-50 rounded-lg"
      onWheel={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        zoomOnScroll={false}
        zoomOnPinch={false}
        panOnScroll={false}
        panOnDrag={false}
        preventScrolling={false} // Prevents scrolling the page when interacting with React Flow
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#aaa" gap={16} />
      </ReactFlow>
    </div>
  );
};

export default WorkflowDiagram;
