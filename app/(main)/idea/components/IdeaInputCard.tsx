"use client";

/* Figma tokens from Fancy Potpie (pDxJkcflbgI2ssLH6Fl9Mv) */
const FIGMA = {
  cardBg: "#FFFFFF",
  cardBorder: "#E4E4E4",
  cardRadius: "15px",
  inputBg: "#FBFAF9",
  inputBorder: "#E4E4E7",
  inputRadius: "5px",
  textPrimary: "#696D6D",
  textDark: "#000000",
  textMuted: "#A6A6AF",
  terminalHeaderBg: "#FAFAFA",
  terminalContentBg: "#FDFDFD",
  chooseAgentBg: "#FBFAF9",
  claudeDropdownBg: "#EEEEEE",
  claudeDropdownOpacity: 0.63,
  modelDropdownText: "#00291C",
} as const;

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, ChevronDown, Plus, Check, FolderOpen, Github, GitBranch, FileText, X, Search, Bot, Globe, Paperclip, Lock, SendHorizonal, ExternalLink, Crown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuthContext } from "@/contexts/AuthContext";
import MinorService from "@/services/minorService";
import ModelService, { type Model } from "@/services/ModelService";
import { planTypesEnum } from "@/lib/Constants";
import { useGithubAppPopup } from "../hooks/useGithubAppPopup";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import { toast } from "@/components/ui/sonner";

interface IdeaInputCardProps {
  input: string;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  loading: boolean;
  onSubmit: () => void;
  selectedRepo: string | null;
  onRepoSelect: (repoId: string) => void;
  repositories: any[];
  reposLoading: boolean;
  reposError?: Error | null;
  onRetryRepos?: () => void;
  selectedBranch: string | null;
  onBranchSelect: (branch: string) => void;
  branches: string[];
  branchesLoading: boolean;
  branchesError?: Error | null;
  onRetryBranches?: () => void;
  selectedAgent: string | null;
  onAgentSelect: (agent: string) => void;
  onParseRepo?: () => void;
  /** Parse repository with specific name and branch (for public repos) */
  onParseRepoWithName?: (repoName: string, branchName: string) => void;
  /** Current list of attached files (controlled). If undefined, internal state is used. */
  attachedFiles?: File[];
  /** Called when the list changes. removedIndex is set when user removes the file at that index. */
  onAttachmentChange?: (files: File[], removedIndex?: number) => void;
  /** True when any file in the list is being uploaded. */
  attachmentUploading?: boolean;
  /** Handler for repository search term changes (debounced — called after user stops typing) */
  onRepoSearchChange?: (value: string) => void;
  /** Handler for branch search term changes (debounced — called after user stops typing) */
  onBranchSearchChange?: (value: string) => void;
  /** When true, show "Generate spec" option under Debug (e.g. only on localhost in new chat) */
  showSpecGenOption?: boolean;
}

