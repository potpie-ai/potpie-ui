import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Edit, Save, X, ChevronDown, ChevronUp, Plus, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import AgentService from "@/services/AgentService";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

interface Agent {
  id: string;
  system_prompt: string;
  role: string;
  goal: string;
  backstory: string;
  tasks: Array<{
    description: string;
    tools?: string[];
    expected_output?: any;
  }>;
  tools: string[];
}

interface AgentReviewPanelProps {
  generatedAgent: Agent;
  onEdit: () => void;
  onSave: (agent: Agent) => void;
  availableTools: Array<{ name: string; description: string }>;
  isLoadingTools?: boolean;
}

// Interface for task-specific tool state
interface TaskToolState {
  searchTerm: string;
}

const AgentReviewPanel: React.FC<AgentReviewPanelProps> = ({
  generatedAgent,
  onEdit,
  onSave,
  availableTools: propAvailableTools = [],
  isLoadingTools: propIsLoadingTools = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedAgent, setEditedAgent] = useState<Agent>(generatedAgent);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for task-specific tool management
  const [taskToolStates, setTaskToolStates] = useState<Record<number, TaskToolState>>({});

  // Fetch tools directly in the component
  const fetchTools = async () => {
    const header = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const response = await axios.get(`${baseUrl}/api/v1/tools/list_tools`, {
      headers: header,
    });
    return response.data;
  };

  const { data: toolsData, isLoading: toolsLoading } = useQuery({
    queryKey: ["tools"],
    queryFn: fetchTools,
    enabled: isEditing, // Only fetch tools when in edit mode
  });

  // Use either the props or the fetched data
  const availableTools = isEditing && toolsData ? toolsData : propAvailableTools;
  const isLoadingTools = isEditing ? toolsLoading : propIsLoadingTools;

  // Initialize task tool states if not already set
  useEffect(() => {
    if (editedAgent.tasks) {
      const initialStates: Record<number, TaskToolState> = {};
      editedAgent.tasks.forEach((_: any, index: number) => {
        initialStates[index] = {
          searchTerm: ""
        };
      });
      setTaskToolStates(initialStates);
    }
  }, [editedAgent.tasks]);

  useEffect(() => {
    if (isEditing) {
      setEditedAgent(generatedAgent);
    }
  }, [isEditing, generatedAgent]);

  useEffect(() => {
    if (isSaving) {
      onSave(editedAgent);
      setIsSaving(false);
    }
  }, [isSaving, editedAgent, onSave]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSave = useCallback(() => {
    setIsSaving(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditedAgent(generatedAgent);
  }, [generatedAgent]);

  const handleInputChange = useCallback((field: keyof Agent, value: string) => {
    setEditedAgent((prev: Agent) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleTaskChange = useCallback((index: number, field: string, value: any) => {
    setEditedAgent((prev: Agent) => ({
      ...prev,
      tasks: prev.tasks.map((task, i) =>
        i === index ? { ...task, [field]: value } : task
      ),
    }));
  }, []);

  const handleToolToggle = useCallback((toolId: string) => {
    setEditedAgent((prev: Agent) => ({
      ...prev,
      tools: prev.tools.includes(toolId)
        ? prev.tools.filter((id: string) => id !== toolId)
        : [...prev.tools, toolId],
    }));
  }, []);

  // Helper function to handle tool selection for a specific task
  const handleTaskToolChange = (taskIndex: number, toolName: string, checked: boolean) => {
    const updatedTasks = [...editedAgent.tasks];
    const task = updatedTasks[taskIndex];
    
    // Initialize tools array if it doesn't exist
    if (!task.tools) {
      task.tools = [];
    }
    
    if (checked) {
      // Add tool if not already selected
      if (!task.tools.includes(toolName)) {
        task.tools = [...task.tools, toolName];
      }
    } else {
      // Remove tool if selected
      task.tools = task.tools.filter((t: string) => t !== toolName);
    }
    
    setEditedAgent({...editedAgent, tasks: updatedTasks});
  };

  // Select all tools for a specific task
  const selectAllToolsForTask = (taskIndex: number) => {
    const updatedTasks = [...editedAgent.tasks];
    const task = updatedTasks[taskIndex];
    
    // Initialize tools array if it doesn't exist
    if (!task.tools) {
      task.tools = [];
    }
    
    // Add all tools that aren't already selected
    const newTools = [...new Set([...task.tools, ...availableTools.map((tool: { name: string }) => tool.name)])];
    updatedTasks[taskIndex] = {...task, tools: newTools};
    
    setEditedAgent({...editedAgent, tasks: updatedTasks});
  };

  // Deselect all tools for a specific task
  const deselectAllToolsForTask = (taskIndex: number) => {
    const updatedTasks = [...editedAgent.tasks];
    const task = updatedTasks[taskIndex];
    
    // Initialize tools array if it doesn't exist
    if (!task.tools) {
      task.tools = [];
    }
    
    // Remove all tools
    updatedTasks[taskIndex] = {...task, tools: []};
    
    setEditedAgent({...editedAgent, tasks: updatedTasks});
  };

  // Update search term for a specific task
  const updateTaskToolSearch = (taskIndex: number, searchTerm: string) => {
    setTaskToolStates({
      ...taskToolStates,
      [taskIndex]: {
        ...taskToolStates[taskIndex],
        searchTerm
      }
    });
  };

  // Filter tools based on search term
  const getFilteredTools = (taskIndex: number) => {
    const searchTerm = taskToolStates[taskIndex]?.searchTerm?.toLowerCase() || "";
    return availableTools.filter((tool: { name: string; description: string }) => 
      tool.name.toLowerCase().includes(searchTerm) || 
      tool.description.toLowerCase().includes(searchTerm)
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col max-h-[80vh] h-full relative">
        {/* Add custom scrollbar styles */}
        <style jsx global>{`
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #d1d5db transparent;
          }
          
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #d1d5db;
            border-radius: 4px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #9ca3af;
          }
        `}</style>
        <div className="flex-1 min-h-0 overflow-hidden">
          <Tabs defaultValue="system" className="h-full flex flex-col">
            <TabsList className="w-full flex-none flex justify-center gap-1 mb-6 p-1 bg-background border rounded-lg z-10">
              <TabsTrigger 
                value="system" 
                className="flex-1 py-2.5 rounded-md text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                System Configuration
              </TabsTrigger>
              <TabsTrigger 
                value="identity" 
                className="flex-1 py-2.5 rounded-md text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Agent Identity
              </TabsTrigger>
              <TabsTrigger 
                value="tasks" 
                className="flex-1 py-2.5 rounded-md text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Tasks
              </TabsTrigger>
            </TabsList>

            {/* Main content area */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <TabsContent
                value="system"
                className="h-full mt-0 data-[state=active]:flex flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto space-y-4 p-4 pb-24 custom-scrollbar"> {/* Added pb-24 to create space for bottom buttons and custom-scrollbar class */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground sticky top-0 bg-background py-2 z-10">
                      System Prompt
                    </h3>
                    <div className="bg-background rounded-lg p-6 border shadow-sm">
                      {isEditing ? (
                        <Textarea
                          value={editedAgent.system_prompt}
                          onChange={(e) => handleInputChange('system_prompt', e.target.value)}
                          className="min-h-[250px] text-sm w-full resize-vertical"
                        />
                      ) : (
                        <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground">
                          {editedAgent.system_prompt}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="identity"
                className="h-full mt-0 data-[state=active]:flex flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto space-y-6 p-4 pb-24 custom-scrollbar"> {/* Added pb-24 to create space for bottom buttons and custom-scrollbar class */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground sticky top-0 bg-background py-2 z-10">
                      Role
                    </h3>
                    <div className="bg-background rounded-lg p-6 border shadow-sm">
                      {isEditing ? (
                        <Textarea
                          value={editedAgent.role}
                          onChange={(e) => handleInputChange('role', e.target.value)}
                          className="min-h-[120px] text-sm w-full resize-vertical"
                        />
                      ) : (
                        <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground">
                          {editedAgent.role}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground sticky top-0 bg-background py-2 z-10">
                      Goal
                    </h3>
                    <div className="bg-background rounded-lg p-6 border shadow-sm">
                      {isEditing ? (
                        <Textarea
                          value={editedAgent.goal}
                          onChange={(e) => handleInputChange('goal', e.target.value)}
                          className="min-h-[120px] text-sm w-full resize-vertical"
                        />
                      ) : (
                        <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground">
                          {editedAgent.goal}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground sticky top-0 bg-background py-2 z-10">
                      Backstory
                    </h3>
                    <div className="bg-background rounded-lg p-6 border shadow-sm">
                      {isEditing ? (
                        <Textarea
                          value={editedAgent.backstory}
                          onChange={(e) => handleInputChange('backstory', e.target.value)}
                          className="min-h-[120px] text-sm w-full resize-vertical"
                        />
                      ) : (
                        <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground">
                          {editedAgent.backstory}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="tasks"
                className="h-full mt-0 data-[state=active]:flex flex-col overflow-hidden"
              >
                <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-4 pb-24 custom-scrollbar">
                  <div className="space-y-6">
                    {editedAgent.tasks?.map((task: any, index: number) => (
                      <div key={index} className="bg-background rounded-lg border shadow-sm">
                        {/* Task header - not sticky anymore since we have task-level scroll */}
                        <div className="p-6 border-b bg-background">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-foreground">
                              Task {index + 1}
                            </h3>
                            <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                              {task.type || "Custom Task"}
                            </span>
                          </div>
                        </div>
                        
                        {/* Task content - each section gets its own scroll */}
                        <div className="p-6">
                          <div className="space-y-6">
                            {/* Description section */}
                            <div className="w-full">
                              <h4 className="text-sm font-medium mb-2 text-foreground">
                                Description
                              </h4>
                              <div className="bg-muted/30 rounded-lg p-4 max-h-[200px] overflow-y-auto">
                                {isEditing ? (
                                  <Textarea
                                    value={task.description}
                                    onChange={(e) => handleTaskChange(index, 'description', e.target.value)}
                                    className="min-h-[160px] text-sm w-full resize-vertical"
                                  />
                                ) : (
                                  <div className="overflow-y-auto max-h-full">
                                    <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground">
                                      {task.description}
                                    </ReactMarkdown>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Tools section */}
                            <div className="w-full">
                              <h4 className="text-sm font-medium mb-2 text-foreground">
                                Tools
                              </h4>
                              <div className="bg-muted/30 rounded-lg p-4 max-h-[200px] overflow-y-auto">
                                {isEditing ? (
                                  <div className="space-y-4">
                                    {/* Show currently selected tools as tags/pills */}
                                    <div className="flex flex-wrap gap-2 mb-3">
                                      {task.tools && task.tools.length > 0 ? (
                                        task.tools.map((tool: string, toolIndex: number) => (
                                          <Badge 
                                            key={toolIndex}
                                            variant="secondary"
                                            className="px-3 py-1.5 bg-primary/20 text-primary rounded-full text-xs font-medium flex items-center gap-1"
                                          >
                                            {tool}
                                            <button 
                                              onClick={() => handleTaskToolChange(index, tool, false)}
                                              className="ml-1 text-primary hover:text-primary/80"
                                            >
                                              <X className="h-3 w-3" />
                                            </button>
                                          </Badge>
                                        ))
                                      ) : (
                                        <span className="text-sm text-muted-foreground">No tools assigned</span>
                                      )}
                                    </div>
                                    
                                    {/* Popover for tool selection */}
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button 
                                          variant="outline" 
                                          className="w-full flex justify-between items-center"
                                        >
                                          <span className="flex items-center">
                                            <Plus className="h-4 w-4 mr-2" />
                                            {task.tools?.length ? `${task.tools.length} tools selected` : "Select tools..."}
                                          </span>
                                          <ChevronDown className="h-4 w-4" />
                                        </Button>
                                      </PopoverTrigger>
                                      
                                      <PopoverContent 
                                        className="w-[350px] p-0 bg-popover" 
                                        align="start"
                                        sideOffset={5}
                                      >
                                        <div className="grid gap-0 bg-background rounded-md shadow-sm">
                                          <div className="p-3 border-b">
                                            <Input
                                              placeholder="Search tools..."
                                              value={taskToolStates[index]?.searchTerm || ""}
                                              onChange={(e) => updateTaskToolSearch(index, e.target.value)}
                                              className="w-full"
                                            />
                                          </div>
                                          
                                          <div className="p-2 flex gap-2 border-b bg-muted/50">
                                            <Button 
                                              variant="outline" 
                                              size="sm"
                                              onClick={() => selectAllToolsForTask(index)}
                                              className="flex-1"
                                            >
                                              <Check className="h-4 w-4 mr-2" />
                                              Select All
                                            </Button>
                                            <Button 
                                              variant="outline" 
                                              size="sm"
                                              onClick={() => deselectAllToolsForTask(index)}
                                              className="flex-1"
                                            >
                                              <X className="h-4 w-4 mr-2" />
                                              Deselect All
                                            </Button>
                                          </div>
                                          
                                          {/* Tool list with checkboxes */}
                                          {isLoadingTools ? (
                                            <div className="flex justify-center items-center py-4">
                                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                            </div>
                                          ) : (
                                            <div className="max-h-[300px] overflow-y-auto">
                                              {getFilteredTools(index).map((tool: { name: string; description: string }) => (
                                                <Tooltip key={tool.name}>
                                                  <TooltipTrigger asChild>
                                                    <div 
                                                      className={`flex items-start space-x-3 p-2 hover:bg-muted/50 cursor-pointer transition-colors ${
                                                        task.tools?.includes(tool.name) ? "bg-muted/30" : ""
                                                      }`}
                                                      onClick={() => handleTaskToolChange(index, tool.name, !task.tools?.includes(tool.name))}
                                                    >
                                                      <Checkbox
                                                        id={`task-${index}-tool-${tool.name}`}
                                                        checked={task.tools?.includes(tool.name) || false}
                                                        onCheckedChange={(checked) => handleTaskToolChange(index, tool.name, Boolean(checked))}
                                                      />
                                                      <div className="flex-1">
                                                        <label
                                                          htmlFor={`task-${index}-tool-${tool.name}`}
                                                          className="text-sm font-medium cursor-pointer"
                                                        >
                                                          {tool.name}
                                                        </label>
                                                      </div>
                                                    </div>
                                                  </TooltipTrigger>
                                                  <TooltipContent 
                                                    side="right" 
                                                    align="start" 
                                                    className="max-w-[300px]"
                                                    sideOffset={5}
                                                  >
                                                    <p className="text-sm">{tool.description}</p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {task.tools && task.tools.length > 0 ? (
                                      task.tools.map((tool: string, toolIndex: number) => (
                                        <Badge
                                          key={toolIndex}
                                          variant="secondary"
                                          className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-xs font-medium"
                                        >
                                          {tool}
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-sm text-muted-foreground">No tools assigned</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Expected Output section */}
                            {task.expected_output && (
                              <div className="w-full">
                                <h4 className="text-sm font-medium mb-2 text-foreground">
                                  Expected Output
                                </h4>
                                <div className="bg-muted/30 rounded-lg p-4 max-h-[200px] overflow-y-auto">
                                  {isEditing ? (
                                    <Textarea
                                      value={JSON.stringify(task.expected_output, null, 2)}
                                      onChange={(e) => {
                                        try {
                                          const parsedOutput = JSON.parse(e.target.value);
                                          handleTaskChange(index, 'expected_output', parsedOutput);
                                        } catch (error) {}
                                      }}
                                      className="min-h-[160px] text-sm font-mono w-full resize-vertical"
                                    />
                                  ) : (
                                    <div className="overflow-y-auto max-h-full">
                                      <pre className="text-sm whitespace-pre-wrap overflow-x-auto max-w-full">
                                        {JSON.stringify(task.expected_output, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sticky bottom-0 left-0 right-0 p-4 bg-background border-t flex-none">
                  {isEditing ? (
                    <div className="flex gap-2 w-full">
                      <Button variant="outline" onClick={handleCancel} className="flex-1">
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button onClick={handleSave} className="flex-1" disabled={isSaving}>
                        {isSaving ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Saving...
                          </div>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={handleEdit} className="w-full">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Agent Configuration
                    </Button>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default AgentReviewPanel;