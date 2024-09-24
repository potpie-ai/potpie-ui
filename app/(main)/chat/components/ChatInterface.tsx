import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import ChatBubble from "./chatbubble";
import { Skeleton } from "@/components/ui/skeleton";

const ChatInterface = ({
  currentConversationId,
  refetchMessages
}: {
  currentConversationId: string;
  refetchMessages: () => void;
}) => {
  const { conversations, status } = useSelector(
    (state: RootState) => state.chat
  );

  const bottomOfPanel = useRef<HTMLDivElement>(null);
  const upPanelRef = useRef<HTMLDivElement>(null);

  const currentConversation = conversations.find(
    (c) => c.conversationId === currentConversationId
  );

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (bottomOfPanel.current) {
      bottomOfPanel.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentConversation]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          refetchMessages();
        }
      });
    });

    if (upPanelRef.current) {
      observer.observe(upPanelRef.current);
    }

    return () => {
      if (upPanelRef.current) {
        observer.unobserve(upPanelRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center mb-5 mt-5 gap-3">
      <div ref={upPanelRef} className="w-full">
        <Skeleton className="w-full h-10" />
      </div>

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

      <div ref={bottomOfPanel} />
    </div>
  );
};

export default ChatInterface;
