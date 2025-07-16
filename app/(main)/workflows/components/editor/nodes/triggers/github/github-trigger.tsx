import {
  Node,
  NodeCategory,
  NodeType,
  NodeGroup,
} from "@/services/WorkflowService";
import { getNodeColors } from "../../color_utils";
import { AlertTriangle, CircleDot, GitPullRequest } from "lucide-react";
import { SourceHandle } from "../../../handles";
import { FC } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface GitHubTriggerConfigProps {
  config: any;
  onConfigChange: (config: any) => void;
}

export const GitHubTriggerConfigComponent: FC<GitHubTriggerConfigProps> = ({
  config,
  onConfigChange,
}) => {
  const handleChange = (key: string, value: any) => {
    onConfigChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="trigger-name">Trigger Name</Label>
        <Input
          id="trigger-name"
          value={config.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Enter trigger name"
        />
      </div>

      <div>
        <Label htmlFor="trigger-description">Description</Label>
        <Textarea
          id="trigger-description"
          value={config.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Enter trigger description"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="repository">Repository</Label>
        <Input
          id="repository"
          value={config.repository || ""}
          onChange={(e) => handleChange("repository", e.target.value)}
          placeholder="owner/repo (e.g., octocat/Hello-World)"
        />
      </div>

      <div>
        <Label htmlFor="branch">Branch</Label>
        <Input
          id="branch"
          value={config.branch || "main"}
          onChange={(e) => handleChange("branch", e.target.value)}
          placeholder="main"
        />
      </div>

      <div>
        <Label htmlFor="event-type">Event Type</Label>
        <Select
          value={config.eventType || "pull_request"}
          onValueChange={(value) => handleChange("eventType", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select event type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pull_request">Pull Request</SelectItem>
            <SelectItem value="push">Push</SelectItem>
            <SelectItem value="issue">Issue</SelectItem>
            <SelectItem value="release">Release</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="include-draft"
          checked={config.includeDraft || false}
          onCheckedChange={(checked) => handleChange("includeDraft", checked)}
        />
        <Label htmlFor="include-draft">Include Draft PRs</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="auto-merge"
          checked={config.autoMerge || false}
          onCheckedChange={(checked) => handleChange("autoMerge", checked)}
        />
        <Label htmlFor="auto-merge">Auto-merge on success</Label>
      </div>
    </div>
  );
};

// Node metadata for the palette
export const githubTriggerNodeMetadata = {
  type: NodeType.TRIGGER_GITHUB_PR_OPENED,
  category: NodeCategory.TRIGGER,
  group: NodeGroup.GITHUB,
  name: "GitHub PR Opened",
  description: "Triggers when a pull request is opened in GitHub",
  icon: GitPullRequest,
  configComponent: GitHubTriggerConfigComponent,
};

export const GitHubTriggerNode = ({ data }: { data: Node }) => {
  const colors = getNodeColors(data.group);
  return (
    <div className="w-full">
      <div
        className="p-3 border-b border-gray-200"
        style={{ backgroundColor: colors.secondary }}
      >
        <div className="flex items-center">
          <AlertTriangle
            className="w-5 h-5 mr-2"
            style={{ color: colors.primary }}
          />
          <h3 className="font-semibold text-gray-800">GitHub Trigger</h3>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center bg-orange-50 rounded-md p-2">
          <CircleDot className="w-3 h-3 text-orange-500 mr-2" />
          <span className="text-sm text-gray-700">{data.type}</span>
        </div>
      </div>
      <SourceHandle />
    </div>
  );
};
