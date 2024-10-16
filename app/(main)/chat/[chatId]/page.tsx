"use client";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/state/store";
import { useMutation } from "@tanstack/react-query";
import NodeSelectorForm from "@/components/NodeSelectorChatForm/NodeSelector";
import { clearPendingMessage, setChat } from "@/lib/state/Reducers/chat";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader, XCircle } from "lucide-react";
import ChatService from "@/services/ChatService";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import ChatBubble from "../components/ChatBubble";

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
  const [fetchingResponse, setFetchingResponse] = useState<Boolean>(false);
  const [projectId, setProjectId] = useState<string>("");
  const [parsingStatus, setParsingStatus] = useState<string>("")
  const [infoLoaded, setInfoLoaded] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const currentConversationId = params.chatId;
  const bottomOfPanel = useRef<HTMLDivElement>(null);
  const upPanelRef = useRef<HTMLDivElement>(null);
  const pendingMessageSent = useRef(false);


  const {
    pendingMessage,
    selectedNodes,
    chatFlow,
  } = useSelector((state: RootState) => state.chat);

  const sendMessage = async ({ message, selectedNodes }: SendMessageArgs) => {
    setFetchingResponse(true);
    const { accumulatedMessage, accumulatedCitation } = await ChatService.sendMessage(currentConversationId, message, selectedNodes);

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

    setFetchingResponse(false);
    return accumulatedMessage;
  };

  const parseRepo = async (repo_name: string, branch_name: string) => {
    setParsingStatus("loading");
  
    try {
      const parseResponse = await BranchAndRepositoryService.parseRepo(repo_name, branch_name);
      const projectId = parseResponse.project_id;
      const initialStatus = parseResponse.status;
  
      if (projectId) {
        setProjectId(projectId);
      }
  
      if (initialStatus === "ready") {
        setParsingStatus("Ready");
        return;
      }
  
      await BranchAndRepositoryService.pollParsingStatus(projectId, initialStatus, setParsingStatus);
    } catch (err) {
      console.error("Error during parsing:", err);
      setParsingStatus("Error");
    }
  };

  const messageMutation = useMutation({
    mutationFn: sendMessage,
    onMutate: ({ message }) => {
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
  });

  const loadMessages = async () => {
    try {
      const messages = await ChatService.loadMessages(currentConversationId, 0, 50);
      setCurrentConversation((prevConversation: any) => ({
        ...prevConversation,
        messages,
      }));
      setMessagesLoaded(true);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const loadInfoOnce = async () => {
    if (infoLoaded || chatFlow !== "EXISTING_CHAT") return;
    try {
      const info = await ChatService.loadConversationInfo(currentConversationId);
      setCurrentConversation((prevConversation: any) => ({
        ...prevConversation,
        totalMessages: info.total_messages,
      }));
      dispatch(setChat({
        agentId: info.agent_ids[0],
        // TODO: Enable later when we start getting the branch and repo name from info api
        // temporaryContext: {
        //   branch: info?.branchName,
        //   repo: info?.repoName,
        // },
      }));
      setProjectId(info.project_ids[0]);
      setInfoLoaded(true);
    } catch (error) {
      console.error("Error loading conversation info:", error);
    }
  };

  useEffect(() => {
    loadInfoOnce();
  }, [currentConversationId]);
  
  useEffect(() => {
    if (!messagesLoaded) {
      loadMessages().then(() => {
        if (pendingMessage && !pendingMessageSent.current) {
          try {
            messageMutation.mutate({
              message: pendingMessage,
              selectedNodes: selectedNodes,
            });
            pendingMessageSent.current = true;
            dispatch(clearPendingMessage());
          } catch (error) {
            console.error("Error sending pending message:", error);
          }
        }
      });
    }
  }, [messagesLoaded, pendingMessage]);  

  const handleFormSubmit = (message: string) => {
    messageMutation.mutate({
      message,
      selectedNodes: selectedNodes,
    });
  };

  return (
    <div className="flex h-full min-h-[50vh] flex-col rounded-xl px-4 lg:col-span-2 -mb-6">
      <div className="relative w-full h-full flex flex-col items-center mb-5 mt-5 gap-3">
        <div ref={upPanelRef} className="w-full"></div>
        {currentConversation &&
          currentConversation.messages.map((message: { citations: any; text: string; sender: "user" | "agent" }, i: number) => (
            <ChatBubble
              key={`${currentConversation.conversationId}-${i}`}
              citations={Array.isArray(message.citations) && Array.isArray(message.citations[0]) ? message.citations.flat() : (message.citations || [])}
              message={message.text}
              sender={message.sender}
              isLast={i === currentConversation.messages.length - 1}
              currentConversationId={currentConversation.conversationId}
            />
          ))}

        {fetchingResponse && (
          <div className="flex items-center space-x-1 mr-auto">
            <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse"></span>
            <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-100"></span>
            <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-200"></span>
          </div>
        )}

        <div ref={bottomOfPanel} />
      </div>
      <NodeSelectorForm
        projectId={projectId}
        onSubmit={handleFormSubmit}
        disabled={!!fetchingResponse}
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