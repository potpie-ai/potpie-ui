"use client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Github, Plus } from "lucide-react";
import Image from "next/image";
import NewChat from "./NewChat";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import ChatInterface from "./ChatInterface";

const Chat = () => {
  const { chatStep } = useSelector((state: RootState) => state.chat);
  const handleSubmit = (e:any) => {
    e.preventDefault();
    console.log("Message:", e.target.message.value);
    // setMessage("");
  };
  return (
    <div className="relative flex h-full min-h-[50vh] flex-col rounded-xl p-4 lg:col-span-2 ">
      {chatStep != 3 ? <NewChat /> : <ChatInterface />}
      <div className="flex-1" />
      <form
        className={`relative pb-3 ml-20 overflow-hidden rounded-lg bg-background focus-within:ring-1 focus-within:ring-ring shadow-2xl ${chatStep !== 3 ? "pointer-events-none" : ""}`}
        onSubmit={handleSubmit}
      >
        <Label htmlFor="message" className="sr-only">
          Message
        </Label>
        <Textarea
          id="message"
          placeholder="Start chatting with the expert...."
          className="min-h-12 h-[50%] resize-none border-0 p-3 px-7 shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center p-3 pt-0 ">
          <Tooltip>
            <TooltipTrigger asChild className="mx-2 !bg-transparent">
              <Button variant="ghost" size="icon">
                <Plus className="border-primary rounded-full border-2" />
                <span className="sr-only">Share File</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Share File</TooltipContent>
          </Tooltip>
          <Button type="submit" size="sm" className="ml-auto !bg-transparent">
            <Image
              src={"/images/sendmsg.svg"}
              alt="logo"
              width={20}
              height={20}
            />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
