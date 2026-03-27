"use client";
import { useState, useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import MinorService from "@/services/minorService";
import { ProFeatureModal } from "@/components/Layouts/ProFeatureModal";

type PlanKey = "free" | "pro" | "enterprise";

interface Plan {
  key: PlanKey;
  name: string;
  priceDisplay: string;
  showPerMonth: boolean;
  description: string;
  featuresHeader?: string;
  features: string[];
}

const PLANS: Plan[] = [
  {
    key: "free",
    name: "Individual - Free",
    priceDisplay: "$0",
    showPerMonth: true,
    description:
      "For individual developers who want to explore the open-source potpie platform",
    featuresHeader: "Everything in the Free plan...",
    features: [
      "Ready-to-use agents",
      "50 requests/month",
      "Unlimited if using your own keys",
      "Only public repos",
      "Multi-LLM Support",
      "Tool library",
      "Community support",
    ],
  },
  {
    key: "pro",
    name: "Individual - Pro",
    priceDisplay: "$39",
    showPerMonth: true,
    description:
      "For developers who want to use agents extensively in their workflow",
    featuresHeader: "Everything in the Free plan, plus...",
    features: [
      "500 requests/month",
      "Unlimited if using your own keys",
      "Custom agents",
      "Agentic workflows",
      "Custom tools",
      "Community & Email support",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    priceDisplay: "Custom Pricing",
    showPerMonth: false,
    description: "For companies wanting to build agents at scale",
    featuresHeader: "Everything in the Free plan, plus...",
    features: [
      "500 requests/month",
      "Unlimited if using your own keys",
      "Custom agents",
      "Agentic workflows",
      "Custom tools",
      "Community & Email support",
    ],
  },
];

interface SubscriptionData {
  plan_type: string;
  status: string;
  end_date: string | null;
  is_active: boolean;
  is_cancelled: boolean;
  cancel_at_period_end: boolean;
  dodo_customer_id: string | null;
}

const PricingPage = () => {
  const { user } = useAuthContext();
  const userId = user?.uid;
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProModal, setShowProModal] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const fetchSubscriptionDetails = async () => {
      if (userId) {
        try {
          const data = await MinorService.fetchUserSubscription(userId);
          setSubscription({
            plan_type: data.plan_type || "free",
            status: data.status || "active",
            end_date: data.end_date || null,
            is_active: data.is_active ?? false,
            is_cancelled: data.is_cancelled ?? false,
            cancel_at_period_end: data.cancel_at_period_end ?? false,
            dodo_customer_id: data.dodo_customer_id || null,
          });
        } catch (error) {
          console.error("Error fetching subscription:", error);
          // Default to free plan on error
          setSubscription({
            plan_type: "free",
            status: "active",
            end_date: null,
            is_active: true,
            is_cancelled: false,
            cancel_at_period_end: false,
            dodo_customer_id: null,
          });
        } finally {
          setLoading(false);
        }
      }
    };

    fetchSubscriptionDetails();
  }, [userId]);

  const getPlanDisplayName = (type: string): string => {
    switch (type.toLowerCase()) {
      case "pro":
        return "Individual - Pro";
      case "free":
        return "Individual - Free";
      case "startup":
        return "Early-Stage";
      case "enterprise":
        return "Enterprise";
      default:
        return "Individual - Free";
    }
  };

  const getCurrentPlanKey = (): PlanKey => {
    const planType = subscription?.plan_type?.toLowerCase() || "free";
    if (planType === "pro") return "pro";
    if (planType === "enterprise") return "enterprise";
    return "free";
  };

  const handleUpgradeToPro = async () => {
    if (!userId) return;

    try {
      const data = await MinorService.createCheckoutSession(userId, "pro");
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL received");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
    }
  };

  const handleManagePlan = async () => {
    if (!userId) return;
    setPortalLoading(true);

    try {
      const data = await MinorService.getCustomerPortal(userId);
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        console.error("No portal URL received");
      }
    } catch (error) {
      console.error("Error getting customer portal:", error);
      // If no subscription exists, show a message
      alert("No active subscription found. Please subscribe to a plan first.");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCardAction = (plan: Plan) => {
    const currentPlanKey = getCurrentPlanKey();

    // Don't do anything if clicking current plan
    if (plan.key === currentPlanKey) return;

    // Enterprise always shows modal
    if (plan.key === "enterprise") {
      setShowProModal(true);
      return;
    }

    // Free user clicking Pro -> Checkout
    if (currentPlanKey === "free" && plan.key === "pro") {
      handleUpgradeToPro();
      return;
    }

    // Pro user clicking Free -> Portal (to downgrade)
    if (currentPlanKey === "pro" && plan.key === "free") {
      handleManagePlan();
      return;
    }
  };

  const getButtonText = (plan: Plan): string => {
    const currentPlanKey = getCurrentPlanKey();

    if (plan.key === currentPlanKey) {
      return "Your Current Plan";
    }

    if (plan.key === "enterprise") {
      return "Contact Sales";
    }

    // Free user looking at Pro
    if (currentPlanKey === "free" && plan.key === "pro") {
      return "Upgrade to Pro";
    }

    // Pro user looking at Free
    if (currentPlanKey === "pro" && plan.key === "free") {
      return "Downgrade";
    }

    // Any other case (shouldn't happen)
    return "Select Plan";
  };

  const isButtonDisabled = (plan: Plan): boolean => {
    const currentPlanKey = getCurrentPlanKey();
    return plan.key === currentPlanKey;
  };

  const getButtonStyles = (plan: Plan): string => {
    const currentPlanKey = getCurrentPlanKey();
    const isCurrentPlan = plan.key === currentPlanKey;
    const isEnterprise = plan.key === "enterprise";

    if (isCurrentPlan) {
      return "bg-gray-200 text-[#00291C] cursor-default";
    }

    if (isEnterprise) {
      return "bg-[#285848] text-[#B6E343] hover:opacity-90";
    }

    // Pro card for free users (upgrade CTA)
    if (currentPlanKey === "free" && plan.key === "pro") {
      return "bg-[#285848] text-[#B6E343] hover:opacity-90";
    }

    // Free card for pro users (downgrade)
    if (currentPlanKey === "pro" && plan.key === "free") {
      return "bg-gray-200 text-[#00291C] hover:bg-gray-300";
    }

    return "bg-gray-200 text-[#00291C] hover:bg-gray-300";
  };

  const getCardBorderStyles = (plan: Plan): string => {
    const currentPlanKey = getCurrentPlanKey();
    const isCurrentPlan = plan.key === currentPlanKey;

    // Only current plan gets green border
    if (isCurrentPlan) {
      return "border-[#B6E343] shadow-md";
    }

    return "border-gray-200";
  };

  const getDividerStyles = (plan: Plan): string => {
    const currentPlanKey = getCurrentPlanKey();
    const isCurrentPlan = plan.key === currentPlanKey;

    // Only current plan gets green divider
    if (isCurrentPlan) {
      return "border-[#B6E343]";
    }

    return "border-gray-200";
  };

  // Render current plan badge
  const CurrentPlanBadge = () => (
    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#285848] text-[#B6E343] text-xs font-semibold px-3 py-1 rounded-full">
      Current Plan
    </span>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-10 flex items-center justify-center">
        <div className="text-gray-500">Loading subscription details...</div>
      </div>
    );
  }

  const currentPlanKey = getCurrentPlanKey();

  return (
    <div className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-10">
      <div className="w-full max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-3xl font-bold text-[#285848] mb-3">
            Adjust Your Plan
          </h1>
          <p className="text-base text-gray-500 max-w-2xl mx-auto">
            Get access to advanced features, higher usage limits, priority
            support, and enhanced customization options designed to help you get
            the most out of your experience.
          </p>
        </div>

        {/* Current Plan Info */}
        {subscription && (
          <div className="mb-8 text-center">
            <p className="text-sm text-gray-600">
              Current plan:{" "}
              <span className="font-semibold text-[#285848]">
                {getPlanDisplayName(subscription.plan_type)}
              </span>
              {subscription.end_date && (
                <>
                  {" "}
                  · Expires{" "}
                  {new Date(subscription.end_date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </>
              )}
              {subscription.cancel_at_period_end && (
                <span className="ml-2 text-amber-600">
                  (Cancels at period end)
                </span>
              )}
            </p>
          </div>
        )}

        {/* Pricing cards */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-10 w-full">
          {PLANS.map((plan) => {
            const isCurrentPlan = plan.key === currentPlanKey;
            const isEnterprise = plan.key === "enterprise";

            return (
              <div
                key={plan.key}
                className={`
                  relative rounded-xl border-2 bg-white p-10 flex flex-col flex-1 min-w-0 md:min-h-[620px]
                  ${getCardBorderStyles(plan)}
                `}
              >
                {/* Current Plan Badge */}
                {isCurrentPlan && <CurrentPlanBadge />}

                {/* Fixed-height block so button always at same distance from top */}
                <div className="min-h-[140px] flex flex-col">
                  <h3 className="text-lg font-bold text-[#285848] mb-3">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-5">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mt-auto">
                    <span className="text-3xl font-bold text-[#285848]">
                      {plan.priceDisplay}
                    </span>
                    {plan.showPerMonth && (
                      <span className="text-gray-500 text-base ml-1">
                        /month
                      </span>
                    )}
                  </div>
                </div>

                {/* CTA button */}
                <button
                  onClick={() => handleCardAction(plan)}
                  disabled={isButtonDisabled(plan) || portalLoading}
                  className={`
                    rounded-lg px-4 py-3 w-full block text-center font-medium
                    transition-colors flex-shrink-0 mt-8 disabled:opacity-70
                    ${getButtonStyles(plan)}
                  `}
                >
                  {portalLoading && plan.key !== currentPlanKey
                    ? "Loading..."
                    : getButtonText(plan)}
                </button>

                {/* Divider line after button */}
                <div
                  className={`mt-8 pt-8 -mx-10 border-t-2 ${getDividerStyles(
                    plan
                  )}`}
                />

                {/* Features */}
                {plan.featuresHeader && (
                  <p className="text-sm text-gray-500 mb-3">
                    {plan.featuresHeader}
                  </p>
                )}
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <svg
                        className="flex-shrink-0 w-5 h-5 mt-0.5 text-[#02D480]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Manage Subscription link for Pro users - at bottom of Pro card */}
                {currentPlanKey === "pro" && plan.key === "pro" && (
                  <button
                    onClick={handleManagePlan}
                    disabled={portalLoading}
                    className="mt-auto pt-6 text-sm text-gray-400 hover:text-[#285848] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {portalLoading ? "Loading..." : "Manage Subscription"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <ProFeatureModal open={showProModal} onOpenChange={setShowProModal} />
      </div>
    </div>
  );
};

export default PricingPage;
