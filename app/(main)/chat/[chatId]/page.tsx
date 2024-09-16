"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import React, { useRef, FormEvent } from "react";
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

  const queryClient = useQueryClient();

  const messageMutation = useMutation({
    mutationFn: async (content: string) => {
      const headers = await getHeaders();
      return axios.post(
        `${baseUrl}/api/v1/conversations/${params.chatId}/message/`,
        { content },
        { headers }
      );
    },
    onSuccess: (response) => {
      dispatch(
        addMessageToConversation({
          chatId: params.chatId,
          message: { sender: "agent", text: response.data },
        })
      );
      dispatch(setChat({ status: "active" }));
      queryClient.invalidateQueries({ queryKey: ["chat-messages", params.chatId] });
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      dispatch(setChat({ status: "error" }));
    },
  });

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
        `${baseUrl}/api/v1/conversations/${params.chatId}/messages/`,
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
              sender: m.type !== "HUMAN" ? "agent" : "user",
              text: m.content,
            },
          })
        )
      );
      dispatch(setChat({ status: "active" }));
      return response.data;
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const content = messageRef.current?.value;
    if (!content || content === "") return;

    dispatch(setChat({ status: "loading" }));
    messageMutation.mutate(content);
    dispatch(
      addMessageToConversation({
        chatId: params.chatId,
        message: { sender: "user", text: content },
      })
    );
    if (messageRef.current) messageRef.current.value = "";
  };

  return (
    <div className="flex h-full min-h-[50vh] flex-col rounded-xl px-4 lg:col-span-2 -mb-6">
      <ChatInterface currentConversationId={params.chatId} />
      <form
        className={`sticky bottom-6 overflow-hidden rounded-lg bg-card focus-within:ring-1 focus-within:ring-ring border border-border shadow-md flex flex-col `}
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
      <div className="h-6 w-full bg-background sticky bottom-0"></div>
    </div>
  );
};

export default Chat;
