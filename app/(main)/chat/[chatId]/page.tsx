"use client";
import React, { useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/lib/state/store";
import { setChat, clearPendingMessage } from "@/lib/state/Reducers/chat";
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
import ChatService from "@/services/ChatService";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import { toast } from "@/components/ui/sonner";
import GlobalError from "@/app/error";
import Navbar from "./components/Navbar";
import { list_system_agents } from "@/lib/utils";
import { ParsingStatusEnum } from "@/lib/Constants";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";
import { useChatRuntime } from "./runtime";
import MinorService from "@/services/minorService";
import { useAuthContext } from "@/contexts/AuthContext";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import { Skeleton } from "@/components/ui/skeleton";

const ChatV2 = () => {
  const params: { chatId: string } = useParams();
  const [chatAccess, setChatAccess] = useState("loading");
  const dispatch: AppDispatch = useDispatch();
  const [projectId, setProjectId] = useState<string>("");
  const [parsingStatus, setParsingStatus] = useState<string>("");
  const [infoLoadedForChat, setInfoLoadedForChat] = useState<string | null>(null);
  const currentConversationId = params.chatId;
  const [showNavbar, setShowNavbar] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const { user } = useAuthContext();
  const [isPreprocessingComplete, setIsPreprocessingComplete] = useState(false);
  const [hasInitialMessages, setHasInitialMessages] = useState<boolean | null>(null);
  const [isThreadReady, setIsThreadReady] = useState(false);
  const [threadMessageCount, setThreadMessageCount] = useState(0);
  const [isThreadRunning, setIsThreadRunning] = useState(false);
  const [awaitingFirstThreadContent, setAwaitingFirstThreadContent] = useState(false);

  const [profilePicUrl, setProfilePicUrl] = useState(user.photoURL);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [errorState, setErrorState] = useState({
    isError: false,
    message: "",
    description: "",
  });

  // Ref to prevent overlapping parsing polls
  const isPollingRef = useRef(false);

  // Call hook before any early returns
  // Returns runtime + session states for background task handling
  const { runtime, isBackgroundTaskActive } = useChatRuntime(params.chatId);

  // Get pending message from Redux
  const pendingMessage = useSelector((state: RootState) => state.chat.pendingMessage);
  const hasSentPendingMessage = useRef(false);

  // Send pending message when chat page is ready (after ALL preprocessing completes)
  useEffect(() => {
    const sendPendingMessageWhenReady = async () => {
      // Check all prerequisites
      if (
        !pendingMessage ||
        hasSentPendingMessage.current ||
        !currentConversationId ||
        !isPreprocessingComplete ||
        !runtime ||
        infoLoadedForChat !== currentConversationId
      ) {
        return;
      }

      try {
        hasSentPendingMessage.current = true;
        setAwaitingFirstThreadContent(true);
        // Send the queued first message through composer as soon as runtime is ready.
        if (runtime.thread) {
          const composer = runtime.thread.composer;
          if (!composer) {
            throw new Error("Composer not available");
          }

          composer.setText(pendingMessage);
          composer.send();
          dispatch(clearPendingMessage());
        } else {
          throw new Error("Thread not available on runtime");
        }
      } catch (error) {
        console.error("Error handling pending message:", error);
        toast.error("Failed to send message. You can retry in the chat.");

        // Allow retry on error
        setAwaitingFirstThreadContent(false);
        hasSentPendingMessage.current = false;
        dispatch(clearPendingMessage());
      }
    };

    sendPendingMessageWhenReady();
  }, [
    pendingMessage,
    currentConversationId,
    infoLoadedForChat,
    isPreprocessingComplete,
    runtime,
    dispatch
  ]);

  const parseRepo = async () => {
    // Guard: prevent overlapping polls and bail if projectId is missing
    if (isPollingRef.current || !projectId) {
      return;
    }

    isPollingRef.current = true;
    try {
      await BranchAndRepositoryService.pollParsingStatus(
        projectId,
        parsingStatus,
        setParsingStatus
      );
    } catch (err) {
      console.error("Error during parsing:", err);
      setParsingStatus(ParsingStatusEnum.ERROR);
    } finally {
      isPollingRef.current = false;
    }
  };

  const fetchProfilePicture = async (userId: string) => {
    try {
      const profilePicture = await MinorService.getProfilePicture(userId);
      return profilePicture;
    } catch (error) {
      console.error("Error fetching profile picture:", error);
    }
  };

  const loadInfoOnce = async () => {
    if (infoLoadedForChat === currentConversationId) return;
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
        setErrorState({
          isError: true,
          message: info.message,
          description: info.description,
        });

        return;
      }


      setIsCreator(info.is_creator);

      // CRITICAL: Verify all required fields exist
      if (!info.agent_ids || info.agent_ids.length === 0) {
        throw new Error("Conversation missing agent ID");
      }
      if (!info.project_ids || info.project_ids.length === 0) {
        throw new Error("Conversation missing project ID");
      }
      if (!info.title) {
        console.warn("Conversation missing title, using default");
      }

      if (!list_system_agents.includes(info.agent_ids[0])) {
        setChatAccess(info.access_type);
      } else {
        setChatAccess(info.is_creator ? "write" : info.access_type);
      }

      dispatch(
        setChat({
          agentId: info.agent_ids[0],
          title: info.title,
        })
      );

      setProjectId(info.project_ids[0]);
      setInfoLoadedForChat(currentConversationId);

      const profilePicturePromise = !info.is_creator
        ? fetchProfilePicture(info.creator_id)
        : Promise.resolve(null);
      const parsingStatusPromise = BranchAndRepositoryService.getParsingStatus(
        info.project_ids[0]
      );
      const initialMessagesPromise = ChatService.loadMessages(
        currentConversationId,
        0,
        1
      ).then((messages) => messages.length > 0);

      const [nextParsingStatus, profilePicture, nextHasInitialMessages] = await Promise.all([
        parsingStatusPromise,
        profilePicturePromise,
        initialMessagesPromise,
      ]);

      setParsingStatus(nextParsingStatus);
      setHasInitialMessages(nextHasInitialMessages);
      if (profilePicture) {
        setProfilePicUrl(profilePicture as string);
      }

      setIsPreprocessingComplete(true);
    } catch (error) {
      console.error("Error loading conversation info:", error);
      toast.error("Failed to load conversation info");
    }
  };

  useEffect(() => {
    loadInfoOnce();
  }, [currentConversationId]);

  // Reset preprocessing state when conversation changes
  useEffect(() => {
    setIsPreprocessingComplete(false);
    setHasInitialMessages(null);
    hasSentPendingMessage.current = false;
    setIsThreadReady(false);
    setThreadMessageCount(0);
    setIsThreadRunning(false);
    setAwaitingFirstThreadContent(Boolean(pendingMessage));
  }, [currentConversationId, pendingMessage]);

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

  // Keep loading UI until assistant-ui thread history is hydrated.
  useEffect(() => {
    setIsThreadReady(false);
    setThreadMessageCount(0);
    setIsThreadRunning(false);

    if (!runtime?.thread) {
      return;
    }

    const thread = runtime.thread;
    const syncThreadState = () => {
      const state = thread.getState() as unknown as {
        messages?: ReadonlyArray<unknown>;
        isRunning?: boolean;
      };
      const messages = state.messages;
      if (Array.isArray(messages)) {
        setIsThreadReady(true);
        setThreadMessageCount(messages.length);
      }
      setIsThreadRunning(Boolean(state.isRunning));
    };

    syncThreadState();
    const unsubscribe = thread.subscribe(syncThreadState);
    return unsubscribe;
  }, [runtime, currentConversationId]);

  useEffect(() => {
    if (threadMessageCount > 0 || isThreadRunning) {
      setAwaitingFirstThreadContent(false);
    }
  }, [threadMessageCount, isThreadRunning]);

  const isChatBootstrapping =
    chatAccess === "loading" ||
    infoLoadedForChat !== currentConversationId ||
    !isPreprocessingComplete ||
    hasInitialMessages === null ||
    !isThreadReady ||
    (hasInitialMessages && threadMessageCount === 0) ||
    (awaitingFirstThreadContent && threadMessageCount === 0 && !isThreadRunning);

  if (errorState.isError)
    return (
      <GlobalError title={errorState.message} description={errorState.description} />
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
    <div className="flex flex-col h-screen bg-[#FAF8F7] dark:bg-background">
      <Navbar
        disableShare={!isCreator}
        showShare
        hidden={!showNavbar || errorState.isError}
      />
      <div className="relative flex-1 min-h-0">
        <div
          className={`h-full ${isChatBootstrapping ? "pointer-events-none opacity-0" : "opacity-100"}`}
          aria-hidden={isChatBootstrapping}
        >
          <AssistantRuntimeProvider runtime={runtime}>
            <Thread
              projectId={projectId}
              conversationId={currentConversationId}
              writeDisabled={false}
              showWelcome={false}
            />
          </AssistantRuntimeProvider>
        </div>

        {isChatBootstrapping ? (
          <div className="absolute inset-0 z-10 flex items-start justify-center bg-[#FAF8F7] px-4 pt-6 dark:bg-background">
            <div className="w-full max-w-2xl space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-72" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-80" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          </div>
        ) : null}
      </div>

      {/* Debug logging */}
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
  );
};

export default ChatV2;
