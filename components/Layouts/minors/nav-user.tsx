"use client";

import {
  Bell,
  ChevronRight,
  CreditCard,
  LogOut,
  Receipt,
  Settings,
  SubscriptIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { signOut } from "firebase/auth";
import { auth } from "@/configs/Firebase-config";
import { useRouter } from "next/navigation";
import Link from "next/link";
import posthog from "posthog-js";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const router = useRouter();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="w-full justify-between px-6 py-3 data-[state=open]:bg-transparent data-[state=open]:text-[#00291C] hover:bg-transparent"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar className="h-9 w-9 rounded-full">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-full bg-[#E5EAE8] text-[#00291C]">
                    {user.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1 min-w-0 text-left">
                  <span className="truncate text-sm font-normal text-[#091828] leading-tight">
                    {user.name}
                  </span>
                  <span className="truncate text-sm font-normal text-[#747575] leading-tight">
                    {user.email}
                  </span>
                </div>
              </div>
              <ChevronRight className="ml-auto size-5 text-[#00291C] flex-shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg bg-[#FFFBF7] text-[#091828] border-border shadow-md"
            side={"right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-light">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem 
                className="hover:bg-[#F5F0EB] cursor-pointer"
                onClick={() => router.push("/key-management")}
              >
                <CreditCard />
                Key Management
              </DropdownMenuItem>
              <DropdownMenuItem
                className="hover:bg-[#F5F0EB] cursor-pointer"
                onClick={() => router.push("/user-subscription")}
              >
                <Receipt />
                Manage Subscription
              </DropdownMenuItem>
              <DropdownMenuItem
                className="hover:bg-[#F5F0EB] cursor-pointer"
                onClick={() => router.push("/settings")}
              >
                <Settings />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-[#F5F0EB] cursor-pointer">
                <Link
                  href={"https://discord.gg/ryk5CMD5v6"}
                  target="_blank"
                  className="flex items-center gap-2"
                >
                  <Bell />
                  Support
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="hover:bg-[#F5F0EB] cursor-pointer"
              onClick={() => {
                posthog.reset();
                signOut(auth);
                router.push("/sign-in");
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
