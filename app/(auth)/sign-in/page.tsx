"use client";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  GithubAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/configs/Firebase-config";
import { toast } from "sonner";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

import { LucideCheck, LucideGithub, Mail } from "lucide-react";
import Image from "next/image";
import React from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { useSearchParams, useRouter } from "next/navigation";
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

export default function Signin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source");
  const agent_id = searchParams.get("agent_id");
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

  // Use agent_id from either direct parameter or redirect URL
  const finalAgent_id = agent_id || redirectAgent_id;

  const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, { message: "Password is required" }),
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const provider = new GithubAuthProvider();
  provider.addScope("read:org");
  provider.addScope("user:email");

  const handleExternalRedirect = async (token: string) => {
    if (finalAgent_id) {
      window.location.href = `/shared-agent?agent_id=${finalAgent_id}`;
    } else if (source === "vscode") {
      window.location.href = `http://localhost:54333/auth/callback?token=${token}`;
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    signInWithEmailAndPassword(auth, data.email, data.password)
      .then(async (userCredential) => {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        const user = userCredential.user;
        const headers = await getHeaders();
        const userSignup = await axios
          .post(`${baseUrl}/api/v1/signup`, user, { headers: headers })
          .then((res) => {
            if (source === "vscode") {
              console.log("res.data", res.data);
              handleExternalRedirect(res.data.token);
            } else if (finalAgent_id) {
              handleExternalRedirect("");
            }
            return res.data;
          })
          .catch((e) => {
            toast.error("Signup call unsuccessful");
          });
        toast.success("Logged in successfully as " + user.displayName);
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        toast.error(errorMessage);
      });
  };

  const onGithub = async () => {
    signInWithPopup(auth, provider)
      .then(async (result) => {
        const credential = GithubAuthProvider.credentialFromResult(result);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        if (credential) {
          try {
            const headers = await getHeaders();
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
                accessToken: credential.accessToken,
                providerUsername: (result as any)._tokenResponse.screenName,
              },
              { headers: headers }
            );

            posthog.identify(result.user.uid, {
              email: result.user.email,
              name: result.user?.displayName || "",
            });
            //if this is a new user
            if (!userSignup.data.exists) {
              // For new users, redirect to onboarding
              toast.success(
                "Account created successfully as " + result.user.displayName
              );

              const urlSearchParams = new URLSearchParams(
                window.location.search
              );
              const plan = (
                urlSearchParams.get("plan") ||
                urlSearchParams.get("PLAN") ||
                ""
              ).toLowerCase();
              const prompt = urlSearchParams.get("prompt") || "";

              return (window.location.href = `/onboarding?uid=${result.user.uid}&email=${encodeURIComponent(result.user.email || "")}&name=${encodeURIComponent(result.user.displayName || "")}&plan=${plan}&prompt=${encodeURIComponent(prompt)}&agent_id=${encodeURIComponent(finalAgent_id || "")}`);
            }

            if (source === "vscode") {
              handleExternalRedirect(userSignup.data.token);
            } else if (finalAgent_id) {
              handleExternalRedirect("");
            } else {
              window.location.href = "/newchat";
            }

            toast.success(
              "Logged in successfully as " + result.user.displayName
            );
          } catch (e: any) {
            console.error("API error:", e);
            toast.error("Sign-in unsuccessful");
          }
        }
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        const email = error.customData?.email;
        const credential = GithubAuthProvider.credentialFromError(error);
        toast.error(errorMessage);
      });
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
    // After linking, redirect based on context
    if (source === "vscode") {
      // Handle vscode redirect - would need token from backend
      router.push('/newchat');
    } else if (finalAgent_id) {
      router.push(`/shared-agent?agent_id=${finalAgent_id}`);
    } else {
      router.push('/newchat');
    }
  };

  const handleSSOSuccess = () => {
    // For existing users signing in via SSO
    if (source === "vscode") {
      // Handle vscode redirect - would need token from backend
      router.push('/newchat');
    } else if (finalAgent_id) {
      router.push(`/shared-agent?agent_id=${finalAgent_id}`);
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

      <div className="w-1/2 h-full flex items-center justify-center flex-col gap-2">
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
          {/* <h3 className="text-2xl font-bold text-black">Get Started!</h3> */}
          {/* <div className="flex items-start justify-start flex-col mt-10 gap-4">
          <p className="flex items-center justify-center text-start gap-4">
            <LucideCheck
              size={20}
              className="bg-primary rounded-full p-[0.5px] text-white"
            />
            Select the repositories you want to build your AI agents on.
          </p>
          <p className="flex items-center justify-center text-start gap-4">
            <LucideCheck
              size={20}
              className="bg-primary rounded-full p-[0.5px] text-white"
            />
            You can choose to add more repositories later on from the
            dashboard
          </p>
        </div> */}
          <Button
            onClick={() => onGithub()}
            className="mt-14 gap-2 w-60 hover:bg-black bg-gray-800"
          >
            <LucideGithub className=" rounded-full border border-white p-1" />
            Signin with GitHub
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
                      Sign in with: <span className="font-semibold text-gray-900">{ssoEmail}</span>
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
          
          <div className="mt-4 text-center text-sm text-black">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="underline">
              Sign up
            </Link>
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
}
