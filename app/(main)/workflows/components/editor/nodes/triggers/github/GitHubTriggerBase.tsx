import { FC, useState } from "react";
import { RepoBranchSelector } from "./RepoBranchSelector";
import {
  Github,
  Info,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
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

// Common interface for all GitHub trigger configs
export interface GitHubTriggerConfigProps<T = any> {
  config: T;
  onConfigChange: (config: T) => void;
  readOnly?: boolean;
  workflowId?: string;
  workflow?: any;
}

// Common config component that all GitHub triggers use
function GitHubTriggerConfigComponentImpl<
  T extends { repo_name?: string; hash?: string; branch?: string } = any,
>({
  config,
  onConfigChange,
  readOnly = false,
  workflowId,
  workflow,
  nodeType,
}: GitHubTriggerConfigProps<T> & { nodeType: string }) {
  // Remove local webhookHash state and workflow?.webhook_hash usage
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);
  const [showRepoChangeConfirm, setShowRepoChangeConfirm] = useState(false);
  const [pendingRepoChange, setPendingRepoChange] = useState<string>("");

  const handleChange = (key: string, value: any) => {
    if (readOnly) return;
    onConfigChange({ ...config, [key]: value });
  };

  const handleRepoChange = (repo: string) => {
    if (readOnly) return;
    if (config.hash) {
      setPendingRepoChange(repo);
      setShowRepoChangeConfirm(true);
    } else {
      onConfigChange({
        ...config,
        repo_name: repo,
        branch: "",
      });
    }
  };

  const generateWebhook = async () => {
    if (!workflowId || isGenerating) return;
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
    if (!workflowId || isGenerating) return;
    setShowRefreshConfirm(true);
  };

  const confirmRefresh = async () => {
    setShowRefreshConfirm(false);
    await generateWebhook();
  };

  const confirmRepoChange = () => {
    setShowRepoChangeConfirm(false);
    // Change repo but keep the webhook hash
    onConfigChange({
      ...config,
      repo_name: pendingRepoChange,
      branch: "",
    });
    setPendingRepoChange("");
  };

  // Only use config.hash for the webhook URL
  const webhookUrl = config.hash
    ? `${process.env.NEXT_PUBLIC_WORKFLOWS_WEBHOOK_URL || process.env.NEXT_PUBLIC_WORKFLOWS_URL}/api/v1/webhook/${config.hash}`
    : "";

  return (
    <div className="space-y-4">
      <RepoBranchSelector
        repoName={config.repo_name || ""}
        branchName={config.branch || ""}
        onRepoChange={handleRepoChange}
        onBranchChange={(b) => {
          handleChange("branch", b);
        }}
        readOnly={readOnly}
        repoOnly={true}
      />

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
                  <Github className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    GitHub Integration Steps
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
                    Go to your repository settings{" "}
                    <a
                      href={`https://github.com/${config.repo_name}/settings/hooks/new`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-700"
                    >
                      here
                      <ExternalLink className="h-3 w-3" />
                    </a>{" "}
                    or navigate to your repo → Settings → Webhooks
                  </li>
                  <li>Add the webhook URL as the Payload URL</li>
                  <li>
                    Set Content Type to{" "}
                    <span className="font-mono">application/json</span>
                  </li>
                  <li>
                    Select appropriate events or choose &quot;Send me
                    everything&quot;
                  </li>
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
              stop working and be deleted. You'll need to update your GitHub
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

      {/* Repository Change Confirmation Dialog */}
      <Dialog
        open={showRepoChangeConfirm}
        onOpenChange={setShowRepoChangeConfirm}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Repository</DialogTitle>
            <DialogDescription>
              {`Changing the repository will keep your current webhook URL, but
              the webhook in the old repository will stop working. You'll need  
              to set up the same webhook URL in the new repository's settings.
              Are you sure you want to continue?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRepoChangeConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRepoChange}
              className="bg-red-600 hover:bg-red-700"
            >
              Change Repository
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Exported FC that injects nodeType from props (to be wrapped by each trigger)
export const GitHubTriggerConfigComponent: FC<
  GitHubTriggerConfigProps<any> & { nodeType: string }
> = (props) => {
  return GitHubTriggerConfigComponentImpl(props);
};

// Common metadata structure
export interface GitHubTriggerMetadata {
  type: NodeType;
  category: NodeCategory;
  group: NodeGroup;
  name: string;
  description: string;
  icon: any;
  configComponent: FC<GitHubTriggerConfigProps>;
}

// Factory function to create metadata
export const createGitHubTriggerMetadata = (
  type: NodeType,
  name: string,
  description: string
): GitHubTriggerMetadata => {
  // This wrapper satisfies the FC<GitHubTriggerConfigProps> type by accepting
  // the base props and injecting the required 'nodeType' for the specific trigger.
  const ConfigWrapper: FC<GitHubTriggerConfigProps> = (props) => (
    <GitHubTriggerConfigComponent {...props} nodeType={type} />
  );
  ConfigWrapper.displayName = "GitHubTriggerConfigWrapper";

  return {
    type,
    category: "trigger",
    group: "github",
    name,
    description,
    icon: Github,
    configComponent: ConfigWrapper,
  };
};

// Common node component that all GitHub triggers use
export const GitHubTriggerNode: FC<{
  data: WorkflowNode;
  metadata: GitHubTriggerMetadata;
}> = ({ data, metadata }) => {
  const colors = getNodeColors(data.group);
  const { repo_name, hash } = data.data || {};
  const { name: nodeName, description: nodeDescription } = metadata;

  return (
    <div className="w-full">
      <div
        className="p-3 border-b border-gray-200"
        style={{ backgroundColor: colors.secondary }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Github className="w-5 h-5 mr-2" style={{ color: "#fff" }} />
            <h3 className="font-semibold text-white flex items-center gap-1">
              {nodeName}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-1 cursor-pointer">
                      <Info className="w-4 h-4 text-gray-200" />
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
        <div className="flex flex-col gap-1 mt-2">
          <div className="text-xs text-gray-500">Repository</div>
          <div className="text-sm font-medium text-gray-800 break-all">
            {repo_name || (
              <span className="italic text-gray-400">No repo selected</span>
            )}
          </div>
        </div>

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
