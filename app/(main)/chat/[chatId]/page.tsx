"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import React, { useRef } from "react";
import ChatInterface from "../components/ChatInterface";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import getHeaders from "@/app/utils/headers.util";
import { useDispatch, useSelector } from "react-redux";
import { addMessageToConversation, setChat } from "@/lib/state/Reducers/chat";
import { RootState } from "@/lib/state/store";
import { Plus } from "lucide-react";

const Chat = ({ params }: { params: { chatId: string } }) => {
  const dispatch = useDispatch();
  const { conversations } = useSelector((state: RootState) => state.chat);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  const messageRef = useRef<HTMLTextAreaElement>(null);

  const {
    data: conversationMessages,
    isLoading: conversationMessagesLoading,
    error: conversationMessagesError,
  } = useQuery({
    queryKey: ["chat-messages", params.chatId],
    queryFn: async () => {
      const headers = await getHeaders();
      dispatch(setChat({ currentConversationId: params.chatId }));
      const response = await axios.get(
        `${baseUrl}/conversations/${params.chatId}/messages/`,
        {
          headers: headers,
          params: {
            start: 0,
            limit: 10,
          },
        }
      );
      if (conversations.find((c) => c.conversationId === params.chatId))
        return response.data;
      response.data.map((m: any) =>
        dispatch(
          addMessageToConversation({
            chatId: params.chatId,
            message: {
              sender: m.type === "SYSTEM_GENERATED" ? "agent" : "user",
              text: m.content,
            },
          })
        )
      );
      return response.data;
    },
  });

  const {
    data: chatResponse,
    isLoading: chatResponseLoading,
    error: chatResponseError,
    refetch: refetchChat,
  } = useQuery({
    queryKey: ["new-message", params.chatId],
    queryFn: async () => {
      const headers = await getHeaders();
      if (messageRef.current && messageRef.current.value === "") return;
      const response = await axios.post(
        `${baseUrl}/conversations/${params.chatId}/message/`,
        {
          content: messageRef.current?.value,
        },
        {
          headers: headers,
        }
      );
      dispatch(
        addMessageToConversation({
          chatId: params.chatId,
          message: { sender: "agent", text: response.data },
        })
      );
      dispatch(setChat({ status: "active" }));
      return response.data;
    },
    retry: false,
    enabled: false,
  });

  const handleSubmit = (e: any) => {
    e.preventDefault();
    refetchChat();
    dispatch(
      addMessageToConversation({
        chatId: params.chatId,
        message: { sender: "user", text: messageRef.current?.value || "" },
      })
    );
    dispatch(setChat({ status: "loading" }));

    if (messageRef.current) messageRef.current.value = "";
  };

  return (
    <div className="relative flex h-full min-h-[50vh] flex-col rounded-xl p-4 lg:col-span-2 ">
      <ChatInterface currentConversationId={params.chatId} />
      <div className="flex-1" />
      <form
        className={`relative mb-4 mx-16 overflow-hidden rounded-lg bg-card focus-within:ring-1 focus-within:ring-ring border border-border shadow-md flex flex-col `}
        onSubmit={handleSubmit}
      >
        <Label htmlFor="message" className="sr-only">
          Message
        </Label>
        <Textarea
          ref={messageRef}
          id="message"
          placeholder="Start chatting with the expert...."
          className="min-h-12 h-[50%] text-base resize-none border-0 p-3 px-7 shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center p-3 pt-0 ">
          <Tooltip>
            <TooltipTrigger asChild className="mx-2 !bg-transparent">
              <Button variant="ghost" size="icon">
                <Plus className="border-primary rounded-full border-2" />
                <span className="sr-only">Share File</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Share File</TooltipContent>
          </Tooltip>
          <Button type="submit" size="sm" className="ml-auto !bg-transparent">
            <Image
              src={"/images/sendmsg.svg"}
              alt="logo"
              width={20}
              height={20}
            />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
