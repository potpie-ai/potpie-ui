"use client";
import { useAuthContext } from "@/contexts/AuthContext";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cn } from "@/lib/utils";
import posthog from "posthog-js";
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/Layouts/Sidebar";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/lib/state/store";
import { setBranchName, setRepoName } from "@/lib/state/Reducers/RepoAndBranch";
import { PanelLeft, AlertCircle, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/sso/unified-auth";
import type { UserAccount } from "@/types/auth";
import { auth } from "@/configs/Firebase-config";
import { toast } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const dispatch: AppDispatch = useDispatch();
  const searchParams = useSearchParams();
  const repo = searchParams.get("repo");
  const branch = searchParams.get("branch");
  const agent_id = searchParams.get("agent_id");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  
  const handleResendVerification = async () => {
    if (!auth.currentUser) {
      toast.error("No user found. Please sign in again.");
      return;
    }

    // Check if email is already verified
    if (accountInfo?.email_verified) {
      toast.info("Your email is already verified!");
      return;
    }

    const workEmail = accountInfo?.email || user?.email;
    
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

      toast.success(`Verification email sent to ${data.email || workEmail}! Please check your inbox (and spam folder).`);
      console.log("Verification email sent successfully to work email:", data.email || workEmail);
    } catch (error: any) {
      console.error("Failed to send verification email:", error);
      toast.error(error?.message || "Failed to send verification email. Please try again.");
    } finally {
      setIsSendingVerification(false);
    }
  };

  // Fetch account info from backend to get work email and verification status
  const { data: accountInfo } = useQuery<UserAccount>({
    queryKey: ["accountInfo", user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new Error("No user ID");
      const token = await user.getIdToken();
      return authClient.getAccount(token);
    },
    enabled: !!user?.uid && !!user,
    retry: false,
  });
  
  if (user == null) {
    // Preserve all query parameters when redirecting to sign-in
    const queryString = searchParams.toString();
    const redirectPath = queryString ? `${pathname}?${queryString}` : pathname;
    
    if (repo && branch) {
      dispatch(setRepoName(repo));
      dispatch(setBranchName(branch));
    }
    
    router.push(`/sign-in?redirect=${encodeURIComponent(redirectPath)}`);
    return null;
  }
  posthog.identify(user.id, { email: user.email, name: user?.name || "" });

  // Use verification status from backend (work email), not Firebase (which might be GitHub email)
  const workEmail = accountInfo?.email || user?.email;
  const emailNotVerified = accountInfo?.email_verified === false;
  const showBanner = emailNotVerified && !bannerDismissed;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SidebarOpenButton />
        {showBanner && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-3">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Email verification required
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    Please verify your email address ({workEmail}) to continue using all features.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={isSendingVerification}
                  className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                >
                  <Mail className="h-4 w-4 mr-1.5" />
                  {isSendingVerification ? "Sending..." : "Resend"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBannerDismissed(true)}
                  className="text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
        <main
          className={cn(
            "flex flex-1 flex-col gap-4 lg:gap-6",
            `${GeistSans.variable} ${GeistMono.variable}`
          )}
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function SidebarOpenButton() {
  const { state, toggleSidebar } = useSidebar();

  // Only show when sidebar is collapsed
  if (state === "expanded") {
    return null;
  }

  return (
    <div className="absolute top-4 left-4 z-[100]">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 bg-background border border-zinc-200 shadow-md hover:bg-zinc-50 hover:shadow-lg transition-shadow"
        onClick={toggleSidebar}
      >
        <PanelLeft className="h-5 w-5 text-foreground" />
        <span className="sr-only">Open Sidebar</span>
      </Button>
    </div>
  );
}
