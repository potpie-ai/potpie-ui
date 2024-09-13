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
import { LucideCopy, LucideCopyCheck, LucideRepeat2 } from "lucide-react";
import { useDispatch } from "react-redux";
import { useState } from "react";

interface ChatBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string | any;
  sender: "user" | "agent";
  className?: string;
  isLast?: boolean;
  currentConversationId: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  sender,
  className,
  isLast,
  currentConversationId,
  ...props
}) => {
  const dispatch = useDispatch();
  const [copied, setCopied] = useState(false);

  const extractCode = (message: string) => {
    // @ts-ignore
    const codeMatch = message.match(/```(\w+?)\n(.*?)```/s);
    if (codeMatch) {
      const [, language, code] = codeMatch;
      return { language, code: code.trim() };
    }
    return { language: "", code: "" };
  };

  const removeCode = (message: string) => {
    const codeStartIndex = message.indexOf("```");
    return codeStartIndex !== -1
      ? message.slice(0, codeStartIndex).trim()
      : message;
  };

  const { language, code } = extractCode(message);
  const textWithoutCode = removeCode(message);

  const { refetch: Regenerate } = useQuery({
    queryKey: ["regenerate", currentConversationId],
    queryFn: async () => {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const headers = await getHeaders();
      axios
        .post(
          `${baseUrl}/conversations/${currentConversationId}/regenerate/`,
          {},
          {
            headers: headers,
          }
        )
        .then((res) => {
          if (res.data === "" || res.data === null) {
            throw new Error("No response from server");
          }
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
          return res.data;
        })
        .catch((err) => {
          console.log(err);
          return err.response.data;
        });
    },
    enabled: false,
  });

  const handleCopy = () => {
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
      {textWithoutCode && <p>{textWithoutCode}</p>}

      {sender === "agent" && code && (
        <MyCodeBlock code={code} language={language} />
      )}

      {sender === "agent" && (
        <div className="flex justify-between items-center mt-2">
          {isLast ? (
            <Button
              className="gap-2"
              variant="secondary"
              size="sm"
              onClick={() => Regenerate()}
            >
              <LucideRepeat2 className="size-4" />
            </Button>
          ) : (
            <div></div>
          )}
          {code && (
            <Button
              className="gap-2"
              variant="secondary"
              size="sm"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <LucideCopy className="size-4" />
                  copy
                </>
              ) : (
                <>
                  <LucideCopyCheck className="size-4" />
                  Copied
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatBubble;
