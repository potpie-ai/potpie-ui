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

export default function LinearIntegrationPage() {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleBack = () => {
    router.push("/integrations");
  };

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      console.log("🚀 Initiating Linear OAuth flow...");

      // Step 1: Direct redirect to backend OAuth initiation endpoint
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const redirectUri =
        process.env.NEXT_PUBLIC_LINEAR_REDIRECT_URI ||
        "http://localhost:8001/integrations/linear/redirect";

      console.log("📡 Redirecting to backend OAuth initiation:");
      console.log(
        "- Backend URL:",
        `${baseUrl}/api/v1/integrations/linear/redirect`
      );
      console.log("- Redirect URI:", redirectUri);

      // Create state parameter for CSRF protection
      const state = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Direct redirect to backend - backend will handle OAuth flow
      const oauthUrl = `${baseUrl}/api/v1/integrations/linear/redirect?redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

      console.log("🔗 Redirecting to backend OAuth endpoint...");
      window.location.href = oauthUrl;
    } catch (error) {
      console.error("❌ Failed to connect Linear integration:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Failed to start OAuth flow: ${errorMessage}`);
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
            <li className="text-gray-900 font-medium">Linear</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Image
                src="/images/linear.svg"
                alt="Linear"
                width={32}
                height={32}
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Linear Integration
              </h1>
              <p className="text-gray-600 mt-1">
                Sync issues and project management with Linear for seamless
                workflow integration.
              </p>
            </div>
          </div>
        </div>

        {/* Information Panel */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>About Linear</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Linear is a modern issue tracking and project management tool
                designed for high-performance teams. This integration will help
                you:
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Sync issues and project data with Linear</li>
                <li>• Track project progress and milestones</li>
                <li>• Manage team workflows and assignments</li>
                <li>• Get real-time updates on issue status changes</li>
                <li>• Automate project management workflows</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Form */}
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Connect to Linear</CardTitle>
              <CardDescription>
                Click the button below to start the OAuth authentication process
                with Linear. You&apos;ll be redirected to Linear to authorize
                the integration.
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
                      Connect Linear
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
