"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Send, Paperclip, Mic, Loader2 } from "lucide-react";
import Image from "next/image";
import IdeaInputCard from "./components/IdeaInputCard";
import RepositorySelector from "./components/RepositorySelector";
import ParsingStatusCard from "./components/ParsingStatusCard";
import { useQuery, useMutation } from "@tanstack/react-query";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

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
  parsing: boolean;
  parsingProgress: number;
  parsingSteps: string[];
  linkedRepos: Repo[];
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

  const [state, setState] = useState<IdeaPageState>({
    input: "",
    loading: false,
    projectId: null,
    selectedRepo: null,
    parsing: false,
    parsingProgress: 0,
    parsingSteps: [],
    linkedRepos: [],
  });

  // Demo mode check
  const isDemoMode = searchParams.get("demo") === "true";
  const goal = searchParams.get("goal"); // "feature" or "workflow"

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

  // Filter repositories to only show parsed ones (repos with status "ready")
  // Use useMemo to prevent infinite loops - only recompute when dependencies change
  const repositories = useMemo(() => {
    if (!allRepositories || allRepositories.length === 0) {
      console.log("No repositories available");
      return [];
    }
    if (!projects || projects.length === 0) {
      console.log("No projects available");
      return [];
    }
    
    console.log("Filtering repos - allRepositories:", allRepositories);
    console.log("Filtering repos - projects:", projects);
    
    const filtered = allRepositories.filter((repo: Repo) => {
      const repoFullName = repo.full_name || repo.name;
      const repoNameOnly = repoFullName?.split("/").pop() || repo.name; // Extract just the repo name
      const repoId = repo.id?.toString();
      
      // Check if repo has a corresponding project with status "ready"
      const hasReadyProject = projects.some((project: any) => {
        // Skip projects without repo_name
        if (!project.repo_name) {
          return false;
        }
        
        const projectRepoName = project.repo_name;
        const projectId = project.id?.toString();
        const projectStatus = project.status;
        
        // Only consider projects with status "ready"
        if (projectStatus !== "ready") {
          return false;
        }
        
        // Try multiple matching strategies:
        // 1. Exact match with full_name
        if (projectRepoName === repoFullName) {
          console.log("Matched repo by full_name:", repoFullName, "with project:", projectRepoName, "status:", projectStatus);
          return true;
        }
        
        // 2. Match with just the repo name (without owner)
        if (projectRepoName === repoNameOnly) {
          console.log("Matched repo by name only:", repoNameOnly, "with project:", projectRepoName, "status:", projectStatus);
          return true;
        }
        
        // 3. Match if projectRepoName is contained in repoFullName (e.g., "repo-name" in "owner/repo-name")
        if (repoFullName && repoFullName.includes(projectRepoName)) {
          console.log("Matched repo by substring:", repoFullName, "contains project:", projectRepoName, "status:", projectStatus);
          return true;
        }
        
        // 4. Match if repoNameOnly is contained in projectRepoName
        if (projectRepoName.includes(repoNameOnly)) {
          console.log("Matched repo by reverse substring:", projectRepoName, "contains repo:", repoNameOnly, "status:", projectStatus);
          return true;
        }
        
        return false;
      });
      
      if (!hasReadyProject) {
        console.log("No ready project found for repo:", repoFullName, "id:", repoId, "nameOnly:", repoNameOnly);
      }
      
      return hasReadyProject;
    });
    
    console.log("Filtered repositories:", filtered);
    return filtered;
  }, [allRepositories, projects]);

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
        feature: "Integrate payment processing with Stripe. Add a checkout page with credit card validation, handle webhooks for payment status updates, and create an admin dashboard to view transactions.",
        workflow: "Create an automated workflow that monitors GitHub pull requests, runs tests, and sends Slack notifications when PRs are ready for review.",
        demo: "Explore the tool with a pre-configured fraud detection pipeline demo showcasing the full workflow. This demo will walk you through the complete process of building, analyzing, and implementing a feature.",
      };
      const demoIdea = goal ? demoIdeas[goal as keyof typeof demoIdeas] : demoIdeas.feature;
      setState((prev) => ({ ...prev, input: demoIdea }));
    }
  }, [isDemoMode, goal]);

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
      
      // If repo already selected, start parsing immediately
      if (state.selectedRepo) {
        startParsing(data.id.toString(), state.selectedRepo);
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
      startParsing(variables.projectId, variables.repoId);
    },
    onError: (error: any) => {
      console.error("Error selecting repository:", error);
      toast.error(error.response?.data?.detail || "Failed to select repository");
    },
  });

  // Start parsing with progress simulation
  const startParsing = (projectId: string, repoId: string) => {
    // Capture current values before starting the interval
    const selectedRepoData = repositories.find(
      (repo) => repo.id?.toString() === repoId
    );
    const repoName = selectedRepoData?.full_name || selectedRepoData?.name || "";
    const currentInput = state.input || "";

    setState((prev) => ({ 
      ...prev, 
      parsing: true, 
      parsingProgress: 0,
      parsingSteps: [],
      projectId: projectId, // Store project ID for later use
    }));

    // Simulate parsing steps
    let currentStep = 0;
    const stepInterval = setInterval(() => {
      if (currentStep < PARSING_STEPS.length) {
        setState((prev) => ({
          ...prev,
          parsingSteps: [...prev.parsingSteps, PARSING_STEPS[currentStep]],
          parsingProgress: Math.min(((currentStep + 1) / PARSING_STEPS.length) * 100, 100),
        }));
        currentStep++;
      } else {
        clearInterval(stepInterval);
        // Don't auto-navigate - user will click Continue button
      }
    }, 800); // 800ms per step for smoother animation
  };

  // Handle continue to next page
  const handleContinue = () => {
    if (!state.projectId) return;
    
    const selectedRepoData = repositories.find(
      (repo) => repo.id?.toString() === state.selectedRepo
    );
    const repoName = selectedRepoData?.full_name || selectedRepoData?.name || "";
    
    const params = new URLSearchParams({
      projectId: state.projectId,
    });
    if (repoName) {
      params.append("repoName", repoName);
    }
    if (state.input) {
      params.append("featureIdea", state.input);
    }
    
    router.push(`/repo?${params.toString()}`);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!state.input.trim()) {
      toast.error("Please describe your feature idea");
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

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      {/* Dot Pattern Background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle, #9ca3af 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 relative z-10">
        <div className="w-full max-w-4xl space-y-6">
          {/* Logo and Title */}
          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
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

