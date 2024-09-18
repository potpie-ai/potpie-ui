"use client"
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import React, { useRef, FormEvent, useState, useEffect, KeyboardEvent } from "react";
import ChatInterface from "../components/ChatInterface";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addMessageToConversation, setChat } from "@/lib/state/Reducers/chat";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import getHeaders from "@/app/utils/headers.util";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import { Plus, X } from "lucide-react";

const Chat = ({ params }: { params: { chatId: string } }) => {
  const dispatch = useDispatch();
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const nodeInputRef = useRef<HTMLDivElement>(null);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const { conversations,projectId } = useSelector((state: RootState) => state.chat);

  const [isNodeInputVisible, setIsNodeInputVisible] = useState(false);
  const [nodeInput, setNodeInput] = useState("");
  const [nodeOptions, setNodeOptions] = useState<any[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<any[]>([]);

  const fetchNodes = async (query: string) => {
    const headers = await getHeaders();
    const response = await axios.post(
      `${baseUrl}/api/v1/search`,
      {
        project_id: projectId,
        query: query,
      },
      { headers }
    );
    setNodeOptions(response.data.results); 
  };

  const handleNodeSelect = (node: any) => {
    console.log("Node selected:", node); 
    if (!selectedNodes.some((n) => n.node_id === node.node_id)) {
      setSelectedNodes([...selectedNodes, node]); 
    }
    setNodeInput(""); 
    setIsNodeInputVisible(false); 
  };

  const handleNodeRemove = (node: any) => {
    setSelectedNodes(selectedNodes.filter((n) => n.node_id !== node.node_id));
  };

  const handleNodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNodeInput(value);
    if (value.trim()) {
      fetchNodes(value); 
    } else {
      setNodeOptions([]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nodeInputRef.current && !nodeInputRef.current.contains(event.target as Node)) {
        setTimeout(() => setIsNodeInputVisible(false), 100); 
      }
    };
    if (isNodeInputVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
  
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNodeInputVisible]);

  const sendMessage = async (content: string) => {
    const headers = await getHeaders();
    const response = await fetch(`${baseUrl}/api/v1/conversations/${params.chatId}/message/`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, nodeIds:nodeOptions }),
    });

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
      const parsedChunks = chunk.split('}').filter(Boolean).map(c => JSON.parse(c + '}'));
      
      for (const parsedChunk of parsedChunks) {
        accumulatedMessage += parsedChunk.message;
      }
    }

    // Update the message once the entire response is received
    dispatch(
      addMessageToConversation({
        chatId: params.chatId,
        message: { sender: "agent", text: accumulatedMessage },
      })
    );

    dispatch(setChat({ status: "active" }));
    return accumulatedMessage;
  };

  const messageMutation = useMutation({
    mutationFn: sendMessage,
    onMutate: (content) => {
      dispatch(setChat({ status: "loading" }));
      dispatch(
        addMessageToConversation({
          chatId: params.chatId,
          message: { sender: "user", text: content },
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

    messageMutation.mutate(content);
    if (messageRef.current) messageRef.current.value = "";
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  return (
    <div className="flex h-full min-h-[50vh] flex-col rounded-xl px-4 lg:col-span-2 -mb-6">
      <ChatInterface currentConversationId={params.chatId} />
      <form
        className="sticky bottom-6 overflow-hidden rounded-lg bg-card focus-within:ring-1 focus-within:ring-ring border border-border shadow-md flex flex-col"
        onSubmit={handleSubmit}
      >
        <div className="flex items-center p-2 pl-4" ref={nodeInputRef}>
          {selectedNodes.map((node) => (
            <div
              key={node.node_id}
              className="flex items-center space-x-2 bg-gray-200 p-1 rounded-lg mr-2"
            >
              <span>{node.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-white"
                onClick={() => handleNodeRemove(node)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {isNodeInputVisible ? (
            <input
              type="text"
              value={nodeInput}
              onChange={handleNodeInputChange}
              className="border border-border p-1 rounded"
              placeholder="Search for nodes..."
            />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-transparent"
              onClick={() => setIsNodeInputVisible(true)}
            >
              <Plus className="border-primary rounded-full border-2" />
              <span className="sr-only">Add Node</span>
            </Button>
          )}
        </div>

        <Label htmlFor="message" className="sr-only">
          Message
        </Label>
        <Textarea
          ref={messageRef}
          id="message"
          placeholder="Start chatting with the expert...."
          className="min-h-12 h-[50%] text-base resize-none border-0 p-3 px-7 shadow-none focus-visible:ring-0"
          onKeyPress={handleKeyPress}
        />
        <div className="flex items-center p-3 pt-0 ">
          <Button type="submit" size="sm" className="ml-auto !bg-transparent mb-1">
            <Image
              src={"/images/sendmsg.svg"}
              alt="logo"
              width={20}
              height={20}
            />
          </Button>
        </div>
      </form>

      {isNodeInputVisible && nodeInput && nodeOptions.length > 0 && (
        <div className="absolute bottom-40 w-[50%] left-80 right-4 bg-white border border-gray-300 rounded-lg p-2 shadow-lg max-h-40 overflow-y-auto z-50">
          <ul>
            {nodeOptions.map((node) => (
              <li
                key={node.node_id}
                className="cursor-pointer p-1 hover:bg-gray-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNodeSelect(node);
                }}
              >
                <div className="font-semibold">{node.name}</div>
                <div className="text-sm text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">{node.file_path}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="h-6 w-full bg-background sticky bottom-0"></div>
    </div>
  );
};

export default Chat;