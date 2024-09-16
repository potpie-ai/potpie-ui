import ReactMarkdown from "react-markdown";
import getHeaders from "@/app/utils/headers.util";
import MyCodeBlock from "@/components/codeBlock";
import { Button } from "@/components/ui/button";
import {
  addMessageToConversation,
  removeLastMessage,
  setChat,
} from "@/lib/state/Reducers/chat";
import { cn } from "@/lib/utils";
import axios from "axios";
import { LucideRepeat2, RotateCw } from "lucide-react";
import { useDispatch } from "react-redux";
import { useState } from "react";
import { toast } from "sonner";

interface ChatBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
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
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEmptyResponse, setIsEmptyResponse] = useState(false);

  const parseMessage = (message: string) => {
    return [{ type: 'text', content: message, language: 'json' }];
  };

  const parsedSections = parseMessage(message);

  const regenerateMessage = async () => {
    setIsRegenerating(true);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const headers = await getHeaders();
    let accumulatedMessage = "";

    try {
      const response = await fetch(`${baseUrl}/api/v1/conversations/${currentConversationId}/regenerate/`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      dispatch(removeLastMessage({ chatId: currentConversationId }));
      // removed coz it added an empty response in the UI while regen 
      // dispatch(
      //   addMessageToConversation({
      //     chatId: currentConversationId,
      //     message: { sender: "agent", text: "" },
      //   }) 
      // );

      while (true) {
        const { done, value } = await reader?.read() || { done: true, value: undefined };
        if (done) break;

        const chunk = decoder.decode(value);
        const parsedChunks = chunk.split('}').filter(Boolean).map(c => JSON.parse(c + '}'));

        for (const parsedChunk of parsedChunks) {
          accumulatedMessage += parsedChunk.message;
          dispatch(
            addMessageToConversation({
              chatId: currentConversationId,
              message: { sender: "agent", text: accumulatedMessage },
            })
          );
        }
      }

      dispatch(setChat({ status: "active" }));
      setIsEmptyResponse(false);
      setIsRegenerating(false);
      return accumulatedMessage;
    } catch (err) {
      console.log(err);
      dispatch(setChat({ status: "active" }));
      toast.error("Unable to regenerate response");
      setIsRegenerating(false);
      setIsEmptyResponse(true);
      return err;
    }
  };

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
        isStreaming && "animate-pulse",
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

      {isEmptyResponse && (
        <div className="text-red-500 mt-2">
          The response was empty. Please try regenerating the response.
        </div>
      )}

      {sender === "agent" && isLast && !isStreaming && !isRegenerating && (
        <div className="flex justify-end items-center mt-2">
          <Button
            className="gap-2"
            variant="secondary"
            size="sm"
            onClick={regenerateMessage}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <RotateCw className="animate-spin size-4 " />
            ) : (
              <LucideRepeat2 className="size-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ChatBubble;
