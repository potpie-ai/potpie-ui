import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import ChatBubble from "./chatbubble";
import { Skeleton } from "@/components/ui/skeleton";
import { addOlderMessages, setStart } from "@/lib/state/Reducers/chat";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { useQuery } from "@tanstack/react-query";

const ChatInterface = ({
  currentConversationId,
}: {
  currentConversationId: string;
}) => {
  const { conversations, status } = useSelector(
    (state: RootState) => state.chat
  );
  const dispatch = useDispatch();

  const bottomOfPanel = useRef<HTMLDivElement>(null);
  const upPanelRef = useRef<HTMLDivElement>(null);
  const currentConversation = conversations.find(
    (c) => c.conversationId === currentConversationId
  );

  const { refetch: refetchMessages } = useQuery({
    queryKey: ["chat-messages-refetch", currentConversationId],
    queryFn: async () => {
      const headers = await getHeaders();
      const conversation = conversations.find(
        (c) => c.conversationId === currentConversationId
      );
      const start = conversation?.start || 0;

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${currentConversationId}/messages/`,
        {
          headers: headers,
          params: {
            start,
            limit: 10,
          },
        }
      );
      dispatch(
        addOlderMessages({
          chatId: currentConversationId,
          messages: response.data
        })
      );
      return response.data;
    },
    enabled: false,
  });

  useEffect(() => {
    if (bottomOfPanel.current) {
      bottomOfPanel.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const conversation = conversations.find(
            (c) => c.conversationId === currentConversationId
          );
          const start = conversation?.start || 0;
          dispatch(
            setStart({ chatId: currentConversationId, start: start - 10 })
          );
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
      {conversations.find((c) => c.conversationId === currentConversationId)
        ?.start !== 0 && (
        <div ref={upPanelRef} className="w-full">
          <Skeleton className="w-full h-10" />
        </div>
      )}

      {currentConversation &&
        currentConversation.messages.map((message, i) => (
          <ChatBubble
            key={`${currentConversationId}-${i}`}
            citations={message.citations}
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
