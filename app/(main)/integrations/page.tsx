"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Search,
  Trash2,
  CheckCircle,
  AlertCircle,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import IntegrationService, {
  ConnectedIntegration,
} from "@/services/IntegrationService";

// Available integration types
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
        placeholder: "e.g., Company GitHub",
        required: true,
      },
      {
        id: "organization",
        label: "Organization",
        placeholder: "e.g., company-name",
        required: true,
      },
      {
        id: "accessToken",
        label: "Access Token",
        placeholder: "ghp_...",
        required: true,
        type: "password",
      },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    description:
      "Get notifications and manage workflows directly in your Slack workspace.",
    icon: (
      <Image
        src="/images/slack-new-logo.svg"
        alt="Slack"
        width={24}
        height={24}
      />
    ),
    category: "Communication",
    fields: [
      {
        id: "instanceName",
        label: "Instance Name",
        placeholder: "e.g., Company Slack",
        required: true,
      },
      {
        id: "workspace",
        label: "Workspace",
        placeholder: "e.g., company-name",
        required: true,
      },
      {
        id: "webhookUrl",
        label: "Webhook URL",
        placeholder: "https://hooks.slack.com/...",
        required: true,
      },
    ],
  },
  {
    id: "linear",
    name: "Linear",
    description:
      "Sync issues and project management with Linear for seamless workflow integration.",
    icon: (
      <Image src="/images/linear.svg" alt="Linear" width={24} height={24} />
    ),
    category: "Project Management",
  },
  {
    id: "sentry",
    name: "Sentry",
    description:
      "Monitor errors and performance issues with automatic Sentry integration.",
    icon: (
      <Image src="/images/sentry-3.svg" alt="Sentry" width={24} height={24} />
    ),
    category: "Monitoring",
  },
  {
    id: "jira",
    name: "Jira",
    description:
      "Integrate with Jira to manage issues, track projects, and automate workflows.",
    icon: <Image src="/images/jira-3.svg" alt="Jira" width={24} height={24} />,
    category: "Project Management",
    fields: [
      {
        id: "instanceName",
        label: "Instance Name",
        placeholder: "e.g., Company Jira",
        required: true,
      },
      {
        id: "domain",
        label: "Domain",
        placeholder: "e.g., company.atlassian.net",
        required: true,
      },
      {
        id: "email",
        label: "Email",
        placeholder: "user@company.com",
        required: true,
      },
      {
        id: "apiToken",
        label: "API Token",
        placeholder: "ATATT3...",
        required: true,
        type: "password",
      },
    ],
  },
  {
    id: "confluence",
    name: "Confluence",
    description: "Sync documentation and knowledge management with Confluence.",
    icon: (
      <Image
        src="/images/confluence-1.svg"
        alt="Confluence"
        width={24}
        height={24}
      />
    ),
    category: "Documentation",
    fields: [
      {
        id: "instanceName",
        label: "Instance Name",
        placeholder: "e.g., Company Confluence",
        required: true,
      },
      {
        id: "domain",
        label: "Domain",
        placeholder: "e.g., company.atlassian.net",
        required: true,
      },
      {
        id: "email",
        label: "Email",
        placeholder: "user@company.com",
        required: true,
      },
      {
        id: "apiToken",
        label: "API Token",
        placeholder: "ATATT3...",
        required: true,
        type: "password",
      },
    ],
  },
  {
    id: "s3",
    name: "Amazon S3",
    description:
      "Connect to Amazon S3 buckets for file storage and data management.",
    icon: (
      <Image
        src="/images/amazon-s3-simple-storage-service.svg"
        alt="Amazon S3"
        width={24}
        height={24}
      />
    ),
    category: "Cloud Storage",
    fields: [
      {
        id: "instanceName",
        label: "Instance Name",
        placeholder: "e.g., Company S3",
        required: true,
      },
      {
        id: "bucketName",
        label: "Bucket Name",
        placeholder: "e.g., company-data-bucket",
        required: true,
      },
      {
        id: "region",
        label: "AWS Region",
        placeholder: "e.g., us-east-1",
        required: true,
      },
      {
        id: "accessKeyId",
        label: "Access Key ID",
        placeholder: "AKIA...",
        required: true,
      },
      {
        id: "secretAccessKey",
        label: "Secret Access Key",
        placeholder: "Enter your secret access key",
        required: true,
        type: "password",
      },
    ],
  },
  {
    id: "aws",
    name: "AWS",
    description:
      "Integrate with AWS services for comprehensive cloud infrastructure management.",
    icon: <Image src="/images/aws-2.svg" alt="AWS" width={24} height={24} />,
    category: "Cloud Infrastructure",
    fields: [
      {
        id: "instanceName",
        label: "Instance Name",
        placeholder: "e.g., Company AWS",
        required: true,
      },
      {
        id: "region",
        label: "Default Region",
        placeholder: "e.g., us-east-1",
        required: true,
      },
      {
        id: "accessKeyId",
        label: "Access Key ID",
        placeholder: "AKIA...",
        required: true,
      },
      {
        id: "secretAccessKey",
        label: "Secret Access Key",
        placeholder: "Enter your secret access key",
        required: true,
        type: "password",
      },
    ],
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    description:
      "Connect your Bitbucket repositories and manage code collaboration.",
    icon: (
      <Image
        src="/images/bitbucket-icon.svg"
        alt="Bitbucket"
        width={24}
        height={24}
      />
    ),
    category: "Development",
    fields: [
      {
        id: "instanceName",
        label: "Instance Name",
        placeholder: "e.g., Company Bitbucket",
        required: true,
      },
      {
        id: "workspace",
        label: "Workspace",
        placeholder: "e.g., company-name",
        required: true,
      },
      {
        id: "username",
        label: "Username",
        placeholder: "e.g., username",
        required: true,
      },
      {
        id: "appPassword",
        label: "App Password",
        placeholder: "Enter your app password",
        required: true,
        type: "password",
      },
    ],
  },
  {
    id: "gitlab",
    name: "GitLab",
    description: "Connect to GitLab repositories and manage CI/CD pipelines.",
    icon: (
      <Image src="/images/gitlab.svg" alt="GitLab" width={24} height={24} />
    ),
    category: "Development",
    fields: [
      {
        id: "instanceName",
        label: "Instance Name",
        placeholder: "e.g., Company GitLab",
        required: true,
      },
      {
        id: "instanceUrl",
        label: "Instance URL",
        placeholder: "e.g., https://gitlab.company.com",
        required: true,
      },
      {
        id: "accessToken",
        label: "Access Token",
        placeholder: "glpat-...",
        required: true,
        type: "password",
      },
    ],
  },
  {
    id: "gcloud",
    name: "Google Cloud",
    description:
      "Integrate with Google Cloud Platform for cloud services and infrastructure.",
    icon: (
      <Image
        src="/images/google-cloud-1.svg"
        alt="Google Cloud"
        width={24}
        height={24}
      />
    ),
    category: "Cloud Infrastructure",
    fields: [
      {
        id: "instanceName",
        label: "Instance Name",
        placeholder: "e.g., Company GCP",
        required: true,
      },
      {
        id: "projectId",
        label: "Project ID",
        placeholder: "e.g., company-project-123",
        required: true,
      },
      {
        id: "serviceAccountKey",
        label: "Service Account Key",
        placeholder: "Paste your JSON service account key",
        required: true,
        type: "textarea",
      },
    ],
  },
  {
    id: "googledrive",
    name: "Google Drive",
    description:
      "Connect to Google Drive for file synchronization and collaboration.",
    icon: (
      <Image
        src="/images/google-drive.svg"
        alt="Google Drive"
        width={24}
        height={24}
      />
    ),
    category: "File Storage",
    fields: [
      {
        id: "instanceName",
        label: "Instance Name",
        placeholder: "e.g., Company Google Drive",
        required: true,
      },
      {
        id: "clientId",
        label: "Client ID",
        placeholder: "Enter your OAuth client ID",
        required: true,
      },
      {
        id: "clientSecret",
        label: "Client Secret",
        placeholder: "Enter your OAuth client secret",
        required: true,
        type: "password",
      },
      {
        id: "refreshToken",
        label: "Refresh Token",
        placeholder: "Enter your refresh token",
        required: true,
        type: "password",
      },
    ],
  },
  {
    id: "grafana",
    name: "Grafana",
    description:
      "Connect to Grafana for monitoring, analytics, and observability.",
    icon: (
      <Image src="/images/grafana.svg" alt="Grafana" width={24} height={24} />
    ),
    category: "Monitoring",
    fields: [
      {
        id: "instanceName",
        label: "Instance Name",
        placeholder: "e.g., Company Grafana",
        required: true,
      },
      {
        id: "instanceUrl",
        label: "Instance URL",
        placeholder: "e.g., https://grafana.company.com",
        required: true,
      },
      {
        id: "apiKey",
        label: "API Key",
        placeholder: "Enter your Grafana API key",
        required: true,
        type: "password",
      },
    ],
  },
  {
    id: "msteams",
    name: "Microsoft Teams",
    description:
      "Integrate with Microsoft Teams for notifications and workflow automation.",
    icon: (
      <Image
        src="/images/microsoft-teams-1.svg"
        alt="Microsoft Teams"
        width={24}
        height={24}
      />
    ),
    category: "Communication",
    fields: [
      {
        id: "instanceName",
        label: "Instance Name",
        placeholder: "e.g., Company Teams",
        required: true,
      },
      {
        id: "webhookUrl",
        label: "Webhook URL",
        placeholder: "https://company.webhook.office.com/...",
        required: true,
      },
    ],
  },
  {
    id: "notion",
    name: "Notion",
    description:
      "Sync with Notion for knowledge management and project documentation.",
    icon: (
      <Image src="/images/notion-2.svg" alt="Notion" width={24} height={24} />
    ),
    category: "Documentation",
    fields: [
      {
        id: "instanceName",
        label: "Instance Name",
        placeholder: "e.g., Company Notion",
        required: true,
      },
      {
        id: "workspaceId",
        label: "Workspace ID",
        placeholder: "e.g., workspace-id",
        required: true,
      },
      {
        id: "integrationToken",
        label: "Integration Token",
        placeholder: "secret_...",
        required: true,
        type: "password",
      },
    ],
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    description:
      "Connect to Mailchimp for email marketing automation and campaign management.",
    icon: (
      <Image
        src="/images/mailchimp-freddie-icon.svg"
        alt="Mailchimp"
        width={24}
        height={24}
      />
    ),
    category: "Marketing",
    fields: [
      {
        id: "instanceName",
        label: "Instance Name",
        placeholder: "e.g., Company Mailchimp",
        required: true,
      },
      {
        id: "apiKey",
        label: "API Key",
        placeholder: "Enter your Mailchimp API key",
        required: true,
        type: "password",
      },
      {
        id: "serverPrefix",
        label: "Server Prefix",
        placeholder: "e.g., us1, us2, eu1",
        required: true,
      },
      {
        id: "audienceId",
        label: "Audience ID",
        placeholder: "e.g., audience-id",
        required: false,
      },
    ],
  },
  {
    id: "figma",
    name: "Figma",
    description:
      "Integrate with Figma for design collaboration and asset management.",
    icon: (
      <Image src="/images/figma-icon.svg" alt="Figma" width={24} height={24} />
    ),
    category: "Design",
    fields: [
      {
        id: "instanceName",
        label: "Instance Name",
        placeholder: "e.g., Company Figma",
        required: true,
      },
      {
        id: "accessToken",
        label: "Access Token",
        placeholder: "Enter your Figma access token",
        required: true,
        type: "password",
      },
      {
        id: "teamId",
        label: "Team ID",
        placeholder: "e.g., team-id (optional)",
        required: false,
      },
      {
        id: "projectId",
        label: "Project ID",
        placeholder: "e.g., project-id (optional)",
        required: false,
      },
    ],
  },
];

