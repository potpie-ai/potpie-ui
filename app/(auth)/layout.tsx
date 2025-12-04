"use client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = useAuthContext();
  const searchParams = useSearchParams();
  const source = searchParams.get("source");
  const redirectUrl = searchParams.get("redirect");
  const agent_id = searchParams.get("agent_id");
  const router = useRouter();

  useEffect(() => {
    if (user) {
      const currentPath = window.location.pathname;
      
      // Always allow onboarding page - don't redirect away from it
      if (currentPath.startsWith('/onboarding')) {
        console.log("User authenticated on onboarding page - allowing access");
        return;
      }
      
      // Handle VSCode authentication flow
      if (source === "vscode") {
        user.getIdToken().then((token: any) => {
          console.log("token", token);
          window.location.href = `http://localhost:54333/auth/callback?token=${token}`;
        });
        return;
      }

      // Handle direct agent_id parameter in sign-in/sign-up URL
      if (agent_id) {
        router.push(`/shared-agent?agent_id=${agent_id}`);
        return;
      }

      // Handle regular authentication flow with redirect parameter
      // Only redirect if we're not on sign-up or link-github pages
      if (!currentPath.startsWith('/sign-up') && 
          !currentPath.startsWith('/link-github')) {
        // Only redirect if there's an explicit redirectUrl parameter
        // Don't auto-redirect to "/" for authenticated users
        if (redirectUrl) {
          console.log("redirecting to", decodeURIComponent(redirectUrl));
          router.push(decodeURIComponent(redirectUrl));
        }
        // If no redirectUrl, stay on current page (don't force redirect to "/")
      }
    }
  }, [user, source, redirectUrl, agent_id, router]);

  return (
    <div className="min-h-screen w-full grid place-items-center">
      {children}
    </div>
  );
}