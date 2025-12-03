"use client";
import getHeaders from "@/app/utils/headers.util";
import { Button } from "@/components/ui/button";
import { auth } from "@/configs/Firebase-config";
import {
  arrowcon,
  chat,
  cloud,
  cross,
  logo60,
  logoWithText,
  sendBlue,
  setting,
} from "@/public";
import axios from "axios";
import { GithubAuthProvider, signInWithPopup } from "firebase/auth";
import { LucideCheck, LucideGithub, Mail } from "lucide-react";
import Image from "next/image";
import { usePostHog } from "posthog-js/react";
import React, { useRef } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { WorkEmailSSO } from '@/components/auth/WorkEmailSSO';
import { LinkProviderDialog } from '@/components/auth/LinkProviderDialog';
import type { SSOLoginResponse } from '@/types/auth';

// Initialize MSAL for Azure AD
const msalConfig = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_SSO_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_SSO_TENANT_ID || 'common'}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : undefined,
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

const Signup = () => {
  const githubAppUrl =
    "https://github.com/apps/" +
    process.env.NEXT_PUBLIC_GITHUB_APP_NAME +
    "/installations/select_target?setup_action=install";
  const posthog = usePostHog();
  const popupRef = useRef<Window | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  
  // SSO state
  const [ssoEmail, setSsoEmail] = React.useState('');
  const [ssoEmailInput, setSsoEmailInput] = React.useState('');
  const [showSSOFlow, setShowSSOFlow] = React.useState(false);
  const [linkingData, setLinkingData] = React.useState<SSOLoginResponse | null>(null);
  const [showLinkingDialog, setShowLinkingDialog] = React.useState(false);

  // Extract agent_id from redirect URL if present
  let redirectAgent_id = "";
  if (redirectUrl) {
    try {
      const redirectPath = decodeURIComponent(redirectUrl);
      const url = new URL(redirectPath, window.location.origin);
      redirectAgent_id = url.searchParams.get("agent_id") || "";
    } catch (e) {
      console.error("Error parsing redirect URL:", e);
    }
  }

  // Cleanup function for timers and popups
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (popupRef.current) {
        popupRef.current.close();
        popupRef.current = null;
      }
    };
  }, []);

  const cleanupAndNavigate = (path: string) => {
    // Clean up any existing timers and popups
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (popupRef.current) {
      popupRef.current.close();
      popupRef.current = null;
    }
    return router.push(path);
  };

  const openPopup = async (
    result: any,
    plan: string = "",
    prompt: string = "",
    agent_id: string = ""
  ) => {
    console.log(
      "[DEBUG] openPopup called with plan:",
      plan,
      "prompt:",
      prompt,
      "agent_id:",
      agent_id
    );

    // Clean up any existing timer and popup
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (popupRef.current) {
      popupRef.current.close();
      popupRef.current = null;
    }

    const popup = window.open(githubAppUrl, "_blank", "noopener,noreferrer");

    if (!popup) {
      // Popup was blocked
      toast.error("Please allow popups for GitHub app installation");
      // For new users, still redirect to onboarding even if popup is blocked
      return router.push(
        `/onboarding?uid=${result.user.uid}&email=${encodeURIComponent(result.user.email || "")}&name=${encodeURIComponent(result.user.displayName || "")}&plan=${plan}&prompt=${encodeURIComponent(prompt)}&agent_id=${encodeURIComponent(agent_id)}`
      );
    }

    popupRef.current = popup;
    console.log("[DEBUG] GitHub app installation popup opened");

    return new Promise((resolve) => {
      const timer = setInterval(() => {
        if (popup.closed) {
          console.log("[DEBUG] GitHub app installation popup closed");
          clearInterval(timer);
          timerRef.current = null;
          // Only redirect to onboarding after popup is closed
          console.log("[DEBUG] Redirecting to onboarding");
          resolve(
            router.push(
              `/onboarding?uid=${result.user.uid}&email=${encodeURIComponent(result.user.email || "")}&name=${encodeURIComponent(result.user.displayName || "")}&plan=${plan}&prompt=${encodeURIComponent(prompt)}&agent_id=${encodeURIComponent(agent_id)}`
            )
          );
        }
      }, 500);
      timerRef.current = timer;
    });
  };

  const provider = new GithubAuthProvider();
  provider.addScope("read:org");
  provider.addScope("user:email");

  const onGithub = async () => {
    if (isLoading) return;
    setIsLoading(true);

    // Capture click event when the action actually happens
    posthog.capture("github login clicked");

    try {
      console.log("[DEBUG] Starting GitHub sign in flow");
      const result = await signInWithPopup(auth, provider);
      console.log("[DEBUG] Firebase auth successful");
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const headers = await getHeaders();

      try {
        console.log("[DEBUG] Making signup API call");
        const userSignup = await axios.post(
          `${baseUrl}/api/v1/signup`,
          {
            uid: result.user.uid,
            email: result.user.email,
            displayName:
              result.user.displayName || result.user.email?.split("@")[0],
            emailVerified: result.user.emailVerified,
            createdAt: result.user.metadata?.creationTime
              ? new Date(result.user.metadata.creationTime).toISOString()
              : "",
            lastLoginAt: result.user.metadata?.lastSignInTime
              ? new Date(result.user.metadata.lastSignInTime).toISOString()
              : "",
            providerData: result.user.providerData,
            accessToken: (result as any)._tokenResponse.oauthAccessToken,
            providerUsername: (result as any)._tokenResponse.screenName,
          },
          { headers: headers }
        );

        console.log("[DEBUG] Signup API response:", userSignup.data);

        posthog.identify(result.user.uid, {
          email: result.user.email,
          name: result.user?.displayName || "",
        });

        const urlSearchParams = new URLSearchParams(window.location.search);
        const plan = (
          urlSearchParams.get("plan") ||
          urlSearchParams.get("PLAN") ||
          ""
        ).toLowerCase();
        const prompt = urlSearchParams.get("prompt") || "";
        const agent_id =
          urlSearchParams.get("agent_id") || redirectAgent_id || "";
        console.log(
          "[DEBUG] URL params - plan:",
          plan,
          "prompt:",
          prompt,
          "agent_id:",
          agent_id
        );

        if (userSignup.data.exists) {
          console.log("[DEBUG] Existing user detected");
          toast.success("Welcome back " + result.user.displayName);

          // Handle special navigation cases for existing users
          if (agent_id) {
            console.log(
              "[DEBUG] Agent ID parameter detected, redirecting to shared agent"
            );
            return cleanupAndNavigate(`/shared-agent?agent_id=${agent_id}`);
          } else if (plan) {
            console.log(
              "[DEBUG] Plan parameter detected, redirecting to checkout"
            );
            try {
              const subUrl = process.env.NEXT_PUBLIC_SUBSCRIPTION_BASE_URL;
              const response = await axios.get(
                `${subUrl}/create-checkout-session?user_id=${result.user.uid}&plan_type=${plan}`,
                { headers: { "Content-Type": "application/json" } }
              );

              if (response.data.url) {
                window.location.href = response.data.url;
              } else {
                throw new Error("No checkout URL received");
              }
            } catch (error) {
              console.error("Error getting checkout URL:", error);
              toast.error(
                "Failed to start checkout process. Please try again."
              );
              return cleanupAndNavigate("/newchat");
            }
          } else if (prompt) {
            console.log(
              "[DEBUG] Prompt parameter detected, redirecting to all-agents with create modal"
            );
            return cleanupAndNavigate(
              `/all-agents?createAgent=true&prompt=${encodeURIComponent(prompt)}`
            );
          } else {
            // Default navigation for existing users
            return cleanupAndNavigate("/newchat");
          }
        } else {
          console.log(
            "[DEBUG] New user detected, proceeding with GitHub app installation"
          );
          toast.success(
            "Account created successfully as " + result.user.displayName
          );
          await openPopup(result, plan, prompt, agent_id);
        }
      } catch (e: any) {
        console.log("[DEBUG] API error:", e.response?.status, e.message);
        if (e.response?.status === 409) {
          console.log(
            "[DEBUG] 409 Conflict - User exists, redirecting to sign-in"
          );
          toast.info("Account already exists. Please sign in.");
          return cleanupAndNavigate("/sign-in");
        } else {
          toast.error("Signup call unsuccessful");
        }
      }
    } catch (e) {
      console.log("[DEBUG] Firebase auth error:", e);
      toast.error("Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  // SSO handlers
  const handleSSOEmailSubmit = () => {
    if (!ssoEmailInput || !ssoEmailInput.includes('@')) {
      toast.error('Please enter a valid work email address');
      return;
    }
    setSsoEmail(ssoEmailInput);
  };

  const handleSSONeedsLinking = (response: SSOLoginResponse) => {
    setLinkingData(response);
    setShowLinkingDialog(true);
  };

  const handleSSOLinked = () => {
    // After linking, redirect based on user status
    const urlSearchParams = new URLSearchParams(window.location.search);
    const plan = (urlSearchParams.get("plan") || urlSearchParams.get("PLAN") || "").toLowerCase();
    const prompt = urlSearchParams.get("prompt") || "";
    const agent_id = urlSearchParams.get("agent_id") || redirectAgent_id || "";

    if (agent_id) {
      router.push(`/shared-agent?agent_id=${agent_id}`);
    } else if (plan) {
      // Handle plan redirect for existing users
      router.push(`/checkout?plan=${plan}`);
    } else if (prompt) {
      router.push(`/all-agents?createAgent=true&prompt=${encodeURIComponent(prompt)}`);
    } else {
      router.push('/newchat');
    }
  };

  const handleSSOSuccess = () => {
    // For new users from SSO, redirect to onboarding
    // The backend will return 'new_user' status for new accounts
    const urlSearchParams = new URLSearchParams(window.location.search);
    const plan = (urlSearchParams.get("plan") || urlSearchParams.get("PLAN") || "").toLowerCase();
    const prompt = urlSearchParams.get("prompt") || "";
    const agent_id = urlSearchParams.get("agent_id") || redirectAgent_id || "";

    // For new SSO users, we'll redirect to onboarding
    // Note: The WorkEmailSSO component handles 'new_user' status and redirects to onboarding
    // This handler is for 'success' status (existing user)
    if (agent_id) {
      router.push(`/shared-agent?agent_id=${agent_id}`);
    } else if (plan) {
      router.push(`/checkout?plan=${plan}`);
    } else if (prompt) {
      router.push(`/all-agents?createAgent=true&prompt=${encodeURIComponent(prompt)}`);
    } else {
      router.push('/newchat');
    }
  };

  const resetSSOFlow = () => {
    setShowSSOFlow(false);
    setSsoEmail('');
    setSsoEmailInput('');
  };

  return (
    <section className="lg:flex-row flex-col-reverse flex items-center justify-between w-full lg:h-screen relative">
      <div className="flex items-center justify-center w-1/2 h-full p-6">
        <div className="relative h-full w-full rounded-lg overflow-hidden">
          <Image
            src={"/images/landing.png"}
            alt="landing"
            layout="fill"
            objectFit="cover"
          />
        </div>
      </div>

      <div className="w-1/2 h-full flex items-center justify-center flex-col gap-14">
        <div className="flex items-center justify-center flex-row gap-2">
          <Image
            src={"/images/potpie-blue.svg"}
            width={100}
            height={100}
            alt="logo"
          />
          <h1 className="text-7xl font-bold text-gray-700">potpie</h1>
        </div>
        <div className="flex items-center justify-center flex-col text-border">
          <h3 className="text-2xl font-bold text-black">Get Started!</h3>
          <div className="flex items-start justify-start flex-col mt-10 gap-4">
            <p className="flex items-center justify-center text-start text-black gap-4">
              <LucideCheck
                size={20}
                className="bg-primary rounded-full p-[0.5px] text-white"
              />
              Select the repositories you want to build your AI agents on.
            </p>
            <p className="flex items-center justify-center text-start text-black gap-4">
              <LucideCheck
                size={20}
                className="bg-primary rounded-full p-[0.5px] text-white"
              />
              You can choose to add more repositories later on from the
              dashboard
            </p>
          </div>
          <Button
            onClick={() => onGithub()}
            className="mt-14 gap-2 w-60 hover:bg-black bg-gray-800"
            disabled={isLoading}
          >
            <LucideGithub className="rounded-full border border-white p-1" />
            {isLoading ? "Signing in..." : "Continue with GitHub"}
          </Button>

          {/* SSO Flow - In-place */}
          <div className="w-60 transition-all duration-300 ease-in-out">
            {!showSSOFlow ? (
              <div className="space-y-6 transition-opacity duration-300 ease-in-out">
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-3 text-gray-500 font-medium">or</span>
                  </div>
                </div>

                <Button
                  onClick={() => setShowSSOFlow(true)}
                  variant="outline"
                  className="gap-2 w-full h-12 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50/80 bg-white shadow-sm hover:shadow-md transition-all duration-200 ease-in-out group"
                  disabled={isLoading}
                >
                  <Mail className="w-5 h-5 text-gray-600 group-hover:text-gray-700 transition-colors" />
                  <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
                    Continue with Work Email
                  </span>
                </Button>
              </div>
            ) : (
              <div className="mt-6 space-y-3 transition-all duration-300 ease-in-out">
                {!ssoEmail ? (
                  <div className="w-full space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 relative">
                        <input
                          type="email"
                          placeholder="you@company.com"
                          value={ssoEmailInput}
                          onChange={(e) => setSsoEmailInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSSOEmailSubmit();
                            }
                          }}
                          className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm hover:shadow-md transition-all duration-200 placeholder:text-gray-400 text-gray-900"
                          autoFocus
                        />
                        {ssoEmailInput && (
                          <button
                            onClick={() => setSsoEmailInput('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <button
                        onClick={resetSSOFlow}
                        className="px-4 py-3 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                    <button
                      onClick={handleSSOEmailSubmit}
                      disabled={!ssoEmailInput || !ssoEmailInput.includes('@')}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md font-medium disabled:hover:shadow-sm"
                    >
                      Continue
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 transition-opacity duration-300 ease-in-out">
                    <div className="text-sm text-gray-600 text-center py-2 px-3 bg-gray-50 rounded-lg border border-gray-200">
                      Sign up with: <span className="font-semibold text-gray-900">{ssoEmail}</span>
                    </div>
                    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_SSO_CLIENT_ID || ''}>
                      <MsalProvider instance={msalInstance}>
                        <WorkEmailSSO
                          email={ssoEmail}
                          onNeedsLinking={handleSSONeedsLinking}
                          onSuccess={handleSSOSuccess}
                        />
                      </MsalProvider>
                    </GoogleOAuthProvider>
                    <button
                      onClick={resetSSOFlow}
                      className="w-full text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 py-2 rounded-lg transition-colors duration-200 font-medium"
                    >
                      Use different email
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Link Provider Dialog */}
      {linkingData && (
        <LinkProviderDialog
          isOpen={showLinkingDialog}
          onClose={() => {
            setShowLinkingDialog(false);
            setLinkingData(null);
          }}
          linkingData={linkingData}
          onLinked={handleSSOLinked}
        />
      )}
    </section>
  );
};

export default Signup;
