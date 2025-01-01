"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export function EmailSelect({
  emails,
  setEmails
}: {
  emails: string[];
  setEmails: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState("");
  const [inputValue, setInputValue] = React.useState("");

  const handleSelect = (value: string) => {
    if (!isValidEmail(value)) {
      setError("Please enter a valid email address");
      return;
    }
    if (!emails.includes(value)) {
      setEmails(prev => [...prev, value]);
    }
    setInputValue("");
    setError("");
  };

  const handleUnselect = (value: string) => {
    setEmails(prev => prev.filter(item => item !== value));
    inputRef.current?.focus();
  };

  const suggestion = inputValue ? {
    value: inputValue,
    label: inputValue
  } : null;

  return (
    <Command className="overflow-visible bg-transparent">
      <div className="group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap gap-1">
          {emails.map((email, index) => (
            <Badge key={index} variant="secondary">
              {email}
              <button
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => handleUnselect(email)}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ))}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            onFocus={() => setOpen(true)}
            placeholder="Enter email..."
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      {error && <div className="text-sm text-red-500 mt-1">{error}</div>}
      <div className="relative mt-2">
        <CommandList>
          {open && suggestion ? (
            <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
              <CommandGroup className="h-full overflow-auto">
                <CommandItem
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onSelect={() => handleSelect(suggestion.value)}
                  className="cursor-pointer"
                >
                  {suggestion.label}
                </CommandItem>
              </CommandGroup>
            </div>
          ) : null}
        </CommandList>
      </div>
    </Command>
  );
}