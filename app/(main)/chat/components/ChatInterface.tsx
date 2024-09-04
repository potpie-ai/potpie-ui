import { auth } from "@/configs/Firebase-config";
import { CreateConversation } from "@/lib/api";
import { RootState } from "@/lib/state/store";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "@/configs/httpInterceptor";
import { addMessageToConversation, changeConversationId, setChat } from "@/lib/state/Reducers/chat";
import ChatBubble from "./chatbubble";

const ChatInterface = () => {
  const userId = auth.currentUser?.uid || "";
  const dispatch = useDispatch();
  const { agentId, projectId, title, conversations, currentConversationId } =
    useSelector((state: RootState) => state.chat);
    const SendMessage = async () => {
      if (conversations && conversations.length >= 1) {
        const response = axios
          .post("/conversations/", {
            user_id: userId,
            title: title,
            status: "active",
            project_ids: [projectId],
            agent_ids: [agentId],
          })
          .then((res) => {
            return res.data;
          })
          .catch((err) => {
            console.log(err);
            return "Unable to create conversation" + err;
          });
        const conversationId = await response;
        dispatch(
          changeConversationId({ oldId: "temp", newId: conversationId.id })
        );
        dispatch(setChat({ currentConversationId: conversationId.id }));
      } else {
        const currentConversation = conversations.find(
          (c) => c.conversationId === currentConversationId
        );
        if (currentConversation) {
          const lastUserMessage = currentConversation.messages.filter(
            (message) => message.sender === "user"
          ).slice(-1)[0];
          
          const response = axios
            .post(`/api/v1/conversations/${currentConversationId}/message/`, {
              content: lastUserMessage.text,
            })
            .then((res) => {
              return res.data;
            })
            .catch((err) => {
              console.log(err);
              return "Unable to send message" + err;
            });
            const message = await response;
            console.log(message);
            dispatch(addMessageToConversation({ conversationId: currentConversationId, message }));
        }
      }
    };
  useEffect(() => {
    console.log("Conversations changed:", conversations);
    SendMessage();
  }, [conversations]);

  return (
    <div className="relative w-full h-full flex flex-col items-center mb-5 mt-5">
      {conversations && conversations.length >= 1 && conversations.find((c) => c.conversationId === currentConversationId)?.messages.map((message) => (
        <ChatBubble
          key={message.id}
          message={message.text}
          sender={message.sender}
        />
      ))}
    </div>
  );
};

export default ChatInterface;
