import ReactMarkdown from "react-markdown";
import MyCodeBlock from "@/components/codeBlock";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideRepeat2, RotateCw, Github } from "lucide-react"; 
import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import { AppDispatch, RootState } from "@/lib/state/store";
import Link from "next/link";
import { increaseTotalHumanMessages } from "@/lib/state/Reducers/User";

interface ChatBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
  sender: "user" | "agent";
  citations: string[] | any;
  className?: string;
  isLast?: boolean;
  currentConversationId: string;
  isStreaming?: boolean;
  userImage?: string | null;
  agentImage?: string;
  onRegenerate?: (newMessage?: string) => void;
  fetchingResponse?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message: initialMessage,
  sender,
  citations: initialCitations = [],
  className,
  isLast,
  currentConversationId,
  isStreaming,
  userImage,
  fetchingResponse,
  onRegenerate,
  ...props
}) => {
  const { user } = useAuthContext();
  const [isEmptyResponse, setIsEmptyResponse] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { temporaryContext, selectedNodes } = useSelector(
    (state: RootState) => state.chat
  );
  const dispatch: AppDispatch = useDispatch();

  const agentImage = "/images/potpie-blue.svg";

  const parseMessage = (message: string) => {
    if (message == undefined) {
      return;
    }
    const sections = [];
    let lastIndex = 0;
    let inCodeBlock = false;
    let currentLanguage = '';
    let currentCode = '';
    
    const lines = message.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const codeBlockMatch = line.match(/^```(\w+)?$/);
      
      if (codeBlockMatch) {
        if (!inCodeBlock) {
          // Start of code block
          if (lastIndex < i) {
            // Add text section before code block
            sections.push({
              type: "text",
              content: lines.slice(lastIndex, i).join('\n')
            });
          }
          inCodeBlock = true;
          currentLanguage = codeBlockMatch[1] || '';
          currentCode = '';
          lastIndex = i + 1;
        } else {
          // End of code block
          sections.push({
            type: "code",
            content: currentCode.trim(),
            language: currentLanguage
          });
          inCodeBlock = false;
          lastIndex = i + 1;
        }
      } else if (inCodeBlock) {
        currentCode += line + '\n';
      }
    }

    if (lastIndex < lines.length) {
      sections.push({
        type: "text",
        content: lines.slice(lastIndex).join('\n')
      });
    }

    return sections;
  };

  const parsedSections = parseMessage(initialMessage);

  const regenerateMessage = async () => {
    try {
      setIsRegenerating(true);
      setIsEmptyResponse(false);

      // Call the parent's onRegenerate with the new message
      onRegenerate?.(initialMessage);
      
      dispatch(increaseTotalHumanMessages(1))
    } catch (err) {
      console.error(err);
      toast.error("Unable to regenerate response");
      setIsEmptyResponse(true);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div
      className={`flex items-start ${sender === "user" ? "justify-end" : "justify-start"} w-full`}
    >
      {/* Agent Image on the Left */}
      {sender === "agent" && (
        <img
          src={agentImage}
          alt="Agent"
          className="w-9 h-9 rounded-full object-cover bg-background mr-2"
        />
      )}

      {/* Chat Bubble */}
      <div
        className={cn(
          "rounded-lg px-4 py-2 break-words text-sm overflow-hidden whitespace-pre-wrap break-all",
          sender === "user"
            ? "bg-[#f7e6e6] text-white ml-2 max-w-[75%]"
            : "bg-[#edecf4] text-muted mr-2 max-w-[75%]",
          isStreaming && !initialMessage && "animate-pulse",
          className
        )}
        {...props}
      >
        {/* Citations Section */}
        {sender === "agent" && initialCitations && initialCitations.length > 0 && (
          <div className="mb-2">
            {initialCitations?.map((citation: string, index: number) => {
              const displayText = citation?.length > 30 ? citation.split("/").pop() : citation; // Display last part if long

              return (
                <div
                  key={index}
                  className="bg-gray-200 mb-2 rounded-md flex flex-col items-start w-full gap-2"
                >
                  <div className="flex justify-between w-full">
                    <Link
                      href={`https://github.com/${temporaryContext.repo}/blob/${temporaryContext.branch}/${citation.split("/").pop()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-green-700 hover:underline flex-grow"
                      style={{ wordBreak: "break-all" }}
                    >
                      <Github className="w-4 h-4" />
                      <span className="mx-2">{displayText}</span>
                    </Link>
                    <div className="flex items-center space-x-2 ml-auto">
                      <code className="bg-gray-100 text-red-400 rounded px-1 text-sm font-bold">
                        {temporaryContext.branch}
                      </code>
                      <code className="bg-gray-100 text-red-400 rounded px-1 text-sm font-bold">
                        {temporaryContext.repo}
                      </code>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Message Content */}
        {parsedSections?.map((section, index) => (
          <div key={index}>
            {section.type === "text" && (
              <ReactMarkdown
                className="markdown-content"
                components={{
                  code: ({ children }) => (
                    <code className="bg-gray-100 text-red-500 rounded px-1 py-0.5 text-sm font-bold">
                      {children}
                    </code>
                  ),
                }}
              >
                {section.content}
              </ReactMarkdown>
            )}
            {section.type === "code" && (
              <div className="pb-4">
                <MyCodeBlock
                  code={section.content}
                  language={section.language || "json"}
                />
              </div>
            )}
          </div>
        ))}

        {/* Loader */}
        {fetchingResponse && sender === "agent" && (
          <div className="flex items-center space-x-1 mt-2">
            <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse"></span>
            <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-100"></span>
            <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-200"></span>
          </div>
        )}

        {/* Empty Response Error */}
        {isEmptyResponse && (
          <div className="text-red-500 mt-2">
            The response was empty. Please try regenerating the response.
          </div>
        )}

        {/* Regenerate Button */}
        {sender === "agent" && isLast && !isStreaming && (
          <div className="flex justify-end items-center mt-2">
            <Button
              className="gap-2"
              variant="secondary"
              size="sm"
              onClick={regenerateMessage}
              disabled={isRegenerating || fetchingResponse}
            >
              {isRegenerating ? (
                <>
                  <RotateCw className="animate-spin size-4" />
                  Regenerating...
                </>
              ) : (
                <>
                  <LucideRepeat2 className="size-4" />
                  Regenerate
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* User Image on the Right */}
      {sender === "user" && (
        <img
          src={userImage || user.photoURL}
          alt="User"
          className="w-9 h-9 rounded-full object-cover ml-2"
        />
      )}
    </div>
  );
};

export default ChatBubble;