"use client";
import getHeaders from "@/app/utils/headers.util";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useRef, useState, useEffect } from "react";
import { auth } from "@/configs/Firebase-config";
import { GithubAuthProvider, linkWithPopup } from "firebase/auth";
import { LucideGithub, LucideCheck, LoaderCircle, ArrowRight, ArrowLeft } from "lucide-react";
import axios from "axios";
import { toast } from "@/components/ui/sonner";
import { getUserFriendlyError } from "@/lib/utils/errorMessages";
import { testimonials } from "@/lib/utils/testimonials";
import Image from "next/image";
import Link from "next/link";

// Helper function to extract company name from email domain
const extractCompanyNameFromEmail = (email: string): string => {
  if (!email || !email.includes("@")) return "";
  
  const domain = email.split("@")[1]?.toLowerCase() || "";
  
  // List of common personal email providers
  const personalDomains = [
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "aol.com",
    "icloud.com",
    "protonmail.com",
    "mail.com",
    "zoho.com",
    "yandex.com",
    "gmx.com",
    "live.com",
    "msn.com",
  ];
  
  // If it's a personal domain, return empty string
  if (personalDomains.includes(domain)) return "";
  
  // Extract company name from domain
  // e.g., "momentum.sh" -> "Momentum", "acme.com" -> "Acme"
  const domainParts = domain.split(".");
  const mainPart = domainParts[0] || domain;
  
  // Capitalize first letter
  return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
};

