"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import debounce from "debounce";
import getHeaders from "@/app/utils/headers.util";
import axios, { AxiosResponse } from "axios";
import Link from "next/link";
import {
  Edit,
  Play,
  Pause,
  Loader,
  Plus,
  Bot,
  AlertCircle,
  Trash,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AgentService from "@/services/AgentService";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { auth } from "@/configs/Firebase-config";
import { queryClient } from "../../utils/queryClient";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";

const AllAgents = () => {
  // Dummy flag – replace this with your actual logic to determine if the user is on a free plan
  const isFreeUser = true;

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [statuses, setStatuses] = useState<{ [id: string]: string }>({});
  const [filteredData, setFilteredData] = useState<any>([]);
  const [deleteDailogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<string | null>(null);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  // New state to determine if we should show the upgrade message
  const [isUpgradeMode, setIsUpgradeMode] = useState(false);
  const [agentPrompt, setAgentPrompt] = useState("");
  const [generatedAgent, setGeneratedAgent] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);

  const router = useRouter();

  // Handle URL parameters for auto-opening create modal
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const shouldCreateAgent = searchParams.get("createAgent") === "true";
    const initialPrompt = searchParams.get("prompt");

    if (shouldCreateAgent) {
      // Check agent limit before opening the modal
      if (isFreeUser && data && data.length >= 3) {
        setIsUpgradeMode(true);
      } else {
        setIsUpgradeMode(false);
      }
      setPromptModalOpen(true);
      if (initialPrompt) {
        setAgentPrompt(decodeURIComponent(initialPrompt));
      }
      // Clean up URL parameters
      router.replace("/all-agents");
    }
  }, [router]);

  const { data, isLoading } = useQuery({
    queryKey: ["all-agents"],
    queryFn: async () => {
      const response: any = await AgentService.getAgentList();
      // Filter based on search term and update state
      setFilteredData(
        response?.filter((agent: { name: string }) =>
          agent.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        )
      );
      return response;
    },
  });

  useEffect(() => {
    if (!isLoading && data && data.length > 0) {
      const newStatuses = data.reduce(
        (acc: { [id: string]: string }, agent: { id: string; status: string }) => {
          acc[agent.id] = agent.status;
          return acc;
        },
        {}
      );
      setStatuses(newStatuses);
    }
  }, [data, isLoading]);

  useEffect(() => {
    const handler = debounce((value) => {
      setDebouncedSearchTerm(value);
    }, 500);
    handler(searchTerm);
    return () => {
      handler.clear();
    };
  }, [searchTerm]);

  const deleteCustomAgentForm = useMutation({
    mutationFn: async (agentId: string) => {
      const header = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_POTPIE_PLUS_URL;
      return (await axios.delete(`${baseUrl}/custom-agents/agents/${agentId}`, {
        headers: header,
      })) as AxiosResponse<any, any>;
    },
    onSuccess: (data, agentId) => {
      router.refresh();
      setFilteredData((prevData: any) =>
        prevData.filter((agent: any) => agent.id !== agentId)
      );
      toast.success("Agent deleted successfully");
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast.error("Failed to delete agent");
    },
  });

  const deployAgent = useMutation({
    mutationFn: async (agentId: string) => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_POTPIE_PLUS_URL;
      return axios.post(
        `${baseUrl}/deployment/agents/${agentId}/deploy`,
        {},
        { headers }
      );
    },
    onMutate: (agentId: string) => {
      setStatuses((prev) => ({ ...prev, [agentId]: "IN_PROGRESS" }));
    },
    onSuccess: (data, agentId) => {
      toast.success("Agent deployed successfully");
      setStatuses((prev) => ({ ...prev, [agentId]: "RUNNING" }));
    },
    onError: (error, agentId) => {
      toast.error("Failed to deploy agent");
      setStatuses((prev) => ({ ...prev, [agentId]: "ERROR" }));
    },
  });

  const stopAgent = useMutation({
    mutationFn: async (agentId: string) => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_POTPIE_PLUS_URL;
      return axios.post(
        `${baseUrl}/deployment/agents/${agentId}/stop`,
        {},
        { headers }
      );
    },
    onMutate: (agentId: string) => {
      setStatuses((prev) => ({ ...prev, [agentId]: "IN_PROGRESS" }));
    },
    onSuccess: (data, agentId) => {
      toast.success("Agent stopped successfully");
      setStatuses((prev) => ({ ...prev, [agentId]: "STOPPED" }));
    },
    onError: (error, agentId) => {
      toast.error("Failed to stop agent");
      setStatuses((prev) => ({ ...prev, [agentId]: "ERROR" }));
    },
  });

  const createAgentMutation = useMutation({
    mutationFn: async (prompt: string) => {
      setIsCreating(true);
      try {
        const response = await AgentService.createAgentFromPrompt(prompt);
        setGeneratedAgent(response);
        return response;
      } finally {
        setIsCreating(false);
      }
    },
    onSuccess: () => {
      toast.success("Agent created successfully!");
      // Invalidate using the same query key to refresh the list
      queryClient.invalidateQueries({ queryKey: ["all-agents"] });
    },
    onError: (error) => {
      toast.error("Failed to create agent. Please try again.");
    },
  });

  const handleCreateAgent = async () => {
    if (!agentPrompt.trim()) {
      toast.error("Please provide a detailed description for your agent.");
      return;
    }
    await createAgentMutation.mutateAsync(agentPrompt);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex w-full mx-auto items-center space-x-2 mb-5">
        <Input
          type="text"
          placeholder="Search your agents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Dialog
          open={promptModalOpen}
          onOpenChange={(open) => {
            setPromptModalOpen(open);
            if (!open) setIsUpgradeMode(false);
          }}
        >
          <DialogTrigger asChild>
            <Button
              // When the button is clicked, check the free plan limit.
              onClick={() => {
                if (isFreeUser && data && data.length >= 3) {
                  setIsUpgradeMode(true);
                } else {
                  setIsUpgradeMode(false);
                }
              }}
              className="ml-auto"
            >
              <Plus className="mr-2 h-4 w-4" /> Create New Agent
            </Button>
          </DialogTrigger>
          <DialogContent
            className={
              isUpgradeMode
                ? "sm:max-w-[600px] p-6"
                : !generatedAgent
                ? "sm:max-w-[600px] h-[80vh] p-6"
                : "sm:max-w-[95vw] md:max-w-[85vw] lg:max-w-[75vw] xl:max-w-[65vw] h-[90vh] p-6"
            }
          >
            {isUpgradeMode ? (
              // Upgrade message content when agent limit is reached.
              <div className="flex flex-col h-full justify-center items-center">
                <DialogHeader>
                  <DialogTitle>Agent Limit Reached</DialogTitle>
                </DialogHeader>
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Free users are limited to 3 agents. You already have {data?.length} agent
                    {data?.length > 1 ? "s" : ""}. Upgrade to create more agents and unlock additional
                    features.
                  </p>
                </div>
                <DialogFooter className="pt-6 pb-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open("https://potpie.ai/pricing", "_blank")
                    }
                  >
                    Upgrade
                  </Button>
                  <DialogClose asChild>
                    <Button className="ml-2">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </div>
            ) : !generatedAgent ? (
              // Existing agent creation modal content
              <div className="flex flex-col h-full">
                <div className="flex-1 py-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Describe the purpose and functionality of your agent in detail.
                      Include any specific tasks, behaviors, or algorithms you want it to
                      implement.
                    </p>
                    <textarea
                      className="w-full h-[calc(80vh-250px)] p-4 rounded-md border resize-none"
                      placeholder="Example: I need an agent that can help software developers with code reviews. It should analyze pull requests, identify potential bugs, suggest improvements for code quality, and ensure best practices are followed..."
                      value={agentPrompt}
                      onChange={(e) => setAgentPrompt(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter className="pt-6 pb-2">
                  <Button
                    type="submit"
                    onClick={() => {
                      // Check agent limit before creating
                      if (isFreeUser && data && data.length >= 3) {
                        setIsUpgradeMode(true);
                      } else {
                        handleCreateAgent();
                      }
                    }}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Agent"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              // Generated agent review modal content (unchanged)
              <div className="flex flex-col h-full">
                <DialogHeader className="px-1">
                  <DialogTitle>Review Generated Agent</DialogTitle>
                  <DialogDescription>
                    Review the generated agent configuration across different sections.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden mt-4">
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
                        <div className="space-y-4 overflow-y-auto pr-4 h-[calc(100vh-350px)]">
                          <div>
                            <h3 className="text-lg font-semibold mb-2 text-foreground">
                              System Prompt
                            </h3>
                            <div className="bg-background rounded-lg p-6 border shadow-sm">
                              <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground">
                                {generatedAgent.system_prompt}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent
                        value="identity"
                        className="h-full mt-0 data-[state=active]:flex flex-col"
                      >
                        <div className="space-y-6 overflow-y-auto pr-4 h-[calc(100vh-350px)]">
                          <div>
                            <h3 className="text-lg font-semibold mb-2 text-foreground">
                              Role
                            </h3>
                            <div className="bg-background rounded-lg p-6 border shadow-sm">
                              <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground">
                                {generatedAgent.role}
                              </ReactMarkdown>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold mb-2 text-foreground">
                              Goal
                            </h3>
                            <div className="bg-background rounded-lg p-6 border shadow-sm">
                              <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground">
                                {generatedAgent.goal}
                              </ReactMarkdown>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold mb-2 text-foreground">
                              Backstory
                            </h3>
                            <div className="bg-background rounded-lg p-6 border shadow-sm">
                              <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground">
                                {generatedAgent.backstory}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent
                        value="tasks"
                        className="h-full mt-0 data-[state=active]:flex flex-col"
                      >
                        <div className="grid grid-cols-1 gap-6 overflow-y-auto pr-4 h-[calc(100vh-350px)]">
                          {generatedAgent.tasks?.map((task: any, index: number) => (
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
                                    <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground">
                                      {task.description}
                                    </ReactMarkdown>
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
                                      <ReactMarkdown className="text-sm prose prose-sm max-w-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground">
                                        {task.expected_output.output}
                                      </ReactMarkdown>
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

                <DialogFooter className="mt-6 pb-2 px-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      router.push(`/agents?edit=${generatedAgent.id}`);
                      setPromptModalOpen(false);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Agent
                  </Button>
                  <DialogClose asChild>
                    <Button
                      onClick={() => {
                        setGeneratedAgent(null);
                        setAgentPrompt("");
                        setPromptModalOpen(false);
                      }}
                    >
                      Close
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <div className={`flex flex-wrap gap-16 items-center h-full w-full`}>
        {isLoading ? (
          Array.from({ length: 10 }).map((_, index) => (
            <Skeleton className="w-64 h-44" key={index} />
          ))
        ) : data && data.length === 0 && !searchTerm ? (
          <Card className="p-6 w-full text-center shadow-md rounded-2xl">
            <CardContent>
              <p className="text-lg text-muted">No agents available.</p>
              <Button className="mt-4" onClick={() => setPromptModalOpen(true)}>
                <Plus /> Create New Agent
              </Button>
            </CardContent>
          </Card>
        ) : filteredData && filteredData.length === 0 && searchTerm ? (
          <div className="flex flex-col items-center justify-center w-full py-10">
            <p className="text-lg text-muted-foreground">
              No agents found matching {debouncedSearchTerm}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setSearchTerm("")}
            >
              Clear Search
            </Button>
          </div>
        ) : (
          filteredData.map(
            (
              content: { id: string; name: string; description: string },
              index: React.Key
            ) => {
              const deploymentStatus = statuses[content.id];
              return (
                <Card
                  key={index}
                  className="h-[200px] w-[485px] pt-2 border-border shadow-sm rounded-2xl cursor-pointer hover:scale-105 transition-all duration-300 hover:border-[#FFB36E] hover:border-2 hover:shadow-md flex flex-col justify-between"
                >
                  <CardHeader className="p-1 px-6 font-normal flex flex-row justify-between items-center">
                    <CardTitle className="text-lg text-muted flex gap-2 items-center max-w-[380px]">
                      <div className="truncate">{content.name}</div>
                      <Bot className="flex-shrink-0" />
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="px-6 pb-4 overflow-hidden text-base text-muted-foreground leading-tight max-w-[480px]">
                    <p className="line-clamp-3">{content.description}</p>
                  </CardContent>

                  <CardFooter className="flex items-center justify-end space-x-2">
                    <Dialog
                      open={deleteDailogOpen}
                      onOpenChange={(open) => {
                        setDeleteDialogOpen(open);
                        if (!open) setAgentToDelete(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:text-primary"
                          onClick={() => setAgentToDelete(content.id)}
                        >
                          <Trash className="size-5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="truncate max-w-[400px] flex items-center">
                            Are you sure you want to delete&nbsp;
                            <span className="font-semibold inline-block max-w-[200px] truncate">
                              {data?.find(
                                (agent: { id: string; name: string }) =>
                                  agent.id === agentToDelete
                              )?.name}
                            </span>
                            ?
                          </DialogTitle>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button
                            variant="destructive"
                            onClick={() =>
                              agentToDelete &&
                              deleteCustomAgentForm.mutate(agentToDelete)
                            }
                            className="gap-2"
                          >
                            {deleteCustomAgentForm.isPending ? (
                              <Loader className="w-5 h-5 animate-spin" />
                            ) : null}{" "}
                            <span>Delete</span>
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Link href={`/agents?edit=${content.id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-primary"
                      >
                        <Edit className="w-5 h-5" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            }
          )
        )}
      </div>
    </div>
  );
};

export default AllAgents;