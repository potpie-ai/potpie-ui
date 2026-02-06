"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Workflow, Play, Code, Plug } from "lucide-react";

export default function BuildsPage() {
  const router = useRouter();

  const handleBuildFeature = () => {
    router.push("/idea");
  };

  const handleBuildWorkflow = () => {
    router.push("/idea");
  };

  const handleDebugError = () => {
    router.push("/idea?showcase=1");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-6 border-b border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-900">Builds</h1>
        <p className="text-sm text-gray-600 mt-1">
          Create and manage your AI-powered development builds
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Build a Feature Card */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-gray-200"
            onClick={handleBuildFeature}
          >
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Build a Feature</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Describe a feature idea and let the agent build it end-to-end with comprehensive planning, design, and implementation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Code className="h-4 w-4" />
                <span>Full-stack implementation</span>
              </div>
            </CardContent>
          </Card>

          {/* Build a Workflow Card */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-gray-200"
            onClick={handleBuildWorkflow}
          >
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Workflow className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Build a Workflow</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Create automated workflows and integrations that streamline your development process and connect services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Plug className="h-4 w-4" />
                <span>Automation & integration</span>
              </div>
            </CardContent>
          </Card>

          {/* Debug an Error Card */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-gray-200"
            onClick={handleDebugError}
          >
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Play className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Debug an Error</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Explore the tool with a pre-configured fraud detection pipeline demo showcasing the full workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Zap className="h-4 w-4" />
                <span>Demo mode</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

