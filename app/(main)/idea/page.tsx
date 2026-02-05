"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import IdeaInputCard from "./components/IdeaInputCard";
import RepositorySelector from "./components/RepositorySelector";
import ParsingStatusCard from "./components/ParsingStatusCard";
import { useQuery, useMutation } from "@tanstack/react-query";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import SpecService from "@/services/SpecService";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { CreateRecipeCodegenResponse } from "@/lib/types/spec";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/lib/state/store";
import { useAuthContext } from "@/contexts/AuthContext";
import ChatService from "@/services/ChatService";
import { setPendingMessage, setChat } from "@/lib/state/Reducers/chat";
import { setRepoAndBranchForTask } from "@/lib/state/Reducers/RepoAndBranch";
import { ParsingStatusEnum } from "@/lib/Constants";

interface Repo {
  id: string;
  name: string;
  full_name: string;
  url: string;
  description?: string;
}

interface Project {
  id: string;
  idea: string;
  status: string;
  created_at: string;
}

interface IdeaPageState {
  input: string;
  loading: boolean;
  projectId: string | null;
  recipeId: string | null; // Changed from projectId for recipe codegen flow
  selectedRepo: string | null;
  selectedBranch: string | null;
  selectedAgent: string | null;
  parsing: boolean;
  parsingProgress: number;
  parsingSteps: string[];
  linkedRepos: Repo[];
  parsingStatus: string; // Actual parsing status from backend
}

const PARSING_STEPS = [
  "Cloning repository...",
  "Analyzing directory structure...",
  "Detecting tech stack...",
  "Parsing routing files...",
  "Extracting API endpoints...",
  "Analyzing database schema...",
  "Identifying components...",
  "Repository analysis complete!",
];

