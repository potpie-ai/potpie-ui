"use client";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  GithubAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/configs/Firebase-config";
import { toast } from "@/components/ui/sonner";
import { getUserFriendlyError } from "@/lib/utils/errorMessages";
import { testimonials } from "@/lib/utils/testimonials";
import { isNewUser, deleteUserAndSignOut } from "@/lib/utils/emailValidation";
import AuthService from "@/services/AuthService";

import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import React from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { useSearchParams, useRouter } from "next/navigation";
import { LinkProviderDialog } from "@/components/auth/LinkProviderDialog";
import type { SSOLoginResponse } from "@/types/auth";
import { buildVSCodeCallbackUrl } from "@/lib/auth/vscode-callback";

export default function Signin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source");
  const agent_id = searchParams.get("agent_id");
  const redirectUrl = searchParams.get("redirect");
  const redirect_uri = searchParams.get("redirect_uri");

  // SSO state
  const [linkingData, setLinkingData] = React.useState<SSOLoginResponse | null>(
    null,
  );
  const [showLinkingDialog, setShowLinkingDialog] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = React.useState(false);
  const [currentTestimonial, setCurrentTestimonial] = React.useState(0);

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

  const githubProvider = new GithubAuthProvider();
  githubProvider.addScope("read:org");
  githubProvider.addScope("user:email");

  const googleProvider = new GoogleAuthProvider();

  const handleExternalRedirect = (
    token: string,
    customToken?: string | null,
  ) => {
    if (finalAgent_id) {
      window.location.href = `/shared-agent?agent_id=${finalAgent_id}`;
    } else if (source === "vscode") {
      window.location.href = buildVSCodeCallbackUrl(
        token,
        customToken,
        redirect_uri ?? undefined,
      );
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    signInWithEmailAndPassword(auth, data.email, data.password)
      .then(async (userCredential) => {
        const user = userCredential.user;

        try {
          const userSignup = await AuthService.signupWithEmailPassword(user);

          if (userSignup.needs_github_linking) {
            toast.info("Almost there! Link your GitHub to unlock the magic");
            const urlSearchParams = new URLSearchParams(window.location.search);
            const plan = (
              urlSearchParams.get("plan") ||
              urlSearchParams.get("PLAN") ||
              ""
            ).toLowerCase();
            const prompt = urlSearchParams.get("prompt") || "";

            const onboardingParams = new URLSearchParams({
              uid: user.uid,
              ...(user.email && { email: user.email }),
              ...(user.displayName && { name: user.displayName }),
              ...(plan && { plan }),
              ...(prompt && { prompt }),
              ...(finalAgent_id && { agent_id: finalAgent_id }),
            });

            window.location.href = `/onboarding?${onboardingParams.toString()}`;
            return;
          }

          if (source === "vscode") {
            if (userSignup.token) {
              const customToken =
                userSignup.customToken ?? (await AuthService.getCustomToken());
              handleExternalRedirect(userSignup.token, customToken);
            }
          } else if (finalAgent_id) {
            handleExternalRedirect("");
          } else {
            router.push("/newchat");
          }

          toast.success(
            "Welcome back " +
              (user.displayName || user.email) +
              "! Ready to build?",
          );
        } catch (error: any) {
          toast.error(error.message || "Signup call unsuccessful");
        }
      })
      .catch((error) => {
        const errorMessage = error.message;
        toast.error(errorMessage);
      });
  };

  const onGithub = async () => {
    signInWithPopup(auth, githubProvider)
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
            if (process.env.NODE_ENV !== "production") {
              console.error(
                "[ERROR] Failed to delete blocked GitHub signup user:",
                { userId: result.user?.uid, email: result.user?.email },
              );
            } else {
              console.error(
                "[ERROR] Failed to delete blocked GitHub signup user (uid only)",
                { userId: result.user?.uid },
              );
            }
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

            if (userSignup.needs_github_linking) {
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

            if (!userSignup.exists) {
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

            if (source === "vscode") {
              if (userSignup.token) {
                const customToken =
                  userSignup.customToken ??
                  (await AuthService.getCustomToken());
                handleExternalRedirect(userSignup.token, customToken);
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

  const onGoogle = async () => {
    signInWithPopup(auth, googleProvider)
      .then(async (result) => {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential) {
          try {
            const userSignup = await AuthService.signupWithEmailPassword(
              result.user,
            );

            posthog.identify(result.user.uid, {
              email: result.user.email,
              name: result.user?.displayName || "",
            });

            if (userSignup.needs_github_linking) {
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

            if (!userSignup.exists) {
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

            if (source === "vscode") {
              if (userSignup.token) {
                const customToken =
                  userSignup.customToken ??
                  (await AuthService.getCustomToken());
                handleExternalRedirect(userSignup.token, customToken);
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
            toast.error(e.message || "Sign-in unsuccessful");
          }
        }
      })
      .catch((error) => {
        const friendlyError = getUserFriendlyError(error);
        toast.error(friendlyError);
      });
  };

  const handleSSOLinked = () => {
    if (source === "vscode") {
      const user = auth.currentUser;
      if (!user) {
        router.push("/newchat");
        return;
      }
      Promise.all([user.getIdToken(), AuthService.getCustomToken()])
        .then(([token, customToken]) => {
          window.location.href = buildVSCodeCallbackUrl(
            token,
            customToken,
            redirect_uri ?? undefined,
          );
        })
        .catch(() => router.push("/newchat"));
      return;
    }
    if (finalAgent_id) {
      router.push(`/shared-agent?agent_id=${finalAgent_id}`);
    } else {
      router.push("/newchat");
    }
  };

  return (
    <div className="relative h-screen w-full font-sans bg-[#022D2C] overflow-hidden">
      {/* Background vector */}
      <Image
        src="/images/figma/auth/auth-signin-vector.svg"
        alt=""
        width={1523}
        height={1452}
        priority
        className="pointer-events-none select-none absolute w-[1623px] h-[1452px] top-[-276px] left-[-1.5px] opacity-100"
      />

      {/* Right-side blur glow */}
      <div
        className="pointer-events-none absolute top-0 right-0 h-[900px] w-[900px] rounded-full"
        style={{
          transform: "translateX(153px)",
          backgroundColor: "#022423",
          filter: "blur(162px)",
        }}
      />

      {/* Main frame content */}
      <div className="relative z-10 mx-auto h-full w-full max-w-[1440px] px-2 py-2">
        <div className="grid h-full grid-cols-1 lg:grid-cols-[836px_1fr] gap-10">
          {/* Left panel */}
          <section className="flex h-full w-full flex-col rounded-2xl bg-[#FFF9F5]">
            {/* Header */}
            <div className="flex w-full items-center justify-between px-8 pt-8">
              <Link href="/" className="inline-flex items-center">
                <Image
                  src="/images/figma/auth/auth-signin-logo.svg"
                  width={42}
                  height={42}
                  alt="Potpie"
                  priority
                />
              </Link>


            </div>

            {/* Form content */}
            <div className="flex flex-1 items-center justify-center px-8 pb-8">
              <div className="w-full max-w-[392px]">
                <div className="flex flex-col items-center gap-3">
                  <Image
                    src="/images/figma/auth/auth-signin-icon.svg"
                    alt=""
                    width={80}
                    height={80}
                    priority
                  />
                  <h1 className="text-center text-2xl font-medium text-[#022D2C]">
                    Sign in to your account
                  </h1>
                </div>

                {/* Social buttons (interactive, styled to match) */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={onGithub}
                    className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-[#EBEBEB] bg-white hover:bg-black/[0.02] transition-colors"
                    aria-label="Continue with GitHub"
                  >
                    <svg height="20" width="20" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#24292f" fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={onGoogle}
                    className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-[#EBEBEB] bg-white hover:bg-black/[0.02] transition-colors"
                    aria-label="Continue with Google"
                  >
                    <Image
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                      width={20}
                      height={20}
                      alt="Google"
                    />
                  </button>
                </div>

                {/* Divider */}
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#EBEBEB]" />
                  <span className="text-[11px] font-medium tracking-[0.02em] text-[#A3A3A3]">
                    OR
                  </span>
                  <div className="h-px flex-1 bg-[#EBEBEB]" />
                </div>

                {/* Email/Pass Form */}
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="mt-5 space-y-4"
                >
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-[#022D2C]">
                      Email Address<span className="ml-0.5">*</span>
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-[#EBEBEB] bg-white px-3 py-2.5">
                      <Image
                        src="/images/figma/auth/auth-signin-mail.svg"
                        alt=""
                        width={20}
                        height={20}
                      />
                      <input
                        type="email"
                        placeholder="hello@potpie.com"
                        {...form.register("email")}
                        className="w-full bg-transparent text-sm text-[#022D2C] placeholder:text-[#A6AFA9] focus:outline-none"
                      />
                    </div>
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-[#022D2C]">
                      Password<span className="ml-0.5">*</span>
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-[#EBEBEB] bg-white px-3 py-2.5">
                      <Image
                        src="/images/figma/auth/auth-signin-lock.svg"
                        alt=""
                        width={20}
                        height={20}
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••"
                        {...form.register("password")}
                        className="w-full bg-transparent text-sm text-[#022D2C] placeholder:text-[#A6AFA9] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[#656969] hover:text-[#022D2C] transition-colors"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {form.formState.errors.password && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={keepLoggedIn}
                        onChange={(e) => setKeepLoggedIn(e.target.checked)}
                        className="h-4 w-4 rounded border border-[#EBEBEB] accent-[#B7F600]"
                      />
                      <span className="text-sm text-[#022D2C]">
                        Keep me logged in
                      </span>
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-[#656969] hover:text-[#022D2C]"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="mt-2 h-10 w-full rounded-lg bg-[#B7F600] text-[#00291C] hover:bg-[#a7e400] font-medium"
                  >
                    Sign in
                  </Button>
                </form>

                <p className="mt-4 text-center text-base font-medium text-[#656969]">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/sign-up"
                    className="text-[#656969] hover:text-[#022D2C] underline underline-offset-2"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </div>
          </section>

          {/* Right testimonials */}
          <aside className="hidden lg:flex h-full items-center justify-end pr-10">
            <div className="w-[404px]">
              <Image
                src={testimonials[currentTestimonial].image}
                alt=""
                width={56}
                height={56}
                className="mb-10 rounded-full"
              />

              <p className="text-2xl font-normal leading-[1.3333333] text-[#FFF9F5]">
                {testimonials[currentTestimonial].quote}
              </p>

              <div className="mt-7">
                <p className="text-base font-medium text-[#FFF9F5]">
                  {testimonials[currentTestimonial].name}
                </p>
                <p className="mt-1 text-sm font-medium text-[rgba(255,249,245,0.72)]">
                  {testimonials[currentTestimonial].title}
                </p>
              </div>

              <div className="mt-10 flex items-center gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentTestimonial(index)}
                    className="h-4 w-4"
                    aria-label={`Go to testimonial ${index + 1}`}
                  >
                    <span
                      className="block h-1 rounded-full transition-all"
                      style={{
                        width: index === currentTestimonial ? 16 : 4,
                        background:
                          index === currentTestimonial
                            ? "#FFF9F5"
                            : "rgba(255,249,245,0.35)",
                      }}
                    />
                  </button>
                ))}
              </div>

              {/* Static slider asset from Figma (optional visual parity) */}
              <Image
                src="/images/figma/auth/auth-signin-slider.svg"
                alt=""
                width={36}
                height={4}
                className="mt-3 opacity-0"
              />
            </div>
          </aside>
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
    </div>
  );
}
