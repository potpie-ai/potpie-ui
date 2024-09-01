"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,  
} from "@/components/ui/select";
import { Select } from "@radix-ui/react-select";
import { useQuery } from "@tanstack/react-query";
import { GitBranch, Github } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import axios from "@/configs/httpInterceptor";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import { setChat } from "@/lib/state/Reducers/chat";

const Step1 = () => {
  const {
    data: UserRepositorys,
    isLoading: UserRepositorysLoading,
    refetch: RefetchUserRepositorys,
  } = useQuery<UserRepo[]>({
    queryKey: ["user-repository"],
    queryFn: () =>
      axios.get(`/github/user-repos`).then((res) => res.data),
  });
  const dispatch = useDispatch();
  const { repoName, branchName } = useSelector(
    (state: RootState) => state.chat
  );
  return (
    <div className="text-muted">
      <h1 className="text-xl">Select a repository and branch</h1>
      <Link href={"#"} className="text-accent underline">
        need help?
      </Link>
      <div className=" flex gap-10 mt-7 ml-5">
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
            {UserRepositorys?.map((value: any, i: number) => (
              <SelectItem key={i} value={value.repo_name}>
                {value.repo_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          defaultValue={branchName}
          onValueChange={(value) => {
            dispatch(setChat({ branchName: value }));
            if (repoName !== null || branchName !== null) {
              dispatch(setChat({ chatStep: 2 }));
            }
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
            <SelectItem value="main">main</SelectItem>
            <SelectItem value="develop">develop</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

const Step2 = () => {
  const { data: AgentTypes, isLoading: AgentTypesLoading } = useQuery<
    AgentType[]
  >({
    queryKey: ["agent-types"],
    queryFn: () => axios.get(`/list-available-agents`).then((res) => res.data),
  });
  const onboardContent = [
    {
      title: "Onboarding expert",
      desc: "Parses your codebase and understands the file structure and intent of every piece of code. Guides you through setup and familiarization with your codebase. Explains key features, conventions, and getting started steps.",
    },
    {
      title: "Review agent",
      desc: "Compares your changes with your default branch and assists in understanding their impact and plan for a safer release",
    },
    {
      title: "Debugging agent",
      desc: "Traces your error through a graph of your codebase and aids in identifying and resolving bugs in your code. Offers strategies for effective debugging and helps optimize troubleshooting processes. ",
    },
    {
      title: "Integration testing agent",
      desc: "Specializes in developing and refining integration tests for your codebase. Helps ensure different components work together correctly.",
    },
  ];
  const dispatch = useDispatch();
  return (
    <div className="flex flex-col w-full gap-7">
      <h1 className="text-xl">Choose your expert</h1>
      <div className="w-full h-full grid grid-cols-2 ml-5 space-y10 gap-10">
        {onboardContent.map((content, index) => (
          <Card
            key={index}
            className="border-border w-[485px] shadow-sm rounded-2xl cursor-pointer hover:scale-105 transition-all duration-300" onClick={() => {
              dispatch(setChat({ agentId: content.title }));
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
                <p>{content.title}</p>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm ml-8 text-muted/70 font-semibold">
              {content.desc}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
const NewChat = () => {

  const { chatStep } = useSelector(
    (state: RootState) => state.chat
  );
  const steps = [
    {
      label: 1,
      content: <Step1 />,
    },
    {
      label:2,
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
        <div key={index} className="flex items-start mb-8 w-full relative">
          {/* Vertical Line */}
          <div
            className={`absolute left-[18px] top-10 h-full border-l-2 border-gray-300 z-0 ${
              index === steps.length - 1 ? "hidden" : "top-10"
            }`}
          ></div>
          {/* Step Circle */}
          <div className={`flex items-center justify-center w-10 h-10 bg-border text-white rounded-full z-10 ${chatStep !== undefined &&   step.label < chatStep ? "bg-[#00C313]" : chatStep === step.label ? "border-accent border-2 bg-white !text-border  " : ""}`}>
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
