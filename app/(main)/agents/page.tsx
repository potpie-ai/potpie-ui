"use client";
import getHeaders from "@/app/utils/headers.util";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { LucideEdit, LucideTrash } from "lucide-react";

const Agents = () => {
  const { isLoading, data } = useQuery({
    queryKey: ["list-Agents"],
    queryFn: async () => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const res = await axios.get(`${baseUrl}/api/v1/list-available-agents/`, {
        headers: headers,
      });
      return res.data;
    },
  });

  return (
    <div className="m-10">
      <div className="flex w-full mx-auto items-center space-x-2 mb-5">
        <Input type="text" placeholder="Search Agents ..." className="flex-grow" />
      </div>

      {isLoading ? (
        Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full my-3" />
        ))
      ) : (
        <div className="my-3 space-y-5">
          {data.length === 0 ? (
            <div className="flex flex-col items-center">
              <p className="text-primary">No agents found.</p>
            </div>
          ) : (
            data.map(({ id, name, description }: any) => (
              <Card key={id} className="border-none bg-background shadow-md p-4">
                <CardContent className="flex justify-between items-center">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold">{name}</h3>
                    <p className="text-sm truncate max-w-md">{description}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" className="hover:bg-gray-200">
                      <LucideEdit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" className="hover:bg-red-400">
                      <LucideTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Agents;
