import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Edit,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import AgentService from "@/services/AgentService";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import ToolSelector from "@/components/agent-creation/ToolSelector";
import { CustomAgentsFormValues } from "@/lib/Schema";

interface AgentReviewPanelProps {
  generatedAgent: CustomAgentsFormValues;
  onEdit: () => void;
  onSave: (agent: CustomAgentsFormValues) => void;
  availableTools: Array<{ name: string; description: string }>;
  isLoadingTools?: boolean;
  footerHeight?: number;
}

interface TaskToolState {
  searchTerm: string;
}

const AgentReviewPanel: React.FC<AgentReviewPanelProps> = ({
  generatedAgent,
  onEdit,
  onSave,
  availableTools: propAvailableTools = [],
  isLoadingTools: propIsLoadingTools = false,
  footerHeight = 60,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedAgent, setEditedAgent] =
    useState<CustomAgentsFormValues>(generatedAgent);
  const [isSaving, setIsSaving] = useState(false);

  const [taskToolStates, setTaskToolStates] = useState<
    Record<number, TaskToolState>
  >({});

  // Log when the component receives props
  useEffect(() => {
    console.log(
      "[AgentReviewPanel] Generated agent tools:",
      generatedAgent.tools
    );
  }, [generatedAgent]);

  const fetchTools = async () => {
    const header = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const response = await axios.get(`${baseUrl}/api/v1/tools/list_tools`, {
      headers: header,
    });
    console.log("[AgentReviewPanel] Fetched tools:", response.data);
    return response.data;
  };

  const { data: toolsData, isLoading: toolsLoading } = useQuery({
    queryKey: ["tools"],
    queryFn: fetchTools,
    enabled: isEditing,
  });

  const availableTools =
    isEditing && toolsData ? toolsData : propAvailableTools;
  const isLoadingTools = isEditing ? toolsLoading : propIsLoadingTools;

  useEffect(() => {
    if (editedAgent.tasks) {
      const initialStates: Record<number, TaskToolState> = {};
      editedAgent.tasks.forEach((_: any, index: number) => {
        initialStates[index] = {
          searchTerm: "",
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

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSave = useCallback(() => {
    setIsSaving(true);
    onSave(editedAgent);
    setIsSaving(false);
    setIsEditing(false);
  }, [editedAgent, onSave]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditedAgent(generatedAgent);
  }, [generatedAgent]);

  const handleInputChange = useCallback(
    (field: keyof CustomAgentsFormValues, value: string) => {
      setEditedAgent((prev: CustomAgentsFormValues) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  const handleTaskChange = useCallback(
    (index: number, field: string, value: any) => {
      console.log("[AgentReviewPanel] Task change:", {
        taskIndex: index,
        field,
        value,
        currentTask: editedAgent.tasks[index],
      });

      setEditedAgent((prev: CustomAgentsFormValues) => {
        const updatedTasks = [...prev.tasks];
        updatedTasks[index] = { ...updatedTasks[index], [field]: value };
        return {
          ...prev,
          tasks: updatedTasks,
        };
      });
    },
    []
  );

  const handleToolToggle = useCallback((toolId: string) => {
    console.log("[AgentReviewPanel] Toggling tool:", toolId);
    console.log("[AgentReviewPanel] Current tools:", editedAgent.tools);

    setEditedAgent((prev: CustomAgentsFormValues) => {
      const currentTools = prev.tools || [];
      const updated = {
        ...prev,
        tools: currentTools.includes(toolId)
          ? currentTools.filter((id: string) => id !== toolId)
          : [...currentTools, toolId],
      };
      console.log("[AgentReviewPanel] Updated tools:", updated.tools);
      return updated;
    });
  }, []);

  const handleTaskToolChange = (
    taskIndex: number,
    toolName: string,
    checked: boolean
  ) => {
    const updatedTasks = [...editedAgent.tasks];
    const task = updatedTasks[taskIndex];

    if (!task.tools) {
      task.tools = [];
    }

    if (checked) {
      if (!task.tools.includes(toolName)) {
        task.tools.push(toolName);
      }
    } else {
      task.tools = task.tools.filter((tool) => tool !== toolName);
    }

    setEditedAgent((prev) => ({
      ...prev,
      tasks: updatedTasks,
    }));
  };

  const selectAllToolsForTask = (taskIndex: number) => {
    const updatedTasks = [...editedAgent.tasks];
    const task = updatedTasks[taskIndex];

    if (!task.tools) {
      task.tools = [];
    }

    const newTools = [
      ...new Set([
        ...task.tools,
        ...availableTools.map((tool: { name: string }) => tool.name),
      ]),
    ];
    updatedTasks[taskIndex] = { ...task, tools: newTools };

    setEditedAgent({ ...editedAgent, tasks: updatedTasks });
  };

  const deselectAllToolsForTask = (taskIndex: number) => {
    const updatedTasks = [...editedAgent.tasks];
    const task = updatedTasks[taskIndex];

    if (!task.tools) {
      task.tools = [];
    }

    updatedTasks[taskIndex] = { ...task, tools: [] };

    setEditedAgent({ ...editedAgent, tasks: updatedTasks });
  };

  const updateTaskToolSearch = (taskIndex: number, searchTerm: string) => {
    setTaskToolStates({
      ...taskToolStates,
      [taskIndex]: {
        ...taskToolStates[taskIndex],
        searchTerm,
      },
    });
  };

  const getFilteredTools = (taskIndex: number) => {
    const searchTerm =
      taskToolStates[taskIndex]?.searchTerm?.toLowerCase() || "";
    const filtered = availableTools.filter(
      (tool: { name: string; description: string }) =>
        tool.name.toLowerCase().includes(searchTerm) ||
        tool.description.toLowerCase().includes(searchTerm)
    );

    return filtered;
  };

  const handleDeleteTask = useCallback((index: number) => {
    setEditedAgent((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index),
    }));
  }, []);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col h-full relative">
        <div className="flex-1 overflow-hidden flex flex-col p-8">
          <Tabs defaultValue="system" className="h-full flex flex-col">
            <TabsList className="w-full flex-none flex justify-center gap-1 mb-6 p-1 bg-background border rounded-lg">
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

            <div className="flex-1 overflow-hidden flex flex-col">
              <TabsContent
                value="system"
                className="h-full mt-0 data-[state=active]:flex flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar pb-16">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">
                      System Prompt
                    </h3>
                    <div className="bg-background rounded-lg p-6 border shadow-sm">
                      {isEditing ? (
                        <Textarea
                          value={editedAgent.system_prompt}
                          onChange={(e) =>
                            handleInputChange("system_prompt", e.target.value)
                          }
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
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-16">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">
                      Role
                    </h3>
                    <div className="bg-background rounded-lg p-6 border shadow-sm">
                      {isEditing ? (
                        <Textarea
                          value={editedAgent.role}
                          onChange={(e) =>
                            handleInputChange("role", e.target.value)
                          }
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
                    <h3 className="text-lg font-semibold mb-2 text-foreground">
                      Goal
                    </h3>
                    <div className="bg-background rounded-lg p-6 border shadow-sm">
                      {isEditing ? (
                        <Textarea
                          value={editedAgent.goal}
                          onChange={(e) =>
                            handleInputChange("goal", e.target.value)
                          }
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
                    <h3 className="text-lg font-semibold mb-2 text-foreground">
                      Backstory
                    </h3>
                    <div className="bg-background rounded-lg p-6 border shadow-sm">
                      {isEditing ? (
                        <Textarea
                          value={editedAgent.backstory}
                          onChange={(e) =>
                            handleInputChange("backstory", e.target.value)
                          }
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
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-16">
                  <div className="space-y-6">
                    {editedAgent.tasks?.map((task: any, index: number) => (
                      <div
                        key={index}
                        className="bg-background rounded-lg border shadow-sm"
                      >
                        <div className="p-6 border-b bg-background">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-foreground">
                                Task {index + 1}
                              </h3>
                              <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                                {task.type || "Custom Task"}
                              </span>
                            </div>
                            {isEditing && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteTask(index)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="p-6">
                          <div className="space-y-6">
                            <div className="w-full">
                              <h4 className="text-sm font-medium mb-2 text-foreground">
                                Description
                              </h4>
                              <div className="bg-muted/30 rounded-lg p-4 max-h-[200px] overflow-y-auto">
                                {isEditing ? (
                                  <Textarea
                                    value={task.description}
                                    onChange={(e) =>
                                      handleTaskChange(
                                        index,
                                        "description",
                                        e.target.value
                                      )
                                    }
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

                            <div className="w-full">
                              <h4 className="text-sm font-medium mb-2 text-foreground">
                                Tools
                              </h4>
                              <div className="bg-muted/30 rounded-lg p-4 max-h-[200px] overflow-y-auto">
                                {isEditing ? (
                                  <div className="space-y-4">
                                    <ToolSelector
                                      availableTools={availableTools}
                                      selectedTools={task.tools || []}
                                      isLoading={isLoadingTools}
                                      onChange={(selectedTools) =>
                                        handleTaskChange(
                                          index,
                                          "tools",
                                          selectedTools
                                        )
                                      }
                                      placeholderText="Select tools for this task..."
                                    />
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {task.tools && task.tools.length > 0 ? (
                                      task.tools.map(
                                        (tool: string, toolIndex: number) => (
                                          <Badge
                                            key={toolIndex}
                                            variant="secondary"
                                            className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-xs font-medium"
                                          >
                                            {tool}
                                          </Badge>
                                        )
                                      )
                                    ) : (
                                      <span className="text-sm text-muted-foreground">
                                        No tools assigned
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="w-full">
                              <h4 className="text-sm font-medium mb-2 text-foreground">
                                Expected Output
                              </h4>
                              <div className="bg-muted/30 rounded-lg p-4 max-h-[200px] overflow-y-auto">
                                {isEditing ? (
                                  <Textarea
                                    value={
                                      typeof task.expected_output === "string"
                                        ? task.expected_output
                                        : JSON.stringify(
                                            task.expected_output,
                                            null,
                                            2
                                          )
                                    }
                                    onChange={(e) => {
                                      try {
                                        const parsedOutput = JSON.parse(
                                          e.target.value
                                        );
                                        handleTaskChange(
                                          index,
                                          "expected_output",
                                          parsedOutput
                                        );
                                      } catch (error) {
                                        handleTaskChange(
                                          index,
                                          "expected_output",
                                          e.target.value
                                        );
                                      }
                                    }}
                                    className="min-h-[160px] text-sm font-mono w-full resize-vertical"
                                    placeholder='{"key": "value", "someotherkey": "value"}'
                                  />
                                ) : (
                                  <div className="overflow-y-auto max-h-full">
                                    <pre className="text-sm whitespace-pre-wrap overflow-x-auto max-w-full">
                                      {typeof task.expected_output === "string"
                                        ? task.expected_output
                                        : JSON.stringify(
                                            task.expected_output,
                                            null,
                                            2
                                          )}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {isEditing && (
                    <div className="flex justify-center mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditedAgent((prev) => ({
                            ...prev,
                            tasks: [
                              ...prev.tasks,
                              {
                                description: "",
                                tools: [],
                                expected_output: "{}",
                              },
                            ],
                          }));
                        }}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        New Task
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background flex-none z-10"
          style={{ height: `${footerHeight}px` }}
        >
          {isEditing ? (
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1"
                disabled={isSaving}
              >
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
      </div>
    </TooltipProvider>
  );
};

export default AgentReviewPanel;