// Connected integration interface is now imported from IntegrationService

const Integrations = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [connectedIntegrations, setConnectedIntegrations] = useState<
    ConnectedIntegration[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIntegrations, setDeletingIntegrations] = useState<Set<string>>(
    new Set()
  );
  const [editingIntegrations, setEditingIntegrations] = useState<Set<string>>(
    new Set()
  );
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});

  // Fetch connected integrations from API
  useEffect(() => {
    const fetchConnectedIntegrations = async () => {
      try {
        setLoading(true);
        setError(null);
        const integrations =
          await IntegrationService.getConnectedIntegrations();
        setConnectedIntegrations(integrations);
      } catch (err) {
        console.error("Error fetching connected integrations:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch integrations"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchConnectedIntegrations();
  }, []);

  // Filter available integrations based on search
  const filteredIntegrationTypes = availableIntegrationTypes.filter(
    (integration) => {
      if (!searchTerm.trim()) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        integration.name.toLowerCase().includes(searchLower) ||
        integration.description.toLowerCase().includes(searchLower) ||
        integration.category.toLowerCase().includes(searchLower)
      );
    }
  );

  const handleAddIntegration = (integrationType: any) => {
    // Navigate to the integration setup page
    router.push(`/integrations/${integrationType.id}`);
  };

  const handleDeleteIntegration = async (integrationId: string) => {
    if (confirm("Are you sure you want to delete this integration?")) {
      // Add to deleting state
      setDeletingIntegrations((prev) => new Set(prev).add(integrationId));

      try {
        // Call backend API to delete integration
        await IntegrationService.deleteIntegration(integrationId);

        // Remove from local state on success
        setConnectedIntegrations((prev) =>
          prev.filter((i) => i.integration_id !== integrationId)
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to delete integration";
        alert(`Failed to delete integration: ${errorMessage}`);
      } finally {
        // Remove from deleting state
        setDeletingIntegrations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(integrationId);
          return newSet;
        });
      }
    }
  };

  const handleStartEdit = (integrationId: string, currentName: string) => {
    setEditingIntegrations((prev) => new Set(prev).add(integrationId));
    setEditingNames((prev) => ({ ...prev, [integrationId]: currentName }));
  };

  const handleCancelEdit = (integrationId: string) => {
    setEditingIntegrations((prev) => {
      const newSet = new Set(prev);
      newSet.delete(integrationId);
      return newSet;
    });
    setEditingNames((prev) => {
      const newNames = { ...prev };
      delete newNames[integrationId];
      return newNames;
    });
  };

  const handleSaveEdit = async (integrationId: string) => {
    const newName = editingNames[integrationId];
    if (!newName || newName.trim() === "") {
      alert("Integration name cannot be empty");
      return;
    }

    try {
      await IntegrationService.updateIntegrationName(
        integrationId,
        newName.trim()
      );

      // Update local state
      setConnectedIntegrations((prev) =>
        prev.map((integration) =>
          integration.integration_id === integrationId
            ? { ...integration, instanceName: newName.trim() }
            : integration
        )
      );

      // Exit edit mode
      handleCancelEdit(integrationId);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update integration name";
      alert(`Failed to update integration name: ${errorMessage}`);
    }
  };

  const handleNameChange = (integrationId: string, value: string) => {
    setEditingNames((prev) => ({ ...prev, [integrationId]: value }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "connecting":
        return (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "error":
        return "Error";
      case "connecting":
        return "Connecting...";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-50";
      case "error":
        return "text-red-600 bg-red-50";
      case "connecting":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search integrations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Connected Integrations */}
        {loading && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Connected Integrations
            </h2>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border border-gray-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
                        <div>
                          <div className="w-32 h-4 bg-gray-200 rounded animate-pulse mb-1" />
                          <div className="w-24 h-3 bg-gray-200 rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="w-16 h-6 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8">
            <Card className="border border-red-200 bg-red-50">
              <CardContent className="text-center py-6">
                <div className="text-red-600 mb-2">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                  <p className="font-medium">Failed to load integrations</p>
                  <p className="text-sm">{error}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="mt-3"
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {!loading && !error && connectedIntegrations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Connected Integrations ({connectedIntegrations.length})
            </h2>
            <div className="space-y-3">
              {connectedIntegrations.map((integration) => {
                const integrationType = availableIntegrationTypes.find(
                  (t) => t.id === integration.type
                );
                return (
                  <Card
                    key={integration.id}
                    className="border border-gray-200 shadow-sm group"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0">
                            {integrationType?.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              {editingIntegrations.has(
                                integration.integration_id
                              ) ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={
                                      editingNames[
                                        integration.integration_id
                                      ] || ""
                                    }
                                    onChange={(e) =>
                                      handleNameChange(
                                        integration.integration_id,
                                        e.target.value
                                      )
                                    }
                                    className="h-6 text-sm px-2 py-1 min-w-[300px]"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleSaveEdit(
                                          integration.integration_id
                                        );
                                      } else if (e.key === "Escape") {
                                        handleCancelEdit(
                                          integration.integration_id
                                        );
                                      }
                                    }}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() =>
                                      handleSaveEdit(integration.integration_id)
                                    }
                                  >
                                    <Check className="h-3 w-3 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() =>
                                      handleCancelEdit(
                                        integration.integration_id
                                      )
                                    }
                                  >
                                    <X className="h-3 w-3 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-base">
                                    {integration.instanceName}
                                  </CardTitle>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() =>
                                      handleStartEdit(
                                        integration.integration_id,
                                        integration.instanceName
                                      )
                                    }
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {integrationType?.name} •{" "}
                              {integration.orgSlug ||
                                integration.config.org_slug ||
                                integration.config.installation_id ||
                                integration.config.organization ||
                                integration.config.workspace ||
                                integration.config.domain ||
                                integration.config.bucketName ||
                                integration.config.projectId ||
                                integration.config.instanceUrl ||
                                integration.config.workspaceId ||
                                "Connected"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(integration.status)}`}
                          >
                            <div className="flex items-center gap-1">
                              {getStatusIcon(integration.status)}
                              {getStatusText(integration.status)}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={deletingIntegrations.has(
                              integration.integration_id
                            )}
                            onClick={() =>
                              handleDeleteIntegration(
                                integration.integration_id
                              )
                            }
                          >
                            {deletingIntegrations.has(
                              integration.integration_id
                            ) ? (
                              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-xs text-gray-600">
                        <div className="flex flex-col gap-1">
                          <span>Last sync: {integration.lastSync}</span>
                          {integration.errorMessage && (
                            <span className="text-red-600 font-medium">
                              Error: {integration.errorMessage}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && connectedIntegrations.length === 0 && (
          <Card className="mb-8">
            <CardContent className="text-center py-12">
              <div className="text-gray-600 mb-4">
                {searchTerm.trim()
                  ? `No integrations found matching "${searchTerm}". Try a different search term.`
                  : "No integrations connected yet. Start by adding your first integration below."}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Integrations */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Available Integrations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredIntegrationTypes.map((integration) => (
              <Card
                key={integration.id}
                className="relative border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group overflow-hidden"
                onClick={() => handleAddIntegration(integration)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0">{integration.icon}</div>
                    <div>
                      <CardTitle className="text-base">
                        {integration.name}
                      </CardTitle>
                      <p className="text-xs text-gray-500">
                        {integration.category}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-sm text-gray-600 mb-3">
                    {integration.description}
                  </CardDescription>
                </CardContent>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent via-transparent via-transparent via-black/0 via-black/0 via-black/0 via-black/0 to-black/0 opacity-100 group-hover:from-transparent group-hover:via-transparent group-hover:via-transparent group-hover:via-transparent group-hover:via-black/5 group-hover:via-black/15 group-hover:via-black/25 group-hover:via-black/35 group-hover:to-black/45 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-end justify-end p-3">
                  <p className="text-white font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    + add new
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Integrations;
