"use client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import React, { useEffect } from "react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = useAuthContext();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const source = searchParams.get("source");
  const redirectUrl = searchParams.get("redirect");
  const agent_id = searchParams.get("agent_id");
  const router = useRouter();

  useEffect(() => {
    if (user) {
      const currentPath = pathname || window.location.pathname;
      
      // Always allow onboarding page - don't redirect away from it
      // This is critical for new SSO users who need to complete onboarding
      if (currentPath.startsWith('/onboarding')) {
        return;
      }
      
      // Handle VSCode authentication flow
      if (source === "vscode") {
        user.getIdToken().then((token: any) => {
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
      // Only redirect if we're not on sign-up, link-github, or onboarding pages
      // Double-check the pathname to ensure we're not on onboarding
      const isOnOnboarding = currentPath.startsWith('/onboarding');
      const isOnSignUp = currentPath.startsWith('/sign-up');
      const isOnLinkGithub = currentPath.startsWith('/link-github');
      
      if (!isOnSignUp && !isOnLinkGithub && !isOnOnboarding) {
        // Only redirect if there's an explicit redirectUrl parameter
        // Don't auto-redirect to "/" for authenticated users
        // Also, don't redirect if redirectUrl is "/" (default redirect)
        const decodedRedirect = redirectUrl ? decodeURIComponent(redirectUrl) : '';
        if (redirectUrl && decodedRedirect !== '/' && decodedRedirect !== '' && !decodedRedirect.startsWith('/onboarding')) {
          router.push(decodedRedirect);
        }
        // If no redirectUrl or redirectUrl is "/", stay on current page (don't force redirect)
      }
    }
  }, [user, source, redirectUrl, agent_id, router, pathname]);

  return (
    <div className="min-h-screen w-full grid place-items-center">
      {children}
    </div>
  );
}