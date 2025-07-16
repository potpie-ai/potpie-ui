import { Node, NodeCategory, NodeGroup, NodeType } from "./WorkflowService";

export interface GithubNode extends Node {
  type: NodeType.TRIGGER_GITHUB_PR_OPENED;
  group: NodeGroup.GITHUB;
  data: {
    repo_name: string;
    branch: string;
  };
}
