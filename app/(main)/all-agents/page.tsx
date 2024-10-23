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
import { Edit, Edit3, Play, Plus } from "lucide-react";
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
import Image from "next/image";

const AllAgents = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const userId = auth.currentUser?.uid || "";
  const router = useRouter();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["all-agents"],
    queryFn: async () => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await axios.get(
        `${baseUrl}/api/v1/list-available-agents/`,
        { params: { list_system_agents: false }, headers: headers }
      );
      return response.data;
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
          data.map(
            (
              content: { id: string; name: string; description: string },
              index: React.Key
            ) => (
              <Card
              key={index}
              className={`pt-2 border-border w-[485px] shadow-sm rounded-2xl cursor-pointer hover:scale-105 transition-all duration-300 hover:border-[#FFB36E] hover:border-2 hover:shadow-md`}
            >
              <CardHeader className="p-1 px-6 font-normal flex flex-row justify-between items-center">
                <CardTitle className="text-lg text-muted truncate max-w-[250px]">
                  {content.name}
                </CardTitle>
                <Link href={`/agents?edit=${content.id}`} className="ml-2">
                  <Button variant="outline" className="text-primary p-2 rounded-full bg-transparent border border-gray-300 hover:bg-gray-100 transition-colors duration-200">
                    <Edit className="w-5 h-5" />
                  </Button>
                </Link>
              </CardHeader>
            
              <CardContent className="text-base text-muted-foreground leading-tight px-6 pb-4 flex flex-row justify-between h-full">
                <p className="line-clamp-3 overflow-hidden flex-grow max-w-[380px]">
                  {content.description}
                </p>
                <Button className="text-primary p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200 mt-2 self-end">
                  <Play className="w-6 h-6" />
                </Button>
              </CardContent>
            </Card>
            
            )
          )
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
