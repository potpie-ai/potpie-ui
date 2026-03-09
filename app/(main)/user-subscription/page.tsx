"use client";
import Link from "next/link";
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
  isHighlighted?: boolean;
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
    isHighlighted: true,
  },
];

const PricingPage = () => {
  const { user } = useAuthContext();
  const userId = user?.uid;
  const [subscription, setSubscription] = useState({
    plan: "Unknown Plan",
    endDate: "No end date",
    isActive: false,
    isCancelled: false,
  });
  const [showProModal, setShowProModal] = useState(false);

  useEffect(() => {
    const fetchSubscriptionDetails = async () => {
      if (userId) {
        try {
          const data = await MinorService.fetchUserSubscription(userId);
          if (data.plan_type && data.end_date) {
            setSubscription({
              plan: getPlanDisplayName(data.plan_type),
              endDate: new Date(data.end_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
              isActive: new Date(data.end_date).getTime() > new Date().getTime(),
              isCancelled: data.is_cancelled,
            });
          }
        } catch (error) {
          console.error("Error fetching subscription:", error);
        }
      }
    };

    fetchSubscriptionDetails();
  }, [userId]);

  const getPlanDisplayName = (type: string) => {
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
        return "Unknown Plan";
    }
  };

  const getButtonText = (plan: Plan): string => {
    if (plan.name === subscription.plan) return "Your Current Plan";
    if (plan.key === "enterprise") return "Upgrade to Business";
    if (plan.key === "pro") return "Upgrade to Pro";
    return "Get Started";
  };

  const handleCardAction = (plan: Plan) => {
    const buttonText = getButtonText(plan);
    if (plan.name === subscription.plan) return;
    if (plan.key === "enterprise" || buttonText.startsWith("Upgrade")) {
      setShowProModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-10">
      <div className="w-full max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-3xl font-bold text-[#285848] mb-3">
            Upgrade Your Plan
          </h1>
          <p className="text-base text-gray-500 max-w-2xl mx-auto">
            Get access to advanced features, higher usage limits, priority
            support, and enhanced customization options designed to help you get
            the most out of your experience.
          </p>
        </div>

        {/* Pricing cards - equal width, equal height, buttons aligned */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-10 w-full">
          {PLANS.map((plan) => {
            const isCurrentPlan = plan.name === subscription.plan;
            const isEnterprise = plan.key === "enterprise";
            const useGreenBorder = isCurrentPlan || isEnterprise;

            return (
              <div
                key={plan.key}
                className={`
                  rounded-xl border-2 bg-white p-10 flex flex-col flex-1 min-w-0 md:min-h-[620px]
                  ${
                    useGreenBorder
                      ? "border-[#B6E343] shadow-md"
                      : "border-gray-200"
                  }
                `}
              >
                {/* Fixed-height block so button always at same distance from top */}
                <div className="min-h-[140px] flex flex-col">
                  <h3 className="text-lg font-bold text-[#285848] mb-3">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-5">{plan.description}</p>

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

                {/* CTA button - same position in every card */}
                <Link
                  href={isEnterprise ? "#" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    handleCardAction(plan);
                  }}
                  className={`
                    rounded-lg px-4 py-3 w-full block text-center font-medium
                    transition-colors flex-shrink-0 mt-8
                    ${
                      isCurrentPlan
                        ? "bg-gray-200 text-[#00291C] cursor-default"
                        : isEnterprise
                          ? "bg-[#285848] text-[#B6E343] hover:opacity-90"
                          : "bg-gray-200 text-[#00291C] hover:bg-gray-300"
                    }
                  `}
                >
                  {getButtonText(plan)}
                </Link>

                {/* Divider line after button - matches card border */}
                <div
                  className={`mt-8 pt-8 -mx-10 border-t-2 ${
                    useGreenBorder ? "border-[#B6E343]" : "border-gray-200"
                  }`}
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
              </div>
            );
          })}
        </div>

        {/* Optional: minimal current plan line */}
        {subscription.plan !== "Unknown Plan" && (
          <p className="text-center text-sm text-gray-500 mt-8">
            Current plan: <span className="font-medium">{subscription.plan}</span>
            {subscription.endDate !== "No end date" && (
              <> · Expires {subscription.endDate}</>
            )}
          </p>
        )}
      </div>

      <ProFeatureModal open={showProModal} onOpenChange={setShowProModal} />
    </div>
  );
};

export default PricingPage;
