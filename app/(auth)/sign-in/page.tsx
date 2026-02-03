"use client";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { GithubAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/configs/Firebase-config";
import { isFirebaseEnabled } from "@/lib/utils";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/utils/errorMessages";
import { isNewUser, deleteUserAndSignOut } from "@/lib/utils/emailValidation";
import AuthService from "@/services/AuthService";
import axios from "axios";

import { LucideGithub } from "lucide-react";
import Image from "next/image";
import React from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { useSearchParams, useRouter } from "next/navigation";

export default function Signin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source");
  const agent_id = searchParams.get("agent_id");
  const redirectUrl = searchParams.get("redirect");

  // Extract agent_id from redirect URL if present
  let redirectAgent_id = "";
  if (redirectUrl) {
    try {
      const redirectPath = decodeURIComponent(redirectUrl);
      const url = new URL(redirectPath, window.location.origin);
      redirectAgent_id = url.searchParams.get("agent_id") || "";
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error parsing redirect URL:", e);
      }
    }
  }

  // Use agent_id from either direct parameter or redirect URL
  const finalAgent_id = agent_id || redirectAgent_id;

  const formSchema = z.object({
    email: z.string().email(),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
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
    try {
      const response = await axios.post("/api/login", {
        email: data.email,
        password: data.password,
      });
      // Save token, redirect, etc.
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      toast.success("Logged in successfully!");
      // Redirect as needed
      window.location.href = "/newchat";
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "Login failed. Please try again.";
      toast.error(errorMessage);
    }
  };

  const onGithub = async () => {
    // In dev without Firebase, GitHub OAuth won't work - use mock and redirect
    if (!isFirebaseEnabled()) {
      const result = await auth.signInWithPopup(provider);
      posthog.identify(result.user.uid, {
        email: result.user.email,
        name: result.user?.displayName || "",
      });
      toast.success("Dev mode: signed in with mock user");
      if (finalAgent_id) {
        window.location.href = `/shared-agent?agent_id=${finalAgent_id}`;
      } else {
        window.location.href = "/newchat";
      }
      return;
    }

    signInWithPopup(auth, provider)
      .then(async (result) => {
        // VALIDATION CHECKPOINT: Block new GitHub signups
        const isNew = isNewUser(result);

        if (process.env.NODE_ENV === "development") {
          console.log("GitHub sign-in - Is New User:", isNew);
        }

        // Block all new GitHub signups
        if (isNew) {
          if (process.env.NODE_ENV === "development") {
            console.log("Blocking new GitHub signup attempt");
          }

          // Delete Firebase user account and sign out
          const deletionSucceeded = await deleteUserAndSignOut(result.user);

          // Log deletion failure for monitoring (caller can act on result if needed)
          if (!deletionSucceeded) {
            console.error(
              "[ERROR] Failed to delete blocked GitHub signup user:",
              {
                userId: result.user?.uid,
                email: result.user?.email,
              },
            );
          }

          // Show concise error message
          toast.error(
            "GitHub sign-ups are no longer supported — please sign in with Google.",
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
              (result as any)._tokenResponse.screenName,
            );

            posthog.identify(result.user.uid, {
              email: result.user.email,
              name: result.user?.displayName || "",
            });

            // CRITICAL: Check GitHub linking from backend response
            // Even if signing in with GitHub, check the flag for consistency
            if (userSignup.needs_github_linking) {
              // Redirect to onboarding to link GitHub (shouldn't happen for GitHub sign-in, but handle it)
              toast.info("Almost there! Link your GitHub to unlock the magic");
              const urlSearchParams = new URLSearchParams(
                window.location.search,
              );
              const plan = (
                urlSearchParams.get("plan") ||
                urlSearchParams.get("PLAN") ||
                ""
              ).toLowerCase();
              const prompt = urlSearchParams.get("prompt") || "";

              const onboardingParams = new URLSearchParams();
              if (result.user.uid)
                onboardingParams.append("uid", result.user.uid);
              if (result.user.email)
                onboardingParams.append("email", result.user.email);
              if (result.user.displayName)
                onboardingParams.append("name", result.user.displayName);
              if (plan) onboardingParams.append("plan", plan);
              if (prompt) onboardingParams.append("prompt", prompt);
              if (finalAgent_id)
                onboardingParams.append("agent_id", finalAgent_id);

              window.location.href = `/onboarding?${onboardingParams.toString()}`;
              return;
            }

            //if this is a new user
            if (!userSignup.exists) {
              // For new users, redirect to onboarding
              toast.success(
                "Welcome aboard " +
                  result.user.displayName +
                  "! Let's get started",
              );

              const urlSearchParams = new URLSearchParams(
                window.location.search,
              );
              const plan = (
                urlSearchParams.get("plan") ||
                urlSearchParams.get("PLAN") ||
                ""
              ).toLowerCase();
              const prompt = urlSearchParams.get("prompt") || "";

              const onboardingParams = new URLSearchParams();
              if (result.user.uid)
                onboardingParams.append("uid", result.user.uid);
              if (result.user.email)
                onboardingParams.append("email", result.user.email);
              if (result.user.displayName)
                onboardingParams.append("name", result.user.displayName);
              if (plan) onboardingParams.append("plan", plan);
              if (prompt) onboardingParams.append("prompt", prompt);
              if (finalAgent_id)
                onboardingParams.append("agent_id", finalAgent_id);

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
              "Welcome back " +
                result.user.displayName +
                "! Let's build something amazing",
            );
          } catch (e: any) {
            if (process.env.NODE_ENV !== "production") {
              console.error("API error:", e);
            }
            toast.error(e.message || "Sign-in unsuccessful");
          }
        }
      })
      .catch((error) => {
        // Handle user cancellation - don't show error
        if (
          error.code === "auth/popup-closed-by-user" ||
          error.code === "auth/cancelled-popup-request"
        ) {
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
          <h1 className="text-7xl font-bold text-gray-800 tracking-tight">
            potpie
          </h1>
        </div>
        <div className="flex items-center justify-center flex-col text-border w-full max-w-xs">
          {/* Email/Password Login Form */}
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4 w-full bg-white p-6 rounded-lg shadow-md mb-6"
          >
            <h3 className="text-xl font-bold text-black mb-2 text-center">
              Sign in to your account
            </h3>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...form.register("email")}
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                autoComplete="email"
              />
              {form.formState.errors.email && (
                <span className="text-xs text-red-500">
                  {form.formState.errors.email.message as string}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...form.register("password")}
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-black"
                autoComplete="current-password"
              />
              {form.formState.errors.password && (
                <span className="text-xs text-red-500">
                  {form.formState.errors.password.message as string}
                </span>
              )}
            </div>
            <Button
              type="submit"
              className="w-full mt-2 bg-primary text-white hover:bg-primary/90"
            >
              Sign in
            </Button>
          </form>
          {/* Divider */}
          <div className="flex items-center w-full max-w-xs mb-6">
            <div className="flex-grow border-t border-gray-300" />
            <span className="mx-2 text-gray-400 text-xs">or</span>
            <div className="flex-grow border-t border-gray-300" />
          </div>
          {/* GitHub Signin Button */}
          <Button
            onClick={() => onGithub()}
            className="gap-2 w-60 hover:bg-black bg-gray-800"
          >
            <LucideGithub className=" rounded-full border border-white p-1" />
            Sign in with GitHub
          </Button>
          <div className="mt-4 text-center text-sm text-black">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
