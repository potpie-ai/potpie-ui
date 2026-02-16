"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import Image from "next/image";
import IdeaInputCard from "../idea/components/IdeaInputCard";
import ParsingStatusCard from "../idea/components/ParsingStatusCard";
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
import MediaService from "@/services/MediaService";
import { setPendingMessage, setChat } from "@/lib/state/Reducers/chat";
import { setRepoAndBranchForTask } from "@/lib/state/Reducers/RepoAndBranch";
import { ParsingStatusEnum } from "@/lib/Constants";
import { useProFeatureError } from "@/lib/hooks/useProFeatureError";
import { ProFeatureModal } from "@/components/Layouts/ProFeatureModal";
import { useGithubAppPopup } from "../idea/hooks/useGithubAppPopup";

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

interface NewChatPageState {
  input: string;
  loading: boolean;
  projectId: string | null;
  recipeId: string | null;
  selectedRepo: string | null;
  selectedBranch: string | null;
  selectedAgent: string | null;
  parsing: boolean;
  parsingProgress: number;
  parsingSteps: string[];
  linkedRepos: Repo[];
  parsingStatus: string;
  attachmentIds: string[];
  attachmentUploading: boolean;
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

export default function NewChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuthContext();
  const { isModalOpen, setIsModalOpen, handleError } = useProFeatureError();
  const { openGithubPopup } = useGithubAppPopup(() => {
    // Refetch repos when GitHub App installation is complete
    refetchRepos();
  });

  const [state, setState] = useState<NewChatPageState>({
    input: "",
    loading: false,
    projectId: null,
    recipeId: null,
    selectedRepo: null,
    selectedBranch: null,
    selectedAgent: "ask",
    parsing: false,
    parsingProgress: 0,
    parsingSteps: [],
    linkedRepos: [],
    parsingStatus: "",
    attachmentIds: [],
    attachmentUploading: false,
  });

  const [repoSearchTerm, setRepoSearchTerm] = useState<string>("");
  const [branchSearchTerm, setBranchSearchTerm] = useState<string>("");
  const [debouncedRepoSearch, setDebouncedRepoSearch] = useState<string>("");
  const [debouncedBranchSearch, setDebouncedBranchSearch] = useState<string>("");
  const repoSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const branchSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isDemoMode = searchParams.get("demo") === "true";

  // Debounce repository search (300ms)
  useEffect(() => {
    if (repoSearchTimeoutRef.current) {
      clearTimeout(repoSearchTimeoutRef.current);
    }
    
    // If search is cleared, update debounced value immediately
    const trimmedSearch = repoSearchTerm.trim();
    if (trimmedSearch === "") {
      setDebouncedRepoSearch("");
      return;
    }
    
    repoSearchTimeoutRef.current = setTimeout(() => {
      setDebouncedRepoSearch(trimmedSearch);
    }, 300);
    
    return () => {
      if (repoSearchTimeoutRef.current) {
        clearTimeout(repoSearchTimeoutRef.current);
      }
    };
  }, [repoSearchTerm]);

  // Debounce branch search (300ms)
  useEffect(() => {
    if (branchSearchTimeoutRef.current) {
      clearTimeout(branchSearchTimeoutRef.current);
    }
    
    // If search is cleared, update debounced value immediately
    const trimmedSearch = branchSearchTerm.trim();
    if (trimmedSearch === "") {
      setDebouncedBranchSearch("");
      return;
    }
    
    branchSearchTimeoutRef.current = setTimeout(() => {
      setDebouncedBranchSearch(trimmedSearch);
    }, 300);
    
    return () => {
      if (branchSearchTimeoutRef.current) {
        clearTimeout(branchSearchTimeoutRef.current);
      }
    };
  }, [branchSearchTerm]);

  // Clear search terms when changing repo or branch
  useEffect(() => {
    setRepoSearchTerm("");
    setDebouncedRepoSearch("");
  }, [state.selectedRepo]);

  useEffect(() => {
    setBranchSearchTerm("");
    setDebouncedBranchSearch("");
  }, [state.selectedBranch]);

