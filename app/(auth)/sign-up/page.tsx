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
import { GithubAuthProvider, signInWithPopup, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { LucideCheck, LucideGithub } from "lucide-react";
import Image from "next/image";
import { usePostHog } from "posthog-js/react";
import React, { useRef } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { workEmailSchema, passwordSchema } from "@/lib/validation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Link from "next/link";

const emailPasswordFormSchema = z.object({
  email: workEmailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

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

  const emailPasswordForm = useForm<z.infer<typeof emailPasswordFormSchema>>({
    resolver: zodResolver(emailPasswordFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

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

  const onEmailPasswordSignup = async (data: z.infer<typeof emailPasswordFormSchema>) => {
    if (isLoading) return;
    setIsLoading(true);

    posthog.capture("email password signup clicked");

    try {
      console.log("[DEBUG] Starting email/password sign up flow");
      const result = await createUserWithEmailAndPassword(auth, data.email, data.password);
      console.log("[DEBUG] Firebase auth successful");

      // Send email verification (non-blocking)
      try {
        await sendEmailVerification(result.user);
        console.log("[DEBUG] Email verification sent");
      } catch (verificationError) {
        console.error("[DEBUG] Failed to send verification email:", verificationError);
        // Don't block sign-up if verification email fails
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const headers = await getHeaders();

      try {
        console.log("[DEBUG] Making signup API call");
        const userSignup = await axios.post(
          `${baseUrl}/api/v1/signup`,
          {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.email?.split("@")[0] || "User",
            emailVerified: result.user.emailVerified,
            createdAt: result.user.metadata?.creationTime
              ? new Date(result.user.metadata.creationTime).toISOString()
              : "",
            lastLoginAt: result.user.metadata?.lastSignInTime
              ? new Date(result.user.metadata.lastSignInTime).toISOString()
              : "",
            providerData: result.user.providerData,
            provider: "email", // Distinguish from GitHub users
            // No accessToken or providerUsername for email users
          },
          { headers: headers }
        );

        console.log("[DEBUG] Signup API response:", userSignup.data);

        posthog.identify(result.user.uid, {
          email: result.user.email,
          name: result.user.email?.split("@")[0] || "",
        });

        const urlSearchParams = new URLSearchParams(window.location.search);
        const plan = (
          urlSearchParams.get("plan") ||
          urlSearchParams.get("PLAN") ||
          ""
        ).toLowerCase();
        const prompt = urlSearchParams.get("prompt") || "";
        const agent_id = urlSearchParams.get("agent_id") || redirectAgent_id || "";

        toast.success("Account created successfully!");

        // Email/password users are always new, go to GitHub app installation
        await openPopup(result, plan, prompt, agent_id);
      } catch (e: any) {
        console.log("[DEBUG] API error:", e.response?.status, e.message);
        toast.error("Signup call unsuccessful");
      }
    } catch (e: any) {
      console.log("[DEBUG] Firebase auth error:", e);
      if (e.code === "auth/email-already-in-use") {
        toast.error("An account with this email already exists. Please sign in.");
      } else if (e.code === "auth/weak-password") {
        toast.error("Password is too weak. Please use a stronger password.");
      } else {
        toast.error(e.message || "Failed to create account");
      }
    } finally {
      setIsLoading(false);
    }
  };

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

        <div className="flex items-center justify-center flex-col text-border w-full max-w-md px-6">
          <h3 className="text-2xl font-bold text-black mb-6">Create your account</h3>

          {/* Email/Password Form */}
          <Form {...emailPasswordForm}>
            <form onSubmit={emailPasswordForm.handleSubmit(onEmailPasswordSignup)} className="w-full space-y-4">
              <FormField
                control={emailPasswordForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="you@company.com"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={emailPasswordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={emailPasswordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center text-sm text-black">
            Already have an account?{" "}
            <Link href="/sign-in" className="underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Signup;
