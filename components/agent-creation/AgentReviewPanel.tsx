import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Server,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import ToolSelector from "@/components/agent-creation/ToolSelector";
import { CustomAgentsFormValues } from "@/lib/Schema";

interface AgentReviewPanelProps {
  generatedAgent: CustomAgentsFormValues;
  onEdit: () => void;
  onSave: (agent: CustomAgentsFormValues) => Promise<void>;
  availableTools: Array<{ id: string; name: string; description: string }>;
  isLoadingTools?: boolean;
  footerHeight?: number;
}

interface TaskToolState {
  searchTerm: string;
}

interface MCPServer {
  name: string;
  link: string;
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

  // MCP Servers state
  const [mcpServerModalOpen, setMcpServerModalOpen] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [newServerLink, setNewServerLink] = useState("");
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(editedAgent);
      toast.success("Agent saved successfully");
      // Refresh the page to ensure all state is updated
      window.location.reload();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save agent");
    } finally {
      setIsSaving(false);
    }
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
    setEditedAgent((prev: CustomAgentsFormValues) => {
      const currentTools = prev.tools || [];
      const updated = {
        ...prev,
        tools: currentTools.includes(toolId)
          ? currentTools.filter((id: string) => id !== toolId)
          : [...currentTools, toolId],
      };
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

  // Helper function to resolve tool names from IDs or names
  const resolveToolName = (toolRef: string): string => {
    // First try to find by ID
    const toolById = availableTools.find((tool: any) => tool.id === toolRef);
    if (toolById) return toolById.name;

    // If not found by ID, try to find by name (for backward compatibility)
    const toolByName = availableTools.find(
      (tool: any) => tool.name.toLowerCase() === toolRef.toLowerCase()
    );
    if (toolByName) return toolByName.name;

    // If not found, return the original reference (could be a name or ID)
    return toolRef;
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

  // MCP Server functions
  const openAddServerModal = (taskIndex: number) => {
    setCurrentTaskIndex(taskIndex);
    setNewServerName("");
    setNewServerLink("");
    setMcpServerModalOpen(true);
  };

  const deleteMCPServer = (taskIndex: number, serverIndex: number) => {
    setEditedAgent((prev) => {
      const updatedTasks = [...prev.tasks];
      const task = updatedTasks[taskIndex];

      if (task.mcp_servers) {
        task.mcp_servers.splice(serverIndex, 1);
      }

      return {
        ...prev,
        tasks: updatedTasks,
      };
    });

    toast.success("MCP server removed successfully");
  };

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
                                      onChange={(selectedTools) => {
                                        handleTaskChange(
                                          index,
                                          "tools",
                                          selectedTools
                                        );
                                      }}
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
                                            {resolveToolName(tool)}
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

                            {/* MCP Servers Section */}
                            <div className="w-full">
                              <h4 className="text-sm font-medium mb-2 text-foreground">
                                MCP Servers
                              </h4>
                              <div className="bg-muted/30 rounded-lg p-4 max-h-[200px] overflow-y-auto">
                                {isEditing ? (
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-muted-foreground">
                                        Model Context Protocol servers for this
                                        task
                                      </span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          openAddServerModal(index)
                                        }
                                        className="flex items-center gap-2"
                                      >
                                        <Plus className="h-4 w-4" />
                                        Add Server
                                      </Button>
                                    </div>

                                    {task.mcp_servers &&
                                    task.mcp_servers.length > 0 ? (
                                      <div className="space-y-2">
                                        {task.mcp_servers.map(
                                          (
                                            server: MCPServer,
                                            serverIndex: number
                                          ) => (
                                            <div
                                              key={serverIndex}
                                              className="flex items-center justify-between p-3 bg-background rounded-md border w-full"
                                            >
                                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <Server className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                <div className="min-w-0 flex-1 overflow-hidden">
                                                  <div className="font-medium text-sm truncate">
                                                    {server.name}
                                                  </div>
                                                  <div className="text-xs text-muted-foreground truncate">
                                                    {server.link}
                                                  </div>
                                                </div>
                                              </div>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  deleteMCPServer(
                                                    index,
                                                    serverIndex
                                                  )
                                                }
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-center py-4 text-sm text-muted-foreground">
                                        No MCP servers configured
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {task.mcp_servers &&
                                    task.mcp_servers.length > 0 ? (
                                      task.mcp_servers.map(
                                        (
                                          server: MCPServer,
                                          serverIndex: number
                                        ) => (
                                          <div
                                            key={serverIndex}
                                            className="flex items-center gap-3 p-3 bg-background rounded-md border w-full"
                                          >
                                            <Server className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            <div className="min-w-0 flex-1 overflow-hidden">
                                              <div className="font-medium text-sm truncate">
                                                {server.name}
                                              </div>
                                              <div className="text-xs text-muted-foreground truncate">
                                                {server.link}
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      )
                                    ) : (
                                      <span className="text-sm text-muted-foreground">
                                        No MCP servers configured
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
                                mcp_servers: [],
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

        {/* MCP Server Add Modal */}
        <Dialog
          open={mcpServerModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              // Only reset when closing
              setMcpServerModalOpen(false);
              setCurrentTaskIndex(null);
              setNewServerName("");
              setNewServerLink("");
            } else {
              setMcpServerModalOpen(true);
            }
          }}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add MCP Server</DialogTitle>
              <DialogDescription>
                Add a Model Context Protocol server for this task. The server
                will be available to the agent when performing this task.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();

                // Prevent duplicate submissions
                if (isSubmitting) {
                  return;
                }

                setIsSubmitting(true);

                const formData = new FormData(e.currentTarget);
                const name = formData.get("server-name") as string;
                const link = formData.get("server-link") as string;

                // Use form values or fall back to state values
                const finalName = name?.trim() || newServerName.trim();
                const finalLink = link?.trim() || newServerLink.trim();

                const taskIndex = currentTaskIndex;
                if (taskIndex === null) {
                  setIsSubmitting(false);
                  return;
                }

                // Validate URL format
                try {
                  new URL(finalLink);
                } catch {
                  toast.error("Please provide a valid URL for the MCP server");
                  return;
                }

                const newServer: MCPServer = {
                  name: finalName,
                  link: finalLink,
                };

                setEditedAgent((prev) => {
                  const updatedTasks = prev.tasks.map((task, index) => {
                    if (index === taskIndex) {
                      const updatedTask = { ...task };
                      if (!updatedTask.mcp_servers) {
                        updatedTask.mcp_servers = [];
                      }
                      updatedTask.mcp_servers = [
                        ...updatedTask.mcp_servers,
                        newServer,
                      ];
                      return updatedTask;
                    }
                    return task;
                  });

                  return {
                    ...prev,
                    tasks: updatedTasks,
                  };
                });

                setMcpServerModalOpen(false);
                setCurrentTaskIndex(null);
                setIsSubmitting(false);
                toast.success("MCP server added successfully");
              }}
            >
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="server-name" className="text-sm font-medium">
                    Server Name
                  </label>
                  <Input
                    id="server-name"
                    name="server-name"
                    placeholder="e.g., Database Server"
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        (!newServerName.trim() || !newServerLink.trim())
                      ) {
                        e.preventDefault();
                        toast.error(
                          "Please provide both name and link for the MCP server"
                        );
                      }
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="server-link" className="text-sm font-medium">
                    Server URL
                  </label>
                  <Input
                    id="server-link"
                    name="server-link"
                    placeholder="e.g., https://api.example.com/mcp"
                    value={newServerLink}
                    onChange={(e) => setNewServerLink(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        (!newServerName.trim() || !newServerLink.trim())
                      ) {
                        e.preventDefault();
                        toast.error(
                          "Please provide both name and link for the MCP server"
                        );
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMcpServerModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !newServerName.trim() ||
                    !newServerLink.trim() ||
                    isSubmitting
                  }
                >
                  {isSubmitting ? "Adding..." : "Add Server"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default AgentReviewPanel;
