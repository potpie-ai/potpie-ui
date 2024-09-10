import MyCodeBlock from "@/components/codeBlock";
import { cn } from "@/lib/utils";

interface ChatBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string | any;
  sender: "user" | "agent";
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  sender,
  className,
  ...props
}) => {
  const extractCode = (message: string) => {
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
    </div>
  );
};

export default ChatBubble;