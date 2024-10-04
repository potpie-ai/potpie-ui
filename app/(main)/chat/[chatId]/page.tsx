"use client";
import React, { useEffect, useRef, useState } from "react";
import ChatInterface from "../components/ChatInterface";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader, XCircle } from "lucide-react";

interface SendMessageArgs {
  message: string;
  selectedNodes: any[];
}

const Chat = ({ params }: { params: { chatId: string } }) => {
  const dispatch = useDispatch();
  const {
    pendingMessage,
    projectId,
    selectedNodes,
    conversations,
    chatFlow,
    repoName,
    branchName,
    status
  } = useSelector((state: RootState) => state.chat);
  
  const pendingMessageSent = useRef(false);
  const [parsingStatus, setParsingStatus] = useState<string>("");

  /*
  This function is to send a message.
  */

  const sendMessage = async ({ message, selectedNodes }: SendMessageArgs) => {
    const headers = await getHeaders();
    dispatch(setChat({ status: "loading" }));
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
          accumulatedCitation = parsedChunk.citations;
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
  const { isLoading: isLoadingTotalMessages, data: totalMessagesData } = useQuery({
    queryKey: ["total-messages", params.chatId],
    queryFn: async () => {
      if (chatFlow !== "EXISTING_CHAT") return;

        const headers = await getHeaders();
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${params.chatId}/info/`,
          {
            headers: headers,
          }
        );
        const totalMessages = response.data.total_messages;
        dispatch(setChat({ projectId: response.data.project_ids[0], agentId: response.data.agent_ids[0] }));
        dispatch(setTotalMessages({ chatId: params.chatId, totalMessages }));

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
      },
      enabled: chatFlow === "EXISTING_CHAT",
    });

  const { data: IsLatest, isLoading: isLoadingIsLatest } = useQuery({
    queryKey: ["is-latest", params.chatId],
    queryFn: async () => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

      const statusResponse = axios
        .get(`${baseUrl}/api/v1/parsing-status/${projectId}`, {
          headers: headers,
        })
        .then((response) => {
          if (response.data.latest !== true && repoName && branchName) {
            parseRepo(repoName, branchName);
          }
          return response.data.latest;
        })
        .catch((error) => {
          console.log(error);
          return "error";
        });
    },
    enabled: !isLoadingTotalMessages && !!projectId,
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

      dispatch(clearChat());
      response.data.forEach((message: any) => {
        dispatch(
          addMessageToConversation({
            chatId: params.chatId,
            message: {
              id: message.id,
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
        return response.data;
      }

      dispatch(setChat({ status: "active" }));
      return response.data;
    },
    refetchOnWindowFocus: false,
    enabled: chatFlow === "EXISTING_CHAT" || !!pendingMessage,
  });

  useEffect(() => {
    if (pendingMessage && !pendingMessageSent.current) {
      try {
        messageMutation.mutate({ message: pendingMessage, selectedNodes: selectedNodes });
        pendingMessageSent.current = true;
      } catch (error) {
        console.error("Error sending pending message:", error);
      }
    }
  }, [params.chatId, pendingMessage]);

  const handleFormSubmit = (message: string) => {
    messageMutation.mutate({ 
      message, 
      selectedNodes: selectedNodes 
    });
  };

  const parseRepo = async (repo_name: string, branch_name: string) => {
    setParsingStatus("loading");
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    try {
      const parseResponse = await axios.post(
        `${baseUrl}/api/v1/parse`,
        { repo_name, branch_name },
        { headers: headers }
      );

      if (repo_name !== null || branch_name !== null) {
        dispatch(setChat({ projectId: parseResponse.data.project_id }));
      }

      const projectId = parseResponse.data.project_id;
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
          dispatch(setChat({ chatStep: 2 }));
          setParsingStatus("Ready");
          break;
        } else if (parsingStatus === "submitted") {
          setParsingStatus("Parsing");
        } else if (parsingStatus === "parsed") {
          setParsingStatus("Understanding your code");
        } else if (parsingStatus === "error") {
          setParsingStatus("error");
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
      return parseResponse.data;
    } catch (err) {
      console.error("Error during parsing:", err);
      setParsingStatus("error");
      return err;
    }
  };

  return (
    <div className="flex h-full min-h-[50vh] flex-col rounded-xl px-4 lg:col-span-2 -mb-6">
      <ChatInterface currentConversationId={params.chatId} />
      <NodeSelectorForm
        projectId={projectId}
        onSubmit={handleFormSubmit}
        disabled={status === "loading"}
      />
      <div className="h-6 w-full bg-background sticky bottom-0"></div>
      <Dialog open={!!IsLatest}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reparsing your latest code changes </DialogTitle>
          </DialogHeader>
          {parsingStatus !== "error" && parsingStatus === "Ready" ? (
            <div className="flex justify-start items-center gap-3 mt-5 ml-5">
              <CheckCircle className="text-[#00C313] h-4 w-4" />{" "}
              <span className="text-[#00C313]">{parsingStatus}</span>
            </div>
          ) : parsingStatus !== "error" && parsingStatus !== "" ? (
            <div className="flex justify-start items-center gap-3 mt-5 ml-5 ">
              <Loader
                className={`animate-spin h-4 w-4 ${parsingStatus === "" && "hidden"}`}
              />{" "}
              <span>{parsingStatus}</span>
            </div>
          ) : null}
          {parsingStatus === "error" && (
            <div className="flex gap-4 items-center my-3">
              <div className="flex justify-start items-center gap-3 ">
                <XCircle className="text-[#E53E3E] h-4 w-4" />{" "}
                <span>{parsingStatus}</span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => branchName && parseRepo(repoName, branchName)}
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
