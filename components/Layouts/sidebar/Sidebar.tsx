"use client";
import React from "react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { MenuItems } from "@/lib/Constants";
import { useSidebarContext } from "@/contexts/SidebarContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  KeyRound,
  UserCog,
  MessageCircleQuestion,
  LogOut,
  ArrowLeft,
  ArrowRight,
  CircleDollarSignIcon,
  BookOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/configs/Firebase-config";
import { cn } from "@/lib/utils";
import ProfilePicture from "../minors/ProfilePicture";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";
import { HundredmarksLogo } from "@/public";
import PlanModal from "@/components/Subscription/PlanModal";
import Link from "next/link";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";

const Sidebar = () => {
  const { closeSidebar, isSidebarOpen, showSidebar, activePathname } =
    useSidebarContext();
  const router = useRouter();
  const { user } = useAuthContext();
  const currentBranch = useSelector((state: RootState) => state.branch.value);

  const [isPlanModalOpen, setPlanModalOpen] = React.useState(false);
  const skipProCheck = process.env.NEXT_PUBLIC_SKIP_PRO_CHECK === 'true';

  return (
    <>
      <aside
        className={`inset-y fixed  left-0 flex h-full flex-col border-muted-foreground/50  bg-muted border-r-[0.5px] border-border`}
      >
                <div className="border-b border-b-border p-2 grid place-items-center ">
          <Button
            variant="link"
            size={isSidebarOpen ? "default" : "icon"}
            className={`gap-5 h-[33px] ${
              !isSidebarOpen && "justify-start  w-7"
            }`}
            aria-label="Home"
            onClick={() => router.push("/")}
          >
            <Image src={HundredmarksLogo} alt="momentum" width={30} />{" "}
            
          </Button>
        </div>
        <nav className="grid gap-4 p-2 mt-6">
          {MenuItems.map(({ name, icon, badgeNo, link, onProjectId }) => {
            if (!currentBranch && onProjectId) return;
            return (
              <Tooltip key={name}>
                <TooltipTrigger
                  asChild
                  className="flex items-center gap-3 rounded-lg text-secondary hover:text-secondary w-full"
                >
                  <Button
                    variant="ghost"
                    size={isSidebarOpen ? "default" : "icon"}
                    onClick={() => {
                      router.push(link);
                      closeSidebar();
                    }}
                    className={cn(
                      `text-icons hover:bg-input font-extrabold hover:text-secondary ${
                        isSidebarOpen &&
                        "justify-start hover:bg-input hover:text-secondary"
                      }`,
                      {
                        "text-input": activePathname === link,
                      }
                    )}
                    aria-label={name}
                  >
                    {icon}{" "}
                    {isSidebarOpen && (
                      <span
                        className={cn({
                          "text-input": activePathname === link,
                          "hover:text-icons": activePathname === link,
                        })}
                      >
                        {name}
                      </span>
                    )}
                    {badgeNo && isSidebarOpen ? (
                      <Badge className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                        {badgeNo}
                      </Badge>
                    ) : null}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={5}>
                  {name}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
        <nav className="mt-auto grid gap-1 p-2">
          <Tooltip>
            <TooltipTrigger
              asChild
              className="flex items-center gap-3 rounded-lg text-secondary hover:text-secondary dark:hover:text-secondary dark:hover:bg-accent-foreground"
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={"ghost"}
                    size={isSidebarOpen ? "default" : "icon"}
                    className={`${isSidebarOpen && "hover:bg-input gap-2"}`}
                  >
                    <ProfilePicture
                      className={`text-icons size-8 ${
                        isSidebarOpen ? "mr-auto" : "mx-auto"
                      }`}
                    />
                    <p
                      className="text-icons font-extrabold"
                      hidden={!isSidebarOpen}
                    >
                      {" "}
                      {user?.displayName}
                    </p>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="z-[999] bg-muted p-4 ml-4"
                >
                  <DropdownMenuItem
                    className="pr-8"
                  >
                    <Link className="w-full h-full flex" href={"https://docs.momentum.sh/"} target="_blank">
                      <BookOpen className="pr-2" />
                      Documentation
                    </Link>
                  </DropdownMenuItem>
                  {!skipProCheck && (
                    <DropdownMenuItem className="pr-8" onClick={() => setPlanModalOpen(true)}>
                      <CircleDollarSignIcon className="pr-2" />
                      My plan
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="pr-8"
                    onClick={() => router.push("/key-management")}
                  >
                    <KeyRound className="pr-2" />
                    Key Management
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <MessageCircleQuestion className="pr-2" />
                    Support
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
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
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>
              Settings
            </TooltipContent>
          </Tooltip>

          <Button
            variant="ghost"
            size={"icon"}
            onClick={isSidebarOpen ? closeSidebar : showSidebar}
          >
            {isSidebarOpen ? (
              <ArrowLeft className="h-5 w-5" />
            ) : (
              <ArrowRight className="h-5 w-5" />
            )}
          </Button>
        </nav>
      </aside>
      <PlanModal
        showProModalModal={isPlanModalOpen}
        toggleShowProModal={setPlanModalOpen}
      />
    </>
  );
};

export default Sidebar;
