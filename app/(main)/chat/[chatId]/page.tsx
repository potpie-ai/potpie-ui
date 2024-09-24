"use client";
import React, { useEffect, useRef } from "react";
import ChatInterface from "../components/ChatInterface";
import { useDispatch } from "react-redux";
import { RootState } from "@/lib/state/store";
import { useSelector } from "react-redux";
import { clearChat, clearPendingMessage, setChat, addMessageToConversation } from "@/lib/state/Reducers/chat";
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
  const { pendingMessage, projectId } = useSelector(
    (state: RootState) => state.chat
  );

  const pendingMessageSent = useRef(false);

  /*
  This Function is to send message
  */
  const sendMessage = async ({ message, selectedNodes }: SendMessageArgs) => {
    const headers = await getHeaders();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${params.chatId}/message/`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: message, nodeIds: selectedNodes.map(node => node.node_id) }),
      }
    );

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let accumulatedMessage = "";

    while (true) {
      const { done, value } = await reader?.read() || { done: true, value: undefined };
      if (done) break;

      const chunk = decoder.decode(value);
      try {
        const parsedChunks = chunk
          .split('}')
          .filter(Boolean)
          .map((c) => JSON.parse(c + '}')); // Ensure that chunks are closed properly

        for (const parsedChunk of parsedChunks) {
          accumulatedMessage += parsedChunk.message;
        }
      } catch (error) {
        //TODO: Implement this later
      }
    }

    dispatch(
      addMessageToConversation({
        chatId: params.chatId,
        message: { sender: "agent", text: accumulatedMessage },
      })
    );

    dispatch(setChat({ status: "active" }));
    return accumulatedMessage;
  };

  /*
  This mutation hook is used to handle the process of sending messages.
  It triggers the `sendMessage` function and updates the chat state accordingly.
  - `onMutate`: Dispatches the chat status to "loading" and adds the user's message to the conversation.
  - `onSuccess`: Sets the chat status to "active" after successfully sending the message.
  - `onError`: Handles any errors that occur while sending the message and sets the chat status to "error".
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
  Query to fetch messages for the conversation.
  - `queryKey`: The key that uniquely identifies the query (chat-messages).
  - `queryFn`: Fetches chat messages from the conversation API and updates the chat state.
  - Messages are loaded in batches (start=0, limit=100), and the current chat is cleared before new messages are loaded.
  */
  const { refetch: refetchMessages } = useQuery({
    queryKey: ["chat-messages", params.chatId],
    queryFn: async () => {
      const headers = await getHeaders();
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${params.chatId}/messages/`,
        {
          headers: headers,
          params: {
            start: 0,
            limit: 100,
          },
        }
      );
      // Clear the current chat before loading new messages
      dispatch(clearChat());
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
        addMessageToConversation({
          chatId: params.chatId,
          message: {
            sender: "user",
            text: pendingMessage,
          },
        })
        dispatch(setChat({ status: "loading" }));
        dispatch(clearPendingMessage());
        return response.data;
      }
      dispatch(setChat({ status: "active" }));
      return response.data;
    },
  });

  /*
  This `useEffect` hook checks if there is any pending message when the chat ID changes.
  If a pending message exists and hasn't been sent yet, it triggers the mutation to send the message.
  The `pendingMessageSent` flag ensures that the pending message is only sent once.
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
  This function handles form submission in the chat interface.
  It triggers the `messageMutation` to send the message along with any selected nodes.
  */
  const handleFormSubmit = (message: string, selectedNodes: any[]) => {
    messageMutation.mutate({ message, selectedNodes });
  };

  return (
    <div className="flex h-full min-h-[50vh] flex-col rounded-xl px-4 lg:col-span-2 -mb-6">
      <ChatInterface currentConversationId={params.chatId} />
      <NodeSelectorForm projectId={projectId} onSubmit={handleFormSubmit} disabled={false} />
      <div className="h-6 w-full bg-background sticky bottom-0"></div>
    </div>
  );
};

export default Chat;