export default function IdeaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuthContext();

  const [state, setState] = useState<IdeaPageState>({
    input: "",
    loading: false,
    projectId: null,
    recipeId: null,
    selectedRepo: null,
    selectedBranch: null,
    selectedAgent: "ask", // Default agent is "ask"
    parsing: false,
    parsingProgress: 0,
    parsingSteps: [],
    linkedRepos: [],
    parsingStatus: "",
  });

  // Demo mode check - detect cal.com repo, main branch, and ai/chat in prompt
  const isDemoModeFromUrl = searchParams.get("showcase") === "1";
  
  // Check if demo mode should be activated based on repo selection
  // Demo mode is enabled for any prompt if cal.com repo and main branch is selected
  const checkDemoMode = (repoName: string | null, branch: string | null, prompt: string): boolean => {
    if (!repoName || !branch) return false;
    
    // Check if repo is cal.com (case-insensitive)
    const isCalComRepo = repoName.toLowerCase().includes("calcom") || 
                         repoName.toLowerCase().includes("cal.com") ||
                         repoName.toLowerCase() === "cal";
    
    // Check if branch is main
    const isMainBranch = branch.toLowerCase() === "main";
    
    // Enable demo mode for any prompt if cal.com + main branch
    return isCalComRepo && isMainBranch;
  };
  
  const isDemoMode = isDemoModeFromUrl;

  // Fetch all repositories
  const {
    data: allRepositories,
    isLoading: reposLoading,
    refetch: refetchRepos,
  } = useQuery({
    queryKey: ["user-repositories"],
    queryFn: async () => {
      const repos = await BranchAndRepositoryService.getUserRepositories();
      return repos || [];
    },
  });

  // Show all repositories - users can parse any repo regardless of status
  // Use useMemo to prevent infinite loops - only recompute when dependencies change
  const repositories = useMemo(() => {
    if (!allRepositories || allRepositories.length === 0) {
      return [];
    }

    // Return all repositories - no filtering by project status
    // Users can select and parse any repository
    return allRepositories;
  }, [allRepositories]);

  // Get the repo name from selected repo ID
  const selectedRepoName = useMemo(() => {
    if (!state.selectedRepo || !repositories.length) return null;

    const selectedRepoData = repositories.find(
      (repo: Repo) => repo.id?.toString() === state.selectedRepo
    );

    if (!selectedRepoData) return null;

    return selectedRepoData.full_name || selectedRepoData.name || null;
  }, [state.selectedRepo, repositories]);

  // Fetch branches for selected repository - same pattern as newchat
  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ["user-branch", selectedRepoName],
    queryFn: () => {
      if (!selectedRepoName) return Promise.resolve([]);

      // Handle GitHub URL format - same as newchat
      const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)/;
      const match = selectedRepoName.match(regex);
      if (match) {
        const ownerRepo = `${match[1]}/${match[2]}`;
        return BranchAndRepositoryService.getBranchList(ownerRepo).then(
          (data) => {
            // Auto-select branch if there's only one
            if (data?.length === 1 && !state.selectedBranch) {
              setState((prev) => ({ ...prev, selectedBranch: data[0] }));
            }
            return data;
          }
        );
      }
      return BranchAndRepositoryService.getBranchList(selectedRepoName).then(
        (data) => {
          // Auto-select branch if there's only one
          if (data?.length === 1 && !state.selectedBranch) {
            setState((prev) => ({ ...prev, selectedBranch: data[0] }));
          }
          return data;
        }
      );
    },
    enabled: !!selectedRepoName && selectedRepoName !== "",
  });

  // Fetch projects to identify parsed repos
  const { data: projects, refetch: refetchProjects } = useQuery({
    queryKey: ["user-projects"],
    queryFn: async () => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      try {
        const response = await axios.get(`${baseUrl}/api/v1/projects/list`, {
          headers,
        });
        return response.data || [];
      } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
      }
    },
  });

  // Listen for GitHub app installation completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin === "https://github.com" ||
        event.origin === window.location.origin
      ) {
        if (event.data?.type === "github-app-installed") {
          setTimeout(() => {
            refetchRepos();
            refetchProjects();
          }, 2000);
        }
      }
    };

    const handleCustomEvent = () => {
      setTimeout(() => {
        refetchRepos();
        refetchProjects();
      }, 2000);
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("github-app-installed", handleCustomEvent);
    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("github-app-installed", handleCustomEvent);
    };
  }, [refetchRepos, refetchProjects]);

  // Update linked repos in state - only when repositories actually change
  useEffect(() => {
    setState((prev) => ({ ...prev, linkedRepos: repositories }));
  }, [repositories]);

  // Demo mode: auto-select first repo (separate effect to avoid conflicts)
  useEffect(() => {
    if (isDemoMode && repositories.length > 0) {
      setState((prev) => {
        // Only set if not already selected
        if (prev.selectedRepo) return prev;
        return {
          ...prev,
          selectedRepo: repositories[0].id.toString(),
        };
      });
    }
  }, [isDemoMode, repositories]);

  // Demo mode: pre-fill textarea
  useEffect(() => {
    if (isDemoMode && !state.input) {
      const demoIdeas = {
        ask: "How do I implement authentication in my Next.js app?",
        build:
          "Integrate payment processing with Stripe. Add a checkout page with credit card validation, handle webhooks for payment status updates, and create an admin dashboard to view transactions.",
        debug:
          "Explore the tool with a pre-configured fraud detection pipeline demo showcasing the full workflow. This demo will walk you through the complete process of building, analyzing, and implementing a feature.",
      };
      const demoIdea = state.selectedAgent
        ? demoIdeas[state.selectedAgent as keyof typeof demoIdeas] ||
          demoIdeas.build
        : demoIdeas.build;
      setState((prev) => ({ ...prev, input: demoIdea }));
    }
  }, [isDemoMode, state.selectedAgent]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "140px";
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 300;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [state.input]);

  // Helper function to get clean input - no agent prefix needed since it's only visual
  const getCleanInput = (input: string): string => {
    return input.trim();
  };

  // Create project mutation (kept for backward compatibility with ask/debug agents)
  const createProjectMutation = useMutation({
    mutationFn: async (idea: string): Promise<Project> => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

      const response = await axios.post(
        `${baseUrl}/api/v1/projects/`,
        { idea },
        { headers }
      );
      return response.data;
    },
    onSuccess: (data: Project) => {
      setState((prev) => ({
        ...prev,
        projectId: data.id.toString(),
        loading: false,
      }));

      // If repo already selected, parse it
      if (state.selectedRepo) {
        const selectedRepoData = repositories.find(
          (repo: Repo) => repo.id?.toString() === state.selectedRepo
        );
        if (selectedRepoData) {
          const repoName =
            selectedRepoData.full_name || selectedRepoData.name || "";
          const branchName =
            state.selectedBranch || selectedRepoData.default_branch || "main";
          parseRepo(repoName, branchName);
        }
      }
    },
    onError: (error: any) => {
      console.error("Error creating project:", error);
      toast.error(error.response?.data?.detail || "Failed to create project");
      setState((prev) => ({ ...prev, loading: false }));
    },
  });

  // Create recipe mutation (for build agent - new recipe codegen flow)
  const createRecipeMutation = useMutation({
    mutationFn: async (data: {
      userPrompt: string;
      projectId: string;
      additionalLinks?: string[];
    }): Promise<CreateRecipeCodegenResponse> => {
      return await SpecService.createRecipeCodegen({
        user_prompt: data.userPrompt,
        project_id: data.projectId,
        additional_links: data.additionalLinks,
      });
    },
    onSuccess: (data: CreateRecipeCodegenResponse) => {
      console.log("[Idea Page] Recipe created successfully:", data);

      const projectId = data.project_id?.toString() || state.projectId;

      setState((prev) => ({
        ...prev,
        recipeId: data.recipe_id, // Store recipe_id instead of projectId
        projectId: projectId || null, // Also store project_id if available
        loading: false,
      }));

      // Navigate to repo page with recipeId to start question polling
      if (state.selectedRepo) {
        const selectedRepoData = repositories.find(
          (repo: Repo) => repo.id?.toString() === state.selectedRepo
        );
        if (selectedRepoData) {
          const repoName =
            selectedRepoData.full_name || selectedRepoData.name || "";
          const branchName =
            state.selectedBranch || selectedRepoData.default_branch || "main";

          // Store recipe data in localStorage for spec page
          localStorage.setItem(
            `recipe_${data.recipe_id}`,
            JSON.stringify({
              recipe_id: data.recipe_id,
              project_id: projectId || null,
              repo_name: repoName,
              branch_name: branchName,
            })
          );

          // Dispatch to Redux store with recipeId and projectId
          dispatch(
            setRepoAndBranchForTask({
              taskId: data.recipe_id, // Use recipeId as taskId
              repoName: repoName || "",
              branchName,
              projectId: projectId || undefined,
            })
          );

          // Navigate to repo page with recipeId
          const params = new URLSearchParams({
            recipeId: data.recipe_id,
          });
          if (repoName) {
            params.append("repoName", repoName);
          }
          if (branchName) {
            params.append("branch", branchName);
          }
          if (state.input) {
            const cleanInput = getCleanInput(state.input);
            params.append("featureIdea", cleanInput);
          }
          
          // Check if demo mode should be activated
          const shouldActivateDemoMode = checkDemoMode(repoName, branchName, state.input);
          if (shouldActivateDemoMode) {
            params.append("showcase", "1");
          }

          console.log(
            "[Idea Page] Navigating to repo page with recipeId:",
            data.recipe_id,
            "and projectId:",
            projectId,
            "demo mode:",
            shouldActivateDemoMode
          );
          router.push(`/repo?${params.toString()}`);
        } else {
          toast.error("Repository data not found. Please try again.");
        }
      } else {
        toast.error(
          "Repository not selected. Please select a repository and try again."
        );
      }
    },
    onError: (error: any) => {
      console.error("Error creating recipe:", error);
      toast.error(error.message || "Failed to create recipe");
      setState((prev) => ({ ...prev, loading: false }));
    },
  });

  // Select repository mutation
  const selectRepoMutation = useMutation({
    mutationFn: async ({
      projectId,
      repoId,
    }: {
      projectId: string;
      repoId: string;
    }) => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

      const response = await axios.post(
        `${baseUrl}/api/v1/repos/select`,
        { project_id: projectId, repo_id: repoId },
        { headers }
      );
      return response.data;
    },
    onSuccess: (
      data: unknown,
      variables: { projectId: string; repoId: string }
    ) => {
      const selectedRepoData = repositories.find(
        (repo: Repo) => repo.id?.toString() === variables.repoId
      );
      if (selectedRepoData) {
        const repoName =
          selectedRepoData.full_name || selectedRepoData.name || "";
        const branchName =
          state.selectedBranch || selectedRepoData.default_branch || "main";
        parseRepo(repoName, branchName);
      }
    },
    onError: (error: any) => {
      console.error("Error selecting repository:", error);
      toast.error(
        error.response?.data?.detail || "Failed to select repository"
      );
    },
  });

  // Parse repository - actual parsing flow similar to newchat
  const parseRepo = async (repoName: string, branchName: string) => {
    if (!repoName || !branchName) {
      toast.error("Please select a repository and branch");
      return;
    }

    setState((prev) => ({
      ...prev,
      parsing: true,
      parsingStatus: ParsingStatusEnum.SUBMITTED,
      parsingProgress: 0,
      parsingSteps: [],
    }));

    try {
      const parseResponse = await BranchAndRepositoryService.parseRepo(
        repoName,
        branchName
      );

      const projectId = parseResponse.project_id;
      const initialStatus = parseResponse.status;

      if (projectId) {
        setState((prev) => ({ ...prev, projectId }));
      }

      if (initialStatus === ParsingStatusEnum.READY) {
        setState((prev) => ({
          ...prev,
          parsingStatus: ParsingStatusEnum.READY,
          parsing: false,
          parsingProgress: 100,
        }));

        // If build agent, automatically create recipe after parsing completes
        if (state.selectedAgent === "build" && state.input.trim() && projectId) {
          const repoSlug = repoName;
          const finalBranchName = branchName || "main";
          const cleanInput = getCleanInput(state.input);

          // Dispatch projectId to Redux store
          dispatch(
            setRepoAndBranchForTask({
              taskId: projectId, // Use projectId as temporary taskId until we have recipeId
              repoName: repoSlug.trim(),
              branchName: finalBranchName,
              projectId,
            })
          );

          console.log(
            "[Idea Page] Parsing complete, creating recipe for build agent with projectId:",
            projectId
          );
          createRecipeMutation.mutate({
            userPrompt: cleanInput,
            projectId,
            additionalLinks: undefined,
          });
        }
        // If ask/debug agent, automatically create conversation after parsing completes
        else if (
          (state.selectedAgent === "ask" || state.selectedAgent === "debug") &&
          projectId
        ) {
          console.log(
            "[Idea Page] Parsing complete, creating conversation for",
            state.selectedAgent,
            "agent"
          );
          // Show loading state while creating conversation
          setState((prev) => ({ ...prev, loading: true }));
          try {
            const success = await createConversationAndNavigate(projectId);
            if (!success) {
              setState((prev) => ({ ...prev, loading: false }));
            }
          } catch (error) {
            console.error("[Idea Page] Error creating conversation after parsing:", error);
            setState((prev) => ({ ...prev, loading: false }));
          }
        }
        return;
      }

      // Poll for parsing status updates
      const pollStatus = async () => {
        const pollInterval = 5000; // 5 seconds
        const maxDuration = 45 * 60 * 1000; // 45 minutes
        const startTime = Date.now();
        let parsingStatus = initialStatus;

        const updateStatusAndProgress = (status: string) => {
          let progress = 0;
          let steps: string[] = [];

          if (status === ParsingStatusEnum.SUBMITTED) {
            progress = 10;
            steps = ["Cloning repository..."];
          } else if (status === ParsingStatusEnum.CLONED) {
            progress = 30;
            steps = [
              "Cloning repository...",
              "Analyzing directory structure...",
            ];
          } else if (status === ParsingStatusEnum.PARSED) {
            progress = 60;
            steps = [
              "Cloning repository...",
              "Analyzing directory structure...",
              "Detecting tech stack...",
              "Parsing routing files...",
            ];
          } else if (status === ParsingStatusEnum.PROCESSING) {
            progress = 80;
            steps = [
              "Cloning repository...",
              "Analyzing directory structure...",
              "Detecting tech stack...",
              "Parsing routing files...",
              "Extracting API endpoints...",
              "Analyzing database schema...",
            ];
          } else if (status === ParsingStatusEnum.READY) {
            progress = 100;
            steps = PARSING_STEPS;
          }

          setState((prev) => ({
            ...prev,
            parsingStatus: status,
            parsingProgress: progress,
            parsingSteps: steps,
            parsing:
              status !== ParsingStatusEnum.READY &&
              status !== ParsingStatusEnum.ERROR,
          }));
        };

        // Initial status update
        updateStatusAndProgress(parsingStatus);

        // Poll until ready or error or timeout
        while (
          parsingStatus !== ParsingStatusEnum.READY &&
          parsingStatus !== ParsingStatusEnum.ERROR &&
          Date.now() - startTime < maxDuration
        ) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));

          try {
            parsingStatus =
              await BranchAndRepositoryService.getParsingStatus(projectId);
            updateStatusAndProgress(parsingStatus);
          } catch (error) {
            console.error("Error polling parsing status:", error);
            setState((prev) => ({
              ...prev,
              parsingStatus: ParsingStatusEnum.ERROR,
              parsing: false,
            }));
            return;
          }
        }

        // Handle timeout
        if (
          Date.now() - startTime >= maxDuration &&
          parsingStatus !== ParsingStatusEnum.READY
        ) {
          setState((prev) => ({
            ...prev,
            parsingStatus: ParsingStatusEnum.ERROR,
            parsing: false,
          }));
        }

        // If parsing completed successfully
        if (parsingStatus === ParsingStatusEnum.READY) {
          // For build agent, create recipe
          if (state.selectedAgent === "build" && state.input.trim() && projectId) {
            const repoSlug = repoName;
            const finalBranchName = branchName || "main";
            const cleanInput = getCleanInput(state.input);

            // Dispatch projectId to Redux store
            dispatch(
              setRepoAndBranchForTask({
                taskId: projectId, // Use projectId as temporary taskId until we have recipeId
                repoName: repoSlug.trim(),
                branchName: finalBranchName,
                projectId,
              })
            );

            console.log(
              "[Idea Page] Parsing complete, creating recipe for build agent with projectId:",
              projectId
            );
            createRecipeMutation.mutate({
              userPrompt: cleanInput,
              projectId,
              additionalLinks: undefined,
            });
          }
          // For ask/debug agents, create conversation
          else if (
            (state.selectedAgent === "ask" ||
              state.selectedAgent === "debug") &&
            projectId
          ) {
            console.log(
              "[Idea Page] Parsing complete (after polling), creating conversation for",
              state.selectedAgent,
              "agent"
            );
            // Show loading state while creating conversation
            setState((prev) => ({ ...prev, loading: true }));
            try {
              const success = await createConversationAndNavigate(projectId);
              if (!success) {
                setState((prev) => ({ ...prev, loading: false }));
              }
            } catch (error) {
              console.error("[Idea Page] Error creating conversation after polling:", error);
              setState((prev) => ({ ...prev, loading: false }));
            }
          }
        }
      };

      await pollStatus();
    } catch (err) {
      console.error("Error during parsing:", err);
      setState((prev) => ({
        ...prev,
        parsingStatus: ParsingStatusEnum.ERROR,
        parsing: false,
      }));
      toast.error("Failed to parse repository. Please try again.");
    }
  };

  // Handle parse button click from IdeaInputCard
  const handleParseRepo = async () => {
    if (!state.selectedRepo) {
      toast.error("Please select a repository first");
      return;
    }

    const selectedRepoData = repositories.find(
      (repo: Repo) => repo.id?.toString() === state.selectedRepo
    );

    if (!selectedRepoData) {
      toast.error("Repository not found");
      return;
    }

    const repoName = selectedRepoData.full_name || selectedRepoData.name || "";
    const branchName =
      state.selectedBranch || selectedRepoData.default_branch || "main";

    await parseRepo(repoName, branchName);
  };

  // Helper function to create conversation and navigate (for ask/debug agents)
  const createConversationAndNavigate = async (projectId: string): Promise<boolean> => {
    if (
      !state.selectedAgent ||
      (state.selectedAgent !== "ask" && state.selectedAgent !== "debug")
    ) {
      console.error("[Idea Page] Invalid agent for conversation:", state.selectedAgent);
      return false;
    }

    if (!user?.uid) {
      console.error("[Idea Page] No user UID found");
      toast.error("Please sign in to continue");
      return false;
    }

    try {
      // Map agent selection to agent IDs
      const agentIdMap: Record<string, string> = {
        ask: "codebase_qna_agent",
        debug: "debugging_agent",
      };

      const agentId = agentIdMap[state.selectedAgent];
      if (!agentId) {
        console.error("[Idea Page] Invalid agent ID mapping for:", state.selectedAgent);
        toast.error("Invalid agent selection");
        return false;
      }

      const title =
        state.selectedAgent === "ask" ? "Codebase Q&A Chat" : "Debug Chat";

      console.log(
        "[Idea Page] Creating conversation for agent:",
        state.selectedAgent,
        "with projectId:",
        projectId,
        "userId:",
        user.uid
      );

      // Create conversation (same signature as newchat/step2.tsx)
      const conversationResponse = await ChatService.createConversation(
        user.uid,
        title,
        projectId,
        agentId
      );

      console.log(
        "[Idea Page] Conversation created successfully:",
        conversationResponse
      );

      if (!conversationResponse?.conversation_id) {
        console.error("[Idea Page] No conversation_id in response:", conversationResponse);
        toast.error("Failed to create conversation. Invalid response from server.");
        return false;
      }

      // Set up chat context in Redux - same as newchat/step2.tsx
      dispatch(setChat({ agentId }));

      // Store pending message if user provided input
      if (state.input.trim()) {
        const cleanInput = getCleanInput(state.input);
        dispatch(setPendingMessage(cleanInput));
        console.log("[Idea Page] Stored pending message for chat");
      }

      // Navigate to chat - the chat page will handle sending the pending message
      const chatUrl = `/chat/${conversationResponse.conversation_id}`;
      console.log("[Idea Page] Navigating to chat:", chatUrl);
      router.push(chatUrl);
      return true;
    } catch (error: any) {
      console.error("[Idea Page] Failed to create conversation:", error);
      console.error("[Idea Page] Error details:", {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      toast.error(
        error.message || "Failed to create conversation. Please try again."
      );
      return false;
    }
  };

  // Helper function to check if repo is ready and get projectId
  const getProjectIdForRepo = async (
    repoName: string,
    branchName: string
  ): Promise<string | null> => {
    try {
      // Check projects list to find ready project for this repo
      const repoFullName = repoName;
      const repoNameOnly = repoFullName?.split("/").pop() || repoName;

      const readyProject = projects?.find((project: any) => {
        if (!project.repo_name || project.status !== "ready") {
          return false;
        }
        const projectRepoName = project.repo_name;
        return (
          projectRepoName === repoFullName ||
          projectRepoName === repoNameOnly ||
          (repoFullName && repoFullName.includes(projectRepoName)) ||
          projectRepoName.includes(repoNameOnly)
        );
      });

      if (readyProject?.id) {
        console.log(
          "[Idea Page] Found ready project in list, projectId:",
          readyProject.id
        );
        return readyProject.id.toString();
      }

      // Also try checkParsingStatus as additional check
      try {
        const statusResponse =
          await BranchAndRepositoryService.checkParsingStatus(
            repoName,
            branchName
          );
        if (statusResponse?.status === ParsingStatusEnum.READY) {
          // If status is ready but we didn't find project in list, try to parse to get projectId
          // This will return projectId from parse response
          console.log(
            "[Idea Page] Repo status is ready, but projectId not found in list"
          );
        }
      } catch (error) {
        // Ignore checkParsingStatus errors
      }

      return null;
    } catch (error) {
      console.error("[Idea Page] Error checking repo status:", error);
      return null;
    }
  };

  // Handle continue to next page
  const handleContinue = async () => {
    // Ensure agent is selected
    if (!state.selectedAgent) {
      toast.error("Please select an agent (Ask, Build, or Debug)");
      return;
    }

    const selectedRepoData = repositories.find(
      (repo: Repo) => repo.id?.toString() === state.selectedRepo
    );
    const repoName =
      selectedRepoData?.full_name || selectedRepoData?.name || "";
    const branchName =
      state.selectedBranch || selectedRepoData?.default_branch || "main";

    // If "ask" or "debug" agent is selected, create conversation and send message
    if (state.selectedAgent === "ask" || state.selectedAgent === "debug") {
      if (!state.projectId) {
        toast.error("Project ID is required. Please submit your idea first.");
        return;
      }

      setState((prev) => ({ ...prev, loading: true }));
      try {
        const success = await createConversationAndNavigate(state.projectId);
        if (!success) {
          setState((prev) => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("[Idea Page] Error in handleContinue:", error);
        setState((prev) => ({ ...prev, loading: false }));
      }
      return;
    }

    // For "build" agent, navigate to repo page with recipeId
    if (state.selectedAgent === "build") {
      if (!state.recipeId) {
        toast.error("Recipe ID is required. Please submit your idea first.");
        return;
      }

      // Store recipe data in localStorage for spec page to retrieve project_id
      localStorage.setItem(
        `recipe_${state.recipeId}`,
        JSON.stringify({
          recipe_id: state.recipeId,
          project_id: state.projectId,
          repo_name: repoName,
          branch_name: branchName,
        })
      );

      dispatch(
        setRepoAndBranchForTask({
          taskId: state.recipeId, // Use recipeId
          repoName: repoName || "",
          branchName,
        })
      );

      // Navigate to repo page with recipeId in URL
      const params = new URLSearchParams({
        recipeId: state.recipeId, // Pass recipeId instead of projectId
      });
      if (repoName) {
        params.append("repoName", repoName);
      }
      if (branchName) {
        params.append("branch", branchName);
      }
      if (state.input) {
        const cleanInput = getCleanInput(state.input);
        params.append("featureIdea", cleanInput);
      }
      
      // Check if demo mode should be activated
      const shouldActivateDemoMode = checkDemoMode(repoName, branchName, state.input);
      if (shouldActivateDemoMode) {
        params.append("showcase", "1");
      }

      console.log(
        "[Idea Page] Navigating to repo page with recipeId:",
        state.recipeId,
        "demo mode:",
        shouldActivateDemoMode
      );
      router.push(`/repo?${params.toString()}`);
      return;
    }

    console.error("[Idea Page] Invalid agent selection:", state.selectedAgent);
    toast.error("Invalid agent selection");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    // Strip agent prefix from input if present
    const cleanInput = getCleanInput(state.input);

    if (!cleanInput) {
      toast.error("Please describe your feature idea");
      return;
    }

    // NEW: Require agent selection
    if (!state.selectedAgent) {
      toast.error("Please select an agent (Ask, Build, or Debug)");
      return;
    }

    if (state.loading) return; // Prevent multiple submissions

    setState((prev) => ({ ...prev, loading: true }));

    // For build agent, check if repo needs parsing first, then create recipe
    if (state.selectedAgent === "build") {
      if (!state.selectedRepo) {
        toast.error("Please select a repository before submitting");
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      const selectedRepoData = repositories.find(
        (repo: Repo) => repo.id?.toString() === state.selectedRepo
      );

      if (!selectedRepoData) {
        toast.error(
          "Selected repository not found. Please select a repository again."
        );
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      // Ensure we have a valid repo slug (full_name format: owner/repo-name)
      const repoSlug = selectedRepoData.full_name || selectedRepoData.name;
      if (!repoSlug || repoSlug.trim() === "") {
        toast.error(
          "Repository name is invalid. Please select a valid repository."
        );
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      const branchName =
        state.selectedBranch || selectedRepoData.default_branch || "main";

      // Check if repo has a ready project
      const repoFullName = selectedRepoData.full_name || selectedRepoData.name;
      const repoNameOnly =
        repoFullName?.split("/").pop() || selectedRepoData.name;

      // Find the ready project and extract projectId
      const readyProject = projects?.find((project: any) => {
        if (!project.repo_name || project.status !== "ready") {
          return false;
        }
        const projectRepoName = project.repo_name;
        return (
          projectRepoName === repoFullName ||
          projectRepoName === repoNameOnly ||
          (repoFullName && repoFullName.includes(projectRepoName)) ||
          projectRepoName.includes(repoNameOnly)
        );
      });

      const hasReadyProject = !!readyProject;
      const projectId = readyProject?.id?.toString() || null;

      // If repo is not ready, parse it first
      if (!hasReadyProject) {
        console.log(
          "[Idea Page] Repo not ready, starting parsing first:",
          repoFullName
        );
        setState((prev) => ({ ...prev, loading: false }));

        // Start parsing - after parsing completes, user can continue to create recipe
        await parseRepo(repoFullName, branchName);
        return;
      }

      // Repo is ready, extract projectId and create recipe
      if (!projectId) {
        toast.error("Project ID not found. Please try again.");
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      // Store projectId in state
      setState((prev) => ({ ...prev, projectId }));

      // Dispatch projectId to Redux store
      dispatch(
        setRepoAndBranchForTask({
          taskId: projectId, // Use projectId as temporary taskId until we have recipeId
          repoName: repoSlug.trim(),
          branchName,
          projectId,
        })
      );

      console.log("[Idea Page] Repo is ready, creating recipe with:", {
        userPrompt: cleanInput,
        repoSlug,
        branch: branchName,
        projectId,
      });

      // Create recipe with projectId
      createRecipeMutation.mutate({
        userPrompt: cleanInput,
        projectId,
        additionalLinks: undefined,
      });
      return;
    }

    // For ask/debug agents, check repo status and create conversation
    if (state.selectedAgent === "ask" || state.selectedAgent === "debug") {
      if (!state.selectedRepo || !state.selectedBranch) {
        toast.error("Please select a repository and branch");
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      const selectedRepoData = repositories.find(
        (repo: Repo) => repo.id?.toString() === state.selectedRepo
      );

      if (!selectedRepoData) {
        toast.error(
          "Selected repository not found. Please select a repository again."
        );
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      const repoName =
        selectedRepoData.full_name || selectedRepoData.name || "";
      const branchName =
        state.selectedBranch || selectedRepoData.default_branch || "main";

      // Check if repo is already ready
      const projectId = await getProjectIdForRepo(repoName, branchName);

      if (projectId) {
        // Repo is ready, create conversation immediately
        // Keep loading: true during conversation creation for visual feedback
        console.log(
          "[Idea Page] Repo is ready, creating conversation immediately"
        );
        setState((prev) => ({ ...prev, projectId }));
        try {
          await createConversationAndNavigate(projectId);
        } finally {
          // Only set loading to false if navigation didn't happen (error case)
          setState((prev) => ({ ...prev, loading: false }));
        }
        return;
      }

      // Repo is not ready, parse it first
      console.log("[Idea Page] Repo not ready, starting parsing:", repoName);
      setState((prev) => ({ ...prev, loading: false }));
      await parseRepo(repoName, branchName);
      return;
    }

    // For build agent, use existing flow
    // If project already exists, just select repo if needed
    if (state.projectId && state.selectedRepo) {
      selectRepoMutation.mutate({
        projectId: state.projectId,
        repoId: state.selectedRepo,
      });
      return;
    }

    // Create new project
    createProjectMutation.mutate(cleanInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleRepoSelect = (repoId: string) => {
    setState((prev) => ({
      ...prev,
      selectedRepo: repoId,
      selectedBranch: null, // Reset branch when repo changes
    }));

    // If project exists, start parsing immediately
    if (state.projectId) {
      selectRepoMutation.mutate({
        projectId: state.projectId,
        repoId: repoId,
      });
    }
  };

  const handleBranchSelect = (branch: string) => {
    setState((prev) => ({ ...prev, selectedBranch: branch }));
  };

  const handleAgentSelect = (agent: string) => {
    setState((prev) => ({ ...prev, selectedAgent: agent }));
  };

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ backgroundColor: "#FAF8F7" }}
    >
       {/* SVG Background */}
       <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "url('/images/Mesh.svg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.75,
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pt-40 pb-4 relative z-10">
        <div className="w-full max-w-4xl space-y-6">
          {/* Logo and Title */}
          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center">
              <Image
                src="/images/logo.svg"
                alt="Potpie Logo"
                width={56}
                height={56}
                className="w-14 h-14"
              />
            </div>
            <h1 className="text-3xl font-semibold text-foreground">
              Always be cooking!
            </h1>
          </div>

          {/* Input Card - Centered */}
          <div className="space-y-3">
            <IdeaInputCard
              input={state.input}
              onInputChange={(value) =>
                setState((prev) => ({ ...prev, input: value }))
              }
              onKeyDown={handleKeyDown}
              textareaRef={textareaRef}
              loading={state.loading}
              onSubmit={handleSubmit}
              selectedRepo={state.selectedRepo}
              onRepoSelect={handleRepoSelect}
              repositories={state.linkedRepos}
              reposLoading={reposLoading}
              selectedBranch={state.selectedBranch}
              onBranchSelect={handleBranchSelect}
              branches={branches || []}
              branchesLoading={branchesLoading}
              selectedAgent={state.selectedAgent}
              onAgentSelect={handleAgentSelect}
              onParseRepo={handleParseRepo}
            />

            {/* Agent Selection Tiles - Outside the card (hidden during parsing) */}
            {!state.parsing && (
              <div className="flex items-center justify-center gap-2.5 mt-2">
                {[
                  {
                    value: "ask",
                    label: "ask a question",
                    displayLabel: "Ask a question",
                  },
                  {
                    value: "build",
                    label: "Build a feature",
                    displayLabel: "Build a feature",
                  },
                  {
                    value: "debug",
                    label: "Debug an issue",
                    displayLabel: "Debug an issue",
                  },
                ].map((agent) => {
                  const isSelected = agent.value === state.selectedAgent;
                  return (
                    <button
                      key={agent.value}
                      type="button"
                      onClick={() => {
                        handleAgentSelect(agent.value);

                        // Focus the textarea - no text changes, just visual pill
                        setTimeout(() => {
                          if (textareaRef.current) {
                            textareaRef.current.focus();
                            // Position cursor at the start (after the pill visually)
                            textareaRef.current.setSelectionRange(0, 0);
                          }
                        }, 0);
                      }}
                      disabled={state.loading}
                      className={`
                        px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200
                        flex items-center gap-2 min-w-[120px] justify-center
                        border border-zinc-300
                        ${
                          isSelected
                            ? "text-[#00291C] shadow-md scale-105"
                            : "bg-zinc-50 text-foreground hover:bg-zinc-100"
                        }
                        ${state.loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105"}
                      `}
                      style={{
                        backgroundColor: isSelected
                          ? "var(--accent-color)"
                          : undefined,
                      }}
                    >
                      <span>{agent.displayLabel}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Parsing Status Card */}
            {state.parsing && (
              <ParsingStatusCard
                steps={state.parsingSteps}
                progress={state.parsingProgress}
                onContinue={
                  state.selectedAgent === "build" ? handleContinue : undefined
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
