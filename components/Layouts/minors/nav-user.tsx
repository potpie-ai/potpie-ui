"use client";

import {
  ChevronRight,
  CreditCard,
  LogOut,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Mail,
  MessageCircle,
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
import { toast } from "sonner";
import { useState } from "react";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
    emailVerified?: boolean;
  };
}) {
  const router = useRouter();
  const [isSendingVerification, setIsSendingVerification] = useState(false);

  const handleOpenPlainChat = () => {
    // @ts-ignore
    if (window.Plain) {
      // @ts-ignore
      if (window.Plain.isInitialized && window.Plain.isInitialized()) {
        // @ts-ignore
        window.Plain.open();
      } else {
        console.log("Plain chat not yet initialized, waiting...");
        // Wait a bit and try again
        setTimeout(() => {
          // @ts-ignore
          if (window.Plain && window.Plain.isInitialized && window.Plain.isInitialized()) {
            // @ts-ignore
            window.Plain.open();
          } else {
            toast.error("Chat is still loading. Please try again in a moment.");
          }
        }, 1000);
      }
    } else {
      toast.error("Chat is not available. Please refresh the page.");
    }
  };

  const handleResendVerification = async () => {
    if (!auth.currentUser) {
      toast.error("No user found. Please sign in again.");
      return;
    }

    // Check if email is already verified
    if (user.emailVerified) {
      toast.info("Your email is already verified!");
      return;
    }

    setIsSendingVerification(true);
    try {
      // Get Firebase token for authentication
      const token = await auth.currentUser.getIdToken();

      // Call backend API to send verification email to work email
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8000'}/api/v1/account/resend-verification`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Check if this is a GitHub provider error
        if (data.action === 'sign_in_with_work_email') {
          toast.error(
            data.message || "Please sign in with your work email (Google) to verify your email address.",
            {
              duration: 5000,
            }
          );
          return;
        }
        throw new Error(data.error || data.message || 'Failed to send verification email');
      }

      toast.success(`Verification email sent to ${data.email || user.email}! Please check your inbox (and spam folder).`);
      console.log("Verification email sent successfully to work email:", data.email || user.email);
    } catch (error: any) {
      console.error("Failed to send verification email:", error);
      toast.error(error?.message || "Failed to send verification email. Please try again.");
    } finally {
      setIsSendingVerification(false);
    }
  };

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
              <DropdownMenuItem
                className="hover:bg-[#F5F0EB] cursor-pointer"
                onClick={handleOpenPlainChat}
              >
                <MessageCircle />
                Chat with Support
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
