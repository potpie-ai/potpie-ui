"use client";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/state/store";
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
import { ParsingStatusEnum, planTypesEnum } from "@/lib/Constants";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "./components/Thread";
import { PotpieRuntime } from "./runtime";
import MinorService from "@/services/minorService";
import { useAuthContext } from "@/contexts/AuthContext";
import { useParams } from "next/navigation";

const Chat = () => {
  const params: { chatId: string } = useParams();
  const [chatAccess, setChatAccess] = useState("loading");
  const dispatch: AppDispatch = useDispatch();
  const [_currentConversation, setCurrentConversation] = useState<any>({
    conversationId: params.chatId,
    messages: [],
    totalMessages: 0,
    start: 0,
  });
  const [projectId, setProjectId] = useState<string>("");
  const [parsingStatus, setParsingStatus] = useState<string>("");
  const [infoLoaded, setInfoLoaded] = useState(false);
  const currentConversationId = params.chatId;
  const [showNavbar, setShowNavbar] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const { user } = useAuthContext();

  const [profilePicUrl, setProfilePicUrl] = useState(user.photoURL);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { planType, total_human_messages } = useSelector(
    (state: RootState) => state.UserInfo
  );
  const { backgroundTaskActive } = useSelector((state: RootState) => state.chat);
  const [Error, setError] = useState({
    isError: false,
    message: "",
    description: "",
  });

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

  const fetchProfilePicture = async (userId: string) => {
    try {
      const profilePicture = await MinorService.getProfilePicture(userId);
      return profilePicture;
    } catch (error) {
      console.error("Error fetching profile picture:", error);
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
        setChatAccess(info.access_type);
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

      // For workflow conversations, project_ids may be empty
      // Only set projectId and check parsing status if project_ids exists and is not empty
      if (info.project_ids && info.project_ids.length > 0 && info.project_ids[0]) {
        setProjectId(info.project_ids[0]);
        
        // Only check parsing status for conversations with projects (not workflow conversations)
        try {
          const parsingStatus = await BranchAndRepositoryService.getParsingStatus(
            info.project_ids[0]
          );
          setParsingStatus(parsingStatus);
        } catch (error) {
          console.warn("Error fetching parsing status (this is normal for workflow conversations):", error);
          setParsingStatus(ParsingStatusEnum.READY); // Set to ready for workflow conversations
        }
      } else {
        // Workflow conversation - no project, skip parsing status check
        setProjectId("");
        setParsingStatus(ParsingStatusEnum.READY);
      }
      
      setInfoLoaded(true);

      if (!info.is_creator) {
        fetchProfilePicture(info.creator_id).then((profilePicture) => {
          setProfilePicUrl(profilePicture as string);
        });
      }
    } catch (error) {
      console.error("Error loading conversation info:", error);
      toast.error("Failed to load conversation info");
    }
  };

  useLayoutEffect(() => {
    loadInfoOnce();
  }, [currentConversationId]);

  useEffect(() => {
    // Only check parsing status for conversations with projects (not workflow conversations)
    if (!projectId || projectId === "") {
      // Workflow conversation - no parsing needed, keep dialog closed
      setIsDialogOpen(false);
      return;
    }
    
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

  const runtime = PotpieRuntime(params.chatId);

  return (
    <div className="flex flex-col h-screen">
      <Navbar
        disableShare={!isCreator}
        showShare
        hidden={!showNavbar || Error.isError}
      />
      <div className="h-[calc(90vh)]">
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread
            projectId={projectId}
            writeDisabled={false
            }
            userImageURL={profilePicUrl}
            conversation_id={currentConversationId}
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

export default Chat;
