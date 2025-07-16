import { FC, useState, useMemo } from "react";
import { NodeType, NodeCategory } from "@/services/WorkflowService";
import { getNodeColors } from "../nodes/color_utils";
import { availableNodes } from "../nodes";
import type { NodeInfo } from "../nodes";
import { Search, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { useNodeDrag } from "../hooks/useWorkflowDnD";
import { DragPreview } from "./DragPreview";

/**
 * Props for the NodePalette component
 */
interface NodePaletteProps {
  /** Callback when node dragging starts */
  onNodeDragStart?: (nodeType: NodeType) => void;
}

/**
 * Props for the DraggableNode component
 */
interface DraggableNodeProps {
  /** Node information */
  nodeInfo: NodeInfo;
  /** Color scheme for the node */
  colors: { primary: string; secondary: string };
  /** Icon component for the node */
  IconComponent: React.ComponentType<any>;
  /** Callback when dragging starts */
  onDragStart: (nodeInfo: NodeInfo) => void;
}

/**
 * Draggable Node Component
 *
 * Represents a draggable node in the palette that can be dragged onto the canvas.
 * Shows node information and handles drag interactions.
 */
const DraggableNode: FC<DraggableNodeProps> = ({
  nodeInfo,
  colors,
  IconComponent,
  onDragStart,
}) => {
  const { isDragging, drag } = useNodeDrag({
    type: nodeInfo.type,
    category: nodeInfo.category,
    group: nodeInfo.group,
    name: nodeInfo.name,
    description: nodeInfo.description,
    icon: nodeInfo.icon,
  });

  const handleDragStart = () => {
    onDragStart(nodeInfo);
  };

  return (
    <div style={{ position: "relative" }}>
      {!isDragging && (
        <Card
          ref={(node) => {
            if (node) drag(node);
          }}
          className={`cursor-move hover:shadow-lg transition-all duration-200 ease-in-out border-gray-200 group relative hover:border-blue-300 h-28 flex flex-col`}
          onMouseDown={handleDragStart}
        >
          <CardContent className="p-3 h-full flex flex-col">
            <div className="flex items-center mb-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center mr-2"
                style={{ backgroundColor: colors.secondary }}
              >
                <IconComponent
                  className="w-4 h-4"
                  style={{ color: colors.primary }}
                />
              </div>
              <span className="text-sm font-medium text-gray-800 flex-1">
                {nodeInfo.name}
              </span>
              <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" />
            </div>
            <p className="text-xs text-gray-600 leading-relaxed mb-auto">
              {nodeInfo.description}
            </p>
          </CardContent>
        </Card>
      )}
      {isDragging && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
            zIndex: 1000,
          }}
        >
          <DragPreview nodeInfo={nodeInfo} />
        </div>
      )}
    </div>
  );
};

/**
 * NodePalette Component
 *
 * A component that provides a node palette for dragging nodes onto the canvas.
 * Features search and category filtering.
 *
 * Features:
 * - Node palette with search and category filtering
 * - Drag and drop functionality for nodes
 *
 * @param props - Component props
 * @returns JSX element
 */
export const NodePalette: FC<NodePaletteProps> = ({ onNodeDragStart }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    NodeCategory | "ALL"
  >("ALL");

  const handleNodeDragStart = (nodeInfo: NodeInfo) => {
    if (onNodeDragStart) {
      onNodeDragStart(nodeInfo.type);
    }
  };

  // Filter nodes based on search query and selected category
  const filteredNodes = useMemo(() => {
    return availableNodes.filter((node) => {
      const matchesSearch =
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "ALL" || node.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const groupedNodes = filteredNodes.reduce(
    (acc, node) => {
      if (!acc[node.category]) {
        acc[node.category] = [];
      }
      acc[node.category].push(node);
      return acc;
    },
    {} as Record<NodeCategory, NodeInfo[]>
  );

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("ALL");
  };

  const hasActiveFilters = searchQuery || selectedCategory !== "ALL";

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800 whitespace-nowrap">
                Add Nodes to Canvas
              </h3>
            </div>
            <Badge
              variant="secondary"
              className="text-xs bg-blue-100 text-blue-700 border-blue-200"
            >
              Drag & Drop
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
              <Input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2">
              <Badge
                variant={selectedCategory === "ALL" ? "default" : "outline"}
                className={`cursor-pointer ${
                  selectedCategory !== "ALL" ? "hover:bg-blue-50" : ""
                }`}
                onClick={() => setSelectedCategory("ALL")}
              >
                All
              </Badge>
              {Object.values(NodeCategory).map((category) => (
                <Badge
                  key={category}
                  variant={
                    selectedCategory === category ? "default" : "outline"
                  }
                  className={`cursor-pointer ${
                    selectedCategory !== category ? "hover:bg-blue-50" : ""
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category.replace("_", " ")}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Drag any node below onto the canvas to add it to your workflow
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="p-4">
          {Object.keys(groupedNodes).length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <Search className="w-8 h-8 mx-auto" />
              </div>
              <p className="text-sm text-gray-500">
                {hasActiveFilters
                  ? "No nodes match your search criteria"
                  : "No nodes available"}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-2 text-xs"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            Object.entries(groupedNodes).map(([category, nodes]) => (
              <div key={category} className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3 capitalize">
                  {category.replace("_", " ")}s
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {nodes.map((nodeInfo) => {
                    const colors = getNodeColors(nodeInfo.group);
                    const IconComponent = nodeInfo.icon;

                    return (
                      <DraggableNode
                        key={nodeInfo.type}
                        nodeInfo={nodeInfo}
                        colors={colors}
                        IconComponent={IconComponent}
                        onDragStart={handleNodeDragStart}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
