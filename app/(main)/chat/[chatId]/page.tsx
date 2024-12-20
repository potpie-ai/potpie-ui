"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/state/store";
import { useMutation } from "@tanstack/react-query";
import NodeSelectorForm from "@/components/NodeSelectorChatForm/NodeSelector";
import { clearPendingMessage, setChat } from "@/lib/state/Reducers/chat";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import ChatService from "@/services/ChatService";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import ChatBubble from "../components/ChatBubble";
import { toast } from "sonner";
import GlobalError from "@/app/error";
import Navbar from "../components/Navbar";
import AgentService from "@/services/AgentService";
import { list_system_agents } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import MinorService from "@/services/minorService";
import { ParsingStatusEnum } from "@/lib/Constants";
import { increaseTotalHumanMessages } from "@/lib/state/Reducers/User";
import { planTypesEnum } from "@/lib/Constants";

interface SendMessageArgs {
  message: string;
  selectedNodes: any[];
}

const Chat = ({ params }: { params: { chatId: string } }) => {
  const [chatAccess, setChatAccess] = useState("loading");
  const dispatch: AppDispatch = useDispatch();
  const [currentConversation, setCurrentConversation] = useState<any>({
    conversationId: params.chatId,
    messages: [],
    totalMessages: 0,
    start: 0,
  });
  const [fetchingResponse, setFetchingResponse] = useState<Boolean>(false);
  const [projectId, setProjectId] = useState<string>("");
  const [parsingStatus, setParsingStatus] = useState<string>("");
  const [infoLoaded, setInfoLoaded] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const currentConversationId = params.chatId;
  const bottomOfPanel = useRef<HTMLDivElement>(null);
  const upPanelRef = useRef<HTMLDivElement>(null);
  const pendingMessageSent = useRef(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const { pendingMessage, selectedNodes } = useSelector(
    (state: RootState) => state.chat
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { planType, total_human_messages } = useSelector(
    (state: RootState) => state.UserInfo
  );
  const [Error, setError] = useState({
    isError: false,
    message: "",
    description: "",
  });

  const sendMessage = async ({ message, selectedNodes }: SendMessageArgs) => {
    setFetchingResponse(true);
    const { accumulatedMessage, accumulatedCitation } =
      await ChatService.sendMessage(
        currentConversationId,
        message,
        selectedNodes
      );

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

  const parseRepo = async () => {
    try {
      await BranchAndRepositoryService.pollParsingStatus(
        projectId,
        parsingStatus,
        setParsingStatus
      );
    } catch (err) {
      console.error("Error during parsing:", err);
      setParsingStatus(ParsingStatusEnum.ERROR);
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
    onSuccess: () => {
      dispatch(increaseTotalHumanMessages(1))
    }
  });

  const fetchProfilePicture = async (userId: string) => {
    try {
      const profilePicture = await MinorService.getProfilePicture(userId);
      return profilePicture;
    } catch (error) {
      console.error("Error fetching profile picture:", error);
    }
  };

  const loadMessages = async () => {
    try {
      const messages = await ChatService.loadMessages(
        currentConversationId,
        0,
        50
      );
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
    if (infoLoaded) return;
    setParsingStatus("loading");

    try {
      const info = await ChatService.loadConversationInfo(
        currentConversationId
      );
      if (info.type === "error") {
        if (info.status === 404) {
          toast.info(info.message);
        } else if (info.status === 401) {
          setChatAccess(info.message);
          toast.info(info.description);
        } else {
          toast.error(info.description);
        }
        setShowNavbar(false);
        setError({
          isError: true,
          message: info.message,
          description: info.description,
        });

        return;
      }
      setIsCreator(info.is_creator);

      if (!list_system_agents.includes(info.agent_ids[0])) {
        AgentService.getAgentStatus(info.agent_ids[0]).then((agentStatus) => {
          if (agentStatus !== "RUNNING") {
            setChatAccess("not_running");
          } else {
            setChatAccess(info.access_type);
          }
        });
      } else {
        setChatAccess(info.is_creator ? "write" : info.access_type);
      }
      setCurrentConversation((prevConversation: any) => ({
        ...prevConversation,
        totalMessages: info.total_messages,
      }));

      dispatch(
        setChat({
          agentId: info.agent_ids[0],
          title: info.title,
        })
      );

      setProjectId(info.project_ids[0]);
      setInfoLoaded(true);

      if (!info.is_creator) {
        fetchProfilePicture(info.creator_id).then((profilePicture) => {
          setProfilePicUrl(profilePicture);
        });
      }
      const parsingStatus = await BranchAndRepositoryService.getParsingStatus(
        info.project_ids[0]
      );
      setParsingStatus(parsingStatus);
    } catch (error) {
      console.error("Error loading conversation info:", error);
      toast.error("Failed to load conversation info");
    }
  };

  useLayoutEffect(() => {
    loadInfoOnce();
  }, [currentConversationId]);

  useEffect(() => {
    if (!messagesLoaded) {
      loadMessages().then(() => {
        if (pendingMessage && !pendingMessageSent.current) {
          if (chatAccess !== "not_running") {
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
          } else {
            console.warn(
              "Agent is not running; pending message will not be sent."
            );
          }
        }
      });
    }
  }, [messagesLoaded, pendingMessage, chatAccess]);

  useEffect(() => {
    if (
      parsingStatus === ParsingStatusEnum.ERROR ||
      (parsingStatus !== ParsingStatusEnum.READY &&
        parsingStatus !== "loading" &&
        projectId)
    ) {
      setIsDialogOpen(true);
      if (parsingStatus !== ParsingStatusEnum.ERROR) {
        parseRepo();
      }
    } else if (parsingStatus === ParsingStatusEnum.READY) {
      setIsDialogOpen(false);
    }
  }, [parsingStatus, projectId]);
  

  const handleFormSubmit = (message: string) => {
    messageMutation.mutate({
      message,
      selectedNodes: selectedNodes,
    });
  };

  if (Error.isError)
    return (
      <GlobalError title={Error.message} description={Error.description} />
    );
  if (chatAccess === "not_found") {
    return (
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You are not allowed to access this chat</DialogTitle>
            <DialogDescription>
              Please contact the project owner to request access.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Navbar
        disableShare={!isCreator}
        showShare
        hidden={!showNavbar || Error.isError}
      />
      <div className="flex h-full min-h-[50vh] flex-col rounded-xl px-4 lg:col-span-2 -mb-6">
        <div className="relative w-full h-full flex flex-col items-center mb-5 mt-5 gap-3">
          <div ref={upPanelRef} className="w-full"></div>
          {currentConversation &&
            currentConversation.messages.map(
              (
                message: {
                  citations: any;
                  text: string;
                  sender: "user" | "agent";
                },
                i: number
              ) => (
                <ChatBubble
                  key={`${currentConversation.conversationId}-${i}`}
                  citations={
                    Array.isArray(message.citations) &&
                    Array.isArray(message.citations[0])
                      ? message.citations.flat()
                      : message.citations || []
                  }
                  message={message.text}
                  sender={message.sender}
                  isLast={i === currentConversation.messages.length - 1}
                  currentConversationId={currentConversation.conversationId}
                  userImage={profilePicUrl}
                />
              )
            )}

          {fetchingResponse && (
            <div className="flex items-center space-x-1 mr-auto">
              <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse"></span>
              <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-100"></span>
              <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-200"></span>
            </div>
          )}

          <div ref={bottomOfPanel} />
        </div>
        {chatAccess === "write" ? (
          <>
            <NodeSelectorForm
              projectId={projectId}
              onSubmit={handleFormSubmit}
              disabled={
                
                !!fetchingResponse || parsingStatus !== ParsingStatusEnum.READY
               ||
                total_human_messages >= (planType === planTypesEnum.PRO? 500 : 50)
              }
            />
          </>
        ) : chatAccess === "loading" ? (
          <Skeleton className="sticky bottom-6 overflow-hidden rounded-lg border-[#edecf4] shadow-md h-28" />
        ) : chatAccess === "not_running" ? (
          <div className="sticky bottom-6 flex flex-col items-center">
            <p className="text-sm text-gray-500">
              Please start the agent to continue the conversation.
            </p>
          </div>
        ) : null}

        <div className="h-6 w-full bg-background sticky bottom-0"></div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {parsingStatus === ParsingStatusEnum.ERROR
                  ? "There was an error parsing your repo, please try again after a few minutes"
                  : "Understanding your latest commit this might take some time"}{" "}
              </DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <DialogClose>
                <Button
                  variant={
                    parsingStatus === ParsingStatusEnum.ERROR
                      ? "destructive"
                      : "default"
                  }
                >
                  Ok
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Chat;
