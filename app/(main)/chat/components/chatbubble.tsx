import { cn } from "@/lib/utils";

interface ChatBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
  sender: "user" | "agent";
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  sender,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "rounded-lg px-4 py-2 max-w-[75%] break-words",
        sender === "user"
          ? "bg-blue-500 text-white ml-auto"
          : "bg-gray-200 text-gray-800 mr-auto"
      )}
      {...props}
    >
      {message}
    </div>
  );
};  

export default ChatBubble;