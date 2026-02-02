import { Plus, PanelLeftClose } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { planTypesEnum, SidebarItems } from "@/lib/Constants";
import Image from "next/image";
import Link from "next/link";

import React, { useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";

import { useQuery } from "@tanstack/react-query";
import { clearChat } from "@/lib/state/Reducers/chat";
import { authClient } from "@/lib/sso/unified-auth";
import type { UserAccount } from "@/types/auth";
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
import { Button } from "@/components/ui/button";
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
  const { toggleSidebar, open } = useSidebar();

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

  // Fetch account info from backend to get work email and verification status
  const { data: accountInfo } = useQuery<UserAccount>({
    queryKey: ["accountInfo", userId],
    queryFn: async () => {
      if (!user?.uid) throw new Error("No user ID");
      const token = await user.getIdToken();
      return authClient.getAccount(token);
    },
    enabled: !!userId && !!user,
    retry: false,
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

  const redirectToNewIdea = () => {
    dispatch(clearChat());
    dispatch(setBranchName(""));
    dispatch(setRepoName(""));
    window.location.href = "/idea";
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
    <Sidebar className="[&>div[data-sidebar='sidebar']]:bg-[#FFFDFC]">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between w-full ml-2 mt-4">
              <Link
                href="/"
                className="flex items-center font-semibold min-w-0"
              >
                <Image
                  src={"/images/Potpie Logomark.svg"}
                  alt="Potpie"
                  width={140}
                  height={36}
                  className="h-9 w-auto object-contain object-left"
                />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 mr-2"
                onClick={toggleSidebar}
              >
                <PanelLeftClose className="h-5 w-5" />
                <span className="sr-only">Toggle Sidebar</span>
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <div className="px-6 pt-6 pb-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="flex gap-2 text-[#EFE6DF] text-sm font-medium w-full items-center justify-start bg-[#295245] hover:bg-[#295245] px-3 py-2 rounded-lg"
                onClick={() => redirectToNewIdea()}
              >
                <Plus className="size-4" /> <span>New chat</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
        {SidebarItems.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
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
                          {link.icons && <span>{link.icons}</span>}
                          <span>{link.title}</span>
                          {link.description && (
                            <span className="border border-primary text-[#00291C] group-hover/menu-item:border-sidebar bg-gradient-to-r from-blue-100 via-pink-100 to-white group-hover/menu-item:bg-white group-hover/menu-item:text-foreground rounded-full px-2 text-[0.6rem] transition-all duration-300 ml-auto">
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
        <NavUser
          user={{
            avatar: user?.photoURL,
            // Use work email from backend (database), fallback to Firebase email
            email: accountInfo?.email || user?.email || "",
            name: user?.displayName,
            // Use verification status from backend (work email), fallback to Firebase status
            emailVerified: accountInfo?.email_verified ?? user?.emailVerified ?? false,
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
