import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { GitBranch, Github, Folder, Loader2, RefreshCw } from "lucide-react";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import {
  setWithExpiry,
  getWithExpiry,
} from "../../../services/localStorageService";

interface RepoBranchSelectorProps {
  repoName: string;
  branchName: string;
  onRepoChange: (repo: string) => void;
  onBranchChange: (branch: string) => void;
  readOnly?: boolean;
  repoOnly?: boolean; // New prop for repo-only mode
}

export const RepoBranchSelector = ({
  repoName,
  branchName,
  onRepoChange,
  onBranchChange,
  readOnly = false,
  repoOnly = false, // Default to false to maintain backward compatibility
}: RepoBranchSelectorProps) => {
  const [repoOpen, setRepoOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [UserRepositorys, setUserRepositorys] = useState<any[]>([]);
  const [UserBranch, setUserBranch] = useState<string[]>([]);
  const [UserRepositorysLoading, setUserRepositorysLoading] = useState(false);
  const [UserBranchLoading, setUserBranchLoading] = useState(false);
  const [repositoriesLoaded, setRepositoriesLoaded] = useState(false);
  const [branchCache, setBranchCache] = useState<Record<string, string[]>>({});
  // Add refresh state to trigger loading
  const [repoRefreshKey, setRepoRefreshKey] = useState(0);
  const [branchRefreshKey, setBranchRefreshKey] = useState(0);

  // Memoize the callbacks to prevent unnecessary re-renders
  const handleRepoChange = useCallback(
    (repo: string) => {
      if (readOnly) return;
      onRepoChange(repo);
      setRepoOpen(false);
    },
    [onRepoChange, readOnly]
  );

  const handleBranchChange = useCallback(
    (branch: string) => {
      if (readOnly) return;
      onBranchChange(branch);
      setBranchOpen(false);
    },
    [onBranchChange, readOnly]
  );

  // Load repositories only when the popover is opened and we don't have them loaded yet
  useEffect(() => {
    if (
      (repoOpen && !repositoriesLoaded && UserRepositorys.length === 0) ||
      repoRefreshKey > 0
    ) {
      setUserRepositorysLoading(true);

      if (repoRefreshKey === 0) {
        const cachedRepos = getWithExpiry("user_repositories");
        if (cachedRepos) {
          setUserRepositorys(cachedRepos);
          setUserRepositorysLoading(false);
          setRepositoriesLoaded(true);
          return;
        }
      }

      BranchAndRepositoryService.getUserRepositories().then((repos) => {
        setUserRepositorys(repos);
        setUserRepositorysLoading(false);
        setRepositoriesLoaded(true);
        setWithExpiry("user_repositories", repos, 5 * 60 * 1000); // 5 minutes
      });
    }
  }, [repoOpen, repositoriesLoaded, UserRepositorys.length, repoRefreshKey]);

  // Load branches only when the branch popover is opened and we don't have cached branches for this repo
  useEffect(() => {
    // Skip branch loading if in repo-only mode
    if (repoOnly) return;

    if (!branchOpen) return;

    if (!repoName) {
      setUserBranch([]);
      return;
    }

    const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)/;
    const match = repoName.match(regex);
    let ownerRepo = repoName;
    if (match) {
      ownerRepo = `${match[1]}/${match[2]}`;
    }

    const cacheKey = `branches_${ownerRepo}`;
    if (branchRefreshKey === 0) {
      const cachedBranches = getWithExpiry(cacheKey);
      if (cachedBranches) {
        setUserBranch(cachedBranches);
        return;
      }
    }

    // Check if we already have branches cached for this repo in memory
    if (branchCache[ownerRepo] && branchRefreshKey === 0) {
      setUserBranch(branchCache[ownerRepo]);
      return;
    }

    // Only load if we don't have branches for this repo
    setUserBranchLoading(true);
    BranchAndRepositoryService.getBranchList(ownerRepo).then((branches) => {
      setUserBranch(branches);
      setUserBranchLoading(false);
      setBranchCache((prev) => ({ ...prev, [ownerRepo]: branches }));
      setWithExpiry(cacheKey, branches, 5 * 60 * 1000); // 5 minutes
      // Auto-select branch if there's only one and no branch is currently selected
      if (branches?.length === 1 && !branchName) {
        handleBranchChange(branches[0]);
      }
    });
  }, [
    repoOnly,
    branchOpen,
    repoName,
    branchCache,
    branchName,
    handleBranchChange,
    branchRefreshKey,
  ]);

  // Helper to clear repo cache and force refresh
  const handleRepoRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.removeItem("user_repositories");
    setUserRepositorys([]);
    setRepositoriesLoaded(false);
    setRepoRefreshKey((k) => k + 1);
  };

  // Helper to clear branch cache and force refresh
  const handleBranchRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)/;
    const match = repoName.match(regex);
    let ownerRepo = repoName;
    if (match) {
      ownerRepo = `${match[1]}/${match[2]}`;
    }
    const cacheKey = `branches_${ownerRepo}`;
    localStorage.removeItem(cacheKey);
    setUserBranch([]);
    setBranchCache((prev) => {
      const newCache = { ...prev };
      delete newCache[ownerRepo];
      return newCache;
    });
    setBranchRefreshKey((k) => k + 1);
  };

  return (
    <div className={`flex gap-4 w-full mt-2 ${repoOnly ? "" : ""}`}>
      <Popover
        open={repoOpen}
        onOpenChange={readOnly ? undefined : setRepoOpen}
      >
        <PopoverTrigger asChild className={repoOnly ? "w-full" : "flex-1"}>
          {UserRepositorysLoading ? (
            <Button
              className="flex gap-3 items-center font-semibold justify-start"
              variant="outline"
              disabled
            >
              <Loader2
                className="h-4 w-4 text-[#7A7A7A] animate-spin"
                strokeWidth={1.5}
              />
              Loading repositories...
            </Button>
          ) : !repoName ? (
            <Button
              className="flex gap-3 items-center font-semibold justify-start"
              variant="outline"
              style={readOnly ? { pointerEvents: "none" } : {}}
            >
              <Github className="h-4 w-4 text-[#7A7A7A]" strokeWidth={1.5} />
              Select Repository
            </Button>
          ) : (
            <Button
              className="flex gap-3 items-center font-semibold justify-start"
              variant="outline"
              style={readOnly ? { pointerEvents: "none" } : {}}
            >
              {repoName.startsWith("/") ||
              repoName.includes(":\\") ||
              repoName.includes(":/") ? (
                <Folder className="h-4 w-4 text-[#7A7A7A]" strokeWidth={1.5} />
              ) : (
                <Github className="h-4 w-4 text-[#7A7A7A]" strokeWidth={1.5} />
              )}
              <span className="truncate text-ellipsis whitespace-nowrap">
                {repoName}
              </span>
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <div className="relative">
              <CommandInput
                value={searchValue}
                onValueChange={setSearchValue}
                placeholder="Search repo.."
                style={readOnly ? { pointerEvents: "none" } : {}}
              />
              <button
                type="button"
                onClick={readOnly ? undefined : handleRepoRefresh}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded"
                title="Refresh repositories"
                style={readOnly ? { pointerEvents: "none" } : {}}
              >
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {UserRepositorysLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">
                      Loading repositories...
                    </span>
                  </div>
                ) : (
                  UserRepositorys?.map((value: any) => (
                    <CommandItem
                      key={value.id}
                      value={value.full_name}
                      onSelect={
                        readOnly
                          ? undefined
                          : (selectedValue) => {
                              handleRepoChange(selectedValue);
                            }
                      }
                      style={readOnly ? { pointerEvents: "none" } : {}}
                    >
                      {value.full_name}
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {repoOnly ? null : (
        <>
          {UserBranchLoading ? (
            <Button
              className="flex gap-3 items-center font-semibold justify-start flex-1"
              variant="outline"
              disabled
            >
              <Loader2
                className="h-4 w-4 text-[#7A7A7A] animate-spin"
                strokeWidth={1.5}
              />
              Loading branches...
            </Button>
          ) : (
            <Popover open={branchOpen} onOpenChange={setBranchOpen}>
              <PopoverTrigger asChild className="flex-1">
                {!branchName ? (
                  <Button
                    className="flex gap-3 items-center font-semibold justify-start"
                    variant="outline"
                    style={readOnly ? { pointerEvents: "none" } : {}}
                  >
                    <GitBranch
                      className="h-4 w-4 text-[#7A7A7A] "
                      strokeWidth={1.5}
                    />
                    Select Branch
                  </Button>
                ) : (
                  <Button
                    className="flex gap-3 items-center font-semibold w-[220px] justify-start"
                    variant="outline"
                    style={readOnly ? { pointerEvents: "none" } : {}}
                  >
                    <GitBranch
                      className="h-4 w-4 text-[#7A7A7A] "
                      strokeWidth={1.5}
                    />
                    <span className="truncate text-ellipsis whitespace-nowrap">
                      {branchName}
                    </span>
                  </Button>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <div className="relative">
                    <CommandInput
                      placeholder="Search branch..."
                      disabled={readOnly}
                      style={readOnly ? { pointerEvents: "none" } : {}}
                    />
                    <button
                      type="button"
                      onClick={readOnly ? undefined : handleBranchRefresh}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded"
                      title="Refresh branches"
                      style={readOnly ? { pointerEvents: "none" } : {}}
                    >
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <CommandList>
                    <CommandEmpty>No branch found.</CommandEmpty>
                    <CommandGroup>
                      {UserBranchLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">
                            Loading branches...
                          </span>
                        </div>
                      ) : (
                        UserBranch?.map((value: any) => (
                          <CommandItem
                            key={value}
                            value={value}
                            onSelect={(selectedValue) => {
                              handleBranchChange(selectedValue);
                            }}
                            style={readOnly ? { pointerEvents: "none" } : {}}
                          >
                            {value}
                          </CommandItem>
                        ))
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </>
      )}
    </div>
  );
};
