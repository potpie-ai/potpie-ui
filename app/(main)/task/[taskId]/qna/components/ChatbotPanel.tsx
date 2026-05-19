"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Minimize2, Maximize2, Send, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ChatbotPanelProps {
  minimized: boolean;
  onToggleMinimize: () => void;
  isGenerating: boolean;
}

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
}

export default function ChatbotPanel({
  minimized,
  onToggleMinimize,
  isGenerating,
}: ChatbotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "I'm analyzing the repository and generating context-specific questions for your implementation plan.",
      sender: "assistant",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isGenerating) {
      const generatingMessages = [
        "Questions are being prepared...",
        "Continuing to prepare questions...",
        "Almost there...",
      ];
      let index = 0;
      const interval = setInterval(() => {
        if (index < generatingMessages.length) {
          setMessages((prev) => [
            ...prev,
            {
              id: `gen-${index}`,
              text: generatingMessages[index],
              sender: "assistant",
            },
          ]);
          index++;
        } else {
          clearInterval(interval);
          setMessages((prev) => [
            ...prev,
            {
              id: "complete",
              text: "✔ All questions are ready! You can hover over any question to edit it.",
              sender: "assistant",
            },
          ]);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Clear any existing timeout before setting a new one
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // TODO: replace mock with real API call to backend/LLM QA endpoint
    timeoutRef.current = setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I can help you understand the questions, repository structure, or best practices. What would you like to know?",
        sender: "assistant",
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
      timeoutRef.current = null;
    }, 1000);
  };

  if (minimized) {
    return (
      <div className="w-16 bg-background border-l border-[var(--primary-color)]/20 flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMinimize}
          className="h-10 w-10"
        >
          <Maximize2 className="h-5 w-5 text-[var(--primary-color)]" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-[400px] bg-background border-l border-[var(--primary-color)]/20 flex flex-col">
      <CardHeader className="border-b border-[var(--primary-color)]/20 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[var(--primary-color)]" />
            <div>
              <h3 className="text-xs font-bold text-[var(--primary-color)]">AI Assistant</h3>
              <p className="text-[10px] text-[var(--primary-color)]/70">Ask me anything</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMinimize}
            className="h-8 w-8"
          >
            <Minimize2 className="h-4 w-4 text-[var(--primary-color)]" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-2 text-[10px] ${
                  message.sender === "user"
                    ? "bg-[var(--primary-color)] text-white"
                    : "bg-[var(--accent-color)]/20 text-[var(--primary-color)]"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[var(--accent-color)]/20 rounded-lg p-2">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--primary-color)]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-[var(--primary-color)]/20 p-4">
          <div className="space-y-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask a question about the repository or plan..."
              className="min-h-[60px] text-xs resize-none border-[var(--primary-color)]/20"
            />
            <div className="flex items-center justify-between text-[10px] text-[var(--primary-color)]/70">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="h-8 bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90 text-white"
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </div>
  );
}


