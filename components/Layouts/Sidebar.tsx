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
    <Sidebar className="[&>div[data-sidebar='sidebar']]:bg-[#FFF9F5]">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between w-full ml-2 mt-4">
              <Link
                href="/"
                className="flex items-center gap-3 font-semibold"
              >
                <Image
                  src={"/images/Green Icon.svg"}
                  alt="logo"
                  width={35}
                  height={35}
                />
                <span className="text-2xl"><span className="text-foreground">potpie</span><span className="text-accent-color">.</span><span className="text-foreground">ai</span></span>
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
        <SidebarMenu>
          <SidebarMenuItem className="mt-5">
            <SidebarMenuButton
              className="flex gap-3 text-[#00291C] text-md font-semibold mx-auto py-5 w-[90%] items-center justify-center bg-[#B4D13F] hover:bg-[#B4D13F]"
              onClick={() => redirectToNewIdea()}
            >
              <Plus className="size-5" /> <span>New Chat</span>
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
                          <div className="flex gap-2 text-[#00291C]">
                            {link.icons && <span>{link.icons}</span>}
                            <span>{link.title}</span>
                          </div>
                          {link.description && (
                            <span className="border border-primary text-[#00291C] group-hover/menu-item:border-sidebar bg-gradient-to-r from-blue-100 via-pink-100 to-white group-hover/menu-item:bg-white group-hover/menu-item:text-foreground rounded-full px-2 text-[0.6rem] transition-all duration-300">
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
        <SidebarMenu>
          <SidebarMenuItem>

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
