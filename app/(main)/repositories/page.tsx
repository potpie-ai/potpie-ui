"use client";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import React, { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import debounce from "debounce";
import getHeaders from "@/app/utils/headers.util";
import axios from "axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { LucideGithub } from "lucide-react";

const AllRepos = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  const githubAppUrl =
    "https://github.com/apps/" +
    process.env.NEXT_PUBLIC_GITHUB_APP_NAME +
    "/installations/select_target?setup_action=install";
  const popupRef = useRef<Window | null>(null);
  const openPopup = () => {
    popupRef.current = window.open(
      githubAppUrl,
      "_blank",
      "width=1000,height=700"
    );
  };
  const { data, isLoading, error } = useQuery({
    queryKey: ["all-repos"],
    queryFn: async () => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await axios.get(`${baseUrl}/api/v1/github/user-repos`, {
        headers: headers,
      });

      return response.data.repositories;
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
          placeholder="Search your Repositories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button onClick={() => openPopup()} className="gap-2">
          <LucideGithub className=" rounded-full border border-white p-1" />
          Add new repo from Github
        </Button>
      </div>
      {!isLoading && data && data.length > 0 ? (
        <Table className="mt-10">
          <TableHeader>
            <TableRow className="border-b-8 border-border">
              <TableHead className="w-[200px] text-primary">Name</TableHead>
              <TableHead className="w-[200px] text-primary">Owner</TableHead>
              <TableHead className="w-[200px] text-primary">Visibility</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data
              .filter((repo: any) =>
                repo.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
              )
              .map((repo: any) => (
                <TableRow key={repo.id} className="hover:bg-gray-100 text-black">
                  <TableCell>
                    <a href={repo.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                      {repo.name}
                    </a>
                  </TableCell>
                  <TableCell>{repo.owner}</TableCell>
                  <TableCell>{repo.private ? "Private" : "Public"}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      ) : isLoading ? (
        <>
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton key={index} className="w-full h-6 mt-4" />
          ))}
        </>
      ) : (
        <div className="flex flex-col items-start h-full w-full">
          <p className="text-primary text-center py-5">No repositories found.</p>
        </div>
      )}
    </div>
  );
};

export default AllRepos;
