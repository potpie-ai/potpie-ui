"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Paperclip, Mic, Loader2, ChevronDown, Plus, Link2, Check, FolderOpen, Github } from "lucide-react";
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
  selectedAgent: string | null;
  onAgentSelect: (agent: string) => void;
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
  selectedAgent,
  onAgentSelect,
}: IdeaInputCardProps) {
  const router = useRouter();
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const { openGithubPopup } = useGithubAppPopup();

  const agentOptions = [
    { value: "ask", label: "Ask" },
    { value: "build", label: "Build" },
    { value: "debug", label: "Debug" },
  ];

  const selectedAgentData = agentOptions.find(
    (agent) => agent.value === selectedAgent
  );

  const selectedRepoData = repositories.find(
    (repo) => repo.id?.toString() === selectedRepo
  );

  const isLocalhost = process.env.NEXT_PUBLIC_BASE_URL?.includes('localhost');

  const handleOpenGithubPopup = () => {
    setRepoDropdownOpen(false);
    openGithubPopup();
  };

  return (
    <div className="relative bg-white border border-zinc-200 rounded-xl shadow-sm p-4">
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Describe your feature idea... (e.g., Integrate payment with stripe.)"
          className="w-full min-h-[120px] max-h-[280px] bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none flex-1"
          disabled={loading}
        />

        {/* Bottom Controls - Inside the input area */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-200">
          <div className="flex items-center gap-2">
            {/* Agent Selector Dropdown */}
            <DropdownMenu open={agentDropdownOpen} onOpenChange={setAgentDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-9 justify-between gap-2 min-w-[140px] ${
                    selectedAgent 
                      ? "bg-zinc-900 border-zinc-900 text-white hover:bg-zinc-800" 
                      : "border-zinc-200 hover:bg-zinc-50 text-zinc-600"
                  }`}
                  disabled={loading}
                >
                  <span className="text-xs font-medium truncate max-w-[200px]">
                    {selectedAgentData
                      ? selectedAgentData.label
                      : "agent"}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 ${selectedAgent ? 'text-white' : 'text-zinc-400'}`} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px] max-h-[300px] overflow-y-auto p-2 bg-white border border-zinc-200 rounded-xl shadow-lg" align="start">
                <div className="space-y-0.5">
                  {agentOptions.map((agent) => {
                    const isSelected = agent.value === selectedAgent;
                    return (
                      <DropdownMenuItem
                        key={agent.value}
                        onClick={() => {
                          onAgentSelect(agent.value);
                          setAgentDropdownOpen(false);
                        }}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg
                          transition-colors
                          ${isSelected 
                            ? 'bg-zinc-50 border border-zinc-200 text-zinc-900' 
                            : 'hover:bg-zinc-50 text-zinc-900'
                          }
                        `}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium truncate ${isSelected ? 'text-zinc-900' : 'text-zinc-700'}`}>
                              {agent.label}
                            </span>
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 text-zinc-900 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Repository Selector Dropdown */}
            <DropdownMenu open={repoDropdownOpen} onOpenChange={setRepoDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-9 justify-between gap-2 min-w-[140px] ${
                    selectedRepo 
                      ? "bg-zinc-900 border-zinc-900 text-white hover:bg-zinc-800" 
                      : "border-zinc-200 hover:bg-zinc-50 text-zinc-600"
                  }`}
                  disabled={loading}
                >
                  <span className="text-xs font-medium truncate max-w-[200px]">
                    {selectedRepoData
                      ? selectedRepoData.full_name || selectedRepoData.name
                      : "Select repo"}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 ${selectedRepo ? 'text-white' : 'text-zinc-400'}`} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[380px] max-h-[400px] overflow-y-auto p-2 bg-white border border-zinc-200 rounded-xl shadow-lg" align="start">
                {reposLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3 text-zinc-400" />
                    <p className="text-xs text-zinc-500">Loading repositories...</p>
                  </div>
                ) : repositories.length === 0 ? (
                  <div className="p-8 text-center">
                    <FolderOpen className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
                    <p className="text-xs font-medium text-zinc-900 mb-1">No parsed repositories found</p>
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
                              ? 'bg-zinc-50 border border-zinc-200 text-zinc-900' 
                              : 'hover:bg-zinc-50 text-zinc-900'
                            }
                          `}
                        >
                          <div className="flex-shrink-0">
                            {isLocalPath ? (
                              <FolderOpen className={`h-4 w-4 ${isSelected ? 'text-zinc-900' : 'text-zinc-400'}`} />
                            ) : (
                              <Github className={`h-4 w-4 ${isSelected ? 'text-zinc-900' : 'text-zinc-400'}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium truncate ${isSelected ? 'text-zinc-900' : 'text-zinc-700'}`}>
                                {repoName}
                              </span>
                              {isSelected && (
                                <Check className="h-3.5 w-3.5 text-zinc-900 flex-shrink-0" />
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
                        className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-zinc-50 text-zinc-600"
                      >
                        <Link2 className="h-4 w-4 text-zinc-400" />
                        <span className="text-xs font-medium">Connect New Repository</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => {
                        setRepoDropdownOpen(false);
                        router.push("/newchat");
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
            {/* Mic Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              disabled={loading}
            >
              <Mic className="h-4 w-4" />
            </Button>

            {/* Send Button */}
            <Button
              type="button"
              onClick={onSubmit}
              disabled={loading || !input.trim() || !selectedRepo || !selectedAgent}
              className={`h-11 w-11 rounded-full shadow-sm transition-all duration-200 ${
                loading || !input.trim() || !selectedRepo || !selectedAgent
                  ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                  : "bg-zinc-900 text-white hover:bg-zinc-800 hover:scale-105"
              }`}
              title={
                !selectedRepo 
                  ? "Please select a repository first" 
                  : !selectedAgent
                  ? "Please select an agent (Ask, Build, or Debug)"
                  : !input.trim() 
                  ? "Please enter a feature idea" 
                  : "Start analysis"
              }
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

