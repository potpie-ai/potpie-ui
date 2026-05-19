import React, { useState, useRef, useEffect, useMemo } from "react";
import { Check, Search, X, ChevronDown, Plus, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipPortal,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface Tool {
  id: string;
  name: string;
  description: string;
}

interface ToolSelectorProps {
  availableTools: Tool[];
  selectedTools: string[];
  isLoading?: boolean;
  onChange: (tools: string[]) => void;
  placeholderText?: string;
}

const ToolSelector: React.FC<ToolSelectorProps> = ({
  availableTools = [],
  selectedTools = [],
  isLoading = false,
  onChange,
  placeholderText = "Select tools...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Create maps for quick tool lookup
  const toolMapById = useMemo(() => {
    const map = new Map<string, Tool>();
    availableTools.forEach((tool) => {
      map.set(tool.id, tool);
    });
    return map;
  }, [availableTools]);

  const toolMapByName = useMemo(() => {
    const map = new Map<string, Tool>();
    availableTools.forEach((tool) => {
      map.set(tool.name.toLowerCase(), tool);
    });
    return map;
  }, [availableTools]);

  // Helper function to resolve tool references (could be ID or name)
  const resolveToolReference = useMemo(() => {
    return (toolRef: string): Tool | null => {
      // First try to find by ID
      const toolById = toolMapById.get(toolRef);
      if (toolById) return toolById;

      // If not found by ID, try to find by name (for backward compatibility)
      const toolByName = toolMapByName.get(toolRef.toLowerCase());
      return toolByName || null;
    };
  }, [toolMapById, toolMapByName]);

  // Keep track of unresolved tools to prevent them from being lost
  const unresolvedTools = useMemo(() => {
    return selectedTools.filter((toolRef) => !resolveToolReference(toolRef));
  }, [selectedTools, resolveToolReference]);

  // Get selected tool objects for display
  const selectedToolObjects = useMemo(() => {
    const resolved = selectedTools
      .map((toolRef) => resolveToolReference(toolRef))
      .filter(Boolean) as Tool[];

    console.log("[ToolSelector] Resolved tool objects:", resolved);
    return resolved;
  }, [selectedTools, resolveToolReference]);

  // Deduplicate selected tools based on ID (preferred) or name
  const deduplicatedSelectedTools = useMemo(() => {
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const unique: Tool[] = [];

    selectedToolObjects.forEach((tool) => {
      // Check if we already have this tool by ID
      if (seenIds.has(tool.id)) {
        return;
      }

      // Check if we already have this tool by name (case-insensitive)
      const normalizedName = tool.name.toLowerCase();
      if (seenNames.has(normalizedName)) {
        return;
      }

      // Add to both sets to prevent future duplicates
      seenIds.add(tool.id);
      seenNames.add(normalizedName);
      unique.push(tool);
    });

    return unique;
  }, [selectedToolObjects]);

  // Preserve unresolved tools by creating placeholder objects
  const preservedTools = useMemo(() => {
    const preserved: Tool[] = [];

    unresolvedTools.forEach((toolRef) => {
      // Create a placeholder tool object for unresolved tools
      const placeholderTool: Tool = {
        id: toolRef,
        name: toolRef, // Use the reference as the name for display
        description: `Tool: ${toolRef}`,
      };
      preserved.push(placeholderTool);
    });

    return preserved;
  }, [unresolvedTools]);

  // Combine resolved and preserved tools
  const allSelectedTools = useMemo(() => {
    return [...deduplicatedSelectedTools, ...preservedTools];
  }, [deduplicatedSelectedTools, preservedTools]);

  // Update parent with deduplicated tool IDs
  useEffect(() => {
    // Don't update if we're still loading and have existing selected tools
    if (isLoading && selectedTools.length > 0) {
      console.log(
        "[ToolSelector] Skipping update while loading with existing tools"
      );
      return;
    }

    const allToolIds = allSelectedTools.map((tool) => tool.id);
    if (JSON.stringify(allToolIds) !== JSON.stringify(selectedTools)) {
      console.log(
        "[ToolSelector] Updating parent with all tool IDs:",
        allToolIds
      );
      onChange(allToolIds);
    }
  }, [allSelectedTools, selectedTools, onChange, isLoading]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleToolToggle = (tool: Tool) => {
    const isSelected = allSelectedTools.some(
      (selected) => selected.id === tool.id
    );

    let updatedTools: Tool[];

    if (isSelected) {
      updatedTools = allSelectedTools.filter(
        (selected) => selected.id !== tool.id
      );
    } else {
      updatedTools = [...allSelectedTools, tool];
    }

    const updatedToolIds = updatedTools.map((t) => t.id);
    onChange(updatedToolIds);
  };

  const removeTool = (toolToRemove: Tool) => {
    const updatedTools = allSelectedTools.filter(
      (tool) => tool.id !== toolToRemove.id
    );
    const updatedToolIds = updatedTools.map((t) => t.id);
    onChange(updatedToolIds);
  };

  const selectAllTools = () => {
    const allToolIds = availableTools.map((tool) => tool.id);
    onChange(allToolIds);
  };

  const deselectAllTools = () => {
    onChange([]);
  };

  const getFilteredTools = () => {
    let filtered = availableTools;

    // Filter by search term if provided
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((tool) => {
        return (
          tool.name.toLowerCase().includes(searchLower) ||
          tool.description.toLowerCase().includes(searchLower)
        );
      });
    }

    // Filter out already selected tools
    filtered = filtered.filter((tool) => {
      return !allSelectedTools.some((selected) => selected.id === tool.id);
    });

    return filtered;
  };

  const filteredTools = getFilteredTools();

  const isToolSelected = (tool: Tool) => {
    return allSelectedTools.some((selected) => selected.id === tool.id);
  };

  // Debug logging
  useEffect(() => {
    console.log("[ToolSelector] Available tools:", availableTools);
    console.log("[ToolSelector] Selected tools (raw):", selectedTools);
    console.log("[ToolSelector] Selected tool objects:", selectedToolObjects);
    console.log(
      "[ToolSelector] Deduplicated tools:",
      deduplicatedSelectedTools
    );
  }, [
    availableTools,
    selectedTools,
    selectedToolObjects,
    deduplicatedSelectedTools,
  ]);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-3">
        {/* Selected tool pills */}
        <div className="flex flex-wrap gap-2 min-h-8">
          {allSelectedTools.length > 0 ? (
            allSelectedTools.map((tool) => (
              <Badge
                key={tool.id}
                variant="secondary"
                className="px-3 py-1.5 bg-accent/20 text-accent-foreground rounded-full text-xs font-medium flex items-center gap-1 hover:bg-accent/30 transition-colors"
              >
                {tool.name}
                <button
                  onClick={() => removeTool(tool)}
                  className="ml-1 text-accent-foreground/70 hover:text-accent-foreground transition-colors"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">
              No tools assigned
            </span>
          )}
        </div>

        {/* Tool selection popover */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full flex justify-between items-center hover:bg-accent/5 hover:border-accent/20 transition-colors"
            >
              <span className="flex items-center">
                <Plus className="h-4 w-4 mr-2 text-accent" />
                {allSelectedTools.length > 0
                  ? `${allSelectedTools.length} tools selected`
                  : placeholderText}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="w-[400px] p-0 max-h-[500px]"
            align="start"
            sideOffset={5}
          >
            <div className="flex flex-col border border-border/50 rounded-md bg-background/95 backdrop-blur-sm overflow-hidden max-h-[400px]">
              {/* Search header */}
              <div className="p-3 border-b border-border/50 bg-background/50 z-10">
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search tools..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 h-9 bg-background/50 border-border/50 focus:border-accent/50 text-white placeholder:text-white/60"
                    autoComplete="off"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tool listing with scrollable area */}
              <div
                className="custom-scrollbar overflow-y-auto flex-1 relative max-h-[250px] min-h-[100px] overflow-x-hidden"
                onWheel={(e) => e.stopPropagation()}
              >
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                  </div>
                ) : (
                  <div className="p-2 grid grid-cols-2 gap-2 h-full">
                    {filteredTools.length > 0 ? (
                      filteredTools.map((tool) => {
                        const isSelected = isToolSelected(tool);
                        return (
                          <div key={tool.id} className="relative">
                            <div
                              onClick={() => handleToolToggle(tool)}
                              className={`flex items-center p-2 rounded-md transition-all w-full cursor-pointer ${
                                isSelected
                                  ? "bg-accent text-accent-foreground shadow-sm hover:bg-accent/90"
                                  : "bg-muted/20 hover:bg-muted/40"
                              }`}
                            >
                              <span className="flex-1 text-sm truncate text-left mr-1 text-white">
                                {tool.name}
                              </span>

                              {isSelected ? (
                                <Check className="h-4 w-4 flex-shrink-0" />
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                      className="p-1 hover:bg-muted/20 rounded"
                                      type="button"
                                    >
                                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipPortal>
                                    <TooltipContent
                                      side="right"
                                      align="start"
                                      className="max-w-[250px] z-[9999] bg-white border shadow-lg p-2"
                                      collisionPadding={20}
                                    >
                                      <p className="text-sm">
                                        {tool.description}
                                      </p>
                                    </TooltipContent>
                                  </TooltipPortal>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-2 py-8 text-center text-muted-foreground">
                        No tools match your search
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="p-2 flex justify-between items-center border-t border-border/50 bg-background/50 z-10">
                <div className="text-xs text-muted-foreground">
                  {allSelectedTools.length} of {availableTools.length} tools
                  selected
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAllTools}
                    className="text-xs h-8 px-2 hover:bg-accent/5 hover:text-accent hover:border-accent/20"
                    type="button"
                  >
                    Clear
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={selectAllTools}
                    className="text-xs h-8 px-2 bg-accent hover:bg-accent/90 text-green-800"
                    type="button"
                  >
                    Select All
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
};

/* Add explicit scrollbar styles directly within this component file */
<style jsx global>{`
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px; /* Width of the vertical scrollbar */
    height: 6px; /* Height of the horizontal scrollbar */
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent; /* Make the track invisible */
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: hsl(var(--muted-foreground) / 0.3); /* Use theme color */
    border-radius: 3px; /* Round the corners */
    border: 1px solid transparent; /* Creates padding around thumb */
    background-clip: content-box; /* Ensures border acts as padding */
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: hsl(var(--muted-foreground) / 0.5); /* Darker on hover */
  }

  /* Basic Firefox scrollbar styling */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent; /* thumb color track color */
  }
`}</style>;

export default ToolSelector;
