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
  }, [email, router]);

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
        console.log("GitHub link check - hasGithub:", hasGithub, "providers:", response.data.providers);
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
        // Small delay for smooth transition
        await new Promise(resolve => setTimeout(resolve, 300));
        setOnboardingSubmitted(true);
        console.log("Onboarding submitted. hasGithubLinked:", hasGithubLinked);
        toast.success("Onboarding information saved!");
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

      toast.success("GitHub account linked successfully!");
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
        toast.error("GitHub sign-in was cancelled");
      } else {
        toast.error(getUserFriendlyError(error));
      }
    } finally {
      setIsLinkingGithub(false);
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
          <h3 className="text-2xl font-bold text-black">
            Lets get a few more info and you are good to go!
          </h3>

          {/* Add authentication error message */}
          {authError && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
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
              className="flex flex-col gap-6 mt-10"
            >
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-900">
                  Email
                </label>
                <input
                  type="email"
                  value={email || ""}
                  className="w-80 px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                  disabled
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-900">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-80 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-900">
                  How did you find us?
                </label>
                <select
                  value={formData.source}
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value })
                  }
                  className="w-80 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  Industry you work in?
                </label>
                <input
                  type="text"
                  placeholder="Enter your industry"
                  value={formData.industry}
                  onChange={(e) =>
                    setFormData({ ...formData, industry: e.target.value })
                  }
                  className="w-80 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-900">
                  Your job title?
                </label>
                <input
                  type="text"
                  placeholder="Enter your job title"
                  value={formData.jobTitle}
                  onChange={(e) =>
                    setFormData({ ...formData, jobTitle: e.target.value })
                  }
                  className="w-80 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-900">
                  Your company name?
                </label>
                <input
                  type="text"
                  placeholder="Enter your company name"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  className="w-80 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </form>
          ) : (
            <div className="mt-10 p-6 bg-gray-100 rounded-md text-black text-center">
              <p>Please sign in to continue.</p>
              <Button
                onClick={() => router.push("/sign-in")}
                className="mt-4 mx-auto hover:bg-black bg-gray-800"
              >
                Go to Sign In
              </Button>
            </div>
          )}

          {isAuthenticated && (
            <div className="mt-14 space-y-4">
              {!onboardingSubmitted ? (
                <Button
                  onClick={() => submitOnboarding()}
                  className="gap-2 hover:bg-black bg-gray-800 w-80 button-smooth"
                  disabled={!isAuthenticated || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              ) : null}
              
              {/* GitHub Linking Section - appears after form submission */}
              {onboardingSubmitted && !hasGithubLinked && (
                <div className="space-y-4 pt-6 border-t border-gray-200 slide-in-up">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Link Your GitHub Account</h4>
                  <div className="flex items-start justify-start flex-col gap-4 text-gray-800">
                    <p className="flex items-center justify-center text-start gap-4 text-sm">
                      <LucideCheck
                        size={20}
                        className="bg-primary rounded-full p-[0.5px] text-white flex-shrink-0"
                      />
                      <span>Link your GitHub account to select repositories for your AI agents</span>
                    </p>
                    <p className="flex items-center justify-center text-start gap-4 text-sm">
                      <LucideCheck
                        size={20}
                        className="bg-primary rounded-full p-[0.5px] text-white flex-shrink-0"
                      />
                      <span>You can add more repositories later from the dashboard</span>
                    </p>
                  </div>
                  <Button
                    onClick={linkGithub}
                    className="gap-2 hover:bg-black bg-gray-800 w-80 button-smooth"
                    disabled={isLinkingGithub}
                  >
                    <LucideGithub className="rounded-full border border-white p-1" />
                    {isLinkingGithub ? "Linking..." : "Link GitHub Account"}
                  </Button>
                </div>
              )}
              
              {onboardingSubmitted && hasGithubLinked && (
                <div className="pt-6 fade-scale-in">
                  <Button
                    onClick={proceedToNextStep}
                    className="gap-2 hover:bg-black bg-gray-800 w-80 button-smooth"
                  >
                    Continue to Dashboard
                  </Button>
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
