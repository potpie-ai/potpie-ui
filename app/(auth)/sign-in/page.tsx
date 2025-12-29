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
import { isNewUser, deleteUserAndSignOut } from "@/lib/utils/emailValidation";
import AuthService from "@/services/AuthService";

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
    signInWithEmailAndPassword(auth, data.email, data.password)
      .then(async (userCredential) => {
        const user = userCredential.user;
        
        try {
          const userSignup = await AuthService.signupWithEmailPassword(user);
          
          // CRITICAL: Check GitHub linking from backend response
          // Login cannot succeed unless GitHub is linked
          if (userSignup.needs_github_linking) {
            // Redirect to onboarding to link GitHub
            toast.info('Almost there! Link your GitHub to unlock the magic');
            const urlSearchParams = new URLSearchParams(window.location.search);
            const plan = (urlSearchParams.get("plan") || urlSearchParams.get("PLAN") || "").toLowerCase();
            const prompt = urlSearchParams.get("prompt") || "";
            
            const onboardingParams = new URLSearchParams({
              uid: user.uid,
              ...(user.email && { email: user.email }),
              ...(user.displayName && { name: user.displayName }),
              ...(plan && { plan }),
              ...(prompt && { prompt }),
              ...(finalAgent_id && { agent_id: finalAgent_id }),
            });
            
            // Use window.location.href for a full page navigation to avoid React hooks issues
            window.location.href = `/onboarding?${onboardingParams.toString()}`;
            return;
          }
          
          // GitHub is linked - proceed with normal login flow
          if (source === "vscode") {
            if (process.env.NODE_ENV !== 'production') {
              console.log("res.data", userSignup);
            }
            if (userSignup.token) {
              handleExternalRedirect(userSignup.token);
            }
          } else if (finalAgent_id) {
            handleExternalRedirect("");
          } else {
            router.push('/newchat');
          }
          
          toast.success("Welcome back " + (user.displayName || user.email) + "! Ready to build?");
        } catch (error: any) {
          toast.error(error.message || "Signup call unsuccessful");
        }
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error("Firebase auth error:", errorCode, errorMessage);
        toast.error(errorMessage);
      });
  };

  const onGithub = async () => {
    signInWithPopup(auth, provider)
      .then(async (result) => {
        // VALIDATION CHECKPOINT: Block new GitHub signups
        const isNew = isNewUser(result);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('GitHub sign-in - Is New User:', isNew);
        }
        
        // Block all new GitHub signups
        if (isNew) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Blocking new GitHub signup attempt');
          }
          
          // Delete Firebase user account and sign out
          await deleteUserAndSignOut(result.user);
          
          // Show error message
          toast.error(
            'GitHub sign-up is no longer supported. Please use "Continue with Google" with your work email address. Note: If you previously created an account with GitHub, you can still sign in.'
          );
          
          return; // Don't proceed to backend
        }
        
        // Existing users can proceed
        const credential = GithubAuthProvider.credentialFromResult(result);
        if (credential && credential.accessToken) {
          try {
            const userSignup = await AuthService.signupWithGitHub(
              result.user,
              credential.accessToken,
              (result as any)._tokenResponse.screenName
            );

            posthog.identify(result.user.uid, {
              email: result.user.email,
              name: result.user?.displayName || "",
            });
            
            // CRITICAL: Check GitHub linking from backend response
            // Even if signing in with GitHub, check the flag for consistency
            if (userSignup.needs_github_linking) {
              // Redirect to onboarding to link GitHub (shouldn't happen for GitHub sign-in, but handle it)
              toast.info('Almost there! Link your GitHub to unlock the magic');
              const urlSearchParams = new URLSearchParams(window.location.search);
              const plan = (urlSearchParams.get("plan") || urlSearchParams.get("PLAN") || "").toLowerCase();
              const prompt = urlSearchParams.get("prompt") || "";

              const onboardingParams = new URLSearchParams();
              if (result.user.uid) onboardingParams.append('uid', result.user.uid);
              if (result.user.email) onboardingParams.append('email', result.user.email);
              if (result.user.displayName) onboardingParams.append('name', result.user.displayName);
              if (plan) onboardingParams.append('plan', plan);
              if (prompt) onboardingParams.append('prompt', prompt);
              if (finalAgent_id) onboardingParams.append('agent_id', finalAgent_id);

              window.location.href = `/onboarding?${onboardingParams.toString()}`;
              return;
            }
            
            //if this is a new user
            if (!userSignup.exists) {
              // For new users, redirect to onboarding
              toast.success(
                "Welcome aboard " + result.user.displayName + "! Let's get started"
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

              const onboardingParams = new URLSearchParams();
              if (result.user.uid) onboardingParams.append('uid', result.user.uid);
              if (result.user.email) onboardingParams.append('email', result.user.email);
              if (result.user.displayName) onboardingParams.append('name', result.user.displayName);
              if (plan) onboardingParams.append('plan', plan);
              if (prompt) onboardingParams.append('prompt', prompt);
              if (finalAgent_id) onboardingParams.append('agent_id', finalAgent_id);

              window.location.href = `/onboarding?${onboardingParams.toString()}`;
              return;
            }

            // For existing users, GitHub is already linked (they signed in with GitHub)
            // So we can proceed directly
            if (source === "vscode") {
              if (userSignup.token) {
                handleExternalRedirect(userSignup.token);
              }
            } else if (finalAgent_id) {
              handleExternalRedirect("");
            } else {
              window.location.href = "/newchat";
            }

            toast.success(
              "Welcome back " + result.user.displayName + "! Let's build something amazing"
            );
          } catch (e: any) {
            if (process.env.NODE_ENV !== 'production') {
              console.error("API error:", e);
            }
            toast.error(e.message || "Sign-in unsuccessful");
          }
        }
      })
      .catch((error) => {
        // Handle user cancellation - don't show error
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
          // User cancelled, don't show error
          return;
        }
        
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

  const handleSSOSuccess = (response?: SSOLoginResponse) => {
      // Check if GitHub needs to be linked (fallback check, though DirectSSOButtons should handle this)
      if (response?.needs_github_linking) {
        // Get URL parameters for plan, prompt, agent_id
        const urlSearchParams = new URLSearchParams(window.location.search);
        const plan = (urlSearchParams.get("plan") || urlSearchParams.get("PLAN") || "").toLowerCase();
        const prompt = urlSearchParams.get("prompt") || "";
        
        // Redirect to onboarding with user info from SSO response
        const onboardingParams = new URLSearchParams({
          ...(response.user_id && { uid: response.user_id }),
          ...(response.email && { email: response.email }),
          ...(response.display_name && { name: response.display_name }),
          ...(plan && { plan }),
          ...(prompt && { prompt }),
          ...(finalAgent_id && { agent_id: finalAgent_id }),
        });
        
        // Use window.location.href for a full page navigation to avoid React hooks issues
        window.location.href = `/onboarding?${onboardingParams.toString()}`;
        return;
      }
    
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
