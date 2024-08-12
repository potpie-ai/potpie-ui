"use client";
import Navbar from "@/components/Layouts/navbar/Navbar";
import Sidebar from "@/components/Layouts/sidebar/Sidebar";
import { useSidebarContext } from "@/contexts/SidebarContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import React from "react";
import Footer from "@/components/Layouts/footer/Footer";
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = useAuthContext();
  const router = useRouter();
  const { isSidebarOpen } = useSidebarContext();

  if (user == null) {
    router.push("/sign-in");
    return null;
  }

  return (
    <>
      <div
        className={`grid h-screen w-full ${
          isSidebarOpen ? "pl-[195px]" : "pl-[56px]"
        }`}
      >
        <Sidebar />
        <div className="flex flex-col">
          <Navbar />
          <main className="overflow-auto py-5 px-7 pb-12">{children}</main>
        </div>
        <Footer />
      </div>
    </>
  );
}
