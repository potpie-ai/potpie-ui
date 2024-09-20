"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  X,
} from "lucide-react";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/state/store";
import { addMessageToConversation, setChat } from "@/lib/state/Reducers/chat";
import { useState, FormEvent, KeyboardEvent, useEffect, useRef } from "react";
import { Label } from "@radix-ui/react-label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import Step1 from "./components/step1";
import Step2 from "./components/step2";


const NewChat = () => {
  const router = useRouter();
  const dispatch: AppDispatch = useDispatch();
  const queryClient = useQueryClient();
  const { chatStep, currentConversationId, projectId } = useSelector(
    (state: RootState) => state.chat
  );
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  const [message, setMessage] = useState("");

  const sendMessage = async (content: string) => {
    const headers = await getHeaders();
    const response = await fetch(`${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${currentConversationId}/message/`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
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
        chatId: currentConversationId,
        message: { sender: "agent", text: accumulatedMessage },
      })
    );

    dispatch(setChat({ status: "active" }));
    return accumulatedMessage;
  };

  const { mutate: sendMessageMutation, isPending: isSending } = useMutation({
    mutationFn: sendMessage,
    onMutate: (content) => {
      dispatch(setChat({ status: "loading" }));
      dispatch(
        addMessageToConversation({
          chatId: currentConversationId,
          message: { sender: "user", text: content },
        })
      );
    },
    onSuccess: () => {
      dispatch(setChat({ status: "active" }));
      queryClient.invalidateQueries({ queryKey: ["conversation", currentConversationId] });
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      dispatch(setChat({ status: "error" }));
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const content = messageRef.current?.value;
    if (!content || content === "") return;
    sendMessageMutation(content);
    setMessage("");
    router.push(`/chat/${currentConversationId}`);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  const nodeInputRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

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


  const steps = [
    {
      label: 1,
      content: <Step1 />,
    },
    {
      label: 2,
      content: <Step2 />,
    },
    {
      label: 3,
      content: (
        <div className="flex flex-col ml-4 w-full">
          <span className="font-semibold text-xl">
            All Set! Start chatting.
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="relative flex h-full min-h-[50vh] flex-col rounded-xl p-4 lg:col-span-2 ">
      <div className="relative w-[97%] h-full flex flex-col items-center -mb-12 mt-5">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex items-start mb-8 w-full relative ${chatStep !== undefined && step.label === chatStep ? "" : "pointer-events-none"}`}
          >
            {/* Vertical Line */}
            <div
              className={`absolute left-[18px] top-10 h-full border-l-2 border-gray-300 z-0 ${index === steps.length - 1 ? "hidden" : "top-10"
                }`}
            ></div>
            {/* Step Circle */}
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full z-5 ${step.label === 3 && chatStep === 3
                  ? "bg-[#00C313] text-white"
                  : step.label <= (chatStep ?? 0)
                    ? "bg-white text-border border-2 border-accent"
                    : "bg-border text-white"
                }`}
            >
              {step.label}
            </div>
            {/* Step Text */}
            <div className="flex flex-col ml-8 w-full">{step.content}</div>
          </div>
        ))}
      </div>
      <div className="flex-1" />
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
                <div className="text-sm text-gray-500">{node.file_path}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NewChat;
