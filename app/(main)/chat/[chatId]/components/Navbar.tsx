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
import { toast } from "@/components/ui/sonner";
import { usePathname } from "next/navigation";
import { z } from "zod";
import { Paperclip, Share2, X } from "lucide-react";
import ChatService from "@/services/ChatService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { Visibility } from "@/lib/Constants";

const emailSchema = z
  .string()
  .email({ message: "Invalid email address" })
  .or(z.array(z.string().email({ message: "Invalid email address" })));

const Navbar = ({
  showShare,
  hidden = false,
  chatTitle,
  disableShare = false,
  className,
  showTitle: showTitleProp,
}: {
  showShare?: boolean;
  hidden?: boolean;
  chatTitle?: string;
  disableShare?: boolean;
  className?: string;
  showTitle?: boolean;
}) => {
  const { title, agentId, allAgents } = useSelector(
    (state: RootState) => state.chat
  );
  const pathname = usePathname();
  const { user } = useAuthContext();
  const dispatch = useDispatch();
  const [displayTitle, setDisplayTitle] = useState<string>("Untitled");
  const [inputValue, setInputValue] = useState<string>("");
  const [emailValue, setEmailValue] = useState<string>("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTitleDialogOpen, setIsTitleDialogOpen] = useState(false);
  const showTitle = showTitleProp !== undefined ? showTitleProp : pathname.split("/").pop() !== "newchat";
  const [shareWithLink, setShareWithLink] = useState(false);
  const [accessList, setAccessList] = useState<string[]>([]);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

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
    setHasPendingChanges(true);
  };

  const currentConversationId = usePathname()?.split("/").pop();

  const { refetch: refetchChatTitle } = useQuery({
    queryKey: ["chat-title", currentConversationId],
    queryFn: async () => {
      const headers = await getHeaders();
      try {
        const response = await axios.patch(
          `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${currentConversationId}/rename`,
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

      toast.success("URL copied to clipboard");

      return res;
    },
    enabled: false,
  });

  const handleEmailSave = async () => {
    try {
      if (disableShare) throw new Error("Unable to share the chat");

      if (shareWithLink) {
        const res = await refetchChatShare();
        if (res.data.type === "error") return;
      } else {
        const emails = emailValue.split(",").map((email) => email.trim());
        emails.forEach((email) => emailSchema.parse(email));
        const res = await refetchChatShare();
        if (res.data.type === "error") return;
      }

      setHasPendingChanges(false);
      setIsDialogOpen(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setEmailError(error.errors[0].message);
      } else {
        setEmailError("An error occurred while sharing the chat.");
      }
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}${pathname}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("URL copied to clipboard");
  };

  const isShareDisabled = () => {
    if (disableShare) return true;
    if (shareWithLink) return false;
    const emails = emailValue.split(",").map((email) => email.trim());
    return emails.some((email) => !/\S+@\S+\.\S+/.test(email));
  };

  const isPeopleWithAccessVisible = () => {
    if (disableShare || shareWithLink) return false;
  };

  const { refetch: refetchAccessList } = useQuery({
    queryKey: ["access-list", currentConversationId],
    queryFn: async () => {
      if (!currentConversationId) return;
      try {
        const response = await ChatService.getChatAccess(currentConversationId);
        if ("data" in response) {
          if (Array.isArray(response.data)) {
            setAccessList(response.data);
          }

          return response.data;
        }
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to update title");
        return err.response?.data;
      }
    },
    enabled: false,
  });
  useEffect(() => {
    if (isDialogOpen) {
      refetchAccessList(); // Refetch access list when dialog opens
    }
  }, [isDialogOpen, refetchAccessList]);

  const handleSelectChange = (value: string) => {
    setShareWithLink(value === "link");
    setHasPendingChanges(true);
    if (value === "email") {
      setEmailValue(""); // Reset email value when switching
      setEmailError(null); // Clear email error if switching to link
      refetchAccessList(); // Fetch access list again for email option
    }
  };

  const handleDelete = async (email: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL;
      await axios.delete(
        `${baseUrl}/api/v1/conversations/${currentConversationId}/access`,
        {
          headers: await getHeaders(),
          data: {
            emails: [email],
          },
        }
      );
      setAccessList(accessList.filter((e) => e !== email));

      toast.success(`Access for ${email} has been removed.`);
    } catch (error) {
      toast.error(`Failed to remove access for ${email}.`);
    }
  };

  // Reset pending changes when dialog opens/closes
  useEffect(() => {
    if (!isDialogOpen) {
      setHasPendingChanges(false);
    }
  }, [isDialogOpen]);

  if (hidden) return null;
  const isNewChat = pathname?.endsWith("/newchat") ?? false;
  return (
    <header
      className={
        isNewChat
          ? "sticky top-0 z-50 border-b border-border-light"
          : "sticky top-0 z-50 bg-[#FFFDFC] border-b border-[#E3E3E3]"
      }
      style={isNewChat ? { backgroundColor: "#FAF8F7" } : undefined}
    >
      {showTitle && (
        <div className="flex h-[52px] w-full">
          <div className="flex items-center justify-between w-full px-4 lg:px-6">
            <div className="flex items-center gap-5 min-w-0 flex-1">
              <Image
                src={"/images/msg-grey.svg"}
                alt="logo"
                width={20}
                height={20}
                className="flex-shrink-0"
              />
              <Dialog
                open={isTitleDialogOpen}
                onOpenChange={setIsTitleDialogOpen}
              >
                <DialogTrigger className="min-w-0 flex-1 text-left">
                  <span className="text-black text-xl truncate block">
                    {displayTitle}
                  </span>
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
            <div className="flex items-center gap-4">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger hidden={!showShare}>
                  <Button size="icon" variant="outline">
                    <Share2 className="text-gray-500 hover:text-gray-700 w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[487px] rounded-lg shadow-lg bg-white p-6">
                  <DialogHeader>
                    <DialogTitle className="text-center font-semibold text-xl">
                      Share Chat with Others
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Select
                      onValueChange={(value) => handleSelectChange(value)}
                      defaultValue={shareWithLink ? "link" : "email"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Share with" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">With Email</SelectItem>
                        <SelectItem value="link">Anyone With Link</SelectItem>
                      </SelectContent>
                    </Select>

                    {!shareWithLink && (
                      <div>
                        <Input
                          id="email"
                          placeholder="Enter Email"
                          value={emailValue}
                          onChange={handleEmailChange}
                          className="border rounded-md p-3 w-full h-15"
                        />
                        {emailError && (
                          <p className="text-red-500 text-sm">{emailError}</p>
                        )}
                      </div>
                    )}
                    {!shareWithLink && !isPeopleWithAccessVisible() && (
                      <>
                        <h3 className="mt-4 text-lg font-semibold">
                          People with access
                        </h3>
                        <ScrollArea className="max-h-40 overflow-y-scroll px-2 mt-2 space-y-3">
                          <Card className="border-gray-300 w-[95%] mx-auto">
                            <CardContent className="flex justify-between p-4">
                              <div className="flex flex-col">
                                <p>{user?.displayName} (You)</p>
                                <p className="text-sm text-muted">
                                  {user?.email}
                                </p>
                              </div>
                              <div className="text-muted text-sm">Owner</div>
                            </CardContent>
                          </Card>

                          {accessList.map((email) => (
                            <Card
                              key={email}
                              className="relative border border-gray-300 w-[95%] mx-auto my-2 shadow-sm rounded-lg"
                            >
                              {email !== user?.email && (
                                <Button
                                  onClick={() => handleDelete(email)}
                                  className="absolute -top-3 -right-3 bg-background rounded-full p-1 h-5 w-5 shadow hover:bg-primary-100 text-gray-600 hover:text-primary transition"
                                  aria-label="Delete viewer"
                                >
                                  <X size={14} />
                                </Button>
                              )}
                              <CardContent className="p-4 flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-800">
                                  {email}
                                </p>
                                <p className="text-gray-500 text-sm">
                                  {email === user?.email ? "Owner" : "Viewer"}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </ScrollArea>
                      </>
                    )}
                  </div>

                  <DialogFooter className="!justify-between">
                    <Button
                      type="button"
                      className="gap-2"
                      variant="outline"
                      onClick={handleCopyLink}
                      disabled={(!shareWithLink && hasPendingChanges) || disableShare}
                    >
                      <Paperclip className="w-4 h-4" /> Copy Link
                    </Button>
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
              {agentId && allAgents && (
                <div className="flex items-center gap-3 px-4 py-2 shadow-md rounded-lg cursor-pointer bg-gray-100">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-ping flex-shrink-0"></span>
                  <span className="text-gray-700 truncate max-w-[200px]">
                    {allAgents.find((agent) => agent.id === agentId)?.name ||
                      agentId
                        .replace(/_/g, " ")
                        .replace(/([a-z])([A-Z])/g, "$1 $2")
                        .replace(/\b\w/g, (char) => char.toUpperCase())}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

