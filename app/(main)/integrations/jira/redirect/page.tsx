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

export default function JiraRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Extract authorization code and status from URL
        const code = searchParams.get("code");
        const error = searchParams.get("error");
        const state = searchParams.get("state");
        const success = searchParams.get("success");

        console.log("🔍 Jira OAuth Callback Debug Info:");
        console.log("- URL:", window.location.href);
        console.log(
          "- Code:",
          code ? `${code.substring(0, 10)}...` : "MISSING"
        );
        console.log("- Error:", error || "None");
        console.log("- State:", state || "None");
        console.log("- Timestamp:", new Date().toISOString());

        // Check for OAuth errors
        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        // If backend handled the callback it will redirect with success=true
        if (success === "true") {
          setStatus("success");
          setMessage("Successfully connected to Jira!");

          // Redirect to integrations page after 2 seconds
          setTimeout(() => {
            router.push("/integrations");
          }, 2000);

          return;
        }

        // Otherwise expect an authorization code (frontend-handled flow)
        if (!code) {
          throw new Error("No authorization code received");
        }

        // Step 3: Send authorization code to backend immediately
        console.log("📡 Sending authorization code to backend...");

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        const response = await fetch(
          `${baseUrl}/api/v1/integrations/jira/save`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code: code,
              // include the state as user_id so backend can persist Potpie owner
              user_id: state,
              state: state,
              redirect_uri:
                process.env.NEXT_PUBLIC_JIRA_REDIRECT_URI ||
                "http://localhost:8001/integrations/jira/redirect",
              instance_name: "Jira Integration",
              integration_type: "jira",
              timestamp: new Date().toISOString(),
            }),
          }
        );

        console.log("📊 Backend response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("❌ Backend error:", errorData);
          throw new Error(
            errorData.detail ||
              errorData.message ||
              `Failed to save integration (${response.status})`
          );
        }

        const integrationData = await response.json();
        console.log("✅ Integration saved successfully:", integrationData);

        setStatus("success");
        setMessage("Successfully connected to Jira!");

        // Redirect to integrations page after 2 seconds
        setTimeout(() => {
          router.push("/integrations");
        }, 2000);
      } catch (error) {
        console.error("❌ OAuth callback error:", error);
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
    router.push("/integrations/jira");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Image
                src="/images/jira-3.svg"
                alt="Jira"
                width={32}
                height={32}
              />
            </div>
            <CardTitle className="text-xl">Jira Integration</CardTitle>
            <CardDescription>
              {status === "loading" && "Connecting to Jira..."}
              {status === "success" && "Successfully connected to Jira!"}
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