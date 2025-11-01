"use client";

import { useAuthContext } from "@/contexts/AuthContext";
import { auth } from "@/configs/Firebase-config";
import { sendEmailVerification } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export function EmailVerificationBanner() {
  const { user } = useAuthContext();
  const [isResending, setIsResending] = useState(false);

  // Only show for email/password users who haven't verified
  if (!user || user.emailVerified || !user.email || user.providerData?.some((p: any) => p.providerId === "github.com")) {
    return null;
  }

  const handleResendVerification = async () => {
    if (!auth.currentUser) return;

    setIsResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success("Verification email sent! Please check your inbox.");
    } catch (error: any) {
      toast.error("Failed to send verification email. Please try again later.");
      console.error("Email verification error:", error);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <p className="text-sm text-yellow-800">
            Please verify your email address. Check your inbox for the verification link.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResendVerification}
          disabled={isResending}
          className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
        >
          {isResending ? "Sending..." : "Resend Email"}
        </Button>
      </div>
    </div>
  );
}
