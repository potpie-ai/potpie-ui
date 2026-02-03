import { FC, useMemo, useCallback, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  Node as RFNode,
  Edge as RFEdge,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { ExecutionTree, ExecutionTreeNode } from "@/services/WorkflowService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Zap,
  GitBranch,
  Workflow,
  RefreshCw,
  X,
  Info,
  Calendar,
  Timer,
  FileText,
} from "lucide-react";
import { formatLocalTime, formatRelativeTime } from "@/lib/utils";
import dayjs from "dayjs";
import { getNodeColors } from "../editor/nodes/color_utils";

// Custom hook for live duration updates
const useLiveDuration = (startedAt: string, status: string) => {
  const [currentTime, setCurrentTime] = useState(dayjs());

  useEffect(() => {
    if (status !== "running") {
      return;
    }

    const interval = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [status]);

  const formatLiveDuration = (startedAt: string) => {
    // Parse UTC time and convert to local timezone, same as formatLocalTime
    const start = dayjs.utc(startedAt).local();
    const durationMs = currentTime.diff(start, "millisecond");
    const durationSeconds = Math.round(durationMs / 1000);

    if (durationSeconds < 60) {
      return `${durationSeconds}s`;
    } else if (durationSeconds < 3600) {
      return `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`;
    } else {
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  return status === "running" ? formatLiveDuration(startedAt) : null;
};

// Helper function to generate node positions with minimal edge crossings
const generateNodePositions = (executionTree: ExecutionTree) => {
  const treeNodes = executionTree.execution_tree;
  const nodeIds = Object.keys(treeNodes);

  if (nodeIds.length === 0) {
    return new Map();
  }

  const nodePositions = new Map<string, { x: number; y: number }>();
  const levelWidth = 400; // Horizontal spacing between levels
  const nodeHeight = 375; // Vertical spacing between nodes (increased by 50% from 250)
  const subtreeSpacing = 150; // Extra spacing between different subtrees (increased by 50% from 100)

  // For single node, center it
  if (nodeIds.length === 1) {
    nodePositions.set(nodeIds[0], { x: 0, y: 0 });
    return nodePositions;
  }

  // Build the tree structure
  const tree = new Map<
    string,
    { children: string[]; parent: string | null; level: number }
  >();

  // Initialize all nodes
  nodeIds.forEach((nodeId) => {
    tree.set(nodeId, { children: [], parent: null, level: 0 });
  });

  // Build parent-child relationships
  nodeIds.forEach((nodeId) => {
    const node = treeNodes[nodeId];
    if (node.predecessor && tree.has(node.predecessor)) {
      const parent = tree.get(node.predecessor)!;
      parent.children.push(nodeId);
      tree.get(nodeId)!.parent = node.predecessor;
    }
  });

  // Calculate levels (distance from root)
  const calculateLevels = (nodeId: string, level: number = 0) => {
    const node = tree.get(nodeId)!;
    node.level = Math.max(node.level, level);
    node.children.forEach((childId) => {
      calculateLevels(childId, level + 1);
    });
  };

  // Find root nodes and calculate levels
  const rootNodes = nodeIds.filter((id) => !tree.get(id)!.parent);
  rootNodes.forEach((rootId) => calculateLevels(rootId));

  // Group nodes by level
  const nodesByLevel = new Map<number, string[]>();
  nodeIds.forEach((nodeId) => {
    const level = tree.get(nodeId)!.level;
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level)!.push(nodeId);
  });

  // Sort nodes within each level to minimize crossings
  const sortNodesInLevel = (levelNodes: string[], level: number) => {
    if (level === 0) {
      // For root level, sort by number of descendants (more descendants first)
      return levelNodes.sort((a, b) => {
        const aDescendants = countDescendants(a);
        const bDescendants = countDescendants(b);
        return bDescendants - aDescendants;
      });
    }

    // For other levels, sort based on parent positions and minimize crossings
    const parentPositions = new Map<string, number>();
    levelNodes.forEach((nodeId) => {
      const parent = tree.get(nodeId)!.parent;
      if (parent && nodePositions.has(parent)) {
        parentPositions.set(nodeId, nodePositions.get(parent)!.y);
      }
    });

    // Sort by parent Y position to minimize crossings
    return levelNodes.sort((a, b) => {
      const aParentY = parentPositions.get(a) || 0;
      const bParentY = parentPositions.get(b) || 0;
      return aParentY - bParentY;
    });
  };

  // Count total descendants of a node
  const countDescendants = (nodeId: string): number => {
    const node = tree.get(nodeId)!;
    let count = node.children.length;
    node.children.forEach((childId) => {
      count += countDescendants(childId);
    });
    return count;
  };

  // Calculate subtree width (for spacing)
  const calculateSubtreeWidth = (nodeId: string): number => {
    const node = tree.get(nodeId)!;
    if (node.children.length === 0) return 1;

    let totalWidth = 0;
    node.children.forEach((childId) => {
      totalWidth += calculateSubtreeWidth(childId);
    });
    return Math.max(totalWidth, 1);
  };

  // Calculate optimal spacing between nodes based on their subtree sizes
  const calculateOptimalSpacing = (nodeId: string): number => {
    const node = tree.get(nodeId)!;
    const subtreeWidth = calculateSubtreeWidth(nodeId);
    const baseSpacing = nodeHeight;

    // Increase spacing for nodes with larger subtrees
    return baseSpacing + (subtreeWidth - 1) * 20;
  };

  // Position nodes level by level
  const levels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

  levels.forEach((level) => {
    const levelNodes = sortNodesInLevel(nodesByLevel.get(level)!, level);
    const x = level * levelWidth;

    // Calculate Y positions for this level
    let currentY = 0;
    let subtreeStartY = 0;
    let lastParentId: string | null = null;

    levelNodes.forEach((nodeId, index) => {
      const node = tree.get(nodeId)!;
      const parent = node.parent;

      // Add extra spacing between different subtrees
      if (parent !== lastParentId && lastParentId !== null) {
        currentY += subtreeSpacing;
      }
      lastParentId = parent;

      // Position the node
      nodePositions.set(nodeId, { x, y: currentY });

      // Calculate spacing for next node
      if (parent) {
        // If this node has siblings, we need to account for their space
        const siblings = tree.get(parent)!.children;
        const siblingIndex = siblings.indexOf(nodeId);

        if (siblingIndex < siblings.length - 1) {
          // More siblings coming, add minimal spacing
          currentY += nodeHeight;
        } else {
          // Last sibling, add optimal spacing for next subtree
          const optimalSpacing = calculateOptimalSpacing(nodeId);
          currentY += optimalSpacing;
        }
      } else {
        // Root level node - use optimal spacing
        const optimalSpacing = calculateOptimalSpacing(nodeId);
        currentY += optimalSpacing;
      }
    });
  });

  // Apply barycenter method to reduce crossings
  const reduceCrossings = () => {
    let improved = true;
    let iterations = 0;
    const maxIterations = 5;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      // Process each level except the last
      for (let level = 0; level < levels.length - 1; level++) {
        const currentLevelNodes = nodesByLevel.get(level)!;
        const nextLevelNodes = nodesByLevel.get(level + 1)!;

        // Group next level nodes by their parents
        const nodesByParent = new Map<string, string[]>();
        nextLevelNodes.forEach((nodeId) => {
          const parent = tree.get(nodeId)!.parent!;
          if (!nodesByParent.has(parent)) {
            nodesByParent.set(parent, []);
          }
          nodesByParent.get(parent)!.push(nodeId);
        });

        // Sort children of each parent by barycenter
        nodesByParent.forEach((children, parentId) => {
          children.sort((a, b) => {
            const aY = nodePositions.get(a)!.y;
            const bY = nodePositions.get(b)!.y;
            return aY - bY;
          });
        });

        // Recalculate positions for next level
        let currentY = 0;
        nextLevelNodes.forEach((nodeId) => {
          nodePositions.set(nodeId, {
            x: nodePositions.get(nodeId)!.x,
            y: currentY,
          });
          currentY += nodeHeight;
        });
      }
    }
  };

  // Apply crossing reduction
  reduceCrossings();

  return nodePositions;
};

interface ExecutionTreeVisualizerProps {
  executionTree: ExecutionTree;
  executionId: string;
  onBack?: () => void;
  debugMode?: boolean;
  embedded?: boolean; // New prop for embedded mode
  onRefresh?: () => Promise<void>; // Function to refresh execution tree data
  isRunning?: boolean; // Whether the workflow is currently running
  isPending?: boolean; // Whether the workflow is currently pending
}

interface ExecutionNodeData {
  nodeId: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string;
  endTime?: string;
  iteration: number;
  logs: Array<{
    status: string;
    timestamp: string;
    details: string;
  }>;
  predecessor: string | null;
  children: string[];
}

// Custom node component for execution tree
const ExecutionNode: FC<{ data: ExecutionNodeData; selected?: boolean }> = ({
  data,
  selected,
}) => {
  // Use live duration hook for running nodes
  const liveDuration = useLiveDuration(data.startedAt, data.status);

  // Simple debug log
  if (selected) {
    console.log(`🎯 NODE SELECTED: ${data.nodeId}`);
  }

  // Add custom slow pulse animation
  useEffect(() => {
    if (selected) {
      const style = document.createElement("style");
      style.textContent = `
        @keyframes slowPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }
  }, [selected]);
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Play className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-purple-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "running":
        return "default";
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      case "pending":
        return "default";
      default:
        return "outline";
    }
  };

  const getNodeTypeIcon = (nodeId: string) => {
    const group = getNodeGroup(nodeId);
    const colors = getNodeColors(group);

    if (nodeId.includes("trigger")) {
      if (nodeId.includes("github"))
        return <Zap className="w-5 h-5 mr-2" style={{ color: "#fff" }} />;
      if (nodeId.includes("linear"))
        return <Zap className="w-5 h-5 mr-2" style={{ color: "#fff" }} />;
      return <Zap className="w-5 h-5 mr-2" style={{ color: colors.primary }} />;
    }
    if (nodeId.includes("flow_control"))
      return (
        <GitBranch className="w-5 h-5 mr-2" style={{ color: colors.primary }} />
      );
    if (nodeId.includes("agent"))
      return (
        <Workflow className="w-5 h-5 mr-2" style={{ color: colors.primary }} />
      );
    return (
      <Workflow className="w-5 h-5 mr-2" style={{ color: colors.primary }} />
    );
  };

  const getNodeStyle = (status: string, nodeId: string) => {
    // Determine node group based on nodeId
    let group: "default" | "github" | "linear" | "flow_control" = "default";
    if (nodeId.includes("trigger")) {
      if (nodeId.includes("github")) group = "github";
      else if (nodeId.includes("linear")) group = "linear";
      else group = "default";
    } else if (nodeId.includes("flow_control")) {
      group = "flow_control";
    } else if (nodeId.includes("agent")) {
      group = "default";
    }

    const colors = getNodeColors(group);

    // Status-based styling with node group colors
    switch (status) {
      case "running":
        return `border-blue-300 bg-blue-50 shadow-blue-100`;
      case "completed":
        return `border-green-300 bg-green-50 shadow-green-100`;
      case "failed":
        return `border-red-300 bg-red-50 shadow-red-100`;
      case "pending":
        return `border-yellow-300 bg-yellow-50 shadow-yellow-100`;
      default:
        return `border-purple-300 bg-purple-50 shadow-purple-100`;
    }
  };

  const formatDuration = (logs: Array<{ timestamp: string }>) => {
    if (logs.length < 2) {
      return "0s";
    }

    // Sort logs by timestamp to get first and last
    const sortedLogs = [...logs].sort(
      (a, b) => dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf()
    );

    const firstLog = sortedLogs[0];
    const lastLog = sortedLogs[sortedLogs.length - 1];

    const start = dayjs(firstLog.timestamp);
    const end = dayjs(lastLog.timestamp);
    const durationMs = end.diff(start, "millisecond");
    const durationSeconds = Math.round(durationMs / 1000);

    if (durationSeconds < 60) {
      return `${durationSeconds}s`;
    } else if (durationSeconds < 3600) {
      return `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`;
    } else {
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const getNodeGroup = (
    nodeId: string
  ): "default" | "github" | "linear" | "flow_control" => {
    if (nodeId.includes("trigger")) {
      if (nodeId.includes("github")) return "github";
      if (nodeId.includes("linear")) return "linear";
      return "default";
    } else if (nodeId.includes("flow_control")) {
      return "flow_control";
    } else if (nodeId.includes("agent")) {
      return "default";
    }
    return "default";
  };

  const getNodeDisplayName = (nodeId: string) => {
    if (nodeId.includes("trigger_github")) {
      if (nodeId.includes("pr_opened")) return "GitHub PR Opened";
      if (nodeId.includes("pr_closed")) return "GitHub PR Closed";
      if (nodeId.includes("pr_merged")) return "GitHub PR Merged";
      if (nodeId.includes("issue_opened")) return "GitHub Issue Opened";
      return "GitHub Trigger";
    }
    if (nodeId.includes("trigger_linear")) return "Linear Trigger";
    if (nodeId.includes("flow_control")) return "If Condition";
    if (nodeId.includes("agent")) return "Custom Agent";
    return nodeId;
  };

  return (
    <div className={`relative ${selected ? "z-10" : ""}`}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />

      {/* Main container with highlighting */}
      <div
        className={`min-w-[280px] max-w-[320px] h-[300px] border-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden ${
          selected
            ? "border-blue-600 border-4 bg-blue-100 shadow-2xl scale-110 shadow-blue-300 ring-8 ring-blue-500 ring-offset-4"
            : "bg-white"
        }`}
        style={
          selected
            ? {
                boxShadow:
                  "0 0 0 8px rgba(59, 130, 246, 0.3), 0 0 0 4px rgba(59, 130, 246, 0.5), 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                transform: "scale(1.1)",
                border: "8px solid #f97316", // Bright orange border
                backgroundColor: "#fff7ed", // Light orange background
                animation: "slowPulse 5s ease-in-out infinite", // Custom slow pulse
              }
            : {}
        }
      >
        {/* Selected indicator - very obvious */}
        {selected && (
          <>
            <div className="absolute top-0 left-0 right-0 bg-orange-500 text-white text-center py-1 text-xs font-bold z-50">
              SELECTED NODE - {data.nodeId}
            </div>
            <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white z-50 flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
          </>
        )}

        {/* Header - styled like WorkflowEditor */}
        <div
          className="p-3 border-b border-gray-200 rounded-t-lg"
          style={{
            backgroundColor: getNodeColors(getNodeGroup(data.nodeId)).secondary,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {getNodeTypeIcon(data.nodeId)}
              <h3 className="font-semibold text-gray-800 flex items-center gap-1">
                {getNodeDisplayName(data.nodeId)}
              </h3>
            </div>
            <Badge
              variant="outline"
              className={`text-xs font-semibold ${
                data.status === "completed"
                  ? "bg-green-100 text-green-800 border-green-300"
                  : data.status === "failed"
                    ? "bg-red-100 text-red-800 border-red-300"
                    : data.status === "running"
                      ? "bg-blue-100 text-blue-800 border-blue-300"
                      : data.status === "pending"
                        ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                        : "bg-purple-100 text-purple-800 border-purple-300"
              }`}
            >
              {data.status}
            </Badge>
          </div>
        </div>

        {/* Content - Log Details */}
        <div className="p-4 h-full flex flex-col">
          {/* Basic Info Row */}
          <div className="flex items-center justify-between mb-3 text-xs text-gray-600 flex-shrink-0">
            <span>Started: {formatLocalTime(data.startedAt, "h:mm:ss")}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {data.status === "running" && liveDuration ? (
                <span className="text-blue-600 font-medium animate-pulse">
                  {liveDuration}
                </span>
              ) : (
                formatDuration(data.logs)
              )}
            </span>
            {data.iteration > 0 && <span>Iteration: {data.iteration}</span>}
          </div>

          {/* Logs Section */}
          <div className="space-y-2 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between flex-shrink-0">
              <h4 className="text-sm font-semibold text-gray-700">
                Execution Logs
              </h4>
              <Badge variant="outline" className="text-xs">
                {data.logs.length} entries
              </Badge>
            </div>

            {data.logs.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                {data.logs.slice(-5).map((log, index) => (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="text-xs p-2 rounded border-l-2 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                          style={{
                            borderLeftColor:
                              log.status === "success"
                                ? "#10b981"
                                : log.status === "error"
                                  ? "#ef4444"
                                  : log.status === "warning"
                                    ? "#f59e0b"
                                    : log.status === "info"
                                      ? "#3b82f6"
                                      : "#6b7280",
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-800 truncate">
                                {log.details}
                              </div>
                              <div className="text-gray-500 text-xs mt-1">
                                {formatLocalTime(log.timestamp, "h:mm:ss")}
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                log.status === "success"
                                  ? "bg-green-100 text-green-800 border-green-300"
                                  : log.status === "error"
                                    ? "bg-red-100 text-red-800 border-red-300"
                                    : log.status === "warning"
                                      ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                                      : log.status === "info"
                                        ? "bg-blue-100 text-blue-800 border-blue-300"
                                        : log.status === "running"
                                          ? "bg-blue-100 text-blue-800 border-blue-300"
                                          : log.status === "completed"
                                            ? "bg-green-100 text-green-800 border-green-300"
                                            : log.status === "failed"
                                              ? "bg-red-100 text-red-800 border-red-300"
                                              : log.status === "pending"
                                                ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                                                : "bg-purple-100 text-purple-800 border-purple-300"
                              }`}
                            >
                              {log.status}
                            </Badge>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-md max-h-64 p-3 bg-white border border-gray-200 shadow-lg"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-800">
                              {log.status.charAt(0).toUpperCase() +
                                log.status.slice(1)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatLocalTime(log.timestamp)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                            {log.details}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                {data.logs.length > 5 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{data.logs.length - 5} more entries
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-xs text-gray-500 text-center py-4 border border-dashed border-gray-200 rounded">
                  No logs available
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Side Panel Component for Node Details
const NodeDetailsPanel: FC<{
  node: RFNode | null;
  onClose: () => void;
}> = ({ node, onClose }) => {
  const data = node?.data as ExecutionNodeData;
  const liveDuration = useLiveDuration(
    data?.startedAt || "",
    data?.status || ""
  );

  if (!node) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Play className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-purple-500" />;
    }
  };

  const getNodeTypeIcon = (nodeId: string) => {
    const group = getNodeGroup(nodeId);
    const colors = getNodeColors(group);

    if (nodeId.includes("trigger")) {
      if (nodeId.includes("github"))
        return <Zap className="w-5 h-5 mr-2" style={{ color: "#fff" }} />;
      if (nodeId.includes("linear"))
        return <Zap className="w-5 h-5 mr-2" style={{ color: "#fff" }} />;
      return <Zap className="w-5 h-5 mr-2" style={{ color: colors.primary }} />;
    }
    if (nodeId.includes("flow_control"))
      return (
        <GitBranch className="w-5 h-5 mr-2" style={{ color: colors.primary }} />
      );
    if (nodeId.includes("agent"))
      return (
        <Workflow className="w-5 h-5 mr-2" style={{ color: colors.primary }} />
      );
    return (
      <Workflow className="w-5 h-5 mr-2" style={{ color: colors.primary }} />
    );
  };

  const getNodeGroup = (
    nodeId: string
  ): "default" | "github" | "linear" | "flow_control" => {
    if (nodeId.includes("trigger")) {
      if (nodeId.includes("github")) return "github";
      if (nodeId.includes("linear")) return "linear";
      return "default";
    } else if (nodeId.includes("flow_control")) {
      return "flow_control";
    } else if (nodeId.includes("agent")) {
      return "default";
    }
    return "default";
  };

  const getNodeDisplayName = (nodeId: string) => {
    if (nodeId.includes("trigger_github")) {
      if (nodeId.includes("pr_opened")) return "GitHub PR Opened";
      if (nodeId.includes("pr_closed")) return "GitHub PR Closed";
      if (nodeId.includes("pr_merged")) return "GitHub PR Merged";
      if (nodeId.includes("issue_opened")) return "GitHub Issue Opened";
      return "GitHub Trigger";
    }
    if (nodeId.includes("trigger_linear")) return "Linear Trigger";
    if (nodeId.includes("flow_control")) return "If Condition";
    if (nodeId.includes("agent")) return "Custom Agent";
    return nodeId;
  };

  const formatDuration = (logs: Array<{ timestamp: string }>) => {
    if (logs.length < 2) {
      return "0s";
    }

    // Sort logs by timestamp to get first and last
    const sortedLogs = [...logs].sort(
      (a, b) => dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf()
    );

    const firstLog = sortedLogs[0];
    const lastLog = sortedLogs[sortedLogs.length - 1];

    const start = dayjs(firstLog.timestamp);
    const end = dayjs(lastLog.timestamp);
    const durationMs = end.diff(start, "millisecond");
    const durationSeconds = Math.round(durationMs / 1000);

    if (durationSeconds < 60) {
      return `${durationSeconds}s`;
    } else if (durationSeconds < 3600) {
      return `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`;
    } else {
      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "running":
        return "default";
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      case "pending":
        return "default";
      default:
        return "outline";
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[600px] bg-white border-l border-gray-200 shadow-xl z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getNodeTypeIcon(data.nodeId)}
            <h2 className="text-lg font-semibold text-gray-900">
              Node Execution Details
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 space-y-10">
        {/* Node Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" />
              Node Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Name</h4>
              <p className="text-sm text-gray-900 font-medium">
                {getNodeDisplayName(data.nodeId)}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">
                Node ID
              </h4>
              <p className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
                {data.nodeId}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Status</h4>
              <div className="flex items-center gap-2">
                {getStatusIcon(data.status)}
                <Badge variant={getStatusBadgeVariant(data.status)}>
                  {data.status}
                </Badge>
              </div>
            </div>
            {data.iteration > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">
                  Iteration
                </h4>
                <p className="text-sm text-gray-900">{data.iteration}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timing Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Timing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">
                Started
              </h4>
              <p className="text-sm text-gray-900">
                {data.startedAt && data.startedAt !== "Unknown"
                  ? formatLocalTime(data.startedAt)
                  : data.logs && data.logs.length > 0
                    ? formatLocalTime(data.logs[0].timestamp)
                    : "Unknown"}
              </p>
            </div>
            {data.endTime && (
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">
                  Completed
                </h4>
                <p className="text-sm text-gray-900">
                  {formatLocalTime(data.endTime)}
                </p>
              </div>
            )}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">
                Duration
              </h4>
              <p className="text-sm text-gray-900">
                {data.status === "running" && liveDuration ? (
                  <span className="text-blue-600 font-medium">
                    {liveDuration} (live)
                  </span>
                ) : (
                  formatDuration(data.logs)
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dependencies */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Dependencies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {data.predecessor && (
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">
                  Predecessor
                </h4>
                <p className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
                  {data.predecessor}
                </p>
              </div>
            )}
            {data.children && data.children.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">
                  Children
                </h4>
                <div className="space-y-2">
                  {data.children.map((child, index) => (
                    <p
                      key={index}
                      className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded"
                    >
                      {child}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Execution Logs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Execution Logs ({data.logs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.logs.length > 0 ? (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {data.logs.map((log, index) => (
                  <div
                    key={index}
                    className="p-3 rounded border-l-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    style={{
                      borderLeftColor:
                        log.status === "success"
                          ? "#10b981"
                          : log.status === "error"
                            ? "#ef4444"
                            : log.status === "warning"
                              ? "#f59e0b"
                              : log.status === "info"
                                ? "#3b82f6"
                                : "#6b7280",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          log.status === "success"
                            ? "bg-green-100 text-green-800 border-green-300"
                            : log.status === "error"
                              ? "bg-red-100 text-red-800 border-red-300"
                              : log.status === "warning"
                                ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                                : log.status === "info"
                                  ? "bg-blue-100 text-blue-800 border-blue-300"
                                  : "bg-purple-100 text-purple-800 border-purple-300"
                        }`}
                      >
                        {log.status}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatLocalTime(log.timestamp, "h:mm:ss")}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                      {log.details}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No logs available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface ReactFlowWrapperProps {
  nodes: RFNode[];
  edges: RFEdge[];
  nodeTypes: Record<string, any>;
  onNodeSelect?: (node: RFNode | null) => void;
  selectedNodeId?: string | null;
  executionTreeHash?: string;
}

const ReactFlowWrapper: FC<ReactFlowWrapperProps> = ({
  nodes,
  edges,
  nodeTypes,
  onNodeSelect,
  selectedNodeId,
  executionTreeHash,
}) => {
  const handleNodeClick = useCallback(
    (event: any, node: RFNode) => {
      onNodeSelect?.(node);
    },
    [onNodeSelect]
  );

  const handlePaneClick = useCallback(
    (event: any) => {
      onNodeSelect?.(null);
    },
    [onNodeSelect]
  );

  // Update nodes with selected state - use useMemo to prevent unnecessary re-renders
  const nodesWithSelection = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId, // ReactFlow's built-in selected prop
      data: {
        ...node.data,
        selected: node.id === selectedNodeId,
      },
    }));
  }, [nodes, selectedNodeId]);

  // Memoize the ReactFlow component to prevent unnecessary re-renders
  const reactFlowComponent = useMemo(
    () => (
      <ReactFlow
        nodes={nodesWithSelection}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView={true}
        fitViewOptions={{ padding: 0.2, maxZoom: 1.0, minZoom: 0.3 }}
        attributionPosition="bottom-left"
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          style: { stroke: "#2563eb", strokeWidth: 2 },
          type: "default",
        }}
        snapToGrid={false}
        nodesFocusable={true}
        // Add key to force re-render when nodes/edges change significantly
        key={`flow-${executionTreeHash || "default"}-${nodes.length}-${edges.length}`}
      >
        <Background />
        <Controls className="z-20" />
        <MiniMap className="z-20" />
      </ReactFlow>
    ),
    [
      nodesWithSelection,
      edges,
      nodeTypes,
      handleNodeClick,
      handlePaneClick,
      executionTreeHash,
    ]
  );

  return <div className="relative w-full h-full">{reactFlowComponent}</div>;
};

const LoadingSpinner: FC = () => (
  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
      <p className="text-gray-600">Loading execution tree...</p>
    </div>
  </div>
);

const DebugOverlay: FC<{
  nodes: RFNode[];
  edges: RFEdge[];
  executionTree: ExecutionTree;
}> = ({ nodes, edges, executionTree }) => (
  <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white p-2 rounded text-xs font-mono z-20">
    <div>Execution Tree Debug:</div>
    <div>Nodes: {nodes.length}</div>
    <div>Edges: {edges.length}</div>
    <div>Tree Nodes: {Object.keys(executionTree.execution_tree).length}</div>
    {nodes.length === 0 && (
      <div className="text-yellow-400">⚠️ No nodes to display</div>
    )}
  </div>
);

export const ExecutionTreeVisualizer: FC<ExecutionTreeVisualizerProps> = ({
  executionTree,
  executionId,
  onBack,
  debugMode = false,
  embedded = false,
  onRefresh,
  isRunning = false,
  isPending = false,
}) => {
  const [selectedNode, setSelectedNode] = useState<RFNode | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastExecutionTreeHash, setLastExecutionTreeHash] =
    useState<string>("");

  // Create a stable hash of the execution tree to detect meaningful changes
  const executionTreeHash = useMemo(() => {
    if (!executionTree || !executionTree.execution_tree) return "";

    const treeNodes = executionTree.execution_tree;
    const nodeIds = Object.keys(treeNodes).sort();

    // Create a hash based on node count, statuses, and timestamps
    const hashData = nodeIds
      .map((id) => {
        const node = treeNodes[id];
        return `${id}:${node.status}:${node.start_time}:${node.logs?.length || 0}`;
      })
      .join("|");

    return btoa(hashData).slice(0, 32); // Simple hash
  }, [executionTree]);

  // Convert execution tree to ReactFlow nodes and edges with better memoization
  const { nodes, edges } = useMemo(() => {
    try {
      const treeNodes = executionTree.execution_tree;
      const nodeIds = Object.keys(treeNodes);

      if (nodeIds.length === 0) {
        console.log(
          "ExecutionTreeVisualizer: No nodes found in execution tree"
        );
        return { nodes: [], edges: [] };
      }

      // Always generate positions - the hash check is for optimization but we need positions
      const nodePositions = generateNodePositions(executionTree);

      // Debug position generation
      console.log(
        "ExecutionTreeVisualizer: Generated positions:",
        Array.from(nodePositions.entries()).map(
          ([id, pos]) => `${id}: (${pos.x}, ${pos.y})`
        )
      );

      // Create ReactFlow nodes
      const rfNodes: RFNode[] = nodeIds.map((nodeId) => {
        const node = treeNodes[nodeId];
        const position = nodePositions.get(nodeId) || { x: 0, y: 0 };

        return {
          id: nodeId,
          type: "executionNode",
          position,
          data: {
            nodeId: node.node_id,
            status: node.status,
            startedAt: node.start_time,
            endTime: node.end_time,
            iteration: node.iteration,
            logs: node.logs,
            predecessor: node.predecessor,
            children: node.children,
          },
        };
      });

      // Create ReactFlow edges with improved styling
      const rfEdges: RFEdge[] = [];
      nodeIds.forEach((nodeId) => {
        const node = treeNodes[nodeId];
        if (node.predecessor && nodePositions.has(node.predecessor)) {
          const sourcePos = nodePositions.get(node.predecessor)!;
          const targetPos = nodePositions.get(nodeId)!;

          // Determine edge style based on relationship
          const isDirectChild = true; // All edges in execution tree are direct parent-child
          const edgeStyle = {
            stroke: "#2563eb",
            strokeWidth: 2,
          };

          rfEdges.push({
            id: `${node.predecessor}-${nodeId}`,
            source: node.predecessor,
            target: nodeId,
            style: edgeStyle,
            type: "default", // Use default for more curved edges
          });
        }
      });

      console.log(
        `ExecutionTreeVisualizer: Generated ${rfNodes.length} nodes and ${rfEdges.length} edges`
      );
      return { nodes: rfNodes, edges: rfEdges };
    } catch (error) {
      console.error(
        "ExecutionTreeVisualizer: Error generating nodes and edges:",
        error
      );
      return { nodes: [], edges: [] };
    }
  }, [executionTree, executionTreeHash, lastExecutionTreeHash]);

  // Update the hash when tree changes
  useEffect(() => {
    if (executionTreeHash && executionTreeHash !== lastExecutionTreeHash) {
      setLastExecutionTreeHash(executionTreeHash);
    }
  }, [executionTreeHash, lastExecutionTreeHash]);

  const nodeTypes = useMemo(
    () => ({
      executionNode: ExecutionNode,
    }),
    []
  );

  // Improved polling effect with better error handling and state management
  useEffect(() => {
    if ((!isRunning && !isPending) || !onRefresh) return;

    let isMounted = true;
    let refreshTimeout: NodeJS.Timeout;

    const performRefresh = async () => {
      if (!isMounted) return;

      try {
        setIsRefreshing(true);
        await onRefresh();
      } catch (error) {
        console.error("Failed to refresh execution tree:", error);
        // Don't show error toast for polling failures to avoid spam
      } finally {
        if (isMounted) {
          setIsRefreshing(false);
        }
      }
    };

    const scheduleNextRefresh = () => {
      if (!isMounted) return;
      refreshTimeout = setTimeout(() => {
        performRefresh().then(() => {
          if (isMounted && (isRunning || isPending)) {
            scheduleNextRefresh();
          }
        });
      }, 3000);
    };

    // Start the refresh cycle
    scheduleNextRefresh();

    return () => {
      isMounted = false;
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [isRunning, isPending, onRefresh]);

  // Ensure initialization happens after tree data is available
  useEffect(() => {
    if (executionTree && Object.keys(executionTree.execution_tree).length > 0) {
      const timer = setTimeout(() => setIsInitialized(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsInitialized(false);
    }
  }, [executionTree]);

  // Reset selected node when tree changes significantly
  useEffect(() => {
    if (executionTreeHash !== lastExecutionTreeHash) {
      setSelectedNode(null);
    }
  }, [executionTreeHash, lastExecutionTreeHash]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header - only show if not embedded */}
      {!embedded && (
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="outline" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Execution Tree
              </h1>
              <p className="text-sm text-gray-600">
                Execution #{executionId ? executionId.slice(-8) : "Unknown"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-600">
              {Object.keys(executionTree.execution_tree).length} nodes
            </div>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    setIsRefreshing(true);
                    await onRefresh();
                  } catch (error) {
                    console.error("Failed to refresh execution tree:", error);
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                disabled={isRefreshing}
                className="flex items-center gap-1"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                {(isRunning || isPending) && (
                  <span className="text-xs text-blue-600">
                    {isRunning ? "Running" : "Pending"} - Auto-refreshing
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        {/* Tree Visualization */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {!isInitialized ? (
            <LoadingSpinner />
          ) : nodes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-gray-400 mb-4">
                  <Workflow className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Execution Nodes
                </h3>
                <p className="text-gray-600">
                  {executionTree &&
                  Object.keys(executionTree.execution_tree).length > 0
                    ? "Execution tree data is available but could not be rendered."
                    : "No execution tree data available."}
                </p>
                {debugMode && (
                  <div className="mt-4 text-xs text-gray-500">
                    <div>Tree Hash: {executionTreeHash}</div>
                    <div>Last Hash: {lastExecutionTreeHash}</div>
                    <div>Nodes Count: {nodes.length}</div>
                    <div>Edges Count: {edges.length}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <ReactFlowProvider>
              <ReactFlowWrapper
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodeSelect={setSelectedNode}
                selectedNodeId={selectedNode?.id || null}
                executionTreeHash={executionTreeHash}
              />

              {/* Debug info */}
              {debugMode && (
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white p-2 rounded text-xs font-mono z-20">
                  <div>Selected Node: {selectedNode?.id || "None"}</div>
                  <div>Tree Hash: {executionTreeHash}</div>
                  <div>Nodes: {nodes.length}</div>
                  <div>Edges: {edges.length}</div>
                  <div>Initialized: {isInitialized ? "Yes" : "No"}</div>
                  <div>Refreshing: {isRefreshing ? "Yes" : "No"}</div>
                </div>
              )}

              {debugMode && (
                <DebugOverlay
                  nodes={nodes}
                  edges={edges}
                  executionTree={executionTree}
                />
              )}
            </ReactFlowProvider>
          )}
        </div>
      </div>

      {/* Side Panel for Node Details */}
      {selectedNode && (
        <NodeDetailsPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
};
