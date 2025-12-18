"use client";
import { Button } from "@/components/ui/button";
import { LucideCheck } from "lucide-react";
import Image from "next/image";
import React from "react";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/utils/errorMessages";
import { useRouter, useSearchParams } from "next/navigation";
import { DirectSSOButtons } from '@/components/auth/DirectSSOButtons';
import { LinkProviderDialog } from '@/components/auth/LinkProviderDialog';
import type { SSOLoginResponse } from '@/types/auth';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/configs/Firebase-config";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { validateWorkEmail } from "@/lib/utils/emailValidation";

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
      toast.error('You already have an account. Please sign in instead.');
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
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const headers = await getHeaders();

      // Call signup API
      const userSignup = await axios.post(
        `${baseUrl}/api/v1/signup`,
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split("@")[0],
          emailVerified: user.emailVerified,
          createdAt: user.metadata?.creationTime
            ? new Date(user.metadata.creationTime).toISOString()
            : "",
          lastLoginAt: user.metadata?.lastSignInTime
            ? new Date(user.metadata.lastSignInTime).toISOString()
            : "",
          providerData: user.providerData,
        },
        { headers: headers }
      );

      const urlSearchParams = new URLSearchParams(window.location.search);
      const plan = (urlSearchParams.get("plan") || urlSearchParams.get("PLAN") || "").toLowerCase();
      const prompt = urlSearchParams.get("prompt") || "";
      const agent_id = urlSearchParams.get("agent_id") || redirectAgent_id || "";

      if (userSignup.data.exists) {
        toast.success("Welcome back " + (user.displayName || user.email));
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
        toast.success("Account created successfully");
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
      console.error("Signup error:", error);
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
              Sign up with your work email to get started
            </p>
            <p className="flex items-center justify-center text-start text-black gap-4">
              <LucideCheck
                size={20}
                className="bg-primary rounded-full p-[0.5px] text-white"
              />
              We support Google Workspace, Microsoft 365, and Outlook
            </p>
          </div>

          <div className="w-60 mt-14 space-y-6">
            {/* SSO Buttons */}
            <DirectSSOButtons
              onNeedsLinking={handleSSONeedsLinking}
              onSuccess={handleSSOSuccess}
              onNewUser={handleSSONewUser}
              isSignUpPage={true}
            />

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-3 text-gray-500 font-medium">or</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="you@company.com"
                  {...form.register("email")}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition-all duration-300 placeholder:text-gray-400 text-gray-900 input-error ${
                    form.formState.errors.email
                      ? "border-red-500"
                      : "border-gray-200"
                  }`}
                />
                {form.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-500 form-error error-message-enter">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  {...form.register("password")}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition-all duration-300 placeholder:text-gray-400 text-gray-900 input-error ${
                    form.formState.errors.password
                      ? "border-red-500"
                      : "border-gray-200"
                  }`}
                />
                {form.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-500 form-error error-message-enter">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Sign up"}
              </Button>
            </form>
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
