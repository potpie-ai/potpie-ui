import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Chat = () => {
  return (
    <div className="relative flex h-full min-h-[50vh] flex-col rounded-xl p-4 lg:col-span-2 gap-5">
      <NewChat />
      <div className="flex-1" />
      <form className="relative pb-3 overflow-hidden rounded-lg bg-background focus-within:ring-1 focus-within:ring-ring shadow-2xl ">
        <div className="w-full h-9 bg-[#EFF4FC] flex items-center px-4">
          <Select>
            <SelectTrigger className="w-[180px] mx-4 my-3 h-5 text-sm rounded-full border-border">
              <SelectValue className=""
                placeholder={
                  <div className="flex gap-3 items-center ">
                    <Github
                      className="h-4 w-4 text-[#7A7A7A] "
                      strokeWidth={1.5}
                    />
                    netflix-dispatch
                  </div>
                }
              />
            </SelectTrigger>
          </Select>
        </div>
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
            <TooltipTrigger asChild className="mx-2 ">
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
