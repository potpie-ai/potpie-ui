import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader, X } from "lucide-react";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { queryClient } from "@/app/utils/queryClient";
import { setChat } from "@/lib/state/Reducers/chat";
import AgentService from "@/services/AgentService";
import ChatService from "@/services/ChatService";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import ChatPanel from "./ChatPanel";
import AgentReviewPanel from "./AgentReviewPanel";
import { useAuthContext } from "@/contexts/AuthContext";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface AgentCreationChatPanelProps {
  agentPrompt: string;
  generatedAgent: any;
  onClose: () => void;
}

const AgentCreationChatPanel: React.FC<AgentCreationChatPanelProps> = ({
  agentPrompt,
  generatedAgent,
  onClose,
}) => {
  const { user } = useAuthContext();
  const userId = user?.uid || "";
  const dispatch = useDispatch();
  
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [currentRepository, setCurrentRepository] = useState<any>(null);
  const [currentBranch, setCurrentBranch] = useState<any>(null);
  const [repoSearchTerm, setRepoSearchTerm] = useState<string>("");
  const [branchSearchTerm, setBranchSearchTerm] = useState<string>("");
  const [repoOpen, setRepoOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [parsingStatus, setParsingStatus] = useState<string>("");
  const [parsedProjectId, setParsedProjectId] = useState<string>("");
  const [isParseDisabled, setIsParseDisabled] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch repositories
  const { data: repositories, isLoading: repositoriesLoading } = useQuery({
    queryKey: ["repositories"],
    queryFn: () => BranchAndRepositoryService.getUserRepositories(),
  });

  // Fetch branches for selected repository
  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ["branches", currentRepository?.full_name],
    queryFn: async () => {
      if (!currentRepository?.full_name) return [];
      console.log("Fetching branches for repo:", currentRepository.full_name);
      const branchList = await BranchAndRepositoryService.getBranchList(currentRepository.full_name);
      console.log("Received branch list:", branchList);
      return branchList;
    },
    enabled: !!currentRepository?.full_name,
  });

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
    // Clear branch selection when repository changes
    setSelectedBranch("");
    setCurrentBranch(null);
  }, [currentRepository]);

  useEffect(() => {
    setBranchSearchTerm("");
  }, [selectedBranch]);

  // Create conversation with the newly created agent
  const createConversationMutation = useMutation({
    mutationFn: async ({ projectId, agentId }: { projectId: string, agentId: string }) => {
      if (!userId) {
        throw new Error("User ID is missing");
      }
      
      if (!projectId) {
        console.error("Missing project ID in mutation");
        throw new Error("Project ID is required");
      }

      console.log("Creating conversation with:", {
        userId,
        agentName: generatedAgent?.name,
        projectId,
        agentId
      });

      try {
        const response = await ChatService.createConversation(
          userId,
          `Chat with ${generatedAgent?.name || "new agent"}`,
          projectId,
          agentId
        );
        console.log("Conversation created successfully:", response);
        return response;
      } catch (error: any) {
        console.error("Error in createConversationMutation:", error);
        if (error.response?.status === 422) {
          throw new Error("Invalid parameters. Please ensure all required fields are provided correctly.");
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Setting conversation ID:", data.conversation_id);
      setConversationId(data.conversation_id);
      
      // Set chat context in Redux
      if (currentRepository && currentBranch) {
        const chatContext = { 
          chatFlow: "NEW_CHAT", 
          temporaryContext: {
            branch: currentBranch.name, 
            repo: currentRepository.full_name,
            projectId: data.project_id // Use project ID from response
          }, 
          agentId: generatedAgent.id
        };
        console.log("Setting chat context:", chatContext);
        dispatch(setChat(chatContext));
      }
    },
    onError: (error: Error) => {
      console.error("Conversation creation failed:", error);
      toast.error(error.message || "Failed to start a conversation with the agent.");
    }
  });

  // Function to parse repository
  const parseRepo = async (repo_name: string, branch_name: string) => {
    if (!repo_name || !branch_name) {
      toast.error("Please select a repository and branch");
      return;
    }

    setParsingStatus("loading");
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

      // If parsing is already complete, create conversation immediately
      if (initialStatus === "ready" && generatedAgent?.id) {
        setParsingStatus("ready");
        toast.success("Repository parsed successfully!");
        // Create conversation with the project ID we just received
        await createConversationMutation.mutateAsync({
          projectId: projectId,
          agentId: generatedAgent.id
        });
        return;
      }

      // Poll for parsing status
      await BranchAndRepositoryService.pollParsingStatus(
        projectId,
        initialStatus,
        setParsingStatus,
        async () => {
          // Only create conversation when parsing is complete and we have a project ID
          if (generatedAgent?.id) {
            try {
              setParsingStatus("ready");
              toast.success("Repository parsed successfully!");
              // Create conversation with the project ID we received earlier
              await createConversationMutation.mutateAsync({
                projectId: projectId,
                agentId: generatedAgent.id
              });
            } catch (error) {
              console.error("Error creating conversation:", error);
              toast.error("Failed to create conversation");
            }
          }
        }
      );
    } catch (err) {
      console.error("Parse error:", err);
      setParsingStatus("error");
      setParsedProjectId(""); // Reset project ID on parse failure
      toast.error("Failed to parse repository");
    }
  };

  // Handle repository selection
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold">
          {generatedAgent?.name || "Creating Agent..."}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 h-full overflow-hidden">
        {/* Agent Review Panel */}
        <div className="border-r overflow-y-auto h-full">
          <AgentReviewPanel 
            generatedAgent={generatedAgent} 
            onEdit={() => {
              setIsEditing(true);
            }}
          />
        </div>
        
        {/* Chat Panel or Repository Selection */}
        <div className="overflow-hidden h-full flex flex-col">
          {conversationId ? (
            <ChatPanel 
              conversationId={conversationId} 
              agentId={generatedAgent?.id}
              agentName={generatedAgent?.name || "Agent"}
            />
          ) : (
            <div className="flex flex-col p-4 space-y-4">
              <h3 className="text-lg font-medium">Select Repository and Branch</h3>
              <div className="space-y-4">
                {/* Repository Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Repository</label>
                  <Popover open={repoOpen} onOpenChange={setRepoOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={repoOpen}
                        className="w-full justify-between"
                      >
                        {currentRepository?.full_name || "Select repository..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search repositories..."
                          value={repoSearchTerm}
                          onValueChange={setRepoSearchTerm}
                        />
                        <CommandList>
                          <CommandEmpty>No repositories found.</CommandEmpty>
                          <CommandGroup>
                            {repositories?.map((repo: any) => (
                              <CommandItem
                                key={repo.id}
                                value={repo.full_name}
                                onSelect={(value) => handleRepoSelect(value, repo)}
                              >
                                {repo.full_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Branch Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Branch</label>
                  <Popover open={branchOpen} onOpenChange={setBranchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={branchOpen}
                        className="w-full justify-between"
                        disabled={!currentRepository}
                      >
                        {currentBranch?.name || "Select branch..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search branches..."
                          value={branchSearchTerm}
                          onValueChange={setBranchSearchTerm}
                        />
                        <CommandList>
                          <CommandEmpty>No branches found.</CommandEmpty>
                          <CommandGroup>
                            {Array.isArray(branches) && branches.map((branch: string) => (
                              <CommandItem
                                key={branch}
                                value={branch}
                                onSelect={(value) => {
                                  setSelectedBranch(value);
                                  setCurrentBranch({ name: value });
                                  setBranchOpen(false);
                                }}
                              >
                                {branch}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Parse Button */}
                <Button
                  className="w-full"
                  disabled={isParseDisabled || parsingStatus === "loading"}
                  onClick={() => {
                    if (currentRepository?.full_name && currentBranch?.name) {
                      parseRepo(currentRepository.full_name, currentBranch.name);
                    }
                  }}
                >
                  {parsingStatus === "loading" ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Parsing Repository...
                    </>
                  ) : (
                    "Parse Repository"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentCreationChatPanel; 