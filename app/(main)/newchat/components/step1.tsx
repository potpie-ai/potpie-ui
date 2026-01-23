import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle,
  GitBranch,
  Github,
  Loader,
  Plus,
  XCircle,
  Info,
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
import { z } from "zod";
import { toast } from "sonner";
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
import { setBranchName, setRepoName } from "@/lib/state/Reducers/RepoAndBranch";
import { ParsingStatusEnum } from "@/lib/Constants";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import ParsingProgress from "./ParsingProgress";

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

const Step1: React.FC<Step1Props> = ({
  setProjectId,
  setChatStep,
}) => {

  const { repoName, branchName } = useSelector(
    (state: RootState) => state.RepoAndBranch
  );

  const dispatch = useDispatch();


  const [parsingStatus, setParsingStatus] = useState<string>("");
  const [isPublicRepoDailog, setIsPublicRepoDailog] = useState(false);
  const [isLocalRepoDailog, setIsLocalRepoDailog] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [localRepoPath, setLocalRepoPath] = useState("");
  const [localBranchName, setLocalBranchName] = useState("main");
  const [isValidLink, setIsValidLink] = useState(false);
  const [linkedRepoName, setLinkedRepoName] = useState<string | null>(null);
  const [isParseDisabled, setIsParseDisabled] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [repoOpen, setRepoOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [searchText, setSearchText] = useState(""); // Raw search input (single string, no splitting)
  const [debouncedSearchText, setDebouncedSearchText] = useState(""); // Debounced search text
  const [allFetchedBranches, setAllFetchedBranches] = useState<string[]>([]); // All branches fetched across all pages
  const [displayedBranches, setDisplayedBranches] = useState<string[]>([]); // Branches to display (filtered or paginated)
  const [hasNextPage, setHasNextPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(0); // Track which page we're on (0-indexed)
  const [isSearching, setIsSearching] = useState(false); // Track if we're in search mode
  const [isExhausted, setIsExhausted] = useState(false); // Track if all pages have been checked during search
  const [repoOffset, setRepoOffset] = useState(0); // For repo pagination
  const [allRepos, setAllRepos] = useState<any[]>([]); // Store all loaded repos
  const [hasMoreRepos, setHasMoreRepos] = useState(false); // Track if more repos available
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const branchListRef = useRef<HTMLDivElement | null>(null); // Ref for branch CommandList
  const isAutoFetchingRef = useRef<boolean>(false); // Track if we're auto-fetching during search

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
      "width=1000,height=700"
    );
  };

  const parseRepo = async (repo_name: string, branch_name: string) => {
    setParsingStatus("loading");

    try {
      const parseResponse = await BranchAndRepositoryService.parseRepo(
        repo_name,
        branch_name
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
        setChatStep
      );
    } catch (err) {
      console.error("Error during parsing:", err);
      setParsingStatus(ParsingStatusEnum.ERROR);
    }
  };

  const parseLocalRepo = async (repo_path: string, branch_name: string) => {
    setParsingStatus("loading");

    try {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      
      dispatch(setRepoName(repo_path));
      dispatch(setBranchName(branch_name));
      
      const parseResponse = await axios.post(
        `${baseUrl}/api/v1/parse`,
        { repo_path, branch_name },
        { headers }
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
        setChatStep
      );
    } catch (error) {
      console.error("Error during parsing local repo:", error);
      setParsingStatus(ParsingStatusEnum.ERROR);
      toast.error("Error parsing local repository");
    }
  };

  const { data: repoData, isLoading: UserRepositorysLoading, isFetching: isFetchingRepos } = useQuery(
    {
      queryKey: ["user-repository", repoOffset],
      queryFn: async () => {
        const result = await BranchAndRepositoryService.getUserRepositories(20, repoOffset);
        const repos = result.repositories || result;
        
        if (defaultRepo && repos.length > 0 && repoOffset === 0) {
          const decodedDefaultRepo = decodeURIComponent(defaultRepo).toLowerCase();
          const matchingRepo = repos.find((repo: RepoIdentifier) => {
            const repoIdentifier = getRepoIdentifier(repo);
            return repoIdentifier && repoIdentifier.toLowerCase() === decodedDefaultRepo;
          });
          dispatch(setRepoName(matchingRepo ? decodeURIComponent(defaultRepo) : ""));
        }
        
        return {
          repositories: repos,
          has_next_page: result.has_next_page || false,
          total_count: result.total_count
        };
      },
    }
  );

  // Update allRepos when repoData changes
  useEffect(() => {
    if (repoData) {
      // Handle both old format (array) and new format (object with repositories property)
      const repos = Array.isArray(repoData) ? repoData : (repoData.repositories || []);
      const hasNext = Array.isArray(repoData) ? (repos.length === 20) : (repoData.has_next_page || false);
      
      if (repoOffset === 0) {
        // Initial load, replace all repos
        setAllRepos(repos);
      } else {
        // Load more, append to existing repos
        setAllRepos(prev => {
          const existing = new Set(prev.map(r => getRepoIdentifier(r)));
          const uniqueNew = repos.filter((repo: RepoIdentifier) => {
            const identifier = getRepoIdentifier(repo);
            return identifier && !existing.has(identifier);
          });
          return [...prev, ...uniqueNew];
        });
      }
      setHasMoreRepos(hasNext);
    }
  }, [repoData, repoOffset]);

  // Use allRepos instead of UserRepositorys
  const UserRepositorys = allRepos;

  // Debounce search text: wait 300ms after typing stops
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchText.length > 0) {
      debounceTimerRef.current = setTimeout(() => {
        setDebouncedSearchText(searchText);
      }, 300);
    } else {
      setDebouncedSearchText("");
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchText]);

  // Case-insensitive matching function
  const matchesSearch = (branchName: string, searchQuery: string): boolean => {
    return branchName.toLowerCase().includes(searchQuery.toLowerCase());
  };

  // Helper function to sort branches by relevance to search term
  const sortBranchesByRelevance = (branches: string[], searchTerm: string): string[] => {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return branches;
    }
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return [...branches].sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      
      // Exact match (case-insensitive) - highest priority
      const aExact = aLower === lowerSearchTerm;
      const bExact = bLower === lowerSearchTerm;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Starts with search term - second priority
      const aStarts = aLower.startsWith(lowerSearchTerm);
      const bStarts = bLower.startsWith(lowerSearchTerm);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      // Contains search term - third priority
      const aContains = aLower.includes(lowerSearchTerm);
      const bContains = bLower.includes(lowerSearchTerm);
      if (aContains && !bContains) return -1;
      if (!aContains && bContains) return 1;
      
      // If both match, sort by position of match (earlier match is better)
      if (aContains && bContains) {
        const aIndex = aLower.indexOf(lowerSearchTerm);
        const bIndex = bLower.indexOf(lowerSearchTerm);
        if (aIndex !== bIndex) {
          return aIndex - bIndex;
        }
      }
      
      // Finally, alphabetical order
      return a.localeCompare(b);
    });
  };

  // Fetch branches for a specific page (no search filter - we fetch all and filter locally)
  const { data: branchData, isLoading: UserBranchLoading, isFetching: isFetchingBranches } = useQuery({
    queryKey: ["user-branch", repoName, currentPage],
    queryFn: async () => {
      const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)/;
      const match = repoName.match(regex);
      const ownerRepo = match ? `${match[1]}/${match[2]}` : repoName;
      
      const limit = 20;
      const offset = currentPage * limit;
      
      const result = await BranchAndRepositoryService.getBranchList(
        ownerRepo, 
        limit, 
        offset,
        undefined, // No search filter - fetch all branches
        undefined
      );
      
      return result;
    },
    enabled: !!repoName && repoName !== "",
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Accumulate fetched branches across pages
  useEffect(() => {
    if (branchData && branchData.branches) {
      const newBranches = branchData.branches || [];
      
      setAllFetchedBranches(prev => {
        const existing = new Set(prev);
        const uniqueNew = newBranches.filter((b: string) => !existing.has(b));
        return [...prev, ...uniqueNew];
      });
      
      setHasNextPage(branchData.has_next_page || false);
    }
  }, [branchData]);

  // Filter and display branches based on search text
  useEffect(() => {
    if (debouncedSearchText.length === 0) {
      // No search: show paginated branches (first 20, then Load More)
      setIsSearching(false);
      setIsExhausted(false);
      isAutoFetchingRef.current = false;
      const pageSize = 20;
      const endIndex = (currentPage + 1) * pageSize;
      setDisplayedBranches(allFetchedBranches.slice(0, endIndex));
    } else {
      // Search mode: filter all fetched branches and sort by relevance
      setIsSearching(true);
      setIsExhausted(false); // Reset exhausted state for new search
      isAutoFetchingRef.current = false; // Reset auto-fetching for new search
      const filtered = allFetchedBranches.filter(branch => 
        matchesSearch(branch, debouncedSearchText)
      );
      const sorted = sortBranchesByRelevance(filtered, debouncedSearchText);
      setDisplayedBranches(sorted);
    }
  }, [debouncedSearchText, allFetchedBranches, currentPage]);

  // Progressive fetching during search: auto-fetch more pages if not enough matches
  useEffect(() => {
    if (!isSearching || !debouncedSearchText || debouncedSearchText.length === 0) {
      isAutoFetchingRef.current = false;
      setIsExhausted(false);
      return;
    }

    // Only proceed if we're not already fetching
    if (isFetchingBranches || isAutoFetchingRef.current) {
      return;
    }

    const filtered = allFetchedBranches.filter(branch => 
      matchesSearch(branch, debouncedSearchText)
    );
    const sorted = sortBranchesByRelevance(filtered, debouncedSearchText);
    const enoughMatches = 20;
    const needsMoreMatches = sorted.length < enoughMatches;
    const canFetchMore = hasNextPage;

    if (needsMoreMatches && canFetchMore) {
      // Auto-fetch next page
      isAutoFetchingRef.current = true;
      setCurrentPage(prev => prev + 1);
    } else if (!hasNextPage) {
      // All pages exhausted
      setIsExhausted(true);
      isAutoFetchingRef.current = false;
    } else {
      // We have enough matches
      isAutoFetchingRef.current = false;
      setIsExhausted(false);
    }
  }, [debouncedSearchText, allFetchedBranches, hasNextPage, isFetchingBranches, isSearching]);

  // Reset auto-fetching flag when fetch completes
  useEffect(() => {
    if (!isFetchingBranches) {
      isAutoFetchingRef.current = false;
    }
  }, [isFetchingBranches]);

  // Auto-select branch logic
  useEffect(() => {
    if (displayedBranches.length === 1 && !isSearching) {
      dispatch(setBranchName(displayedBranches[0]));
    } else if (displayedBranches.length > 0 && defaultBranch) {
      const matchingBranch = displayedBranches.find((branch: string) => 
        branch.toLowerCase() === decodeURIComponent(defaultBranch).toLowerCase()
      );
      if (matchingBranch) {
        dispatch(setBranchName(decodeURIComponent(defaultBranch)));
      }
    }
  }, [displayedBranches, defaultBranch, dispatch, isSearching]);

  // Reset state when repo changes
  useEffect(() => {
    setSearchText("");
    setDebouncedSearchText("");
    setCurrentPage(0);
    setAllFetchedBranches([]);
    setDisplayedBranches([]);
    setHasNextPage(false);
    setIsSearching(false);
    setIsExhausted(false);
    isAutoFetchingRef.current = false;
  }, [repoName]);

  // Trigger initial fetch when repo is selected
  useEffect(() => {
    if (repoName && repoName !== "" && currentPage === 0 && allFetchedBranches.length === 0) {
      // Initial fetch will happen via the useQuery hook
    }
  }, [repoName, currentPage, allFetchedBranches.length]);

  // Reset repo pagination when repo popover closes
  useEffect(() => {
    if (!repoOpen && repoOffset > 0) {
      // Keep the loaded repos, but reset offset for next time
      // Actually, we want to keep the repos loaded, so don't reset
    }
  }, [repoOpen, repoOffset]);

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
  
      try {
        if(linkedRepoName === ownerRepo){
        handleSetPublicRepoDialog(false);
        setIsValidLink(true);
          return "Repo is public";
        }
        const response =
          await BranchAndRepositoryService.check_public_repo(ownerRepo);
  
        if (response.is_public) {
          setIsValidLink(true);
          setLinkedRepoName(ownerRepo);
          dispatch(setRepoName(ownerRepo))
        } else {
          setIsValidLink(false);
          setLinkedRepoName(null);
          toast.error("Repo is not public. Try linking a private repo.");
        }
        handleSetPublicRepoDialog(false);
        return response;
      } catch (error: any) {
        setLinkedRepoName(null);
        handleSetPublicRepoDialog(false);
        
        openPopup();
       toast.error("Repo is not public try linking new private repo...")
        throw error;
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
    if (repoName && branchName) {
      parseRepo(repoName, branchName);
    }
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowTooltip(!showTooltip);
  };

  useEffect(() => {
    setIsParseDisabled(!repoName || !branchName || parsingStatus !== "");
  }, [repoName, branchName, parsingStatus, inputValue, isValidLink]);

  useEffect(() => {
    if(isPublicRepoDailog){
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
    if(isLocalRepoDailog){
      // Simple validation for local repo path - just check if it's not empty
      setIsValidLink(!!localRepoPath && !!localBranchName);
    }
  }, [localRepoPath, localBranchName, isLocalRepoDailog]);

  // Function to safely set the public repo dialog state
  const handleSetPublicRepoDialog = (value: boolean) => {
    // Only allow opening the dialog if we're not on localhost
    if (value && process.env.NEXT_PUBLIC_BASE_URL?.includes('localhost')) {
      return;
    }
    setIsPublicRepoDailog(value);
  };

  return (
    <div className="text-black max-w-[900px]">
      <h1 className="text-lg">Select a repository and branch</h1>
      <Link href="https://docs.potpie.ai/quickstart" className="text-primary underline">
        Need help?
      </Link>
      <div className="flex items-center gap-4 mt-4">
        {UserRepositorysLoading ? (
          <Skeleton className="flex-1 h-10" />
        ) : (
          <>
          <Popover open={repoOpen} onOpenChange={setRepoOpen}>
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
                  {repoName.startsWith('/') || repoName.includes(':\\') || repoName.includes(':/') ? (
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
              <Command defaultValue={defaultRepo ?? undefined}>
                <CommandInput
                  value={searchValue}
                  onValueChange={(e) => {
                    setSearchValue(e);
                  }}
                  placeholder="Search repo or paste local path (e.g., /Users/...)"
                />
                <CommandList>
                  <CommandEmpty>
                    {searchValue.startsWith("https://github.com/") && !process.env.NEXT_PUBLIC_BASE_URL?.includes('localhost') ? (
                      <Button
                        onClick={() => {handleSetPublicRepoDialog(true);setInputValue(searchValue)}}
                        className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1 h-8 text-sm outline-none bg-white hover:bg-primary text-accent-foreground w-full justify-start gap-2" 
                      >
                          <Plus className="size-4" /> <p> Public Repository</p>
                      </Button>
                    ) : searchValue && searchValue.trim() !== "" && 
                        (searchValue.startsWith('/') || searchValue.includes(':\\') || searchValue.includes(':/')) && 
                        process.env.NEXT_PUBLIC_BASE_URL?.includes('localhost') ? (
                      <Button
                        onClick={() => {setIsLocalRepoDailog(true);setLocalRepoPath(searchValue)}}
                        className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1 h-8 text-sm outline-none bg-white hover:bg-primary text-accent-foreground w-full justify-start gap-2" 
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
                  {/* Show "Load More" when there are more repos */}
                  {hasMoreRepos && (
                    <>
                      <CommandSeparator className="my-1" />
                      <CommandGroup>
                        <CommandItem
                          value="load-more-repos"
                          onSelect={() => {
                            setRepoOffset(allRepos.length);
                          }}
                          className="cursor-pointer text-primary font-medium"
                        >
                          <span className="flex items-center gap-2">
                            <Plus className="size-4" /> Load More Repositories
                          </span>
                        </CommandItem>
                      </CommandGroup>
                    </>
                  )}
                  <CommandSeparator className="my-1" />
                  {!process.env.NEXT_PUBLIC_BASE_URL?.includes('localhost') && (
                    <>
                      <CommandItem
                        value="public"
                        onSelect={() => handleSetPublicRepoDialog(true)}
                      >
                        <span className="flex items-center gap-2">
                          <Plus className="size-4" /> Public Repository
                        </span>
                      </CommandItem>
                      <CommandSeparator className="my-1" />
                    </>
                  )}
                  {process.env.NEXT_PUBLIC_BASE_URL?.includes('localhost') && (
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
                  {!process.env.NEXT_PUBLIC_BASE_URL?.includes('localhost') && (
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
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          
          {/* No separate local repo button */}
          </>
        )}
        {UserBranchLoading && currentPage === 0 ? (
          <Skeleton className="flex-1 h-10" />
        ) : (
          <Popover open={branchOpen} onOpenChange={setBranchOpen}>
            <PopoverTrigger asChild className="flex-1">
              {displayedBranches.length === 0 || !branchName ? (
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
              <Command defaultValue={defaultBranch ?? undefined} shouldFilter={false}>
                <CommandInput 
                  placeholder="Search all branches..." 
                  value={searchText}
                  onValueChange={(value) => {
                    setSearchText(value);
                  }}
                />
                <CommandList ref={branchListRef}>
                  {/* Show search status when searching */}
                  {isSearching && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground border-b">
                      {isFetchingBranches ? (
                        "Searching through all branches..."
                      ) : isExhausted ? (
                        `Found ${displayedBranches.length} match${displayedBranches.length !== 1 ? 'es' : ''}`
                      ) : (
                        `Found ${displayedBranches.length} match${displayedBranches.length !== 1 ? 'es' : ''}${hasNextPage ? ' (searching...)' : ''}`
                      )}
                    </div>
                  )}
                  <CommandEmpty>
                    {!isFetchingBranches && displayedBranches.length === 0 
                      ? (searchText && searchText.length > 0
                          ? (isExhausted 
                              ? "No branches found matching your search." 
                              : "Searching...")
                          : "No branch found.")
                      : ""}
                  </CommandEmpty>
                  <CommandGroup>
                    {displayedBranches.map((value: string) => (
                      <CommandItem
                        key={value}
                        value={value}
                        data-branch={value}
                        onSelect={(value) => {
                          dispatch(setBranchName(value));
                          setBranchOpen(false);
                          setSearchText("");
                        }}
                      >
                        {value}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  {/* Show "Load More" when not searching and there are more branches */}
                  {!isSearching && hasNextPage && (
                    <>
                      <CommandSeparator className="my-1" />
                      <div className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCurrentPage(prev => prev + 1);
                          }}
                          className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground w-full justify-start gap-2 text-primary font-medium"
                          disabled={isFetchingBranches}
                        >
                          {isFetchingBranches ? (
                            <>
                              <Loader className="size-4 animate-spin" /> Loading More Branches...
                            </>
                          ) : (
                            <>
                              <Plus className="size-4" /> Load More Branches
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
      
      {/* Parsing Status with new ParsingProgress component */}
      {parsingStatus && (
  <ParsingProgress 
    status={parsingStatus} 
    onRetry={() => branchName && parseRepo(repoName, branchName)} 
  />
)}
      
      <Dialog open={isPublicRepoDailog} onOpenChange={handleSetPublicRepoDialog}>
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
              Confirm the path to your local repository and specify the branch name
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
                onChange={(e) => setLocalBranchName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={() => {
                if (localRepoPath && localBranchName) {
                  parseLocalRepo(localRepoPath, localBranchName);
                  setIsLocalRepoDailog(false);
                }
              }}
              disabled={!localRepoPath || !localBranchName}
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
