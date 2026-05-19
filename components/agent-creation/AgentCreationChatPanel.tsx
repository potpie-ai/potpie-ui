import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Loader,
  X,
  ChevronRight,
  ChevronLeft,
  Send,
  ChevronUp,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useDispatch } from "react-redux";
import { setChat } from "@/lib/state/Reducers/chat";
import { queryClient } from "@/app/utils/queryClient";
import AgentService from "@/services/AgentService";
import ChatService from "@/services/ChatService";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import { ChatPanel } from "./ChatPanel";
import AgentReviewPanel from "./AgentReviewPanel";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ParsingProgress, { ParsingStatusEnum } from "./ParsingProgress";
import { CustomAgentsFormValues } from "@/lib/Schema";

// Panel layout states
enum PanelLayoutState {
  SPLIT = "split",
  LEFT_ONLY = "left-only",
  RIGHT_ONLY = "right-only",
}

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
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [repoSearchTerm, setRepoSearchTerm] = useState<string>("");
  const [branchSearchTerm, setBranchSearchTerm] = useState<string>("");
  const [repoOpen, setRepoOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [parsingStatus, setParsingStatus] = useState<ParsingStatusEnum | null>(
    null
  );
  const [parsedProjectId, setParsedProjectId] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [layoutState, setLayoutState] = useState<PanelLayoutState>(
    PanelLayoutState.SPLIT
  );
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  // Fetch repositories
  const { data: repositories, isLoading: repositoriesLoading } = useQuery({
    queryKey: ["repositories"],
    queryFn: () => BranchAndRepositoryService.getUserRepositories(),
  });

  // Fetch branches for selected repository
  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ["branches", selectedRepo?.full_name],
    queryFn: async () => {
      if (!selectedRepo?.full_name) return [];
      return BranchAndRepositoryService.getBranchList(selectedRepo.full_name);
    },
    enabled: !!selectedRepo?.full_name,
  });

  // Clear search terms when changing repo or branch
  useEffect(() => {
    setRepoSearchTerm("");
    setSelectedBranch("");
  }, [selectedRepo]);

  useEffect(() => {
    setBranchSearchTerm("");
  }, [selectedBranch]);

  // Create conversation with the newly created agent
  const createConversationMutation = useMutation({
    mutationFn: async ({
      projectId,
      agentId,
    }: {
      projectId: string;
      agentId: string;
    }) => {
      if (!userId) throw new Error("User ID is missing");
      if (!projectId) throw new Error("Project ID is required");

      return await ChatService.createConversation(
        userId,
        `Chat with ${generatedAgent?.name || "new agent"}`,
        projectId,
        agentId,
        true // Set isHidden to true for conversations created from the agent creation modal
      );
    },
    onSuccess: (data) => {
      setConversationId(data.conversation_id);

      // Set chat context in Redux
      if (selectedRepo && selectedBranch) {
        const chatContext = {
          chatFlow: "NEW_CHAT",
          temporaryContext: {
            branch: selectedBranch,
            repo: selectedRepo.full_name,
            projectId: data.project_id,
          },
          agentId: generatedAgent.id,
        };
        dispatch(setChat(chatContext));
      }
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Failed to start a conversation with the agent."
      );
    },
  });

  // Add mutation for updating agent
  const updateAgentMutation = useMutation({
    mutationFn: async (agentData: CustomAgentsFormValues) => {
      if (!generatedAgent?.id) {
        throw new Error("Agent ID is required for updating");
      }
      return await AgentService.updateAgent(generatedAgent.id, agentData);
    },
    onSuccess: (updatedAgent) => {
      toast.success("Agent updated successfully");
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update agent");
    },
  });

  // Function to parse repository
  const parseRepo = async () => {
    if (!selectedRepo || !selectedBranch) {
      toast.error("Please select a repository and branch");
      return;
    }

    setParsingStatus(ParsingStatusEnum.SUBMITTED);
    try {
      // Call parse API
      const parseResponse = await BranchAndRepositoryService.parseRepo(
        selectedRepo.full_name,
        selectedBranch
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
        setParsingStatus(ParsingStatusEnum.READY);
        toast.success("Repository parsed successfully!");
        // Create conversation with the project ID we just received
        await createConversationMutation.mutateAsync({
          projectId: projectId,
          agentId: generatedAgent.id,
        });
        return;
      }

      // Poll for parsing status
      await BranchAndRepositoryService.pollParsingStatus(
        projectId,
        initialStatus,
        (status) => {
          console.log("Backend parsing status:", status);
          if (status === "error") {
            setParsingStatus(ParsingStatusEnum.ERROR);
          } else if (
            status === "submitted" ||
            status === "cloned" ||
            status === "parsed" ||
            status === "inferring" ||
            status === "ready"
          ) {
            setParsingStatus(status as ParsingStatusEnum);
          } else {
            setParsingStatus(ParsingStatusEnum.INFERRING);
          }
        },
        async () => {
          // Only create conversation when parsing is complete and we have a project ID
          if (generatedAgent?.id) {
            try {
              setParsingStatus(ParsingStatusEnum.READY);
              toast.success("Repository parsed successfully!");
              // Create conversation with the project ID we received earlier
              await createConversationMutation.mutateAsync({
                projectId: projectId,
                agentId: generatedAgent.id,
              });
            } catch (error) {
              toast.error("Failed to create conversation");
            }
          }
        }
      );
    } catch (err) {
      setParsingStatus(ParsingStatusEnum.ERROR);
      setParsedProjectId(""); // Reset project ID on parse failure
      toast.error("Failed to parse repository");
    }
  };

  // Toggle panel layout states
  const toggleToLeftOnly = () => {
    setLayoutState(PanelLayoutState.LEFT_ONLY);
  };

  const toggleToRightOnly = () => {
    setLayoutState(PanelLayoutState.RIGHT_ONLY);
  };

  const toggleToSplit = () => {
    setLayoutState(PanelLayoutState.SPLIT);
  };

  // Panel width calculations based on layout state
  const getLeftPanelWidth = () => {
    switch (layoutState) {
      case PanelLayoutState.SPLIT:
        return "w-1/2";
      case PanelLayoutState.LEFT_ONLY:
        return "w-full";
      case PanelLayoutState.RIGHT_ONLY:
        return "w-0";
      default:
        return "w-1/2";
    }
  };

  const getRightPanelWidth = () => {
    switch (layoutState) {
      case PanelLayoutState.SPLIT:
        return "w-1/2";
      case PanelLayoutState.LEFT_ONLY:
        return "w-0";
      case PanelLayoutState.RIGHT_ONLY:
        return "w-full";
      default:
        return "w-1/2";
    }
  };

  return (
    <div className="flex h-full w-full relative overflow-hidden">
      {/* Left Panel Content */}
      <div
        className={`h-full transition-all duration-300 ${getLeftPanelWidth()} border-r relative flex flex-col overflow-hidden`}
      >
        {layoutState !== PanelLayoutState.RIGHT_ONLY && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Fixed header - exactly 60px height to match right panel */}
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0 h-[60px]">
              <h2 className="text-lg font-semibold">Agent Configuration</h2>
            </div>
            {/* Scrollable content area with flex-1 to take remaining space */}
            <div ref={leftPanelRef} className="flex-1 overflow-hidden">
              <AgentReviewPanel
                generatedAgent={generatedAgent}
                onEdit={() => setIsEditing(true)}
                onSave={async (agent) => {
                  await updateAgentMutation.mutateAsync(agent);
                }}
                availableTools={[]}
                footerHeight={60}
              />
            </div>
          </div>
        )}

        {/* Toggle button to show right panel when in left-only mode */}
        {layoutState === PanelLayoutState.LEFT_ONLY && (
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleToSplit}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-background border rounded-full shadow-md h-10 w-10 flex items-center justify-center z-20"
            aria-label="Show Test Panel"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Right Panel Content */}
      <div
        className={`h-full transition-all duration-300 ${getRightPanelWidth()} relative flex flex-col overflow-hidden`}
      >
        {layoutState !== PanelLayoutState.LEFT_ONLY && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Fixed header - exactly 60px height to match left panel */}
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0 h-[60px]">
              <h2 className="text-lg font-semibold">Test your agent</h2>
            </div>

            {/* Scrollable content area with flex-1 to take remaining space */}
            <div ref={rightPanelRef} className="flex-1 overflow-hidden">
              {conversationId ? (
                <ChatPanel
                  conversationId={conversationId}
                  agentId={generatedAgent?.id}
                  agentName={generatedAgent?.name || "Agent"}
                  // Pass fixed footer height to ensure alignment
                  footerHeight={60}
                />
              ) : (
                <div className="flex flex-col p-6 space-y-6 max-w-md mx-auto mt-8 overflow-y-auto h-full">
                  <div className="text-center mb-6">
                    <div className="flex justify-center mb-4">
                      <div className="p-3 bg-blue-50 rounded-full">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM5 19V5H19V19H5Z"
                            fill="#4F86FF"
                          />
                          <path
                            d="M7 12H9V17H7V12ZM11 7H13V17H11V7ZM15 9H17V17H15V9Z"
                            fill="#4F86FF"
                          />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-xl font-medium mb-2">
                      Connect to a Repository
                    </h3>
                    <p className="text-muted-foreground">
                      Select a repository and branch to test your agent with
                      real code.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Repository selection form... */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Repository</label>
                      <Popover open={repoOpen} onOpenChange={setRepoOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={repoOpen}
                            className="w-full justify-between"
                            disabled={repositoriesLoading}
                          >
                            {repositoriesLoading ? (
                              <span className="flex items-center">
                                <Loader className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                              </span>
                            ) : (
                              selectedRepo?.full_name || "Select repository..."
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Search repositories..."
                              value={repoSearchTerm}
                              onValueChange={setRepoSearchTerm}
                            />
                            <CommandList className="overflow-y-hidden">
                              <CommandEmpty>
                                No repositories found.
                              </CommandEmpty>
                              <div
                                style={{ maxHeight: "240px", overflowY: "auto" }}
                                onWheel={(e) => e.stopPropagation()}
                              >
                                <CommandGroup>
                                  {repositories?.map((repo: any) => (
                                    <CommandItem
                                      key={repo.id}
                                      value={repo.full_name}
                                      onSelect={() => {
                                        setSelectedRepo(repo);
                                        setRepoOpen(false);
                                      }}
                                    >
                                      {repo.full_name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </div>
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
                            disabled={!selectedRepo || branchesLoading}
                          >
                            {branchesLoading ? (
                              <span className="flex items-center">
                                <Loader className="mr-2 h-4 w-4 animate-spin" />
                                Loading branches...
                              </span>
                            ) : (
                              selectedBranch || "Select branch..."
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Search branches..."
                              value={branchSearchTerm}
                              onValueChange={setBranchSearchTerm}
                            />
                            <CommandList className="overflow-y-hidden">
                              <CommandEmpty>No branches found.</CommandEmpty>
                              <div
                                style={{ maxHeight: "240px", overflowY: "auto" }}
                                onWheel={(e) => e.stopPropagation()}
                              >
                                <CommandGroup>
                                  {Array.isArray(branches) &&
                                    branches.map((branch: string) => (
                                      <CommandItem
                                        key={branch}
                                        value={branch}
                                        onSelect={() => {
                                          setSelectedBranch(branch);
                                          setBranchOpen(false);
                                        }}
                                      >
                                        {branch}
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </div>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Parsing Status */}
                    {parsingStatus && (
                      <ParsingProgress
                        status={parsingStatus}
                        projectId={parsedProjectId}
                        onRetry={parseRepo}
                      />
                    )}

                    {/* Parse Button */}
                    <Button
                      className="w-full"
                      disabled={
                        !selectedRepo ||
                        !selectedBranch ||
                        [
                          ParsingStatusEnum.SUBMITTED,
                          ParsingStatusEnum.CLONED,
                          ParsingStatusEnum.PARSED,
                          ParsingStatusEnum.INFERRING,
                        ].includes(parsingStatus as ParsingStatusEnum)
                      }
                      onClick={parseRepo}
                    >
                      {[
                        ParsingStatusEnum.SUBMITTED,
                        ParsingStatusEnum.CLONED,
                        ParsingStatusEnum.PARSED,
                        ParsingStatusEnum.INFERRING,
                      ].includes(parsingStatus as ParsingStatusEnum) ? (
                        <>
                          <Loader className="mr-2 h-4 w-4 animate-spin" />
                          Parsing...
                        </>
                      ) : parsingStatus === ParsingStatusEnum.ERROR ? (
                        "Try Again"
                      ) : (
                        "Parse Repository"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Toggle button to show left panel when in right-only mode */}
        {layoutState === PanelLayoutState.RIGHT_ONLY && (
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleToSplit}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-background border rounded-full shadow-md h-10 w-10 flex items-center justify-center z-20"
            aria-label="Show Configuration Panel"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Global styles */}
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
      `}</style>
    </div>
  );
};

export default AgentCreationChatPanel;
