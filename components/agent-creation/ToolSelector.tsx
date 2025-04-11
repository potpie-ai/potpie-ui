import React, { useState, useRef, useEffect } from 'react';
import { 
  Check, 
  Search, 
  X,
  ChevronDown,
  Plus,
  Info
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipPortal,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface Tool {
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
  placeholderText = "Select tools..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedCount, setSelectedCount] = useState(selectedTools.length);
  
  // Helper function to normalize tool names for comparison
  const normalizeToolName = (name: string): string => {
    return name.toLowerCase().replace(/[ -]/g, '_');
  };
  
  // Helper function to check if a tool is selected using normalized names
  const isToolSelected = (toolName: string) => {
    const normalizedName = normalizeToolName(toolName);
    return selectedTools.some(selected => normalizeToolName(selected) === normalizedName);
  };
  
  // Update selected count whenever selectedTools changes
  useEffect(() => {
    setSelectedCount(selectedTools.length);
  }, [selectedTools]);
  
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);
  
  const handleToolToggle = (toolName: string) => {
    const normalizedToolName = normalizeToolName(toolName);
    const isSelected = selectedTools.some(selected => 
      normalizeToolName(selected) === normalizedToolName
    );
    
    let updatedTools: string[];
    
    if (isSelected) {
      updatedTools = selectedTools.filter(name => 
        normalizeToolName(name) !== normalizedToolName
      );
    } else {
      // Use the original format from the tool object if possible, or the provided name
      const toolObject = availableTools.find(t => normalizeToolName(t.name) === normalizedToolName);
      const nameToAdd = toolObject ? toolObject.name : toolName;
      updatedTools = [...selectedTools, nameToAdd];
    }
    
    onChange(updatedTools);
  };
  
  const selectAllTools = () => {
    onChange(availableTools.map(tool => tool.name));
  };
  
  const deselectAllTools = () => {
    onChange([]);
  };
  
  const getFilteredTools = () => {
    if (!searchTerm) return availableTools;
    
    return availableTools.filter(tool => {
      return tool.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    });
  };
  
  const filteredTools = getFilteredTools();
  
  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-3">
        {/* Selected tool badges */}
        <div className="flex flex-wrap gap-2 min-h-8">
          {selectedTools.length > 0 ? (
            selectedTools.map((toolName) => (
              <Badge 
                key={toolName}
                variant="secondary"
                className="px-3 py-1.5 bg-accent/20 text-accent-foreground rounded-full text-xs font-medium flex items-center gap-1 hover:bg-accent/30 transition-colors"
              >
                {toolName}
                <button 
                  onClick={() => handleToolToggle(toolName)}
                  className="ml-1 text-accent-foreground/70 hover:text-accent-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">No tools assigned</span>
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
                {selectedCount > 0 ? `${selectedCount} tools selected` : placeholderText}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          
          <PopoverContent 
            className="w-[400px] p-0"
            align="start"
            sideOffset={5}
          >
            <div className="flex flex-col border border-border/50 rounded-md bg-background/95 backdrop-blur-sm overflow-hidden">
              {/* Search header */}
              <div className="p-3 border-b border-border/50 bg-background/50 z-10">
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search tools..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 h-9 bg-background/50 border-border/50 focus:border-accent/50"
                    autoComplete="off"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Tool listing with scrollable area */}
              <div 
                className="custom-scrollbar" 
                style={{ maxHeight: '350px', overflowY: 'auto' }}
              >
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                  </div>
                ) : (
                  <div className="p-2 grid grid-cols-2 gap-2">
                    {filteredTools.length > 0 ? (
                      filteredTools.map((tool) => {
                        const isSelected = isToolSelected(tool.name);
                        return (
                          <div key={tool.name} className="relative">
                            <div 
                              onClick={() => handleToolToggle(tool.name)}
                              className={`flex items-center p-2 rounded-md transition-all w-full cursor-pointer ${
                                isSelected
                                  ? 'bg-accent text-accent-foreground shadow-sm hover:bg-accent/90'
                                  : 'bg-muted/20 hover:bg-muted/40'
                              }`}
                            >
                              <span className="flex-1 text-sm truncate text-left mr-1">
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
                                    >
                                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipPortal>
                                    <TooltipContent 
                                      side="right" 
                                      align="start"
                                      className="max-w-[250px] z-[9999] bg-background border shadow-lg p-2"
                                      collisionPadding={20}
                                    >
                                      <p className="text-sm">{tool.description}</p>
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
                  {selectedCount} of {availableTools.length} tools selected
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={deselectAllTools}
                    className="text-xs h-8 px-2 hover:bg-accent/5 hover:text-accent hover:border-accent/20"
                  >
                    Clear
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={selectAllTools}
                    className="text-xs h-8 px-2 bg-accent hover:bg-accent/90"
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
    width: 8px; /* Width of the vertical scrollbar */
    height: 8px; /* Height of the horizontal scrollbar */
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent; /* Make the track invisible */
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #cbd5e1; /* A slightly visible gray for the thumb */
    border-radius: 4px; /* Round the corners */
    border: 2px solid transparent; /* Creates padding around thumb */
    background-clip: content-box; /* Ensures border acts as padding */
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: #a0aec0; /* Darker gray on hover */
  }

  /* Basic Firefox scrollbar styling */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent; /* thumb color track color */
  }
`}</style>

export default ToolSelector;