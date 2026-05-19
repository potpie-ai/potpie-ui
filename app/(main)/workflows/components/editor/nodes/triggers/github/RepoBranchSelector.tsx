import { useState, useCallback } from "react";
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
import { GitBranch, Github, Folder, Loader2, RefreshCw } from "lucide-react";
import { useRepoSearch } from "@/lib/hooks/useRepoSearch";
import { useBranchSearch } from "@/lib/hooks/useBranchSearch";

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

  // Resolve full GitHub URL → owner/repo format
  const resolvedRepoName = (() => {
    const regex = /https:\/\/github\.com\/([^/]+)\/([^/]+)/;
    const match = repoName.match(regex);
    return match ? `${match[1]}/${match[2]}` : repoName;
  })();

  const {
    displayedRepos: UserRepositorys,
    isLoading: UserRepositorysLoading,
    isSearching: repoSearching,
    searchInput: searchValue,
    handleSearchChange: setSearchValue,
    hasNextPage: repoHasNextPage,
    loadMore: loadMoreRepos,
    refresh: handleRepoRefresh,
  } = useRepoSearch({ enabled: repoOpen });

  const {
    displayedBranches: UserBranch,
    isLoading: UserBranchLoading,
    isSearching: branchSearching,
    searchInput: branchSearchValue,
    handleSearchChange: setBranchSearchValue,
    hasNextPage: branchHasNextPage,
    loadMore: loadMoreBranches,
    refresh: handleBranchRefreshAction,
  } = useBranchSearch({
    repoName: resolvedRepoName,
    enabled: !repoOnly && branchOpen && !!resolvedRepoName,
  });

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
          <Command shouldFilter={false}>
            <div className="relative">
              <CommandInput
                value={searchValue}
                onValueChange={readOnly ? undefined : setSearchValue}
                placeholder="Search repo.."
                style={readOnly ? { pointerEvents: "none" } : {}}
              />
              <button
                type="button"
                onClick={readOnly ? undefined : (e) => { e.stopPropagation(); handleRepoRefresh(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded"
                title="Refresh repositories"
                style={readOnly ? { pointerEvents: "none" } : {}}
              >
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <CommandList>
              <CommandEmpty>
                {UserRepositorysLoading || repoSearching ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {UserRepositorysLoading ? "Loading repositories..." : "Searching..."}
                  </div>
                ) : (
                  "No results found."
                )}
              </CommandEmpty>
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
                          : (selectedValue) => handleRepoChange(selectedValue)
                      }
                      style={readOnly ? { pointerEvents: "none" } : {}}
                    >
                      {value.full_name}
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
              {repoHasNextPage && (
                <CommandItem
                  onSelect={loadMoreRepos}
                  className="justify-center text-sm text-muted-foreground"
                  style={readOnly ? { pointerEvents: "none" } : {}}
                >
                  {repoSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Load more repositories..."
                  )}
                </CommandItem>
              )}
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
                <Command shouldFilter={false}>
                  <div className="relative">
                    <CommandInput
                      value={branchSearchValue}
                      onValueChange={readOnly ? undefined : setBranchSearchValue}
                      placeholder="Search branch..."
                      disabled={readOnly}
                      style={readOnly ? { pointerEvents: "none" } : {}}
                    />
                    <button
                      type="button"
                      onClick={readOnly ? undefined : (e) => { e.stopPropagation(); handleBranchRefreshAction(); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded"
                      title="Refresh branches"
                      style={readOnly ? { pointerEvents: "none" } : {}}
                    >
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <CommandList>
                    <CommandEmpty>
                      {UserBranchLoading || branchSearching ? (
                        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {UserBranchLoading ? "Loading branches..." : "Searching..."}
                        </div>
                      ) : (
                        "No branch found."
                      )}
                    </CommandEmpty>
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
                            onSelect={(selectedValue) => handleBranchChange(selectedValue)}
                            style={readOnly ? { pointerEvents: "none" } : {}}
                          >
                            {value}
                          </CommandItem>
                        ))
                      )}
                    </CommandGroup>
                    {branchHasNextPage && (
                      <CommandItem
                        onSelect={loadMoreBranches}
                        className="justify-center text-sm text-muted-foreground"
                        style={readOnly ? { pointerEvents: "none" } : {}}
                      >
                        {branchSearching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Load more branches..."
                        )}
                      </CommandItem>
                    )}
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
