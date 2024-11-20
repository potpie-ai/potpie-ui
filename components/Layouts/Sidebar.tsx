import { KeyRound, LogOut, MessageCircleQuestion, Plus } from "lucide-react";
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
import { useRouter } from "next/navigation";
import ProfilePicture from "./minors/ProfilePicture";
import { useAuthContext } from "@/contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/configs/Firebase-config";
import { useDispatch } from "react-redux";
import { clearChat } from "@/lib/state/Reducers/chat";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Skeleton } from "../ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const Sidebar = () => {
  const [progress, setProgress] = React.useState(90);
  const { user } = useAuthContext();
  const router = useRouter();
  const dispatch = useDispatch();

  const fetchUserSubscription = async (userId: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_SUBSCRIPTION_BASE_URL;
    const response = await axios.get(
      `${baseUrl}/subscriptions/info?user_id=${userId}`
    );
    return response.data;
  };

  const userId = user?.uid;
  const { data: userSubscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["userSubscription", userId],
    queryFn: () => fetchUserSubscription(userId as string),
    enabled: !!userId,
    retry: false,
  });

  const redirectToNewChat = () => {
    dispatch(clearChat());
    window.location.href = "/newchat";
  };

  React.useEffect(() => {
    const timer = setTimeout(() => setProgress(0), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="hidden bg-foreground text-white md:block relative">
      <div className="flex h-full max-h-screen sticky top-0 left-0 bottom-0 flex-col gap-2 overflow-auto no-scrollbar">
        <div className="relative flex h-14 items-center px-2 lg:px-6 mb-11 mt-7">
          <Link href="/" className="flex items-center gap-3 font-semibold ml-2">
            <Image
              src={"/images/potpie-blue.svg"}
              alt="logo"
              width={35}
              height={35}
            />
            <span className="font-bold text-2xl">potpie</span>
          </Link>
          <hr className="absolute right-0 -bottom-5 h-px w-full border-0 bg-border" />
        </div>
        <Button
          className="flex gap-3 mx-5 mb-7"
          onClick={() => redirectToNewChat()}
        >
          <Plus /> <span>New Chat</span>
        </Button>
        <div className="flex-1">
          <nav className="grid items-start ml-5 text-sm font-normal gap-5">
            {SidebarItems.map((item, index) => (
              <div className="" key={index}>
                <span className="pb-3 text-sm">{item.title}</span>
                {item.links.map((link, index) => (
                  <div key={index} className="flex flex-col gap-3">
                    <Link
                      href={link.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all font-medium text-base"
                    >
                      <Image
                        src={link.icons}
                        alt="logo"
                        width={20}
                        height={20}
                      />
                      <div>{link.title} </div>{" "}
                      {link.soon && (
                        <span className="bg-gradient-to-r from-[#FFAD62] to-[#5356FF] rounded-full px-2 text-[0.6rem]">
                          Coming soon
                        </span>
                      )}
                      {link.upgrade && (
                        <span className="bg-gradient-to-r from-[#FFAD62] to-[#5356FF] rounded-full px-2 text-[0.6rem]">
                          Upgrade
                        </span>
                      )}
                    </Link>
                  </div>
                ))}
              </div>
            ))}
          </nav>
        </div>
        <div className="relative mt-auto px-2 ">
          <hr className="absolute right-0 top-0 h-px w-full border-0 bg-border" />
          <Card className="bg-transparent border-none text-white">
            <CardHeader className="p-2 pt-0 md:p-4">
              <CardTitle className="text-lg">
                {(() => {
                  const now = new Date();
                  const subscriptionEndDate = new Date(
                    userSubscription?.end_date || 0
                  );

                  if (subscriptionLoading)
                    return <Skeleton className="w-28 h-6" />;
                  if (
                    !userSubscription ||
                    (userSubscription.plan_type === "free")
                  ) {
                    return "Free Plan";
                  } else if (
                    userSubscription.plan_type === "startup" &&
                    subscriptionEndDate > now
                  ) {
                    return "Early-Stage";
                  } else if (
                    userSubscription.plan_type === "pro" &&
                    subscriptionEndDate > now
                  ) {
                    return "Individual - Pro";
                  } else {
                    return "Expired Plan";
                  }
                })()}
              </CardTitle>
              <CardDescription className="flex flex-row justify-between text-tertiary">
                <span>Credits used</span>
                <span>
                  {(() => {
                    const now = new Date();
                    const subscriptionEndDate = new Date(
                      userSubscription?.end_date || 0
                    );
                    if (
                      !userSubscription ||
                      (userSubscription.plan_type === "free")
                    ) {
                      return "0/50";
                    } else if (
                      userSubscription.plan_type === "startup" &&
                      subscriptionEndDate > now
                    ) {
                      return "0/50";
                    } else if (
                      userSubscription.plan_type === "pro" &&
                      subscriptionEndDate > now
                    ) {
                      return "0/500";
                    } else {
                      return "0/0";
                    }
                  })()}
                </span>
              </CardDescription>
            </CardHeader>

            <CardContent className="p-2 pt-0 md:p-4 md:pt-0 gap-3 flex-col flex">
              <Progress.Root
                className="relative overflow-hidden bg-[#7F7F7F] rounded-full w-full h-[5px]"
                style={{
                  transform: "translateZ(0)",
                }}
                value={progress}
              >
                <Progress.Indicator
                  className="bg-primary w-full h-full transition-transform transition-duration-[660ms] ease-[cubic-bezier(0.65, 0, 0.35, 1)]"
                  style={{ transform: `translateX(-${100 - progress}%)` }}
                />
              </Progress.Root>
              <Link
                href={"https://potpie.ai/pricing"}
                target="_blank"
                className="w-full inset-0"
              >
                <Button
                  size="sm"
                  className="w-full bg-white hover:text-white text-foreground !border-none"
                >
                  ✨ Upgrade
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        <div className="relative mt-auto px-2 ">
          <hr className="absolute right-0 top-0 h-px w-full border-0 bg-border" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={"ghost"}
                size={"default"}
                className="hover:bg-transparent hover:text-white gap-2 w-full"
              >
                <div className="flex justify-between items-center py-8 mt-4">
                  <div className="flex gap-3 items-center">
                    <ProfilePicture className="text-icons size-8 mr-auto" />
                    <span className="text-m">{user?.displayName}</span>
                  </div>
                  <Image
                    src={"/images/rightarrow.svg"}
                    alt="logo"
                    width={15}
                    className="mr-3 cursor-pointer ml-8"
                    height={15}
                  />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="z-[999] bg-muted-foreground p-4 ml-4"
            >
              <DropdownMenuItem
                className="pr-8 hover:bg-transparent text-white"
                onClick={() => router.push("/key-management")}
              >
                <KeyRound className="pr-2" />
                Key Management
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-transparent text-white">
                <MessageCircleQuestion className="pr-2" />
                Support
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white" />
              <DropdownMenuItem
                className="hover:bg-transparent text-white"
                onClick={() => {
                  signOut(auth);
                  router.push("/sign-in");
                }}
              >
                <LogOut className="pr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        href: "/all-chats",
        upgrade: false,
      },
      {
        icons: "/images/robot.svg",
        title: "Custom Agents",
        href: "/all-agents",
        upgrade: true,
      },
    ],
  },
  {
    title: "Knowledge Base",
    links: [
      {
        icons: "/images/git.svg",
        title: "Repositories",
        href: "/repositories",
        upgrade: false,
      },
      {
        icons: "/images/document.svg",
        title: "Text resources",
        soon: true,
        href: "#",
        upgrade: false,
      },
    ],
  },
  {
    title: "Support",
    links: [
      {
        icons: "/images/document.svg",
        title: "Documentation",
        href: "https://docs.potpie.ai",
        upgrade: false,
      },
      {
        icons: "/images/git.svg",
        title: "Open source",
        href: "https://github.com/potpie-ai/potpie",
        upgrade: false,
      },
      {
        icons: "/images/discord.svg",
        title: "Discord",
        href: "https://discord.gg/ryk5CMD5v6",
        upgrade: false,
      },
    ],
  },
];

export default Sidebar;
