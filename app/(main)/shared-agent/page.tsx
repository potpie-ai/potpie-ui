"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/lib/state/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import AgentService from "@/services/AgentService";
import ChatService from "@/services/ChatService";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader, Bot, Code, GitBranch, GitCommit, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NodeSelector from "@/components/NodeSelectorChatForm/NodeSelector";
import { setChat, setPendingMessage } from "@/lib/state/Reducers/chat";
import { setRepoName, setBranchName } from "@/lib/state/Reducers/RepoAndBranch";
import { CheckCircle, XCircle } from "lucide-react";
import Image from "next/image";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const SharedAgentPage = () => {
  const { user } = useAuthContext();
  const userId = user?.uid;
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const agentId = searchParams.get("agent_id");
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [firstMessage, setFirstMessage] = useState<string>("");
  const [currentRepository, setCurrentRepository] = useState<any>(null);
  const [currentBranch, setCurrentBranch] = useState<any>(null);
  const [repoSearchTerm, setRepoSearchTerm] = useState<string>("");
  const [branchSearchTerm, setBranchSearchTerm] = useState<string>("");
  const [repoOpen, setRepoOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [parsingStatus, setParsingStatus] = useState<string>("");
  const [isParseDisabled, setIsParseDisabled] = useState(true);
  const [parsedProjectId, setParsedProjectId] = useState<string>("");

  // Fetch agent details
  const { data: agentDetails, isLoading: isLoadingAgentDetails, error: agentError } = useQuery({
    queryKey: ["agent-details", agentId],
    queryFn: async () => {
      if (!agentId || !userId) {
        throw new Error("Missing required parameters");
      }
      try {
        const details = await AgentService.getAgentDetails(agentId, userId);
        return details;
      } catch (error: any) {
        if (error.response?.status === 403) {
          setErrorState("You don't have access to this agent.");
        } else if (error.response?.status === 404) {
          setErrorState("The agent you're looking for doesn't exist.");
        } else {
          setErrorState("An error occurred while loading the agent.");
        }
        throw error;
      }
    },
    enabled: !!agentId && !!userId,
    retry: 1
  });

  // Fetch repositories
  const { data: repositories, isLoading: isLoadingRepos } = useQuery({
    queryKey: ["repositories", userId],
    queryFn: async () => {
      try {
        return await BranchAndRepositoryService.getUserRepositories();
      } catch (error) {
        throw error;
      }
    },
    enabled: !!userId && !agentError
  });

  // Fetch branches for selected repository
  const { data: branches, isLoading: isLoadingBranches, refetch: refetchBranches, error: branchError } = useQuery({
    queryKey: ["branches", selectedRepo],
    queryFn: async () => {
      try {
        if (!selectedRepo || !repositories) {
          return [];
        }
        
        // Find the repo object by ID
        const repo = repositories.find((r: any) => {
          if (!r || !r.id) return false;
          
          try {
            // Safely convert IDs to strings for comparison
            const repoId = r.id?.toString() || "";
            const selectedRepoId = selectedRepo?.toString() || "";
            return repoId === selectedRepoId;
          } catch (error) {
            return false;
          }
        });
        
        if (!repo || !repo.full_name) {
          return [];
        }
        
        try {
          const branchList = await BranchAndRepositoryService.getBranchList(repo.full_name);
          
          if (!branchList) {
            return [];
          }
          
          // Convert to array if it's not already and filter out non-string values
          const branches = Array.isArray(branchList) 
            ? branchList.filter(branch => typeof branch === 'string' && branch !== null && branch !== undefined)
            : [];
          
          // Don't auto-select the first branch here, do it in a useEffect instead
          return branches;
        } catch (apiError) {
          return [];
        }
      } catch (error) {
        return [];
      }
    },
    enabled: !!selectedRepo && selectedRepo !== "" && !!repositories,
    retry: 1, // Only retry once to avoid excessive API calls
    retryDelay: 1000,
    staleTime: 0,
    refetchOnWindowFocus: false
  });

  // Auto-select first branch when branches change
  useEffect(() => {
    try {
      if (branches && Array.isArray(branches) && branches.length > 0 && !selectedBranch) {
        try {
          const firstBranch = branches[0];
          
          if (typeof firstBranch === 'string' && firstBranch !== null && firstBranch !== undefined) {
            setSelectedBranch(firstBranch);
            setCurrentBranch({
              id: firstBranch,
              name: firstBranch
            });
          }
        } catch (error) {
          // Silent error handling
        }
      }
    } catch (error) {
      // Silent error handling
    }
  }, [branches, selectedBranch]);

  // Show error toast if branch fetching fails, but only if we have a selected repo
  useEffect(() => {
    if (branchError && selectedRepo) {
      toast.error("Failed to load branches. Please try again.");
      setBranchOpen(false);
    }
  }, [branchError, selectedRepo]);

  // Auto-select the first repository if available
  useEffect(() => {
    if (repositories && repositories.length > 0 && !selectedRepo) {
      setSelectedRepo(repositories[0].id.toString());
      setCurrentRepository(repositories[0]);
    }
  }, [repositories, selectedRepo]);

  // Update current branch when selectedBranch changes
  useEffect(() => {
    if (branches && selectedBranch) {
      // Handle both string branches and object branches
      const branch = branches.find((b: any) => {
        if (typeof b === 'string') {
          return b === selectedBranch;
        } else if (b && b.id) {
          return b.id.toString() === selectedBranch;
        }
        return false;
      });
      
      if (branch) {
        // If branch is a string, create an object with id and name properties
        if (typeof branch === 'string') {
          setCurrentBranch({
            id: branch,
            name: branch
          });
        } else {
          setCurrentBranch(branch);
        }
      }
    }
  }, [branches, selectedBranch]);
  
  // Update parse button state
  useEffect(() => {
    try {
      setIsParseDisabled(!currentRepository?.full_name || !currentBranch?.name || parsingStatus === "loading");
    } catch (error) {
      setIsParseDisabled(true);
    }
  }, [currentRepository, currentBranch, parsingStatus]);
  
  // Clear search terms when changing repo or branch
  useEffect(() => {
    setRepoSearchTerm("");
  }, [selectedRepo]);
  
  useEffect(() => {
    setBranchSearchTerm("");
  }, [selectedBranch]);

  // Create a new chat with the shared agent
  const createChatMutation = useMutation({
    mutationFn: async () => {
      if (!agentId || !parsedProjectId || !selectedBranch) {
        throw new Error("Missing required parameters");
      }
      
      const userId = user?.uid;
      if (!userId) {
        throw new Error("User ID is missing");
      }
      
      // Create conversation with the shared agent using the project ID from parse API
      return ChatService.createConversation(
        userId,
        "Chat with shared agent", // Default title
        parsedProjectId, // Project ID from parse API response
        agentId
      );
    },
    onSuccess: (data) => {
      // If we have a first message, send it
      if (firstMessage.trim()) {
        // Store the message in Redux for display in the chat
        dispatch(setPendingMessage(firstMessage));
        
        // Send the first message
        sendFirstMessage(data.conversation_id, firstMessage);
      } else {
        // If no message, just navigate to the chat
        if (currentRepository && currentBranch) {
          dispatch(setChat({ 
            chatFlow: "NEW_CHAT", 
            temporaryContext: {
              branch: currentBranch.name, 
              repo: currentRepository.full_name,
              projectId: parsedProjectId // Use the project ID from parse API
            }, 
            agentId: agentId || undefined 
          }));
        }
        
        router.push(`/chat/${data.conversation_id}`);
        setIsStartingChat(false);
      }
    },
    onError: (error) => {
      toast.error("Failed to start chat. Please try again.");
      setIsStartingChat(false);
    }
  });

  // Function to send the first message
  const sendFirstMessage = async (conversationId: string, message: string) => {
    try {
      // Set up the chat context in Redux
      if (currentRepository && currentBranch) {
        dispatch(setChat({ 
          chatFlow: "NEW_CHAT", 
          temporaryContext: {
            branch: currentBranch.name, 
            repo: currentRepository.full_name,
            projectId: parsedProjectId // Use the project ID from parse API
          }, 
          agentId: agentId || undefined 
        }));
      }
      
      // Send the message
      await ChatService.streamMessage(
        conversationId,
        message,
        [], // No selected nodes for the first message
        () => {} // No need for streaming updates as we're redirecting
      );
      
      // Navigate to the chat page
      router.push(`/chat/${conversationId}`);
    } catch (error) {
      console.error("Error sending first message:", error);
      toast.error("Failed to send your message. Please try again in the chat.");
      // Still navigate to the chat page even if message sending fails
      router.push(`/chat/${conversationId}`);
    } finally {
      setIsStartingChat(false);
    }
  };

  // Start a new chat
  const handleStartChat = () => {
    if (!selectedRepo || !selectedBranch) {
      toast.error("Please select a repository and branch");
      return;
    }
    
    if (!parsedProjectId) {
      toast.error("Please parse the repository first");
      return;
    }

    if (!firstMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsStartingChat(true);
    createChatMutation.mutate();
  };

  // Handle message submission
  const handleMessageSubmit = (message: string) => {
    setFirstMessage(message);
    handleStartChat();
  };

  // Handle repository selection with better error handling
  const handleRepoSelect = (value: string, repo: any) => {
    try {
      if (!repo) {
        toast.error("Invalid repository selection");
        return;
      }
      
      // Safely get repo ID as string
      let repoIdStr;
      try {
        repoIdStr = repo.id?.toString() || "";
      } catch (error) {
        repoIdStr = "";
      }
      
      setSelectedRepo(repoIdStr);
      setSelectedBranch("");
      setCurrentBranch(null);
      setCurrentRepository(repo);
      
      // Close the repo dropdown
      setRepoOpen(false);
      
      // Clear branch search term
      setBranchSearchTerm("");
    } catch (error) {
      toast.error("An error occurred while selecting the repository. Please try again.");
    }
  };

  // If an error occurs while fetching agent details
  if (errorState) {
    return (
      <div className="container mx-auto py-12">
        <Card className="max-w-2xl mx-auto shadow-md">
          <CardHeader>
            <CardTitle className="text-center">Unable to Access Agent</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            <p className="text-muted-foreground text-center">{errorState}</p>
            <Button onClick={() => router.push("/all-agents")}>
              Go to My Agents
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Function to parse repository
  const parseRepo = async (repo_name: string, branch_name: string) => {
    if (!repo_name || !branch_name) {
      toast.error("Please select a repository and branch");
      return;
    }

    setParsingStatus("loading");
    setParsedProjectId(""); // Reset project ID when starting a new parse
    try {
      // Get repo from repositories list
      const repo = repositories?.find((r: any) => {
        if (!r || !r.id) return false;
        try {
          return r.id?.toString() === selectedRepo?.toString();
        } catch (error) {
          return false;
        }
      });
      
      if (!repo || !repo.full_name) {
        throw new Error("Repository not found or invalid");
      }

      // Call parse API
      const parseResponse = await BranchAndRepositoryService.parseRepo(
        repo.full_name,
        branch_name
      );
      
      if (!parseResponse) {
        throw new Error("Invalid response from parse API");
      }
      
      const projectId = parseResponse.project_id;
      const initialStatus = parseResponse.status;

      if (!projectId) {
        throw new Error("No project ID returned from parse API");
      }

      // Store the project ID from parse API for later use
      setParsedProjectId(projectId);

      if (initialStatus === "ready") {
        setParsingStatus("ready");
        toast.success("Repository parsed successfully!");
        return;
      }

      // Poll for parsing status
      await BranchAndRepositoryService.pollParsingStatus(
        projectId,
        initialStatus,
        setParsingStatus,
        () => {} // No step change needed
      );
    } catch (err) {
      setParsingStatus("error");
      setParsedProjectId(""); // Reset project ID on parse failure
      toast.error("Failed to parse repository");
    }
  };


  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {isLoadingAgentDetails ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Agent Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-primary/10 rounded-full p-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{agentDetails?.name || "Shared Agent"}</h1>
                <p className="text-muted-foreground">
                  Shared by {agentDetails?.creator || "a Potpie user"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Agent Details Section */}
              <div className="lg:col-span-5">
                <Card className="shadow-sm h-full flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle>Agent Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 flex-grow">
                    {/* Description */}
                    <div>
                      <h3 className="text-md font-medium mb-2">Description</h3>
                      <p className="text-muted-foreground">{agentDetails?.description}</p>
                    </div>
                    
                    {/* Role */}
                    {agentDetails?.role && (
                      <div>
                        <h3 className="text-md font-medium mb-2">Role</h3>
                        <p className="text-muted-foreground">{agentDetails.role}</p>
                      </div>
                    )}
                    
                    {/* Goal */}
                    {agentDetails?.goal && (
                      <div>
                        <h3 className="text-md font-medium mb-2">Goal</h3>
                        <p className="text-muted-foreground">{agentDetails.goal}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Start Chat Section */}
              <div className="lg:col-span-7">
                <Card className="shadow-sm h-full flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle>Start Chat</CardTitle>
                    <CardDescription>
                      Select a repository and branch to begin chatting with {agentDetails?.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 flex-grow">
                    {/* Repository and Branch Selection */}
                    <div className="space-y-4">
                      <h3 className="text-md font-medium">Select a repository and branch</h3>
                      
                      <div className="flex items-center gap-4 mt-4 ml-5">
                        {/* Repository Selection */}
                        {isLoadingRepos ? (
                          <div className="w-[220px] h-10 flex items-center">
                            <Loader className="h-4 w-4 animate-spin mr-2" />
                            <span>Loading repositories...</span>
                          </div>
                        ) : (
                          <Popover open={repoOpen} onOpenChange={setRepoOpen}>
                            <PopoverTrigger asChild className="w-[220px]">
                              {!currentRepository ? (
                                <Button
                                  className="flex gap-3 items-center font-semibold justify-start w-[220px]"
                                  variant="outline"
                                >
                                  <Code className="h-4 w-4 text-[#7A7A7A]" strokeWidth={1.5} />
                                  Select Repository
                                </Button>
                              ) : (
                                <Button
                                  className="flex gap-3 items-center font-semibold justify-start w-[220px]"
                                  variant="outline"
                                >
                                  <Code className="h-4 w-4 text-[#7A7A7A]" strokeWidth={1.5} />
                                  <span className="truncate text-ellipsis whitespace-nowrap">
                                    {currentRepository?.full_name || "Select Repository"}
                                  </span>
                                </Button>
                              )}
                            </PopoverTrigger>
                            <PopoverContent className="w-auto min-w-[220px] max-w-[300px] p-0">
                              <Command>
                                <CommandInput
                                  value={repoSearchTerm}
                                  onValueChange={(e) => setRepoSearchTerm(e)}
                                  placeholder="Search repository..."
                                />
                                <CommandList>
                                  <CommandEmpty>No repositories found</CommandEmpty>
                                  <CommandGroup>
                                    {repositories?.map((repo: any) => (
                                      <CommandItem
                                        key={repo?.id?.toString() || Math.random().toString()}
                                        value={repo?.full_name || ""}
                                        onSelect={(value) => {
                                          try {
                                            setSelectedRepo(repo?.id?.toString() || "");
                                            setSelectedBranch("");
                                            setCurrentBranch(null);
                                            setCurrentRepository(repo);
                                            setRepoOpen(false);
                                            setBranchSearchTerm("");
                                          } catch (error) {
                                            toast.error("An error occurred while selecting the repository.");
                                          }
                                        }}
                                      >
                                        {repo?.full_name || ""}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                        
                        {/* Branch Selection */}
                        {isLoadingBranches ? (
                          <div className="w-[220px] h-10 flex items-center">
                            <Loader className="h-4 w-4 animate-spin mr-2" />
                            <span>Loading branches...</span>
                          </div>
                        ) : (
                          <Popover 
                            open={branchOpen} 
                            onOpenChange={(open) => {
                              setBranchOpen(open);
                              
                              // Only fetch branches when opening the dropdown
                              if (open && selectedRepo) {
                                refetchBranches()
                                  .catch(error => {
                                    if (error.name !== 'CanceledError') {
                                      toast.error("Failed to load branches. Please try again.");
                                    }
                                  });
                              }
                            }}
                          >
                            <PopoverTrigger asChild className="w-[220px]">
                              {!currentBranch ? (
                                <Button
                                  className="flex gap-3 items-center font-semibold justify-start w-[220px]"
                                  variant="outline"
                                  disabled={!selectedRepo}
                                >
                                  <GitBranch className="h-4 w-4 text-[#7A7A7A]" strokeWidth={1.5} />
                                  {selectedRepo ? "Select Branch" : "Select Repository First"}
                                </Button>
                              ) : (
                                <Button
                                  className="flex gap-3 items-center font-semibold justify-start w-[220px]"
                                  variant="outline"
                                >
                                  <GitBranch className="h-4 w-4 text-[#7A7A7A]" strokeWidth={1.5} />
                                  <span className="truncate text-ellipsis whitespace-nowrap">
                                    {currentBranch?.name || "Select Branch"}
                                  </span>
                                </Button>
                              )}
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                              <Command>
                                <CommandInput 
                                  placeholder="Search branch..."
                                  value={branchSearchTerm}
                                  onValueChange={setBranchSearchTerm}
                                />
                                <CommandList>
                                  <CommandEmpty>No branches found</CommandEmpty>
                                  <CommandGroup>
                                    {isLoadingBranches ? (
                                      <CommandItem disabled>
                                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                                        <span>Loading branches...</span>
                                      </CommandItem>
                                    ) : branches && Array.isArray(branches) && branches.length > 0 ? (
                                      branches
                                        .filter((branch: any) => {
                                          if (!branch) {
                                            return false;
                                          }
                                          
                                          let branchStr;
                                          try {
                                            branchStr = typeof branch === 'string' ? branch : String(branch);
                                          } catch (error) {
                                            return false;
                                          }
                                          
                                          if (!branchStr) {
                                            return false;
                                          }
                                          
                                          try {
                                            return branchSearchTerm ? 
                                              branchStr.toLowerCase().includes(branchSearchTerm.toLowerCase()) : 
                                              true;
                                          } catch (error) {
                                            return false;
                                          }
                                        })
                                        .map((branch: string, index: number) => {
                                          let branchStr;
                                          try {
                                            branchStr = typeof branch === 'string' ? branch : String(branch);
                                          } catch (error) {
                                            branchStr = "Unknown branch";
                                          }
                                          
                                          return (
                                            <CommandItem
                                              key={`${branchStr || ""}-${index}`}
                                              value={branchStr || ""}
                                              onSelect={(value) => {
                                                try {
                                                  setSelectedBranch(value);
                                                  setBranchOpen(false);
                                                  setCurrentBranch({
                                                    id: value,
                                                    name: value
                                                  });
                                                } catch (error) {
                                                  toast.error("Error selecting branch");
                                                }
                                              }}
                                            >
                                              {branchStr || "Unknown branch"}
                                            </CommandItem>
                                          );
                                        })
                                    ) : (
                                      <CommandItem disabled>
                                        <span>No branches available</span>
                                      </CommandItem>
                                    )}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                        
                        {/* Parse Button */}
                        <div className="flex items-center">
                          {parsingStatus !== "ready" && (
                            <Button
                              className="flex items-center justify-center"
                              onClick={() => currentRepository?.full_name && currentBranch?.name ? 
                                parseRepo(currentRepository.full_name, currentBranch.name) : 
                                toast.error("Please select a repository and branch")}
                              disabled={isParseDisabled}
                            >
                              {parsingStatus === "loading" ? (
                                <>
                                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                                  <span>Parsing...</span>
                                </>
                              ) : (
                                <span>Parse</span>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Parsing Status */}
                      {parsingStatus === "ready" && (
                        <div className="flex justify-start items-center gap-3 mt-3 ml-5">
                          <CheckCircle className="text-[#00C313] h-4 w-4" />
                          <span className="text-[#00C313]">Ready</span>
                        </div>
                      )}
                      
                      {parsingStatus === "error" && (
                        <div className="flex justify-start items-center gap-3 mt-3 ml-5">
                          <XCircle className="text-[#E53E3E] h-4 w-4" />
                          <span className="text-[#E53E3E]">Error</span>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => parseRepo(currentRepository?.full_name, currentBranch?.name)}
                          >
                            Retry
                          </Button>
                        </div>
                      )}

                      {parsingStatus !== "ready" && parsingStatus !== "error" && parsingStatus !== "" && parsingStatus !== "loading" && (
                        <div className="flex justify-start items-center gap-3 mt-3 ml-5">
                          <Loader className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-muted-foreground">{parsingStatus}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Selected Repository and Branch Display */}
                    {currentRepository && currentBranch && (
                      <div className="bg-muted/30 rounded-md p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Repository:</span>
                          <span className="text-sm text-muted-foreground">{currentRepository?.full_name || "Unknown repository"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Branch:</span>
                          <span className="text-sm text-muted-foreground">{currentBranch?.name || "Unknown branch"}</span>
                        </div>
                      </div>
                    )}

                    {/* Chat Form */}
                    <div className="mt-auto pt-2">
                      {selectedRepo && selectedBranch && parsingStatus === "ready" ? (
                        <div className="sticky bottom-6 overflow-hidden rounded-lg bg-card border border-[#edecf4] shadow-md flex flex-col">
                          <Textarea
                            value={firstMessage}
                            onChange={(e) => setFirstMessage(e.target.value)}
                            placeholder={`Ask ${agentDetails?.name || "the agent"} anything about your code...`}
                            className="min-h-12 text-base resize-none border-0 p-3 px-7"
                            disabled={isStartingChat}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleStartChat();
                              }
                            }}
                          />
                          <div className="flex items-center p-3 pt-0">
                            <Button 
                              type="submit" 
                              size="sm" 
                              className="ml-auto !bg-transparent mb-1 fill-primary" 
                              onClick={handleStartChat}
                              disabled={isStartingChat || !firstMessage.trim()}
                            >
                              {isStartingChat ? (
                                <Loader className="h-5 w-5 animate-spin" />
                              ) : (
                                <Image src="/images/sendmsg.svg" alt="Send" width={20} height={20} />
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="sticky bottom-6 overflow-hidden rounded-lg bg-card border border-[#edecf4] shadow-md flex flex-col">
                          <Textarea
                            placeholder={selectedRepo && selectedBranch ? "Parse repository first to start chatting" : "Select a repository and branch to start chatting"}
                            className="min-h-12 text-base resize-none border-0 p-3 px-7"
                            disabled={true}
                          />
                          <div className="flex items-center p-3 pt-0">
                            <Button 
                              type="submit" 
                              size="sm" 
                              className="ml-auto !bg-transparent mb-1 fill-primary" 
                              disabled={true}
                            >
                              <Image src="/images/sendmsg.svg" alt="Send" width={20} height={20} />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedAgentPage;