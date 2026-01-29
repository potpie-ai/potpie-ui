"use client";

import { useState } from "react";
import { ChevronDown, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

interface RepositorySelectorProps {
  repositories: any[];
  selectedRepo: string | null;
  onRepoSelect: (repoId: string) => void;
  loading: boolean;
}

export default function RepositorySelector({
  repositories,
  selectedRepo,
  onRepoSelect,
  loading,
}: RepositorySelectorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const selectedRepoData = repositories.find(
    (repo) => repo.id?.toString() === selectedRepo
  );

  const handleConnectNew = () => {
    setOpen(false);
    router.push("/integrations");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading repositories...</span>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-between ${
            selectedRepo ? "bg-blue-50 border-blue-200" : "text-muted-text"
          }`}
        >
          <span className="text-sm">
            {selectedRepoData
              ? selectedRepoData.full_name || selectedRepoData.name
              : "Select repository"}
          </span>
          <ChevronDown 
            className={`h-4 w-4 ml-2 ${selectedRepo ? "" : "text-muted-text"}`}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-full min-w-[300px] max-h-[400px] overflow-y-auto">
        {repositories.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No repositories found. Connect a repository to get started.
          </div>
        ) : (
          repositories.map((repo) => (
            <DropdownMenuItem
              key={repo.id}
              onClick={() => {
                onRepoSelect(repo.id.toString());
                setOpen(false);
              }}
              className="flex flex-col items-start p-3 cursor-pointer"
            >
              <span className="font-medium text-sm">
                {repo.full_name || repo.name}
              </span>
              {repo.description && (
                <span className="text-xs text-gray-500 mt-1">
                  {repo.description}
                </span>
              )}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleConnectNew}
          className="flex items-center gap-2 p-3 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Connect New Repository</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

