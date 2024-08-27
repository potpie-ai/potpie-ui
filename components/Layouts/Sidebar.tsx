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
            {/* On clicking all chats all the chats will appear as chat gpt does  */}
            {SidebarItems.map((item, index) => (
              <div className="" key={index}>
                <p>{item.title}</p>
                {item.links.map((link, index) => (
                  <Link
                    key={index}
                    href="#"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all    "
                  >
                    <Image src={link.icons} alt="logo" width={15} height={15} />
                    <p>{link.title} </p>{" "}
                    {link.soon && (
                      <p className="bg-gradient-to-r from-[#FFAD62] to-[#5356FF] rounded-full px-1 text-[0.6rem]">
                        Comming soon{" "}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>
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
                  // Fix overflow clipping in Safari
                  // https://gist.github.com/domske/b66047671c780a238b51c51ffde8d3a0
                  transform: "translateZ(0)",
                }}
                value={progress}
              >
                <Progress.Indicator
                  className="bg-ring w-full h-full transition-transform duration-[660ms] ease-[cubic-bezier(0.65, 0, 0.35, 1)]"
                  style={{ transform: `translateX(-${100 - progress}%)` }}
                />
              </Progress.Root>
              <Button
                size="sm"
                className="w-full bg-white !text-foreground !border-none"
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
    title: "Knowedge Base",
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

export default Sidebar;
