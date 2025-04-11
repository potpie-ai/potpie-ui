import React, { useState, useEffect } from 'react';
import { Search, Check, X, Move, GripHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface Tool {
  name: string;
  description: string;
}

interface ToolSelectorProps {
  availableTools: Tool[];
  selectedTools: string[];
  onToolsChange: (tools: string[]) => void;
  isLoading?: boolean;
}

// Tool item type for drag and drop
const TOOL_ITEM_TYPE = 'tool';

// DraggableTool component
const DraggableTool = ({ tool, isSelected, onToggle, index }: { 
  tool: Tool; 
  isSelected: boolean; 
  onToggle: (tool: Tool) => void; 
  index: number;
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: TOOL_ITEM_TYPE,
    item: { tool, isSelected, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [tool, isSelected, index]);

  return (
    <div
      ref={drag as any}
      className={`flex items-center justify-between p-2.5 rounded-md mb-1 cursor-move border ${
        isSelected ? 'bg-primary/10 border-primary/20' : 'bg-background border-border/30 hover:bg-muted/30'
      } ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center flex-1 gap-2">
            <GripHorizontal className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate">{tool.name}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{tool.description}</p>
        </TooltipContent>
      </Tooltip>
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-6 w-6 p-0 rounded-full"
        onClick={() => onToggle(tool)}
      >
        {isSelected ? (
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Check className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
};

// ToolDropZone component
const ToolDropZone = ({ 
  title, 
  tools, 
  onDrop, 
  allowedDropEffect, 
  onToggle, 
  searchTerm = "" 
}: { 
  title: string;
  tools: Tool[];
  onDrop: (tool: Tool, effect: string) => void;
  allowedDropEffect: string;
  onToggle: (tool: Tool) => void;
  searchTerm?: string;
}) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: TOOL_ITEM_TYPE,
    drop: (item: { tool: Tool; isSelected: boolean }) => {
      onDrop(item.tool, allowedDropEffect);
      return { name: allowedDropEffect };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
    canDrop: (item: { tool: Tool; isSelected: boolean }) => {
      return allowedDropEffect === 'add' ? !item.isSelected : item.isSelected;
    },
  }), [allowedDropEffect, onDrop]);

  // Filter tools based on search term if provided
  const filteredTools = searchTerm
    ? tools.filter(tool => 
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        tool.description.toLowerCase().includes(searchTerm.toLowerCase()))
    : tools;

  return (
    <div 
      ref={drop as any}
      className={`flex-1 border rounded-md p-3 ${
        isOver && canDrop ? 'bg-primary/5 border-primary/20' : 'bg-background'
      }`}
    >
      <h3 className="text-sm font-medium mb-3 text-foreground flex items-center justify-between">
        <span>{title}</span>
        <Badge variant="outline" className="text-xs">
          {filteredTools.length}
        </Badge>
      </h3>
      
      <ScrollArea className="h-[300px] pr-3">
        {filteredTools.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {searchTerm ? "No matching tools found" : "No tools available"}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTools.map((tool, index) => (
              <DraggableTool
                key={tool.name}
                tool={tool}
                isSelected={allowedDropEffect === 'remove'}
                onToggle={onToggle}
                index={index}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

// Main ToolSelector component
const ToolSelector: React.FC<ToolSelectorProps> = ({ 
  availableTools = [], 
  selectedTools = [], 
  onToolsChange,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [availableList, setAvailableList] = useState<Tool[]>([]);
  const [selectedList, setSelectedList] = useState<Tool[]>([]);

  useEffect(() => {
    // Filter out selected tools from available tools
    const selected = selectedTools.map(name => 
      availableTools.find(tool => tool.name === name) || { name, description: '' }
    );
    
    const available = availableTools.filter(
      tool => !selectedTools.includes(tool.name)
    );

    setAvailableList(available);
    setSelectedList(selected);
  }, [availableTools, selectedTools]);

  // Handle tool drop
  const handleDrop = (tool: Tool, dropEffect: string) => {
    let newSelectedTools;
    
    if (dropEffect === 'add') {
      // Add the tool to selected
      newSelectedTools = [...selectedTools, tool.name];
    } else {
      // Remove the tool from selected
      newSelectedTools = selectedTools.filter(name => name !== tool.name);
    }
    
    onToolsChange(newSelectedTools);
  };

  // Handle tool toggle
  const handleToggle = (tool: Tool) => {
    const isSelected = selectedTools.includes(tool.name);
    let newSelectedTools;
    
    if (isSelected) {
      newSelectedTools = selectedTools.filter(name => name !== tool.name);
    } else {
      newSelectedTools = [...selectedTools, tool.name];
    }
    
    onToolsChange(newSelectedTools);
  };

  // Select all available tools
  const handleSelectAll = () => {
    const allToolNames = availableTools.map(tool => tool.name);
    onToolsChange(allToolNames);
  };

  // Deselect all tools
  const handleDeselectAll = () => {
    onToolsChange([]);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            className="pl-9 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-4 h-[300px]">
          {isLoading ? (
            <div className="flex-1 border rounded-md p-3 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <ToolDropZone
                title="Available Tools"
                tools={availableList}
                onDrop={handleDrop}
                allowedDropEffect="add"
                onToggle={handleToggle}
                searchTerm={searchTerm}
              />
              
              <ToolDropZone
                title="Selected Tools"
                tools={selectedList}
                onDrop={handleDrop}
                allowedDropEffect="remove"
                onToggle={handleToggle}
                searchTerm={searchTerm}
              />
            </>
          )}
        </div>
        
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSelectAll}
            disabled={isLoading}
          >
            <Check className="h-4 w-4 mr-2" />
            Select All
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDeselectAll}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Deselect All
          </Button>
        </div>
      </div>
    </DndProvider>
  );
};

export default ToolSelector; 