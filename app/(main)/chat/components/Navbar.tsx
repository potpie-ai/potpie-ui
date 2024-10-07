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
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import { setChat } from "@/lib/state/Reducers/chat";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { Share2Icon } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email({ message: "Invalid email address" });
import { Download, Share2 } from "lucide-react";

const Navbar = ({ showShare }: { showShare?: boolean }) => {
  const { title, agentId, allAgents } = useSelector(
    (state: RootState) => state.chat
  );
  const pathname = usePathname();
  const dispatch = useDispatch();
  const [inputValue, setInputValue] = useState(title);
  const [emailValue, setEmailValue] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleInputChange = (event: any) => {
    setInputValue(event.target.value);
  };

  const handleEmailChange = (event: any) => {
    setEmailValue(event.target.value);
    setEmailError(null);
  };

  const currentConversationId = usePathname()?.split("/").pop();
  const { refetch: refetchChatTitle } = useQuery({
    queryKey: ["chat-title"],
    queryFn: async () => {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const headers = await getHeaders();
      axios
        .patch(
          `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${currentConversationId}/rename/`,
          { title: inputValue },
          { headers: headers }
        )
        .then((res) => {
          if (res.data.status === "success")
            toast.success("Title updated successfully");
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
  const { refetch: refetchChatShare } = useQuery({
    queryKey: ["chat-share"],
    queryFn: async () => {
      const headers = await getHeaders();
      axios
        .post(
          `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/share`,
          {
            conversation_id: currentConversationId,
            recipientEmails: [emailValue],
          },
          { headers: headers }
        )
        .then((res) => {
          navigator.clipboard.writeText(`https://app.potpie.ai` + pathname);
          toast.success("Link copied to clipboard");
          return res.data;
        })
        .catch((err) => {
          console.log(err);
          toast.error("Unable to share");
          return err.response.data;
        });
    },
    enabled: false,
  });
  const handleEmailSave = () => {
    try {
      emailSchema.parse(emailValue);
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      refetchChatShare();
      setIsDialogOpen(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setEmailError(error.errors[0].message);
      }
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white flex h-[70px] items-center border-b border-[#E3E3E3] flex-col justify-between text-secondary -m-4 lg:-m-6 ">
        <div className="bg-[#4479FF] w-full text-center bg-opacity-[0.37] text-muted">
          🌎 join our next webinar on getting started with open source.{" "}
          <Link href={"#"} className="text-[#0267FF] underline">
            Click here
          </Link>
        </div>
        <div className="flex w-full justify-between items-center">
          <div className="flex items-center justify-between w-full px-6 pb-2 gap-5 ">
            <div className="gap-5 flex items-center justify-start">
              <Image
                src={"/images/msg-grey.svg"}
                alt="logo"
                width={20}
                height={20}
              />
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger>
                  <span className="text-muted text-xl">{title}</span>
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
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button">Cancel</Button>
                    </DialogClose>
                    <Button type="button" onClick={handleSave}>
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
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button">Cancel</Button>
                  </DialogClose>
                  <Button
                    type="button"
                    onClick={handleEmailSave}
                    disabled={emailValue === ""}
                  >
                    Share
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <Download className="text-gray-500 hover:text-gray-700 w-5 h-5" />
            <div className="flex items-center gap-3 px-4 shadow-md rounded-lg cursor-pointer bg-gray-100">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
              <span className="text-gray-700">
                {agentId &&
                  allAgents &&
                  (allAgents.find((agent) => agent.id === agentId)?.name ||
                    agentId
                      .replace(/_/g, " ")
                      .replace(/([a-z])([A-Z])/g, "$1 $2"))}
              </span>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;
