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
import { planTypesEnum, SidebarItems } from "@/lib/Constants";
import Image from "next/image";
import Link from "next/link";
import { Button } from "../ui/button";
import React, { useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
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
import MinorService from "@/services/minorService";
import dayjs from "dayjs";
import { AppDispatch, RootState } from "@/lib/state/store";
import {
  setTotalHumanMessages,
  setUserPlanType,
} from "@/lib/state/Reducers/User";

export function AppSidebar() {
  const [progress, setProgress] = React.useState(90);
  const { user } = useAuthContext();
  const pathname = usePathname().split("/").pop();
  const dispatch: AppDispatch = useDispatch();

  const userId = user?.uid;
  const { total_human_messages } = useSelector(
    (state: RootState) => state.UserInfo
  );
  const { data: userSubscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["userSubscription", userId],
    queryFn: () => MinorService.fetchUserSubscription(userId as string),
    enabled: !!userId,
    retry: false,
  });

  const { data: userUsage, isLoading: usageLoading } = useQuery({
    queryKey: ["userUsage", userId],
    queryFn: () =>
      MinorService.fetchUserUsage(
        dayjs(userSubscription.end_date).subtract(30, "day").toISOString(),
        userSubscription.end_date
      ),
    enabled: !!userId && !!userSubscription,
  });

  useEffect(() => {
    if (!usageLoading) {
      dispatch(setTotalHumanMessages(userUsage));
    }
  }, [usageLoading, dispatch, userUsage]);

  // useEffect(() => {
  //   if (!subscriptionLoading) {
  //     dispatch(setUserPlanType(userSubscription.plan_type));
  //   }
  // }, [subscriptionLoading]);

  const redirectToNewChat = () => {
    dispatch(clearChat());
    dispatch(setBranchName(""));
    dispatch(setRepoName(""));
    window.location.href = "/newchat";
  };

  useEffect(() => {
    if (!usageLoading && !subscriptionLoading && userSubscription) {
      const maxCredits = userSubscription.plan_type === planTypesEnum.PRO ? 500 : 50;
      const usedCredits = total_human_messages || 0;

      const calculatedProgress = Math.min(
        (usedCredits / maxCredits) * 100,
        100
      );

      setProgress(calculatedProgress);
    }
  }, [usageLoading, subscriptionLoading, total_human_messages, userSubscription]);

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
                            <span className="border border-white group-hover/menu-item:border-sidebar group-hover/menu-item:bg-white group-hover/menu-item:text-foreground text-white rounded-full px-2 text-[0.6rem]">
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
            <Link href={`/user-subscription?end_date=${userSubscription?.end_date ? new Date(userSubscription.end_date).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'}) : ''}&plan_type=${userSubscription?.plan_type}`} className="w-full">
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
                        userSubscription.plan_type === planTypesEnum.FREE
                      ) {
                        return "Free Plan";
                      } else if (
                        userSubscription.plan_type === planTypesEnum.STARTUP &&
                        subscriptionEndDate > now
                      ) {
                        return "Early-Stage";
                      } else if (
                        userSubscription.plan_type === planTypesEnum.PRO &&
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
                      {usageLoading ? (
                        <Skeleton className="w-10 h-5" />
                      ) : (
                        `${total_human_messages || 0} / ${userSubscription?.plan_type === planTypesEnum.PRO ? 500 : 50}`
                      )}
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
                    href={"/pricing"}
                    className="w-full inset-0"
                    style={{ 
                      display: userSubscription?.plan_type === planTypesEnum.PRO ? 'none' : 'block' 
                    }}
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
            </Link>
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
