"use client";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import React from "react";
import Link from "next/link";
import { toast } from "@/components/ui/sonner";
import { getUserFriendlyError } from "@/lib/utils/errorMessages";
import { testimonials } from "@/lib/utils/testimonials";
import { useRouter, useSearchParams } from "next/navigation";
import { LinkProviderDialog } from '@/components/auth/LinkProviderDialog';
import type { SSOLoginResponse } from '@/types/auth';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signInWithCustomToken } from "firebase/auth";
import { auth } from "@/configs/Firebase-config";
import { validateWorkEmail } from "@/lib/utils/emailValidation";
import AuthService from "@/services/AuthService";
import axios from "axios";
import posthog from "posthog-js";
import { authClient } from '@/lib/sso/unified-auth';

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const Signup = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const [linkingData, setLinkingData] = React.useState<SSOLoginResponse | null>(null);
  const [showLinkingDialog, setShowLinkingDialog] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [currentTestimonial, setCurrentTestimonial] = React.useState(0);

  const handleSSOResponse = async (response: SSOLoginResponse) => {
    // Create Firebase session if custom token is provided
    if (response.firebase_token) {
      try {
        await signInWithCustomToken(auth, response.firebase_token);
      } catch (error: any) {
        toast.error(getUserFriendlyError(error));
        return;
      }
    }

    if (response.status === 'success') {
      // Check if GitHub needs to be linked
      if (response.needs_github_linking) {
        toast.info('Almost there! Link your GitHub to unlock the magic');
        const urlSearchParams = new URLSearchParams(window.location.search);
        const plan = (urlSearchParams.get("plan") || urlSearchParams.get("PLAN") || "").toLowerCase();
        const prompt = urlSearchParams.get("prompt") || "";
        const agent_id = urlSearchParams.get("agent_id") || redirectAgent_id || "";

        const onboardingParams = new URLSearchParams({
          ...(response.user_id && { uid: response.user_id }),
          ...(response.email && { email: response.email }),
          ...(response.display_name && { name: response.display_name }),
          ...(plan && { plan }),
          ...(prompt && { prompt }),
          ...(agent_id && { agent_id }),
        });

        window.location.href = `/onboarding?${onboardingParams.toString()}`;
        return;
      }

      handleSSOSuccess(response);
    } else if (response.status === 'needs_linking') {
      setLinkingData(response);
      setShowLinkingDialog(true);
      handleSSONeedsLinking(response);
    } else if (response.status === 'new_user') {
      toast.success('Welcome to the team! Let\'s get you set up');
      handleSSONewUser(response);
    } else {
      toast.error('Oops! Something went sideways. Mind trying again?');
    }
  };

  const onGoogle = async () => {
    try {
      const googleProvider = new GoogleAuthProvider();
      googleProvider.addScope('profile');
      googleProvider.addScope('email');

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const firebaseIdToken = await user.getIdToken();

      if (!firebaseIdToken) {
        throw new Error('Failed to get Firebase ID token');
      }

      const userInfo = {
        email: user.email || '',
        uid: user.uid,
        name: user.displayName || '',
        given_name: user.displayName?.split(' ')[0] || '',
        family_name: user.displayName?.split(' ').slice(1).join(' ') || '',
        picture: user.photoURL || '',
      };

      const response = await authClient.ssoLogin(
        userInfo.email,
        'google',
        firebaseIdToken,
        {
          uid: userInfo.uid,
          sub: userInfo.uid,
          name: userInfo.name,
          given_name: userInfo.given_name,
          family_name: userInfo.family_name,
          picture: userInfo.picture,
        }
      );

      handleSSOResponse(response);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      }
      toast.error(getUserFriendlyError(error));
    }
  };

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSSONeedsLinking = (response: SSOLoginResponse) => {
    setLinkingData(response);
    setShowLinkingDialog(true);
  };

  const handleSSOLinked = () => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const plan = (urlSearchParams.get("plan") || urlSearchParams.get("PLAN") || "").toLowerCase();
    const prompt = urlSearchParams.get("prompt") || "";
    const agent_id = urlSearchParams.get("agent_id") || redirectAgent_id || "";

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

  const handleSSOSuccess = (response?: SSOLoginResponse) => {
    // If user already exists (trying to sign up again), show message and redirect to sign-in
    if (response && response.status === 'success') {
      toast.error('Hey there! You\'re already part of the crew. Sign in instead!');
      const urlSearchParams = new URLSearchParams(window.location.search);
      const plan = (urlSearchParams.get("plan") || urlSearchParams.get("PLAN") || "").toLowerCase();
      const prompt = urlSearchParams.get("prompt") || "";
      const agent_id = urlSearchParams.get("agent_id") || redirectAgent_id || "";

      // Redirect to sign-in with same parameters
      const signInParams = new URLSearchParams();
      if (plan) signInParams.set("plan", plan);
      if (prompt) signInParams.set("prompt", prompt);
      if (agent_id) signInParams.set("agent_id", agent_id);
      if (redirectUrl) signInParams.set("redirect", redirectUrl);

      const signInUrl = `/sign-in${signInParams.toString() ? `?${signInParams.toString()}` : ''}`;
      // Small delay for smooth transition
      setTimeout(() => {
        router.push(signInUrl);
      }, 300);
      return;
    }

    // Normal success flow (shouldn't happen on sign-up page, but handle it)
    const urlSearchParams = new URLSearchParams(window.location.search);
    const plan = (urlSearchParams.get("plan") || urlSearchParams.get("PLAN") || "").toLowerCase();
    const prompt = urlSearchParams.get("prompt") || "";
    const agent_id = urlSearchParams.get("agent_id") || redirectAgent_id || "";

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

  const handleSSONewUser = (response: SSOLoginResponse) => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const plan = (urlSearchParams.get("plan") || urlSearchParams.get("PLAN") || "").toLowerCase();
    const prompt = urlSearchParams.get("prompt") || "";
    const agent_id = urlSearchParams.get("agent_id") || redirectAgent_id || "";

    // For new users, redirect to onboarding with user info from SSO response
    const onboardingParams = new URLSearchParams({
      ...(response.user_id && { uid: response.user_id }),
      ...(response.email && { email: response.email }),
      ...(response.display_name && { name: response.display_name }),
      ...(plan && { plan }),
      ...(prompt && { prompt }),
      ...(agent_id && { agent_id }),
    });

    router.push(`/onboarding?${onboardingParams.toString()}`);
  };

  // Helper function to check if GitHub is linked
  const checkGitHubLinked = async (userId: string): Promise<boolean> => {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      const token = await user.getIdToken();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await axios.get(
        `${baseUrl}/api/v1/providers/me`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const hasGithub = response.data.providers?.some(
        (p: any) => p.provider_type === 'firebase_github'
      ) || false;

      // Also check legacy provider_username if available
      if (!hasGithub && response.data.user?.provider_username) {
        return true;
      }

      return hasGithub;
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development' && error.response?.status !== 404 && error.response?.status !== 401) {
        console.warn("Error checking GitHub link:", error.response?.status, error.message);
      }
      return false;
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

    setIsLoading(true);
    try {
      // Create user with Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      // Call signup API
      const userSignup = await AuthService.signupWithEmailPassword(user);

      const urlSearchParams = new URLSearchParams(window.location.search);
      const plan = (urlSearchParams.get("plan") || urlSearchParams.get("PLAN") || "").toLowerCase();
      const prompt = urlSearchParams.get("prompt") || "";
      const agent_id = urlSearchParams.get("agent_id") || redirectAgent_id || "";

      // CRITICAL: Check GitHub linking from backend response
      // Login/signup cannot succeed unless GitHub is linked
      if (userSignup.needs_github_linking) {
        // Redirect to onboarding to link GitHub
        toast.info('Almost there! Link your GitHub to unlock the magic');
        const onboardingParams = new URLSearchParams({
          uid: user.uid,
          ...(user.email && { email: user.email }),
          ...(user.displayName && { name: user.displayName }),
          ...(plan && { plan }),
          ...(prompt && { prompt }),
          ...(agent_id && { agent_id }),
        });
        router.push(`/onboarding?${onboardingParams.toString()}`);
        return;
      }

      if (userSignup.exists) {
        // Existing user - GitHub is linked, proceed with login
        toast.success("Welcome back " + (user.displayName || user.email) + "! Let's build something awesome");
        if (agent_id) {
          router.push(`/shared-agent?agent_id=${agent_id}`);
        } else if (plan) {
          router.push(`/checkout?plan=${plan}`);
        } else if (prompt) {
          router.push(`/all-agents?createAgent=true&prompt=${encodeURIComponent(prompt)}`);
        } else {
          router.push('/newchat');
        }
      } else {
        // New user - GitHub is linked, proceed to onboarding for other setup
        toast.success("Account created! Time to make magic happen");
        const onboardingParams = new URLSearchParams();
        onboardingParams.append('uid', user.uid);
        if (user.email) onboardingParams.append('email', user.email);
        if (user.displayName) onboardingParams.append('name', user.displayName);
        if (plan) onboardingParams.append('plan', plan);
        if (prompt) onboardingParams.append('prompt', prompt);
        if (agent_id) onboardingParams.append('agent_id', agent_id);
        router.push(`/onboarding?${onboardingParams.toString()}`);
      }
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Signup error:", error);
      }
      const friendlyError = getUserFriendlyError(error);

      if (error.code === "auth/email-already-in-use") {
        toast.error(friendlyError);
        form.setError("email", { message: "Email already in use" });
      } else if (error.code === "auth/weak-password") {
        toast.error(friendlyError);
        form.setError("password", { message: "Password is too weak" });
      } else {
        toast.error(friendlyError);
      }
    } finally {
      setIsLoading(false);
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
                    Create your account
                  </h1>
                </div>

                {/* SSO Button - Google full width */}
                <div className="mt-5">
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
                      className="mr-2"
                    />
                    <span className="text-sm text-[#022D2C]">Continue with Google</span>
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-4">
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
                        placeholder="you@company.com"
                        {...form.register("email")}
                        className="w-full bg-transparent text-sm text-[#022D2C] placeholder:text-[#A6AFA9] focus:outline-none"
                      />
                    </div>
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
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
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {form.formState.errors.password && (
                      <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
                    )}
                  </div>

                  <p className="mt-4 text-xs text-[#656969] text-center">
                    By clicking, you are agreeing to our{" "}
                    <Link href="https://potpie.ai/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-[#656969] hover:text-[#022D2C] underline underline-offset-2 font-medium">
                      terms of service
                    </Link>
                    {" "}and{" "}
                    <Link href="https://potpie.ai/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#656969] hover:text-[#022D2C] underline underline-offset-2 font-medium">
                      privacy policies
                    </Link>
                  </p>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 h-10 w-full rounded-lg bg-[#B7F600] text-[#00291C] hover:bg-[#a7e400] font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Creating account..." : "Sign up"}
                  </Button>
                </form>

                <p className="mt-4 text-center text-base font-medium text-[#656969]">
                  Already have an account?{" "}
                  <Link href="/sign-in" className="text-[#656969] hover:text-[#022D2C] underline underline-offset-2">
                    Sign in
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
                <p className="text-base font-medium text-[#FFF9F5]">{testimonials[currentTestimonial].name}</p>
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
                        background: index === currentTestimonial ? "#FFF9F5" : "rgba(255,249,245,0.35)",
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
};

export default Signup;
