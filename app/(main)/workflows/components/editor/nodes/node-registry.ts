import { NodeType, NodeCategory, NodeGroup } from "@/services/WorkflowService";
import { githubTriggerNodeMetadata } from "./triggers/github/github-trigger";
import { agentNodeMetadata } from "./agents/agent";
import { flowControlNodeMetadata } from "./flow-controls/flow-control";
import { linearTriggerNodeMetadata } from "./triggers/linear/linear-trigger";

export interface NodeInfo {
  type: NodeType;
  category: NodeCategory;
  group: NodeGroup;
  name: string;
  description: string;
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  configComponent?: React.ComponentType<{
    config: any;
    onConfigChange: (config: any) => void;
  }>;
}

// Registry of all available nodes
export const availableNodes: NodeInfo[] = [
  githubTriggerNodeMetadata,
  linearTriggerNodeMetadata,
  agentNodeMetadata,
  flowControlNodeMetadata,
];

// Export individual metadata for direct access if needed
export {
  githubTriggerNodeMetadata,
  linearTriggerNodeMetadata,
  agentNodeMetadata,
  flowControlNodeMetadata,
};
