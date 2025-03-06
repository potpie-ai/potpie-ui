"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
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
        console.error("Error fetching agent details:", error);
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
        console.error("Error fetching repositories:", error);
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
        // Find the repository by ID
        const repo = repositories?.find((r: any) => r.id?.toString() === selectedRepo);
        if (!repo) {
          console.log("No repository found for ID:", selectedRepo);
          return [];
        }
        
        // Safely set current repository
        try {
          setCurrentRepository(repo);
        } catch (error) {
          console.error("Error setting current repository:", error);
        }
        
        console.log("Fetching branches for repo:", repo.full_name);
        
        // Wrap the API call in a try-catch to handle any errors
        try {
          const branchList = await BranchAndRepositoryService.getBranchList(repo.full_name);
          console.log("Fetched branches:", branchList);
          
          // Ensure branchList is an array of strings
          if (!branchList) {
            console.warn("Branch list is null or undefined");
            return [];
          }
          
          // Convert to array if it's not already and filter out non-string values
          const branches = Array.isArray(branchList) 
            ? branchList.filter(branch => typeof branch === 'string')
            : [];
          
          console.log("Processed branches:", branches);
          
          // Don't auto-select the first branch here, do it in a useEffect instead
          return branches;
        } catch (apiError) {
          console.error("API error fetching branches:", apiError);
          return [];
        }
      } catch (error) {
        console.error("Error in branch query function:", error);
        return [];
      }
    },
    enabled: !!selectedRepo && selectedRepo !== "" && !!repositories,
    retry: 1, // Only retry once to avoid excessive API calls
    retryDelay: 1000,
    staleTime: 0,
    refetchOnWindowFocus: false,
    onError: (error) => {
      console.error("Query error fetching branches:", error);
    }
  });

  // Auto-select first branch when branches change
  useEffect(() => {
    try {
      if (branches && Array.isArray(branches) && branches.length > 0 && !selectedBranch) {
        try {
          const firstBranch = branches[0];
          console.log("Auto-selecting first branch:", firstBranch);
          
          if (typeof firstBranch === 'string') {
            setSelectedBranch(firstBranch);
            setCurrentBranch({
              id: firstBranch,
              name: firstBranch
            });
          } else {
            console.warn("First branch is not a string:", firstBranch);
          }
        } catch (error) {
          console.error("Error auto-selecting first branch:", error);
        }
      }
    } catch (error) {
      console.error("Error in branch auto-select effect:", error);
    }
  }, [branches, selectedBranch]);

  // Show error toast if branch fetching fails, but only if we have a selected repo
  useEffect(() => {
    if (branchError && selectedRepo) {
      console.error("Branch fetch error:", branchError);
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
      const branch = branches.find((b: any) => b.id.toString() === selectedBranch);
      if (branch) {
        setCurrentBranch(branch);
      }
    }
  }, [branches, selectedBranch]);
  
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
      if (!agentId || !selectedRepo || !selectedBranch) {
        throw new Error("Missing required parameters");
      }
      
      console.log("Creating chat with:", {
        agent_id: agentId,
        repo_id: parseInt(selectedRepo),
        branch_id: selectedBranch // Using the branch name
      });
      
      // The API expects branch_id or branch_name
      return ChatService.createChat({
        agent_id: agentId,
        repo_id: parseInt(selectedRepo),
        branch_id: selectedBranch // ChatService will convert this to branch_name
      });
    },
    onSuccess: (data) => {
      if (firstMessage.trim()) {
        dispatch(setPendingMessage(firstMessage));
      }
      
      if (currentRepository && currentBranch) {
        dispatch(setChat({ 
          chatFlow: "NEW_CHAT", 
          temporaryContext: {
            branch: currentBranch.name, 
            repo: currentRepository.full_name,
            projectId: currentRepository.id.toString()
          }, 
          agentId: agentId || undefined 
        }));
      }
      
      router.push(`/chat/${data.chat_id}`);
    },
    onError: (error) => {
      console.error("Error creating chat:", error);
      toast.error("Failed to start chat. Please try again.");
      setIsStartingChat(false);
    }
  });

  // Start a new chat
  const handleStartChat = () => {
    if (!selectedRepo || !selectedBranch) {
      toast.error("Please select a repository and branch");
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

  // Handle repository selection
  const handleRepoSelect = (value: string, repo: any) => {
    try {
      console.log("Repository selected:", value, repo);
      setSelectedRepo(value);
      setSelectedBranch("");
      setCurrentBranch(null);
      setCurrentRepository(repo);
      // Close the repo dropdown
      setRepoOpen(false);
      // Clear branch search term
      setBranchSearchTerm("");
      
      // Don't immediately open the branch dropdown or refetch branches
      // This was causing the crash
      console.log("Repository selection complete, will fetch branches when branch dropdown is opened");
    } catch (error) {
      console.error("Error in handleRepoSelect:", error);
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
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Repository Selection */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4 text-muted-foreground" />
                          <label className="text-sm font-medium">Repository</label>
                        </div>
                        <Popover open={repoOpen} onOpenChange={setRepoOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between"
                              disabled={isLoadingRepos}
                            >
                              {currentRepository ? (
                                <span className="truncate text-ellipsis whitespace-nowrap">
                                  {currentRepository.full_name}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  Select a repository
                                </span>
                              )}
                              <Code className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput 
                                placeholder="Search repository..."
                                value={repoSearchTerm}
                                onValueChange={setRepoSearchTerm}
                                autoFocus={true}
                              />
                              <CommandList>
                                <CommandEmpty>No repositories found</CommandEmpty>
                                <CommandGroup>
                                  {isLoadingRepos ? (
                                    <CommandItem disabled>
                                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                                      <span>Loading repositories...</span>
                                    </CommandItem>
                                  ) : !repositories || repositories.length === 0 ? (
                                    <CommandItem disabled>
                                      <span>No repositories available</span>
                                    </CommandItem>
                                  ) : (
                                    repositories
                                      ?.filter((repo: any) => {
                                        if (!repoSearchTerm) return true;
                                        return repo.full_name.toLowerCase().includes(repoSearchTerm.toLowerCase());
                                      })
                                      .map((repo: any) => (
                                        <CommandItem
                                          key={repo.id}
                                          value={repo.id.toString()}
                                          onSelect={(value) => {
                                            handleRepoSelect(value, repo);
                                          }}
                                        >
                                          {repo.full_name}
                                        </CommandItem>
                                      ))
                                  )}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      {/* Branch Selection */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-muted-foreground" />
                          <label className="text-sm font-medium">Branch</label>
                        </div>
                        <Popover 
                          open={branchOpen} 
                          onOpenChange={(open) => {
                            setBranchOpen(open);
                            
                            // Only fetch branches when opening the dropdown
                            if (open && selectedRepo) {
                              console.log("Branch dropdown opened, fetching branches...");
                              
                              // Use setTimeout to avoid React state update issues
                              setTimeout(() => {
                                refetchBranches()
                                  .then(result => {
                                    console.log("Branch fetch successful:", result);
                                  })
                                  .catch(error => {
                                    console.error("Error fetching branches:", error);
                                    if (error.name !== 'CanceledError') {
                                      toast.error("Failed to load branches. Please try again.");
                                    }
                                  });
                              }, 0);
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between"
                              disabled={!selectedRepo || isLoadingBranches}
                            >
                              {currentBranch ? (
                                <span className="truncate text-ellipsis whitespace-nowrap">
                                  {currentBranch.name}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  {!selectedRepo ? "Select a repository first" : "Select a branch"}
                                </span>
                              )}
                              <GitBranch className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[200px] p-0">
                            <Command>
                              <CommandInput 
                                placeholder="Search branch..."
                                value={branchSearchTerm}
                                onValueChange={setBranchSearchTerm}
                                autoFocus={true}
                              />
                              <CommandList>
                                <CommandEmpty>No branches found</CommandEmpty>
                                <CommandGroup>
                                  {isLoadingBranches ? (
                                    <CommandItem disabled>
                                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                                      <span>Loading branches...</span>
                                    </CommandItem>
                                  ) : branchError ? (
                                    <CommandItem disabled>
                                      <span>Error loading branches</span>
                                    </CommandItem>
                                  ) : !branches || !Array.isArray(branches) || branches.length === 0 ? (
                                    <CommandItem disabled>
                                      <span>No branches available</span>
                                    </CommandItem>
                                  ) : (
                                    branches
                                      .filter((branch: any) => {
                                        // Make sure branch is a string
                                        if (typeof branch !== 'string') {
                                          console.warn('Branch is not a string:', branch);
                                          return false;
                                        }
                                        
                                        return branchSearchTerm ? 
                                          branch.toLowerCase().includes(branchSearchTerm.toLowerCase()) : 
                                          true;
                                      })
                                      .map((branch: string, index: number) => (
                                        <CommandItem
                                          key={`${branch}-${index}`}
                                          value={branch}
                                          onSelect={(value) => {
                                            try {
                                              setSelectedBranch(value);
                                              setBranchOpen(false);
                                              setCurrentBranch({
                                                id: value,
                                                name: value
                                              });
                                            } catch (error) {
                                              console.error("Error selecting branch:", error);
                                            }
                                          }}
                                        >
                                          {branch}
                                        </CommandItem>
                                      ))
                                  )}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    
                    {/* Selected Repository and Branch Display */}
                    {currentRepository && currentBranch && (
                      <div className="bg-muted/30 rounded-md p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Repository:</span>
                          <span className="text-sm text-muted-foreground">{currentRepository.full_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Branch:</span>
                          <span className="text-sm text-muted-foreground">{currentBranch.name}</span>
                        </div>
                      </div>
                    )}

                    {/* Chat Form */}
                    <div className="mt-auto pt-2">
                      {selectedRepo && selectedBranch ? (
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
                              disabled={isStartingChat}
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
                            placeholder="Select a repository and branch to start chatting"
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