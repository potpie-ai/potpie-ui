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
import { useAuthContext } from "@/contexts/AuthContext";

export default function JiraIntegrationPage() {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const { user } = useAuthContext();

  const handleBack = () => {
    router.push("/integrations");
  };

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      console.log("🚀 Initiating Jira OAuth flow...");

      // Step 1: Get authorization URL from backend
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const redirectUri =
        process.env.NEXT_PUBLIC_JIRA_REDIRECT_URI ||
        "http://localhost:8001/api/v1/integrations/jira/callback";

      console.log("📡 Requesting authorization URL from backend:");
      console.log(
        "- Backend URL:",
        `${baseUrl}/api/v1/integrations/jira/initiate`
      );
      console.log("- Redirect URI:", redirectUri);

      // Obtain Potpie user id from AuthContext (Redux or auth provider).
      // Fallback to an API probe only if the context is not populated.
      let potpieUserId: string | null = user?.uid || null;

      if (!potpieUserId) {
        try {
          const meResp = await fetch(`${baseUrl}/api/v1/auth/me`);
          if (meResp.ok) {
            const meJson = await meResp.json();
            potpieUserId = meJson?.user_id || meJson?.id || null;
          }
        } catch (err) {
          console.warn("Could not fetch current user id for OAuth state", err);
        }
      }

      const response = await fetch(
        `${baseUrl}/api/v1/integrations/jira/initiate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            redirect_uri: redirectUri,
            // include Potpie user id in state so backend can attribute the integration
            state: potpieUserId || undefined,
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

      console.log("🔗 Redirecting to Jira authorization page...");

      // Step 2: Redirect user to Jira authorization page
      window.location.href = data.authorization_url;
    } catch (error) {
      console.error("❌ Failed to connect Jira integration:", error);
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
            <li className="text-gray-900 font-medium">Jira</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Image
                src="/images/jira-3.svg"
                alt="Jira"
                width={32}
                height={32}
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Jira Integration
              </h1>
              <p className="text-gray-600 mt-1">
                Integrate with Jira to manage issues, track projects, and automate workflows.
              </p>
            </div>
          </div>
        </div>

        {/* Information Panel */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>About Jira</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Jira is a powerful project management and issue tracking tool
                used by development teams worldwide. This integration will help
                you:
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Sync issues and project data with Jira</li>
                <li>• Track project progress and sprint planning</li>
                <li>• Manage team workflows and assignments</li>
                <li>• Get real-time updates on issue status changes</li>
                <li>• Automate project management workflows</li>
                <li>• Monitor project metrics and reporting</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Form */}
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Connect to Jira</CardTitle>
              <CardDescription>
                Click the button below to start the OAuth authentication process
                with Jira. You&apos;ll be redirected to Atlassian to authorize
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
                      Connect Jira
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