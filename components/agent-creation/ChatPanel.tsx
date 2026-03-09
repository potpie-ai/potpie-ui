import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader, Bot, ChevronDown, SendHorizontalIcon } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import Image from "next/image";
import ChatService from "@/services/ChatService";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MyCodeBlock from "@/components/codeBlock";
import { ExternalLinkIcon } from "lucide-react";

interface ChatPanelProps {
  conversationId: string;
  agentId: string;
  agentName: string;
  footerHeight?: number; // Add optional prop for footer height
}

interface Message {
  id: string;
  text: string;
  sender: "user" | "agent";
  citations?: string[];
}

const CustomMarkdown = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      className="markdown-content text-sm [&_p]:!leading-relaxed [&_p]:!my-0.5 [&_li]:!my-0.5 animate-blink"
      components={{
        p: ({ children }) => <p className="text-slate-900">{children}</p>,
        code: ({ children, className }) => {
          const language = className
            ? className.replace("language-", "")
            : "plaintext";

          if (language === "plaintext") {
            return (
              <code className="bg-green-200 rounded text-sm font-medium text-slate-900">
                {children}
              </code>
            );
          }

          return (
            <MyCodeBlock
              code={String(children).replace(/\n$/, "")}
              language={language}
            />
          );
        },
        a: ({ href, children }) => (
          <a
            className="underline inline-flex transition-all text-blue-600 hover:text-blue-800"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
            <ExternalLinkIcon className="h-4 w-4 ml-1" />
          </a>
        ),
      }}
      remarkPlugins={[remarkGfm]}
    >
      {content}
    </ReactMarkdown>
  );
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  conversationId,
  agentId,
  agentName,
  footerHeight = 60, // Default height if not specified
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [lastScrollHeight, setLastScrollHeight] = useState(0);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Check if scroll is at bottom
  const checkIfScrollAtBottom = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 20;
    setIsAtBottom(isBottom);
    setShowScrollButton(!isBottom);

    // Save last position
    setLastScrollTop(scrollTop);
    setLastScrollHeight(scrollHeight);
  }, []);

  // Load initial messages if any
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const loadedMessages = await ChatService.loadMessages(conversationId, 0, 50);
        setMessages(loadedMessages.reverse());
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
    };

    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId]);

  // Setup scroll listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkIfScrollAtBottom);
    return () => container.removeEventListener('scroll', checkIfScrollAtBottom);
  }, [checkIfScrollAtBottom]);

  // Handle scroll position when new messages arrive
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (isLoading) {
      // Don't force scroll while loading, let user control
    } else if (isAtBottom && messages.length > 0) {
      // Only auto-scroll if user was already at bottom
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      });
      setNewMessageCount(0);
    } else if (messages.length > 0) {
      // If not at bottom, just increment new message count
      // but don't manipulate scroll position
      setNewMessageCount(prev => prev + 1);
    }

    // Update scroll height after rendering
    setLastScrollHeight(container.scrollHeight);
  }, [messages, isAtBottom, isLoading]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !conversationId) return;

    // Reset new message counter when user sends a message
    setNewMessageCount(0);

    // Set isAtBottom to true when sending new message
    setIsAtBottom(true);

    // Add user message to UI immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: "user",
    };
    setMessages((prev) => [...prev, userMessage]);

    // Clear input
    const messageToSend = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    try {
      // Prepare temporary agent message for streaming
      const tempAgentMessageId = `temp-${Date.now()}`;
      const tempAgentMessage: Message = {
        id: tempAgentMessageId,
        text: "",
        sender: "agent",
        citations: [],
      };

      setMessages((prev) => [...prev, tempAgentMessage]);

      // Stream the message
      await ChatService.streamMessage(
        conversationId,
        messageToSend,
        [], // No nodes for now
        [], // No images for now
        (messageText, _toolCalls, citations) => {
          // Update the temporary message with streaming content
          setMessages((prevMessages) => {
            return prevMessages.map((msg) => {
              if (msg.id === tempAgentMessageId) {
                return {
                  ...msg,
                  text: messageText,
                  citations: citations,
                };
              }
              return msg;
            });
          });
        }
      );
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pressing Enter to send message
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Message container with padding at bottom to account for fixed footer */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar pb-16"
        onScroll={checkIfScrollAtBottom}
      >
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <Bot className="h-12 w-12 text-primary/50" />
            <div>
              <h3 className="text-lg font-medium">Start chatting with {agentName}</h3>
              <p className="text-sm text-black">Ask anything about your code or project</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex w-full mb-4 ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`inline-block max-w-[85%] rounded-2xl px-5 py-3 text-base shadow-sm ${message.sender === "user"
                  ? "bg-[#E6F0FF] text-blue-900 rounded-tr-sm"
                  : "bg-gray-100 text-gray-800 rounded-tl-sm"
                  }`}
                style={{ wordBreak: "break-word" }}
              >
                {message.sender === "user" ? (
                  <div className="whitespace-pre-wrap">{message.text}</div>
                ) : (
                  <div className="prose prose-sm md:prose-base max-w-none text-gray-800">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-3 rounded-lg bg-muted/30 text-foreground">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-pulse delay-150" />
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-pulse delay-300" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed-height input area at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background flex-none z-10"
        style={{ height: `${footerHeight}px` }}
      >
        <div className="flex items-center h-full space-x-2">
          <Textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={`Ask ${agentName} a question...`}
            className="min-h-[38px] resize-none flex-1"
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="h-[38px] px-4 flex-shrink-0"
          >
            {isLoading ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <SendHorizontalIcon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && newMessageCount > 0 && (
        <button
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            setNewMessageCount(0);
            setIsAtBottom(true);
          }}
          className="absolute bottom-[70px] right-4 bg-primary text-white rounded-full p-2 shadow-lg flex items-center z-20"
        >
          <ChevronDown className="h-4 w-4 mr-1" />
          {newMessageCount} new message{newMessageCount !== 1 && 's'}
        </button>
      )}
    </div>
  );
};