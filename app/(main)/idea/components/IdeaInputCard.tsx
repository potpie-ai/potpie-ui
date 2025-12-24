"use client";

import { useState, useRef, useEffect } from "react";
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
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { toast } from "sonner";

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
}: IdeaInputCardProps) {
  const router = useRouter();
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const popupRef = useRef<Window | null>(null);

  const selectedRepoData = repositories.find(
    (repo) => repo.id?.toString() === selectedRepo
  );

  const isLocalhost = process.env.NEXT_PUBLIC_BASE_URL?.includes('localhost');

  const openGithubPopup = () => {
    const githubAppUrl =
      "https://github.com/apps/" +
      process.env.NEXT_PUBLIC_GITHUB_APP_NAME +
      "/installations/select_target?setup_action=install";
    
    setRepoDropdownOpen(false);
    popupRef.current = window.open(
      githubAppUrl,
      "_blank",
      "width=1000,height=700"
    );

    // Poll for popup closure to refetch repos
    const checkClosed = setInterval(() => {
      if (popupRef.current?.closed) {
        clearInterval(checkClosed);
        // Trigger a refetch by dispatching a custom event or using query invalidation
        // The parent component will handle the refetch
        window.dispatchEvent(new CustomEvent("github-app-installed"));
      }
    }, 1000);
  };

  return (
    <div className="relative bg-gray-100 border border-gray-200 rounded-2xl shadow-lg p-4">
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Describe your feature idea... (e.g., Integrate payment with stripe.)"
          className="w-full min-h-[120px] max-h-[280px] bg-transparent text-base text-gray-900 placeholder:text-gray-500 resize-none focus:outline-none flex-1"
          disabled={loading}
        />

        {/* Bottom Controls - Inside the input area */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-300">
          <div className="flex items-center gap-2">
            {/* Repository Selector Dropdown */}
            <DropdownMenu open={repoDropdownOpen} onOpenChange={setRepoDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-9 justify-between gap-2 min-w-[140px] ${
                    selectedRepo 
                      ? "bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100" 
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                  disabled={loading}
                >
                  <span className="text-sm font-medium truncate max-w-[200px]">
                    {selectedRepoData
                      ? selectedRepoData.full_name || selectedRepoData.name
                      : "Select repo"}
                  </span>
                  <ChevronDown className={`h-4 w-4 flex-shrink-0 ${selectedRepo ? 'text-blue-600' : 'text-gray-500'}`} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[380px] max-h-[400px] overflow-y-auto p-1" align="start">
                {reposLoading ? (
                  <div className="p-6 text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3 text-gray-400" />
                    <p className="text-sm text-gray-500">Loading repositories...</p>
                  </div>
                ) : repositories.length === 0 ? (
                  <div className="p-6 text-center">
                    <FolderOpen className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-500 mb-1">No parsed repositories found</p>
                    <p className="text-xs text-gray-400">Parse a repository to get started</p>
                  </div>
                ) : (
                  <div className="py-1">
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
                            flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md
                            transition-colors
                            ${isSelected 
                              ? 'bg-blue-50 text-blue-900' 
                              : 'hover:bg-gray-50 text-gray-900'
                            }
                          `}
                        >
                          <div className="flex-shrink-0">
                            {isLocalPath ? (
                              <FolderOpen className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                            ) : (
                              <Github className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                                {repoName}
                              </span>
                              {isSelected && (
                                <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate">
                                {repo.description}
                              </p>
                            )}
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                )}
                <DropdownMenuSeparator className="my-1" />
                {!isLocalhost && (
                  <DropdownMenuItem
                    onClick={openGithubPopup}
                    className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer rounded-md hover:bg-gray-50 text-gray-700"
                  >
                    <Link2 className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Connect New Repository</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={() => {
                    setRepoDropdownOpen(false);
                    router.push("/newchat");
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/50 mx-1 mb-1"
                >
                  <Plus className="h-4 w-4 font-semibold" />
                  <span className="text-sm font-semibold">Parse New Repository</span>
                </DropdownMenuItem>
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
              disabled={loading || !input.trim() || !selectedRepo}
              className={`h-11 w-11 rounded-full shadow-lg transition-all duration-200 ${
                loading || !input.trim() || !selectedRepo
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105"
              }`}
              title={!selectedRepo ? "Please select a repository first" : !input.trim() ? "Please enter a feature idea" : "Start analysis"}
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Send className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

