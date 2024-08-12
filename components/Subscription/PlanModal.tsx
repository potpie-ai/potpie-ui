import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Check } from "lucide-react";
import { Button } from "../ui/button";
import { PaddleLoader } from "@/components/Subscription/PaddleLoader";
import { useAuthContext } from "@/contexts/AuthContext";
import axios from "axios";
import { planTypes } from "@/lib/Constants";

const PlanModal = ({
  showProModalModal,
  toggleShowProModal,
}: {
  showProModalModal: boolean;
  toggleShowProModal: (value: boolean) => void;
}) => {
  const { user, userSubscription } = useAuthContext();
  const calendlyUrl = 'https://calendly.com/aditi-at-momentum/45min';

  const handlePaddleCheckOut = (planType: planTypes) => {
    if (!user || userSubscription?.plan === planTypes.PRO) return;

    toggleShowProModal(false);
    const Paddle = (window as any).Paddle;

    Paddle.Checkout.open({
      items: [{ priceId: "pri_01hzy075px5m3b2e1r4ty7841c", quantity: 1 }],
      customer: {
        email: user?.email || "",
      },
      customData: {
        userId: user?.uid,
        email: user?.email,
        userName: user?.displayName,
        planType,
      },
      settings: {
        allowLogout: false,
      },
    });
  };

  const handleCancelSubscription = async () => {
    if (!user?.uid || userSubscription?.plan !== planTypes.PRO) return;

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_PADDLE_SERVER}/cancel-subs`, {
        subscriptionId: userSubscription?.subscriptionId,
        effective_from: "next_billing_period",
      });
      window.location.reload();
    } catch (error) { }
  };

  const generateButtonText = (planType: planTypes) => {
    switch (planType) {
      case planTypes.FREE:
        return userSubscription?.plan === planTypes.FREE || !userSubscription
          ? "Current Plan"
          : "Downgrade to FREE";
      case planTypes.PRO:
        return userSubscription?.plan === planTypes.PRO
          ? "Current Plan"
          : "Upgrade to PRO";
      case planTypes.ENTERPRISE:
        return userSubscription?.plan === planTypes.ENTERPRISE
          ? "Current Plan"
          : "Contact Us";
      default:
        return "";
    }
  };

  return (
    <>
      <PaddleLoader />
      <Dialog
        open={showProModalModal}
        onOpenChange={(open) => {
          if (!open) {
            toggleShowProModal(false);
          }
        }}
      >
        <DialogContent className="min-w-[948px] min-h-[425px] px-8 py-6 bg-gray-100">
          <DialogHeader>
            <DialogTitle className="flex justify-between mb-5">
              <div className="text-xl font-semibold">Plans and Billing</div>
            </DialogTitle>
            <DialogDescription>
              <div className="flex gap-6">
                <div className="flex flex-col justify-between w-1/2  max-h-[400px] bg-white rounded-xl shadow-[0px_1px_8px_#0000000a] border-2 border-transparent px-6 pb-6 pt-5">
                  <div>
                    <div className="flex justify-between">
                      <div className="flex justify-center gap-2 font-semibold text-brand-grease text-base">
                        FREE
                      </div>
                    </div>

                    <hr className="h-[1px] bg-garlic-300 mt-10" />
                    <div className="flex flex-col gap-3 mt-4">
                      <div className="flex gap-2  text-sm text-garlic-900">
                        <Check size={16} /> Identify API endpoints
                      </div>
                      <div className="flex gap-2 items-center text-sm text-garlic-900">
                        <Check size={16} />
                        Test 50 behaviours/ month
                      </div>
                      <div className="flex gap-2 items-center text-sm text-garlic-900">
                        <Check size={16} /> Visualise your code flows
                      </div>
                      <div className="flex gap-2 items-center text-sm text-garlic-900">
                        <Check size={16} /> Blast Radius detection of your
                        changes
                      </div>
                      <div className="flex gap-2 items-center text-sm text-garlic-900">
                        <Check size={16} />
                        Edit tests using natural language
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handleCancelSubscription}
                    disabled={userSubscription?.cancelOn}
                    className="mt-5"
                  >
                    {generateButtonText(planTypes.FREE)}
                  </Button>
                </div>
                <div className="relative flex flex-col justify-between max-h-[400px] bg-white rounded-xl shadow-[0px_1px_8px_#0000000a] border-2 border-orange-500 px-6 pb-6 pt-5 w-1/2">
                  {userSubscription?.plan !== planTypes.PRO && (
                    <Badge
                      variant="default"
                      className="absolute right-6 -mt-8 bg-orange-400 rounded-md px-2 py-1 text-xs font-semibold text-white"
                    >
                      RECOMMENDED
                    </Badge>
                  )}

                  <div>
                    <div className="flex justify-between relative">
                      <div className="flex justify-center gap-2 font-semibold text-brand-grease text-base">
                        <span>PRO</span>
                      </div>

                      <div className="absolute left-0 top-8 text-xs text-black">
                        {userSubscription?.cancelOn && (
                          <p className="font-normal">
                            Valid until{" "}
                            <span className="font-bold">
                              {" "}
                              {new Date(
                                userSubscription?.cancelOn
                              ).toLocaleDateString()}
                            </span>
                          </p>
                        )}
                        {userSubscription?.nextBillDate && (
                          <p className="font-bold">
                            {" "}
                            Renew on{" "}
                            <span className="font-bold">
                              {new Date(
                                userSubscription?.nextBillDate
                              ).toLocaleDateString()}
                            </span>
                          </p>
                        )}
                      </div>

                      <div className="text-brand-grease text-[18px] font-semibold">
                        USD 20{" "}
                        <span className="text-sm text-garlic-800 font-normal">
                          /mo
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-garlic-800 text-right mt-1">
                      Billed $20 monthly
                    </div>

                    <hr className="h-[1px] bg-garlic-300 mt-4" />
                    <div className="flex gap-2 my-3 items-center text-sm text-garlic-900">
                      Everything in the Free plan, plus:
                    </div>
                    <div className="flex flex-col gap-3 mt-4">
                      <div className="flex gap-2 items-center text-sm text-garlic-900">
                        <Check size={16} />
                        Test 200 behaviours/month
                      </div>
                      <div className="flex gap-2 items-center text-sm text-garlic-900">
                        <Check size={16} /> Debug Failing tests
                      </div>
                      <div className="flex gap-2 items-center text-sm text-garlic-900">
                        <Check size={16} /> Self Heal tests
                      </div>
                      <div className="flex gap-2 items-center text-sm text-garlic-900">
                        <Check size={16} /> One-click integration with codebase
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="default"
                    onClick={() => {
                      handlePaddleCheckOut(planTypes.PRO);
                    }}
                    disabled={userSubscription?.plan === planTypes.PRO}
                    className="mt-5"
                  >
                    {generateButtonText(planTypes.PRO)}
                  </Button>
                </div>
                <div className="flex flex-col justify-between w-1/2  max-h-[400px] bg-white rounded-xl shadow-[0px_1px_8px_#0000000a] border-2 border-transparent px-6 pb-6 pt-5">
                  <div>
                    <div className="flex justify-between">
                      <div className="flex justify-center gap-2 font-semibold text-brand-grease text-base">
                        CUSTOM
                      </div>
                    </div>

                    <hr className="h-[1px] bg-garlic-300 mt-10" />
                    <div className="flex gap-2 my-3 items-center text-sm text-garlic-900">
                      Everything in the Pro plan, plus:
                    </div>
                    <div className="flex flex-col gap-3 mt-4">
                      <div className="flex gap-2  text-sm text-garlic-900">
                        <Check size={16} /> Unlimited behaviours/month
                      </div>
                      <div className="flex gap-2 items-center text-sm text-garlic-900">
                        <Check size={16} />
                        Priority Support
                      </div>
                      <div className="flex gap-2 items-center text-sm text-garlic-900">
                        <Check size={16} />Dedicated onboarding support
                      </div>
                      <div className="flex gap-2 items-center text-sm text-garlic-900">
                        <Check size={16} />Single Sign-On (SAML 2.0)
                      </div>
                      <div className="flex gap-2 items-center text-sm text-garlic-900">
                        <Check size={16} />Audit trails
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="default"
                    onClick={() => {
                      window.open(calendlyUrl, "_blank");
                    }}
                    disabled={userSubscription?.plan === planTypes.ENTERPRISE}
                    className="mt-5"
                  >
                    {generateButtonText(planTypes.ENTERPRISE)}
                  </Button>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      {/* {isUpgradeSuccessfulModalOpen && (
        <UpgradeSuccessfulModal
          open={isUpgradeSuccessfulModalOpen}
          onClose={() => {
            dispatch(setShowUpgradeSuccessModal(false));
            dispatch(setPurchasedPlan(null));
          }}
          plan={purchasedPlan}
        />
      )}
      {showWaitModal && <ChangingPlanWaitModal open={showWaitModal} />}
      {isDowngradeConfirmationModalOpen && (
        <DowngradeConfirmationModal
          open={isDowngradeConfirmationModalOpen}
          onClose={() => {
            setIsDowngradeConfirmationModalOpen(false);
            dispatch(togglePlanPricingModalV2(true));
            trackPricingModalAndPageInteraction({
              key: PRICING_PAGE_AND_MODAL_CONSTANTS.DOWNGRADE.KEY,
              value: PRICING_PAGE_AND_MODAL_CONSTANTS.DOWNGRADE.CLOSE,
              isModal: true,
            });
          }}
          onDowngrade={() => {
            setIsDowngradeConfirmationModalOpen(false);
            confirmPayment(downgradeConfirmationPlanType.current);
            trackPricingModalAndPageInteraction({
              key: PRICING_PAGE_AND_MODAL_CONSTANTS.DOWNGRADE.KEY,
              value: PRICING_PAGE_AND_MODAL_CONSTANTS.DOWNGRADE.CONFIRM,
              isModal: true,
            });
          }}
        />
      )} */}
    </>
  );
};

export default PlanModal;
