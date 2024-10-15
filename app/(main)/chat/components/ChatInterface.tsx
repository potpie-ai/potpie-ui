import React, { useEffect, useRef, useState } from "react";
import ChatBubble from "./chatbubble";

interface ChatInterfaceProps {
  currentConversation: any;
  status: string;
  chatFlow: string;
  fetchingResponse: Boolean;
  onLoadMoreMessages: () => void; 
}

const ChatInterface = ({
  currentConversation,
  status,
  chatFlow,
  fetchingResponse,
  onLoadMoreMessages, 
}: ChatInterfaceProps) => {
  const bottomOfPanel = useRef<HTMLDivElement>(null);
  const upPanelRef = useRef<HTMLDivElement>(null);
  const [isFirstRender, setIsFirstRender] = useState(true);

  useEffect(() => {
    if (bottomOfPanel.current) {
      bottomOfPanel.current.scrollIntoView({ behavior: "smooth" });
    }
    setIsFirstRender(false);
  }, []);

  useEffect(() => {
    if (chatFlow === "EXISTING_CHAT") {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isFirstRender && currentConversation?.start !== 0) {
            onLoadMoreMessages(); 
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
    }
  }, [isFirstRender, chatFlow, currentConversation, onLoadMoreMessages]);

  return (
    <div className="relative w-full h-full flex flex-col items-center mb-5 mt-5 gap-3">
      <div ref={upPanelRef} className="w-full">
        {/* You can put any loading skeleton here */}
      </div>

      {currentConversation &&
        currentConversation.messages.map((message: { citations: any; text: string; sender: "user" | "agent" }, i: number) => (
          <ChatBubble
            key={`${currentConversation.conversationId}-${i}`}
            citations={Array.isArray(message.citations) && Array.isArray(message.citations[0]) ? message.citations.flat() : (message.citations || [])}
            message={message.text}
            sender={message.sender}
            isLast={i === currentConversation.messages.length - 1}
            currentConversationId={currentConversation.conversationId}
          />
        ))}

      {status === "loading"|| fetchingResponse && (
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