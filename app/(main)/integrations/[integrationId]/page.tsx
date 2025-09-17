"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plug } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import IntegrationsPage from "../page";

// Available integration types - this should ideally be imported from a shared file
const availableIntegrationTypes = [
  {
    id: "github",
    name: "GitHub",
    description:
      "Connect your GitHub repositories and manage pull requests, issues, and commits.",
    icon: (
      <Image
        src="/images/github-icon-1.svg"
        alt="GitHub"
        width={24}
        height={24}
      />
    ),
    category: "Development",
    fields: [
      {
        id: "instanceName",
        label: "Instance Name",
        type: "text",
        placeholder: "e.g., My GitHub",
        required: true,
      },
      {
        id: "token",
        label: "Personal Access Token",
        type: "password",
        placeholder: "ghp_...",
        required: true,
      },
    ],
  },
  {
    id: "jira",
    name: "Jira",
    description:
      "Connect to your Jira instance to manage issues, sprints, and project tracking.",
    icon: (
      <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
        <span className="text-white text-xs font-bold">J</span>
      </div>
    ),
    category: "Project Management",
    fields: [
      {
        id: "instanceName",
        label: "Instance Name",
        type: "text",
        placeholder: "e.g., Company Jira",
        required: true,
      },
      {
        id: "domain",
        label: "Domain",
        type: "text",
        placeholder: "e.g., company.atlassian.net",
        required: true,
      },
      {
        id: "email",
        label: "Email",
        type: "email",
        placeholder: "user@company.com",
        required: true,
      },
      {
        id: "apiToken",
        label: "API Token",
        type: "password",
        placeholder: "ATATT3...",
        required: true,
      },
    ],
  },
  {
    id: "sentry",
    name: "Sentry",
    description:
      "Connect Sentry to monitor errors and performance issues in your applications.",
    icon: (
      <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center">
        <span className="text-white text-xs font-bold">S</span>
      </div>
    ),
    category: "Monitoring",
    fields: [
      {
        id: "instanceName",
        label: "Instance Name",
        type: "text",
        placeholder: "e.g., Production Sentry",
        required: true,
      },
      {
        id: "organization",
        label: "Organization",
        type: "text",
        placeholder: "your-org",
        required: true,
      },
      {
        id: "authToken",
        label: "Auth Token",
        type: "password",
        placeholder: "sntrys_...",
        required: true,
      },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    description:
      "Connect Slack to send notifications and manage team communications.",
    icon: (
      <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
        <span className="text-white text-xs font-bold">S</span>
      </div>
    ),
    category: "Communication",
    fields: [
      {
        id: "instanceName",
        label: "Instance Name",
        type: "text",
        placeholder: "e.g., Team Slack",
        required: true,
      },
      {
        id: "workspace",
        label: "Workspace",
        type: "text",
        placeholder: "your-workspace",
        required: true,
      },
      {
        id: "botToken",
        label: "Bot Token",
        type: "password",
        placeholder: "xoxb-...",
        required: true,
      },
    ],
  },
  {
    id: "notion",
    name: "Notion",
    description:
      "Connect Notion to sync documents, databases, and knowledge base content.",
    icon: (
      <div className="w-6 h-6 bg-gray-800 rounded flex items-center justify-center">
        <span className="text-white text-xs font-bold">N</span>
      </div>
    ),
    category: "Documentation",
    fields: [
      {
        id: "instanceName",
        label: "Instance Name",
        type: "text",
        placeholder: "e.g., Company Notion",
        required: true,
      },
      {
        id: "integrationToken",
        label: "Integration Token",
        type: "password",
        placeholder: "secret_...",
        required: true,
      },
    ],
  },
];

interface ConnectedIntegration {
  id: string;
  type: string;
  instanceName: string;
  status: "active" | "error" | "pending";
  lastSync?: string;
  errorMessage?: string;
  config: Record<string, string>;
}

interface PageProps {
  params: Promise<{
    integrationId: string;
  }>;
}

export default function IntegrationModal({ params }: PageProps) {
  const router = useRouter();
  const [integrationId, setIntegrationId] = useState<string>("");
  const [integrationForm, setIntegrationForm] = useState<
    Record<string, string>
  >({});
  const [isConnecting, setIsConnecting] = useState(false);

  // Get params and find the integration type
  useEffect(() => {
    params.then(({ integrationId: id }) => {
      setIntegrationId(id);
    });
  }, [params]);

  const selectedIntegrationType = availableIntegrationTypes.find(
    (integration) => integration.id === integrationId
  );

  // If integration not found, redirect to integrations page
  useEffect(() => {
    if (integrationId && !selectedIntegrationType) {
      router.push("/integrations");
    }
  }, [integrationId, selectedIntegrationType, router]);

  // If it's Sentry, redirect to the dedicated Sentry page
  useEffect(() => {
    if (integrationId === "sentry") {
      router.push("/integrations/sentry");
    }
  }, [integrationId, router]);

  const handleFormChange = (fieldId: string, value: string) => {
    setIntegrationForm((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleCloseModal = () => {
    setIntegrationForm({});
    router.push("/integrations");
  };

  const handleConnect = async () => {
    if (!selectedIntegrationType) return;

    // Validate required fields
    const requiredFields = selectedIntegrationType.fields.filter(
      (f: { required: boolean; id: string; label: string }) => f.required
    );
    const missingFields = requiredFields.filter(
      (f: { id: string; label: string }) => !integrationForm[f.id]
    );

    if (missingFields.length > 0) {
      alert(
        `Please fill in: ${missingFields.map((f: { label: string }) => f.label).join(", ")}`
      );
      return;
    }

    setIsConnecting(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // For now, just redirect back to integrations page
      // In a real app, you would save the integration and then redirect
      router.push("/integrations");
    } catch (error) {
      console.error("Failed to connect integration:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  if (!selectedIntegrationType) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Render the main integrations page as background */}
      <IntegrationsPage />

      {/* Coming Soon Modal */}
      <Dialog
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseModal();
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIntegrationType.icon}
              {selectedIntegrationType.name} Integration
            </DialogTitle>
            <DialogDescription>
              This integration is coming soon!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">🚀</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Coming Soon!
              </h3>
              <p className="text-gray-600 mb-4">
                We&apos;re working hard to bring you the{" "}
                {selectedIntegrationType.name} integration. Stay tuned for
                updates!
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>What to expect:</strong>{" "}
                  {selectedIntegrationType.description}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleCloseModal} className="w-full">
              Got it!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
