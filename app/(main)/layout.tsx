"use client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Layouts/Sidebar";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cn } from "@/lib/utils";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = useAuthContext();
  const router = useRouter();

  if (user == null) {
    router.push("/sign-in");
    return null;
  }

  return (
    <>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <Sidebar />
        <div className="flex flex-col">
          <main  className={cn(
          "flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6",
          `${GeistSans.variable} ${GeistMono.variable}`
        )}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
