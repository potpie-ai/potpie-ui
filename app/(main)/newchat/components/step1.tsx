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
const repoLinkSchema = z.object({
  repoLink: z
    .string()
    .url("Please enter a valid URL")
    .nonempty("Repository link cannot be empty"),
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
  const [isPublicRepoDailog, setIsPublicRepoDailog] = useState(false);
  const [inputValue, setInputValue] = useState("");
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

      if (initialStatus === "ready") {
        setParsingStatus("Ready");
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
      setParsingStatus("Error");
    }
  };

  const { data: UserRepositorys, isLoading: UserRepositorysLoading } = useQuery(
    {
      queryKey: ["user-repository"],
      queryFn: () => BranchAndRepositoryService.getUserRepositories(),
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
      return BranchAndRepositoryService.getBranchList(repoName);
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
        setIsPublicRepoDailog(false);
        toast.error("Invalid repository URL. Please try again.");
        return "Invalid repository URL.";
      }

      const ownerRepo = `${match[1]}/${match[2]}`;

      try {
        if (linkedRepoName === ownerRepo) {
          setIsPublicRepoDailog(false);
          setIsValidLink(true);
          return "Repo is public";
        }
        const response =
          await BranchAndRepositoryService.check_public_repo(ownerRepo);

        if (response.is_public) {
          setIsValidLink(true);
          setLinkedRepoName(ownerRepo);
          setRepoName(ownerRepo);
        } else {
          setIsValidLink(false);
          setLinkedRepoName(null);
          toast.error("Repo is not public. Try linking a private repo.");
        }
        setIsPublicRepoDailog(false);
        return response;
      } catch (error: any) {
        setLinkedRepoName(null);
        setIsPublicRepoDailog(false);

        openPopup();
        toast.error("Repo is not public try linking new private repo...");
        throw error;
      }
    },
    enabled: false,
    retry: false,
  });

  const [showTooltip, setShowTooltip] = useState(false);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)/;
    const match = value.match(regex);
    if (match) {
      setIsValidLink(true);
    } else {
      setIsValidLink(false);
    }
  };

  const handleRepoSelect = (repo: string) => {
    setRepoName(repo);
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
    setRepoName("");
    setBranchName("");
  }, []);

  useEffect(() => {
    if (
      !UserRepositorysLoading &&
      !UserBranchLoading &&
      defaultRepo &&
      UserRepositorys.length > 0 &&
      UserRepositorys.find(
        (repo: { full_name: string }) =>
          repo.full_name === decodeURIComponent(defaultRepo)
      )
    ) {
      setRepoName(decodeURIComponent(defaultRepo));
      if (
        defaultBranch &&
        UserBranch.find(
          (branch: string) => branch === decodeURIComponent(defaultBranch)
        )
      ) {
        setBranchName(decodeURIComponent(defaultBranch));
      }
    }
  }, [
    defaultRepo,
    defaultBranch,
    setRepoName,
    setBranchName,
    UserRepositorysLoading,
    UserBranchLoading,
    UserRepositorys,
    UserBranch,
  ]);

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
          <Popover open={repoOpen} onOpenChange={setRepoOpen}>
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
                  <span className="truncate text-ellipsis whitespace-nowrap">
                    {repoName}
                  </span>
                </Button>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-auto min-w-[220px] max-w-[300px] p-0">
              <Command defaultValue={defaultRepo ?? undefined}>
                <CommandInput
                  value={searchValue}
                  onValueChange={(e) => setSearchValue(e)}
                  placeholder="Search repo or paste link"
                />
                <CommandList>
                  <CommandEmpty>
                    {searchValue.startsWith("https://github.com/") ? (
                      <Button
                        onClick={() => setIsPublicRepoDailog(true)}
                        className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1 h-8 text-sm outline-none bg-white hover:bg-primary text-accent-foreground w-full justify-start gap-2"
                      >
                        <Plus className="size-4" /> <p> Public Repository</p>
                      </Button>
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
                    {UserRepositorys?.map((value: any) => (
                      <CommandItem
                        key={value.id}
                        value={value.full_name}
                        onSelect={(value) => {
                          setRepoName(value);
                          setRepoOpen(false);
                        }}
                      >
                        {value.full_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator className="my-1" />
                  <CommandItem
                    value="public"
                    onSelect={() => setIsPublicRepoDailog(true)}
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="size-4" /> Public Repository
                    </span>
                  </CommandItem>
                  <CommandSeparator className="my-1" />
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
      <Dialog open={isPublicRepoDailog} onOpenChange={setIsPublicRepoDailog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Parse Public Repository</DialogTitle>
            <DialogDescription>
              Paste the link to your public repository
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="link" className="text-right">
                Link
              </Label>
              <Input
                id="link"
                className="col-span-3"
                value={inputValue}
                placeholder="https://github.com/username/repo"
                onChange={(e) => {
                  handleInputChange(e);
                }}
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
    </div>
  );
};

export default Step1;
