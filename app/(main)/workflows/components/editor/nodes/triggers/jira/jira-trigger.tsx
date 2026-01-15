import { WorkflowNode } from "@/services/WorkflowService";
import { getNodeColors } from "../../color_utils";
import { Ticket } from "lucide-react";
import { SourceHandle } from "../../../handles";
import { FC, useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { JiraIntegrationSelector } from "./JiraIntegrationSelector";
import { JiraProjectSelector } from "./JiraProjectSelector";
import IntegrationService from "@/services/IntegrationService";
import { AlertTriangle, Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JiraTriggerConfigProps {
    config: any;
    onConfigChange: (config: any) => void;
    readOnly?: boolean;
    workflow?: any;
}

export const JiraTriggerConfigComponent: FC<JiraTriggerConfigProps> = ({
    config,
    onConfigChange,
    readOnly = false,
    workflow,
}) => {
    console.log("JiraTriggerConfigComponent render with config:", config);

    const [hasWebhook, setHasWebhook] = useState<boolean | null>(null);
    const [webhookUrl, setWebhookUrl] = useState<string>("");
    const [checkingWebhook, setCheckingWebhook] = useState(false);

    // Check if webhook exists for the selected integration
    useEffect(() => {
        const checkWebhook = async () => {
            const integrationId = config.integrationId || config.integration_id;
            if (!integrationId) {
                setHasWebhook(null);
                return;
            }

            setCheckingWebhook(true);
            try {
                // Get all integrations and find the selected one
                const integrations = await IntegrationService.getConnectedIntegrations();
                const integration = integrations.find(int => int.id === integrationId);

                if (!integration) {
                    setHasWebhook(false);
                    setCheckingWebhook(false);
                    return;
                }

                // Check if webhook exists in integration metadata
                const webhooks = integration.metadata?.webhooks;
                const webhookExists = !!(webhooks && Array.isArray(webhooks) && webhooks.length > 0);
                setHasWebhook(webhookExists);

                // Construct webhook URL using proper environment variable
                // Use WORKFLOWS_WEBHOOK_URL or WORKFLOWS_URL (same as Sentry), fallback to BASE_URL
                const workflowsUrl = process.env.NEXT_PUBLIC_WORKFLOWS_WEBHOOK_URL
                    || process.env.NEXT_PUBLIC_WORKFLOWS_URL
                    || process.env.NEXT_PUBLIC_BASE_URL
                    || "";

                if (webhookExists && webhooks && webhooks.length > 0) {
                    // If webhook URL is stored in metadata, use it
                    setWebhookUrl(webhooks[0].url);
                } else {
                    // Otherwise, construct the expected webhook URL
                    setWebhookUrl(`${workflowsUrl}/api/v1/integrations/jira/webhook`);
                }
            } catch (error) {
                console.error("Error checking webhook:", error);
                setHasWebhook(false);
            } finally {
                setCheckingWebhook(false);
            }
        };

        checkWebhook();
    }, [config.integrationId, config.integration_id, config.cloud_id]);

    const handleChange = (key: string, value: any) => {
        if (readOnly) return;
        console.log("JiraTriggerConfigComponent handleChange:", key, value);
        onConfigChange({ ...config, [key]: value });
    };

    return (
        <div className="space-y-4">
            <div>
                <Label htmlFor="integration">Jira Integration</Label>
                <JiraIntegrationSelector
                    selectedIntegrationId={
                        config.integrationId || config.integration_id || ""
                    }
                    onIntegrationChange={(integrationId, uniqueIdentifier) => {
                        console.log(
                            "Jira trigger onIntegrationChange called with:",
                            integrationId,
                            uniqueIdentifier
                        );
                        const newConfig = { ...config, integrationId };
                        if (uniqueIdentifier) {
                            newConfig.uniqueIdentifier = uniqueIdentifier;
                            newConfig.cloud_id = uniqueIdentifier; // cloud_id is the unique identifier for Jira
                        }
                        console.log("Jira trigger updating config to:", newConfig);
                        onConfigChange(newConfig);
                    }}
                    readOnly={readOnly}
                />
            </div>

            {/* Webhook Status and Manual Setup */}
            {config.integrationId && (
                <div className="space-y-3">
                    {checkingWebhook ? (
                        <div className="p-3 border border-blue-200 bg-blue-50 rounded-md flex items-start gap-2">
                            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                            <p className="text-sm text-blue-800">
                                Checking webhook configuration...
                            </p>
                        </div>
                    ) : hasWebhook === false ? (
                        <div className="p-3 border border-red-200 bg-red-50 rounded-md">
                            <div className="flex items-start gap-2 mb-2">
                                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                                <div className="space-y-2 flex-1">
                                    <p className="font-semibold text-red-800">Webhook not configured</p>
                                    <p className="text-sm text-red-700">
                                        Please manually configure a webhook in your Jira settings to enable this trigger.
                                    </p>
                                    <div className="mt-3 p-3 bg-white rounded border border-red-200">
                                        <p className="text-xs font-semibold mb-2 text-gray-700">Setup Instructions:</p>
                                        <ol className="text-xs space-y-1 list-decimal list-inside text-gray-600">
                                            <li>Go to your Jira Cloud Settings → System → Webhooks</li>
                                            <li>Click "Create a webhook"</li>
                                            <li>Set the webhook URL to:
                                                <code className="block mt-1 p-2 bg-gray-100 rounded text-xs break-all font-mono">
                                                    {webhookUrl || `[Webhook URL will be generated after selecting integration]`}
                                                </code>
                                            </li>
                                            <li>Select events: Issue → created</li>
                                            <li>Save the webhook</li>
                                        </ol>
                                    </div>
                                    {webhookUrl && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="mt-2"
                                            onClick={() => window.open("https://admin.atlassian.com", "_blank")}
                                        >
                                            <ExternalLink className="h-3 w-3 mr-1" />
                                            Open Jira Settings
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : hasWebhook === true ? (
                        <div className="p-3 border border-green-200 bg-green-50 rounded-md flex items-start gap-2">
                            <Info className="h-4 w-4 text-green-600 mt-0.5" />
                            <p className="text-sm text-green-800">
                                Webhook configured successfully
                            </p>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Filter Configuration */}
            <div className="space-y-3">
                <div className="border-t pt-3">
                    <h4 className="text-sm font-medium mb-3">Filters (Optional)</h4>

                    <div className="space-y-3">
                        <div>
                            <Label htmlFor="project_key" className="text-xs">
                                Project
                            </Label>
                            <div className="mt-1">
                                <JiraProjectSelector
                                    integrationId={config.integrationId || config.integration_id || ""}
                                    selectedProjectKey={config.project_key || config.projectKey || ""}
                                    onProjectChange={(projectKey) => handleChange("project_key", projectKey)}
                                    readOnly={readOnly}
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="jql_filter" className="text-xs">
                                JQL Filter
                            </Label>
                            <Textarea
                                id="jql_filter"
                                placeholder="e.g., priority = High AND assignee = currentUser()"
                                value={config.jql_filter || config.jqlFilter || ""}
                                onChange={(e) => handleChange("jql_filter", e.target.value)}
                                disabled={readOnly}
                                className="mt-1 min-h-[80px]"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Use JQL (Jira Query Language) to filter issues
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Node metadata for the palette
export const jiraTriggerNodeMetadata = {
    type: "trigger_jira_issue_created",
    category: "trigger",
    group: "jira",
    name: "Jira Issue Created",
    description: "Triggers when an issue is created in Jira",
    icon: Ticket,
    configComponent: JiraTriggerConfigComponent,
};

export const JiraTriggerNode = ({ data }: { data: WorkflowNode }) => {
    const colors = getNodeColors(data.group);
    const { integrationId, integration_id, uniqueIdentifier, unique_identifier } =
        data.data || {};
    const actualIntegrationId = integrationId || integration_id;
    const actualUniqueIdentifier = uniqueIdentifier || unique_identifier;

    return (
        <div className="w-full">
            <div
                className="p-3 border-b border-gray-200"
                style={{ backgroundColor: colors.secondary }}
            >
                <div className="flex items-center">
                    <Ticket
                        className="w-5 h-5 mr-2"
                        style={{ color: colors.primary }}
                    />
                    <h3 className="font-semibold text-gray-800">Jira Issue Created</h3>
                </div>
            </div>
            <div className="p-4 space-y-2">
                <div className="flex flex-col gap-1">
                    <div className="text-xs text-gray-500">Integration</div>
                    <div className="text-sm font-medium text-gray-800">
                        {actualIntegrationId ? (
                            <span className="text-green-600">✓ Connected</span>
                        ) : (
                            <span className="italic text-gray-400">
                                No integration selected
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <SourceHandle />
        </div>
    );
};
