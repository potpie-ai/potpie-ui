import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle,
  GitBranch,
  Github,
  Loader,
  Plus,
  XCircle,
  Info,
  Loader2,
  Folder,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { CommandSeparator } from "cmdk";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import { useRepoSearch } from "@/lib/hooks/useRepoSearch";
import { useBranchSearch } from "@/lib/hooks/useBranchSearch";
import { z } from "zod";
import { toast } from "@/components/ui/sonner";
import { Dialog } from "@radix-ui/react-dialog";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import {
  setBranchName,
  setRepoName,
  setCommitId,
} from "@/lib/state/Reducers/RepoAndBranch";
import { ParsingStatusEnum } from "@/lib/Constants";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import ParsingProgress from "./ParsingProgress";
import FileSelector, { ParseFilters } from "./FileSelector";

const repoLinkSchema = z.object({
  repoLink: z
    .string()
    .url("Please enter a valid URL")
    .nonempty("Repository link cannot be empty"),
});
interface Step1Props {
  setProjectId: (id: string) => void;
  setChatStep: (step: number) => void;
}

interface RepoIdentifier {
  full_name?: string | null;
  owner?: string | null;
  name?: string | null;
}

const getRepoIdentifier = (repo: RepoIdentifier) => {
  if (repo?.full_name) {
    return repo.full_name;
  }
  if (repo?.owner && repo?.name) {
    return `${repo.owner}/${repo.name}`;
  }
  return repo?.name || "";
};

