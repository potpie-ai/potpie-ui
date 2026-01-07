"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LucideGithub, ExternalLink, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";

interface Repo {
  id: string;
  name: string;
  full_name: string;
  url: string;
  description?: string;
  private?: boolean;
  owner?: string;
}

interface RepositoriesListProps {
  onRepoSelect?: (repoId: string) => void;
  selectedRepo?: string | null;
}

export default function RepositoriesList({
  onRepoSelect,
  selectedRepo,
}: RepositoriesListProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch repositories
  const { data: repositories, isLoading, refetch } = useQuery({
    queryKey: ["user-repositories"],
    queryFn: async () => {
      const repos = await BranchAndRepositoryService.getUserRepositories();
      return repos || [];
    },
  });

  useEffect(() => {
    if (repositories) {
      setRepos(repositories);
    }
  }, [repositories]);

  // Listen for GitHub app installation completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Check if message is from GitHub
      if (event.origin === "https://github.com" || event.origin === window.location.origin) {
        // Refetch repositories after installation
        if (event.data?.type === "github-app-installed") {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => {
            refetch();
            timeoutRef.current = null;
          }, 2000);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [refetch]);

  // Cleanup intervals and timeouts on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const popupRef = useRef<Window | null>(null);

  const openGithubPopup = () => {
    const githubAppUrl =
      "https://github.com/apps/" +
      process.env.NEXT_PUBLIC_GITHUB_APP_NAME +
      "/installations/select_target?setup_action=install";

    // Clear any existing interval/timeout before opening new popup
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    popupRef.current = window.open(
      githubAppUrl,
      "_blank",
      "width=1000,height=700"
    );

    if (!popupRef.current) {
      return;
    }

    // Poll for popup closure to refetch repos
    intervalRef.current = setInterval(() => {
      if (popupRef.current?.closed) {
        // Clear interval immediately when popup is closed
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        // Refetch after a short delay to allow backend to sync
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          refetch();
          timeoutRef.current = null;
        }, 2000);
      }
    }, 1000);
  };

  if (isLoading) {
    return (
      <Card className="bg-background border border-gray-200">
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background border border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Connected Repositories
          </h3>
          <Button
            onClick={openGithubPopup}
            size="sm"
            className="gap-2 h-8 text-xs"
            variant="outline"
          >
            <LucideGithub className="h-3 w-3" />
            Connect New Repo
          </Button>
        </div>

        {repos.length > 0 ? (
          <div className="space-y-2">
            {repos.map((repo) => {
              const isSelected = selectedRepo === repo.id?.toString();
              return (
                <div
                  key={repo.id}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                    isSelected
                      ? "bg-blue-50 border-blue-200"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <LucideGithub className="h-4 w-4 text-gray-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {repo.full_name || repo.name}
                      </p>
                      {repo.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {repo.description}
                        </p>
                      )}
                    </div>
                    {repo.private !== undefined && (
                      <Badge
                        variant="secondary"
                        className="text-xs px-1.5 py-0.5 flex-shrink-0"
                      >
                        {repo.private ? "Private" : "Public"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {isSelected && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                    {onRepoSelect && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => onRepoSelect(repo.id?.toString() || "")}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </Button>
                    )}
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <LucideGithub className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">No repositories connected</p>
            <Button
              onClick={openGithubPopup}
              size="sm"
              className="gap-2"
              variant="outline"
            >
              <LucideGithub className="h-4 w-4" />
              Connect Your First Repo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

