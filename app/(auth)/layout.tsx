"use client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import AuthService from "@/services/AuthService";
import { buildVSCodeCallbackUrl } from "@/lib/auth/vscode-callback";

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
        Promise.all([user.getIdToken(), AuthService.getCustomToken()]).then(
          ([token, customToken]) => {
            if (process.env.NODE_ENV === "development") {
              console.log(
                "token",
                token,
                "customToken",
                customToken ? "present" : "absent",
              );
            }
            window.location.href = buildVSCodeCallbackUrl(token, customToken);
          },
        );
        return;
      }

      // Handle direct agent_id parameter in sign-in/sign-up URL
      if (agent_id) {
        router.push(`/shared-agent?agent_id=${agent_id}`);
        return;
      }

      // Handle regular authentication flow with redirect parameter
      if (
        !window.location.pathname.startsWith("/onboarding") &&
        !window.location.pathname.startsWith("/sign-up") &&
        !window.location.pathname.startsWith("/link-github")
      ) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            "redirecting to",
            redirectUrl ? decodeURIComponent(redirectUrl) : "/",
          );
        }
        router.push(redirectUrl ? decodeURIComponent(redirectUrl) : "/");
      }
    }
  }, [user, source, redirectUrl, agent_id, router]);

  return (
    <div className="min-h-screen w-full grid place-items-center">
      {children}
    </div>
  );
}
