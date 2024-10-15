"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import debounce from "debounce";
import getHeaders from "@/app/utils/headers.util";
import axios from "axios";
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
import { LucideEdit, LucideTrash } from "lucide-react"; // Import the icons

const AllChats = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const dispatch = useDispatch();
  const [title, setTitle] = useState("");
  const [inputValue, setInputValue] = useState(title);
  const [currentConversationId, setCurrentConversationId] = useState("");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["all-chats"],
    queryFn: async () => {
      const headers = await getHeaders();
      const response = await axios.get(`${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/user/conversations`, {
        params: {
          start: 0,
          limit: 1000,
        },
        headers: headers,
      });
      return response.data.reverse();
    },
  });

  const { data: chats, refetch: refetchChatTitle } = useQuery({
    queryKey: ["chat-title"],
    queryFn: async () => {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const headers = await getHeaders();
      axios
        .patch(
          `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${currentConversationId}/rename/`,
          {
            title: inputValue,
          },
          { headers: headers }
        )
        .then((res) => {
          if (res.data.status === "success") {
            refetch();
            toast.success("Title updated successfully");
          }
          return res.data;
        })
        .catch((err) => {
          console.log(err);
          return err.response.data;
        });
    },
    enabled: false,
  });
  const { refetch: refetchChatDelete } = useQuery({
    queryKey: ["chat-title"],
    queryFn: async () => {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const headers = await getHeaders();
      if (currentConversationId === "" || !currentConversationId) return;
      axios
        .delete(`${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${currentConversationId}/`, {
          headers,
        })
        .then((res) => {
          if (res.status === 200) {
            refetch();
            toast.success("Chat deleted Successfully");
          }
          return res.data;
        })
        .catch((err) => {
          console.log(err);
          toast.error("Unable to delete chat");
          return err.response.data;
        });
    },
    enabled: false,
  });

  const handleSave = () => {
    refetchChatTitle();
    dispatch(setChat({ title: inputValue }));
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
    dispatch(setChat({ agentId: chat.agent_id, temporaryContext: { branch: chat.branch, repo: chat.repository }, selectedNodes: [], title: chat.title, chatFlow: "EXISTING_CHAT" }));
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
              <TableHead className="w-[200px] text-primary">Agent</TableHead> {/* Moved Agent up */}
              <TableHead className="w-[200px] text-primary">Repository</TableHead>
              <TableHead className="w-[200px] text-primary">Branch</TableHead>
              <TableHead className="w-[200px] text-primary">Created At</TableHead> {/* Moved Created At down */}
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
                    <Link href={`/chat/${chat.id}`} onClick={() => handleChatClick(chat)} >
                      {chat.agent_id.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </Link>
                  </TableCell>
                  <TableCell><Link href={`/chat/${chat.id}`} onClick={() => handleChatClick(chat)} >{chat?.repository}</Link></TableCell>
                  <TableCell><Link href={`/chat/${chat.id}`} onClick={() => handleChatClick(chat)} >{chat?.branch}</Link></TableCell>
                  <TableCell><Link href={`/chat/${chat.id}`} onClick={() => handleChatClick(chat)} >{new Date(chat.created_at).toLocaleString()}</Link></TableCell> {/* Moved Created At down */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-5">
                      <div className="flex gap-3">
                        <Dialog>
                          <DialogTrigger>
                            <Button
                              onClick={(e: any) => {
                                setTitle(chat.title);
                                setInputValue(chat.title);
                                setCurrentConversationId(chat.id);
                              }}
                            >
                              <LucideEdit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent
                            className="sm:max-w-[487px]"
                            showX={false}
                          >
                            <DialogHeader>
                              <DialogTitle className="text-center">
                                Edit chat name
                              </DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="  ">
                                <Input
                                  id="name"
                                  value={inputValue}
                                  onChange={handleInputChange}
                                  className="col-span-3"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button type="button">Cancel</Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button type="button" onClick={handleSave}>
                                  Save
                                </Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <Button
                        variant="outline"
                        className="configure-button hover:bg-gray-200"
                        onClick={(e: any) => {
                          setCurrentConversationId(chat.id);
                          refetchChatDelete();
                        }}
                      >
                        <LucideTrash className="h-4 w-4" /> {/* Delete icon */}
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
          <p className="text-primary text-center py-5">
            No chats found.
          </p>
        </div>
      )}
    </div>
  );
};

export default AllChats;