const Onboarding = () => {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const name = searchParams.get("name");
  const plan = searchParams.get("plan");
  const prompt = searchParams.get("prompt");
  const agent_id = searchParams.get("agent_id");
  
  // Extract company name from email
  const autoCompanyName = email ? extractCompanyNameFromEmail(email) : "";
  
  const [formData, setFormData] = useState({
    email: email || "",
    name: name || "",
    source: "",
    industry: "",
    jobTitle: "",
    companyName: autoCompanyName,
  });

  const uidFromUrl = searchParams.get("uid");

  const router = useRouter();

  // Add state to track authentication status
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [hasGithubLinked, setHasGithubLinked] = useState(false);
  const [isLinkingGithub, setIsLinkingGithub] = useState(false);
  const [onboardingSubmitted, setOnboardingSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1 = form, 2 = GitHub linking
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  
  // Store the UID from URL params in state to prevent it from changing
  // This is the Google SSO UID we want to link GitHub to
  const [targetUserId, setTargetUserId] = useState<string | null>(uidFromUrl);
  
  // Update targetUserId when component mounts or URL changes
  useEffect(() => {
    if (uidFromUrl) {
      setTargetUserId(uidFromUrl);
      if (process.env.NODE_ENV === 'development') {
        console.log("Target user ID (from URL):", uidFromUrl);
      }
    }
  }, [uidFromUrl]);
  const githubAppUrl =
    "https://github.com/apps/" +
    process.env.NEXT_PUBLIC_GITHUB_APP_NAME +
    "/installations/select_target?setup_action=install";
  const popupRef = useRef<Window | null>(null);

  // Check if the user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Import auth only on client side
        const { getAuth, onAuthStateChanged } = await import("firebase/auth");
        const auth = getAuth();

        onAuthStateChanged(auth, (user) => {
          if (user) {
            // User is signed in - use authenticated user's email if URL email doesn't match
            const authenticatedEmail = user.email || "";
            const urlEmail = email || "";
            
            // Compute company name from authenticated email
            const newCompanyName = authenticatedEmail ? extractCompanyNameFromEmail(authenticatedEmail) : "";
            
            // If emails don't match, prefer the authenticated user's email
            // This handles cases where SSO login doesn't set URL params correctly
            if (authenticatedEmail && authenticatedEmail !== urlEmail && urlEmail) {
              if (process.env.NODE_ENV === 'development') {
                console.warn(`Email mismatch: URL has ${urlEmail}, but authenticated as ${authenticatedEmail}. Using authenticated email.`);
              }
              // Update form data with authenticated email and auto-populate company name
              setFormData(prev => ({ 
                ...prev, 
                email: authenticatedEmail,
                companyName: prev.companyName || newCompanyName
              }));
            } else if (authenticatedEmail && newCompanyName) {
              // If company name is empty, try to extract from authenticated email
              // Use functional updater to check current state and only update if needed
              setFormData(prev => {
                // Only update if company name is empty and we have a new company name
                if (!prev.companyName && newCompanyName && newCompanyName !== prev.companyName) {
                  return { ...prev, companyName: newCompanyName };
                }
                return prev;
              });
            }
            
            setIsAuthenticated(true);
            setAuthError("");
          } else {
            // User is not signed in
            setIsAuthenticated(false);
            setAuthError("You must be signed in to access this page.");
          }
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Auth check error:", error);
        }
        setAuthError("Authentication error. Please try again.");
      }
    };

    checkAuth();
  }, [email, router]);


  const handleCheckoutRedirect = async (uid: string) => {
    try {
      const subUrl = process.env.NEXT_PUBLIC_SUBSCRIPTION_BASE_URL;
      const response = await axios.get(
        `${subUrl}/create-checkout-session?user_id=${uid}&plan_type=${plan}`,
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error getting checkout URL:", error);
      }
    }
  };

  const submitOnboarding = async () => {
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    try {
      if (!isAuthenticated) {
        throw new Error(
          authError || "Authentication required. Please sign in."
        );
      }

      if (!targetUserId) {
        throw new Error("User ID is missing. Please sign in again.");
      }

      // Validate required fields
      if (
        !formData.name ||
        !formData.source ||
        !formData.industry ||
        !formData.jobTitle ||
        !formData.companyName
      ) {
        throw new Error("Please fill out all required fields.");
      }

      // Save onboarding data via backend API (uses Firebase Admin SDK with full permissions)
      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Use the authenticated user's UID instead of URL parameter
        // This ensures we're saving data for the correct user
        const authenticatedUid = user.uid;

        const token = await user.getIdToken();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        
        const response = await axios.post(
          `${baseUrl}/api/v1/user/onboarding`,
          {
            uid: authenticatedUid,
            email: formData.email,
            name: formData.name,
            source: formData.source,
            industry: formData.industry,
            jobTitle: formData.jobTitle,
            companyName: formData.companyName,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.success) {
        toast.success("Onboarding information saved!");
        } else {
          throw new Error(response.data.message || "Failed to save onboarding data");
        }
      } catch (error: any) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Error saving onboarding data:", error);
        }
        
        if (error.response?.status === 403) {
          throw new Error("You can only save onboarding data for your own account");
        } else if (error.response?.status === 401) {
          throw new Error("Authentication required. Please sign in again.");
        } else if (error.response?.data?.detail) {
          throw new Error(error.response.data.detail);
        } else if (error.message) {
          throw new Error(error.message);
        } else {
          throw new Error("Error saving user data to database. Please try again.");
        }
      }

      // Check GitHub link status synchronously before setting onboardingSubmitted
      let githubLinked = false;
      try {
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
          const response = await axios.get(
            `${baseUrl}/api/v1/providers/me`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          
          githubLinked = response.data.providers?.some(
            (p: any) => p.provider_type === 'firebase_github'
          ) || false;
        }
      } catch (error: any) {
        // Silently handle errors - user might not exist yet or endpoint might fail
        // This is expected for new users who haven't linked GitHub yet
        if (process.env.NODE_ENV === 'development' && error.response?.status !== 404 && error.response?.status !== 401) {
          console.warn("Error checking GitHub link (non-critical):", error.response?.status, error.message);
        }
        // Assume not linked if check fails
        githubLinked = false;
      }

      // Set onboardingSubmitted after checking GitHub status
      setOnboardingSubmitted(true);
      setHasGithubLinked(githubLinked);

      // Move to step 2 (GitHub linking)
      setCurrentStep(2);

      // If GitHub is already linked, proceed to next step
      if (githubLinked) {
        proceedToNextStep();
      }
      // Otherwise, wait for GitHub linking (handled by linkGithub function)
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error saving onboarding data:", error);
      }
      toast.error(
        error.message || "Error saving onboarding data. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const proceedToNextStep = () => {
    if (!targetUserId) return;
    
    if (agent_id) {
      router.push(`/shared-agent?agent_id=${agent_id}`);
    } else if (plan) {
      handleCheckoutRedirect(targetUserId);
    } else if (prompt) {
      router.push(
        `/all-agents?createAgent=true&prompt=${encodeURIComponent(prompt)}`
      );
    } else {
      router.push("/newchat");
    }
  };

  const openGithubAppPopup = () => {
    if (popupRef.current) {
      popupRef.current.close();
    }
    const popup = window.open(
      githubAppUrl,
      "_blank",
      "width=1000,height=700"
    );
    popupRef.current = popup;
  };

  const linkGithub = async () => {
    if (isLinkingGithub) return;
    setIsLinkingGithub(true);

    try {
      // CRITICAL: Use the targetUserId from state (stored from URL params)
      // This is the Google SSO UID that was passed when redirecting to onboarding
      // This is the user we want to link GitHub to
      if (!targetUserId) {
        throw new Error("User ID not found. Please sign in again and try linking GitHub.");
      }
      
      const originalUserUid = targetUserId; // This is the Google SSO UID we want to link to
      
      // Verify the user is authenticated before proceeding
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("No authenticated user found. Please sign in again.");
      }
      
      // Log for debugging - note that currentUser.uid might be different after GitHub popup
      if (process.env.NODE_ENV === 'development') {
        console.log("=== GitHub Linking Debug ===");
        console.log("Target user ID (Google SSO UID from URL):", originalUserUid);
        console.log("Current auth.currentUser.uid (before popup):", currentUser.uid);
        console.log("These may differ - we'll use targetUserId for linking");
      }

      const provider = new GithubAuthProvider();
      provider.addScope("read:org");
      provider.addScope("user:email");
      provider.addScope("repo");

      // Link GitHub to the CURRENT authenticated user (work/SSO) without switching accounts
      const result = await linkWithPopup(currentUser, provider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      
      if (!credential) {
        throw new Error("Failed to get GitHub credentials");
      }

      const githubProviderUid =
        result.user.providerData.find((p) => p.providerId === "github.com")
          ?.uid || result.user.uid; // GitHub provider UID from providerData
      
      if (process.env.NODE_ENV === 'development') {
        console.log("GitHub provider UID:", githubProviderUid);
        console.log("Linking GitHub to original user UID:", originalUserUid);
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const headers = await getHeaders();

      // Call signup endpoint to link GitHub to the ORIGINAL authenticated user (Google SSO)
      // Use the captured originalUserUid (not the GitHub Firebase UID) so it links correctly
      // even if GitHub email differs from SSO email
      await axios.post(
        `${baseUrl}/api/v1/signup`,
        {
          uid: originalUserUid, // Use ORIGINAL Google SSO UID, not GitHub UID
          linkToUserId: originalUserUid, // Explicitly specify which user to link to (Google SSO user)
          email: result.user.email, // GitHub email (may differ from SSO email)
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
          githubFirebaseUid: githubProviderUid, // Store GitHub provider UID for reference
        },
        { headers: headers }
      );

      toast.success("GitHub connected! You're all set to code");
      // Small delay for smooth transition
      await new Promise(resolve => setTimeout(resolve, 300));
      setHasGithubLinked(true);
      
      // Open GitHub app installation popup
      openGithubAppPopup();
      
      // If onboarding is already submitted, proceed to next step
      if (onboardingSubmitted) {
        // Wait a bit for popup to open, then proceed
        setTimeout(() => {
          proceedToNextStep();
        }, 500);
      } else {
        // If form not submitted yet, submit it first
        setOnboardingSubmitted(true);
        setCurrentStep(2);
      }
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error("GitHub linking error:", error);
      }
      if (error.code === "auth/popup-closed-by-user") {
        toast.error("GitHub sign-in cancelled. No worries, try again when ready!");
      } else {
        toast.error(getUserFriendlyError(error));
      }
    } finally {
      setIsLinkingGithub(false);
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
          <section className="flex h-full w-full flex-col rounded-2xl bg-[#FFF9F5] overflow-y-auto">
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

              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-normal text-[#656969] hover:text-[#022D2C] transition-colors"
              >
                <Image
                  src="/images/figma/auth/auth-signin-globe.svg"
                  alt=""
                  width={20}
                  height={20}
                />
                <span className="px-1">ENG</span>
                <Image
                  src="/images/figma/auth/auth-signin-arrow-down.svg"
                  alt=""
                  width={20}
                  height={20}
                />
              </button>
            </div>

            {/* Form content */}
            <div className="flex flex-1 items-center justify-center px-8 pb-8">
              <div className="w-full max-w-[392px]">
                {/* Progress Indicator */}
                <div className="mb-6">
                  <div className="flex items-center gap-2">
                    <div className={`h-1 flex-1 rounded-full ${currentStep >= 1 ? 'bg-[#B7F600]' : 'bg-[#EBEBEB]'}`}></div>
                    <div className={`h-1 flex-1 rounded-full ${currentStep >= 2 ? 'bg-[#B7F600]' : 'bg-[#EBEBEB]'}`}></div>
                  </div>
                </div>

                {/* Step 1: Form */}
                {currentStep === 1 && (
                  <>
                    {/* Title and Subtitle */}
                    <div className="mb-6">
                      <h1 className="text-center text-2xl font-medium text-[#022D2C] mb-2">
                        Welcome! Let&apos;s get you set up
                      </h1>
                      <p className="text-center text-sm text-[#656969]">
                        We just need a few details to personalize your experience
                      </p>
                    </div>

                    {/* Add authentication error message */}
                    {authError && (
                      <div className="mb-6 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                        {authError}
                      </div>
                    )}

                    {/* Only show the form if authenticated */}
                    {isAuthenticated ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitOnboarding();
                        }}
                        className="space-y-4"
                      >
                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-[#022D2C]">
                            Email <span className="ml-0.5">*</span>
                          </label>
                          <input
                            type="email"
                            value={formData.email || ""}
                            className="w-full px-3 py-2.5 rounded-lg border border-[#EBEBEB] bg-white text-[#022D2C] cursor-not-allowed text-sm"
                            disabled
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-[#022D2C]">
                            Full Name <span className="ml-0.5">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Enter your full name"
                            value={formData.name || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            className="w-full px-3 py-2.5 rounded-lg border border-[#EBEBEB] bg-white text-[#022D2C] placeholder:text-[#A6AFA9] focus:outline-none focus:ring-2 focus:ring-[#B7F600] focus:border-transparent text-sm"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-[#022D2C]">
                            How did you find us? <span className="ml-0.5">*</span>
                          </label>
                          <select
                            value={formData.source}
                            onChange={(e) =>
                              setFormData({ ...formData, source: e.target.value })
                            }
                            className="w-full px-3 py-2.5 rounded-lg border border-[#EBEBEB] bg-white text-[#022D2C] focus:outline-none focus:ring-2 focus:ring-[#B7F600] focus:border-transparent text-sm"
                            required
                          >
                            <option value="">Select an option</option>
                            <option value="Reddit">Reddit</option>
                            <option value="Twitter">Twitter</option>
                            <option value="LinkedIn">LinkedIn</option>
                            <option value="HackerNews">HackerNews</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-[#022D2C]">
                            Industry <span className="ml-0.5">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Enter your industry"
                            value={formData.industry}
                            onChange={(e) =>
                              setFormData({ ...formData, industry: e.target.value })
                            }
                            className="w-full px-3 py-2.5 rounded-lg border border-[#EBEBEB] bg-white text-[#022D2C] placeholder:text-[#A6AFA9] focus:outline-none focus:ring-2 focus:ring-[#B7F600] focus:border-transparent text-sm"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-[#022D2C]">
                            Job Title <span className="ml-0.5">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Enter your job title"
                            value={formData.jobTitle}
                            onChange={(e) =>
                              setFormData({ ...formData, jobTitle: e.target.value })
                            }
                            className="w-full px-3 py-2.5 rounded-lg border border-[#EBEBEB] bg-white text-[#022D2C] placeholder:text-[#A6AFA9] focus:outline-none focus:ring-2 focus:ring-[#B7F600] focus:border-transparent text-sm"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-sm font-medium text-[#022D2C]">
                            Company Name <span className="ml-0.5">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Enter your company name"
                            value={formData.companyName}
                            onChange={(e) =>
                              setFormData({ ...formData, companyName: e.target.value })
                            }
                            className="w-full px-3 py-2.5 rounded-lg border border-[#EBEBEB] bg-white text-[#022D2C] placeholder:text-[#A6AFA9] focus:outline-none focus:ring-2 focus:ring-[#B7F600] focus:border-transparent text-sm"
                            required
                          />
                        </div>

                        {/* Submit Button */}
                        <Button
                          type="submit"
                          className="mt-2 h-10 w-full rounded-lg bg-[#B7F600] text-[#00291C] hover:bg-[#a7e400] font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={!isAuthenticated || isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <LoaderCircle className="animate-spin h-4 w-4 mr-2" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              Continue
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </form>
                    ) : (
                      <div className="mt-10 p-6 bg-gray-100 rounded-lg text-black text-center">
                        <p className="text-sm">Please sign in to continue.</p>
                        <Button
                          onClick={() => router.push("/sign-in")}
                          className="mt-4 mx-auto bg-[#022D2C] hover:bg-[#033d3c] text-white"
                        >
                          Go to Sign In
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {/* Step 2: GitHub Linking */}
                {currentStep === 2 && isAuthenticated && (
                  <>
                    {/* Back Button */}
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="mb-6 flex items-center gap-2 text-[#656969] hover:text-[#022D2C] transition-colors text-sm"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back</span>
                    </button>

                    {/* GitHub Logo */}
                    <div className="flex justify-center mb-6">
                      <div className="bg-[#022D2C] rounded-full p-6 w-20 h-20 flex items-center justify-center">
                        <LucideGithub className="text-[#FFF9F5] w-10 h-10" fill="#FFF9F5" />
                      </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-center text-2xl font-medium text-[#022D2C] mb-2">
                      Connect Your GitHub
                    </h1>

                    {/* Subtitle */}
                    <p className="text-center text-sm text-[#656969] mb-6">
                      Link your GitHub account to get started with repositories
                    </p>

                    {/* Feature List */}
                    <div className="bg-[rgba(2,45,44,0.08)] rounded-lg p-4 mb-6 space-y-3">
                      <div className="flex items-start gap-2">
                        <LucideCheck className="text-[#022D2C] w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="text-[#022D2C] text-sm">
                          Select repositories for your AI agents
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <LucideCheck className="text-[#022D2C] w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="text-[#022D2C] text-sm">
                          Add more repositories anytime from your dashboard
                        </span>
                      </div>
                    </div>

                    {/* Link GitHub Button */}
                    {!hasGithubLinked ? (
                      <>
                        <Button
                          onClick={linkGithub}
                          className="w-full h-10 rounded-lg bg-[#022D2C] hover:bg-[#033d3c] text-[#FFF9F5] font-medium flex items-center justify-center gap-2 transition-colors mb-3"
                          disabled={isLinkingGithub}
                        >
                          <LucideGithub className="w-5 h-5" />
                          {isLinkingGithub ? "Linking..." : "Link GitHub Account"}
                        </Button>

                        {/* Disclaimer */}
                        <p className="text-[#656969] text-xs text-center">
                          We&apos;ll only access repositories you explicitly authorize
                        </p>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                          <p className="text-green-800 font-medium text-sm">
                            GitHub account linked successfully!
                          </p>
                        </div>
                        <Button
                          onClick={proceedToNextStep}
                          className="w-full h-10 rounded-lg bg-[#B7F600] text-[#00291C] hover:bg-[#a7e400] font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          Continue to Dashboard
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t border-[#EBEBEB]">
                      <p className="text-[#656969] text-xs text-center">
                        By continuing, you agree to our{" "}
                        <a href="#" className="text-[#022D2C] hover:underline">
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="#" className="text-[#022D2C] hover:underline">
                          Privacy Policy
                        </a>
                      </p>
                    </div>
                  </>
                )}
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
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
