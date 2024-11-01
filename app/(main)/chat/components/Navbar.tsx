"use client";
import Link from "next/link";
import Image from "next/image";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import { setChat } from "@/lib/state/Reducers/chat";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { z } from "zod";
import { Share2 } from "lucide-react";
import ChatService from "@/services/ChatService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Visibility } from "@/lib/Constants";
import { on } from "events";


const emailSchema = z
  .string()
  .email({ message: "Invalid email address" })
  .or(z.array(z.string().email({ message: "Invalid email address" })));

const Navbar = ({
  showShare,
  hidden = false,
  chatTitle,
}: {
  showShare?: boolean;
  hidden?: boolean;
  chatTitle?: string;
}) => {
  const { title, agentId, allAgents } = useSelector(
    (state: RootState) => state.chat
  );
  const pathname = usePathname();
  const dispatch = useDispatch();
  const [displayTitle, setDisplayTitle] = useState<string>("Untitled");
  const [inputValue, setInputValue] = useState<string>("");
  const [emailValue, setEmailValue] = useState<string>("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTitleDialogOpen, setIsTitleDialogOpen] = useState(false);
  const [shareWithLink, setShareWithLink] = useState(false);
  const [accessList, setAccessList] = useState<string[]>([]);

  useEffect(() => {
    if (chatTitle) {
      setDisplayTitle(chatTitle);
      setInputValue(chatTitle);
    } else if (title) {
      setDisplayTitle(title);
      setInputValue(title);
    }
  }, [title, chatTitle, pathname]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmailValue(event.target.value);
    setEmailError(null);
  };

  const currentConversationId = usePathname()?.split("/").pop();

  const { refetch: refetchChatTitle } = useQuery({
    queryKey: ["chat-title", currentConversationId],
    queryFn: async () => {
      const headers = await getHeaders();
      try {
        const response = await axios.patch(
          `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${currentConversationId}/rename/`,
          { title: inputValue },
          { headers }
        );

        if (response.data.status === "success") {
          setIsTitleDialogOpen(false);
          setDisplayTitle(inputValue);
          dispatch(setChat({ title: inputValue }));
          toast.success("Title updated successfully");
        }
        return response.data;
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to update title");
        return err.response?.data;
      }
    },
    enabled: false,
  });

  const handleSave = () => {
    if (!inputValue.trim()) {
      toast.error("Title cannot be empty");
      return;
    }
    refetchChatTitle();
  };

  const { refetch: refetchChatShare } = useQuery({
    queryKey: ["chat-share", currentConversationId],
    queryFn: async () => {
      const recipientEmails = emailValue
        .split(",")
        .map((email: string) => email.trim());

      if (!currentConversationId) return;

      const res = await ChatService.shareConversation(
        currentConversationId,
        recipientEmails,
        shareWithLink ? Visibility.PUBLIC : Visibility.PRIVATE
      );

      if (res.type === "error") {
        toast.error(res.message || "Unable to share");
        return res;
      }

      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}${pathname}`;
      navigator.clipboard.writeText(shareUrl);

      toast.message(
        <div className="flex flex-col gap-1">
          <p className="text-primary font-semibold">URL copied to clipboard</p>
          <p className="text-sm text-muted">{shareUrl}</p>
        </div>
      );

      return res;
    },
    enabled: false,
  });

  const handleEmailSave = async () => {
    try {
      if (shareWithLink) {
        const res = await refetchChatShare();
        if (res.data.type === "error") return;
      } else {
        const emails = emailValue.split(",").map((email) => email.trim());
        emails.forEach((email) => emailSchema.parse(email));
        await refetchChatShare();
      }
      setIsDialogOpen(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setEmailError(error.errors[0].message);
      } else {
        setEmailError("An error occurred while sharing the chat.");
      }
    }
  };

  const isShareDisabled = () => {
    if (shareWithLink) return false;
    const emails = emailValue.split(",").map((email) => email.trim());
    return emails.some((email) => !/\S+@\S+\.\S+/.test(email));
  };

  const {refetch: refetchAccessList} = useQuery({
    queryKey: ["access-list", currentConversationId],
    queryFn: async () => {
      if (!currentConversationId) return;
      try {
        const response = await ChatService.getChatAccess(currentConversationId);
        if('data' in response){
        if (Array.isArray(response.data)) {
          setAccessList(response.data);
        }
        
        return response.data;}
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to update title");
        return err.response?.data;
      }
    },
    enabled: false,
  })
  useEffect(() => {
    if (isDialogOpen) {
      refetchAccessList(); // Refetch access list when dialog opens
    }
  }, [isDialogOpen, refetchAccessList]);

  const handleSelectChange = (value: string) => {
    setShareWithLink(value === "link");
    if (value === "email") {
    setEmailValue(""); // Reset email value when switching
    setEmailError(null); // Clear email error if switching to link
      refetchAccessList(); // Fetch access list again for email option
    }
  };

  if (hidden) return null;

  return (
    <>
      <header className="sticky top-0 z-50 bg-white flex h-[70px] items-center border-b border-[#E3E3E3] flex-col justify-between text-secondary -m-4 lg:-m-6">
        <div className="bg-[#4479FF] w-full text-center bg-opacity-[0.37] text-muted">
          Hello beta user! Please refer to this Notion doc to get started.{" "}
          <Link
            href="https://momentumsh.notion.site/potpie-s-beta-program-10cc13a23aa8801e8e2bd34d8f1488f5?pvs=4"
            className="text-[#0267FF] underline"
          >
            Click here.
          </Link>
        </div>
        <div className="flex w-full justify-between items-center">
          <div className="flex items-center justify-between w-full px-6 pt-1 pb-1 gap-5 border-0">
            <div className="gap-5 flex items-center justify-start">
              <Image
                src={"/images/msg-grey.svg"}
                alt="logo"
                width={20}
                height={20}
              />
              <Dialog
                open={isTitleDialogOpen}
                onOpenChange={setIsTitleDialogOpen}
              >
                <DialogTrigger>
                  <span className="text-muted text-xl">{displayTitle}</span>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[487px]" showX={false}>
                  <DialogHeader>
                    <DialogTitle className="text-center">
                      Edit chat name
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="">
                      <Input
                        id="name"
                        value={inputValue}
                        onChange={handleInputChange}
                        className="col-span-3"
                        placeholder="Enter chat title"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      type="button"
                      onClick={handleSave}
                      disabled={!inputValue.trim()}
                    >
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger hidden={!showShare}>
                <Button size="icon" variant="ghost">
                  <Share2 className="text-gray-500 hover:text-gray-700 w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[487px]" showX={false}>
                <DialogHeader>
                  <DialogTitle className="text-center">
                    Share chat with others
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="">
                    <Select
                      onValueChange={(value) => {
                        handleSelectChange(value);
                      }}
                      defaultValue={shareWithLink ? "link" : "email"}
                    >
                      <SelectTrigger className="">
                        <SelectValue placeholder="Share with" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">With Email</SelectItem>
                        <SelectItem value="link">Anyone With Link</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* dropdown */}
                  {!shareWithLink && (
                    <div className="">
                      <Input
                        id="email"
                        placeholder="Email"
                        value={emailValue}
                        onChange={handleEmailChange}
                        className="col-span-3"
                      />
                      {emailError && (
                        <p className="text-red-500 text-sm">{emailError}</p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
                    <p className="text-sm text-muted">
                      {`${process.env.NEXT_PUBLIC_APP_URL}${pathname}`}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${process.env.NEXT_PUBLIC_APP_URL}${pathname}`
                        );
                        toast.success("Link copied to clipboard");
                      }}
                    >
                      Copy Link
                    </Button>
                  </div>
                  {!shareWithLink && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold">People with access</h3>
                    <ul>
                      
                    {accessList.map((email, index) => (
                      <li key={index} className="flex justify-between">
                       <span>{email}</span> 
                </li>
              ))}
            </ul>
                  </div>
                  )}
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button">Cancel</Button>
                  </DialogClose>
                  <Button
                    type="button"
                    onClick={handleEmailSave}
                    disabled={isShareDisabled()}
                  >
                    Share
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex items-center justify-between gap-4">
            {agentId && allAgents && (
              <div className="flex items-center gap-3 px-4 shadow-md rounded-lg cursor-pointer bg-gray-100">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                <span className="text-gray-700 whitespace-nowrap">
                  {allAgents.find((agent) => agent.id === agentId)?.name ||
                    agentId.replace(/_/g, " ").replace(
                      /([a-z])([A-Z])/g,
                      "$1 $2".replace(/\b\w/g, (char) => char.toUpperCase())
                    )}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;
