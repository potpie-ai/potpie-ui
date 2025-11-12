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

  const { data: UserRepositorys, isLoading: UserRepositorysLoading } = useQuery(
    {
      queryKey: ["user-repository"],
      queryFn: async () => {
        const data = await BranchAndRepositoryService.getUserRepositories();
        if (defaultRepo && data.length > 0) {
          const decodedDefaultRepo = decodeURIComponent(defaultRepo).toLowerCase();
          const matchingRepo = data.find((repo: RepoIdentifier) => {
            const repoIdentifier = getRepoIdentifier(repo);
            return repoIdentifier && repoIdentifier.toLowerCase() === decodedDefaultRepo;
          });
          dispatch(setRepoName(matchingRepo ? decodeURIComponent(defaultRepo) : ""));
        }
        return data;
      },
    }
  );

  const { data: UserBranch, isLoading: UserBranchLoading } = useQuery({
    queryKey: ["user-branch", repoName],
    queryFn: () => {
      const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)/;
      const match = repoName.match(regex);
      if (match) {
        const ownerRepo = `${match[1]}/${match[2]}`;
        return BranchAndRepositoryService.getBranchList(ownerRepo);
      }
      return BranchAndRepositoryService.getBranchList(repoName).then((data) => {
        // Auto-select branch if there's only one
        if (data?.length === 1) {
          dispatch(setBranchName(data[0]));
        }
        // Handle default branch selection if provided
        else if (data?.length > 0 && defaultBranch) {
          const matchingBranch = data.find((branch: string) => 
            branch.toLowerCase() === decodeURIComponent(defaultBranch).toLowerCase()
          );
          dispatch(setBranchName(matchingBranch ? decodeURIComponent(defaultBranch) : ""));
        }
        return data;
      });
    },
    enabled: !!repoName && repoName !== "",
  });


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
        {UserBranchLoading ? (
          <Skeleton className="flex-1 h-10" />
        ) : (
          <Popover open={branchOpen} onOpenChange={setBranchOpen}>
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
              <Command defaultValue={defaultBranch ?? undefined}>
                <CommandInput placeholder="Search branch..." />
                <CommandList>
                  <CommandEmpty>No branch found.</CommandEmpty>
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
