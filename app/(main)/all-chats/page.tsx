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
import dayjs from "dayjs";
import { Edit, Edit2, Trash } from "lucide-react";
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
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await axios.get(`${baseUrl}/api/v1/user/conversations`, {
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
          `${baseUrl}/api/v1/conversations/${currentConversationId}/rename/`,
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
        .delete(`${baseUrl}/api/v1/conversations/${currentConversationId}/`, {
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
            <TableRow className="border-b-8 border-border font-semibold text-red">
              <TableHead className="w-[200px] text-primary">Title</TableHead>
              <TableHead className="w-[200px] text-primary">Created At</TableHead>
              <TableHead className="w-[200px] text-primary">Status</TableHead>
              <TableHead className="w-[200px] text-primary">Repository</TableHead>
              <TableHead className="w-[200px] text-primary">Branch</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((chat: any) => (
              <TableRow key={chat.id} className="hover:bg-red">
                <TableCell>{chat.title}</TableCell>
                <TableCell>{new Date(chat.created_at).toLocaleString()}</TableCell>
                <TableCell>{chat.status}</TableCell>
                <TableCell>{chat?.repository}</TableCell>
                <TableCell>{chat?.branch}</TableCell>
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
                            Rename
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
                      Delete
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

