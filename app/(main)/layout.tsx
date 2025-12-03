"use client";
import { useAuthContext } from "@/contexts/AuthContext";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cn } from "@/lib/utils";
import posthog from "posthog-js";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/Layouts/Sidebar";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/lib/state/store";
import { setBranchName, setRepoName } from "@/lib/state/Reducers/RepoAndBranch";
import { useEffect } from "react";

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
  
  // Handle redirect to sign-in in useEffect to avoid setState during render
  useEffect(() => {
    if (user == null) {
      // Preserve all query parameters when redirecting to sign-in
      const queryString = searchParams.toString();
      const redirectPath = queryString ? `${pathname}?${queryString}` : pathname;
      
      if (repo && branch) {
        dispatch(setRepoName(repo));
        dispatch(setBranchName(branch));
      }
      
      router.push(`/sign-in?redirect=${encodeURIComponent(redirectPath)}`);
    }
  }, [user, pathname, searchParams, router, dispatch, repo, branch]);
  
  // Show loading state while checking auth
  if (user == null) {
    return null;
  }
  
  posthog.identify(user.id, { email: user.email, name: user?.name || "" });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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
