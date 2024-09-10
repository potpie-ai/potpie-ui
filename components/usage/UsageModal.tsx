import { planTypes } from "@/lib/Constants";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { useAuthContext } from "@/contexts/AuthContext";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

const UsageModal = ({
    showUsageModal,
    toggleUsageModal,
}: {
    showUsageModal: boolean;
    toggleUsageModal: (value: boolean) => void;
}) => {
    const { user, userSubscription } = useAuthContext();
    const {
        data: totalTests,
        isLoading: totalTestsLoading,
    } = useQuery<any>({
        queryKey: ["endpoints-list"],
        queryFn: () =>
            axios
                .get(`/usage`)
                .then((res) => res.data.tests_generated),
    });
    const getSubscriptionLimit = (planType: planTypes) => {
        return planType === planTypes.PRO ? 200 : 50;
    };
    const allowedTests = getSubscriptionLimit(userSubscription?.plan);
    const planName = userSubscription?.plan || planTypes.FREE;
    const progress = (totalTests / getSubscriptionLimit(userSubscription?.plan)) * 100;

    return (
        <>
            <Dialog
                open={showUsageModal}
                onOpenChange={(open) => {
                    if (!open) {
                        toggleUsageModal(false);
                    }
                }}
            >
                <DialogContent className="min-w-[640px] min-h-[300px] px-8 py-6 bg-card">
                    <DialogHeader>
                        <DialogTitle className="flex justify-between mb-2">
                            <div className="text-xl font-semibold">Usage</div>
                        </DialogTitle>
                        <DialogDescription>
                            See your current usage details and learn more about how it relates to your {userSubscription?.plan} plan.
                        </DialogDescription>
                        <div>
                            <div className="mt-4">
                                <div className="h-12 bg-card rounded-2xl overflow-hidden border-border border-2">
                                    <div
                                        style={{ width: `${progress}%` }}
                                        className="h-full bg-input rounded"
                                    /></div>
                                <div className="flex">
                                    <span className="ml-2">Tested</span>
                                    <span className="ml-auto">Total</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="text-center bg-card p-3 rounded shadow-md flex items-center">
                                    <div className="bg-input rounded-md w-20 h-10 flex items-center justify-center">
                                        <p className="font-bold text-lg">{totalTests}</p>
                                    </div>
                                    <span className="ml-4">Behaviours Tested</span>
                                </div>
                                <div className="text-center bg-card p-3 rounded shadow-md flex items-center">
                                    <div className="bg-input rounded-md w-20 h-10 flex items-center justify-center">
                                        <p className="font-bold text-lg">{planName}</p>
                                    </div>
                                    <span className="ml-4">{allowedTests} Tests Allowed</span>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default UsageModal;
