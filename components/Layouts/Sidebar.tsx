import { Plus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SidebarItems } from "@/lib/Constants";
import Image from "next/image";
import Link from "next/link";
import { Button } from "../ui/button";
import React from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { clearChat } from "@/lib/state/Reducers/chat";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import * as Progress from "@radix-ui/react-progress";
import { Separator } from "../ui/separator";
import { NavUser } from "./minors/nav-user";
import { setBranchName, setRepoName } from "@/lib/state/Reducers/RepoAndBranch";
import formbricksApp from "@formbricks/js";

export function AppSidebar() {
  const [progress, setProgress] = React.useState(90);
  const { user } = useAuthContext();
  const pathname = usePathname().split("/").pop();
  const dispatch = useDispatch();
  const router = useRouter();

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
    dispatch(setBranchName(""));
    dispatch(setRepoName(""));
    window.location.href = "/newchat";
  };

  React.useEffect(() => {
    const timer = setTimeout(() => setProgress(0), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleTrack = () => {
    formbricksApp.track("report-btn", {
      email: user.email,
      name: user.displayName,
      hiddenFields: {
        user_id: user.uid,
        user_name: user.displayName,
      },
    });
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link
              href="/"
              className="flex items-center gap-3 font-semibold ml-2"
            >
              <Image
                src={"/images/potpie-blue.svg"}
                alt="logo"
                width={35}
                height={35}
              />
              <span className="font-bold text-2xl">potpie</span>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem className="mt-5">
            <SidebarMenuButton
              className="flex gap-3 bg-primary text-white mx-auto py-5 w-[90%] items-center justify-center"
              onClick={() => redirectToNewChat()}
            >
              <Plus className="size-4" /> <span>New Chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {SidebarItems.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent className="ml-3 w-auto">
              <SidebarMenu>
                {item.links.map((link) => {
                  const isActive = pathname === link.href.split("/").pop();
                  return (
                    <SidebarMenuItem key={link.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        disabled={link.disabled}
                        onClick={link.handleTrack ? handleTrack : undefined}
                      >
                        <Link
                          href={link.href}
                          className="flex gap-2 items-center w-full"
                        >
                          <div className="flex gap-2">
                            {link.icons && <span>{link.icons}</span>}
                            <span>{link.title}</span>
                          </div>
                          {link.description && (
                            <span className="border border-white group-hover/menu-item:border-sidebar  group-hover/menu-item:bg-white group-hover/menu-item:text-foreground text-white rounded-full px-2 text-[0.6rem]">
                              {link.description}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <Separator />
        <SidebarMenu>
          <SidebarMenuItem>
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
                      userSubscription.plan_type === "free"
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
                        userSubscription.plan_type === "free"
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
          </SidebarMenuItem>
        </SidebarMenu>
        <Separator />
        <NavUser
          user={{
            avatar: user?.photoURL,
            email: user?.email,
            name: user?.displayName,
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
