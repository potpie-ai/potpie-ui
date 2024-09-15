"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const AllChats = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const dispatch = useDispatch();
  const [title, setTitle] = useState("");
  const [inputValue, setInputValue] = useState(title);
  const [currentConversationId, setCurrentConversationId] = useState("");
  const [currentProjectId, setCurrentProjectId] = useState("");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["all-chats"],
    queryFn: async () => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await axios.get(`${baseUrl}/api/v1/user/conversations`, {
        params:{
          start:0,
          limit: 1000,
        },
        headers: headers,
      });
      return response.data.reverse();
    },
  });

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

  const {data:chats, refetch: refetchChatTitle } = useQuery({
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
      axios
        .delete(`${baseUrl}/api/v1/projects`, {
          params: {
            project_id: currentProjectId,
          },headers
        })
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
  const handleSave = () => {
    refetchChatTitle();
    dispatch(setChat({ title: inputValue }));
  };

  return (
    <section className="max-w-2xl w-full space-y-4 h-full mx-auto">
      <div className="flex w-full mx-auto items-center space-x-2">
        <Input
          type="text"
          placeholder="Search your chats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {isLoading ? (
        <>
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton key={index} className="w-full h-16" />
          ))}
        </>
      ) : (
        <div className="flex flex-col gap-4">
          {data
            .filter((chat: any) =>
              chat.title
                .toLowerCase()
                .includes(debouncedSearchTerm.toLowerCase())
            )
            .map((chat: any) => (
              <Card
                key={chat.id}
                className="border-none shadow-lg hover:scale-105 transition-all duration-300"
                onClick={() =>
                  dispatch(
                    setChat({
                      currentConversationId: chat.id,
                      title: chat.title,
                    })
                  )
                }
              >
                <CardHeader className="py-3">
                  <CardTitle className="text-xl flex w-full justify-between items-center">
                    <Link href={`/chat/${chat.id}`}>
                      <p> {chat.title}</p>
                    </Link>
                    <div className="flex gap-3">
                      <Dialog>
                        <DialogTrigger>
                          <Button
                            size="icon"
                            onClick={(e: any) => {
                              setTitle(chat.title);
                              setInputValue(chat.title);
                              setCurrentConversationId(chat.id);
                            }}
                          >
                            <Edit />
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
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={(e: any) => {
                          setCurrentProjectId(chat.project_ids[0]);
                          refetchChatDelete();
                        }}
                      >
                        <Trash />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {dayjs(chat.updated_at).format("MMM DD, YYYY")}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
        </div>
      )}
    </section>
  );
};

export default AllChats;
