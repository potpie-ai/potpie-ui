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
import { getUserFriendlyError } from "@/lib/utils/errorMessages";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

import { LucideGithub, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import React from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { useSearchParams, useRouter } from "next/navigation";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LinkProviderDialog } from '@/components/auth/LinkProviderDialog';
import { DirectSSOButtons } from '@/components/auth/DirectSSOButtons';
import type { SSOLoginResponse } from '@/types/auth';
import { validateWorkEmail } from "@/lib/utils/emailValidation";

export default function Signin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source");
  const agent_id = searchParams.get("agent_id");
  const redirectUrl = searchParams.get("redirect");
  
  // SSO state
  const [linkingData, setLinkingData] = React.useState<SSOLoginResponse | null>(null);
  const [showLinkingDialog, setShowLinkingDialog] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  // Extract agent_id from redirect URL if present
  let redirectAgent_id = "";
  if (redirectUrl) {
    try {
      const redirectPath = decodeURIComponent(redirectUrl);
      const url = new URL(redirectPath, window.location.origin);
      redirectAgent_id = url.searchParams.get("agent_id") || "";
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error parsing redirect URL:", e);
      }
    }
  }

  // Use agent_id from either direct parameter or redirect URL
  const finalAgent_id = agent_id || redirectAgent_id;

  const formSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
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
    // Validate work email
    const emailValidation = validateWorkEmail(data.email);
    if (!emailValidation.isValid) {
      form.setError("email", { message: emailValidation.errorMessage });
      // Don't show toast - inline error is sufficient
      return;
    }

    signInWithEmailAndPassword(auth, data.email, data.password)
      .then(async (userCredential) => {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        const user = userCredential.user;
        const headers = await getHeaders();
        const userSignup = await axios
          .post(`${baseUrl}/api/v1/signup`, user, { headers: headers })
          .then((res) => {
            if (source === "vscode") {
              if (process.env.NODE_ENV === 'development') {
                console.log("res.data", res.data);
              }
              handleExternalRedirect(res.data.token);
            } else if (finalAgent_id) {
              handleExternalRedirect("");
            }
            return res.data;
          })
          .catch((e) => {
            toast.error("Signup call unsuccessful");
          });
        toast.success("Logged in successfully as " + (user.displayName || user.email));
      })
      .catch(async (error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        
        // If invalid credentials, check if user might have signed up with SSO
        if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found') {
          try {
            // Check if user exists with SSO by calling backend
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
            const checkResponse = await axios.get(
              `${baseUrl}/api/v1/account/check-email?email=${encodeURIComponent(data.email)}`,
              { validateStatus: () => true } // Don't throw on any status
            );
            
            if (checkResponse.status === 200 && checkResponse.data?.has_sso) {
              const friendlyError = 'This email is registered with Google SSO. Please sign in with Google instead.';
              form.setError("email", { message: friendlyError });
              // Don't show toast - inline error is sufficient
              return;
            }
          } catch (checkError) {
            // If check fails, fall through to default error
            if (process.env.NODE_ENV === 'development') {
              console.error("Error checking SSO status:", checkError);
            }
          }
        }
        
        const friendlyError = getUserFriendlyError(error);
        form.setError("email", { message: friendlyError });
        // Don't show toast - inline error is sufficient
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
            if (process.env.NODE_ENV === 'development') {
              console.error("API error:", e);
            }
            toast.error(getUserFriendlyError(e));
          }
        }
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        const email = error.customData?.email;
        const credential = GithubAuthProvider.credentialFromError(error);
        const friendlyError = getUserFriendlyError(error);
        toast.error(friendlyError);
      });
  };

  // SSO handlers
  const handleSSONeedsLinking = (response: SSOLoginResponse) => {
    setLinkingData(response);
    setShowLinkingDialog(true);
  };

  const handleSSOLinked = () => {
    // After linking, redirect based on context
    if (source === "vscode") {
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
      router.push('/newchat');
    } else if (finalAgent_id) {
      router.push(`/shared-agent?agent_id=${finalAgent_id}`);
    } else {
      router.push('/newchat');
    }
  };

  return (
    <section className="lg:flex-row flex-col-reverse flex items-center justify-between w-full lg:h-screen relative page-transition">
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

      <div className="w-1/2 h-full flex items-center justify-center flex-col gap-4">
        <div className="flex items-center justify-center flex-row gap-3 mb-4">
          <Image
            src={"/images/potpie-blue.svg"}
            width={100}
            height={100}
            alt="logo"
            className="transition-transform duration-300 hover:scale-105"
          />
          <h1 className="text-7xl font-bold text-gray-800 tracking-tight">potpie</h1>
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
          <div className="w-80 mt-14 space-y-6 form-fade-in">
            {/* GitHub Sign-in */}
            <button
              onClick={() => onGithub()}
              className="btn-enterprise flex items-center justify-center w-full h-14 px-5 py-4 gap-3 hover:bg-black hover:shadow-lg bg-gray-800 rounded-lg text-white text-base"
            >
              <LucideGithub className="w-6 h-6 flex-shrink-0" />
              <span className="font-medium text-base">Sign in with GitHub</span>
            </button>

            {/* SSO Buttons */}
            <DirectSSOButtons
              onNeedsLinking={handleSSONeedsLinking}
              onSuccess={handleSSOSuccess}
            />

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500 font-medium">or continue with email</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <input
                  type="email"
                  placeholder="you@company.com"
                  {...form.register("email")}
                  className={`input-enterprise w-full px-5 py-4 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm placeholder:text-gray-400 text-gray-900 text-base ${
                    form.formState.errors.email
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                />
                {form.formState.errors.email && (
                  <p className="mt-2 text-sm text-red-600 error-message-enter font-medium">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    {...form.register("password")}
                    className={`input-enterprise w-full px-5 py-4 pr-14 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm placeholder:text-gray-400 text-gray-900 text-base ${
                      form.formState.errors.password
                        ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-6 w-6" />
                    ) : (
                      <Eye className="h-6 w-6" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="mt-2 text-sm text-red-600 error-message-enter font-medium">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="btn-enterprise w-full h-14 px-5 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg text-base"
              >
                Sign in
              </Button>
            </form>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link 
                href="/sign-up" 
                className="link-smooth text-blue-600 font-semibold hover:text-blue-700"
              >
                Sign up
              </Link>
            </p>
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
