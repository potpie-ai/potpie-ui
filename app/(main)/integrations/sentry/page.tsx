"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plug, ArrowLeft, ChevronRight, Home } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SentryIntegrationPage() {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleBack = () => {
    router.push("/integrations");
  };

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      console.log("🚀 Initiating Sentry OAuth flow...");

      // Step 1: Get authorization URL from backend
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const redirectUri =
        process.env.NEXT_PUBLIC_SENTRY_REDIRECT_URI ||
        "http://localhost:8001/integrations/sentry/callback";

      console.log("📡 Requesting authorization URL from backend:");
      console.log(
        "- Backend URL:",
        `${baseUrl}/api/v1/integrations/sentry/initiate`
      );
      console.log("- Redirect URI:", redirectUri);

      const response = await fetch(
        `${baseUrl}/api/v1/integrations/sentry/initiate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            redirect_uri: redirectUri,
          }),
        }
      );

      console.log("📊 Backend response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Backend error:", errorData);
        throw new Error(
          errorData.message || `Failed to initiate OAuth (${response.status})`
        );
      }

      const data = await response.json();
      console.log("✅ Authorization URL received:", data);

      if (!data.authorization_url) {
        throw new Error("No authorization URL received from backend");
      }

      console.log("🔗 Redirecting to Sentry authorization page...");

      // Step 2: Redirect user to Sentry authorization page
      window.location.href = data.authorization_url;
    } catch (error) {
      console.error("❌ Failed to connect Sentry integration:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Failed to start OAuth flow: ${errorMessage}`);
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-600">
            <li>
              <button
                onClick={() => router.push("/integrations")}
                className="flex items-center hover:text-gray-900 transition-colors"
              >
                <Home className="w-4 h-4 mr-1" />
                Integrations
              </button>
            </li>
            <li>
              <ChevronRight className="w-4 h-4" />
            </li>
            <li className="text-gray-900 font-medium">Sentry</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Image
                src="/images/sentry-3.svg"
                alt="Sentry"
                width={32}
                height={32}
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Sentry Integration
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor errors and performance issues with automatic Sentry
                integration.
              </p>
            </div>
          </div>
        </div>

        {/* Information Panel */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>About Sentry</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Sentry provides real-time error tracking and performance
                monitoring for your applications. This integration will help
                you:
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Monitor application errors in real-time</li>
                <li>• Track performance issues and bottlenecks</li>
                <li>• Get alerts for critical issues</li>
                <li>• Analyze error trends and patterns</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Form */}
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Connect to Sentry</CardTitle>
              <CardDescription>
                Click the button below to start the OAuth authentication process
                with Sentry.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="pt-4">
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full gap-2"
                >
                  {isConnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Plug className="h-4 w-4" />
                      Connect Sentry
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
