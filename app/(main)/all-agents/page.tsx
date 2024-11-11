"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useState, useEffect, useLayoutEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import debounce from "debounce";
import getHeaders from "@/app/utils/headers.util";
import axios, { AxiosResponse } from "axios";
import Link from "next/link";
import {
  Edit,
  Play,
  Pause,
  Loader,
  Plus,
  Bot,
  AlertCircle,
  Trash,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AgentService from "@/services/AgentService";
import { useFeatureFlagEnabled } from "posthog-js/react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { auth } from "@/configs/Firebase-config";
import posthog from 'posthog-js';

const AllAgents = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [statuses, setStatuses] = useState<{ [id: string]: string }>({});
  const [filteredData, setFilteredData] = useState<any>([]);
  const [deleteDailogOpen, setDeleteDialogOpen] = useState(false);

  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["all-agents"],
    queryFn: async () => {
      const response: any = await AgentService.getAgentList();
      setFilteredData(
        response?.filter((agent: { name: string }) =>
          agent.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        )
      );
      return response;
    },
  });

  useEffect(() => {
    if (!isLoading && data && data.length > 0) {
      const newStatuses = data.reduce(
        (acc: { [id: string]: string }, agent: { id: string; status: string }) => {
          acc[agent.id] = agent.status;
          return acc;
        },
        {}
      );

      setStatuses(newStatuses);
    }
  }, [data, isLoading]);

  const deleteCustomAgentForm = useMutation({
    mutationFn: async (agentId: string) => {
      const header = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_POTPIE_PLUS_URL;
      return (await axios.delete(`${baseUrl}/custom-agents/agents/${agentId}`, {
        headers: header,
      })) as AxiosResponse<CustomAgentType, any>;
    },
    onSuccess: (data, agentId) => {
      router.refresh();
      setFilteredData((prevData: any) =>
        prevData.filter((agent: any) => agent.id !== agentId)
      );
      toast.success("Agent deleted successfully");
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast.error("Failed to delete agent");
    },
  });

  const deployAgent = useMutation({
    mutationFn: async (agentId: string) => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_POTPIE_PLUS_URL;
      return axios.post(
        `${baseUrl}/deployment/agents/${agentId}/deploy`,
        {},
        { headers }
      );
    },
    onMutate: (agentId: string) => {
      setStatuses((prev) => ({ ...prev, [agentId]: "IN_PROGRESS" }));
    },
    onSuccess: (data, agentId) => {
      toast.success("Agent deployed successfully");
      setStatuses((prev) => ({ ...prev, [agentId]: "RUNNING" }));
    },
    onError: (error, agentId) => {
      toast.error("Failed to deploy agent");
      setStatuses((prev) => ({ ...prev, [agentId]: "ERROR" }));
    },
  });

  const stopAgent = useMutation({
    mutationFn: async (agentId: string) => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_POTPIE_PLUS_URL;
      return axios.post(
        `${baseUrl}/deployment/agents/${agentId}/stop`,
        {},
        { headers }
      );
    },
    onMutate: (agentId: string) => {
      setStatuses((prev) => ({ ...prev, [agentId]: "IN_PROGRESS" }));
    },
    onSuccess: (data, agentId) => {
      toast.success("Agent stopped successfully");
      setStatuses((prev) => ({ ...prev, [agentId]: "STOPPED" }));
    },
    onError: (error, agentId) => {
      toast.error("Failed to stop agent");
      setStatuses((prev) => ({ ...prev, [agentId]: "ERROR" }));
    },
  });

  useEffect(() => {
    const handler = debounce((value) => {
      setDebouncedSearchTerm(value);
    }, 500);
    handler(searchTerm);
    return () => {
      handler.clear();
    };
  }, [searchTerm]);

  
  useEffect(() => {
    const user = auth.currentUser;
    if (user?.uid) {
      posthog.identify(user.uid);
      posthog.people.set({ id: user.uid });
    }
  }, [auth?.currentUser]);

  const customAgentsFlag = useFeatureFlagEnabled("custom_agents");

  useEffect(() => {
    if (customAgentsFlag === undefined) {
      return;
    }
    if (customAgentsFlag === false) {
      router.push("/");
      setTimeout(() => {
        window.open("https://potpie.ai/pricing", "_blank");
      }, 500);
    }
  }, [router, customAgentsFlag]);
  

  return (
    <div className="m-10">
      <div className="flex w-full mx-auto items-center space-x-2 mb-5">
        <Input
          type="text"
          placeholder="Search your agents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button className="gap-2" onClick={() => router.push("/agents")}>
          <Plus /> Create New Agent
        </Button>
      </div>
      <div className={`flex flex-wrap gap-16 items-center h-full w-full`}>
        {isLoading || customAgentsFlag !== true ? (
          Array.from({ length: 10 }).map((_, index) => (
            <Skeleton className="w-64 h-44" key={index} />
          ))
        ) : data && data.length === 0 && !searchTerm ? (
          <Card className="p-6 w-full text-center shadow-md rounded-2xl">
            <CardContent>
              <p className="text-lg text-muted">No agents available.</p>
              <Button className="mt-4" onClick={() => router.push("/agents")}>
                <Plus /> Create New Agent
              </Button>
            </CardContent>
          </Card>
        ) : filteredData && filteredData.length === 0 && searchTerm ? (
          <div className="flex flex-col items-center justify-center w-full py-10">
            <p className="text-lg text-muted-foreground">
              No agents found matching {debouncedSearchTerm}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setSearchTerm("")}
            >
              Clear Search
            </Button>
          </div>
        ) : (
          filteredData.map(
            (
              content: { id: string; name: string; description: string },
              index: React.Key
            ) => {
              const deploymentStatus = statuses[content.id];
              return (
                <Card
                  key={index}
                  className="h-[200px] w-[485px] pt-2 border-border shadow-sm rounded-2xl cursor-pointer hover:scale-105 transition-all duration-300 hover:border-[#FFB36E] hover:border-2 hover:shadow-md flex flex-col justify-between"
                >
                  <CardHeader className="p-1 px-6 font-normal flex flex-row justify-between items-center">
                    <CardTitle className="text-lg text-muted flex gap-2 items-center max-w-[380px]">
                      <div className="truncate">{content.name}</div>
                      <Bot className="flex-shrink-0" />
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="px-6 pb-4 overflow-hidden text-base text-muted-foreground leading-tight max-w-[480px]">
                    <p className="line-clamp-3">{content.description}</p>
                  </CardContent>

                  <CardFooter className="flex items-center justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:text-primary"
                      onClick={() =>
                        deploymentStatus === "RUNNING"
                          ? stopAgent.mutate(content.id)
                          : deployAgent.mutate(content.id)
                      }
                    >
                      {deploymentStatus === "ERRORED" ? (
                        <AlertCircle className="size-5 text-red-600" />
                      ) : !deploymentStatus ? (
                        <Loader className="size-5 animate-spin" />
                      ) : deploymentStatus === "RUNNING" ? (
                        <Pause className="size-5" />
                      ) : deploymentStatus === "IN_PROGRESS" ? (
                        <Loader className="size-5 animate-spin" />
                      ) : deploymentStatus === "STOPPED" ? (
                        <Play className="size-5" />
                      ) : (
                        <AlertCircle className="size-5 text-red-600" />
                      )}
                    </Button>
                    <Dialog
                      open={deleteDailogOpen}
                      onOpenChange={setDeleteDialogOpen}
                    >
                      <DialogTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:text-primary"
                        >
                          <Trash className="size-5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="truncate max-w-[400px] flex items-center">
                            Are you sure you want to delete&nbsp;
                            <span className="font-semibold inline-block max-w-[200px] truncate">
                              {content.name}
                            </span>&nbsp;
                            ?
                          </DialogTitle>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button
                            variant="destructive"
                            onClick={() =>
                              deleteCustomAgentForm.mutate(content.id)
                            }
                            className="gap-2"
                          >
                            {deleteCustomAgentForm.isPending ? (
                              <Loader className="w-5 h-5 animate-spin" />
                            ) : null}{" "}
                            <span>Delete</span>
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Link href={`/agents?edit=${content.id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-primary"
                      >
                        <Edit className="w-5 h-5" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            }
          )
        )}
      </div>
    </div>
  );
};

export default AllAgents;
