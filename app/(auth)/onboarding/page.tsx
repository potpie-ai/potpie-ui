"use client";
import getHeaders from "@/app/utils/headers.util";
import { Button } from "@/components/ui/button";
import { getFirestore, doc, setDoc } from "firebase/firestore";
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
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useRef, useState, useEffect } from "react";
import { db, auth } from "@/configs/Firebase-config";
import { GithubAuthProvider, signInWithPopup } from "firebase/auth";
import { LucideGithub, LucideCheck } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/utils/errorMessages";

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

  const uid = searchParams.get("uid");

  const router = useRouter();

  // Add state to track authentication status
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [hasGithubLinked, setHasGithubLinked] = useState(false);
  const [isLinkingGithub, setIsLinkingGithub] = useState(false);
  const [onboardingSubmitted, setOnboardingSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1 = form, 2 = github linking
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
            
            // If emails don't match, prefer the authenticated user's email
            // This handles cases where SSO login doesn't set URL params correctly
            if (authenticatedEmail && authenticatedEmail !== urlEmail && urlEmail) {
              console.warn(`Email mismatch: URL has ${urlEmail}, but authenticated as ${authenticatedEmail}. Using authenticated email.`);
              // Update form data with authenticated email and auto-populate company name
              const newCompanyName = extractCompanyNameFromEmail(authenticatedEmail);
              setFormData(prev => ({ 
                ...prev, 
                email: authenticatedEmail,
                companyName: prev.companyName || newCompanyName
              }));
            } else if (authenticatedEmail && !formData.companyName) {
              // If company name is empty, try to extract from authenticated email
              const newCompanyName = extractCompanyNameFromEmail(authenticatedEmail);
              if (newCompanyName) {
                setFormData(prev => ({ ...prev, companyName: newCompanyName }));
              }
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
        console.error("Auth check error:", error);
        setAuthError("Authentication error. Please try again.");
      }
    };

    checkAuth();
  }, [email, router, formData.companyName]);

  // Check if GitHub is already linked (only after onboarding is submitted)
  useEffect(() => {
    const checkGithubLinked = async () => {
      // Only check GitHub link status after onboarding is submitted
      // This prevents errors for new users who don't exist in the database yet
      if (!uid || !isAuthenticated || !onboardingSubmitted) return;
      
      try {
        const user = auth.currentUser;
        if (!user) return;
        
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
        );
        setHasGithubLinked(hasGithub || false);
      } catch (error: any) {
        // Silently handle errors - user might not exist yet or endpoint might fail
        // This is expected for new users who haven't linked GitHub yet
        if (error.response?.status !== 404 && error.response?.status !== 401) {
          console.warn("Error checking GitHub link (non-critical):", error.response?.status, error.message);
        }
        // Assume not linked if check fails
        setHasGithubLinked(false);
      }
    };
    
    if (isAuthenticated && onboardingSubmitted) {
      checkGithubLinked();
    }
  }, [uid, isAuthenticated, onboardingSubmitted]);

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
      console.error("Error getting checkout URL:", error);
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

      if (!uid) {
        throw new Error("User ID is missing");
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

      const userDoc = {
        uid,
        ...formData,
        signedUpAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, "users", uid), userDoc);
        toast.success("Great! Your profile is all set. Now let's connect GitHub!");
        // Add a smooth transition delay before moving to next step
        await new Promise(resolve => setTimeout(resolve, 500));
        setOnboardingSubmitted(true);
        setCurrentStep(2); // Move to GitHub linking step
      } catch (firebaseError: any) {
        console.error("Firebase Error:", firebaseError);
        if (firebaseError.code === "permission-denied") {
          throw new Error(
            "Unable to save user data. Please try signing out and signing in again."
          );
        }
        throw new Error(
          "Error saving user data to database. Please try again."
        );
      }

      // If GitHub is already linked, proceed to next step
      if (hasGithubLinked) {
        proceedToNextStep();
      }
      // Otherwise, wait for GitHub linking (handled by linkGithub function)
    } catch (error: any) {
      console.error("Error saving onboarding data:", error);
      toast.error(
        error.message || "Error saving onboarding data. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const proceedToNextStep = () => {
    if (!uid) return;
    
    if (agent_id) {
      router.push(`/shared-agent?agent_id=${agent_id}`);
    } else if (plan) {
      handleCheckoutRedirect(uid);
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
      const provider = new GithubAuthProvider();
      provider.addScope("read:org");
      provider.addScope("user:email");
      provider.addScope("repo");

      const result = await signInWithPopup(auth, provider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      
      if (!credential) {
        throw new Error("Failed to get GitHub credentials");
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const headers = await getHeaders();

      // Call signup endpoint which now handles linking GitHub to existing users
      await axios.post(
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

      toast.success("Awesome! GitHub is connected. You're ready to go!");
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
      }
    } catch (error: any) {
      console.error("GitHub linking error:", error);
      if (error.code === "auth/popup-closed-by-user") {
        toast.error("No problem! GitHub sign-in was cancelled. You can connect it later.");
      } else {
        toast.error(getUserFriendlyError(error));
      }
    } finally {
      setIsLinkingGithub(false);
    }
  };

  return (
    <section className="lg:flex-row flex-col-reverse flex items-center justify-between w-full lg:h-screen relative page-transition bg-gradient-to-br from-gray-50 to-white">
      <div className="hidden lg:flex items-center justify-center w-1/2 h-full p-8">
        <div className="relative h-full w-full rounded-2xl overflow-hidden shadow-2xl">
          <Image
            src={"/images/landing.png"}
            alt="landing"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 h-full flex items-center justify-center flex-col gap-8 lg:gap-12 p-6 lg:p-12 overflow-y-auto">
        {/* Progress Indicator */}
        <div className="w-full max-w-md flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`h-1 w-12 rounded-full ${currentStep >= 1 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            <div className={`h-1 w-12 rounded-full ${currentStep >= 2 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
          </div>
          {currentStep === 2 && (
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}
        </div>

        <div className="flex items-center justify-center flex-col w-full max-w-md">
          {currentStep === 1 && (
            <>
              <div className="text-center mb-10">
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                  Welcome! Let&apos;s get you set up
                </h2>
                <p className="text-gray-500 text-base">
                  We just need a few details to personalize your experience
                </p>
              </div>

              {/* Add authentication error message */}
              {authError && (
                <div className="w-full max-w-md mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg shadow-sm">
                  <p className="text-red-800 text-sm font-medium">{authError}</p>
                </div>
              )}

              {/* Only show the form if authenticated and on step 1 */}
              {isAuthenticated ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitOnboarding();
                  }}
                  className="w-full max-w-md space-y-5 form-fade-in"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email || ""}
                      placeholder="you@company.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed transition-all"
                      disabled
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={formData.name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      How did you find us? <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.source}
                      onChange={(e) =>
                        setFormData({ ...formData, source: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
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
                  
                  {/* Industry and Job Title side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-gray-700">
                        Industry <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Technology"
                        value={formData.industry}
                        onChange={(e) =>
                          setFormData({ ...formData, industry: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-gray-700">
                        Job Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Software Engineer"
                        value={formData.jobTitle}
                        onChange={(e) =>
                          setFormData({ ...formData, jobTitle: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Acme Inc."
                      value={formData.companyName}
                      onChange={(e) =>
                        setFormData({ ...formData, companyName: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                    disabled={!isAuthenticated || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      <>
                        Continue
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <div className="w-full max-w-md mt-8 p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 text-center shadow-sm">
                  <p className="text-gray-700 mb-4 font-medium">Please sign in to continue</p>
                  <Button
                    onClick={() => router.push("/sign-in")}
                    className="gap-2 hover:bg-gray-900 bg-gray-800 text-white px-6 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg"
                  >
                    Go to Sign In
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Step 2: GitHub Linking */}
          {currentStep === 2 && (
            <div className="fade-slide-in">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gray-900 flex items-center justify-center shadow-lg">
                    <LucideGithub className="w-10 h-10 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                  Connect Your GitHub
                </h2>
                <p className="text-gray-600 text-sm lg:text-base">
                  Link your GitHub account to get started with repositories
                </p>
              </div>

              {isAuthenticated && (
                <div className="w-full max-w-md space-y-6">
                  {!hasGithubLinked ? (
                    <>
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 space-y-4">
                        <div className="flex items-start gap-3 text-gray-700">
                          <LucideCheck
                            size={20}
                            className="bg-blue-500 rounded-full p-0.5 text-white flex-shrink-0 mt-0.5"
                          />
                          <span className="text-sm">Select repositories for your AI agents</span>
                        </div>
                        <div className="flex items-start gap-3 text-gray-700">
                          <LucideCheck
                            size={20}
                            className="bg-blue-500 rounded-full p-0.5 text-white flex-shrink-0 mt-0.5"
                          />
                          <span className="text-sm">Add more repositories anytime from your dashboard</span>
                        </div>
                      </div>
                      <Button
                        onClick={linkGithub}
                        className="w-full gap-3 hover:bg-gray-900 bg-gray-800 text-white px-6 py-3.5 rounded-lg font-semibold button-smooth shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                        disabled={isLinkingGithub}
                      >
                        <LucideGithub className="w-5 h-5" />
                        {isLinkingGithub ? "Connecting..." : "Link GitHub Account"}
                      </Button>
                      <p className="text-xs text-gray-500 text-center mt-4">
                        We&apos;ll only access repositories you explicitly authorize
                      </p>
                    </>
                  ) : (
                    <div className="space-y-4 fade-scale-in">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 font-medium text-center">
                          ✓ GitHub account linked successfully!
                        </p>
                      </div>
                      <Button
                        onClick={proceedToNextStep}
                        className="w-full gap-2 hover:bg-gray-900 bg-gray-800 text-white px-6 py-3.5 rounded-lg font-semibold button-smooth shadow-lg hover:shadow-xl transition-all"
                      >
                        Continue to Dashboard
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
    
  );
};

export default Onboarding;
