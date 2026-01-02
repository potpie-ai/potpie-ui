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
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/lib/state/store";
import { useAuthContext } from "@/contexts/AuthContext";
import ChatService from "@/services/ChatService";
import { setPendingMessage, setChat } from "@/lib/state/Reducers/chat";
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
    selectedRepo: null,
    selectedBranch: null,
    selectedAgent: null, // CHANGED: Was "build", now null - requires explicit selection
    parsing: false,
    parsingProgress: 0,
    parsingSteps: [],
    linkedRepos: [],
    parsingStatus: "",
  });

  // Demo mode check
  const isDemoMode = searchParams.get("demo") === "true";

  // Fetch all repositories
  const { data: allRepositories, isLoading: reposLoading, refetch: refetchRepos } = useQuery({
    queryKey: ["user-repositories"],
    queryFn: async () => {
      const repos = await BranchAndRepositoryService.getUserRepositories();
      return repos || [];
    },
  });

  // Fetch projects to identify parsed repos
  const { data: projects, refetch: refetchProjects } = useQuery({
    queryKey: ["user-projects"],
    queryFn: async () => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      try {
        const response = await axios.get(`${baseUrl}/api/v1/projects/list`, { headers });
        return response.data || [];
      } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
      }
    },
  });

  // Show all repositories (like newchat) - no filtering
  // Users can parse any repo they want
  const repositories = useMemo(() => {
    if (!allRepositories || allRepositories.length === 0) {
      return [];
    }
    // Return all repositories without filtering
    return allRepositories;
  }, [allRepositories]);

  // Listen for GitHub app installation completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin === "https://github.com" || event.origin === window.location.origin) {
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
          selectedRepo: repositories[0].id.toString() 
        };
      });
    }
  }, [isDemoMode, repositories]);

  // Demo mode: pre-fill textarea
  useEffect(() => {
    if (isDemoMode && !state.input) {
      const demoIdeas = {
        ask: "How do I implement authentication in my Next.js app?",
        build: "Integrate payment processing with Stripe. Add a checkout page with credit card validation, handle webhooks for payment status updates, and create an admin dashboard to view transactions.",
        debug: "Explore the tool with a pre-configured fraud detection pipeline demo showcasing the full workflow. This demo will walk you through the complete process of building, analyzing, and implementing a feature.",
      };
      const demoIdea = state.selectedAgent ? demoIdeas[state.selectedAgent as keyof typeof demoIdeas] || demoIdeas.build : demoIdeas.build;
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

  // Create project mutation
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
    onSuccess: (data) => {
      setState((prev) => ({ 
        ...prev, 
        projectId: data.id.toString(),
        loading: false 
      }));
      
      // If repo already selected, parse it
      if (state.selectedRepo) {
        const selectedRepoData = repositories.find(
          (repo: Repo) => repo.id?.toString() === state.selectedRepo
        );
        if (selectedRepoData) {
          const repoName = selectedRepoData.full_name || selectedRepoData.name || "";
          const branchName = state.selectedBranch || selectedRepoData.default_branch || "main";
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

  // Select repository mutation
  const selectRepoMutation = useMutation({
    mutationFn: async ({ projectId, repoId }: { projectId: string; repoId: string }) => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      
      const response = await axios.post(
        `${baseUrl}/api/v1/repos/select`,
        { project_id: projectId, repo_id: repoId },
        { headers }
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      const selectedRepoData = repositories.find(
        (repo: Repo) => repo.id?.toString() === variables.repoId
      );
      if (selectedRepoData) {
        const repoName = selectedRepoData.full_name || selectedRepoData.name || "";
        const branchName = state.selectedBranch || selectedRepoData.default_branch || "main";
        parseRepo(repoName, branchName);
      }
    },
    onError: (error: any) => {
      console.error("Error selecting repository:", error);
      toast.error(error.response?.data?.detail || "Failed to select repository");
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
            steps = ["Cloning repository...", "Analyzing directory structure..."];
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
            parsing: status !== ParsingStatusEnum.READY && status !== ParsingStatusEnum.ERROR,
          }));
        };

        // Initial status update
        updateStatusAndProgress(parsingStatus);

        // Poll until ready or error or timeout
        while (parsingStatus !== ParsingStatusEnum.READY && 
               parsingStatus !== ParsingStatusEnum.ERROR && 
               Date.now() - startTime < maxDuration) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          
          try {
            parsingStatus = await BranchAndRepositoryService.getParsingStatus(projectId);
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
        if (Date.now() - startTime >= maxDuration && parsingStatus !== ParsingStatusEnum.READY) {
          setState((prev) => ({
            ...prev,
            parsingStatus: ParsingStatusEnum.ERROR,
            parsing: false,
          }));
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
    const branchName = state.selectedBranch || selectedRepoData.default_branch || "main";

    await parseRepo(repoName, branchName);
  };

  // Handle continue to next page
  const handleContinue = async () => {
    if (!state.projectId) return;
    
    // Ensure agent is selected
    if (!state.selectedAgent) {
      toast.error("Please select an agent (Ask, Build, or Debug)");
      return;
    }
    
    const selectedRepoData = repositories.find(
      (repo: Repo) => repo.id?.toString() === state.selectedRepo
    );
    const repoName = selectedRepoData?.full_name || selectedRepoData?.name || "";
    const branchName = state.selectedBranch || 
      selectedRepoData?.default_branch ||
      "main";
    
    // If "ask" or "debug" agent is selected, create conversation and send message
    if (state.selectedAgent === "ask" || state.selectedAgent === "debug") {
      if (!user?.uid) {
        toast.error("Please sign in to continue");
        return;
      }

      try {
        // Map agent selection to agent IDs
        const agentIdMap: Record<string, string> = {
          ask: "codebase_qna_agent",
          debug: "debugging_agent",
        };
        
        const agentId = agentIdMap[state.selectedAgent];
        if (!agentId) {
          toast.error("Invalid agent selection");
          return;
        }

        const title = state.selectedAgent === "ask" 
          ? "Codebase Q&A Chat" 
          : "Debug Chat";

        console.log("[Idea Page] Creating conversation for agent:", state.selectedAgent);
        
        // Create conversation (same signature as newchat/step2.tsx)
        const conversationResponse = await ChatService.createConversation(
          user.uid,
          title,
          state.projectId,
          agentId
        );

        console.log("[Idea Page] Conversation created:", conversationResponse.conversation_id);

        // Set up chat context in Redux - same as newchat/step2.tsx
        dispatch(setChat({ agentId }));

        // Store pending message if user provided input
        if (state.input.trim()) {
          dispatch(setPendingMessage(state.input));
        }

        // Navigate to chat - the chat page will handle sending the pending message
        router.push(`/chat/${conversationResponse.conversation_id}`);
      } catch (error: any) {
        console.error("[Idea Page] Failed to create conversation:", error);
        toast.error(error.message || "Failed to create conversation. Please try again.");
      }
      return;
    }
    
    // Only create recipe for "build" agent - this should be the only remaining case
    if (state.selectedAgent !== "build") {
      console.error("[Idea Page] Invalid agent selection for recipe creation:", state.selectedAgent);
      toast.error("Recipe creation is only available for Build agent");
      return;
    }
    
    // Recipe creation only happens for "build" agent
    try {
      // Create recipe when Continue is pressed (for "build" agent only)
      console.log("[Idea Page] Creating recipe before navigating to repo page");
      const recipeResponse = await SpecService.createRecipe({
        project_id: state.projectId,
        user_prompt: state.input || "Implementation plan generation",
        user_requirements: {},
      });

      console.log("[Idea Page] Recipe created successfully:", recipeResponse);

      // Validate recipe_id is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!recipeResponse.recipe_id || !uuidRegex.test(recipeResponse.recipe_id)) {
        console.error("[Idea Page] Invalid recipe_id from API:", recipeResponse.recipe_id);
        toast.error("Invalid recipe ID received from server. Please try again.");
        return;
      }

      // Store recipe data in localStorage for spec page to retrieve project_id
      localStorage.setItem(`recipe_${recipeResponse.recipe_id}`, JSON.stringify({
        recipe_id: recipeResponse.recipe_id,
        project_id: state.projectId,
        repo_name: repoName,
        branch_name: branchName,
      }));

      // Note: setRepoAndBranchForTask removed - not needed for current flow

      // Navigate to repo page with recipeId in URL
      const params = new URLSearchParams({
        projectId: state.projectId,
        recipeId: recipeResponse.recipe_id,
      });
      if (repoName) {
        params.append("repoName", repoName);
      }
      if (state.input) {
        params.append("featureIdea", state.input);
      }
      
      console.log("[Idea Page] Navigating to repo page with recipeId:", recipeResponse.recipe_id);
      router.push(`/repo?${params.toString()}`);
    } catch (error: any) {
      console.error("[Idea Page] Failed to create recipe:", error);
      toast.error(error.message || "Failed to create recipe. Please try again.");
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!state.input.trim()) {
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

    // If project already exists, just select repo if needed
    if (state.projectId && state.selectedRepo) {
      selectRepoMutation.mutate({
        projectId: state.projectId,
        repoId: state.selectedRepo,
      });
      return;
    }

    // Create new project
    createProjectMutation.mutate(state.input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleRepoSelect = (repoId: string) => {
    setState((prev) => ({ ...prev, selectedRepo: repoId }));
    
    // If project exists, start parsing immediately
    if (state.projectId) {
      selectRepoMutation.mutate({
        projectId: state.projectId,
        repoId: repoId,
      });
    }
  };

  const handleAgentSelect = (agent: string) => {
    setState((prev) => ({ ...prev, selectedAgent: agent }));
  };

  return (
    <div className="min-h-screen bg-white flex relative">
      {/* Dot Pattern Background - More Visible */}
      <div className="absolute inset-0 opacity-60 pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle, #71717a 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pt-52 pb-4 relative z-10">
        <div className="w-full max-w-4xl space-y-6">
          {/* Logo and Title */}
          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center">
              <Image
                src="/images/potpie-blue.svg"
                alt="Potpie Logo"
                width={56}
                height={56}
                className="w-14 h-14"
              />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              Let&apos;s cook some ideas!
            </h1>
          </div>

          {/* Input Card - Centered */}
          <div className="space-y-3">
            <IdeaInputCard
              input={state.input}
              onInputChange={(value) => setState((prev) => ({ ...prev, input: value }))}
              onKeyDown={handleKeyDown}
              textareaRef={textareaRef}
              loading={state.loading}
              onSubmit={handleSubmit}
              selectedRepo={state.selectedRepo}
              onRepoSelect={handleRepoSelect}
              repositories={state.linkedRepos}
              reposLoading={reposLoading}
              selectedAgent={state.selectedAgent}
              onAgentSelect={handleAgentSelect}
              onParseRepo={handleParseRepo}
            />

            {/* Parsing Status Card */}
            {state.parsing && (
              <ParsingStatusCard
                steps={state.parsingSteps}
                progress={state.parsingProgress}
                onContinue={handleContinue}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
