import { Plus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { planTypesEnum, SidebarItems } from "@/lib/Constants";
import Image from "next/image";
import Link from "next/link";

import React, { useEffect, useRef, useState } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ProFeatureModal } from "./ProFeatureModal";
import { isWorkflowsBackendAccessible } from "@/lib/utils/backendAccessibility";

export function AppSidebar() {
  const [supportPopoverOpen, setSupportPopoverOpen] = useState(false);
  const [proModalOpen, setProModalOpen] = useState(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState(false);
  const [isBackendAccessible, setIsBackendAccessible] = useState<boolean | null>(null);
  const supportPopoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const { user } = useAuthContext();
  const pathname = usePathname().split("/").pop();
  const dispatch: AppDispatch = useDispatch();
  const { toggleSidebar, open } = useSidebar();
  const router = useRouter();

  // Check backend accessibility on mount
  useEffect(() => {
    const checkBackend = async () => {
      const accessible = await isWorkflowsBackendAccessible();
      setIsBackendAccessible(accessible);
    };
    checkBackend();
  }, []);

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

  // Fetch account info from backend to get work email
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

  const redirectToNewChat = () => {
    dispatch(clearChat());
    dispatch(setBranchName(""));
    dispatch(setRepoName(""));
    window.location.href = "/newchat";
  };

  const maxCredits =
    userSubscription?.plan_type === planTypesEnum.PRO ? 500 : 50;
  const usedCredits = total_human_messages ?? 0;
  const progress =
    maxCredits > 0 ? Math.min((usedCredits / maxCredits) * 100, 100) : 0;

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
              {open && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 mr-2 bg-[#FFFDFC] hover:bg-[#FFFDFC] hover:opacity-100"
                  onClick={toggleSidebar}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.34082 14.9792C2.50863 15.7188 2.78449 16.2805 3.23798 16.7341C4.39575 17.8918 6.25913 17.8918 9.98594 17.8918C13.7127 17.8918 15.5761 17.8918 16.7338 16.7341C17.8915 15.5763 17.8915 13.7128 17.8915 9.98611C17.8915 6.25934 17.8915 4.39596 16.7338 3.2382C15.5761 2.08044 13.7127 2.08044 9.98594 2.08044C6.25913 2.08044 4.39575 2.08044 3.23798 3.2382C2.78449 3.6917 2.50863 4.25346 2.34082 4.99306" stroke="#00291C" strokeWidth="1.24826" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4.57661 7.48958L2.08008 9.98611L4.57661 12.4826M2.91225 9.98611H8.73749" stroke="#00291C" strokeWidth="1.24826" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12.4824 2.07881V17.8901" stroke="#00291C" strokeWidth="1.24826"/>
                    <path d="M17.8916 7.07187H12.4824M17.8916 12.8971H12.4824" stroke="#00291C" strokeWidth="1.24826"/>
                  </svg>
                  <span className="sr-only">Toggle Sidebar</span>
                </Button>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <div className="px-6 pt-6 pb-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="flex gap-2 text-primary-foreground text-sm font-medium w-full items-center justify-start bg-primary hover:bg-primary/90 px-3 py-2 rounded-lg"
                onClick={() => redirectToNewChat()}
              >
                <Plus className="size-4" /> <span>New chat</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
        <SidebarGroup className="border-b-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {SidebarItems[0].links.map((link) => {
                const isActive = pathname === link.href.split("/").pop();
                // Check if this is the workflows link
                const isWorkflowsLink = link.href === "/workflows";
                
                const handleClick = async (e: React.MouseEvent) => {
                  if (link.showProModal) {
                    e.preventDefault();
                    setProModalOpen(true);
                  } else if (isWorkflowsLink) {
                    e.preventDefault();
                    
                    // Check backend accessibility before navigating
                    if (isCheckingBackend) {
                      return; // Already checking, prevent double clicks
                    }
                    
                    setIsCheckingBackend(true);
                    const accessible = await isWorkflowsBackendAccessible();
                    setIsCheckingBackend(false);
                    
                    if (accessible) {
                      // Backend is accessible, allow navigation
                      router.push(link.href);
                    } else {
                      // Backend not accessible, show pro feature modal
                      setProModalOpen(true);
                    }
                  } else if (link.handleTrack) {
                    handleTrack();
                  }
                };
                return (
                  <SidebarMenuItem key={link.title}>
                    <SidebarMenuButton
                      asChild={!link.showProModal && !isWorkflowsLink}
                      isActive={isActive}
                      disabled={link.disabled || (isWorkflowsLink && isCheckingBackend)}
                      onClick={link.showProModal || isWorkflowsLink ? handleClick : link.handleTrack ? handleTrack : undefined}
                    >
                      {link.showProModal || isWorkflowsLink ? (
                        <button
                          className="flex gap-2 items-center w-full"
                          onClick={handleClick}
                        >
                          {link.icons && <span>{link.icons}</span>}
                          <span>{link.title}</span>
                          {link.description && (
                            <span className="border border-primary text-[#00291C] group-hover/menu-item:border-sidebar bg-gradient-to-r from-blue-100 via-pink-100 to-white group-hover/menu-item:bg-white group-hover/menu-item:text-foreground rounded-full px-2 text-[0.6rem] transition-all duration-300 ml-auto">
                              {link.description}
                            </span>
                          )}
                        </button>
                      ) : (
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
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {/* Support button (hover popover) in same group */}
              {(() => {
                const supportItem = SidebarItems[1];
                return (
                  <SidebarMenuItem>
                    <Popover
                      open={supportPopoverOpen}
                      onOpenChange={setSupportPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <SidebarMenuButton
                          className="flex gap-2 items-center w-full"
                          onMouseEnter={() => {
                            if (
                              supportPopoverTimeoutRef.current !=
                              null
                            ) {
                              clearTimeout(
                                supportPopoverTimeoutRef.current
                              );
                              supportPopoverTimeoutRef.current = null;
                            }
                            setSupportPopoverOpen(true);
                          }}
                          onMouseLeave={() => {
                            supportPopoverTimeoutRef.current =
                              setTimeout(
                                () => setSupportPopoverOpen(false),
                                150
                              );
                          }}
                        >
                          {supportItem.links[0]?.icons && (
                            <span>{supportItem.links[0].icons}</span>
                          )}
                          <span>Support</span>
                        </SidebarMenuButton>
                      </PopoverTrigger>
                      <PopoverContent
                        side="right"
                        align="start"
                        sideOffset={8}
                        className="w-56 p-1 bg-[#FFFBF7] border-border text-foreground"
                        onMouseEnter={() => {
                          if (
                            supportPopoverTimeoutRef.current !=
                            null
                          ) {
                            clearTimeout(
                              supportPopoverTimeoutRef.current
                            );
                            supportPopoverTimeoutRef.current = null;
                          }
                          setSupportPopoverOpen(true);
                        }}
                        onMouseLeave={() =>
                          setSupportPopoverOpen(false)
                        }
                      >
                        <div className="flex flex-col gap-0.5">
                          {supportItem.links.map((link) =>
                            link.disabled && link.handleTrack ? (
                              <button
                                key={link.title}
                                type="button"
                                className="flex w-full gap-2 items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                  handleTrack();
                                  setSupportPopoverOpen(false);
                                }}
                              >
                                {link.icons && (
                                  <span className="shrink-0">
                                    {link.icons}
                                  </span>
                                )}
                                <span>{link.title}</span>
                              </button>
                            ) : (
                              <Link
                                key={link.title}
                                href={link.href}
                                className="flex gap-2 items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                onClick={() =>
                                  setSupportPopoverOpen(false)
                                }
                              >
                                {link.icons && (
                                  <span className="shrink-0">
                                    {link.icons}
                                  </span>
                                )}
                                <span>{link.title}</span>
                              </Link>
                            )
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </SidebarMenuItem>
                );
              })()}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {!subscriptionLoading && userSubscription && open && (
          <div className="px-4 pt-3 pb-3">
            <div className="bg-white rounded-lg border border-zinc-200 p-3">
              <p className="text-sm font-medium text-[#00291C] mb-1">
                {userSubscription?.plan_type === planTypesEnum.PRO ? "Pro Plan" : "Free Plan"}
              </p>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-zinc-500">Credits used</span>
                <span className="text-xs text-zinc-700">
                  {usedCredits}/{maxCredits}
                </span>
              </div>
              <Progress.Root
                value={progress}
                className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 mb-3"
              >
                <Progress.Indicator
                  className="h-full bg-zinc-900 transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </Progress.Root>
              <button
                onClick={() => setProModalOpen(true)}
                className="w-full py-2 px-4 rounded-lg border border-zinc-300 bg-white text-xs font-medium text-[#00291C] hover:bg-zinc-50 transition-colors"
              >
                UPGRADE
              </button>
            </div>
          </div>
        )}
      <ProFeatureModal open={proModalOpen} onOpenChange={setProModalOpen} />
      <SidebarFooter className="flex flex-col gap-0">
        <div className="pt-2">
          <NavUser
            user={{
              avatar: user?.photoURL,
              // Use work email from backend (database), fallback to Firebase email
              email: accountInfo?.email || user?.email || "",
              name: user?.displayName,
            }}
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