export default function IdeaInputCard({
  input,
  onInputChange,
  onKeyDown,
  textareaRef,
  loading,
  onSubmit,
  selectedRepo,
  onRepoSelect,
  repositories,
  reposLoading,
  reposError,
  onRetryRepos,
  selectedBranch,
  onBranchSelect,
  branches,
  branchesLoading,
  branchesError,
  onRetryBranches,
  selectedAgent,
  onAgentSelect,
  onParseRepo,
  onParseRepoWithName,
  attachedFiles: controlledFiles,
  onAttachmentChange,
  attachmentUploading = false,
  onRepoSearchChange,
  onBranchSearchChange,
  showSpecGenOption = false,
}: IdeaInputCardProps) {
  const router = useRouter();
  const { user } = useAuthContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localRepoSearch, setLocalRepoSearch] = useState("");
  const [localBranchSearch, setLocalBranchSearch] = useState("");
  const repoDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const branchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const { openGithubPopup } = useGithubAppPopup();
  const [publicRepoDialogOpen, setPublicRepoDialogOpen] = useState(false);
  const [publicRepoInput, setPublicRepoInput] = useState("");
  const [checkingPublicRepo, setCheckingPublicRepo] = useState(false);

  // Clear search terms when dropdowns close
  useEffect(() => {
    if (!repoDropdownOpen) {
      setLocalRepoSearch("");
      if (repoDebounceRef.current) clearTimeout(repoDebounceRef.current);
      onRepoSearchChange?.("");
    }
  }, [repoDropdownOpen, onRepoSearchChange]);

  useEffect(() => {
    if (!branchDropdownOpen) {
      setLocalBranchSearch("");
      if (branchDebounceRef.current) clearTimeout(branchDebounceRef.current);
      onBranchSearchChange?.("");
    }
  }, [branchDropdownOpen, onBranchSearchChange]);

  const { data: userSubscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["userSubscription", user?.uid],
    queryFn: () => MinorService.fetchUserSubscription(user?.uid as string),
    enabled: !!user?.uid,
    retry: false,
  });
  // Treat as free while subscription is loading (show locked) to avoid flashing dropdown with empty list
  const isFreeUser =
    subscriptionLoading ||
    !userSubscription ||
    userSubscription.plan_type === planTypesEnum.FREE;

  const [currentModel, setCurrentModel] = useState<{
    id: string;
    name: string;
    provider: string;
  } | null>({ id: "", name: "glm 4.7", provider: "z.ai" });
  const [modelList, setModelList] = useState<Model[]>([]);
  /** Pro users: all models. Free users: all except OpenAI, Anthropic, Gemini (those show upgrade flag). */
  const isModelAvailable = (model: Model) => {
    if (!isFreeUser) return true;
    const p = (model.provider || "").toLowerCase().replace(/[\s.-]/g, "");
    if (p === "openai" || p === "anthropic" || p === "gemini") return false;
    return true;
  };
  const loadCurrentModel = useCallback(async () => {
    try {
      const res = await ModelService.getCurrentModel();
      if (res?.chat_model) {
        setCurrentModel({
          id: res.chat_model.id,
          name: res.chat_model.name,
          provider: res.chat_model.provider,
        });
      }
    } catch {
      setCurrentModel({ id: "", name: "ZLM 4.7", provider: "zai" });
    }
  }, []);
  const loadModelList = useCallback(async () => {
    try {
      const res = await ModelService.listModels();
      setModelList(res.models ?? []);
    } catch {
      setModelList([]);
    }
  }, []);
  // Load model list for all users so dropdown shows API models (free users see grayed + Upgrade for non-available)
  useEffect(() => {
    loadModelList();
  }, [loadModelList]);

  // For free users, show free models first and paid/locked models after.
  const orderedModelList = useMemo(() => {
    if (!modelList || modelList.length === 0) return [];
    if (!isFreeUser) return modelList;
    const freeModels = modelList.filter((m) => isModelAvailable(m));
    const paidModels = modelList.filter((m) => !isModelAvailable(m));
    return [...freeModels, ...paidModels];
  }, [modelList, isFreeUser]);

  const attachedFiles =
    controlledFiles !== undefined ? controlledFiles : localFiles;

  const setAttachedFiles = (files: File[], removedIndex?: number) => {
    setLocalFiles(files);
    onAttachmentChange?.(files, removedIndex);
  };

  // Object URLs for image previews; revoke when files change or unmount
  const [previewUrls, setPreviewUrls] = useState<Record<number, string>>({});
  useEffect(() => {
    const urls: Record<number, string> = {};
    attachedFiles.forEach((file, i) => {
      if (file.type.startsWith("image/")) {
        urls[i] = URL.createObjectURL(file);
      }
    });
    setPreviewUrls((prev) => {
      Object.values(prev).forEach(URL.revokeObjectURL);
      return urls;
    });
    return () => {
      Object.values(urls).forEach(URL.revokeObjectURL);
    };
  }, [attachedFiles]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileTypeLabel = (file: File) => {
    const ext = file.name.split(".").pop()?.toUpperCase() ?? "";
    if (ext) return ext;
    if (file.type) {
      const part = file.type.split("/").pop()?.toUpperCase() ?? "";
      return part || "FILE";
    }
    return "FILE";
  };

  // Reset submitting state when loading completes
  useEffect(() => {
    if (!loading && isSubmitting) {
      setIsSubmitting(false);
    }
  }, [loading, isSubmitting]);

  const selectedRepoData = repositories.find(
    (repo) => repo.id?.toString() === selectedRepo
  );

  const isLocalhost = process.env.NEXT_PUBLIC_BASE_URL?.includes('localhost');
  
  const isLocalRepoPath = selectedRepoData ? (() => {
    const repoName = selectedRepoData.full_name || selectedRepoData.name;
    return repoName.startsWith('/') || repoName.includes('\\');
  })() : false;

  const handleOpenGithubPopup = () => {
    setRepoDropdownOpen(false);
    openGithubPopup();
  };

  const handlePublicRepoClick = () => {
    setRepoDropdownOpen(false);
    setPublicRepoDialogOpen(true);
    setPublicRepoInput("");
  };

  /**
   * Extracts owner/repo from various GitHub URL formats and owner/repo strings
   * Supports:
   * - Full URLs: https://github.com/owner/repo
   * - URLs with .git: https://github.com/owner/repo.git
   * - SSH URLs: git@github.com:owner/repo.git
   * - Owner/repo format: owner/repo
   * - URLs with paths: https://github.com/owner/repo/tree/main
   */
  const extractOwnerRepo = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Already in owner/repo format (no protocol, no github.com)
    const ownerRepoRegex = /^[^\/\s@]+\/[^\/\s]+$/;
    if (ownerRepoRegex.test(trimmed)) {
      // Strip trailing .git suffix (case-insensitive) to match other parsing branches
      return trimmed.replace(/\.git$/i, "");
    }

    // GitHub URL patterns
    // Match: https://github.com/owner/repo or https://www.github.com/owner/repo
    // Match: http://github.com/owner/repo
    // Match: github.com/owner/repo
    const githubUrlRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/\s]+\/[^\/\s]+?)(?:\.git)?(?:\/.*)?$/i;
    const urlMatch = trimmed.match(githubUrlRegex);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }

    // SSH URL pattern: git@github.com:owner/repo.git
    const sshRegex = /git@github\.com:([^\/\s]+\/[^\/\s]+?)(?:\.git)?$/i;
    const sshMatch = trimmed.match(sshRegex);
    if (sshMatch && sshMatch[1]) {
      return sshMatch[1];
    }

    return null;
  };

  const handlePublicRepoSubmit = async () => {
    const input = publicRepoInput.trim();
    
    if (!input) {
      toast.error("Please enter a GitHub repository URL or owner/repo format");
      return;
    }

    // Extract owner/repo from various formats
    const repoName = extractOwnerRepo(input);
    
    if (!repoName) {
      toast.error("Please enter a valid GitHub repository URL or owner/repo format (e.g., https://github.com/facebook/react or facebook/react)");
      return;
    }

    setCheckingPublicRepo(true);
    try {
      // Check if repository is public
      const response = await BranchAndRepositoryService.check_public_repo(repoName);
      
      let isPublic = false;
      // Handle different response formats
      if (typeof response === "boolean") {
        isPublic = response;
      } else if (typeof response === "string") {
        isPublic = response.toLowerCase() === "true";
      } else if (typeof response === "object" && response !== null) {
        isPublic = response.is_public === true || response.isPublic === true || response.public === true;
      }

      if (isPublic) {
        // Close dialog
        setPublicRepoDialogOpen(false);
        setPublicRepoInput("");
        
        // Parse repository directly with the repo name
        // Check if selectedBranch belongs to the repo being entered
        // Only use selectedBranch if it belongs to the same repo context
        let branchName = "main";
        if (selectedBranch && selectedRepo) {
          // Check if the currently selected repo matches the repo being entered
          const selectedRepoData = repositories.find(
            (repo) => repo.id?.toString() === selectedRepo
          );
          if (selectedRepoData) {
            const selectedRepoName = selectedRepoData.full_name || selectedRepoData.name;
            // Normalize repo names for comparison (case-insensitive, remove .git suffix)
            const normalizeRepoName = (name: string) => 
              name.trim().toLowerCase().replace(/\.git$/i, "");
            if (normalizeRepoName(selectedRepoName || "") === normalizeRepoName(repoName)) {
              // selectedBranch belongs to this repo, use it
              branchName = selectedBranch;
            }
          }
        }
        // Otherwise, default to "main" for newly entered public repo
        
        if (onParseRepoWithName) {
          // Prefer direct parsing with repo name and branch
          onParseRepoWithName(repoName, branchName);
        } else if (onParseRepo && onRepoSearchChange) {
          // Fallback: Set the repo in search term and wait for debounce before triggering parse
          // Parent component uses 300ms debounce, so wait for debounce + margin (100ms)
          const debounceMs = 300;
          const marginMs = 100;
          onRepoSearchChange(repoName);
          await new Promise((resolve) => setTimeout(resolve, debounceMs + marginMs));
          onParseRepo();
        } else if (onParseRepo) {
          // Last resort: just call onParseRepo if available
          onParseRepo();
        }
      } else {
        // Repository is not public - show error but don't redirect to GitHub
        toast.error("This repository is private or does not exist. Please link it through GitHub App to access private repositories.");
      }
    } catch (error: any) {
      console.error("Error checking public repo:", error);
      const statusCode = error?.response?.status;
      
      if (statusCode === 404) {
        toast.error("Repository not found. Please check the repository name and try again.");
      } else if (statusCode === 403) {
        toast.error("This repository is private or access is forbidden. Please link it through GitHub App to access private repositories.");
      } else {
        toast.error("Unable to verify repository. Please try again.");
      }
    } finally {
      setCheckingPublicRepo(false);
    }
  };

  // Handle input changes - no agent text in textarea, only visual pill
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Just pass through the input - no agent prefix in text
    onInputChange(e.target.value);
  };

  const agentOptions = [
    { value: "ask", label: "Ask a question" },
    { value: "build", label: "Build a feature" },
    { value: "debug", label: "Debug an issue" },
    ...(showSpecGenOption ? [{ value: "spec_gen" as const, label: "Generate a spec" }] : []),
    { value: "code", label: "Make a change" },
  ];
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const displayModelName = currentModel?.name ?? "ZLM 4.7";

  return (
    <div className={`relative space-y-4 transition-opacity duration-200 ${(loading || isSubmitting) ? "opacity-90 pointer-events-none" : ""}`}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => {
          const added = Array.from(e.target.files ?? []);
          if (added.length) {
            setAttachedFiles([...attachedFiles, ...added]);
          }
          e.target.value = "";
        }}
      />

      {/* Card 1: Repository and Branch - Figma fill_7ZZDT9, stroke_KF82IR, 15px radius */}
      <div
        className="overflow-hidden shadow-sm"
        style={{
          backgroundColor: FIGMA.cardBg,
          border: `1px solid ${FIGMA.cardBorder}`,
          borderRadius: FIGMA.cardRadius,
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium" style={{ color: FIGMA.textPrimary }}>
              <Globe className="h-4 w-4" style={{ color: FIGMA.textPrimary }} />
              Repo
            </label>
            <DropdownMenu open={repoDropdownOpen} onOpenChange={setRepoDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 disabled:opacity-50"
                  style={{
                    backgroundColor: FIGMA.inputBg,
                    border: `1px solid ${FIGMA.inputBorder}`,
                    borderRadius: FIGMA.inputRadius,
                    color: FIGMA.textPrimary,
                  }}
                  disabled={loading || isSubmitting}
                >
                  <span className="flex-1 truncate">
                    {selectedRepoData
                      ? selectedRepoData.full_name || selectedRepoData.name
                      : "Select Repo"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
                </button>
              </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[380px] max-h-[280px] flex flex-col overflow-hidden p-0 bg-white border border-zinc-200 rounded-xl shadow-lg" align="start">
              {/* Search input */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200">
                <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                <Input
                  placeholder="Search repositories..."
                  value={localRepoSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 200) {
                      setLocalRepoSearch(value);
                      if (repoDebounceRef.current) clearTimeout(repoDebounceRef.current);
                      repoDebounceRef.current = setTimeout(() => {
                        onRepoSearchChange?.(value.trim());
                      }, 350);
                    }
                  }}
                  maxLength={200}
                  className="flex-1 h-8 text-[10px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent px-0"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
                {localRepoSearch.trim() && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 rounded-full hover:bg-zinc-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocalRepoSearch("");
                      if (repoDebounceRef.current) clearTimeout(repoDebounceRef.current);
                      onRepoSearchChange?.("");
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 p-2">
                {reposError ? (
                  <div className="p-7 text-center">
                    <FolderOpen className="h-9 w-9 mx-auto mb-2.5 text-red-400" />
                    <p className="text-[10px] font-medium text-red-600 mb-1">Failed to load repositories</p>
                    <p className="text-[9px] text-zinc-400 mb-3">
                      {reposError instanceof Error ? reposError.message : "An error occurred while fetching repositories"}
                    </p>
                    {onRetryRepos && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRetryRepos();
                        }}
                        className="text-[10px] px-3 py-1.5 h-auto"
                        size="sm"
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                ) : reposLoading ? (
                  <div className="p-7 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2.5 text-zinc-400" />
                    <p className="text-[10px] text-zinc-500">
                      {localRepoSearch.trim() ? "Searching repositories..." : "Loading repositories..."}
                    </p>
                  </div>
                ) : repositories.length === 0 ? (
                  <div className="p-7 text-center">
                    <FolderOpen className="h-9 w-9 mx-auto mb-2.5 text-zinc-300" />
                    <p className="text-[10px] font-medium text-foreground mb-1">
                      {localRepoSearch.trim()
                        ? `No repositories found matching '${localRepoSearch.trim()}'`
                        : "No parsed repositories found"}
                    </p>
                    <p className="text-[9px] text-zinc-400">
                      {localRepoSearch.trim() ? "Try a different search term" : "Parse a repository to get started"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {repositories.map((repo) => {
                      const isSelected = repo.id?.toString() === selectedRepo;
                      const repoName = repo.full_name || repo.name;
                      const isLocalPath = repoName.startsWith("/") || repoName.includes("\\");
                      return (
                        <DropdownMenuItem
                          key={repo.id}
                          onClick={() => {
                            onRepoSelect(repo.id?.toString() || "");
                            setRepoDropdownOpen(false);
                          }}
                          className={`flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-lg transition-colors ${isSelected ? "bg-zinc-50 border border-zinc-200 text-foreground" : "hover:bg-zinc-50 text-foreground"}`}
                        >
                          <div className="flex-shrink-0">
                            {isLocalPath ? (
                              <FolderOpen className={`h-3.5 w-3.5 ${isSelected ? "text-foreground" : "text-zinc-400"}`} />
                            ) : (
                              <Github className={`h-3.5 w-3.5 ${isSelected ? "text-foreground" : "text-zinc-400"}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-medium truncate ${isSelected ? "text-foreground" : "text-foreground"}`}>{repoName}</span>
                              {isSelected && <Check className="h-3 w-3 text-foreground flex-shrink-0" />}
                            </div>
                            {repo.description && (
                              <p className="text-[9px] text-zinc-400 mt-0.5 truncate">{repo.description}</p>
                            )}
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="sticky bottom-0 border-t border-zinc-100 bg-white p-2 pt-2.5">
                <div className="space-y-1.5">
                  <DropdownMenuItem
                    onClick={handlePublicRepoClick}
                    className="flex items-center gap-2 px-2.5 py-2.5 cursor-pointer rounded-lg border border-zinc-200 bg-white text-foreground hover:bg-zinc-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-semibold">Public Repository</span>
                  </DropdownMenuItem>
                  {(repositories.length > 0 || reposLoading) && (
                    <DropdownMenuItem
                      onClick={() => {
                        setRepoDropdownOpen(false);
                        openGithubPopup();
                      }}
                      className="flex items-center gap-2 px-2.5 py-2.5 cursor-pointer rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus className="h-3.5 w-3.5 font-semibold" />
                      <span className="text-[10px] font-semibold">Parse New Repository</span>
                    </DropdownMenuItem>
                  )}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-[#333333]">
              <GitBranch className="h-4 w-4 text-[#333333]" />
              Branch
            </label>
            <DropdownMenu open={branchDropdownOpen} onOpenChange={setBranchDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 disabled:opacity-50 disabled:pointer-events-none"
                  style={{
                    backgroundColor: FIGMA.inputBg,
                    border: `1px solid ${FIGMA.inputBorder}`,
                    borderRadius: FIGMA.inputRadius,
                    color: FIGMA.textPrimary,
                  }}
                  disabled={loading || isSubmitting || !selectedRepo || branchesLoading}
                >
                  {branchesLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" style={{ color: FIGMA.textMuted }} />
                      <span className="flex-1 truncate italic">Fetching branches..</span>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 truncate">{selectedBranch || "Select branch"}</span>
                      <ChevronDown className="h-4 w-4 shrink-0" style={{ color: FIGMA.textPrimary }} />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[280px] max-h-[300px] flex flex-col overflow-hidden p-0 bg-white border border-zinc-200 rounded-xl shadow-lg" align="start">
              {/* Search input */}
              {selectedRepo && (
                <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200">
                  <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                  <Input
                    placeholder="Search branches..."
                    value={localBranchSearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 200) {
                        setLocalBranchSearch(value);
                        if (branchDebounceRef.current) clearTimeout(branchDebounceRef.current);
                        branchDebounceRef.current = setTimeout(() => {
                          onBranchSearchChange?.(value.trim());
                        }, 350);
                      }
                    }}
                    maxLength={200}
                    className="flex-1 h-8 text-[10px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent px-0"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                  {localBranchSearch.trim() && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 rounded-full hover:bg-zinc-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocalBranchSearch("");
                        if (branchDebounceRef.current) clearTimeout(branchDebounceRef.current);
                        onBranchSearchChange?.("");
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
              <div className="flex-1 overflow-y-auto min-h-0 p-2">
                {!selectedRepo ? (
                  <div className="p-5 text-center">
                    <p className="text-[10px] text-zinc-500">Please select a repository first</p>
                  </div>
                ) : branchesError ? (
                  <div className="p-7 text-center">
                    <GitBranch className="h-9 w-9 mx-auto mb-2.5 text-red-400" />
                    <p className="text-[10px] font-medium text-red-600 mb-1">Failed to load branches</p>
                    <p className="text-[9px] text-zinc-400 mb-3">
                      {branchesError instanceof Error ? branchesError.message : "An error occurred while fetching branches"}
                    </p>
                    {onRetryBranches && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRetryBranches();
                        }}
                        className="text-[10px] px-3 py-1.5 h-auto"
                        size="sm"
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                ) : branchesLoading ? (
                  <div className="p-7 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2.5 text-zinc-400" />
                    <p className="text-[10px] text-zinc-500">
                      {localBranchSearch.trim() ? "Searching branches..." : "Loading branches..."}
                    </p>
                  </div>
                ) : branches.length === 0 ? (
                  <div className="p-7 text-center">
                    <GitBranch className="h-9 w-9 mx-auto mb-2.5 text-zinc-300" />
                    <p className="text-[10px] font-medium text-foreground mb-1">
                      {localBranchSearch.trim()
                        ? `No branches found matching '${localBranchSearch.trim()}'`
                        : "No branches found"}
                    </p>
                    <p className="text-[9px] text-zinc-400">
                      {localBranchSearch.trim() ? "Try a different search term" : "Unable to load branches for this repository"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {branches.map((branch) => {
                      const isSelected = branch === selectedBranch;
                      return (
                        <DropdownMenuItem
                          key={branch}
                          onClick={() => {
                            onBranchSelect(branch);
                            setBranchDropdownOpen(false);
                          }}
                          className={`flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-lg transition-colors ${isSelected ? "bg-zinc-50 border border-zinc-200 text-foreground" : "hover:bg-zinc-50 text-foreground"}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-medium truncate ${isSelected ? "text-foreground" : "text-foreground"}`}>{branch}</span>
                              {isSelected && <Check className="h-3 w-3 text-foreground flex-shrink-0" />}
                            </div>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Card 2: Potpie Terminal - greyed out when no repo/branch selected */}
      {(() => {
        const terminalDisabled = !selectedRepo || !selectedBranch;
        const dotColor = terminalDisabled ? "#9CA3AF" : undefined;
        return (
      <div
        className={`overflow-hidden shadow-sm transition-opacity duration-200 ${terminalDisabled ? "pointer-events-none select-none" : ""}`}
        style={{
          backgroundColor: FIGMA.terminalContentBg,
          border: `1px solid ${FIGMA.cardBorder}`,
          borderRadius: FIGMA.cardRadius,
          opacity: terminalDisabled ? 0.6 : 1,
          filter: terminalDisabled ? "grayscale(1)" : "none",
        }}
      >
        {/* Terminal title bar: grey dots when disabled, else red/yellow/green */}
        <div
          className="flex items-center justify-between px-3.5 py-2"
          style={{
            borderBottom: `1px solid ${FIGMA.inputBorder}`,
            backgroundColor: FIGMA.terminalHeaderBg,
            borderTopLeftRadius: FIGMA.cardRadius,
            borderTopRightRadius: FIGMA.cardRadius,
          }}
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: dotColor ?? "#FF5F57" }}
              />
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: dotColor ?? "#FEBC2E" }}
              />
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: dotColor ?? "#28C840" }}
              />
            </div>
            <span
              className="ml-2 text-xs font-medium"
              style={{
                color: terminalDisabled ? FIGMA.textMuted : FIGMA.textDark,
                fontWeight: terminalDisabled ? 400 : 700,
              }}
            >
              potpie-terminal
            </span>
          </div>
          <span className="text-xs font-mono" style={{ color: FIGMA.textMuted }}>~ /newchat</span>
        </div>
        {/* Main input area: $ prompt + textarea; show "Please select a repository to start..." when no repo */}
        <div
          className="flex items-start gap-1.5 px-4 py-4 min-h-[160px]"
          style={{ backgroundColor: FIGMA.terminalContentBg }}
        >
          <span className="text-base font-mono select-none" style={{ color: FIGMA.textDark }}>$</span>
          {!selectedRepo ? (
            <p className="text-base font-mono flex-1" style={{ color: FIGMA.textMuted }}>
              Please select a repository to start...
            </p>
          ) : (
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={onKeyDown}
              placeholder="Describe your feature idea.... (e.g., Integrate payment with stripe.)"
              className={`w-full min-h-[120px] max-h-[280px] bg-transparent text-base resize-none focus:outline-none flex-1 leading-relaxed font-mono ${
                (loading || isSubmitting || !selectedBranch) ? "opacity-50 cursor-not-allowed" : ""
              }`}
              style={{ color: FIGMA.textDark }}
              disabled={loading || isSubmitting || !selectedBranch}
            />
          )}
        </div>

        {/* Attachments row - short transition so add/remove feels immediate */}
        <div
          className="overflow-hidden transition-[max-height] duration-200 ease-out"
          style={{
            maxHeight: attachedFiles.length > 0 ? 88 : 0,
          }}
          aria-hidden={attachedFiles.length === 0}
        >
          <div className="mx-4 mb-3 flex flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden py-1">
            {attachedFiles.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${index}`}
                className="relative flex flex-shrink-0 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 pr-8"
              >
                {previewUrls[index] ? (
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                    <img src={previewUrls[index]} alt={file.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100">
                    <FileText className="h-6 w-6 text-zinc-500" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#333333]">{file.name}</p>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">{getFileTypeLabel(file)}{attachmentUploading && " · Uploading..."}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedFiles(attachedFiles.filter((_, i) => i !== index), index)}
                  disabled={loading || isSubmitting}
                  className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 hover:bg-zinc-300"
                  aria-label="Remove attachment"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar: Figma fill_IYILFQ (Choose Agent), fill_535OH1 (Claude), stroke_LK648Y */}
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderTop: `1px solid ${FIGMA.inputBorder}`, backgroundColor: FIGMA.terminalHeaderBg }}
        >
          <div className="flex items-center gap-3">
            <DropdownMenu open={agentDropdownOpen} onOpenChange={setAgentDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium focus:outline-none disabled:opacity-50 rounded-[5px] min-w-[10.5rem] ${terminalDisabled ? "" : "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent"}`}
                  style={{
                    ...(terminalDisabled && { backgroundColor: FIGMA.chooseAgentBg, border: `1px solid ${FIGMA.inputBorder}`, color: FIGMA.textPrimary }),
                    ...(!terminalDisabled && { border: "none" }),
                    borderRadius: FIGMA.inputRadius,
                  }}
                  disabled={loading || isSubmitting}
                >
                  <Bot className={`h-4 w-4 shrink-0 ${terminalDisabled ? "" : "text-primary-foreground"}`} style={terminalDisabled ? { color: FIGMA.textPrimary } : undefined} />
                  <span className="min-w-[7rem] w-[7rem] truncate block text-left">{agentOptions.find((o) => o.value === selectedAgent)?.label ?? "Choose Agent"}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 ${terminalDisabled ? "" : "text-primary-foreground"}`} style={terminalDisabled ? { color: FIGMA.textPrimary } : undefined} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[10.5rem] min-w-[10.5rem] rounded-lg border border-zinc-200 bg-white shadow-lg">
                {agentOptions.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => {
                      onAgentSelect(opt.value);
                      setAgentDropdownOpen(false);
                    }}
                    className={`cursor-pointer truncate ${selectedAgent === opt.value ? "bg-zinc-100 font-medium" : ""}`}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80 focus:outline-none disabled:opacity-50"
              style={{ color: terminalDisabled ? FIGMA.textPrimary : FIGMA.textDark }}
              disabled={loading || isSubmitting}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" style={{ color: terminalDisabled ? FIGMA.textPrimary : FIGMA.textDark }} />
              Attach
            </button>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu open={modelDropdownOpen} onOpenChange={setModelDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium cursor-pointer hover:opacity-90 focus:outline-none transition-opacity rounded-full border"
                  style={{
                    backgroundColor: FIGMA.claudeDropdownBg,
                    borderColor: FIGMA.inputBorder,
                    color: terminalDisabled ? "#003130" : FIGMA.modelDropdownText,
                    opacity: terminalDisabled ? FIGMA.claudeDropdownOpacity : 1,
                  }}
                  aria-label={isFreeUser ? "Upgrade to change plan" : "Change model"}
                >
                  <Lock className="h-4 w-4 shrink-0" style={{ color: terminalDisabled ? FIGMA.textPrimary : "#6B7280" }} aria-hidden />
                  <span className="shrink-0">{displayModelName}</span>
                  <ChevronDown className="h-4 w-4 shrink-0" style={{ color: terminalDisabled ? FIGMA.textPrimary : "#6B7280" }} aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[280px] w-[280px] p-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg"
                style={{ color: FIGMA.modelDropdownText }}
              >
                <div className="py-1 max-h-[320px] overflow-y-auto">
                  {orderedModelList.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-zinc-500">Loading models…</div>
                  ) : (
                    orderedModelList.map((model) => {
                      const available = isModelAvailable(model);
                      return (
                        <DropdownMenuItem
                          key={model.id}
                          title={model.description ?? undefined}
                          onClick={async (e) => {
                            if (!available) {
                              e.preventDefault();
                              setModelDropdownOpen(false);
                              router.push("/user-subscription");
                              return;
                            }
                            try {
                              await ModelService.setCurrentModel(model.id);
                              await loadCurrentModel();
                            } catch {
                              // keep current selection on error
                            }
                            setModelDropdownOpen(false);
                          }}
                          className={`flex flex-col items-start gap-0.5 py-2.5 ${available ? "cursor-pointer" : "cursor-default opacity-90"} ${currentModel?.id === model.id ? "bg-zinc-100 font-medium" : ""}`}
                          style={{
                            color: available ? FIGMA.modelDropdownText : "#9ca3af",
                          }}
                        >
                          <div className="flex w-full items-center gap-2 flex-wrap">
                            <span className={available ? "" : "text-gray-400"}>{model.name}</span>
                            {!available && (
                              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-gray-700">
                                <Crown className="h-3 w-3 shrink-0" />
                                Upgrade Plan
                              </span>
                            )}
                          </div>
                          {model.description && (
                            <span
                              className="text-xs italic block mt-0.5"
                              style={{ color: available ? FIGMA.textMuted : "#9ca3af" }}
                            >
                              {model.description}
                            </span>
                          )}
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </div>
                {isFreeUser && (
                  <div className="p-3 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => {
                        setModelDropdownOpen(false);
                        router.push("/user-subscription");
                      }}
                      className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Upgrade to change plan
                    </button>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={() => {
                if (loading || isSubmitting) return;
                setIsSubmitting(true);
                onSubmit();
              }}
              disabled={loading || isSubmitting || !input.trim() || !selectedRepo || !selectedBranch || !selectedAgent}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
              title={!selectedRepo ? "Please select a repository first" : !selectedBranch ? "Please select a branch" : !selectedAgent ? "Please select an agent" : !input.trim() ? "Please enter a feature idea" : "Start analysis"}
            >
              {loading || isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizonal className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
        );
      })()}
      
      {/* Public Repository Dialog */}
      <Dialog open={publicRepoDialogOpen} onOpenChange={setPublicRepoDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enter Public Repository</DialogTitle>
            
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Input
                placeholder="e.g. owner/repo or https://github.com/owner/repo"
                value={publicRepoInput}
                onChange={(e) => setPublicRepoInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !checkingPublicRepo) {
                    handlePublicRepoSubmit();
                  }
                }}
                disabled={checkingPublicRepo}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPublicRepoDialogOpen(false);
                setPublicRepoInput("");
              }}
              disabled={checkingPublicRepo}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublicRepoSubmit}
              disabled={checkingPublicRepo || !publicRepoInput.trim()}
            >
              {checkingPublicRepo ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}