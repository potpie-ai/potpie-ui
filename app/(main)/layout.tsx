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
import { PanelLeft } from "lucide-react";
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
  const agent_id = searchParams.get("agent_id");
  
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
        className="h-9 w-9 bg-background border border-zinc-200 shadow-md hover:bg-zinc-50 hover:shadow-lg transition-shadow"
        onClick={toggleSidebar}
      >
        <PanelLeft className="h-5 w-5 text-foreground" />
        <span className="sr-only">Open Sidebar</span>
      </Button>
    </div>
  );
}
