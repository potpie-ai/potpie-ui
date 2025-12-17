"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, GitBranch, Github } from "lucide-react";
import { useState, useEffect } from "react";
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
      return BranchAndRepositoryService.getBranchList(selectedRepo);
    },
    enabled: !!selectedRepo && selectedRepo !== "",
  });

  // Auto-select first branch when branches are loaded
  useEffect(() => {
    if (UserBranch && UserBranch.length >= 1 && !selectedBranch) {
      setSelectedBranch(UserBranch[0]);
    }
  }, [UserBranch]);

  // Reset branch when repo changes
  useEffect(() => {
    setSelectedBranch("");
  }, [selectedRepo]);

  const handleSend = async () => {
    if (!selectedRepo || !message.trim()) {
      alert("Please select a repository and enter a message");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_WORKFLOWS_URL || "http://localhost:8002"}/api/v1/horizontal-plan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            repo_name: selectedRepo,
            branch: selectedBranch,
            user_prompt: message.trim(),
            qa_list: [""],
            context_text: "",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail?.message || "Failed to create plan");
      }

      alert(
        `Plan created successfully!\n\nPlan ID: ${data.plan_id}\nStatus: ${data.status}\n\nMessage: ${data.message}`,
      );

      // Clear the message after successful submission
      setMessage("");
    } catch (error: any) {
      alert(`Error creating plan: ${error.message}`);
    }
  };

  return (
    <div className="relative flex flex-col h-full min-h-[80vh] px-4 md:px-10 py-6 items-center justify-center">
      <div className="absolute top-1/4 text-center">
        <h1 className="text-4xl font-semibold mb-2">Bake your new task!</h1>
      </div>
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
              disabled={!selectedRepo || !message.trim()}
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
