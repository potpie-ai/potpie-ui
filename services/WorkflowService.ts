import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

export enum NodeType {
  TRIGGER_GITHUB_PR_OPENED = "trigger_github_pr_opened",
  TRIGGER_LINEAR_ISSUE_CREATED = "trigger_linear_issue_created",
  CUSTOM_AGENT = "custom_agent",
  FLOW_CONTROL_CONDITIONAL = "flow_control_conditional",
}

export enum NodeGroup {
  GITHUB = "github",
  LINEAR = "linear",
  DEFAULT = "default",
}

export enum NodeCategory {
  TRIGGER = "trigger",
  AGENT = "agent",
  FLOW_CONTROL = "flow_control",
}

export interface Node {
  id: string;
  category: NodeCategory;
  type: NodeType; // github_pr_opened, linear_issue_created
  group: NodeGroup; // github, linear, agent, task
  position: { x: number; y: number };
  data: any;
  isNewlyDropped?: boolean; // Flag for drop animation
}

export interface Graph {
  nodes: { [key: string]: Node }; // key is the node id, value is the node

  // key is the node id, value is the list of node_ids that are connected to the key node
  adjacency_list: { [key: string]: string[] };
}

export interface Workflow {
  id: string;
  title: string;
  description: string;
  repo_name: string;
  branch: string;
  agent_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  triggers: string[];
  hash: string;
  task: string;
  is_paused: boolean;
  graph: Graph;
}

export interface CreateWorkflowRequest {
  title: string;
  description: string;
  repo_name: string;
  branch: string;
  agent_id: string;
  triggers: string[];
  task: string;
}

export interface UpdateWorkflowRequest {
  title: string;
  description: string;
  repo_name: string;
  branch: string;
  agent_id: string;
  triggers: string[];
  task: string;
}

// Enum for trigger groups
export enum TriggerGroup {
  GITHUB = "github",
  LINEAR = "linear",
}

// Enum for permissions
export enum Permission {
  READ_GITHUB = "read_github",
  WRITE_GITHUB = "write_github",
  WRITE_LINEAR = "write_linear",
}

// Interface for triggers
export interface Trigger {
  id: string;
  name: string;
  description: string;
  group: TriggerGroup;
  required_permissions: Permission[];
}

export default class WorkflowService {
  static async getAllTriggers(): Promise<Trigger[]> {
    try {
      const headers = await getHeaders();
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_WORKFLOWS_URL}/api/v1/triggers`,
        {
          headers,
        }
      );
      return response.data.available_triggers;
    } catch (error) {
      console.error("Error fetching triggers:", error);
      throw error;
    }
  }

  private static readonly BASE_URL = `${process.env.NEXT_PUBLIC_WORKFLOWS_URL}/api/v1/workflows`;

  static async getWorkflowsList(): Promise<Workflow[]> {
    try {
      const headers = await getHeaders();
      const response = await axios.get(this.BASE_URL, { headers });
      return response.data.workflows;
    } catch (error) {
      console.error("Error fetching workflows:", error);
      throw error;
    }
  }

  static async getWorkflowById(
    workflowId: string
  ): Promise<Workflow | undefined> {
    try {
      const headers = await getHeaders();
      const response = await axios.get(`${this.BASE_URL}/${workflowId}`, {
        headers,
      });
      return response.data.workflow;
    } catch (error) {
      console.error("Error fetching workflow:", error);
      throw error;
    }
  }

  static async createWorkflow(
    workflow: CreateWorkflowRequest
  ): Promise<Workflow | undefined> {
    try {
      const headers = await getHeaders();
      const response = await axios.post(this.BASE_URL, workflow, { headers });
      return response.data.workflow;
    } catch (error) {
      console.error("Error creating workflow:", error);
      throw error;
    }
  }

  static async updateWorkflow(
    workflowId: string,
    workflow: UpdateWorkflowRequest
  ): Promise<Workflow | undefined> {
    try {
      const headers = await getHeaders();
      const response = await axios.put(
        `${this.BASE_URL}/${workflowId}`,
        workflow,
        { headers }
      );
      return response.data.workflow;
    } catch (error) {
      console.error("Error updating workflow:", error);
      throw error;
    }
  }

  static async deleteWorkflow(workflowId: string): Promise<boolean> {
    try {
      const headers = await getHeaders();
      await axios.delete(`${this.BASE_URL}/${workflowId}`, { headers });
      return true;
    } catch (error) {
      console.error("Error deleting workflow:", error);
      throw error;
    }
  }

  static async getWorkflowsByTrigger(triggerId: string): Promise<Workflow[]> {
    try {
      const headers = await getHeaders();
      const response = await axios.get(
        `${this.BASE_URL}/triggers/${triggerId}`,
        { headers }
      );
      return response.data.workflows;
    } catch (error) {
      console.error("Error fetching workflows by trigger:", error);
      throw error;
    }
  }

  static async getWorkflowLogs(workflowId: string): Promise<Workflow[]> {
    try {
      const headers = await getHeaders();
      const response = await axios.get(`${this.BASE_URL}/${workflowId}/logs`, {
        headers,
      });
      return response.data.executions;
    } catch (error) {
      console.error("Error fetching workflows logs:", error);
      throw error;
    }
  }

  static async pauseWorkflow(workflowId: string): Promise<any> {
    try {
      const headers = await getHeaders();
      const response = await axios.post(
        `${this.BASE_URL}/${workflowId}/pause`,
        {},
        {
          headers,
        }
      );
      return;
    } catch (error) {
      console.error("Error pausing workflow:", error);
      throw error;
    }
  }

  static async resumeWorkflow(workflowId: string): Promise<any> {
    try {
      const headers = await getHeaders();
      const response = await axios.post(
        `${this.BASE_URL}/${workflowId}/resume`,
        {},
        {
          headers,
        }
      );
      return;
    } catch (error) {
      console.error("Error resuming workflow:", error);
      throw error;
    }
  }
}
