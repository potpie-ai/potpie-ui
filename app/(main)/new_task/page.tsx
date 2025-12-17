"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, GitBranch, Github } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface RepoIdentifier {
  full_name?: string | null;
  owner?: string | null;
  name?: string | null;
}

const getRepoIdentifier = (repo: RepoIdentifier) => {
  if (repo?.full_name) {
    return repo.full_name;
  }
  if (repo?.owner && repo?.name) {
    return `${repo.owner}/${repo.name}`;
  }
  return repo?.name || "";
};

const NewTask = () => {
  const [selectedRepo, setSelectedRepo] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [repoOpen, setRepoOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [message, setMessage] = useState("");

  const { data: UserRepositorys, isLoading: UserRepositorysLoading } = useQuery(
    {
      queryKey: ["user-repository"],
      queryFn: async () => {
        const repos = await BranchAndRepositoryService.getUserRepositories();
        return repos;
      },
    },
  );

  const { data: UserBranch, isLoading: UserBranchLoading } = useQuery({
    queryKey: ["user-branch", selectedRepo],
    queryFn: () => {
      return BranchAndRepositoryService.getBranchList(selectedRepo).then(
        (data) => {
          if (data?.length === 1) {
            setSelectedBranch(data[0]);
          }
          return data;
        },
      );
    },
    enabled: !!selectedRepo && selectedRepo !== "",
  });

  const handleSend = () => {
    alert("button pressed");
  };

  return (
    <div className="relative flex flex-col h-full min-h-[80vh] px-4 md:px-10 py-6 items-center justify-center">
      <h1 className="absolute top-1/4 text-4xl font-semibold">
        Bake your new task!
      </h1>
      {/* Input Area with Repo/Branch Selection */}
      <div className="w-full max-w-3xl">
        <div className="flex flex-col gap-3 p-4 border rounded-xl bg-white shadow-sm overflow-visible">
          {/* Textarea */}
          <textarea
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 min-h-[60px] max-h-[200px] resize-none border-0 focus-visible:outline-none bg-transparent text-sm px-1 py-2"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          {/* Repo/Branch Dropdowns Row */}
          <div className="flex items-center gap-2">
            {/* Repository Dropdown */}
            {UserRepositorysLoading ? (
              <Skeleton className="h-8 w-[160px]" />
            ) : (
              <Popover open={repoOpen} onOpenChange={setRepoOpen}>
                <PopoverTrigger asChild>
                  <Button
                    className="flex gap-2 items-center font-medium justify-start h-8 px-3 text-xs"
                    variant="outline"
                    size="sm"
                  >
                    <Github
                      className="h-3.5 w-3.5 text-[#7A7A7A]"
                      strokeWidth={1.5}
                    />
                    <span className="truncate max-w-[100px]">
                      {selectedRepo || "Select Repository"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[220px] p-0 z-50"
                  align="start"
                  sideOffset={5}
                >
                  <Command>
                    <CommandInput placeholder="Search repository..." />
                    <CommandList className="max-h-[200px]">
                      <CommandEmpty>No repository found.</CommandEmpty>
                      <CommandGroup>
                        {UserRepositorys?.map((repo: RepoIdentifier) => (
                          <CommandItem
                            key={getRepoIdentifier(repo)}
                            value={getRepoIdentifier(repo)}
                            onSelect={(value) => {
                              setSelectedRepo(value);
                              setRepoOpen(false);
                            }}
                          >
                            {getRepoIdentifier(repo)}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}

            {/* Branch Dropdown */}
            {UserBranchLoading ? (
              <Skeleton className="h-8 w-[140px]" />
            ) : (
              <Popover open={branchOpen} onOpenChange={setBranchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    className="flex gap-2 items-center font-medium justify-start h-8 px-3 text-xs"
                    variant="outline"
                    size="sm"
                    disabled={!selectedRepo}
                  >
                    <GitBranch
                      className="h-3.5 w-3.5 text-[#7A7A7A]"
                      strokeWidth={1.5}
                    />
                    <span className="truncate max-w-[100px]">
                      {selectedBranch || "Select Branch"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[220px] p-0 z-50"
                  align="start"
                  sideOffset={5}
                >
                  <Command>
                    <CommandInput placeholder="Search branch..." />
                    <CommandList className="max-h-[200px]">
                      <CommandEmpty>No branch found.</CommandEmpty>
                      <CommandGroup>
                        {UserBranch?.map((branch: string) => (
                          <CommandItem
                            key={branch}
                            value={branch}
                            onSelect={(value) => {
                              setSelectedBranch(value);
                              setBranchOpen(false);
                            }}
                          >
                            {branch}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}

            {/* Send Button */}
            <Button
              className="ml-auto h-8 px-3"
              size="sm"
              disabled={!message.trim()}
              onClick={handleSend}
            >
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          </div>
        </div>

        {/* Suggestion Bubbles */}
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            "Write unit tests for the auth module",
            "Refactor the API error handling",
            "Create technical documentation for the codebase",
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setMessage(suggestion)}
              className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full border border-gray-200 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewTask;
