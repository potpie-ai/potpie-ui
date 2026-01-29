"use client";
import React, { useEffect, useLayoutEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/lib/state/store";
import { setChat } from "@/lib/state/Reducers/chat";
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
import { toast } from "sonner";
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
  const { runtime, isSessionResuming, isBackgroundTaskActive } = useChatRuntime(params.chatId);

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

      // Defensive checks for required arrays
      const agentId = info.agent_ids?.[0];
      const projectIdFromInfo = info.project_ids?.[0];

      if (!agentId || !projectIdFromInfo) {
        console.error("Missing agent_ids or project_ids in conversation info:", info);
        toast.error("Failed to load conversation: missing required data");
        setErrorState({
          isError: true,
          message: "Invalid conversation data",
          description: "The conversation is missing required information. Please try again or contact support.",
        });
        return;
      }

      if (!list_system_agents.includes(agentId)) {
        setChatAccess(info.access_type);
      } else {
        setChatAccess(info.is_creator ? "write" : info.access_type);
      }

      dispatch(
        setChat({
          agentId: agentId,
          title: info.title,
        })
      );

      setProjectId(projectIdFromInfo);
      setInfoLoadedForChat(currentConversationId);

      if (!info.is_creator && info.creator_id) {
        fetchProfilePicture(info.creator_id).then((profilePicture) => {
          setProfilePicUrl(profilePicture as string);
        });
      }

      const parsingStatus = await BranchAndRepositoryService.getParsingStatus(
        projectIdFromInfo
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
      <div className="h-[calc(90vh)]">
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread
            projectId={projectId}
            writeDisabled={false}
            userImageURL={profilePicUrl}
            conversation_id={currentConversationId}
            isSessionResuming={isSessionResuming}
            isBackgroundTaskActive={isBackgroundTaskActive}
          />
        </AssistantRuntimeProvider>
      </div>

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

