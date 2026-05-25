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
import getHeaders from "@/app/utils/headers.util";

export default function LinearIntegrationPage() {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const { user } = useAuthContext();

  const handleBack = () => {
    router.push("/integrations");
  };

  const handleConnect = async () => {
    if (!user?.uid) {
      alert("You need to be signed in to connect Linear. Please log in and try again.");
      return;
    }
    setIsConnecting(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

      // The /linear/callback path is what Linear is registered to redirect to;
      // /linear/initiate validates that we pass it the same value.
      const redirectUri = `${baseUrl}/api/v1/integrations/linear/callback`;


      // Server-side initiation: backend reads the authenticated user from
      // the Bearer token, signs that user_id into state, and hands us
      // back the Linear auth_url to navigate to. The frontend never has
      // a chance to mis-identify the user.
      const headers = await getHeaders();
      const resp = await fetch(`${baseUrl}/api/v1/integrations/linear/initiate`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ redirect_uri: redirectUri }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(text || `initiate failed with HTTP ${resp.status}`);
      }
      const { authorization_url: authUrl } = await resp.json();
      if (!authUrl) {
        throw new Error("Server did not return an authorization URL");
      }
      window.location.href = authUrl;
    } catch (error) {
      console.error("Failed to start Linear OAuth flow:", error);
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
