import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, GitBranch, Github, Loader, Plus, XCircle, Info } from "lucide-react";
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
      await new Promise((resolve) => setTimeout(resolve, 5000));

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
          setParsingStatus("Parsing");
        } else if (parsingStatus === "parsed") {
          setParsingStatus("Understanding your code");
        } else if (parsingStatus === "error") {
          setParsingStatus("error");
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

  useEffect(() => {
    if (branchName && repoName) parseRepo(repoName, branchName);
  }, []);

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

  const isParseDisabled = !repoName || !branchName;

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
          <Select
            defaultValue={repoName}
            onValueChange={(value) => {
              if (value !== "new") {
                dispatch(setChat({ repoName: value }));
              } else {
                openPopup();
              }
            }}
          >
            <SelectTrigger className="w-[220px] py-2  border-border ">
              <SelectValue
                className=""
                placeholder={
                  <div className="flex gap-3 items-center font-semibold ">
                    <Github
                      className="h-4 w-4 text-[#7A7A7A] "
                      strokeWidth={1.5}
                    />
                    Select Repository
                  </div>
                }
              />
            </SelectTrigger>
            <SelectContent>
              {UserRepositorys?.map((value: any) => (
                <SelectItem key={value.id} value={value.full_name}>
                  {value.full_name}
                </SelectItem>
              ))}
              {/* Link new repository option */}
              <SelectItem key="new" value="new">
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    openPopup();
                  }}
                >
                  + Link new repository
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
        {UserRepositorysLoading ? (
          <Skeleton className="w-[220px] h-10" />
        ) : (
          <Select
            defaultValue={branchName}
            onValueChange={(value) => {
              dispatch(setChat({ branchName: value }));
            }}
          >
            <SelectTrigger className="w-[220px] py-2  border-border">
              <SelectValue
                className=""
                placeholder={
                  <div className="flex gap-3 items-center font-semibold ">
                    <GitBranch
                      className="h-4 w-4 text-[#7A7A7A] "
                      strokeWidth={1.5}
                    />
                    Select Branch
                  </div>
                }
              />
            </SelectTrigger>

            <SelectContent>
              {!UserBranchLoading ? (
                UserBranch?.map((value: any) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
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
            </SelectContent>
          </Select>
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
                    <p className="text-sm font-semibold mb-2">Unlock the Power of Your Code</p>
                    <p className="text-xs">
                      Parse transforms your codebase into a comprehensive knowledge graph. 
                      Our cutting-edge agents analyze and understand your code, 
                      enabling seamless, context-aware conversations that bring 
                      your development process to the next level.
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
