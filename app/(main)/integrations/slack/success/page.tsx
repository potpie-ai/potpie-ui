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
  CheckCircle,
  ArrowLeft,
  ExternalLink,
  MessageSquare,
  Key,
  Bot,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SlackSuccessPage() {
  const router = useRouter();

  const handleBackToApp = () => {
    router.push("/newchat");
  };

  const handleBackToIntegrations = () => {
    router.push("/integrations");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎉 Successfully Installed!
          </h1>
          <p className="text-lg text-gray-600">
            Potpie AI has been successfully installed to your Slack workspace
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column - Next Steps */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-blue-600" />
                  Step 1: Authenticate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  First, you need to connect your Potpie API token to enable the
                  AI features.
                </p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <code className="text-sm font-mono text-gray-800">
                    /authenticate
                  </code>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Use this command in any Slack channel to connect your API
                  token
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  Step 2: Start Chatting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Once authenticated, you can start conversations with AI
                  agents.
                </p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <code className="text-sm font-mono text-gray-800">
                    /potpie
                  </code>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Use this command to start a new conversation with AI agents
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-600" />
                  Step 3: Continue Conversations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Keep the conversation going by mentioning the bot in threads.
                </p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <code className="text-sm font-mono text-gray-800">
                    @PotpieAI your question here
                  </code>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Mention @PotpieAI in thread replies to continue conversations
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Features & Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>What You Can Do</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">Code Analysis</p>
                      <p className="text-sm text-gray-600">
                        Ask questions about your codebase and get detailed
                        explanations
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">
                        API Documentation
                      </p>
                      <p className="text-sm text-gray-600">
                        Get help understanding API endpoints and their usage
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Debugging Help
                      </p>
                      <p className="text-sm text-gray-600">
                        Get assistance with debugging and troubleshooting
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Code Generation
                      </p>
                      <p className="text-sm text-gray-600">
                        Generate code snippets and implementations
                      </p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() =>
                      window.open(
                        "https://docs.potpie.ai/introduction",
                        "_blank"
                      )
                    }
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Documentation
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() =>
                      window.open("https://discord.gg/ryk5CMD5v6", "_blank")
                    }
                  >
                    <ExternalLink className="w-4 h-4" />
                    Join Discord Community
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">
                  ⚠️ Important Note
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-800">
                  This app uses generative AI technology and may produce
                  inaccurate responses. Please verify important information and
                  use your professional judgment when acting on AI-generated
                  content.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={handleBackToApp} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Potpie App
          </Button>
          <Button
            variant="outline"
            onClick={handleBackToIntegrations}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Integrations
          </Button>
        </div>
      </div>
    </div>
  );
}
