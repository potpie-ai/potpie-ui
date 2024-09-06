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
import { CheckCircle, GitBranch, Github, Loader, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import axios from "@/configs/httpInterceptor";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import { addMessageToConversation, agentRespond, setChat } from "@/lib/state/Reducers/chat";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { auth } from "@/configs/Firebase-config";
import { Label } from "@radix-ui/react-label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent } from "@radix-ui/react-tooltip";
import { Button } from "@/components/ui/button";
import { TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";

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
      dispatch(setChat({ projectId: res.data.project_id }));
          dispatch(setChat({ chatStep: 2 }));
        }
        if (res.status === 200) setParsingStatus("success");
        return res.data;
      })
      .catch((err) => {
        setParsingStatus("error");
        return err;
      });
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
          <Loader className="animate-spin h-4 w-4" /> <span>Parsing...</span>
        </div>
      )}
      {parsingStatus === "success" && (
        <div className="flex justify-start items-center gap-3 mt-5 ml-5">
          <CheckCircle className="text-emerald-800 h-4 w-4" />{" "}
          <span>Parsing Done</span>
        </div>
      )}
    </div>
  );
};

const Step2 = () => {
  const dispatch = useDispatch();
  const userId = auth.currentUser?.uid || "";
  const {
    projectId,
    title,
  } = useSelector((state: RootState) => state.chat);
  const { data: AgentTypes, isLoading: AgentTypesLoading } = useQuery<
    AgentType[]
  >({
    queryKey: ["agent-types"],
    queryFn: () => axios.get(`/list-available-agents/`).then((res) => {
      return res.data
    }),
  });
  const createConversation = async (event:any) => {
      dispatch(setChat({ agentId: event, chatStep: 3 }));
      const response = await axios
        .post("/conversations/", {
          user_id: userId,
          title: title,
          status: "active",
          project_ids: [projectId],
          agent_ids: [event],
        })
        .then((res) => {
          dispatch(setChat({currentConversationId:res.data.conversation_id}))
          return res.data;
        })
        .catch((err) => {
          console.log(err);
          return { error: "Unable to create conversation: " + err.message };
        });

      if (response.error) {
        console.error(response.error);
      }
    } 
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
                className="border-border w-[485px] shadow-sm rounded-2xl cursor-pointer hover:scale-105 transition-all duration-300 hover:border-[#FFB36E]                "
                onClick={() => createConversation(content.id)}
              >
                <CardHeader className="p-2 px-6">
                  <CardTitle className="text-lg flex gap-3 text-muted">
                    <Image
                      src={"/images/person.svg"}
                      alt="logo"
                      width={20}
                      height={20}
                    />
                    <span>{content.name}</span>
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
  const router = useRouter();
  const dispatch = useDispatch();
  const { chatStep } = useSelector((state: RootState) => state.chat);
  const {
    currentConversationId,
  } = useSelector((state: RootState) => state.chat);
  const [message, setMessage] = useState("");
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
          <span className="font-semibold">All Set! Start chatting.</span>
        </div>
      ),
    },
  ];

  const handleSubmit = (e: any) => {
    e.preventDefault();
      dispatch(
        addMessageToConversation({
          conversationId: currentConversationId,
          message: { sender: "user", text: message },
        })
      );
      dispatch(agentRespond());
      router.push("/chat")
  };

  return (
    <div className="relative flex h-full min-h-[50vh] flex-col rounded-xl p-4 lg:col-span-2 ">
    <div className="relative w-[97%] h-full flex flex-col items-center -mb-12 mt-5">
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
    <div className="flex-1" />
    <form
      className={`relative pb-3 ml-20 overflow-hidden rounded-lg bg-background focus-within:ring-1 focus-within:ring-ring shadow-2xl ${chatStep !== 3 ? "pointer-events-none" : ""}`}
      onSubmit={handleSubmit}
    >
      <Label htmlFor="message" className="sr-only">
        Message
      </Label>
      <Textarea
        id="message"
        placeholder="Start chatting with the expert...."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="min-h-12 h-[50%] resize-none border-0 p-3 px-7 shadow-none focus-visible:ring-0"
      />
      <div className="flex items-center p-3 pt-0 ">
        <Tooltip>
          <TooltipTrigger asChild className="mx-2 !bg-transparent">
            <Button variant="ghost" size="icon">
              <Plus className="border-primary rounded-full border-2" />
              <span className="sr-only">Share File</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Share File</TooltipContent>
        </Tooltip>
        <Button type="submit" size="sm" className="ml-auto !bg-transparent">
          <Image
            src={"/images/sendmsg.svg"}
            alt="logo"
            width={20}
            height={20}
          />
        </Button>
      </div>
    </form>
  </div>

  );
};

export default NewChat;
