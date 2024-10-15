"use client";
import React, { useEffect, useRef, useState } from "react";
import ChatInterface from "../components/ChatInterface";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/state/store";
import { useMutation, useQuery } from "@tanstack/react-query";
import getHeaders from "@/app/utils/headers.util";
import NodeSelectorForm from "@/components/NodeSelectorChatForm/NodeSelector";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader, XCircle } from "lucide-react";
import { setChat } from "@/lib/state/Reducers/chat";

interface SendMessageArgs {
  message: string;
  selectedNodes: any[];
}

const Chat = ({ params }: { params: { chatId: string } }) => {
  const { temporaryContext } = useSelector(
    (state: RootState) => state.chat
  );
  const dispatch: AppDispatch = useDispatch();
  const [currentConversation, setCurrentConversation] = useState<any>({
    conversationId: params.chatId,
    messages: [],
    totalMessages: 0,
    start: 0,
  });
  const [status, setStatus] = useState<string>("loading");
  const [fetchingResponse, setFetchingResponse] = useState<Boolean>(false);
  const [projectId, setProjectId] = useState<string>("");
  const [parsingStatus, setParsingStatus] = useState<string>("")
  const currentConversationId = params.chatId;

  const {
    pendingMessage,
    selectedNodes,
    chatFlow,
  } = useSelector((state: RootState) => state.chat);

  const pendingMessageSent = useRef(false);

  const sendMessage = async ({ message, selectedNodes }: SendMessageArgs) => {
    const headers = await getHeaders();
    setStatus("loading");
    setFetchingResponse(true);
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${currentConversationId}/message/`,
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
      const { done, value } = (await reader?.read()) || { done: true, value: undefined };
      if (done) break;

      const chunk = decoder.decode(value);
      try {
        const parsedChunks = chunk
          .split("}")
          .filter(Boolean)
          .map((c) => JSON.parse(c + "}"));

        for (const parsedChunk of parsedChunks) {
          accumulatedMessage += parsedChunk.message;
          accumulatedCitation = parsedChunk.citations;
        }
      } catch (error) {
        // TODO: Handle the error
      }
    }

    setCurrentConversation((prevConversation: any) => ({
      ...prevConversation,
      messages: [
        ...prevConversation.messages,
        {
          sender: "agent",
          text: accumulatedMessage,
          citations: [accumulatedCitation],
        },
      ],
    }));

    setStatus("active");
    setFetchingResponse(false)
    return accumulatedMessage;
  };

  const messageMutation = useMutation({
    mutationFn: sendMessage,
    onMutate: ({ message }) => {
      setStatus("loading");
      // Push user's message to currentConversation
      setCurrentConversation((prevConversation: any) => ({
        ...prevConversation,
        messages: [
          ...prevConversation.messages,
          {
            sender: "user",
            text: message,
          },
        ],
      }));
    },
    onSuccess: () => {
      setStatus("active");
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      setStatus("error");
    },
  });

  const { isLoading: isLoadingTotalMessages } = useQuery({
    queryKey: ["total-messages", currentConversationId],
    queryFn: async () => {
      if (chatFlow !== "EXISTING_CHAT") return;

      const headers = await getHeaders();
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${currentConversationId}/info/`,
        {
          headers: headers,
        }
      );
      const totalMessages = response.data.total_messages;

      setCurrentConversation((prevConversation: any) => ({
        ...prevConversation,
        totalMessages,
      }));
      dispatch(setChat({ agentId: response.data.agentIds[0], temporaryContext: { branch: response.data?.branchName, repo: response.data?.repoName } }));
      setProjectId(response.data.projectIds[0])
      return totalMessages;
    },
    enabled: chatFlow === "EXISTING_CHAT",
  });

  const { data: isLatest, isLoading: isLoadingIsLatest } = useQuery({
    queryKey: ["is-latest", projectId],
    queryFn: async () => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

      const statusResponse = await axios
        .get(`${baseUrl}/api/v1/parsing-status/${projectId}`, {
          headers: headers,
        })
        .then((response) => {
          if (response.data.latest !== true && temporaryContext.repo && temporaryContext.branch) {
            parseRepo(temporaryContext.repo, temporaryContext.branch);
          }
          return response.data.latest;
        })
        .catch((error) => {
          console.log(error);
          return "error";
        });

      return statusResponse;
    },
    enabled: !!projectId,
  });

  useEffect(() => {
    fetchConversations();
    if (pendingMessage && !pendingMessageSent.current) {
      try {
        messageMutation.mutate({
          message: pendingMessage,
          selectedNodes: selectedNodes,
        });
        pendingMessageSent.current = true;
      } catch (error) {
        console.error("Error sending pending message:", error);
      }
    }
  }, [currentConversationId, pendingMessage]);

  const handleFormSubmit = (message: string) => {
    messageMutation.mutate({
      message,
      selectedNodes: selectedNodes,
    });
  };

  const parseRepo = async (repoName: string, branchName: string) => {
    setParsingStatus("parsing");
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      const parseResponse = await axios.post(
        `${baseUrl}/api/v1/parse`,
        { repo_name: repoName, branch_name: branchName },
        { headers: headers }
      );

      await new Promise((resolve) => setTimeout(resolve, 5000));

      let parsingStatus = "";
      while (true) {
        const statusResponse = await axios.get(
          `${baseUrl}/api/v1/parsing-status/${projectId}`,
          { headers: headers }
        );

        parsingStatus = statusResponse.data.status;
        setParsingStatus(parsingStatus);

        if (parsingStatus === "ready") {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      return parseResponse.data;
    } catch (error) {
      console.error("Error during parsing:", error);
      setParsingStatus("error");
      return error;
    }
  };

  const fetchConversations = async () => {
    try {
      setStatus("loading");
      const headers = await getHeaders();
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${currentConversationId}/messages/`,
        {
          headers: headers,
          params: {
            start: 0,
            limit: 10,
          },
        }
      );

      const newConversation = {
        conversationId: currentConversationId,
        messages: response.data.map((message: { id: any; content: any; type: string; citations: any; }) => ({
          id: message.id,
          text: message.content,
          sender: message.type === "HUMAN" ? "user" : "agent",
          citations: message.citations || [],
        })),
        start: 0,
      };
      setCurrentConversation(newConversation);
      setStatus("active");
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setStatus("error");
    }
  };

  const loadOlderMessages = async () => {
    const start = currentConversation?.start || 0;

    if (start > 0) {
      try {
        const headers = await getHeaders();
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${currentConversationId}/messages/`,
          {
            headers: headers,
            params: {
              start: start - 10,
              limit: 10,
            },
          }
        );

        const newMessages = response.data;

        setCurrentConversation((prevConversation: any) => {
          const existingMessageIds = new Set(prevConversation.messages.map((msg: any) => msg.id));

          const formattedMessages = newMessages
            .filter((message: any) => !existingMessageIds.has(message.id))
            .map((message: { id: any; content: any; type: string; citations: any; }) => ({
              id: message.id,
              text: message.content,
              sender: message.type === "HUMAN" ? "user" : "agent",
              citations: message.citations || [],
            }));

          return {
            ...prevConversation,
            messages: [...formattedMessages, ...prevConversation.messages],
            start: start - 10,
            totalMessages: prevConversation.totalMessages + formattedMessages.length,
          };
        });
      } catch (error) {
        console.error("Error loading older messages:", error);
      }
    }
  };

  return (
    <div className="flex h-full min-h-[50vh] flex-col rounded-xl px-4 lg:col-span-2 -mb-6">
      <ChatInterface
        currentConversation={currentConversation}
        status={status}
        fetchingResponse={fetchingResponse}
        chatFlow={chatFlow}
        onLoadMoreMessages={loadOlderMessages}
      />
      <NodeSelectorForm
        projectId={projectId}
        onSubmit={handleFormSubmit}
        disabled={status === "loading"}
      />
      <div className="h-6 w-full bg-background sticky bottom-0"></div>
      <Dialog open={parsingStatus === "parsing"}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Parsing your latest code changes</DialogTitle>
          </DialogHeader>
          {parsingStatus === "ready" ? (
            <div className="flex justify-start items-center gap-3 mt-5 ml-5">
              <CheckCircle className="text-[#00C313] h-4 w-4" />
              <span className="text-[#00C313]">{parsingStatus}</span>
            </div>
          ) : parsingStatus === "parsing" ? (
            <div className="flex justify-start items-center gap-3 mt-5 ml-5">
              <Loader className="animate-spin h-4 w-4" />
              <span>{parsingStatus}</span>
            </div>
          ) : null}
          {parsingStatus === "error" && (
            <div className="flex gap-4 items-center my-3">
              <div className="flex justify-start items-center gap-3 ">
                <XCircle className="text-[#E53E3E] h-4 w-4" />
                <span>{parsingStatus}</span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => temporaryContext.repo && parseRepo(temporaryContext.repo, temporaryContext.branch)}
              >
                Retry
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Chat;