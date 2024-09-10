import { AppDispatch, RootState } from "@/lib/state/store";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { agentRespond, chatHistory } from "@/lib/state/Reducers/chat";
import ChatBubble from "./chatbubble";

const ChatInterface = ({
  currentConversationId,
}: {
  currentConversationId: string;
}) => {
  const dispatch: AppDispatch = useDispatch();
  const { conversations, status } = useSelector(
    (state: RootState) => state.chat
  );


  useEffect(() => {
    if (currentConversationId) dispatch(chatHistory({ chatId: currentConversationId }));
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center mb-5 mt-5 gap-3">
      {conversations &&
        conversations.length >= 1 &&
        conversations
          .find((c) => c.conversationId === currentConversationId)
          ?.messages.map((message, i) => (
            <ChatBubble
              key={i}
              message={message.text}
              sender={message?.sender}
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
