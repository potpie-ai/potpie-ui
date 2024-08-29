import { Plus } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import Image from "next/image";
import * as Progress from "@radix-ui/react-progress";

const Sidebar = () => {
  const [progress, setProgress] = React.useState(90);
  const [showChatHistory, setShowChatHistory] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setProgress(5), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="hidden bg-foreground text-white md:block relative">
      <div className="flex h-full max-h-screen flex-col gap-2 overflow-auto no-scrollbar">
        <div className="relative flex h-14 items-center px-4 lg:h-[90px] lg:px-6 mb-11 mt-7">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <Image src={"/images/logo.svg"} alt="logo" width={35} height={35} />
            <span className="font-bold text-2xl">potpie</span>
          </Link>
          <hr className="absolute right-0 -bottom-5 h-px w-full border-0 bg-border" />
        </div>
        <Button className="flex gap-3 mx-5 mb-9 ">
          <Plus /> <p>New Chat</p>
        </Button>
        <div className="flex-1">
          <nav className="grid items-start mx-5 text-sm font-medium gap-7">
            {SidebarItems.map((item, index) => (
              <div className="" key={index}>
                <p>{item.title}</p>
                {item.links.map((link, index) => (
                  <div key={index} className="flex flex-col gap-3">
                    <Link
                      href="#"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all"
                      onClick={() => {
                        // Toggle the chat history only if "All chats" is clicked
                        if (link.title === "All chats") {
                          setShowChatHistory((prev) => !prev);
                        }
                      }}
                    >
                      <Image
                        src={link.icons}
                        alt="logo"
                        width={15}
                        height={15}
                      />
                      <p>{link.title} </p>{" "}
                      {link.soon && (
                        <p className="bg-gradient-to-r from-[#FFAD62] to-[#5356FF] rounded-full px-1 text-[0.6rem]">
                          Coming soon
                        </p>
                      )}
                    </Link>
                    {showChatHistory && link.title === "All chats" && (
                      <div className="flex flex-col gap-1 mb-3 mx-7">
                        {chatHistory.map((chat, i) => (
                          <p key={i} className="rounded-xl hover:border hover:border-border p-3">{chat}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </nav>
        </div>
        {/* Rest of your component remains unchanged */}
        <div className="relative mt-auto px-2 ">
          <hr className="absolute right-0 top-0 h-px w-full border-0 bg-border" />
          <Card className="bg-transparent border-none text-white">
            <CardHeader className="p-2 pt-0 md:p-4">
              <CardTitle className="text-lg">Free Plan</CardTitle>
              <CardDescription className="flex flex-row justify-between text-tertiary">
                <p>Credits used</p>
                <p>15/5.0k</p>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0 md:p-4 md:pt-0 gap-3 flex-col flex ">
              <Progress.Root
                className="relative overflow-hidden bg-[#7F7F7F] rounded-full w-full h-[5px]"
                style={{
                  transform: "translateZ(0)",
                }}
                value={progress}
              >
                <Progress.Indicator
                  className="bg-primary w-full h-full transition-transform duration-[660ms] ease-[cubic-bezier(0.65, 0, 0.35, 1)]"
                  style={{ transform: `translateX(-${100 - progress}%)` }}
                />
              </Progress.Root>
              <Button
                size="sm"
                className="w-full bg-white hover:text-white text-foreground !border-none"
              >
                ✨ Upgrade
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="relative mt-auto px-2 ">
          <hr className="absolute right-0 top-0 h-px w-full border-0 bg-border" />
          <div className="flex justify-between items-center py-3">
            <div className="flex gap-5 items-center ">
              <div className="bg-border rounded-full w-7 h-7" />  
              <p className="text-sm">Your name</p>
            </div>
            <Image
              src={"/images/rightarrow.svg"}
              alt="logo"
              width={15}
              className="mr-3"
              height={15}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const SidebarItems = [
  {
    title: "Codebase Chat",
    links: [
      {
        icons: "/images/msg.svg",
        title: "All chats",
      },
      {
        icons: "/images/robot.svg",
        title: "AI Agents",
      },
    ],
  },
  {
    title: "Knowledge Base",
    links: [
      {
        icons: "/images/git.svg",
        title: "Repositories",
      },
      {
        icons: "/images/document.svg",
        title: "Text resources",
        soon: true,
      },
    ],
  },
  {
    title: "Support",
    links: [
      {
        icons: "/images/document.svg",
        title: "Documentation",
      },
      {
        icons: "/images/git.svg",
        title: "Open source repo",
      },
      {
        icons: "/images/discord.svg",
        title: "Discord",
      },
    ],
  },
];
const chatHistory = [
  "Chat history here ",
  "Chat history here ",
  "Chat history here ",
  "Chat history here ",
  "Chat history here ",
  "Chat history here ",
  "Chat history here ",
  "Chat history here ",
  "Chat history here ",
  "Chat history here ",
  "Chat history here ",
  "Chat history here ",
  "Chat history here ",
  "Chat history here ",
  "Chat history here ",
];
export default Sidebar;
