"use client";

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
import { GitBranch, Github } from "lucide-react";
import { ReactNode } from "react";

interface RepoIdentifier {
  full_name?: string | null;
  owner?: string | null;
  name?: string | null;
}

interface RepoBranchDropdownProps<T> {
  type: "repository" | "branch";
  isLoading?: boolean;
  items: T[];
  selectedItem: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  onSelect: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  getItemKey: (item: T) => string;
  getItemValue: (item: T) => string;
  getItemDisplay: (item: T) => string;
}

const getRepoIdentifier = (repo: RepoIdentifier): string => {
  if (repo?.full_name) {
    return repo.full_name;
  }
  if (repo?.owner && repo?.name) {
    return `${repo.owner}/${repo.name}`;
  }
  return repo?.name || "";
};

export const RepoBranchDropdown = <T,>({
  type,
  isLoading = false,
  items,
  selectedItem,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  onSelect,
  open,
  onOpenChange,
  disabled = false,
  getItemKey,
  getItemValue,
  getItemDisplay,
}: RepoBranchDropdownProps<T>) => {
  const Icon = type === "repository" ? Github : GitBranch;
  const iconColorClass = "text-[#7A7A7A]";

  if (isLoading) {
    return <Skeleton className="h-8 w-[160px]" />;
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          className="flex gap-2 items-center font-medium justify-start h-8 px-3 text-xs"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label={`Select ${type}`}
        >
          <Icon className={`h-3.5 w-3.5 ${iconColorClass}`} strokeWidth={1.5} />
          <span className="truncate max-w-[100px]">
            {selectedItem || placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[220px] p-0 z-50"
        align="start"
        sideOffset={5}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-[200px]">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={getItemKey(item)}
                  value={getItemValue(item)}
                  onSelect={(value) => {
                    onSelect(value);
                    onOpenChange(false);
                  }}
                >
                  {getItemDisplay(item)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export { type RepoIdentifier, getRepoIdentifier };
