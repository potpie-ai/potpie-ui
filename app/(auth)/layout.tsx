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
      // Handle VSCode authentication flow
      if (source === "vscode") {
        user.getIdToken().then((token: any) => {
          if (process.env.NODE_ENV === 'development') {
            console.log("token", token);
          }
          // Get Firebase refresh token to send to VS Code extension
          // This allows the extension to refresh tokens without requiring re-login
          const refreshToken = (user as any).stsTokenManager?.refreshToken || "";
          
          // Use redirect parameter from query string (supports custom ports)
          // Fallback to default localhost:54333 if not provided
          const callbackUrlStr = redirectUrl 
            ? decodeURIComponent(redirectUrl) 
            : "http://localhost:54333/auth/callback";
          
          try {
            const callbackUrl = new URL(callbackUrlStr);
            callbackUrl.searchParams.set("token", token);
            if (refreshToken) {
              callbackUrl.searchParams.set("refreshToken", refreshToken);
            }
            // Use window.location.replace to avoid history issues
            window.location.replace(callbackUrl.toString());
          } catch (error) {
            console.error("Error constructing callback URL:", error);
            // Fallback to default
            const fallbackUrl = new URL("http://localhost:54333/auth/callback");
            fallbackUrl.searchParams.set("token", token);
            if (refreshToken) {
              fallbackUrl.searchParams.set("refreshToken", refreshToken);
            }
            window.location.replace(fallbackUrl.toString());
          }
        });
        return;
      }

      // Handle direct agent_id parameter in sign-in/sign-up URL
      if (agent_id) {
        router.push(`/shared-agent?agent_id=${agent_id}`);
        return;
      }

      // Handle regular authentication flow with redirect parameter
      if (!window.location.pathname.startsWith('/onboarding') && 
          !window.location.pathname.startsWith('/sign-up') && 
          !window.location.pathname.startsWith('/link-github')) {
        if (process.env.NODE_ENV === 'development') {
          console.log("redirecting to", redirectUrl ? decodeURIComponent(redirectUrl) : "/");
        }
        // Only use router.push for internal routes (relative paths)
        // For external URLs (like localhost), use window.location.href
        const decodedRedirect = redirectUrl ? decodeURIComponent(redirectUrl) : "/";
        if (decodedRedirect.startsWith('http://') || decodedRedirect.startsWith('https://')) {
          // External URL - use window.location
          window.location.href = decodedRedirect;
        } else {
          // Internal route - use router
          router.push(decodedRedirect);
        }
      }
    }
  }, [user, source, redirectUrl, agent_id, router]);

  return (
    <div className="min-h-screen w-full grid place-items-center">
      {children}
    </div>
  );
}