  const {
    data: allRepositories,
    isLoading: reposLoading,
    refetch: refetchRepos,
    error: reposError,
  } = useQuery({
    queryKey: ["user-repositories", debouncedRepoSearch],
    queryFn: async () => {
      const repos = await BranchAndRepositoryService.getUserRepositories(
        debouncedRepoSearch || undefined
      );
      return repos || [];
    },
    retry: 1,
    retryOnMount: false,
  });

  const repositories = useMemo(() => {
    if (!allRepositories || allRepositories.length === 0) return [];
    return allRepositories;
  }, [allRepositories]);

  const selectedRepoName = useMemo(() => {
    if (!state.selectedRepo || !repositories.length) return null;
    const selectedRepoData = repositories.find(
      (repo: Repo) => repo.id?.toString() === state.selectedRepo
    );
    if (!selectedRepoData) return null;
    return selectedRepoData.full_name || selectedRepoData.name || null;
  }, [state.selectedRepo, repositories]);

  const { data: branches, isLoading: branchesLoading, error: branchesError, refetch: refetchBranches } = useQuery({
    queryKey: ["user-branch", selectedRepoName, debouncedBranchSearch],
    queryFn: () => {
      if (!selectedRepoName) return Promise.resolve([]);
      const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)/;
      const match = selectedRepoName.match(regex);
      if (match) {
        const ownerRepo = `${match[1]}/${match[2]}`;
        return BranchAndRepositoryService.getBranchList(
          ownerRepo,
          debouncedBranchSearch || undefined
        ).then((data) => {
          if (data?.length === 1 && !state.selectedBranch) {
            setState((prev) => ({ ...prev, selectedBranch: data[0] }));
          }
          return data;
        });
      }
      return BranchAndRepositoryService.getBranchList(
        selectedRepoName,
        debouncedBranchSearch || undefined
      ).then((data) => {
        if (data?.length === 1 && !state.selectedBranch) {
          setState((prev) => ({ ...prev, selectedBranch: data[0] }));
        }
        return data;
      });
    },
    enabled: !!selectedRepoName && selectedRepoName !== "",
    retry: 1,
    retryOnMount: false,
  });

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

  useEffect(() => {
    setState((prev) => ({ ...prev, linkedRepos: repositories }));
  }, [repositories]);

  useEffect(() => {
    if (isDemoMode && repositories.length > 0) {
      setState((prev) => {
        if (prev.selectedRepo) return prev;
        return { ...prev, selectedRepo: repositories[0].id.toString() };
      });
    }
  }, [isDemoMode, repositories]);

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

  const getCleanInput = (input: string): string => input.trim();

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

  const createRecipeMutation = useMutation({
    mutationFn: async (data: {
      userPrompt: string;
      projectId: string;
      additionalLinks?: string[];
      attachmentIds?: string[];
    }): Promise<CreateRecipeCodegenResponse> => {
      const recipeResponse = await SpecService.createRecipeCodegen({
        user_prompt: data.userPrompt,
        project_id: data.projectId,
        additional_links: data.additionalLinks,
        attachment_ids: data.attachmentIds?.length
          ? data.attachmentIds
          : undefined,
      });
      const recipeId = recipeResponse.recipe.id;
      SpecService.triggerQuestionGeneration(recipeId, {
        user_prompt: data.userPrompt,
        additional_links: data.additionalLinks,
      }).catch((err) => {
        console.error("[newchat] triggerQuestionGeneration failed", { recipeId, userPrompt: data.userPrompt, error: err });
        toast.error("Question generation could not be started. You can continue to the repo page; questions may load later.");
      });
      return recipeResponse;
    },
    onSuccess: (data: CreateRecipeCodegenResponse) => {
      const recipeId = data.recipe.id;
      const projectId = data.recipe.project_id?.toString() || state.projectId;
      setState((prev) => ({
        ...prev,
        recipeId,
        projectId: projectId || null,
        loading: false,
      }));
      if (state.selectedRepo) {
        const selectedRepoData = repositories.find(
          (repo: Repo) => repo.id?.toString() === state.selectedRepo
        );
        if (selectedRepoData) {
          const repoName =
            selectedRepoData.full_name || selectedRepoData.name || "";
          const branchName =
            state.selectedBranch || selectedRepoData.default_branch || "main";
          localStorage.setItem(
            `recipe_${recipeId}`,
            JSON.stringify({
              recipe_id: recipeId,
              project_id: projectId || null,
              repo_name: repoName,
              branch_name: branchName,
              user_prompt: state.input ? getCleanInput(state.input) : undefined,
            })
          );
          dispatch(
            setRepoAndBranchForTask({
              taskId: recipeId,
              repoName: repoName || "",
              branchName,
              projectId: projectId || undefined,
            })
          );
          const params = new URLSearchParams({ recipeId });
          if (repoName) params.append("repoName", repoName);
          if (state.input) params.append("featureIdea", getCleanInput(state.input));
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
      
      // Check if it's a pro feature error
      if (handleError(error)) {
        // Pro feature error was handled, modal is shown
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }
      
      toast.error(error.message || "Failed to create recipe");
      setState((prev) => ({ ...prev, loading: false }));
    },
  });

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
      _data: unknown,
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
      if (projectId) setState((prev) => ({ ...prev, projectId }));
      if (initialStatus === ParsingStatusEnum.READY) {
        setState((prev) => ({
          ...prev,
          parsingStatus: ParsingStatusEnum.READY,
          parsing: false,
          parsingProgress: 100,
        }));
        if (state.selectedAgent === "build" && state.input.trim() && projectId) {
          const cleanInput = getCleanInput(state.input);
          dispatch(
            setRepoAndBranchForTask({
              taskId: projectId,
              repoName: repoName.trim(),
              branchName: branchName || "main",
              projectId,
            })
          );
          createRecipeMutation.mutate({
            userPrompt: cleanInput,
            projectId,
            additionalLinks: undefined,
            attachmentIds:
              state.attachmentIds.length > 0 ? state.attachmentIds : undefined,
          });
        } else if (
          (state.selectedAgent === "ask" || state.selectedAgent === "debug") &&
          projectId
        ) {
          await createConversationAndNavigate(projectId);
        }
        return;
      }
      const pollStatus = async () => {
        const pollInterval = 5000;
        const maxDuration = 45 * 60 * 1000;
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
            parsing:
              status !== ParsingStatusEnum.READY &&
              status !== ParsingStatusEnum.ERROR,
          }));
        };
        updateStatusAndProgress(parsingStatus);
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
        if (parsingStatus === ParsingStatusEnum.READY) {
          if (
            state.selectedAgent === "build" &&
            state.input.trim() &&
            projectId
          ) {
            const cleanInput = getCleanInput(state.input);
            dispatch(
              setRepoAndBranchForTask({
                taskId: projectId,
                repoName: repoName.trim(),
                branchName: branchName || "main",
                projectId,
              })
            );
            createRecipeMutation.mutate({
              userPrompt: cleanInput,
              projectId,
              additionalLinks: undefined,
              attachmentIds:
                state.attachmentIds.length > 0 ? state.attachmentIds : undefined,
            });
          } else if (
            (state.selectedAgent === "ask" ||
              state.selectedAgent === "debug") &&
            projectId
          ) {
            await createConversationAndNavigate(projectId);
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

  const handleParseRepo = async () => {
    let repoName: string = "";
    let branchName: string = "main";

    // If a repository is selected from the dropdown, use it
    if (state.selectedRepo) {
      const selectedRepoData = repositories.find(
        (repo: Repo) => repo.id?.toString() === state.selectedRepo
      );
      if (!selectedRepoData) {
        toast.error("Repository not found");
        return;
      }
      repoName = selectedRepoData.full_name || selectedRepoData.name || "";
      branchName =
        state.selectedBranch || selectedRepoData.default_branch || "main";
    } 
    // Otherwise, check if user has typed a repository URL in the search field
    else if (debouncedRepoSearch && debouncedRepoSearch.trim()) {
      const searchTerm = debouncedRepoSearch.trim();
      
      // Check if it's a GitHub URL (https://github.com/owner/repo or http://github.com/owner/repo)
      const githubUrlRegex = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/.*)?$/;
      const match = searchTerm.match(githubUrlRegex);
      
      if (match) {
        // Extract owner/repo from URL
        repoName = `${match[1]}/${match[2]}`;
        branchName = state.selectedBranch || "main";
      } 
      // Check if it's already in owner/repo format
      else if (/^[^\/]+\/[^\/]+$/.test(searchTerm)) {
        repoName = searchTerm;
        branchName = state.selectedBranch || "main";
      } 
      else {
        toast.error("Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo) or select a repository from the list");
        return;
      }
    } 
    // No repository selected and no search term - open GitHub App installation popup
    else {
      openGithubPopup();
      return;
    }

    if (!repoName) {
      toast.error("Repository name is required");
      return;
    }

    await parseRepo(repoName, branchName);
  };

  const createConversationAndNavigate = async (projectId: string) => {
    if (
      !state.selectedAgent ||
      (state.selectedAgent !== "ask" && state.selectedAgent !== "debug")
    )
      return;
    if (!user?.uid) {
      toast.error("Please sign in to continue");
      return;
    }
    try {
      const agentIdMap: Record<string, string> = {
        ask: "codebase_qna_agent",
        debug: "debugging_agent",
      };
      const agentId = agentIdMap[state.selectedAgent];
      if (!agentId) {
        toast.error("Invalid agent selection");
        return;
      }
      const title =
        state.selectedAgent === "ask" ? "Codebase Q&A Chat" : "Debug Chat";
      const conversationResponse = await ChatService.createConversation(
        user.uid,
        title,
        projectId,
        agentId
      );
      dispatch(setChat({ agentId }));
      if (state.input.trim()) {
        dispatch(setPendingMessage(getCleanInput(state.input)));
      }
      router.push(`/chat/${conversationResponse.conversation_id}`);
    } catch (error: any) {
      console.error("Failed to create conversation:", error);
      toast.error(
        error.message || "Failed to create conversation. Please try again."
      );
    }
  };

  const getProjectIdForRepo = async (
    repoName: string,
    branchName: string
  ): Promise<string | null> => {
    try {
      const repoFullName = repoName;
      const repoNameOnly = repoFullName?.split("/").pop() || repoName;
      const readyProject = projects?.find((project: any) => {
        if (!project.repo_name || project.status !== "ready") return false;
        const projectRepoName = project.repo_name;
        return (
          projectRepoName === repoFullName ||
          projectRepoName === repoNameOnly ||
          (repoFullName && repoFullName.includes(projectRepoName)) ||
          projectRepoName.includes(repoNameOnly)
        );
      });
      if (readyProject?.id) return readyProject.id.toString();
      return null;
    } catch (error) {
      console.error("Error checking repo status:", error);
      return null;
    }
  };

  const handleContinue = async () => {
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
    if (state.selectedAgent === "ask" || state.selectedAgent === "debug") {
      if (!state.projectId) {
        toast.error("Project ID is required. Please submit your idea first.");
        return;
      }
      await createConversationAndNavigate(state.projectId);
      return;
    }
    if (state.selectedAgent === "build") {
      if (!state.recipeId) {
        toast.error("Recipe ID is required. Please submit your idea first.");
        return;
      }
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
          taskId: state.recipeId,
          repoName: repoName || "",
          branchName,
        })
      );
      const params = new URLSearchParams({ recipeId: state.recipeId });
      if (repoName) params.append("repoName", repoName);
      if (state.input) params.append("featureIdea", getCleanInput(state.input));
      router.push(`/repo?${params.toString()}`);
      return;
    }
    toast.error("Invalid agent selection");
  };

  const handleAttachmentChange = async (
    files: File[],
    removedIndex?: number
  ) => {
    const idsAfterRemove =
      removedIndex !== undefined
        ? state.attachmentIds.filter((_, i) => i !== removedIndex)
        : [...state.attachmentIds];
    if (files.length <= idsAfterRemove.length) {
      setState((prev) => ({ ...prev, attachmentIds: idsAfterRemove }));
      return;
    }
    setState((prev) => ({ ...prev, attachmentUploading: true }));
    try {
      const newIds: string[] = [];
      for (let i = idsAfterRemove.length; i < files.length; i++) {
        const result = await MediaService.uploadFile(files[i]);
        newIds.push(result.id);
      }
      setState((prev) => ({
        ...prev,
        attachmentIds: idsAfterRemove.concat(newIds),
        attachmentUploading: false,
      }));
    } catch (err: unknown) {
      setState((prev) => ({ ...prev, attachmentUploading: false }));
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : null;
      toast.error(
        typeof message === "string" ? message : "Failed to upload attachment."
      );
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanInput = getCleanInput(state.input);
    if (!cleanInput) {
      toast.error("Please describe your feature idea");
      return;
    }
    if (!state.selectedAgent) {
      toast.error("Please select an agent (Ask, Build, or Debug)");
      return;
    }
    if (state.loading) return;
    setState((prev) => ({ ...prev, loading: true }));
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
      const repoFullName = selectedRepoData.full_name || selectedRepoData.name;
      const repoNameOnly =
        repoFullName?.split("/").pop() || selectedRepoData.name;
      const readyProject = projects?.find((project: any) => {
        if (!project.repo_name || project.status !== "ready") return false;
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
      if (!hasReadyProject) {
        setState((prev) => ({ ...prev, loading: false }));
        await parseRepo(repoFullName, branchName);
        return;
      }
      if (!projectId) {
        toast.error("Project ID not found. Please try again.");
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }
      setState((prev) => ({ ...prev, projectId }));
      dispatch(
        setRepoAndBranchForTask({
          taskId: projectId,
          repoName: repoSlug.trim(),
          branchName,
          projectId,
        })
      );
      createRecipeMutation.mutate({
        userPrompt: cleanInput,
        projectId,
        additionalLinks: undefined,
        attachmentIds:
          state.attachmentIds.length > 0 ? state.attachmentIds : undefined,
      });
      return;
    }
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
      const projectId = await getProjectIdForRepo(repoName, branchName);
      if (projectId) {
        setState((prev) => ({ ...prev, loading: false, projectId }));
        await createConversationAndNavigate(projectId);
        return;
      }
      setState((prev) => ({ ...prev, loading: false }));
      await parseRepo(repoName, branchName);
      return;
    }
    if (state.projectId && state.selectedRepo) {
      selectRepoMutation.mutate({
        projectId: state.projectId,
        repoId: state.selectedRepo,
      });
      return;
    }
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
      selectedBranch: null,
    }));
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
      className="h-full flex flex-col overflow-hidden relative"
      style={{ backgroundColor: "#FAF8F7" }}
          >
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
      <div className="flex-1 flex flex-col items-center justify-start min-h-0 overflow-hidden px-4 pt-40 pb-4 relative z-10">
        <div className="w-full max-w-4xl space-y-4 shrink-0">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 flex items-center justify-center">
              <Image
                src="/images/logo.svg"
                alt="Potpie Logo"
                width={56}
                height={56}
                className="w-14 h-14"
                style={{ filter: "none" }}
              />
            </div>
            <h1 className="text-3xl font-bold text-[#000000]">
              Always be cooking!
            </h1>
          </div>
          <div className="space-y-4">
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
              reposError={reposError}
              onRetryRepos={refetchRepos}
              selectedBranch={state.selectedBranch}
              onBranchSelect={handleBranchSelect}
              branches={branches || []}
              branchesLoading={branchesLoading}
              branchesError={branchesError}
              onRetryBranches={refetchBranches}
              selectedAgent={state.selectedAgent}
              onAgentSelect={handleAgentSelect}
              onParseRepo={handleParseRepo}
              onParseRepoWithName={(repoName: string, branchName: string) => {
                parseRepo(repoName, branchName);
              }}
              onAttachmentChange={handleAttachmentChange}
              attachmentUploading={state.attachmentUploading}
              repoSearchTerm={repoSearchTerm}
              onRepoSearchChange={setRepoSearchTerm}
              branchSearchTerm={branchSearchTerm}
              onBranchSearchChange={setBranchSearchTerm}
            />
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
      <ProFeatureModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
