import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle,
  GitBranch,
  Github,
  Loader,
  Plus,
  XCircle,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import { setChat } from "@/lib/state/Reducers/chat";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
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

const Step1 = () => {
  const dispatch = useDispatch();
  const { repoName, branchName } = useSelector(
    (state: RootState) => state.chat
  );
  const [parsingStatus, setParsingStatus] = useState<string>("");

  const githubAppUrl =
    "https://github.com/apps/" +
    process.env.NEXT_PUBLIC_GITHUB_APP_NAME +
    "/installations/select_target?setup_action=install";
  const popupRef = useRef<Window | null>(null);

  // Open popup for linking a new repo
  const openPopup = () => {
    popupRef.current = window.open(
      githubAppUrl,
      "_blank",
      "width=1000,height=700"
    );
  };

  const parseRepo = async (repo_name: string, branch_name: string) => {
    setParsingStatus("loading");
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      const parseResponse = await axios.post(
        `${baseUrl}/api/v1/parse`,
        { repo_name, branch_name },
        { headers: headers }
      );

      if (repo_name !== null || branch_name !== null) {
        dispatch(setChat({ projectId: parseResponse.data.project_id }));
      }

      const projectId = parseResponse.data.project_id;

      // Check if the initial parse response status is "ready"
      if (parseResponse.data.status === "ready") {
        dispatch(setChat({ chatStep: 2 }));
        setParsingStatus("Ready");
        return parseResponse.data;
      }

      let parsingStatus = "";

      while (true) {
        const statusResponse = await axios.get(
          `${baseUrl}/api/v1/parsing-status/${projectId}`,
          { headers: headers }
        );

        parsingStatus = statusResponse.data.status;
        setParsingStatus(parsingStatus);

        if (parsingStatus === "ready") {
          dispatch(setChat({ chatStep: 2 }));
          setParsingStatus("Ready");
          break;
        } else if (parsingStatus === "submitted") {
          setParsingStatus("Cloning your repository");
        } else if (parsingStatus === "cloned") {
          setParsingStatus("Parsing your code");
        } else if (parsingStatus === "parsed") {
          setParsingStatus("Understanding your codebase");
        } else if (parsingStatus === "error") {
          setParsingStatus("Error");
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
      return parseResponse.data;
    } catch (err) {
      console.error("Error during parsing:", err);
      setParsingStatus("error");
      return err;
    }
  };

  const { data: UserRepositorys, isLoading: UserRepositorysLoading } = useQuery<
    UserRepo[]
  >({
    queryKey: ["user-repository"],
    queryFn: async () => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await axios.get(`${baseUrl}/api/v1/github/user-repos`, {
        headers,
      });
      return response.data.repositories;
    },
  });

  const {
    data: UserBranch,
    isLoading: UserBranchLoading,
    error: UserBranchError,
  } = useQuery<UserRepo[]>({
    queryKey: ["user-branch", repoName],
    queryFn: async () => {
      const headers = await getHeaders(); // Wait for the headers
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL; // Read base URL from the environment variable

      const response = await axios.get(
        `${baseUrl}/api/v1/github/get-branch-list`,
        {
          params: {
            repo_name: repoName,
          },
          headers: headers,
        }
      );
      return response.data.branches;
    },
    enabled: !!repoName && repoName !== "",
  });

  const [showTooltip, setShowTooltip] = useState(false);

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

  const isParseDisabled = !repoName || !branchName || parsingStatus !== "";

  // Reset repoName, branchName, and chatStep when the component mounts
  useEffect(() => {
    dispatch(setChat({ repoName: "", branchName: "", chatStep: 1 }));
  }, [dispatch]);
  const [repoOpen, setRepoOpen] = useState(false);
  const [branchOpen, setbranchOpen] = useState(false);
  return (
    <div className="text-muted">
      <h1 className="text-lg">Select a repository and branch</h1>
      <Link href={"#"} className="text-accent underline">
        need help?
      </Link>
      <div className="flex items-center gap-4 mt-4 ml-5">
        {UserRepositorysLoading ? (
          <Skeleton className="w-[220px] h-10" />
        ) : (
          <Popover open={repoOpen} onOpenChange={setRepoOpen}>
            <PopoverTrigger asChild className="w-[220px]">
              {UserRepositorys?.length === 0 || !repoName ? (
                <Button
                  className="flex gap-3 items-center font-semibold"
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
                  className="flex gap-3 items-center font-semibold"
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
              <Command>
                <CommandInput placeholder="Search repo..." />
                <CommandList>
                  <CommandEmpty>No Repository found.</CommandEmpty>
                  <CommandGroup>
                    {UserRepositorys?.map((value: any) => (
                      <CommandItem
                        key={value.id}
                        value={value.full_name}
                        onSelect={(value) => {
                          if (value !== "new") {
                            dispatch(setChat({ repoName: value }));
                          } else {
                            openPopup();
                          }
                          setRepoOpen(false);
                        }}
                      >
                        {value.full_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
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
          <Popover open={branchOpen} onOpenChange={setbranchOpen}>
            <PopoverTrigger asChild className="w-[220px]">
              {UserRepositorys?.length === 0 || !branchName ? (
                <Button
                  className="flex gap-3 items-center font-semibold "
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
                  className="flex gap-3 items-center font-semibold w-[220px]"
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
                    {!UserBranchLoading ? (
                      UserBranch?.map((value: any) => (
                        <CommandItem
                          key={value}
                          value={value}
                          onSelect={(value) => {
                            dispatch(setChat({ branchName: value }));
                            setbranchOpen(false);
                          }}
                        >
                          {value}
                        </CommandItem>
                      ))
                    ) : (
                      <SelectItem
                        value="loading"
                        disabled
                        className="pointer-events-none"
                      >
                        <Skeleton className="w-[180px] h-7" />
                      </SelectItem>
                    )}
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
      {parsingStatus !== "error" && parsingStatus === "Ready" ? (
        <div className="flex justify-start items-center gap-3 mt-5 ml-5">
          <CheckCircle className="text-[#00C313] h-4 w-4" />{" "}
          <span className="text-[#00C313]">{parsingStatus}</span>
        </div>
      ) : parsingStatus !== "error" && parsingStatus !== "" ? (
        <div className="flex justify-start items-center gap-3 mt-5 ml-5 ">
          <Loader
            className={`animate-spin h-4 w-4 ${parsingStatus === "" && "hidden"}`}
          />{" "}
          <span>{parsingStatus}</span>
        </div>
      ) : null}
      {parsingStatus === "error" && (
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