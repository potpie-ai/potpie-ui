"use client";
import { Button } from "@/components/ui/button";
import { LucideCheck, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/utils/errorMessages";
import { useRouter, useSearchParams } from "next/navigation";
import { DirectSSOButtons } from '@/components/auth/DirectSSOButtons';
import { LinkProviderDialog } from '@/components/auth/LinkProviderDialog';
import type { SSOLoginResponse } from '@/types/auth';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "@/configs/Firebase-config";
import { validateWorkEmail } from "@/lib/utils/emailValidation";
import AuthService from "@/services/AuthService";
import axios from "axios";

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

      // Send email verification using custom template from Firebase Console
      try {
        await sendEmailVerification(user);
        if (process.env.NODE_ENV === 'development') {
          console.log('Email verification sent to', user.email);
        }
      } catch (verificationError: any) {
        // Log error but don't block signup flow
        console.error('Failed to send email verification:', verificationError);
        // Continue with signup even if verification email fails
      }

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

      <div className="w-1/2 h-full flex items-center justify-center flex-col gap-10">
        <div className="flex items-center justify-center flex-row gap-3 mb-2">
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
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Get Started!</h3>
          <p className="text-gray-600 text-sm mb-8">Create your account to begin</p>
          <div className="flex items-start justify-start flex-col mt-6 gap-4">
            <p className="flex items-center justify-center text-start text-gray-700 gap-3 text-sm">
              <LucideCheck
                size={18}
                className="bg-blue-600 rounded-full p-0.5 text-white flex-shrink-0"
              />
              Sign up with your work email to get started
            </p>
          </div>

          <div className="w-80 mt-14 space-y-6 form-fade-in">
            {/* SSO Buttons */}
            <DirectSSOButtons
              onNeedsLinking={handleSSONeedsLinking}
              onSuccess={handleSSOSuccess}
              onNewUser={handleSSONewUser}
              isSignUpPage={true}
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
                className="btn-enterprise w-full h-14 px-5 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg text-base disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Sign up"}
              </Button>
            </form>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link 
                href="/sign-in" 
                className="link-smooth text-blue-600 font-semibold hover:text-blue-700"
              >
                Sign in
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
};

export default Signup;
