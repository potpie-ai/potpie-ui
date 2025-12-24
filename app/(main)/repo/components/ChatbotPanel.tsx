"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Minimize2, Maximize2, Send, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface MCQQuestion {
  id: string;
  section: string;
  question: string;
  options: string[];
  needsInput: boolean;
  assumed?: string;
  reasoning?: string;
}

interface ChatbotPanelProps {
  projectId: string;
  questions: MCQQuestion[];
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
  projectId,
  questions,
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response (in real implementation, this would call an API)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I can help you understand the questions, repository structure, or best practices. What would you like to know?",
        sender: "assistant",
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  if (minimized) {
    return (
      <div className="w-16 bg-white border-l border-gray-200 flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMinimize}
          className="h-10 w-10"
        >
          <Maximize2 className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col">
      <CardHeader className="border-b border-gray-200 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-semibold">AI Assistant</h3>
              <p className="text-xs text-gray-500">Ask me anything</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMinimize}
            className="h-8 w-8"
          >
            <Minimize2 className="h-4 w-4" />
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
                className={`max-w-[80%] rounded-lg p-2 text-xs ${
                  message.sender === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-200 p-4">
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
              className="min-h-[60px] text-sm resize-none"
            />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="h-8"
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


