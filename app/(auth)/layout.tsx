"use client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = useAuthContext();
  const searchParams = useSearchParams();

  const redirectUrl = searchParams.get("redirect");
  const router = useRouter();
  if (user) {
    if (!window.location.pathname.startsWith('/onboarding') && !window.location.pathname.startsWith('/sign-up') && !window.location.pathname.startsWith('/link-github')) {
      console.log("redirecting to", redirectUrl ? decodeURIComponent(redirectUrl) : "/");
      router.push(redirectUrl ? decodeURIComponent(redirectUrl) : "/");
      return null;
    }
  }
  return (
    <div className="min-h-screen w-full grid place-items-center">
      {children}
    </div>
  );
}
