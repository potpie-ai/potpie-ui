"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Paperclip, Mic, Loader2, ChevronDown, Plus, Link2, Check, FolderOpen, Github, GitBranch, Minus, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useGithubAppPopup } from "../hooks/useGithubAppPopup";

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
  selectedBranch: string | null;
  onBranchSelect: (branch: string) => void;
  branches: string[];
  branchesLoading: boolean;
  selectedAgent: string | null;
  onAgentSelect: (agent: string) => void;
  onParseRepo?: () => void;
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
  selectedBranch,
  onBranchSelect,
  branches,
  branchesLoading,
  selectedAgent,
  onAgentSelect,
  onParseRepo,
}: IdeaInputCardProps) {
  const router = useRouter();
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { openGithubPopup } = useGithubAppPopup();

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

  // Handle input changes - no agent text in textarea, only visual pill
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Just pass through the input - no agent prefix in text
    onInputChange(e.target.value);
  };

  return (
    <div className="relative bg-background border border-zinc-300 rounded-lg shadow-lg overflow-hidden">
      {/* Terminal Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
        <div className="flex items-center gap-2">
          {/* Window Controls */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400/80 hover:bg-red-500 transition-colors cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/80 hover:bg-yellow-500 transition-colors cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-green-400/80 hover:bg-green-500 transition-colors cursor-pointer" />
          </div>
          <div className="ml-3 text-xs font-mono text-zinc-500">
            potpie-terminal
          </div>
        </div>
        <div className="text-xs font-mono text-zinc-400">
          ~/idea
        </div>
      </div>

      {/* Terminal Content */}
      <div className="relative z-10 flex flex-col h-full bg-background">
        {/* Terminal Prompt and Textarea */}
        <div className="flex items-start gap-2 px-4 pt-4 pb-2">
          <span className="text-xl font-mono text-zinc-600 select-none text-[#022D2C]">$</span>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            placeholder="Describe your feature idea... (e.g., Integrate payment with stripe.)"
            className="w-full min-h-[100px] max-h-[280px] bg-transparent text-xl font-mono text-foreground placeholder:text-zinc-400 resize-none focus:outline-none flex-1 leading-relaxed"
            disabled={loading}
          />
        </div>

        {/* Terminal Bottom Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 bg-zinc-50/50">
          <div className="flex items-center gap-2">

            {/* Repository Selector Dropdown */}
            <DropdownMenu open={repoDropdownOpen} onOpenChange={setRepoDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-9 justify-between gap-2 min-w-[140px] ${
                    selectedRepo 
                      ? "hover:opacity-90" 
                      : "border-zinc-200 hover:bg-zinc-50"
                  }`}
                  style={{
                    backgroundColor: selectedRepo ? "var(--foreground-color)" : undefined,
                    color: selectedRepo ? "var(--accent-color)" : "var(--muted-text)",
                    ...(selectedRepo && { borderColor: "var(--foreground-color)" }),
                  }}
                  disabled={loading}
                >
                  {selectedRepoData && isLocalRepoPath ? (
                    <FolderOpen 
                      className="h-3.5 w-3.5 flex-shrink-0" 
                      style={{ 
                        color: selectedRepo ? "var(--accent-color)" : "var(--muted-text)" 
                      }} 
                    />
                  ) : (
                    <Github 
                      className="h-3.5 w-3.5 flex-shrink-0" 
                      style={{ 
                        color: selectedRepo ? "var(--accent-color)" : "var(--muted-text)" 
                      }} 
                    />
                  )}
                  <span className="text-xs font-medium truncate max-w-[200px]">
                    {selectedRepoData
                      ? selectedRepoData.full_name || selectedRepoData.name
                      : "Select repo"}
                  </span>
                  <ChevronDown 
                    className="h-3.5 w-3.5 flex-shrink-0" 
                    style={{
                      color: selectedRepo ? "var(--accent-color)" : "var(--muted-text)"
                    }}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[380px] max-h-[400px] overflow-y-auto p-2 bg-background border border-zinc-200 rounded-xl shadow-lg" align="start">
                {reposLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3 text-zinc-400" />
                    <p className="text-xs text-zinc-500">Loading repositories...</p>
                  </div>
                ) : repositories.length === 0 ? (
                  <div className="p-8 text-center">
                    <FolderOpen className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
                    <p className="text-xs font-medium text-foreground mb-1">No parsed repositories found</p>
                    <p className="text-[10px] text-zinc-400">Parse a repository to get started</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {repositories.map((repo) => {
                      const isSelected = repo.id?.toString() === selectedRepo;
                      const repoName = repo.full_name || repo.name;
                      const isLocalPath = repoName.startsWith('/') || repoName.includes('\\');
                      
                      return (
                        <DropdownMenuItem
                          key={repo.id}
                          onClick={() => {
                            onRepoSelect(repo.id?.toString() || "");
                            setRepoDropdownOpen(false);
                          }}
                          className={`
                            flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg
                            transition-colors
                            ${isSelected 
                              ? 'bg-zinc-50 border border-zinc-200 text-foreground' 
                              : 'hover:bg-zinc-50 text-foreground'
                            }
                          `}
                        >
                          <div className="flex-shrink-0">
                            {isLocalPath ? (
                              <FolderOpen className={`h-4 w-4 ${isSelected ? 'text-foreground' : 'text-zinc-400'}`} />
                            ) : (
                              <Github className={`h-4 w-4 ${isSelected ? 'text-foreground' : 'text-zinc-400'}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium truncate ${isSelected ? 'text-foreground' : 'text-foreground'}`}>
                                {repoName}
                              </span>
                              {isSelected && (
                                <Check className="h-3.5 w-3.5 text-foreground flex-shrink-0" />
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                                {repo.description}
                              </p>
                            )}
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                )}
                {(repositories.length > 0 || reposLoading) && (
                  <>
                    <DropdownMenuSeparator className="my-2 bg-zinc-100" />
                    {!isLocalhost && (
                      <DropdownMenuItem
                        onClick={handleOpenGithubPopup}
                        className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-zinc-50 text-foreground"
                      >
                        <Link2 className="h-4 w-4 text-zinc-400" />
                        <span className="text-xs font-medium">Connect New Repository</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => {
                        setRepoDropdownOpen(false);
                        if (onParseRepo) {
                          onParseRepo();
                        } else {
                          router.push("/idea");
                        }
                      }}
                      className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white mt-1"
                    >
                      <Plus className="h-4 w-4 font-semibold" />
                      <span className="text-xs font-semibold">Parse New Repository</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Branch Selector Dropdown */}
            <DropdownMenu open={branchDropdownOpen} onOpenChange={setBranchDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-9 justify-between gap-2 min-w-[140px] ${
                    selectedBranch 
                      ? "hover:opacity-90" 
                      : "border-zinc-200 hover:bg-zinc-50"
                  }`}
                  style={{
                    backgroundColor: selectedBranch ? "var(--foreground-color)" : undefined,
                    color: selectedBranch ? "var(--accent-color)" : "var(--muted-text)",
                    ...(selectedBranch && { borderColor: "var(--foreground-color)" }),
                  }}
                  disabled={loading || !selectedRepo}
                >
                  <GitBranch 
                    className="h-3.5 w-3.5 flex-shrink-0" 
                    style={{
                      color: selectedBranch ? "var(--accent-color)" : "var(--muted-text)"
                    }}
                  />
                  <span className="text-xs font-medium truncate max-w-[200px]">
                    {selectedBranch || "Select branch"}
                  </span>
                  <ChevronDown 
                    className="h-3.5 w-3.5 flex-shrink-0" 
                    style={{
                      color: selectedBranch ? "var(--accent-color)" : "var(--muted-text)"
                    }}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[280px] max-h-[300px] overflow-y-auto p-2 bg-background border border-zinc-200 rounded-xl shadow-lg" align="start">
                {!selectedRepo ? (
                  <div className="p-6 text-center">
                    <p className="text-xs text-zinc-500">Please select a repository first</p>
                  </div>
                ) : branchesLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3 text-zinc-400" />
                    <p className="text-xs text-zinc-500">Loading branches...</p>
                  </div>
                ) : branches.length === 0 ? (
                  <div className="p-8 text-center">
                    <GitBranch className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
                    <p className="text-xs font-medium text-foreground mb-1">No branches found</p>
                    <p className="text-[10px] text-zinc-400">Unable to load branches for this repository</p>
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
                          className={`
                            flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg
                            transition-colors
                            ${isSelected 
                              ? 'bg-zinc-50 border border-zinc-200 text-foreground' 
                              : 'hover:bg-zinc-50 text-foreground'
                            }
                          `}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium truncate ${isSelected ? 'text-foreground' : 'text-foreground'}`}>
                                {branch}
                              </span>
                              {isSelected && (
                                <Check className="h-3.5 w-3.5 text-foreground flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Plus Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              disabled={loading}
            >
              <Plus className="h-4 w-4" />
            </Button>

            {/* Attach Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 gap-2"
              disabled={loading}
            >
              <Paperclip className="h-4 w-4" />
              <span className="text-sm">Attach</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Show Mic button when input is empty, Send button when user has typed */}
            {!input.trim() ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full"
                disabled={loading}
              >
                <Mic className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  if (loading || isSubmitting) return;
                  setIsSubmitting(true);
                  onSubmit();
                }}
                disabled={loading || isSubmitting || !input.trim() || !selectedRepo || !selectedBranch || !selectedAgent}
                className={`h-11 w-11 rounded-full shadow-sm transition-all duration-200 ${
                  loading || isSubmitting || !input.trim() || !selectedRepo || !selectedBranch || !selectedAgent
                    ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                    : "hover:scale-105"
                }`}
                style={{
                  backgroundColor: loading || isSubmitting || !input.trim() || !selectedRepo || !selectedBranch || !selectedAgent
                    ? undefined
                    : "var(--foreground-color)",
                  color: loading || isSubmitting || !input.trim() || !selectedRepo || !selectedBranch || !selectedAgent
                    ? undefined
                    : "var(--accent-color)"
                }}
                title={
                  !selectedRepo
                    ? "Please select a repository first"
                    : !selectedBranch
                    ? "Please select a branch"
                    : !selectedAgent
                    ? "Please select an agent (Ask, Build, or Debug)"
                    : !input.trim()
                    ? "Please enter a feature idea"
                    : "Start analysis"
                }
              >
                {loading || isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}