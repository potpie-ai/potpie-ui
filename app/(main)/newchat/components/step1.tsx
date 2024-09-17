
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery} from "@tanstack/react-query";
import {
  CheckCircle,
  GitBranch,
  Github,
  Loader,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import {setChat } from "@/lib/state/Reducers/chat";
import { Skeleton } from "@/components/ui/skeleton";
import { useState} from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

const Step1 = () => {
  const dispatch = useDispatch();
  const { repoName, branchName } = useSelector(
    (state: RootState) => state.chat
  );
  const [parsingStatus, setParsingStatus] = useState<string>("");
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
      setParsingStatus("Error");
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
            repo_name: repoName, // Add the repo name as a parameter
          },
          headers: headers,
        }
      );
      return response.data.branches;
    },
    enabled: !!repoName && repoName !== "",
  });

  return (
    <div className="text-muted">
      <h1 className="text-xl">Select a repository and branch</h1>
      <Link href={"#"} className="text-accent underline">
        need help?
      </Link>
      <div className=" flex gap-10 mt-7 ml-5">
        {UserRepositorysLoading ? (
          <Skeleton className="w-[220px] h-10" />
        ) : (
          <Select
            defaultValue={repoName}
            onValueChange={(value) => dispatch(setChat({ repoName: value }))}
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
              parseRepo(repoName, value);
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
              {!UserBranchLoading &&
                UserBranch?.map((value: any) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {parsingStatus !== "error" && parsingStatus === "Ready" ? (
        <div className="flex justify-start items-center gap-3 mt-5 ml-5">
          <CheckCircle className="text-[#00C313] h-4 w-4" />{" "}
          <span className="text-[#00C313]">{parsingStatus}</span>
        </div>
      ) : (
        parsingStatus !== "error" && (
          <div className="flex justify-start items-center gap-3 mt-5 ml-5 ">
            <Loader
              className={`animate-spin h-4 w-4 ${parsingStatus === "" && "hidden"}`}
            />{" "}
            <span>{parsingStatus}</span>
          </div>
        )
      )}
      {parsingStatus === "error" && (
        <div className="flex gap-10 items-center my-3">
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
