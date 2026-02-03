"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import Image from "next/image";

export default function LinearRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Extract parameters from URL
        const code = searchParams.get("code");
        const error = searchParams.get("error");
        const state = searchParams.get("state");
        const success = searchParams.get("success");

        console.log("🔍 Linear OAuth Callback Debug Info:");
        console.log("- URL:", window.location.href);
        console.log(
          "- Code:",
          code ? `${code.substring(0, 10)}...` : "MISSING"
        );
        console.log("- Error:", error || "None");
        console.log("- State:", state || "None");
        console.log("- Success:", success || "None");
        console.log("- Timestamp:", new Date().toISOString());

        // Check for OAuth errors
        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        // If backend redirected here with success=true, integration is complete
        if (success === "true") {
          setStatus("success");
          setMessage("Successfully connected to Linear!");

          // Redirect to integrations page after 2 seconds
          setTimeout(() => {
            router.push("/integrations");
          }, 2000);
          return;
        }

        // If we have a code, the backend should have already processed it
        // and redirected us back with success=true
        if (code) {
          // This shouldn't happen in the backend-only flow, but handle it gracefully
          setStatus("success");
          setMessage("Linear integration completed!");

          setTimeout(() => {
            router.push("/integrations");
          }, 2000);
          return;
        }

        // No code and no success parameter - something went wrong
        throw new Error("No authorization code or success parameter received");
      } catch (error) {
        console.error("❌ Linear OAuth callback error:", error);
        setMessage(
          error instanceof Error ? error.message : "An unknown error occurred"
        );
        setStatus("error");
      }
    };

    handleOAuthCallback();
  }, [searchParams, router]);

  const handleBackToIntegrations = () => {
    router.push("/integrations");
  };

  const handleRetry = () => {
    router.push("/integrations/linear");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Image
                src="/images/linear.svg"
                alt="Linear"
                width={32}
                height={32}
              />
            </div>
            <CardTitle className="text-xl">Linear Integration</CardTitle>
            <CardDescription>
              {status === "loading" && "Connecting to Linear..."}
              {status === "success" && "Successfully connected to Linear!"}
              {status === "error" && "Connection Failed"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {status === "loading" && (
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm text-gray-600">
                  Please wait while we complete the connection.
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center space-y-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <p className="text-sm text-gray-600">{message}</p>
                <p className="text-sm text-gray-600">
                  Redirecting to integrations page...
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center space-y-4">
                <XCircle className="w-8 h-8 text-red-600" />
                <p className="text-sm text-gray-600">{message}</p>
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={handleBackToIntegrations}
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Integrations
                  </Button>
                  <Button onClick={handleRetry} className="flex-1">
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
