import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle,
  GitBranch,
  Github,
  Loader,
  Plus,
  Forward,
  XCircle,
  Info,
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
import { z, ZodError } from "zod"; 
import { useForm } from "react-hook-form"; 
import { toast } from "sonner";
const repoLinkSchema = z.object({
  repoLink: z.string().url("Please enter a valid URL").nonempty("Repository link cannot be empty"),
});

interface Step1Props {
  repoName: string;
  branchName: string;
  setRepoName: (name: string) => void;
  setBranchName: (name: string) => void;
  setProjectId: (id: string) => void;
  setChatStep: (step: number) => void;
}

const Step1: React.FC<Step1Props> = ({
  repoName,
  branchName,
  setRepoName,
  setBranchName,
  setProjectId,
  setChatStep,
}) => {
  const [parsingStatus, setParsingStatus] = useState<string>("");
  const [linkInputVisible, setLinkInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isValidLink, setIsValidLink] = useState(false); // To track if the input is a valid link
  const [linkedRepoName, setLinkedRepoName] = useState<string | null>(null);
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
      const parseResponse = await BranchAndRepositoryService.parseRepo(repo_name, branch_name);
      const projectId = parseResponse.project_id;
      const initialStatus = parseResponse.status;
  
      if (projectId) {
        setProjectId(projectId);
      }
  
      if (initialStatus === "ready") {
        setParsingStatus("Ready");
        setChatStep(2);
        return;
      }
  
      await BranchAndRepositoryService.pollParsingStatus(projectId, initialStatus, setParsingStatus, setChatStep);
    } catch (err) {
      console.error("Error during parsing:", err);
      setParsingStatus("Error");
    }
  };

  const { data: UserRepositorys, isLoading: UserRepositorysLoading } = useQuery({
    queryKey: ["user-repository"], 
    queryFn: () => BranchAndRepositoryService.getUserRepositories(), 
  });
  
  const {
    data: UserBranch,
    isLoading: UserBranchLoading,
  } = useQuery({
    queryKey: ["user-branch", repoName], 
    queryFn: () => {
      const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)/;
      const match = repoName.match(regex);
      if (match) {
        const ownerRepo = `${match[1]}/${match[2]}`;
        return BranchAndRepositoryService.getBranchList(ownerRepo); 
      }
      return BranchAndRepositoryService.getBranchList(repoName)
    
    },
    enabled: !!repoName && repoName !== "", 
  });

  const checkAndSetRepo = async (value: string) => {
    const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)/;
    const match = value.match(regex);
    if (match) {
      const ownerRepo = `${match[1]}/${match[2]}`;
      try {
        const response = await BranchAndRepositoryService.check_public_repo(ownerRepo);
        if (response.is_public) {
          setIsValidLink(true);
          setLinkedRepoName(ownerRepo); // Show the repo in the dropdown
        } else {
          setIsValidLink(false);
          toast.error("This repository is private or not accessible.");
        }
      } catch (error) {
        setIsValidLink(false);
        toast.error("Repository not found or inaccessible.");
      }
    } else {
      setIsValidLink(false);
      setLinkedRepoName(null); // Clear previous linked repo if input is not a link
    }
  };


  const [showTooltip, setShowTooltip] = useState(false);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    checkAndSetRepo(value);

    // Check if the input is a valid GitHub URL
    const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)/;
    const match = value.match(regex);
    if (match) {
      setIsValidLink(true);
      const ownerRepo = `${match[1]}/${match[2]}`;
      setRepoName(ownerRepo); // Set repo name to owner/repo format
    } else {
      setIsValidLink(false);
    }
  };
  const handleValueChange = (search: string) => {
    handleInputChange({ target: { value: search } } as React.ChangeEvent<HTMLInputElement>);
  }
  const handleRepoSelect = (repo: string) => {
    setRepoName(repo);
    setInputValue(repo); // Set input value to the selected repository
    setLinkedRepoName(null); // Clear the linked repo after selection
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
  const filteredRepositories = UserRepositorys?.filter((repo: any) =>
    repo.full_name.toLowerCase().includes(inputValue.toLowerCase())
  ) || [];

  const isParseDisabled = !repoName || !branchName || parsingStatus !== "";
  const isRepoListEmpty = !UserRepositorys || UserRepositorys.length === 0;
  const showNoRepoFound = filteredRepositories.length === 0 && !isValidLink && !linkedRepoName;


  useEffect(() => {
    setRepoName("");
    setBranchName(""); 
  }, []);

  const [repoOpen, setRepoOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);

  return (
    <div className="text-muted">
      <h1 className="text-lg">Select a repository and branch</h1>
      <Link href={"#"} className="text-accent underline">
        Need help?
      </Link>
      <div className="flex items-center gap-4 mt-4 ml-5">
        {UserRepositorysLoading ? (
          <Skeleton className="w-[220px] h-10" />
        ) : (
          <Popover open={repoOpen} onOpenChange={(isOpen) => {
            setRepoOpen(isOpen);
            if (!isOpen){ 
              setLinkInputVisible(false)
            }

           }}>
            <PopoverTrigger asChild className="w-[220px]">
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
                  <Github
                    className="h-4 w-4 text-[#7A7A7A]"
                    strokeWidth={1.5}
                  />
                  {repoName ? (
                  <span className="truncate text-ellipsis whitespace-nowrap">
                    {repoName}
                  </span>):("Search or paste repo link")}
                </Button>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-auto min-w-[220px] max-w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Search repo or paste link.." value={inputValue} onValueChange={handleValueChange}/>
                <CommandList>
                  {showNoRepoFound ? (
                    <CommandEmpty>No Repository found.</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {UserRepositorys?.map((value: any) => (
                        <CommandItem
                          key={value.id}
                          value={value.full_name}
                          onSelect={() => handleRepoSelect(value.full_name)}
                        >
                          {value.full_name}
                        </CommandItem>
                      ))}
                      {isValidLink && linkedRepoName && (
                        <CommandItem
                          value={linkedRepoName}
                          onSelect={() => handleRepoSelect(linkedRepoName)}
                        >
                          {linkedRepoName}
                        </CommandItem>
                      )}
                    </CommandGroup>
                  )}
                  <CommandSeparator className="my-1" />
                  <CommandItem>
                    <span
                      onClick={(e) => {
                        e.preventDefault();
                        openPopup();
                      }}
                    >
                      + Link new repository
                    </span>
                  </CommandItem>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
        {UserBranchLoading ? (
          <Skeleton className="w-[220px] h-10" />
        ) : (
          <Popover open={branchOpen} onOpenChange={setBranchOpen}>
            <PopoverTrigger asChild className="w-[220px]">
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
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="Search branch..." />
                <CommandList>
                  <CommandEmpty>No branch found.</CommandEmpty>
                  <CommandGroup>
                    {UserBranch?.map((value: any) => (
                      <CommandItem
                        key={value}
                        value={value}
                        onSelect={(value) => {
                          setBranchName(value);
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

        <div className="flex items-center">
          {parsingStatus !== "Ready" && (
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
      {parsingStatus !== "Error" && parsingStatus === "Ready" ? (
        <div className="flex justify-start items-center gap-3 mt-5 ml-5">
          <CheckCircle className="text-[#00C313] h-4 w-4" />{" "}
          <span className="text-[#00C313]">{parsingStatus}</span>
        </div>
      ) : parsingStatus !== "Error" && parsingStatus !== "" ? (
        <div className="flex justify-start items-center gap-3 mt-5 ml-5 ">
          <Loader
            className={`animate-spin h-4 w-4 ${parsingStatus === "" && "hidden"}`}
          />{" "}
          <span>{parsingStatus}</span>
        </div>
      ) : null}
      {parsingStatus === "Error" && (
        <div className="flex gap-4 items-center my-3">
          <div className="flex justify-start items-center gap-3 ">
            <XCircle className="text-[#E53E3E] h-4 w-4" />{" "}
            <span>{parsingStatus}</span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => branchName && parseRepo(repoName, branchName)}
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
};

export default Step1;