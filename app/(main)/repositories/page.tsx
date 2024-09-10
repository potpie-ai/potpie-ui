"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import axios from "@/configs/httpInterceptor";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import debounce from "debounce";

const AllRepos = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  const { data, isLoading } = useQuery({
    queryKey: ["all-repos"],
    queryFn: () => axios.get("/github/user-repos").then((res) => res.data.repositories),
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
    <section className="max-w-2xl w-full space-y-4 h-full mx-auto">
      <div className="flex w-full mx-auto items-center space-x-2">
        <Input
          type="text"
          placeholder="Search your Repos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {isLoading ? (
        <>
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton key={index} className="w-full h-16" />
          ))}
        </>
      ) : (
        <>
          {data
            .filter((repo: any) =>
              repo.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
            )
            .map((repo: any) => (
              <Card key={repo.id} className="border-none shadow-lg">
                <CardHeader className="py-3">
                  <CardTitle className="text-xl">{repo.name}</CardTitle>
                  <CardDescription>Description</CardDescription>
                </CardHeader>
              </Card>
            ))}
        </>
      )}
    </section>
  );
};

export default AllRepos;