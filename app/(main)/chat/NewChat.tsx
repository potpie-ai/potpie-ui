"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, GitBranch, Github, Loader } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import axios from "@/configs/httpInterceptor";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import { setChat } from "@/lib/state/Reducers/chat";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const Step1 = () => {
  const dispatch = useDispatch();
  const { repoName, branchName } = useSelector(
    (state: RootState) => state.chat
  );
  const [parsingStatus, setParsingStatus] = useState<string | boolean>(false);

  const parseRepo = (repo_name: string, branch_name: string) => {
    setParsingStatus("loading");
    const parseResponse = axios
      .post(`/parse`, { repo_name, branch_name })
      .then((res) => {
        if (repoName !== null || branchName !== null) {
          dispatch(setChat({ chatStep: 2 }));
        }
        if (res.status === 200) setParsingStatus("success");
        return res.data;
      })
      .catch((err) => {
        setParsingStatus("error");
        return err;
      });
    console.log(parseResponse);
  };
  const { data: UserRepositorys, isLoading: UserRepositorysLoading } = useQuery<
    UserRepo[]
  >({
    queryKey: ["user-repository"],
    queryFn: () =>
      axios.get(`/github/user-repos`).then((res) => res.data.repositories),
  });
  const {
    data: UserBranch,
    isLoading: UserBranchLoading,
    error: UserBranchError,
  } = useQuery<UserRepo[]>({
    queryKey: ["user-branch"],
    queryFn: () =>
      axios
        .get(`/github/get-branch-list`, {
          params: {
            repo_name: repoName,
          },
        })
        .then((res) => {
          if (res.data.branches.length === 1) {
            // parseRepo(repoName, res.data.branches[0]);
          }
          return res.data.branches;
        }),
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
      {parsingStatus === "loading" && (
        <div className="flex justify-start items-center gap-3 mt-5 ml-5 ">
          <Loader /> <p>Parsing...</p>
        </div>
      )}
      {parsingStatus === "success" && (
        <div className="flex justify-start items-center gap-3 mt-5 ml-5">
          <CheckCircle className="text-emerald-800 h-4 w-4" />{" "}
          <p>Parsing Done</p>
        </div>
      )}
    </div>
  );
};

const Step2 = () => {
  const dispatch = useDispatch();
  const { data: AgentTypes, isLoading: AgentTypesLoading } = useQuery<
    AgentType[]
  >({
    queryKey: ["agent-types"],
    queryFn: () => axios.get(`/list-available-agents`).then((res) => res.data),
  });
  return (
    <div className="flex flex-col w-full gap-7">
      <h1 className="text-xl">Choose your expert</h1>
      <div className="w-full max-w-[65rem] h-full grid grid-cols-2 ml-5 space-y10 gap-10">
        {AgentTypesLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="border-border w-[450px] h-40" />
            ))
          : AgentTypes?.map((content, index) => (
              <Card
                key={index}
                className="border-border w-[485px] shadow-sm rounded-2xl cursor-pointer hover:scale-105 transition-all duration-300"
                onClick={() => {
                  dispatch(setChat({ agentId: content.id, chatStep: 3 }));
                }}
              >
                <CardHeader className="p-2 px-6">
                  <CardTitle className="text-lg flex gap-3 text-muted">
                    <Image
                      src={"/images/person.svg"}
                      alt="logo"
                      width={20}
                      height={20}
                    />
                    <p>{content.name}</p>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm ml-8 text-muted/70 font-semibold">
                  {content.description}
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
};
const NewChat = () => {
  const { chatStep } = useSelector((state: RootState) => state.chat);
  const steps = [
    {
      label: 1,
      content: <Step1 />,
    },
    {
      label: 2,
      content: <Step2 />,
    },
    {
      label: 3,
      content: (
        <div className="flex flex-col ml-4 w-full">
          <p className="font-semibold">All Set! Start chatting.</p>
        </div>
      ),
    },
  ];

  return (
    <div className="relative w-[97%] h-full flex flex-col items-center -mb-12 mt-5  ">
      {steps.map((step, index) => (
        <div
          key={index}
          className={`flex items-start mb-8 w-full relative ${chatStep !== undefined && step.label === chatStep ? "" : "pointer-events-none"}`}
        >
          {/* Vertical Line */}
          <div
            className={`absolute left-[18px] top-10 h-full border-l-2 border-gray-300 z-0 ${
              index === steps.length - 1 ? "hidden" : "top-10"
            }`}
          ></div>
          {/* Step Circle */}
          <div
            className={`flex items-center justify-center w-10 h-10 bg-border text-white rounded-full z-10 ${chatStep !== undefined && step.label < chatStep ? "bg-[#00C313]" : chatStep === step.label ? "border-accent border-2 bg-white !text-border  " : ""}`}
          >
            {step.label}
          </div>
          {/* Step Text */}
          <div className="flex flex-col ml-4 w-full">{step.content}</div>
        </div>
      ))}
    </div>
  );
};

export default NewChat;
