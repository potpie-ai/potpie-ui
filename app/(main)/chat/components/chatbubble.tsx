import ReactMarkdown from "react-markdown";
import getHeaders from "@/app/utils/headers.util";
import MyCodeBlock from "@/components/codeBlock";
import { Button } from "@/components/ui/button";
import { addMessageToConversation, setChat } from "@/lib/state/Reducers/chat";
import { cn } from "@/lib/utils";
import { LucideRepeat2, RotateCw } from "lucide-react";
import { useDispatch } from "react-redux";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";

interface ChatBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
  sender: "user" | "agent";
  className?: string;
  isLast?: boolean;
  currentConversationId: string;
  isStreaming?: boolean;
  userImage?: string;
  agentImage?: string;
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
  const { user } = useAuthContext();
  const dispatch = useDispatch();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEmptyResponse, setIsEmptyResponse] = useState(false);

  const userImage = user.photoUrl;
  const agentImage = "/images/logo.svg";
  const parseMessage = (message: string) => {
    const sections = [];
    const codeRegex = /```(\w+?)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeRegex.exec(message)) !== null) {
      if (match.index > lastIndex) {
        sections.push({ type: "text", content: message.slice(lastIndex, match.index) });
      }
      sections.push({ type: "code", content: match[2], language: match[1] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < message.length) {
      sections.push({ type: "text", content: message.slice(lastIndex) });
    }

    return sections;
  };

  const parsedSections = parseMessage(message);

  const regenerateMessage = async () => {
    setIsRegenerating(true);
    const headers = await getHeaders();
    let accumulatedMessage = "";

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${currentConversationId}/regenerate/`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedMessage = "";

      while (true) {
        const { done, value } = (await reader?.read()) || { done: true, value: undefined };
        if (done) break;

        const chunk = decoder.decode(value);
        const parsedChunks = chunk
          .split("}")
          .filter(Boolean)
          .map((c) => JSON.parse(c + "}"));

        for (const parsedChunk of parsedChunks) {
          accumulatedMessage += parsedChunk.message;
        }
      }

      dispatch(
        addMessageToConversation({
          chatId: currentConversationId,
          message: { sender: "agent", text: accumulatedMessage },
        })
      );

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

  return (
    <div className={`flex items-start ${sender === "user" ? "justify-end" : "justify-start"} w-full`}>
      {/* Agent Image on the Left */}
      {sender === "agent" && (
        <img src={agentImage} alt="Agent" className="w-9 h-9 rounded-full object-contain bg-background mr-2" />
      )}

      {/* Chat Bubble */}
      <div
        className={cn(
          "rounded-lg px-4 py-2 max-w-[75%] break-words text-sm",
          sender === "user"
            ? "bg-primary text-white ml-2"
            : "bg-gray-200 text-muted mr-2",
          isStreaming && "animate-pulse",
          className
        )}
        {...props}
      >
        {parsedSections.map((section, index) => (
          <div key={index}>
            {section.type === "text" && (
              <ReactMarkdown
                className="markdown"
                components={{
                  code: ({ children }) => (
                    <code className="bg-gray-100 text-red-500 rounded px-1 py-0.5 text-sm">
                      {children}
                    </code>
                  ),
                }}
              >
                {section.content}
              </ReactMarkdown>
            )}
            {section.type === "code" && (
              <MyCodeBlock code={section.content} language={section.language || "json"} />
            )}
          </div>
        ))}

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

      {/* User Image on the Right */}
      {sender === "user" && (
        <img src={user.photoURL} alt="User" className="w-9 h-9 rounded-full object-cover ml-2" />
      )}
    </div>
  );
};

export default ChatBubble;