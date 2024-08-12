"use client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import React from "react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = useAuthContext();
  const router = useRouter();
  if (user) {
    router.push("/");
    return null;
  } else {
    return (
      <div className="min-h-screen w-full grid place-items-center">
        {children}
      </div>
    );
  }
}
