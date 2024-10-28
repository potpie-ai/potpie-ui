"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import debounce from "debounce";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { setChat } from "@/lib/state/Reducers/chat";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LucideEdit, LucideTrash } from "lucide-react";
import ChatService from "@/services/ChatService"; 

const AllChats = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const dispatch = useDispatch();
  const [title, setTitle] = useState("");
  const [inputValue, setInputValue] = useState(title);
  const [currentConversationId, setCurrentConversationId] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["all-chats"],
    queryFn: ChatService.getAllChats,
  });

  const handleSave = async () => {
    try {
      const result = await ChatService.renameChat(currentConversationId, inputValue);
      if (result.status === "success") {
        refetch();
        toast.success("Title updated successfully");
        dispatch(setChat({ title: inputValue }));
      }
    } catch (err) {
      console.error("Error renaming chat", err);
      toast.error("Unable to rename chat");
    }
  };

  const handleDeleteChat = async () => {
    try {
      const result = await ChatService.deleteChat(currentConversationId);
      if (result) {
        refetch();
        toast.success("Chat deleted successfully");
      }
    } catch (err) {
      console.error("Error deleting chat", err);
      toast.error("Unable to delete chat");
    }
  };

  useEffect(() => {
    const handler = debounce((value) => {
      setDebouncedSearchTerm(value);
    }, 500);

    handler(searchTerm);

    return () => {
      handler.clear();
    };
  }, [searchTerm]);

  const handleInputChange = (event: any) => {
    setInputValue(event.target.value);
  };

  const handleChatClick = (chat: any) => {
    dispatch(setChat({ agentId: chat.agent_id, temporaryContext: { branch: chat.branch, repo: chat.repository, projectId: chat.project_ids[0] }, selectedNodes: [], title: chat.title, chatFlow: "EXISTING_CHAT" }));
  };

  return (
    <div className="m-10">
      <div className="flex w-full mx-auto items-center space-x-2">
        <Input
          type="text"
          placeholder="Search your chats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {!isLoading && data && data.length > 0 ? (
        <Table className="mt-10">
          <TableHeader className="font-semibold text-red">
            <TableRow className="border-b border-border font-semibold text-red">
              <TableHead className="w-[200px] text-primary">Title</TableHead>
              <TableHead className="w-[200px] text-primary">Agent</TableHead>
              <TableHead className="w-[200px] text-primary">Repository</TableHead>
              <TableHead className="w-[200px] text-primary">Branch</TableHead>
              <TableHead className="w-[200px] text-primary">Created At</TableHead>
              <TableHead className="w-[200px] text-primary text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // Sort by created_at in descending order
              .map((chat: any) => (
                <TableRow key={chat.id} className="hover:bg-red border-b border-gray-200">
                  <TableCell><Link href={`/chat/${chat.id}`} onClick={() => handleChatClick(chat)}>{chat.title}</Link></TableCell>
                  <TableCell>
                    <Link href={`/chat/${chat.id}`} onClick={() => handleChatClick(chat)}>
                      {chat.agent_id.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </Link>
                  </TableCell>
                  <TableCell><Link href={`/chat/${chat.id}`} onClick={() => handleChatClick(chat)}>{chat?.repository}</Link></TableCell>
                  <TableCell><Link href={`/chat/${chat.id}`} onClick={() => handleChatClick(chat)}>{chat?.branch}</Link></TableCell>
                  <TableCell><Link href={`/chat/${chat.id}`} onClick={() => handleChatClick(chat)}>{new Date(chat.created_at).toLocaleString()}</Link></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-5">
                      <div className="flex gap-3">
                        <Dialog>
                          <DialogTrigger>
                            <Button
                              onClick={() => {
                                setTitle(chat.title);
                                setInputValue(chat.title);
                                setCurrentConversationId(chat.id);
                              }}
                            >
                              <LucideEdit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[487px]" showX={false}>
                            <DialogHeader>
                              <DialogTitle className="text-center">
                                Edit chat name
                              </DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <Input id="name" value={inputValue} onChange={handleInputChange} className="col-span-3" />
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button type="button">Cancel</Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button type="button" onClick={handleSave}>Save</Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <Button variant="outline" className="configure-button hover:bg-gray-200" onClick={() => {
                        setCurrentConversationId(chat.id);
                        handleDeleteChat();
                      }}>
                        <LucideTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      ) : isLoading ? (
        <Skeleton className="h-6 mt-4 w-full" />
      ) : (
        <div className="flex flex-col items-start h-full w-full">
          <p className="text-primary text-center py-5">No chats found.</p>
        </div>
      )}
    </div>
  );
};

export default AllChats;