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
import { LucideEdit, LucideTrash } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const AllAgents = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  const router = useRouter();
  const { data, isLoading,refetch } = useQuery<CustomAgentType[]>({
    queryKey: ["all-agents"],
    queryFn: async () => {
      const baseUrl = process.env.NEXT_PUBLIC_AGENT_BASE_URL;
      const headers = await getHeaders();
      const response = await axios.get(`${baseUrl}/custom-agents/agents/`, {
        params: {
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
      return (await axios.delete(
        `${baseUrl}/custom-agents/agents/${agnetId}`,{
          headers: header,
        }
      )) as AxiosResponse<CustomAgentType, any>;
    },
    onSuccess: () => {
      router.refresh();
      refetch();
      toast.success("Agent deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete agent");
    }
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
      {!isLoading && data && data.length > 0 ? (
        <Table className="mt-10">
          <TableHeader className="font-semibold text-red">
            <TableRow className="border-b border-border font-semibold text-red">
              <TableHead className="w-[200px] text-primary">Role</TableHead>
              <TableHead className="w-[200px] text-primary">
                Goal
              </TableHead>{" "}
              <TableHead className="w-[200px] text-primary">
                Backstory
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((agent) => (
              <TableRow
                key={agent.id}
                className="hover:bg-red border-b border-gray-200"
              >
                <TableCell>
                  <Link href={`#`}>{agent.role}</Link>
                </TableCell>
                <TableCell>
                  <Link href={`#`}>{agent.goal}</Link>
                </TableCell>
                <TableCell>
                  <Link href={`#`}>{agent?.backstory}</Link>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-5">
                    <div className="flex gap-3">
                      <Button
                        onClick={() => router.push(`/agents?edit=${agent.id}`)}
                      >
                        <LucideEdit className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      className="configure-button hover:bg-gray-200"
                      onClick={() => {
                        deleteCustomAgentForm.mutate(agent.id);
                      }}
                    >
                      <LucideTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : isLoading ? (
        <Skeleton className="h-6 mt-4 w-full" />
      ) : (
        <div className="flex flex-col items-start h-full w-full">
          <p className="text-primary text-center py-5">No Agents found.</p>
        </div>
      )}
    </div>
  );
};

export default AllAgents;
