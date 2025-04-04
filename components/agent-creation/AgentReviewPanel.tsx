import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Edit, Save, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import AgentService from "@/services/AgentService";

interface AgentReviewPanelProps {
  generatedAgent: any;
  onEdit: () => void;
}

const AgentReviewPanel: React.FC<AgentReviewPanelProps> = ({
  generatedAgent,
  onEdit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedAgent, setEditedAgent] = useState(generatedAgent);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await AgentService.updateAgent(generatedAgent.id, {
        system_prompt: editedAgent.system_prompt,
        role: editedAgent.role,
        goal: editedAgent.goal,
        backstory: editedAgent.backstory,
        tasks: editedAgent.tasks
      });
      setIsEditing(false);
      toast.success("Agent updated successfully");
    } catch (error) {
      toast.error("Failed to update agent");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedAgent(generatedAgent);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="system" className="h-full flex flex-col">
          <TabsList className="w-full flex justify-center gap-1 mb-6 p-1 bg-background border rounded-lg sticky top-0 z-10">
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

          <div className="flex-1 overflow-hidden">
            <TabsContent
              value="system"
              className="h-full pb-20 mt-0 data-[state=active]:flex flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto space-y-4 p-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">
                    System Prompt
                  </h3>
                  <div className="bg-background rounded-lg p-6 border shadow-sm overflow-auto max-h-[60vh]">
                    {isEditing ? (
                      <Textarea
                        value={editedAgent.system_prompt}
                        onChange={(e) => setEditedAgent({...editedAgent, system_prompt: e.target.value})}
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
              className="h-full pb-20 mt-0 data-[state=active]:flex flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto space-y-6 p-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">
                    Role
                  </h3>
                  <div className="bg-background rounded-lg p-6 border shadow-sm overflow-auto max-h-[40vh]">
                    {isEditing ? (
                      <Textarea
                        value={editedAgent.role}
                        onChange={(e) => setEditedAgent({...editedAgent, role: e.target.value})}
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
                  <div className="bg-background rounded-lg p-6 border shadow-sm overflow-auto max-h-[40vh]">
                    {isEditing ? (
                      <Textarea
                        value={editedAgent.goal}
                        onChange={(e) => setEditedAgent({...editedAgent, goal: e.target.value})}
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
                  <div className="bg-background rounded-lg p-6 border shadow-sm overflow-auto max-h-[40vh]">
                    {isEditing ? (
                      <Textarea
                        value={editedAgent.backstory}
                        onChange={(e) => setEditedAgent({...editedAgent, backstory: e.target.value})}
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
              className="h-full pb-20 mt-0 data-[state=active]:flex flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto space-y-6 p-4">
                {editedAgent.tasks?.map((task: any, index: number) => (
                  <div key={index} className="bg-background rounded-lg p-6 border shadow-sm overflow-auto max-h-[70vh] transition-all duration-200 hover:shadow-md">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-foreground">
                        Task {index + 1}
                      </h3>
                      <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                        {task.type || "Custom Task"}
                      </span>
                    </div>

                    <div className="space-y-6">
                      <div className="overflow-auto max-h-[35vh] w-full">
                        <h4 className="text-sm font-medium mb-2 text-foreground">
                          Description
                        </h4>
                        <div className="bg-muted/30 rounded-lg p-4 overflow-auto break-words min-h-[160px]">
                          {isEditing ? (
                            <Textarea
                              value={task.description}
                              onChange={(e) => {
                                const updatedTasks = [...editedAgent.tasks];
                                updatedTasks[index] = {...task, description: e.target.value};
                                setEditedAgent({...editedAgent, tasks: updatedTasks});
                              }}
                              className="min-h-[160px] text-sm w-full resize-vertical"
                            />
                          ) : (
                            <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground">
                              {task.description}
                            </ReactMarkdown>
                          )}
                        </div>
                      </div>

                      {task.tools && task.tools.length > 0 && (
                        <div className="overflow-auto max-h-[20vh]">
                          <h4 className="text-sm font-medium mb-2 text-foreground">
                            Tools
                          </h4>
                          <div className="bg-muted/30 rounded-lg p-4">
                            <div className="flex flex-wrap gap-2">
                              {task.tools.map((tool: string, toolIndex: number) => (
                                <span
                                  key={toolIndex}
                                  className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-xs font-medium"
                                >
                                  {tool}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {task.expected_output && (
                        <div className="overflow-auto max-h-[35vh] w-full">
                          <h4 className="text-sm font-medium mb-2 text-foreground">
                            Expected Output
                          </h4>
                          <div className="bg-muted/30 rounded-lg p-4 min-h-[160px]">
                            {isEditing ? (
                              <Textarea
                                value={JSON.stringify(task.expected_output, null, 2)}
                                onChange={(e) => {
                                  try {
                                    const parsedOutput = JSON.parse(e.target.value);
                                    const updatedTasks = [...editedAgent.tasks];
                                    updatedTasks[index] = {...task, expected_output: parsedOutput};
                                    setEditedAgent({...editedAgent, tasks: updatedTasks});
                                  } catch (error) {}
                                }}
                                className="min-h-[160px] text-sm font-mono w-full resize-vertical"
                              />
                            ) : (
                              <pre className="text-sm whitespace-pre-wrap overflow-x-auto max-w-full">
                                {JSON.stringify(task.expected_output, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
      
      {/* Make the button container sticky */}
      <div className="p-4 border-t h-[76px] bg-background flex items-center absolute bottom-0 left-0 right-0 z-20">
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
          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="w-full"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Agent Configuration
          </Button>
        )}
      </div>
    </div>
  );
};

export default AgentReviewPanel; 