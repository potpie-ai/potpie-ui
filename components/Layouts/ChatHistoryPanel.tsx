"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { useDispatch } from "react-redux";
import debounce from "debounce";
import {
  MoreHorizontal,
} from "lucide-react";
import Image from "next/image";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import ChatService from "@/services/ChatService";
import { setChat } from "@/lib/state/Reducers/chat";
import { AppDispatch } from "@/lib/state/store";
import { Visibility } from "@/lib/Constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea as ScrollAreaPrimitive } from "@radix-ui/react-scroll-area";
import { X } from "lucide-react";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { useAuthContext } from "@/contexts/AuthContext";
import { z } from "zod";

interface Chat {
  id: string;
  title: string;
  agent_id?: string;
  repository?: string;
  branch?: string;
  project_ids?: string[];
  created_at: string;
  isPinned?: boolean;
}

const emailSchema = z
  .string()
  .email({ message: "Invalid email address" })
  .or(z.array(z.string().email({ message: "Invalid email address" })));

export function ChatHistoryPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch: AppDispatch = useDispatch();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [pinnedChats, setPinnedChats] = useState<Set<string>>(new Set());

  // Dialog states
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Share dialog states
  const [emailValue, setEmailValue] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [shareWithLink, setShareWithLink] = useState(false);
  const [accessList, setAccessList] = useState<string[]>([]);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [shareInProgress, setShareInProgress] = useState(false);

  // Load pinned chats from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("pinnedChats");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPinnedChats(new Set(parsed));
      } catch (e) {
        console.error("Failed to parse pinned chats", e);
      }
    }
  }, []);

  // Save pinned chats to localStorage
  const savePinnedChats = useCallback((pins: Set<string>) => {
    localStorage.setItem("pinnedChats", JSON.stringify(Array.from(pins)));
    setPinnedChats(pins);
  }, []);

  const handlePinChat = useCallback(
    (chatId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newPins = new Set(pinnedChats);
      if (newPins.has(chatId)) {
        newPins.delete(chatId);
        toast.success("Chat unpinned");
      } else {
        newPins.add(chatId);
        toast.success("Chat pinned");
      }
      savePinnedChats(newPins);
    },
    [pinnedChats, savePinnedChats]
  );

  // Debounce search
  useEffect(() => {
    const handler = debounce((value: string) => {
      setDebouncedSearchTerm(value);
    }, 300);

    handler(searchTerm);

    return () => {
      handler.clear();
    };
  }, [searchTerm]);

  // Fetch chats
  const { data: chats, isLoading } = useQuery<Chat[]>({
    queryKey: ["sidebar-chats"],
    queryFn: () => ChatService.getAllChats(),
    staleTime: 60000, // 1 minute
  });

  // Filter and sort chats
  const filteredChats = useMemo(() => {
    if (!chats) return [];

    // Get all pinned chats that aren't builds
    const pinnedChatList = chats.filter((chat) => {
      const chatRecipeId = (chat as any).recipe_id || (chat as any).recipeId;
      return !chatRecipeId && pinnedChats.has(chat.id);
    });

    // Get filtered non-pinned chats (excluding builds)
    const nonPinnedChats = chats.filter((chat) => {
      const chatRecipeId = (chat as any).recipe_id || (chat as any).recipeId;
      if (chatRecipeId) return false;
      if (pinnedChats.has(chat.id)) return false;

      if (!debouncedSearchTerm) return true;
      const searchLower = debouncedSearchTerm.toLowerCase();
      return (
        chat.title?.toLowerCase().includes(searchLower) ||
        chat.repository?.toLowerCase().includes(searchLower) ||
        chat.branch?.toLowerCase().includes(searchLower) ||
        chat.agent_id?.toLowerCase().includes(searchLower)
      );
    });

    // Sort pinned chats by created_at descending
    const sortedPinned = pinnedChatList.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Sort non-pinned chats by created_at descending
    const sortedNonPinned = nonPinnedChats.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Combine: pinned first, then filtered non-pinned
    return [...sortedPinned, ...sortedNonPinned];
  }, [chats, debouncedSearchTerm, pinnedChats]);

  const handleChatClick = useCallback(
    (chat: Chat) => {
      dispatch(
        setChat({
          agentId: chat.agent_id || "",
          temporaryContext: {
            branch: chat.branch || "",
            repo: chat.repository || "",
            projectId: chat.project_ids?.[0] || "",
          },
          selectedNodes: [],
          title: chat.title,
          chatFlow: "EXISTING_CHAT",
        })
      );
      router.push(`/chat/${chat.id}`);
    },
    [dispatch, router]
  );

  const openRenameDialog = useCallback((chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedChat(chat);
    setRenameValue(chat.title);
    setRenameDialogOpen(true);
  }, []);

  const openShareDialog = useCallback((chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedChat(chat);
    setEmailValue("");
    setEmailError(null);
    setShareWithLink(false);
    setHasPendingChanges(false);
    setShareInProgress(false);
    setAccessList([]);
    setShareDialogOpen(true);
  }, []);

  const openDeleteDialog = useCallback((chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedChat(chat);
    setDeleteDialogOpen(true);
  }, []);

  const handleRename = useCallback(async () => {
    if (!selectedChat || !renameValue.trim()) return;

    try {
      const result = await ChatService.renameChat(selectedChat.id, renameValue);
      if (result.status === "success") {
        toast.success("Chat renamed successfully");
        queryClient.invalidateQueries({ queryKey: ["sidebar-chats"] });
        queryClient.invalidateQueries({ queryKey: ["all-chats"] });
        // Only update the global active chat state if the renamed chat is the currently active one
        if (pathname === `/chat/${selectedChat.id}`) {
          dispatch(setChat({ title: renameValue }));
        }
        setRenameDialogOpen(false);
      }
    } catch (err) {
      console.error("Error renaming chat", err);
      toast.error("Failed to rename chat");
    }
  }, [selectedChat, renameValue, queryClient, dispatch, pathname]);

  const handleDelete = useCallback(async () => {
    if (!selectedChat) return;

    try {
      const result = await ChatService.deleteChat(selectedChat.id);
      if (result) {
        toast.success("Chat deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["sidebar-chats"] });
        queryClient.invalidateQueries({ queryKey: ["all-chats"] });
        setDeleteDialogOpen(false);

        // If we're currently on the deleted chat's page, redirect to newchat
        if (pathname === `/chat/${selectedChat.id}`) {
          router.push("/newchat");
        }
      }
    } catch (err) {
      console.error("Error deleting chat", err);
      toast.error("Failed to delete chat");
    }
  }, [selectedChat, queryClient, pathname, router]);

  // Share functionality
  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmailValue(event.target.value);
    setEmailError(null);
    setHasPendingChanges(true);
  };

  const handleSelectChange = (value: string) => {
    setShareWithLink(value === "link");
    setHasPendingChanges(true);
    if (value === "email") {
      setEmailValue("");
      setEmailError(null);
      refetchAccessList();
    }
  };

  const handleCopyLink = async () => {
    if (!selectedChat) return;

    // If share with link is selected but changes haven't been applied yet,
    // we need to make the chat public first before copying the link
    if (shareWithLink && hasPendingChanges) {
      setShareInProgress(true);
      try {
        const res = await ChatService.shareConversation(
          selectedChat.id,
          [],
          Visibility.PUBLIC
        );
        if (res.type === "error") {
          toast.error(res.message || "Unable to share");
          return;
        }
        setHasPendingChanges(false);
      } catch (error) {
        toast.error("An error occurred while making the chat public.");
        return;
      } finally {
        setShareInProgress(false);
      }
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/chat/${selectedChat.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("URL copied to clipboard");
  };

  const isShareDisabled = () => {
    if (shareInProgress) return true;
    if (shareWithLink) return false;
    const emails = emailValue.split(",").map((email) => email.trim());
    return emails.some((email) => !/\S+@\S+\.\S+/.test(email));
  };

  const { refetch: refetchAccessList } = useQuery({
    queryKey: ["access-list", selectedChat?.id],
    queryFn: async () => {
      if (!selectedChat) return;
      try {
        const response = await ChatService.getChatAccess(selectedChat.id);
        if ("data" in response && Array.isArray(response.data)) {
          setAccessList(response.data);
          return response.data;
        }
      } catch (err: any) {
        console.error(err);
        return [];
      }
    },
    enabled: false,
  });

  useEffect(() => {
    if (shareDialogOpen && selectedChat && !shareWithLink) {
      refetchAccessList();
    }
  }, [shareDialogOpen, selectedChat, shareWithLink, refetchAccessList]);

  const handleShare = async () => {
    if (!selectedChat) return;

    setShareInProgress(true);
    try {
      if (shareWithLink) {
        const res = await ChatService.shareConversation(
          selectedChat.id,
          [],
          Visibility.PUBLIC
        );
        if (res.type === "error") {
          toast.error(res.message || "Unable to share");
          return;
        }
        handleCopyLink();
      } else {
        const emails = emailValue.split(",").map((email) => email.trim());
        const validationErrors: string[] = [];
        for (const email of emails) {
          const result = emailSchema.safeParse(email);
          if (!result.success) {
            validationErrors.push(result.error.errors[0].message);
          }
        }
        if (validationErrors.length > 0) {
          setEmailError(validationErrors.join("; "));
          throw new Error("Validation failed");
        }
        const res = await ChatService.shareConversation(
          selectedChat.id,
          emails,
          Visibility.PRIVATE
        );
        if (res.type === "error") {
          toast.error(res.message || "Unable to share");
          return;
        }
        toast.success("Chat shared successfully");
      }

      setHasPendingChanges(false);
      setShareDialogOpen(false);
    } catch (error) {
      if (error instanceof Error && error.message === "Validation failed") {
        // Validation errors are already set in state above
      } else {
        setEmailError("An error occurred while sharing the chat.");
      }
    } finally {
      setShareInProgress(false);
    }
  };

  const handleDeleteAccess = async (email: string) => {
    if (!selectedChat) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL;
      await axios.delete(
        `${baseUrl}/api/v1/conversations/${selectedChat.id}/access`,
        {
          headers: await getHeaders(),
          data: { emails: [email] },
        }
      );
      setAccessList(accessList.filter((e) => e !== email));
      toast.success(`Access for ${email} has been removed.`);
    } catch (error) {
      toast.error(`Failed to remove access for ${email}.`);
    }
  };

  const isActiveChat = useCallback(
    (chatId: string) => {
      return pathname === `/chat/${chatId}`;
    },
    [pathname]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header with Search Icon */}
      <div className="px-6 py-2 flex items-center justify-between">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider" style={{ fontFamily: 'Uncut Sans, sans-serif' }}>
          Your Chats
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowSearchInput(!showSearchInput)}
        >
          <Image
            src="/images/search-01.svg"
            alt="Search"
            width={16}
            height={16}
          />
        </Button>
      </div>

      {/* Search Input - shown when search icon is clicked */}
      {showSearchInput && (
        <div className="px-6 pb-2">
          <Input
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-xs bg-white border-zinc-200"
            autoFocus
          />
        </div>
      )}

      {/* Chat List */}
      <ScrollArea className="h-[360px] px-4">
        <div className="space-y-0.5 pb-2">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-2 py-1.5">
                <Skeleton className="h-5 w-full" />
              </div>
            ))
          ) : filteredChats.length === 0 ? (
            <div className="px-4 py-4 text-center">
              <p className="text-xs text-muted-foreground">
                {debouncedSearchTerm
                  ? "No chats found"
                  : "No chats yet"}
              </p>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isPinned = pinnedChats.has(chat.id);
              const isActive = isActiveChat(chat.id);
              const isHovered = hoveredChatId === chat.id;
              const isDropdownOpen = openDropdownId === chat.id;

              return (
                <div
                  key={chat.id}
                  onClick={() => handleChatClick(chat)}
                  onMouseEnter={() => setHoveredChatId(chat.id)}
                  onMouseLeave={() => setHoveredChatId(null)}
                  className={cn(
                    "group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors",
                    isActive
                      ? "bg-[#F4F4F4] text-primary font-medium"
                      : "hover:bg-[#F4F4F4] text-zinc-700"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    <span className="truncate text-sm block max-w-[160px]" style={{ fontFamily: 'Uncut Sans, sans-serif' }}>
                      {chat.title || "Untitled Chat"}
                    </span>
                    {isPinned && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-primary">
                        <line x1="12" y1="17" x2="12" y2="22"/>
                        <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/>
                      </svg>
                    )}
                  </div>

                  {/* 3-dots menu button - visible on hover or when dropdown is open */}
                  <div
                    className={cn(
                      "relative shrink-0 transition-opacity duration-150",
                      (isHovered || isDropdownOpen) ? "opacity-100" : "opacity-0"
                    )}
                  >
                    <DropdownMenu
                      open={isDropdownOpen}
                      onOpenChange={(open) => setOpenDropdownId(open ? chat.id : null)}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="right"
                        align="start"
                        className="w-40 bg-[#FFFFFF] border-[#E6E8E9]"
                      >
                        <DropdownMenuItem
                          onClick={(e) => openShareDialog(chat, e)}
                          className="focus:bg-[#F4F4F4] cursor-pointer"
                        >
                          <Image
                            src="/images/share-03.svg"
                            alt="Share"
                            width={16}
                            height={16}
                            className="mr-2"
                          />
                          <span>Share</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => openRenameDialog(chat, e)}
                          className="focus:bg-[#F4F4F4] cursor-pointer"
                        >
                          <Image
                            src="/images/pen-01.svg"
                            alt="Rename"
                            width={16}
                            height={16}
                            className="mr-2"
                          />
                          <span>Rename</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handlePinChat(chat.id, e)}
                          className="focus:bg-[#F4F4F4] cursor-pointer"
                        >
                          {isPinned ? (
                            <>
                              <Image
                                src="/images/unpin.svg"
                                alt="Unpin"
                                width={16}
                                height={16}
                                className="mr-2"
                              />
                              <span>Unpin Chat</span>
                            </>
                          ) : (
                            <>
                              <Image
                                src="/images/pin.svg"
                                alt="Pin"
                                width={16}
                                height={16}
                                className="mr-2"
                              />
                              <span>Pin Chat</span>
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-[#E6E8E9]" />
                        <DropdownMenuItem
                          onClick={(e) => openDeleteDialog(chat, e)}
                          className="text-red-600 focus:text-red-600 focus:bg-[#F4F4F4] cursor-pointer"
                        >
                          <Image
                            src="/images/delete-02.svg"
                            alt="Delete"
                            width={16}
                            height={16}
                            className="mr-2"
                          />
                          <span>Delete Chat</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" showX={false}>
          <DialogHeader>
            <DialogTitle className="text-center">Rename chat</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter chat name"
              className="col-span-3"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleRename}
              disabled={!renameValue.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-[487px] rounded-lg shadow-lg bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-center font-semibold text-xl">
              Share Chat with Others
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Select
              onValueChange={handleSelectChange}
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
                  <p className="text-red-500 text-sm mt-1">{emailError}</p>
                )}
              </div>
            )}

            {!shareWithLink && (
              <>
                <h3 className="mt-4 text-lg font-semibold">
                  People with access
                </h3>
                <ScrollAreaPrimitive className="max-h-40 overflow-y-scroll px-2 mt-2 space-y-3">
                  <Card className="border-gray-300 w-[95%] mx-auto">
                    <CardContent className="flex justify-between p-4">
                      <div className="flex flex-col">
                        <p>{user?.displayName || "You"} (You)</p>
                        <p className="text-sm text-muted">{user?.email}</p>
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
                          onClick={() => handleDeleteAccess(email)}
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
                </ScrollAreaPrimitive>
              </>
            )}
          </div>

          <DialogFooter className="!justify-between">
            <Button
              type="button"
              className="gap-2"
              variant="outline"
              onClick={handleCopyLink}
              disabled={shareInProgress || (!shareWithLink && hasPendingChanges)}
            >
              Copy Link
            </Button>
            <Button
              type="button"
              onClick={handleShare}
              disabled={isShareDisabled()}
            >
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" showX={false}>
          <DialogHeader>
            <DialogTitle className="text-center">Delete chat</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground text-center">
              Are you sure you want to delete &quot;{selectedChat?.title || "this chat"}
              &quot;? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
