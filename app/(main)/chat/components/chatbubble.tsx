import ReactMarkdown from "react-markdown";
import getHeaders from "@/app/utils/headers.util";
import MyCodeBlock from "@/components/codeBlock";
import { Button } from "@/components/ui/button";
import {
  addMessageToConversation,
  removeLastMessage,
} from "@/lib/state/Reducers/chat";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { LucideRepeat2 } from "lucide-react";
import { useDispatch } from "react-redux";
import { useState } from "react";
import { toast } from "sonner";
import { languages } from "prismjs";

interface ChatBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string | any;
  sender: "user" | "agent";
  className?: string;
  isLast?: boolean;
  currentConversationId: string;
  isStreaming?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  sender,
  className,
  isLast,
  currentConversationId,
  isStreaming,
  ...props
}) => {
  const dispatch = useDispatch();
  const [copied, setCopied] = useState(false);
  const parseMessage = (message: string) => {
    return [{ type: 'text', content: message, language: 'json' }];
  };

  const parsedSections = parseMessage(message);

  const { refetch: Regenerate } = useQuery({
    queryKey: ["regenerate", currentConversationId],
    queryFn: async () => {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const headers = await getHeaders();
      axios
        .post(
          `${baseUrl}/api/v1/conversations/${currentConversationId}/regenerate/`,
          {},
          {
            headers: headers,
          }
        )
        .then((res) => {
          if (res.data === "" || res.data === "{}" || res.data === null) {
            throw new Error("No response from server");
          } else {
            dispatch(removeLastMessage({ chatId: currentConversationId }));
            dispatch(
              addMessageToConversation({
                chatId: currentConversationId,
                message: {
                  sender: "agent",
                  text: res.data.content,
                },
              })
            );
          }
          return res.data;
        })
        .catch((err) => {
          console.log(err);
          toast.error("Unable to regenerate response");
          return err.response;
        });
    },
    enabled: false,
  });

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "rounded-lg px-4 py-2 max-w-[75%] break-words",
        sender === "user"
          ? "bg-primary text-white ml-auto"
          : "bg-gray-200 text-muted mr-auto",
        className
      )}
      {...props}
    >
      {parsedSections.map((section, index) => {
        if (section.type === 'text') {
          return (
            <ReactMarkdown
              key={index}
              className="markdown"
              components={{
                code: ({ children }) => (
                  <code className="bg-gray-100 text-red-500 rounded px-1 py-0.5">
                    {children}
                  </code>
                ),
              }}
            >
              {section.content}
            </ReactMarkdown>
          );
        } else if (section.type === 'code') {
          return (
            <div key={index} className="my-4">
              <MyCodeBlock code={section.content} language={section.language || "json"} />
            </div>
          );
        }
      })}

      {isStreaming && (
        <div className="flex items-center space-x-1 mt-2">
          <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse"></span>
          <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-100"></span>
          <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-200"></span>
        </div>
      )}

      {sender === "agent" && isLast && !isStreaming && (
        <div className="flex justify-end items-center mt-2">
          <Button
            className="gap-2"
            variant="secondary"
            size="sm"
            onClick={() => Regenerate()}
          >
            <LucideRepeat2 className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default ChatBubble;
