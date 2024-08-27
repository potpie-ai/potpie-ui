import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus } from "lucide-react";
import Image from "next/image";

const Chat = () => {
  return (
    <div className="relative flex h-full min-h-[50vh] flex-col rounded-xl bg-muted/50 p-4 lg:col-span-2">
      <div className="w-full h-full border border-emerald-500"></div>
      <div className="flex-1" />
      <form className="relative pb-3 overflow-hidden rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring">
        <div className="">asd</div>
        <Label htmlFor="message" className="sr-only">
          Message
        </Label>
        <Textarea
          id="message"
          placeholder="Start chatting with the expert...."
          className="min-h-12 resize-none border-0 p-3 shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center p-3 pt-0"> 
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Plus className="border-ring rounded-full border-2" />
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
