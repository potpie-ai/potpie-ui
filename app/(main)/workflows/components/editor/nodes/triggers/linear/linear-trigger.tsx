import { WorkflowNode } from "@/services/WorkflowService";
import { getNodeColors } from "../../color_utils";
import { AlertTriangle, CircleDot, MessageSquare } from "lucide-react";
import { SourceHandle } from "../../../handles";
import { FC } from "react";
import { Label } from "@/components/ui/label";
import { LinearIntegrationSelector } from "./LinearIntegrationSelector";

interface LinearTriggerConfigProps {
  config: any;
  onConfigChange: (config: any) => void;
  readOnly?: boolean;
  workflow?: any;
}

export const LinearTriggerConfigComponent: FC<LinearTriggerConfigProps> = ({
  config,
  onConfigChange,
  readOnly = false,
  workflow,
}) => {
  console.log("LinearTriggerConfigComponent render with config:", config);

  const handleChange = (key: string, value: any) => {
    if (readOnly) return;
    console.log("LinearTriggerConfigComponent handleChange:", key, value);
    onConfigChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="integration">Linear Integration</Label>
        <LinearIntegrationSelector
          selectedIntegrationId={
            config.integrationId || config.integration_id || ""
          }
          onIntegrationChange={(integrationId, uniqueIdentifier) => {
            console.log(
              "Linear trigger onIntegrationChange called with:",
              integrationId,
              uniqueIdentifier
            );
            const newConfig = { ...config, integrationId };
            if (uniqueIdentifier) {
              newConfig.uniqueIdentifier = uniqueIdentifier;
            }
            console.log("Linear trigger updating config to:", newConfig);
            onConfigChange(newConfig);
          }}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
};

// Node metadata for the palette
export const linearTriggerNodeMetadata = {
  type: "trigger_linear_issue_created",
  category: "trigger",
  group: "linear",
  name: "Linear Issue Created",
  description: "Triggers when an issue is created in Linear",
  icon: MessageSquare,
  configComponent: LinearTriggerConfigComponent,
};

export const LinearTriggerNode = ({ data }: { data: WorkflowNode }) => {
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
          <MessageSquare
            className="w-5 h-5 mr-2"
            style={{ color: colors.primary }}
          />
          <h3 className="font-semibold text-gray-800">Linear Issue Created</h3>
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
