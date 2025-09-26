import { FC, useState } from "react";
import {
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Info,
} from "lucide-react";
import {
  WorkflowNode,
  NodeCategory,
  NodeType,
  NodeGroup,
} from "@/services/WorkflowService";
import WorkflowService from "@/services/WorkflowService";
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

// Sentry icon component
const SentryIcon = ({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    className={className}
    style={style}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
    <path d="M12 6c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 10c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z" />
    <path d="M12 8c-2.209 0-4 1.791-4 4s1.791 4 4 4 4-1.791 4-4-1.791-4-4-4zm0 6c-1.105 0-2-.895-2-2s.895-2 2-2 2 .895 2 2-.895 2-2 2z" />
  </svg>
);

// Common interface for all Sentry trigger configs
export interface SentryTriggerConfigProps<T = any> {
  config: T;
  onConfigChange: (config: T) => void;
  readOnly?: boolean;
  workflowId?: string;
  workflow?: any;
}

// Common config component that all Sentry triggers use
function SentryTriggerConfigComponentImpl<T extends { hash?: string } = any>({
  config,
  onConfigChange,
  readOnly = false,
  workflowId,
  workflow,
  nodeType,
}: SentryTriggerConfigProps<T> & { nodeType: string }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);

  const handleChange = (key: string, value: any) => {
    if (readOnly) return;
    onConfigChange({ ...config, [key]: value });
  };

  const generateWebhook = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const result = await WorkflowService.refreshTriggerHash(nodeType);
      handleChange("hash", result.trigger_hash);
    } catch (error) {
      console.error("Failed to generate webhook:", error);
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

  // Only use config.hash for the webhook URL
  const webhookUrl = config.hash
    ? `${process.env.NEXT_PUBLIC_WORKFLOWS_WEBHOOK_URL || process.env.NEXT_PUBLIC_WORKFLOWS_URL}/api/v1/webhook/${config.hash}`
    : "";

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
                  <SentryIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Sentry Integration Steps
                  </span>
                  <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-md">
                    Important!
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Copy the webhook URL above</li>
                  <li>
                    Go to your Sentry project settings{" "}
                    <a
                      href="https://sentry.io/settings/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-700"
                    >
                      here
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>Navigate to Integrations → Webhooks</li>
                  <li>Add the webhook URL as the Payload URL</li>
                  <li>
                    Set Content Type to{" "}
                    <span className="font-mono">application/json</span>
                  </li>
                  <li>Select the events you want to trigger on</li>
                  <li>Save the webhook</li>
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
              stop working and be deleted. You'll need to update your Sentry
              webhook configuration with the new URL.`}
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
}

// Exported FC that injects nodeType from props (to be wrapped by each trigger)
export const SentryTriggerConfigComponent: FC<
  SentryTriggerConfigProps<any> & { nodeType: string }
> = (props) => {
  return SentryTriggerConfigComponentImpl(props);
};

// Common metadata structure
export interface SentryTriggerMetadata {
  type: NodeType;
  category: NodeCategory;
  group: NodeGroup;
  name: string;
  description: string;
  icon: any;
  configComponent: FC<SentryTriggerConfigProps>;
}

// Factory function to create metadata
export const createSentryTriggerMetadata = (
  type: NodeType,
  name: string,
  description: string
): SentryTriggerMetadata => {
  // This wrapper satisfies the FC<SentryTriggerConfigProps> type by accepting
  // the base props and injecting the required 'nodeType' for the specific trigger.
  const ConfigWrapper: FC<SentryTriggerConfigProps> = (props) => (
    <SentryTriggerConfigComponent {...props} nodeType={type} />
  );
  ConfigWrapper.displayName = "SentryTriggerConfigWrapper";

  return {
    type,
    category: "trigger",
    group: "sentry",
    name,
    description,
    icon: SentryIcon,
    configComponent: ConfigWrapper,
  };
};

// Common node component that all Sentry triggers use
export const SentryTriggerNode: FC<{
  data: WorkflowNode;
  metadata: SentryTriggerMetadata;
}> = ({ data, metadata }) => {
  const colors = getNodeColors(data.group);
  const { hash } = data.data || {};
  const { name: nodeName, description: nodeDescription } = metadata;

  return (
    <div className="w-full">
      <div
        className="p-3 border-b border-gray-200"
        style={{ backgroundColor: colors.secondary }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <SentryIcon className="w-5 h-5 mr-2" style={{ color: "#374151" }} />
            <h3 className="font-semibold text-gray-700 flex items-center gap-1">
              {nodeName}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-1 cursor-pointer">
                      <Info className="w-4 h-4 text-gray-600" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <span className="text-xs text-gray-700">
                      {nodeDescription}
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
          {!hash ? (
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
