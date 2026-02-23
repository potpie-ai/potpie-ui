"use client";
import React, { useEffect, useLayoutEffect, useState, useRef } from "react";
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
import { SessionInfo } from "@/lib/types/session";
import { toast } from "@/components/ui/sonner";
import GlobalError from "@/app/error";
import Navbar from "./components/Navbar";
import { list_system_agents } from "@/lib/utils";
import { ParsingStatusEnum } from "@/lib/Constants";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "./components/Thread";
import { useChatRuntime } from "./runtime";
import MinorService from "@/services/minorService";
import { useAuthContext } from "@/contexts/AuthContext";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";

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

  const [profilePicUrl, setProfilePicUrl] = useState(user.photoURL);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [errorState, setErrorState] = useState({
    isError: false,
    message: "",
    description: "",
  });

  // Active session state for resume functionality
  const [activeSession, setActiveSession] = useState<SessionInfo | null>(null);

  // Ref to prevent overlapping parsing polls
  const isPollingRef = useRef(false);

  // Call hook before any early returns
  // Returns runtime + session states for background task handling
  const { runtime, isBackgroundTaskActive } = useChatRuntime(params.chatId);

  // Get pending message from Redux
  const pendingMessage = useSelector((state: RootState) => state.chat.pendingMessage);
  const hasSentPendingMessage = useRef(false);

  // Helper function to wait for runtime history to load
  const waitForHistoryLoad = async (runtime: ReturnType<typeof useChatRuntime>["runtime"]): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!runtime) {
        resolve(false);
        return;
      }

      const thread = runtime.thread;
      if (!thread) {
        resolve(false);
        return;
      }

      const getMessages = () => thread.getState().messages;

      // If messages are already loaded (array exists), resolve immediately
      if (Array.isArray(getMessages())) {
        resolve(true);
        return;
      }

      // Otherwise, wait for history adapter to complete
      const unsubscribe = thread.subscribe(() => {
        const messages = getMessages();
        if (Array.isArray(messages)) {
          unsubscribe();
          resolve(true);
        }
      });

      // Safety timeout - resolve after 10 seconds even if history doesn't load
      setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, 10000);
    });
  };

  // Fallback handler for when resume completely fails - polls for completed message
  const handleFailedResume = async () => {
    try {
      const maxAttempts = 5;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const messages = await ChatService.loadMessages(currentConversationId, 0, 2);

        // Check if we have a new assistant message that's not in current thread state
        const threadMessages = runtime?.thread?.getState().messages || [];
        const latestAssistantMsg = messages.find((m: any) => m.sender === 'agent');

        if (latestAssistantMsg) {
          // Check if this message is already in the thread
          const alreadyInThread = threadMessages.some((msg: any) => msg.id === latestAssistantMsg.id);

          if (!alreadyInThread) {
            // Trigger a history reload by clearing and re-fetching
            // The runtime's history adapter will pick this up
            toast.info("Message completed. Reloading...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            window.location.reload();
            return;
          }
        }
      }

      // If we get here, polling didn't find anything
      console.error("Fallback polling failed to find completed message");
      toast.error("Could not connect to streaming session. Please refresh the page.");
    } catch (error) {
      console.error("Error in fallback polling:", error);
      toast.error("Failed to recover streaming session. Please try again.");
    }
  };

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
        // Wait for runtime history to load
        const historyLoaded = await waitForHistoryLoad(runtime);

        if (!historyLoaded) {
          console.warn("[Chat Page] History load timeout, proceeding anyway");
        }

        // Small delay to ensure everything is fully ready
        await new Promise((resolve) => setTimeout(resolve, 300));

        hasSentPendingMessage.current = true;

        // CASE 1: Active session exists - RESUME IT
        if (activeSession && activeSession.status === 'active') {
          try {
            // Trigger resume via runtime - the runtime adapter will handle calling resumeWithCursor
            const thread = runtime.thread;
            if (!thread) {
              throw new Error("Thread not available on runtime");
            }

            // Get the last message ID to trigger resume for
            const messages = thread.getState().messages;
            const lastMessage = messages[messages.length - 1];

            if (lastMessage && lastMessage.role === 'user') {
              thread.startRun(lastMessage.id);
              dispatch(clearPendingMessage());
              return;
            } else {
              console.warn("No user message found to resume, falling back to composer");
              // Fall through to CASE 2
            }
          } catch (error) {
            console.error("Error resuming active session:", error);
            toast.error("Failed to connect to streaming session. Retrying...");

            // Reset to allow retry
            hasSentPendingMessage.current = false;

            // Wait a bit and try fallback
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Fall through to CASE 2 to send via composer as fallback
          }
        }

        // CASE 2: No active session or resume failed - SEND VIA COMPOSER
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
    activeSession,
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

      if (!info.is_creator) {
        fetchProfilePicture(info.creator_id).then((profilePicture) => {
          setProfilePicUrl(profilePicture as string);
        });
      }

      const parsingStatus = await BranchAndRepositoryService.getParsingStatus(
        info.project_ids[0]
      );
      setParsingStatus(parsingStatus);
      
      // Mark preprocessing as complete after all info is loaded
      setIsPreprocessingComplete(true);
    } catch (error) {
      console.error("Error loading conversation info:", error);
      toast.error("Failed to load conversation info");
    }
  };

  useLayoutEffect(() => {
    loadInfoOnce();
  }, [currentConversationId]);

  // Reset preprocessing state when conversation changes
  useEffect(() => {
    setIsPreprocessingComplete(false);
    hasSentPendingMessage.current = false;
  }, [currentConversationId]);

  // Detect active session after preprocessing completes
  useEffect(() => {
    const checkActiveSession = async () => {
      if (!currentConversationId || !isPreprocessingComplete) {
        return;
      }

      try {
        const session = await ChatService.detectActiveSession(currentConversationId);

        if (session && session.status === 'active') {
          setActiveSession(session);
        } else {
          setActiveSession(null);
        }
      } catch (error: any) {
        // 404 is expected when no active session exists
        if (error.response?.status !== 404) {
          console.error("Error detecting active session:", error);
        }
        setActiveSession(null);
      }
    };

    checkActiveSession();
  }, [currentConversationId, isPreprocessingComplete]);

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
    <div className="flex flex-col h-screen">
      <Navbar
        disableShare={!isCreator}
        showShare
        hidden={!showNavbar || errorState.isError}
      />
      <div className="flex-1 min-h-0">
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread
            projectId={projectId}
            writeDisabled={false}
            userImageURL={profilePicUrl}
            conversation_id={currentConversationId}
            isSessionResuming={activeSession !== null}
            isBackgroundTaskActive={isBackgroundTaskActive}
            hasPendingMessage={!!pendingMessage && !hasSentPendingMessage.current}
          />
        </AssistantRuntimeProvider>
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
