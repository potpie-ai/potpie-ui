"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, FileText, ExternalLink } from "lucide-react";
import MinorService, { CreditBalanceResponse } from "@/services/minorService";
import { useAuthContext } from "@/contexts/AuthContext";

interface SubscriptionInfo {
  type: string;
  subscription_id?: string;
  status?: string;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthContext();
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [creditBalance, setCreditBalance] = useState<CreditBalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const subscriptionId = searchParams.get("subscription_id");
  const status = searchParams.get("status");

  useEffect(() => {
    let mounted = true;

    const fetchSubscriptionDetails = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const [subData, creditData] = await Promise.all([
          MinorService.fetchUserSubscription(user.uid),
          MinorService.fetchCreditBalance(user.uid)
        ]);
        if (!mounted) return;
        setSubscription(subData);
        setCreditBalance(creditData);
      } catch (error) {
        console.error("Error fetching subscription details:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchSubscriptionDetails();

    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  const handleOpenPortal = async () => {
    if (!user?.uid) return;
    setPortalLoading(true);
    try {
      const data = await MinorService.getCustomerPortal(user.uid);
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      // Portal not ready yet — subscription webhook may still be processing.
      // Direct user to their email for the invoice instead.
      alert("Your invoice will be sent to your email shortly. You can also access it from the Manage Subscription page once your account is fully activated.");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Success icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold text-[#285848] mb-2">
          You&apos;re on {subscription?.type === "pro" ? "Pro" : subscription?.type ? subscription.type.charAt(0).toUpperCase() + subscription.type.slice(1) : "Pro"}!
        </h1>
        <p className="text-gray-500 mb-8">
          Your subscription is active. You now have access to all {subscription?.type === "pro" ? "Pro" : "plan"} features.
        </p>

        {/* Plan details */}
        <div className="bg-gray-50 rounded-xl p-5 mb-6 text-left space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Plan</span>
            <span className="font-semibold text-[#285848]">
              {loading ? "Loading..." : subscription?.type ? `Individual - ${subscription.type.charAt(0).toUpperCase() + subscription.type.slice(1)}` : "Individual - Pro"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Credits</span>
            <span className="font-semibold text-[#285848]">
              {loading ? "Loading..." : creditBalance ? `${creditBalance.credits_available} / ${creditBalance.credits_total}` : "500 / month"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Status</span>
            <span className="font-semibold text-green-600 capitalize">
              {status || subscription?.status || "active"}
            </span>
          </div>
          {(subscriptionId || subscription?.subscription_id) && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subscription ID</span>
              <span className="font-mono text-xs text-gray-600 truncate max-w-[180px]">
                {subscriptionId || subscription?.subscription_id}
              </span>
            </div>
          )}
        </div>

        {/* Invoice download — prominent */}
        <button
          onClick={handleOpenPortal}
          disabled={portalLoading}
          className="w-full flex items-center justify-center gap-2 border-2 border-[#285848] text-[#285848] px-6 py-3 rounded-lg font-medium hover:bg-[#285848] hover:text-[#B6E343] transition-colors mb-3 disabled:opacity-60"
        >
          <FileText className="w-4 h-4" />
          {portalLoading ? "Opening..." : "Download Invoice"}
          <ExternalLink className="w-3 h-3 opacity-60" />
        </button>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-3">
          <button
            onClick={() => router.push("/user-subscription")}
            className="bg-[#285848] text-[#B6E343] px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-colors"
          >
            View Subscription
          </button>
          <button
            onClick={() => router.push("/newchat")}
            className="bg-gray-100 text-[#285848] px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Start a Chat
          </button>
        </div>
      </div>
    </div>
  );
}