const Step1: React.FC<Step1Props> = ({ setProjectId, setChatStep }) => {
  const { repoName, branchName, commitId } = useSelector(
    (state: RootState) => state.RepoAndBranch,
  );

  const dispatch = useDispatch();

  const [filters, setFilters] = useState<ParseFilters>({
    excluded_directories: [],
    excluded_files: [],
    excluded_extensions: [],
  });

  const [parsingStatus, setParsingStatus] = useState<string>("");
  const [isPublicRepoDailog, setIsPublicRepoDailog] = useState(false);
  const [isLocalRepoDailog, setIsLocalRepoDailog] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [localRepoPath, setLocalRepoPath] = useState("");
  const [localBranchName, setLocalBranchName] = useState("main");
  const [localCommitId, setLocalCommitId] = useState("");
  const [isValidLink, setIsValidLink] = useState(false);
  const [linkedRepoName, setLinkedRepoName] = useState<string | null>(null);
  const [isParseDisabled, setIsParseDisabled] = useState(false);
  const [repoOpen, setRepoOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [useCommitId, setUseCommitId] = useState(false);
  const [commitIdInput, setCommitIdInput] = useState("");
  const commitIdDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repoInputRef = useRef<HTMLInputElement>(null);
  const branchInputRef = useRef<HTMLInputElement>(null);
  const COMMIT_ID_DEBOUNCE_MS = 400;

  useEffect(() => {
    return () => {
      if (commitIdDebounceRef.current) clearTimeout(commitIdDebounceRef.current);
    };
  }, []);

  // Resolve full GitHub URL → owner/repo format for branch fetching
  const resolvedRepoName = (() => {
    const regex = /https:\/\/github\.com\/([^/]+)\/([^/]+)/;
    const match = repoName.match(regex);
    return match ? `${match[1]}/${match[2]}` : repoName;
  })();

  const {
    displayedRepos: UserRepositorys,
    isLoading: UserRepositorysLoading,
    isSearching,
    searchInput: searchValue,
    handleSearchChange: setSearchValue,
    hasNextPage: repoHasNextPage,
    loadMore: loadMoreRepos,
  } = useRepoSearch({ enabled: true });
  // Keep same name as before for the focus-refocus effect
  const UserRepositorysFetching = isSearching;

  const {
    displayedBranches: UserBranch,
    isLoading: UserBranchLoading,
    isSearching: branchSearching,
    searchInput: branchSearchValue,
    handleSearchChange: setBranchSearchValue,
    hasNextPage: branchHasNextPage,
    loadMore: loadMoreBranches,
  } = useBranchSearch({ repoName: resolvedRepoName, enabled: !!resolvedRepoName });

  // Auto-select repo from ?repo= URL param once list loads
  useEffect(() => {
    if (!defaultRepo || UserRepositorys.length === 0 || repoName) return;
    const decodedDefaultRepo = decodeURIComponent(defaultRepo).toLowerCase();
    const matchingRepo = UserRepositorys.find((repo: RepoIdentifier) => {
      const id = getRepoIdentifier(repo);
      return id && id.toLowerCase() === decodedDefaultRepo;
    });
    dispatch(setRepoName(matchingRepo ? decodeURIComponent(defaultRepo) : ""));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [UserRepositorys]);

  // Auto-select branch from ?branch= URL param or when only one branch exists
  useEffect(() => {
    if (!UserBranch || UserBranch.length === 0 || branchName) return;
    if (UserBranch.length === 1) {
      dispatch(setBranchName(UserBranch[0]));
    } else if (defaultBranch) {
      const matchingBranch = UserBranch.find(
        (b: string) => b.toLowerCase() === decodeURIComponent(defaultBranch).toLowerCase(),
      );
      if (matchingBranch) dispatch(setBranchName(decodeURIComponent(defaultBranch)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [UserBranch]);

  // Refocus inputs after search results update (cmdk steals focus when items re-register)
  useEffect(() => {
    if (!repoOpen || UserRepositorysFetching) return;
    const id = setTimeout(() => {
      repoInputRef.current?.focus();
    }, 0);
    return () => clearTimeout(id);
  }, [UserRepositorys, UserRepositorysFetching, repoOpen]);

  useEffect(() => {
    if (!branchOpen) return;
    const id = setTimeout(() => {
      branchInputRef.current?.focus();
    }, 0);
    return () => clearTimeout(id);
  }, [UserBranch, branchOpen]);

  const searchParams = useSearchParams();

  const defaultRepo = searchParams.get("repo");
  const defaultBranch = searchParams.get("branch");
  const githubAppUrl =
    "https://github.com/apps/" +
    process.env.NEXT_PUBLIC_GITHUB_APP_NAME +
    "/installations/select_target?setup_action=install";
  const popupRef = useRef<Window | null>(null);

  const openPopup = () => {
    popupRef.current = window.open(
      githubAppUrl,
      "_blank",
      "width=1000,height=700",
    );
  };

  const parseRepo = async (
    repo_name: string,
    branch_name?: string,
    commit_id?: string,
  ) => {
    setParsingStatus("loading");

    try {
      const parseResponse = await BranchAndRepositoryService.parseRepo(
        repo_name,
        branch_name,
        filters,
        commit_id,
      );
      const projectId = parseResponse.project_id;
      const initialStatus = parseResponse.status;

      if (projectId) {
        setProjectId(projectId);
      }

      if (initialStatus === ParsingStatusEnum.READY) {
        setParsingStatus(ParsingStatusEnum.READY);
        setChatStep(2);
        return;
      }

      await BranchAndRepositoryService.pollParsingStatus(
        projectId,
        initialStatus,
        setParsingStatus,
        setChatStep,
      );
    } catch (err) {
      console.error("Error during parsing:", err);
      setParsingStatus(ParsingStatusEnum.ERROR);
    }
  };

  const parseLocalRepo = async (
    repo_path: string,
    branch_name?: string,
    commit_id?: string,
  ) => {
    setParsingStatus("loading");

    try {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

      dispatch(setRepoName(repo_path));
      if (commit_id) {
        dispatch(setCommitId(commit_id));
      } else if (branch_name) {
        dispatch(setBranchName(branch_name));
      }

      const payload: any = { repo_path, filters };
      if (commit_id) {
        payload.commit_id = commit_id;
      } else if (branch_name) {
        payload.branch_name = branch_name;
      }

      const parseResponse = await axios.post(
        `${baseUrl}/api/v1/parse`,
        payload,
        { headers },
      );

      const projectId = parseResponse.data.project_id;
      const initialStatus = parseResponse.data.status;

      if (projectId) {
        setProjectId(projectId);
      }

      if (initialStatus === ParsingStatusEnum.READY) {
        setParsingStatus(ParsingStatusEnum.READY);
        setChatStep(2);
        return;
      }

      await BranchAndRepositoryService.pollParsingStatus(
        projectId,
        initialStatus,
        setParsingStatus,
        setChatStep,
      );
    } catch (error) {
      console.error("Error during parsing local repo:", error);
      setParsingStatus(ParsingStatusEnum.ERROR);
      toast.error("Error parsing local repository");
    }
  };


  const {
    data: PublicRepo,
    isLoading: PublicRepoLoading,
    refetch: PublicRepoRefetch,
  } = useQuery({
    queryKey: ["public-repo"],
    queryFn: async () => {
      const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)/;
      const match = inputValue.match(regex);

      if (!match) {
        setLinkedRepoName(null);
        setIsValidLink(false);
        handleSetPublicRepoDialog(false);
        toast.error("Invalid repository URL. Please try again.");
        return "Invalid repository URL.";
      }

      const ownerRepo = `${match[1]}/${match[2]}`;

      const repoExistsPublic = async (repo: string) => {
        try {
          const res = await fetch(`https://api.github.com/repos/${repo}`);
          return res.status === 200;
        } catch {
          return false;
        }
      };

      try {
        if (linkedRepoName === ownerRepo) {
          handleSetPublicRepoDialog(false);
          setIsValidLink(true);
          return "Repo is public";
        }

        const response =
          await BranchAndRepositoryService.check_public_repo(ownerRepo);
        console.log("Public repo check response:", response);

        let isPublic = false;

        // Handle response formats: boolean / string / object
        if (typeof response === "boolean") {
          isPublic = response;
        } else if (typeof response === "string") {
          isPublic = response.toLowerCase() === "true";
        } else if (typeof response === "object" && response !== null) {
          isPublic =
            response.is_public === true ||
            response.isPublic === true ||
            response.public === true;
        }

        if (isPublic) {
          setIsValidLink(true);
          setLinkedRepoName(ownerRepo);
          dispatch(setRepoName(ownerRepo));
          handleSetPublicRepoDialog(false);
          return response;
        }

        // Not public based on response: show popup ONLY if explicitly private
        const isExplicitlyPrivate =
          response === false ||
          response === "False" ||
          response === "false" ||
          (typeof response === "object" &&
            response !== null &&
            (response.is_public === false ||
              response.isPublic === false ||
              response.public === false));

        setIsValidLink(false);
        setLinkedRepoName(null);
        handleSetPublicRepoDialog(false);

        if (isExplicitlyPrivate) {
          toast.error(
            "This repository is private. Please link it through GitHub to import it.",
          );
          openPopup();
        } else {
          toast.error(
            "Unable to verify repository visibility. Please try again.",
          );
        }

        return response;
      } catch (error: any) {
        setLinkedRepoName(null);
        handleSetPublicRepoDialog(false);

        const statusCode = error?.response?.status;
        const errorMessage = error?.response?.data?.message || error?.message;

        console.error("Error checking public repo:", {
          statusCode,
          errorMessage,
          error: error?.response?.data,
          ownerRepo,
        });

        // Fix: 404 can be invalid repo OR private repo
        if (statusCode === 404) {
          const exists = await repoExistsPublic(ownerRepo);

          if (!exists) {
            toast.error("Repository does not exist. Please check the URL.");
            return false;
          }

          toast.error(
            "Repository is private or not accessible. Please link it through GitHub.",
          );
          openPopup();
          return false;
        }

        if (statusCode === 401) {
          toast.error(
            "Backend is not authenticated with GitHub (401). This does not mean the repo is private. Configure GitHub auth and retry.",
          );
          return false;
        }

        if (statusCode === 403) {
          toast.error(
            "GitHub API forbidden or rate-limited (403). This does not mean the repo is private. Try again later.",
          );
          return false;
        }

        toast.error("Unable to verify repository right now. Please try again.");
        return false;
      }
    },

    enabled: false,
    retry: false,
  });

  const [showTooltip, setShowTooltip] = useState(false);
  const handleRepoSelect = (repo: string) => {
    dispatch(setRepoName(repo));
    setInputValue(repo);
    setLinkedRepoName(null);
  };
  const handleParse = () => {
    if (repoName && (branchName || commitId)) {
      parseRepo(repoName, branchName, commitId);
    }
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowTooltip(!showTooltip);
  };

  useEffect(() => {
    setIsParseDisabled(
      !repoName || (!branchName && !commitId) || parsingStatus !== "",
    );
  }, [repoName, branchName, commitId, parsingStatus, inputValue, isValidLink]);

  // Fetch existing filters when repo and branch are selected
  useEffect(() => {
    const fetchExistingFilters = async () => {
      // Reset filters first when repo/branch changes
      const defaultFilters = {
        excluded_directories: [],
        excluded_files: [],
        excluded_extensions: [],
      };
      setFilters(defaultFilters);

      if (repoName && (branchName || commitId)) {
        try {
          const statusResponse =
            await BranchAndRepositoryService.checkParsingStatus(
              repoName,
              branchName,
              undefined,
              commitId,
            );
          if (statusResponse?.current_filters) {
            const existingFilters = statusResponse.current_filters;
            setFilters({
              excluded_directories: existingFilters.excluded_directories || [],
              excluded_files: existingFilters.excluded_files || [],
              excluded_extensions: existingFilters.excluded_extensions || [],
            });
          }
        } catch (error) {
          console.error("Error fetching existing filters:", error);
        }
      }
    };

    fetchExistingFilters();
  }, [repoName, branchName, commitId]);

  useEffect(() => {
    if (isPublicRepoDailog) {
      const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)/;
      const match = inputValue.match(regex);
      if (match) {
        setIsValidLink(true);
      } else {
        setIsValidLink(false);
      }
    }
  }, [inputValue, isPublicRepoDailog]);

  useEffect(() => {
    if (isLocalRepoDailog) {
      // Simple validation for local repo path - just check if it's not empty
      setIsValidLink(!!localRepoPath && (!!localBranchName || !!localCommitId));
    }
  }, [localRepoPath, localBranchName, localCommitId, isLocalRepoDailog]);

  // Function to safely set the public repo dialog state
  const handleSetPublicRepoDialog = (value: boolean) => {
    setIsPublicRepoDailog(value);
  };

  return (
    <div className="text-black max-w-[900px]">
      <h1 className="text-lg">Select a repository and branch</h1>
      <Link
        href="https://docs.potpie.ai/quickstart"
        className="text-primary underline"
      >
        Need help?
      </Link>
      <div className="flex items-center gap-4 mt-4">
        {UserRepositorysLoading && !UserRepositorys?.length && !repoOpen ? (
          <Skeleton className="flex-1 h-10" />
        ) : (
          <>
            <Popover open={repoOpen} onOpenChange={(open) => {
              setRepoOpen(open);
              if (!open) setSearchValue("");
            }}>
              <PopoverTrigger asChild className="flex-1">
                {UserRepositorys?.length === 0 || !repoName ? (
                  <Button
                    className="flex gap-3 items-center font-semibold justify-start"
                    variant="outline"
                  >
                    <Github
                      className="h-4 w-4 text-[#7A7A7A]"
                      strokeWidth={1.5}
                    />
                    Select Repository
                  </Button>
                ) : (
                  <Button
                    className="flex gap-3 items-center font-semibold justify-start"
                    variant="outline"
                  >
                    {repoName.startsWith("/") ||
                    repoName.includes(":\\") ||
                    repoName.includes(":/") ? (
                      <Folder
                        className="h-4 w-4 text-[#7A7A7A]"
                        strokeWidth={1.5}
                      />
                    ) : (
                      <Github
                        className="h-4 w-4 text-[#7A7A7A]"
                        strokeWidth={1.5}
                      />
                    )}
                    <span className="truncate text-ellipsis whitespace-nowrap">
                      {repoName}
                    </span>
                  </Button>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command shouldFilter={false} defaultValue={defaultRepo ?? undefined}>
                  <CommandInput
                    ref={repoInputRef}
                    value={searchValue}
                    onValueChange={setSearchValue}
                    placeholder="Search repo or paste local path (e.g., /Users/...)"
                  />
                  <CommandList>
                    {UserRepositorysFetching && (
                      <div className="flex items-center justify-center py-2 text-xs text-muted-foreground gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" /> Searching…
                      </div>
                    )}
                    <CommandEmpty>
                      {searchValue.startsWith("https://github.com/") &&
                      !process.env.NEXT_PUBLIC_BASE_URL?.includes(
                        "localhost",
                      ) ? (
                        <Button
                          onClick={() => {
                            handleSetPublicRepoDialog(true);
                            setInputValue(searchValue);
                          }}
                          className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1 h-8 text-sm outline-none bg-background hover:bg-primary text-accent-foreground w-full justify-start gap-2"
                        >
                          <Plus className="size-4" /> <p> Public Repository</p>
                        </Button>
                      ) : searchValue &&
                        searchValue.trim() !== "" &&
                        (searchValue.startsWith("/") ||
                          searchValue.includes(":\\") ||
                          searchValue.includes(":/")) &&
                        process.env.NEXT_PUBLIC_BASE_URL?.includes(
                          "localhost",
                        ) ? (
                        <Button
                          onClick={() => {
                            setIsLocalRepoDailog(true);
                            setLocalRepoPath(searchValue);
                          }}
                          className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1 h-8 text-sm outline-none bg-background hover:bg-primary text-accent-foreground w-full justify-start gap-2"
                        >
                          <Plus className="size-4" /> <p> Local Repository</p>
                        </Button>
                      ) : searchValue && searchValue.trim() !== "" ? (
                        "No repositories found."
                      ) : (
                        "No results found."
                      )}
                    </CommandEmpty>

                    <CommandGroup>
                      {isValidLink && linkedRepoName && (
                        <CommandItem
                          value={linkedRepoName}
                          onSelect={() => handleRepoSelect(linkedRepoName)}
                        >
                          {linkedRepoName}
                        </CommandItem>
                      )}
                      {UserRepositorys?.map((value: any) => {
                        const repoIdentifier = getRepoIdentifier(value);
                        if (!repoIdentifier) {
                          return null;
                        }
                        return (
                          <CommandItem
                            key={value.id}
                            value={repoIdentifier}
                            onSelect={(value) => {
                              dispatch(setRepoName(value));
                              setRepoOpen(false);
                            }}
                          >
                            {repoIdentifier}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                    {repoHasNextPage && (
                      <CommandItem
                        onSelect={loadMoreRepos}
                        className="justify-center text-sm text-muted-foreground"
                      >
                        {UserRepositorysFetching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Load more repositories..."
                        )}
                      </CommandItem>
                    )}
                    <CommandSeparator className="my-1" />
                    <CommandItem
                      value="public"
                      onSelect={() => handleSetPublicRepoDialog(true)}
                    >
                      <span className="flex items-center gap-2">
                        <Plus className="size-4" /> Public Repository
                      </span>
                    </CommandItem>
                    <CommandSeparator className="my-1" />
                    {process.env.NEXT_PUBLIC_BASE_URL?.includes(
                      "localhost",
                    ) && (
                      <>
                        <CommandItem
                          value="local"
                          onSelect={() => setIsLocalRepoDailog(true)}
                        >
                          <span className="flex items-center gap-2">
                            <Folder className="size-4" /> Local Repository
                          </span>
                        </CommandItem>
                        <CommandSeparator className="my-1" />
                      </>
                    )}
                    <CommandItem>
                      <span
                        className="flex items-center gap-2"
                        onClick={(e) => {
                          e.preventDefault();
                          openPopup();
                        }}
                      >
                        <Plus className="size-4" /> Link new repository
                      </span>
                    </CommandItem>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* No separate local repo button */}
          </>
        )}
        {UserBranchLoading ? (
          <Skeleton className="flex-1 h-10" />
        ) : (
          <div className="flex-1 flex gap-2">
            <div className="flex gap-1 border rounded-md p-1 bg-gray-50">
              <Button
                variant={!useCommitId ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setUseCommitId(false);
                  dispatch(setCommitId(""));
                  setCommitIdInput("");
                }}
              >
                Branch
              </Button>
              <Button
                variant={useCommitId ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setUseCommitId(true);
                  dispatch(setBranchName(""));
                }}
              >
                Commit
              </Button>
            </div>
            {!useCommitId ? (
              <Popover open={branchOpen} onOpenChange={(open) => {
                setBranchOpen(open);
                if (!open) setBranchSearchValue("");
              }}>
                <PopoverTrigger asChild className="flex-1">
                  {UserBranch?.length === 0 || !branchName ? (
                    <Button
                      className="flex gap-3 items-center font-semibold justify-start"
                      variant="outline"
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
                  <Command shouldFilter={false} defaultValue={defaultBranch ?? undefined}>
                    <CommandInput
                      ref={branchInputRef}
                      value={branchSearchValue}
                      onValueChange={setBranchSearchValue}
                      placeholder="Search branch..."
                    />
                    <CommandList>
                      <CommandEmpty>
                        {branchSearching ? (
                          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" /> Searching…
                          </div>
                        ) : (
                          "No branch found."
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        {UserBranch?.map((value: any) => (
                          <CommandItem
                            key={value}
                            value={value}
                            onSelect={(value) => {
                              dispatch(setBranchName(value));
                              setBranchOpen(false);
                            }}
                          >
                            {value}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {branchHasNextPage && (
                        <CommandItem
                          onSelect={loadMoreBranches}
                          className="justify-center text-sm text-muted-foreground"
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
            ) : (
              <Input
                className="flex-1"
                placeholder="Enter commit ID (e.g., abc123def...)"
                value={commitIdInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setCommitIdInput(value);
                  if (commitIdDebounceRef.current) {
                    clearTimeout(commitIdDebounceRef.current);
                  }
                  commitIdDebounceRef.current = setTimeout(() => {
                    dispatch(setCommitId(value));
                    commitIdDebounceRef.current = null;
                  }, COMMIT_ID_DEBOUNCE_MS);
                }}
              />
            )}
          </div>
        )}

        <div className="flex items-center shrink-0">
          {parsingStatus !== ParsingStatusEnum.READY && (
            <>
              <Button
                className="w-24 flex items-center justify-center mr-2"
                onClick={handleParse}
                disabled={isParseDisabled}
              >
                <span>Parse</span>
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="cursor-pointer p-2 hover:bg-gray-100 rounded-full"
                      onClick={handleInfoClick}
                    >
                      <Info className="h-4 w-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-4">
                    <p className="text-sm font-semibold mb-2">
                      Unlock the Power of Your Code
                    </p>
                    <p className="text-xs">
                      Parse transforms your codebase into a comprehensive
                      knowledge graph. Our cutting-edge agents analyze and
                      understand your code, enabling seamless, context-aware
                      conversations that bring your development process to the
                      next level.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </div>

      <FileSelector
        filters={filters}
        setFilters={setFilters}
        repoName={repoName}
        branchName={branchName || commitId}
        isParsing={parsingStatus !== ""}
      />

      {/* Parsing Status with new ParsingProgress component */}
      {parsingStatus && (
        <ParsingProgress
          status={parsingStatus}
          onRetry={() =>
            (branchName || commitId) &&
            parseRepo(repoName, branchName, commitId)
          }
        />
      )}

      <Dialog
        open={isPublicRepoDailog}
        onOpenChange={handleSetPublicRepoDialog}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Parse Public Repository</DialogTitle>
            <DialogDescription>
              Paste the link to your public repository
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="link" className="text-center">
                Link
              </Label>
              <Input
                id="link"
                className="col-span-3"
                value={inputValue}
                placeholder="https://github.com/username/repo"
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={() => {
                if (isValidLink) {
                  PublicRepoRefetch();
                }
              }}
              disabled={PublicRepoLoading || !isValidLink}
            >
              <span>
                {PublicRepoLoading && (
                  <Loader className="mr-2 h-4 w-4 animate-spin " />
                )}
              </span>{" "}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLocalRepoDailog} onOpenChange={setIsLocalRepoDailog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Import Local Repository</DialogTitle>
            <DialogDescription>
              Confirm the path to your local repository and specify the branch
              name
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="repo_path" className="text-right">
                Repository Path
              </Label>
              <Input
                id="repo_path"
                className="col-span-3"
                value={localRepoPath}
                placeholder="path/to/local/repo"
                onChange={(e) => setLocalRepoPath(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="branch_name" className="text-right">
                Branch Name
              </Label>
              <Input
                id="branch_name"
                className="col-span-3"
                value={localBranchName}
                placeholder="main"
                onChange={(e) => {
                  const value = e.target.value;
                  setLocalBranchName(value);
                  if (value) {
                    setLocalCommitId("");
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="commit_id" className="text-right">
                Commit ID (optional)
              </Label>
              <Input
                id="commit_id"
                className="col-span-3"
                value={localCommitId}
                placeholder="Leave empty to use branch name"
                onChange={(e) => {
                  const value = e.target.value;
                  setLocalCommitId(value);
                  if (value) {
                    setLocalBranchName(""); // Clear branch name if commit ID is provided
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={() => {
                if (localRepoPath && (localBranchName || localCommitId)) {
                  parseLocalRepo(
                    localRepoPath,
                    localBranchName || undefined,
                    localCommitId || undefined,
                  );
                  setIsLocalRepoDailog(false);
                }
              }}
              disabled={!localRepoPath || (!localBranchName && !localCommitId)}
            >
              <span>
                {parsingStatus === "loading" && (
                  <Loader className="mr-2 h-4 w-4 animate-spin " />
                )}
              </span>{" "}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Step1;
