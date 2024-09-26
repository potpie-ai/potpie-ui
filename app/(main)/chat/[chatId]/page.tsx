"use client";
import React, { useEffect, useRef } from "react";
import ChatInterface from "../components/ChatInterface";
import { useDispatch } from "react-redux";
import { RootState } from "@/lib/state/store";
import { useSelector } from "react-redux";
import {
  clearChat,
  clearPendingMessage,
  setChat,
  addMessageToConversation,
  setStart,
  setTotalMessages,
} from "@/lib/state/Reducers/chat";
import { useMutation, useQuery } from "@tanstack/react-query";
import getHeaders from "@/app/utils/headers.util";
import NodeSelectorForm from "@/components/NodeSelectorChatForm/NodeSelector";
import axios from "axios";

interface SendMessageArgs {
  message: string;
  selectedNodes: any[];
}

const Chat = ({ params }: { params: { chatId: string } }) => {
  const dispatch = useDispatch();
  const { pendingMessage, projectId, selectedNodes, conversations } = useSelector(
    (state: RootState) => state.chat
  );

  const pendingMessageSent = useRef(false);

  /*
  This function is to send a message.
  */
  const sendMessage = async ({ message, selectedNodes }: SendMessageArgs) => {
    const headers = await getHeaders();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${params.chatId}/message/`,
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: message, node_ids: selectedNodes }),
      }
    );

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let accumulatedMessage = "";
    let accumulatedCitation = "";

    while (true) {
      const { done, value } = (await reader?.read()) || {
        done: true,
        value: undefined,
      };
      if (done) break;

      const chunk = decoder.decode(value);
      try {
        const parsedChunks = chunk
          .split("}")
          .filter(Boolean)
          .map((c) => JSON.parse(c + "}")); // Ensure that chunks are closed properly

        for (const parsedChunk of parsedChunks) {
          accumulatedMessage += parsedChunk.message;
          accumulatedCitation = parsedChunk.citations
        }
      } catch (error) {
        // TODO: Implement this later
      }
    }
    dispatch(
      addMessageToConversation({
        chatId: params.chatId,
        message: {
          sender: "agent",
          text: accumulatedMessage,
          citations: [accumulatedCitation],
        },
      })
    );

    dispatch(setChat({ status: "active" }));
    return accumulatedMessage;
  };

  /*
  This mutation hook handles the process of sending messages.
  */
  const messageMutation = useMutation({
    mutationFn: sendMessage,
    onMutate: ({ message }) => {
      dispatch(setChat({ status: "loading" }));
      dispatch(
        addMessageToConversation({
          chatId: params.chatId,
          message: { sender: "user", text: message },
        })
      );
    },
    onSuccess: () => {
      dispatch(setChat({ status: "active" }));
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      dispatch(setChat({ status: "error" }));
    },
  });

  /*
  Query to fetch total messages for the conversation.
  */
  const { isLoading: isLoadingTotalMessages } = useQuery({
    queryKey: ["total-messages", params.chatId],
    queryFn: async () => {
      const headers = await getHeaders();
      const response = await axios
        .get(
          `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${params.chatId}/info/`,
          {
            headers: headers,
          }
        )
        .then((res) => {
          const totalMessages = res.data.total_messages;

          if (totalMessages > 0) {
            dispatch(
              setStart({
                chatId: params.chatId,
                start: totalMessages - 10 > 0 ? totalMessages - 10 : 0,
              })
            );
            dispatch(setTotalMessages({ chatId: params.chatId, totalMessages })); 
          }
          return totalMessages;
        })
        .catch((error) => {
          console.log(error);
          dispatch(setChat({ status: "error" }));
        });

      return response.data.total_messages;
    },
  });

  /*
  Query to fetch paginated messages from the conversation.
  */
  const { refetch: refetchMessages } = useQuery({
    queryKey: ["chat-messages", params.chatId],
    queryFn: async () => {
      const headers = await getHeaders();
      const conversation = conversations.find(
        (c) => c.conversationId === params.chatId
      );
      const start = conversation?.start || 0;

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${params.chatId}/messages/`,
        {
          headers: headers,
          params: {
            start,
            limit: 10,
          },
        }
      );
      // dispatch(clearChat());
      response.data.forEach((message: any) => {
        dispatch(
          addMessageToConversation({
            chatId: params.chatId,
            message: {
              sender: message.type !== "HUMAN" ? "agent" : "user",
              text: message.content,
            },
          })
        );
      });

      if (pendingMessage) {
        dispatch(
          addMessageToConversation({
            chatId: params.chatId,
            message: {
              sender: "user",
              text: pendingMessage,
            },
          })
        );
        dispatch(setChat({ status: "loading" }));
        dispatch(clearPendingMessage());
      }

      dispatch(setChat({ status: "active" }));
      return response.data;
    },
    refetchOnWindowFocus: false,
    enabled: !isLoadingTotalMessages,
  });

  /*
  Send pending message if present.
  */
  useEffect(() => {
    if (pendingMessage && !pendingMessageSent.current) {
      try {
        messageMutation.mutate({ message: pendingMessage, selectedNodes: [] });
        pendingMessageSent.current = true;
      } catch (error) {
        console.error("Error sending pending message:", error);
      }
    }
  }, [params.chatId, pendingMessage]);

  /*
  Handles form submission from the chat interface.
  */
  const handleFormSubmit = (message: string) => {
    messageMutation.mutate({ message, selectedNodes: selectedNodes });
  };

  return (
    <div className="flex h-full min-h-[50vh] flex-col rounded-xl px-4 lg:col-span-2 -mb-6">
      <ChatInterface currentConversationId={params.chatId} />
      <NodeSelectorForm
        projectId={projectId}
        onSubmit={handleFormSubmit}
        disabled={false}
      />
      <div className="h-6 w-full bg-background sticky bottom-0"></div>
    </div>
  );
};

export default Chat;
