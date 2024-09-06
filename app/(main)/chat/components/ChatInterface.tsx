import { auth } from "@/configs/Firebase-config";
import { RootState } from "@/lib/state/store";
import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "@/configs/httpInterceptor";
import {
  addMessageToConversation,
  agentRespond,
  changeConversationId,
  setChat,
} from "@/lib/state/Reducers/chat";
import ChatBubble from "./chatbubble";

const ChatInterface = () => {
  const userId = auth.currentUser?.uid || "";
  const dispatch = useDispatch();
  const { agentId, projectId, title, conversations, currentConversationId } =
    useSelector((state: RootState) => state.chat);
  const hasSentMessage = useRef(false);

  const SendMessage = async () => {
    if (conversations && conversations.length === 1) {
      const response = await axios
        .post("/conversations/", {
          user_id: userId,
          title: title,
          status: "active",
          project_ids: [projectId],
          agent_ids: [agentId],
        })
        .then((res) => {
          dispatch(
            changeConversationId({
              oldId: "temp",
              newId: res.data.conversation_id,
            })
          );
          dispatch(agentRespond({}));
          return res.data;
        })
        .catch((err) => {
          console.log(err);
          return { error: "Unable to create conversation: " + err.message };
        });

      if (response.error) {
        console.error(response.error);
      }
    } else {
      const currentConversation = conversations.find(
        (c) => c.conversationId === currentConversationId
      );
      const lastUserMessage = currentConversation?.messages.slice(-1)[0];
      if (lastUserMessage?.sender !== "agent") dispatch(agentRespond({}));
    }
  };

  useEffect(() => {
    hasSentMessage.current = false;
    SendMessage();
  }, [conversations]);

  return (
    <div className="relative w-full h-full flex flex-col items-center mb-5 mt-5 gap-3">
      {conversations &&
        conversations.length >= 1 &&
        conversations
          .find((c) => c.conversationId === currentConversationId)
          ?.messages.map((message, i) => (
            <ChatBubble
              key={i}
              message={message?.sender ? message.text : message}
              sender={message?.sender}
            />
          ))}
    </div>
  );
};

export default ChatInterface;
