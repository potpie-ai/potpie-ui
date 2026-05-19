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
  const redirect_uri = searchParams.get("redirect_uri");
  const agent_id = searchParams.get("agent_id");
  const router = useRouter();

  useEffect(() => {
    if (user) {
      // Handle VSCode authentication flow
      if (source === "vscode") {
        const fetchCustomTokenWithRetry = (): Promise<string | null> =>
          AuthService.getCustomToken().then((t) =>
            t != null ? t : new Promise((r) => setTimeout(r, 500)).then(() => AuthService.getCustomToken()),
          );
        Promise.all([user.getIdToken(), fetchCustomTokenWithRetry()])
          .then(([token, customToken]) => {
            if (process.env.NODE_ENV === "development") {
              console.log(
                "VSCode auth: token",
                token ? "present" : "absent",
                "customToken",
                customToken ? "present" : "absent",
              );
              if (!customToken) {
                console.warn(
                  "VSCode auth: customToken missing — ensure backend POST /api/v1/auth/custom-token is implemented and returns { customToken }.",
                );
              }
            }
            window.location.href = buildVSCodeCallbackUrl(
              token,
              customToken ?? undefined,
              redirect_uri ?? undefined,
            );
          })
          .catch((err) => {
            console.error(
              "VSCode auth: token fetch failed (getIdToken or getCustomToken)",
              err,
            );
            const errorParams = new URLSearchParams({
              source: "vscode",
              error: "auth_failed",
            });
            if (redirect_uri) errorParams.set("redirect_uri", redirect_uri);
            router.push(`/sign-in?${errorParams.toString()}`);
          });
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
  }, [user, source, redirectUrl, redirect_uri, agent_id, router]);

  return (
    <div className="min-h-screen w-full grid place-items-center">
      {children}
    </div>
  );
}
