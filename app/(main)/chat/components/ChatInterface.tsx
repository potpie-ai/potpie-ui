import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import ChatBubble from "./chatbubble";

const ChatInterface = ({
  currentConversationId,
}: {
  currentConversationId: string;
}) => {
  const { conversations, status } = useSelector(
    (state: RootState) => state.chat
  );
  const currentConversation = conversations.find(
    (c) => c.conversationId === currentConversationId
  );

  return (
    <div className="relative w-full h-full flex flex-col items-center mb-5 mt-5 gap-3">
      {currentConversation &&
        currentConversation.messages.map((message, i) => (
          <ChatBubble
            key={`${currentConversationId}-${i}`}
            message={message.text}
            sender={message.sender}
            isLast={i === currentConversation.messages.length - 1}
            currentConversationId={currentConversationId}
          />
        ))}
      {status === "loading" && (
        <div className="flex items-center space-x-1 mr-auto">
          <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse"></span>
          <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-100"></span>
          <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-200"></span>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
