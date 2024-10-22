"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import debounce from "debounce";
import getHeaders from "@/app/utils/headers.util";
import axios, { AxiosResponse } from "axios";
import Link from "next/link";
import { useDispatch } from "react-redux";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Edit3, LucideEdit, LucideTrash, Play, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { auth } from "@/configs/Firebase-config";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import dayjs from "dayjs";

const AllAgents = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const userId = auth.currentUser?.uid || "";
  const router = useRouter();
  const { data, isLoading, refetch } = useQuery<CustomAgentType[]>({
    queryKey: ["all-agents"],
    queryFn: async () => {
      const baseUrl = process.env.NEXT_PUBLIC_AGENT_BASE_URL;
      const headers = await getHeaders();
      const response = await axios.get(`${baseUrl}/custom-agents/agents/`, {
        params: {
          user_id: userId,
          start: 0,
          limit: 1000,
        },
        headers: headers,
      });
      return response.data.reverse();
    },
  });
  const deleteCustomAgentForm = useMutation({
    mutationFn: async (agnetId: string) => {
      const header = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_AGENT_BASE_URL;
      return (await axios.delete(`${baseUrl}/custom-agents/agents/${agnetId}`, {
        headers: header,
      })) as AxiosResponse<CustomAgentType, any>;
    },
    onSuccess: () => {
      router.refresh();
      refetch();
      toast.success("Agent deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete agent");
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

  return (
    <div className="m-10">
      <div className="flex w-full mx-auto items-center space-x-2">
        <Input
          type="text"
          placeholder="Search your agents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className={`flex flex-wrap gap-4 items-center h-full w-full mt-5`}>
        {!isLoading && data && data.length > 0 ? (
          data.map((agent) => (
            <Card
              className="w-[350px] maxh-[400px] shadow-lg rounded-lg hover:scale-105 transition-transform duration-200 ease-in-out"
              key={agent.id}
            >
              <CardHeader className="flex w-full flex-row justify-between items-start p-4">
                <div className="gap-1">
                  <CardTitle className="text-lg font-semibold truncate w-[200px]">
                    {agent.role}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground truncate w-[200px]">
                    {agent.goal}
                  </CardDescription>
                </div>

                <Link href={`/agents?edit=${agent.id}`} className="ml-auto">
                  <Edit3 className="w-6 h-6 cursor-pointer" />
                </Link>
              </CardHeader>

              <CardContent className="px-4">
                <Link
                  href={`/agents?edit=${agent.id}`}
                  className="w-full flex flex-col gap-2 items-start"
                >
                  <p className="text-sm line-clamp-3 text-muted-foreground">
                   backstory: {agent.backstory}
                  </p>

                  {agent.tasks.length > 0 && (
                    <div className="w-full mt-2">
                      <h3 className="text-md font-semibold mb-1">Tasks:</h3>
                      {agent.tasks.slice(0, 3).map((task) => (
                        <p key={task.id} className="text-sm truncate">
                          {task.description}
                        </p>
                      ))}
                      {agent.tasks.length > 3 && (
                        <p className="text-sm text-primary mt-2">
                          More details...
                        </p>
                      )}
                    </div>
                  )}
                </Link>
              </CardContent>

              <CardFooter className="text-muted-foreground flex justify-between items-end text-xs p-4">
                <div>
                  <p>
                    Updated: {dayjs(agent.updated_at).format("DD MMM YYYY")}
                  </p>
                  <p>
                    Created: {dayjs(agent.created_at).format("DD MMM YYYY")}
                  </p>
                </div>

                <Button className="text-primary p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200">
                  <Play className="w-6 h-6" />
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : isLoading ? (
          Array.from({ length: 10 }).map((_, index) => (
            <Skeleton className="w-64 h-44" key={index} />
          ))
        ) : (
          <div className="flex flex-col items-start h-full w-full">
            <p className="text-primary text-center py-5">No Agents found.</p>
          </div>
        )}
        <div className="w-full flex justify-end my-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => router.push("/agents")}
          >
            <Plus /> Create New
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AllAgents;
