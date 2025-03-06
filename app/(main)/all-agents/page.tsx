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
  Copy,
  Share2,
  X,
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
import { useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import MinorService from "@/services/minorService";
import { planTypesEnum } from "@/lib/Constants";
import { useAuthContext } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";

const AllAgents = () => {
  const { user } = useAuthContext();
  const userId = user?.uid;

  // Get subscription info
  const { data: userSubscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["userSubscription", userId],
    queryFn: () => MinorService.fetchUserSubscription(userId as string),
    enabled: !!userId,
    retry: false,
  });

  // Check if user is on free plan
  const isFreeUser = !subscriptionLoading && (!userSubscription || userSubscription.plan_type === planTypesEnum.FREE);

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
  
  // Share agent modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareAgentId, setShareAgentId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [toggleInitialized, setToggleInitialized] = useState(false);
  const [emailToShare, setEmailToShare] = useState("");
  const [sharedEmails, setSharedEmails] = useState<string[]>([]);
  const [isLoadingSharedDetails, setIsLoadingSharedDetails] = useState(false);
  const [copyUrlSuccess, setCopyUrlSuccess] = useState(false);

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

  const { data, isLoading, refetch } = useQuery({
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
  
  // Effect to update isPublic state whenever shareAgentId changes
  useEffect(() => {
    if (shareAgentId && data) {
      const agentData = data.find((agent: any) => agent.id === shareAgentId);
      if (agentData && (agentData as any).visibility !== undefined) {
        console.log("useEffect: Setting visibility from agent list:", (agentData as any).visibility);
        setIsPublic((agentData as any).visibility === "public");
      }
    }
  }, [shareAgentId, data]);

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
  
  // Function to fetch agent sharing details
  const fetchAgentSharingDetails = async (agentId: string) => {
    if (!agentId) return;
    
    setIsLoadingSharedDetails(true);
    try {
      const response = await AgentService.getSharedAgentsDetails(agentId);
      console.log("Agent sharing details:", response);
      
      // Update state with the response values
      setIsPublic(response.visibility === "public");
      setSharedEmails(response.shared_with || []);
      
      // Mark toggle as initialized with actual data from API
      setToggleInitialized(true);
      
      console.log("Toggle initialized with visibility:", response.visibility);
      
      return response; // Return response for further processing
    } catch (error) {
      console.error("Error fetching agent sharing details:", error);
      toast.error("Failed to load sharing details");
    } finally {
      setIsLoadingSharedDetails(false);
    }
  };

  const deleteCustomAgentForm = useMutation({
    mutationFn: async (agentId: string) => {
      const header = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      return (await axios.delete(`${baseUrl}/api/v1/custom-agents/agents/${agentId}`, {
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
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
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
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
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
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["all-agents"] });
      queryClient.refetchQueries({ queryKey: ["all-agents"] });
    },
    onError: (error) => {
      toast.error("Failed to create agent. Please try again.");
    },
  });
  
  // Loading state for visibility toggle
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  
  // Mutation for sharing agent with email
  const shareWithEmailMutation = useMutation({
    mutationFn: async ({ agentId, email }: { agentId: string; email: string }) => {
      return AgentService.shareAgentWithEmail(agentId, email);
    },
    onSuccess: (response) => {
      toast.success("Agent shared successfully");
      setEmailToShare("");
      // Update shared emails list from response if available
      if (response && response.shared_with) {
        setSharedEmails(response.shared_with);
      } else {
        // Fallback to fetching details if response doesn't contain shared_with
        fetchAgentSharingDetails(shareAgentId!);
      }
    },
    onError: () => {
      toast.error("Failed to share agent");
    },
  });
  
  // Mutation for revoking access to agent
  const revokeAccessMutation = useMutation({
    mutationFn: async ({ agentId, email }: { agentId: string; email: string }) => {
      return AgentService.revokeAgentAccess(agentId, email);
    },
    onSuccess: (response, variables) => {
      toast.success("Access revoked successfully");
      
      // Optimistically update the UI by removing the email
      setSharedEmails(prev => prev.filter(e => e !== variables.email));
      
      // Then fetch full details to ensure consistency
      fetchAgentSharingDetails(shareAgentId!);
    },
    onError: () => {
      toast.error("Failed to revoke access");
    },
  });

  const handleCreateAgent = async () => {
    if (!agentPrompt.trim()) {
      toast.error("Please provide a detailed description for your agent.");
      return;
    }

    // Ensure limit applies only to free users
    if (isFreeUser && data?.length >= 3) {
      setIsUpgradeMode(true);
      return;
    }

    await createAgentMutation.mutateAsync(agentPrompt);
  };

  // Update dialog close handler
  const handleDialogClose = async () => {
    await queryClient.invalidateQueries({ queryKey: ["all-agents"] });
    await refetch();
    setGeneratedAgent(null);
    setAgentPrompt("");
    setPromptModalOpen(false);
  };

  // Add function to copy agent ID to clipboard
  const copyAgentId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Agent ID copied to clipboard");
  };
  
  // Helper function to refresh agent sharing details
  const refreshAgentSharingDetails = () => {
    if (shareAgentId) {
      fetchAgentSharingDetails(shareAgentId);
    }
  };
  
  // Function to share agent with email
  const shareAgentWithEmail = () => {
    if (!shareAgentId || !emailToShare.trim()) return;
    
    // Improved email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailToShare)) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    // Check if email already exists in the list
    if (sharedEmails.includes(emailToShare.trim())) {
      toast.error("This email has already been added");
      return;
    }
    
    // Optimistically update UI
    const emailToAdd = emailToShare.trim();
    setSharedEmails(prev => [...prev, emailToAdd]);
    
    // Call the API
    shareWithEmailMutation.mutate({
      agentId: shareAgentId,
      email: emailToAdd
    }, {
      onError: () => {
        // Revert on error
        setSharedEmails(prev => prev.filter(email => email !== emailToAdd));
      }
    });
  };
  
  // Function to revoke access to agent
  const revokeAccess = (email: string) => {
    if (!shareAgentId) return;
    
    revokeAccessMutation.mutate({
      agentId: shareAgentId,
      email: email
    });
  };
  
  // Function to copy shareable URL
  const copyShareableUrl = () => {
    if (!shareAgentId) return;
    
    const baseUrl = window.location.origin;
    const shareableUrl = `${baseUrl}/shared-agent?agent_id=${shareAgentId}`;
    
    navigator.clipboard.writeText(shareableUrl);
    setCopyUrlSuccess(true);
    toast.success("Shareable URL copied to clipboard");
    
    // Reset success state after 2 seconds
    setTimeout(() => setCopyUrlSuccess(false), 2000);
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
                      // Ensure limit applies only to free users
                      if (isFreeUser && data?.length >= 3) {
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
                                      <pre className="text-sm whitespace-pre-wrap overflow-x-auto">
                                        {JSON.stringify(task.expected_output, null, 2)}
                                      </pre>
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
                    <Button onClick={handleDialogClose}>
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
                      {(content as any).visibility === "public" && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Public</span>
                      )}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="px-6 pb-4 overflow-hidden text-base text-muted-foreground leading-tight max-w-[480px]">
                    <p className="line-clamp-3">{content.description}</p>
                  </CardContent>

                  <CardFooter className="flex items-center justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyAgentId(content.id);
                      }}
                      title="Copy Agent ID"
                    >
                      <Copy className="size-5" />
                    </Button>
                    
                    {/* Share Agent Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:text-primary"
                      onClick={async () => {
                        console.log("Share button clicked for agent:", content.id);
                        
                        // Set the agent ID - the useEffect will handle setting the visibility
                        setShareAgentId(content.id);
                        
                        // Reset other share-related state
                        setToggleInitialized(false);
                        setSharedEmails([]);
                        setEmailToShare("");
                        
                        // Open the modal
                        setShareModalOpen(true);
                        setIsLoadingSharedDetails(true);
                        
                        // Fetch the complete sharing details asynchronously
                        try {
                          const details = await AgentService.getSharedAgentsDetails(content.id);
                          console.log("Loaded agent sharing details:", details);
                          
                          // Update shared emails
                          setSharedEmails(details.shared_with || []);
                          setToggleInitialized(true);
                        } catch (error) {
                          console.error("Error loading agent sharing details:", error);
                          toast.error("Failed to load sharing details");
                        } finally {
                          setIsLoadingSharedDetails(false);
                        }
                      }}
                      title="Share Agent"
                    >
                      <Share2 className="size-5" />
                    </Button>
                    
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
      
      {/* Share Agent Modal */}
      <Dialog
        open={shareModalOpen}
        onOpenChange={(open) => {
          console.log("Dialog open state changing to:", open);
          
          if (!open) {
            // Just close the modal and clean up
            setShareModalOpen(false);
            setShareAgentId(null);
            setEmailToShare("");
            setSharedEmails([]);
            setToggleInitialized(false);
          } else {
            // Just update the open state - data loading is handled elsewhere
            setShareModalOpen(open);
            
            // If we're opening the dialog and we have an agent ID, make sure we have the correct visibility state
            if (shareAgentId) {
              const agentData = data?.find((agent: any) => agent.id === shareAgentId);
              if (agentData && (agentData as any).visibility !== undefined) {
                console.log("Dialog open: Using visibility from agent list:", (agentData as any).visibility);
                setIsPublic((agentData as any).visibility === "public");
              }
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Share Agent</DialogTitle>
            <DialogDescription>
              Make your agent available to other users by sharing it publicly or with specific people.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Public/Private Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Make Agent Public</h4>
                <p className="text-sm text-muted-foreground">
                  Anyone with the link can access this agent
                </p>
              </div>
              
              {isLoadingSharedDetails ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Loading...</span>
                  <Loader className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {isPublic ? "Public" : "Private"}
                  </span>
                  <Switch 
                    checked={isPublic} 
                    onCheckedChange={(checked) => {
                      console.log("Switch toggled from", isPublic, "to", checked);
                      // Use simple direct API call
                      setIsPublic(checked);
                      setIsTogglingVisibility(true);
                      
                      AgentService.setAgentVisibility(
                        shareAgentId!, 
                        checked ? "public" : "private"
                      ).then(response => {
                        console.log("Toggle API response:", response);
                        // Update based on response from API
                        setIsPublic(response.visibility === "public");
                        toast.success("Agent visibility updated successfully");
                        setIsTogglingVisibility(false);
                      }).catch(error => {
                        console.error("Error toggling visibility:", error);
                        // Revert on error
                        setIsPublic(!checked);
                        toast.error("Failed to update agent visibility");
                        setIsTogglingVisibility(false);
                      });
                    }}
                    disabled={isLoadingSharedDetails || isTogglingVisibility}
                  />
                </div>
              )}
            </div>
            
            {/* Email Sharing */}
            <div className="space-y-3">
              <h4 className="font-medium">Share with specific people</h4>
              <div className="flex space-x-2">
                <Input
                  placeholder="Email address"
                  value={emailToShare}
                  onChange={(e) => setEmailToShare(e.target.value)}
                  className="flex-1"
                  disabled={shareWithEmailMutation.isPending}
                />
                <Button 
                  onClick={shareAgentWithEmail}
                  disabled={!emailToShare.trim() || shareWithEmailMutation.isPending}
                >
                  {shareWithEmailMutation.isPending ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    "Add"
                  )}
                  {/* Debug info */}
                  <span className="hidden">
                    Visibility Debug - Agent: {shareAgentId}, IsPublic: {isPublic ? "true" : "false"}, 
                    Toggle Initialized: {toggleInitialized ? "true" : "false"}
                  </span>
                </Button>
              </div>
              
              {/* Shared Emails List */}
              <div className="rounded-md border h-[120px] overflow-y-auto p-2">
                {isLoadingSharedDetails ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : sharedEmails.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No users added yet
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {sharedEmails.map((email, index) => (
                      <li key={index} className="flex items-center justify-between bg-secondary/30 rounded-md px-3 py-2 text-sm">
                        <span>{email}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => revokeAccess(email)}
                          disabled={revokeAccessMutation.isPending}
                        >
                          {revokeAccessMutation.isPending ? (
                            <Loader className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            
            {/* Copy URL */}
            <div>
              <Button
                variant="outline"
                className="w-full"
                onClick={copyShareableUrl}
                disabled={copyUrlSuccess}
              >
                {copyUrlSuccess ? (
                  <>URL Copied</>
                ) : (
                  <>Copy Shareable URL</>
                )}
              </Button>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
            {/* Debug information */}
            <div className="text-xs text-muted-foreground">
              Visibility Debug - Agent: {shareAgentId}, IsPublic: {isPublic ? "true" : "false"}, 
              Toggle Initialized: {toggleInitialized ? "true" : "false"}
            </div>
            <div className="flex space-x-2">
              <Button type="submit" onClick={shareAgentWithEmail} disabled={!emailToShare}>
                Share
              </Button>
              <DialogClose asChild>
                <Button type="button">Done</Button>
              </DialogClose>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllAgents;