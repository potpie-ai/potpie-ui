"use client";
import React, { useState } from "react";
import { useHeader } from "@/contexts/HeaderContext";
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

const Navbar = () => {
  const { headerTitle } = useHeader();
  const { closeSidebar, isSidebarOpen, showSidebar, activePathname } =
    useSidebarContext();
  const router = useRouter();
  const { user } = useAuthContext();
  const currentBranch = useSelector((state: RootState) => state.branch.value);

  const [isPlanModalOpen, setPlanModalOpen] = React.useState(false);
  const skipProCheck = process.env.NEXT_PUBLIC_SKIP_PRO_CHECK === 'true';
  return (
    <header className="sticky top-0 flex h-[50px] items-center gap-1 border-b border-b-border bg-muted px-4 z-10">
      <Button
        variant="link"
        size={isSidebarOpen ? "default" : "icon"}
        className={`gap-5 h-[33px] ${!isSidebarOpen && "justify-start  w-7"
          }`}
        aria-label="Home"
        onClick={() => router.push("/")}
      >
        <Image src={HundredmarksLogo} alt="momentum" width={30} />{" "}

      </Button>
      <h1 className="text-[16px] font-bold pl-4">hundredpoints.ai</h1>
      <nav className="ml-auto grid gap-1 p-2">
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
                    className={`text-icons size-8 ${isSidebarOpen ? "mr-auto" : "mx-auto"
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

                <DropdownMenuItem className="pr-8" onClick={() => setPlanModalOpen(true)}>
                  <CircleDollarSignIcon className="pr-2" />
                  My plan
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
      </nav>
    </header>
  );
};

export default Navbar;
