"use client";
import { useAuthContext } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cn } from "@/lib/utils";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/Layouts/Sidebar";
import {
  PageActions,
  PageHeader,
  PageHeaderHeading,
} from "@/components/ui/header";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  if (user == null) {
    router.push(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
      <main
        className={cn(
          "flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6",
          `${GeistSans.variable} ${GeistMono.variable}`
        )}
      >
        {children}
      </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
