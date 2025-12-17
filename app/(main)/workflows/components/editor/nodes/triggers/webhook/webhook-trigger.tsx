import { FC } from "react";
import { Webhook } from "lucide-react";
import {
  WorkflowNode,
  NodeCategory,
  NodeType,
  NodeGroup,
} from "@/services/WorkflowService";
import { getNodeColors } from "../../color_utils";
import { SourceHandle } from "../../../handles";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import {
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Info,
} from "lucide-react";
import { useState, useEffect } from "react";
import WorkflowService from "@/services/WorkflowService";

// Webhook icon component
const WebhookIcon = ({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) => <Webhook className={className} style={style} />;

// Webhook trigger config interface
export interface WebhookTriggerConfigProps {
  config: { hash?: string; webhook_url?: string };
  onConfigChange: (config: { hash?: string; webhook_url?: string }) => void;
  readOnly?: boolean;
  workflowId?: string;
  workflow?: any;
}

// Webhook trigger config component
export const WebhookTriggerConfigComponent: FC<WebhookTriggerConfigProps> = ({
  config,
  onConfigChange,
  readOnly = false,
  workflowId,
  workflow,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);
  const [localWebhookUrl, setLocalWebhookUrl] = useState<string>("");

  // Update local webhook URL when config changes
  // Also extract hash from webhook_url if hash is missing
  useEffect(() => {
    const url = config.webhook_url || (config.hash
      ? `${process.env.NEXT_PUBLIC_WORKFLOWS_WEBHOOK_URL || process.env.NEXT_PUBLIC_WORKFLOWS_URL}/api/v1/webhook/${config.hash}`
      : "");
    setLocalWebhookUrl(url);
    
    // If hash is missing but webhook_url exists, extract and set the hash
    // Only do this once to avoid infinite loops
    if (!config.hash && config.webhook_url && !readOnly) {
      const match = config.webhook_url.match(/\/webhook\/([a-f0-9\-]+)/);
      if (match && match[1]) {
        const extractedHash = match[1];
        console.log(
          `🔧 [Webhook Config] Extracting hash ${extractedHash} from webhook_url and updating config`
        );
        // Update config with extracted hash (this will trigger onConfigChange)
        const newConfig = { ...config, hash: extractedHash };
        onConfigChange(newConfig);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.hash, config.webhook_url, readOnly]);

  const handleChange = (key: string, value: any) => {
    if (readOnly) return;
    const newConfig = { ...config, [key]: value };
    console.log(
      `🔧 [Webhook Config] Updating config: key=${key}, value=${value}, newConfig=`,
      newConfig
    );
    onConfigChange(newConfig);
    // Immediately update local state for webhook_url to show it right away
    if (key === "webhook_url") {
      setLocalWebhookUrl(value);
    } else if (key === "hash" && !config.webhook_url) {
      // If hash changed but no webhook_url, reconstruct URL
      const url = `${process.env.NEXT_PUBLIC_WORKFLOWS_WEBHOOK_URL || process.env.NEXT_PUBLIC_WORKFLOWS_URL}/api/v1/webhook/${value}`;
      setLocalWebhookUrl(url);
    }
  };

  const generateWebhook = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      console.log("🔧 [Webhook Config] Attempting to generate webhook...");
      const result =
        await WorkflowService.refreshTriggerHash("trigger_webhook");
      console.log("🔧 [Webhook Config] Webhook generation result:", result);
      console.log(
        `🔧 [Webhook Config] Current config before update:`,
        config
      );
      // Update hash first
      handleChange("hash", result.trigger_hash);
      // Store the webhook_url from API response to use the correct URL
      // This ensures we use the backend's BASE_URL (which has the ngrok URL)
      if (result.webhook_url) {
        console.log(
          "🔧 [Webhook Config] Setting webhook_url from API:",
          result.webhook_url
        );
        handleChange("webhook_url", result.webhook_url);
      }
      console.log(
        `🔧 [Webhook Config] Config after webhook generation should have hash=${result.trigger_hash} and webhook_url=${result.webhook_url}`
      );
    } catch (error) {
      console.error("❌ [Webhook Config] Failed to generate webhook:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyWebhookUrl = () => {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const refreshWebhook = () => {
    if (isGenerating) return;
    setShowRefreshConfirm(true);
  };

  const confirmRefresh = async () => {
    setShowRefreshConfirm(false);
    await generateWebhook();
  };

  // Use local webhook URL state (which updates immediately) or fall back to constructing from config
  const webhookUrl = localWebhookUrl || config.webhook_url || (config.hash
    ? `${process.env.NEXT_PUBLIC_WORKFLOWS_WEBHOOK_URL || process.env.NEXT_PUBLIC_WORKFLOWS_URL}/api/v1/webhook/${config.hash}`
    : "");

  return (
    <div className="space-y-4">
      {/* Webhook Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Webhook Configuration</h3>
          {!config.hash && (
            <div className="flex items-center text-red-600 text-xs">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Required for trigger to work
            </div>
          )}
        </div>

        {!webhookUrl ? (
          <div className="p-3 border border-red-200 bg-red-50 rounded-md">
            <div className="flex items-center justify-between">
              <div className="text-sm text-red-800">
                Webhook not configured. Generate a webhook to enable this
                trigger.
              </div>
              <Button
                size="sm"
                onClick={generateWebhook}
                disabled={isGenerating || readOnly}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isGenerating ? "Generating..." : "Generate Webhook"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 border border-green-200 bg-green-50 rounded-md">
              <div className="flex items-center justify-between">
                <div className="text-sm text-green-800">
                  Webhook generated successfully
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={refreshWebhook}
                    disabled={isGenerating || readOnly}
                    className="text-green-700 border-green-300 hover:bg-green-100"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`}
                    />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyWebhookUrl}
                    className="text-green-700 border-green-300 hover:bg-green-100"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy URL
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-xs text-green-700 font-mono break-all">
                {webhookUrl}
              </div>
            </div>

            {/* Integration Instructions */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <WebhookIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Webhook Integration Steps
                  </span>
                  <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-md">
                    Important!
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Copy the webhook URL above</li>
                  <li>Use this URL in your external service or application</li>
                  <li>
                    Send POST requests to this URL with your desired payload
                  </li>
                  <li>
                    Set Content Type to{" "}
                    <span className="font-mono">application/json</span>
                  </li>
                  <li>The workflow will trigger when a request is received</li>
                  <li>
                    The request payload will be available as trigger data in
                    your workflow
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Refresh Confirmation Dialog */}
      <Dialog open={showRefreshConfirm} onOpenChange={setShowRefreshConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refresh Webhook URL</DialogTitle>
            <DialogDescription>
              {`Are you sure you want to refresh the webhook URL? The old URL will
              stop working and be deleted. You'll need to update your external
              service configuration with the new URL.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRefreshConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRefresh}
              disabled={isGenerating}
              className="bg-red-600 hover:bg-red-700"
            >
              {isGenerating ? "Refreshing..." : "Refresh Webhook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Webhook trigger metadata
export const webhookTriggerNodeMetadata = {
  type: "trigger_webhook" as NodeType,
  category: "trigger" as NodeCategory,
  group: "default" as NodeGroup,
  name: "Webhook Trigger",
  description: "Triggers when a webhook request is received",
  icon: WebhookIcon,
  configComponent: WebhookTriggerConfigComponent,
};

// Webhook trigger node component
export const WebhookTriggerNode: FC<{
  data: WorkflowNode & { data: { hash?: string; webhook_url?: string } };
}> = ({ data }) => {
  const colors = getNodeColors(data.group);
  // Get hash and webhook_url from data.data - this will update when config changes
  const { hash, webhook_url } = data.data || {};
  
  // Determine if webhook is generated (has hash or webhook_url)
  const isWebhookGenerated = !!(hash || webhook_url);

  return (
    <div className="w-full">
      <div
        className="p-3 border-b border-gray-200"
        style={{ backgroundColor: colors.secondary }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <WebhookIcon
              className="w-5 h-5 mr-2"
              style={{ color: "#374151" }}
            />
            <h3 className="font-semibold text-gray-700 flex items-center gap-1">
              Webhook Trigger
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-1 cursor-pointer">
                      <Info className="w-4 h-4 text-gray-600" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <span className="text-xs text-gray-700">
                      Triggers when a webhook request is received
                    </span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h3>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-2">
        {/* Webhook Status */}
        <div className="flex flex-col gap-1 mt-3">
          <div className="text-xs text-gray-500">Webhook Status</div>
          {!isWebhookGenerated ? (
            <div className="flex items-center text-red-600 text-sm">
              <AlertTriangle className="w-4 h-4 mr-1" />
              <span>Webhook not generated</span>
            </div>
          ) : (
            <div className="flex items-center text-green-600 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span>Webhook generated</span>
            </div>
          )}
        </div>
      </div>
      <SourceHandle />
    </div>
  );
};
