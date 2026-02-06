"use client";

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import {
  Send,
  Loader2,
  Bot,
  User,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  Undo2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SharedMarkdown } from "@/components/chat/SharedMarkdown";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

const QUICK_ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; action: "add" | "modify" | "remove" | "undo" | "regenerate" }
> = {
  "Add item": { label: "Add item", icon: Plus, action: "add" },
  "Modify item": { label: "Modify item", icon: Pencil, action: "modify" },
  "Remove item": { label: "Remove item", icon: Trash2, action: "remove" },
  Undo: { label: "Undo", icon: Undo2, action: "undo" },
  Regenerate: { label: "Regenerate", icon: RefreshCw, action: "regenerate" },
};

interface SpecChatPanelProps {
  specId: string;
  disabled: boolean;
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  suggestedPrompts?: string[];
  onSuggestedPromptClick?: (prompt: string) => void;
  nextActions?: string[];
  onQuickAction?: (action: "add" | "modify" | "remove" | "undo" | "regenerate") => void;
  canUndo?: boolean;
  scope?: "spec" | "plan";
}

export interface SpecChatPanelRef {
  setInput: (value: string) => void;
  focusInput: () => void;
}

const DEFAULT_SUGGESTED_PROMPTS = [
  "Add rate limiting to the API",
  "Remove Redis dependency",
  "Add authentication middleware",
  "Simplify the database schema",
];

export const SpecChatPanel = forwardRef<SpecChatPanelRef, SpecChatPanelProps>(function SpecChatPanel({
  specId,
  disabled,
  messages,
  onSendMessage,
  isLoading,
  error,
  onRetry,
  suggestedPrompts = DEFAULT_SUGGESTED_PROMPTS,
  onSuggestedPromptClick,
  nextActions = [],
  onQuickAction,
  canUndo = false,
  scope = "spec",
}, ref) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    setInput: (value: string) => setInput(value),
    focusInput: () => textareaRef.current?.focus(),
  }));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading || disabled) return;

    setInput("");
    await onSendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestedClick = (prompt: string) => {
    if (onSuggestedPromptClick) {
      onSuggestedPromptClick(prompt);
    } else {
      setInput(prompt);
      textareaRef.current?.focus();
    }
  };

  const getHeaderTitle = () => {
    switch (scope) {
      case "plan":
        return "Plan Editor Agent";
      case "spec":
      default:
        return "Spec Editor Agent";
    }
  };

  const getScopeBadgeText = () => {
    return scope === "plan" ? "Plan Mode" : "Spec Mode";
  };

  return (
    <div className="flex flex-col h-full bg-background border-r border-[#D3E5E5]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#D3E5E5] shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary-color" />
          <h3 className="text-sm font-semibold text-primary-color">
            {getHeaderTitle()}
          </h3>
        </div>
        <div className={`px-2 py-0.5 rounded text-[10px] font-medium ${
          scope === "plan" 
            ? "bg-blue-100 text-blue-700 border border-blue-200" 
            : "bg-zinc-100 text-zinc-700 border border-zinc-200"
        }`}>
          {getScopeBadgeText()}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && !isLoading && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Chat with the Spec Editor Agent to modify your spec. Try:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSuggestedClick(prompt)}
                  disabled={disabled}
                  className="px-3 py-1.5 text-xs bg-zinc-100 hover:bg-zinc-200 border border-[#D3E5E5] rounded-md text-primary-color transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-primary-color/10 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-primary-color" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                msg.role === "user"
                  ? "bg-primary-color text-accent-color ml-auto"
                  : "bg-zinc-100 border border-[#D3E5E5] text-primary-color"
              )}
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <SharedMarkdown
                  content={msg.content}
                  className="text-sm [&_p]:my-0 [&_p]:leading-relaxed"
                />
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-primary-color/20 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-primary-color" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-primary-color/10 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary-color" />
            </div>
            <div className="bg-zinc-100 border border-[#D3E5E5] rounded-lg px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary-color" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 border-t border-[#D3E5E5] bg-red-50">
          <p className="text-xs text-red-700">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-1 text-xs text-red-600 underline hover:no-underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      )}

      {/* Quick Actions */}
      {onQuickAction && (
        <div className="px-4 py-2 border-t border-[#D3E5E5] shrink-0">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Quick actions
          </p>
          <div className="flex flex-wrap gap-2">
            {(nextActions.length > 0
              ? nextActions
              : ["Add item", "Modify item", "Remove item", "Undo", "Regenerate"]
            )
              .filter((a) => a !== "Undo" || canUndo)
              .map((actionKey) => {
                const config = QUICK_ACTION_CONFIG[actionKey];
                if (!config) return null;
                const Icon = config.icon;
                return (
                  <Button
                    key={actionKey}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || isLoading}
                    onClick={() => onQuickAction(config.action)}
                    className="text-xs h-8 px-2 border-[#D3E5E5]"
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Button>
                );
              })}
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-[#D3E5E5] shrink-0"
      >
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the change you want..."
            disabled={disabled || isLoading}
            rows={2}
            className="min-h-[60px] resize-none"
          />
          <Button
            type="submit"
            disabled={disabled || isLoading || !input.trim()}
            size="icon"
            className="h-[60px] w-12 shrink-0 bg-primary-color text-accent-color hover:opacity-90"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
});
