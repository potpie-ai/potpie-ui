"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plug,
  ArrowLeft,
  ChevronRight,
  Home,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SlackIntegrationPage() {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleBack = () => {
    router.push("/integrations");
  };

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      console.log("🚀 Initiating Slack OAuth flow...");

      // Redirect to Slack app installation
      const slackServer =
        process.env.NEXT_PUBLIC_SLACK_SERVER || "https://slack.potpie.ai";
      const slackInstallUrl = `${slackServer}/slack/install`;

      console.log("🔗 Redirecting to Slack app installation...");
      window.location.href = slackInstallUrl;
    } catch (error) {
      console.error("❌ Failed to connect Slack integration:", error);
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
            <li className="text-gray-900 font-medium">Slack</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Image
                src="/images/slack-new-logo.svg"
                alt="Slack"
                width={32}
                height={32}
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Slack Integration
              </h1>
              <p className="text-gray-600 mt-1">
                Connect your Slack workspace to get AI-powered assistance
                directly in your team channels.
              </p>
            </div>
          </div>
        </div>

        {/* Information Panel */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>About Potpie AI for Slack</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Potpie AI brings intelligent codebase assistance directly to
                your Slack workspace. Chat with AI agents that deeply understand
                your codebase and get instant help with development tasks.
              </p>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Key Features:
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        Chat with AI agents that understand your codebase
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        Use{" "}
                        <code className="bg-gray-100 px-1 rounded">
                          /potpie
                        </code>{" "}
                        command to start conversations
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        Authenticate with your Potpie API token using{" "}
                        <code className="bg-gray-100 px-1 rounded">
                          /authenticate
                        </code>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        Continue conversations by @mentioning @PotpieAI in
                        threads
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        Get detailed responses about your code, APIs, and
                        development workflows
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Getting Started:
                  </h4>
                  <ol className="text-sm text-blue-800 space-y-1">
                    <li>1. Install the app to your Slack workspace</li>
                    <li>
                      2. Use{" "}
                      <code className="bg-blue-100 px-1 rounded">
                        /authenticate
                      </code>{" "}
                      to connect your Potpie API token
                    </li>
                    <li>
                      3. Use{" "}
                      <code className="bg-blue-100 px-1 rounded">/potpie</code>{" "}
                      to start chatting with AI agents
                    </li>
                    <li>
                      4. Ask questions about your codebase and get intelligent
                      responses
                    </li>
                  </ol>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">
                    ⚠️ AI Disclaimer:
                  </h4>
                  <p className="text-sm text-yellow-800">
                    This app uses generative AI technology and may produce
                    inaccurate responses, summaries, or other outputs. Please
                    verify important information and use your professional
                    judgment when acting on AI-generated content.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Form */}
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Install Potpie AI for Slack</CardTitle>
              <CardDescription>
                Click the button below to install the Potpie AI app to your
                Slack workspace. You&apos;ll be redirected to Slack to complete
                the installation process.
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
                      Installing...
                    </>
                  ) : (
                    <>
                      <Plug className="h-4 w-4" />
                      Install to Slack
                    </>
                  )}
                </Button>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Need help getting started?
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open("https://docs.potpie.ai/introduction", "_blank")
                  }
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Documentation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
