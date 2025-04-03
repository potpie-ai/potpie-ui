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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-lg font-medium">Agent Configuration</h3>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        <Tabs defaultValue="system" className="h-full flex flex-col">
          <TabsList className="w-full grid grid-cols-3 p-1 bg-background border rounded-lg mb-4">
            <TabsTrigger
              value="system"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              System Configuration
            </TabsTrigger>
            <TabsTrigger
              value="identity"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Agent Identity
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Tasks
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent
              value="system"
              className="h-full mt-0 data-[state=active]:flex flex-col"
            >
              <div className="space-y-4 overflow-y-auto pr-4 h-full">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">
                    System Prompt
                  </h3>
                  <div className="bg-background rounded-lg p-6 border shadow-sm">
                    {isEditing ? (
                      <Textarea
                        value={editedAgent.system_prompt}
                        onChange={(e) => setEditedAgent({...editedAgent, system_prompt: e.target.value})}
                        className="min-h-[200px] text-sm"
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
              className="h-full mt-0 data-[state=active]:flex flex-col"
            >
              <div className="space-y-6 overflow-y-auto pr-4 h-full">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">
                    Role
                  </h3>
                  <div className="bg-background rounded-lg p-6 border shadow-sm">
                    {isEditing ? (
                      <Textarea
                        value={editedAgent.role}
                        onChange={(e) => setEditedAgent({...editedAgent, role: e.target.value})}
                        className="min-h-[100px] text-sm"
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
                        onChange={(e) => setEditedAgent({...editedAgent, goal: e.target.value})}
                        className="min-h-[100px] text-sm"
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
                        onChange={(e) => setEditedAgent({...editedAgent, backstory: e.target.value})}
                        className="min-h-[100px] text-sm"
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
              className="h-full mt-0 data-[state=active]:flex flex-col"
            >
              <div className="grid grid-cols-1 gap-6 overflow-y-auto pr-4 h-full">
                {editedAgent.tasks?.map((task: any, index: number) => (
                  <div key={index} className="bg-background rounded-lg p-6 border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-foreground">
                        Task {index + 1}
                      </h3>
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                        {task.type || "Custom Task"}
                      </span>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-foreground">
                          Description
                        </h4>
                        <div className="bg-muted/30 rounded-lg p-4">
                          {isEditing ? (
                            <Textarea
                              value={task.description}
                              onChange={(e) => {
                                const updatedTasks = [...editedAgent.tasks];
                                updatedTasks[index] = {...task, description: e.target.value};
                                setEditedAgent({...editedAgent, tasks: updatedTasks});
                              }}
                              className="min-h-[100px] text-sm"
                            />
                          ) : (
                            <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground">
                              {task.description}
                            </ReactMarkdown>
                          )}
                        </div>
                      </div>

                      {task.tools && task.tools.length > 0 && (
                        <div>
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
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-foreground">
                            Expected Output
                          </h4>
                          <div className="bg-muted/30 rounded-lg p-4">
                            {isEditing ? (
                              <Textarea
                                value={JSON.stringify(task.expected_output, null, 2)}
                                onChange={(e) => {
                                  try {
                                    const parsedOutput = JSON.parse(e.target.value);
                                    const updatedTasks = [...editedAgent.tasks];
                                    updatedTasks[index] = {...task, expected_output: parsedOutput};
                                    setEditedAgent({...editedAgent, tasks: updatedTasks});
                                  } catch (error) {
                                    // Don't update if JSON is invalid
                                  }
                                }}
                                className="min-h-[100px] text-sm font-mono"
                              />
                            ) : (
                              <pre className="text-sm whitespace-pre-wrap overflow-x-auto">
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
      
      <div className="p-4 border-t">
        {isEditing ? (
          <div className="flex gap-2">
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