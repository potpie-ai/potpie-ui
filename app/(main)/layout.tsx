"use client";
import { useAuthContext } from "@/contexts/AuthContext";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cn } from "@/lib/utils";
import posthog from "posthog-js";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/Layouts/Sidebar";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/lib/state/store";
import { setBranchName, setRepoName } from "@/lib/state/Reducers/RepoAndBranch";

import { Button } from "@/components/ui/button";

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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SidebarOpenButton />
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
        className="h-9 w-9 bg-white border border-zinc-200 shadow-md hover:bg-white hover:shadow-lg transition-shadow"
        onClick={toggleSidebar}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.34082 14.9792C2.50863 15.7188 2.78449 16.2805 3.23798 16.7341C4.39575 17.8918 6.25913 17.8918 9.98594 17.8918C13.7127 17.8918 15.5761 17.8918 16.7338 16.7341C17.8915 15.5763 17.8915 13.7128 17.8915 9.98611C17.8915 6.25934 17.8915 4.39596 16.7338 3.2382C15.5761 2.08044 13.7127 2.08044 9.98594 2.08044C6.25913 2.08044 4.39575 2.08044 3.23798 3.2382C2.78449 3.6917 2.50863 4.25346 2.34082 4.99306" stroke="#00291C" strokeWidth="1.24826" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4.57661 7.48958L2.08008 9.98611L4.57661 12.4826M2.91225 9.98611H8.73749" stroke="#00291C" strokeWidth="1.24826" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12.4824 2.07881V17.8901" stroke="#00291C" strokeWidth="1.24826"/>
          <path d="M17.8916 7.07187H12.4824M17.8916 12.8971H12.4824" stroke="#00291C" strokeWidth="1.24826"/>
        </svg>
        <span className="sr-only">Open Sidebar</span>
      </Button>
    </div>
  );
}
