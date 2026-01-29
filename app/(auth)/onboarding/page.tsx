"use client";
import getHeaders from "@/app/utils/headers.util";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useRef, useState, useEffect } from "react";
import { auth } from "@/configs/Firebase-config";
import { GithubAuthProvider, linkWithPopup } from "firebase/auth";
import { LucideGithub, LucideCheck, LoaderCircle, ArrowRight, ArrowLeft } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/utils/errorMessages";
import Image from "next/image";

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
    <section className="lg:flex-row flex-col-reverse flex items-center justify-between w-full lg:h-screen relative page-transition">
      {/* Left Side - Image */}
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

      {/* Right Side - Onboarding Content */}
      <div className="w-1/2 h-full flex items-center justify-center flex-col gap-14 overflow-y-auto">
        <div className="w-full max-w-lg px-6 py-8">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <div className={`h-1 flex-1 rounded-full ${currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`h-1 flex-1 rounded-full ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            </div>
          </div>

        {/* Step 1: Form */}
        {currentStep === 1 && (
          <>
            {/* Title and Subtitle */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Welcome! Let&apos;s get you set up
              </h1>
              <p className="text-gray-600 text-base md:text-lg">
                We just need a few details to personalize your experience
              </p>
            </div>

            {/* Add authentication error message */}
            {authError && (
              <div className="mb-6 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
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
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-900">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                    disabled
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-900">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-900">
                    How did you find us? <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.source}
                    onChange={(e) =>
                      setFormData({ ...formData, source: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
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

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-900">
                    Industry <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your industry"
                    value={formData.industry}
                    onChange={(e) =>
                      setFormData({ ...formData, industry: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-900">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your job title"
                    value={formData.jobTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, jobTitle: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-900">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your company name"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    required
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  disabled={!isAuthenticated || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <LoaderCircle className="animate-spin h-5 w-5" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="mt-10 p-6 bg-gray-100 rounded-lg text-black text-center">
                <p>Please sign in to continue.</p>
                <Button
                  onClick={() => router.push("/sign-in")}
                  className="mt-4 mx-auto hover:bg-black bg-gray-800"
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
              className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>

            {/* GitHub Logo */}
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-indigo-700 via-blue-700 to-purple-700 rounded-xl p-8 w-32 h-32 flex items-center justify-center shadow-lg">
                <LucideGithub className="text-white w-16 h-16" fill="white" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 text-center">
              Connect Your GitHub
            </h1>

            {/* Subtitle */}
            <p className="text-gray-600 text-base md:text-lg text-center mb-8">
              Link your GitHub account to get started with repositories
            </p>

            {/* Feature List */}
            <div className="bg-blue-50 rounded-lg p-6 mb-6 space-y-4">
              <div className="flex items-start gap-3">
                <LucideCheck className="text-blue-600 w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-gray-800 text-sm">
                  Select repositories for your AI agents
                </span>
              </div>
              <div className="flex items-start gap-3">
                <LucideCheck className="text-blue-600 w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-gray-800 text-sm">
                  Add more repositories anytime from your dashboard
                </span>
              </div>
            </div>

            {/* Link GitHub Button */}
            {!hasGithubLinked ? (
              <>
                <Button
                  onClick={linkGithub}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-3 transition-colors mb-4"
                  disabled={isLinkingGithub}
                >
                  <LucideGithub className="w-6 h-6" />
                  {isLinkingGithub ? "Linking..." : "Link GitHub Account"}
                </Button>

                {/* Disclaimer */}
                <p className="text-gray-500 text-sm text-center">
                  We&apos;ll only access repositories you explicitly authorize
                </p>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-green-800 font-medium mb-2">
                    GitHub account linked successfully!
                  </p>
                </div>
                <Button
                  onClick={proceedToNextStep}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  Continue to Dashboard
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-gray-500 text-sm text-center">
                By continuing, you agree to our{" "}
                <a href="#" className="text-blue-600 hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          </>
        )}
        </div>
      </div>
    </section>
  );
};

export default Onboarding;
