import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

// --- NEW TYPES BASED ON BACKEND DOCS ---
export interface Position {
  x: number;
  y: number;
}

export type NodeType =
  | "trigger_github_pr_opened"
  | "trigger_github_pr_closed"
  | "trigger_github_pr_reopened"
  | "trigger_github_pr_merged"
  | "trigger_github_issue_opened"
  | "trigger_linear_issue_created"
  | "custom_agent"
  | "flow_control_conditional"
  | "flow_control_collect"
  | "flow_control_selector"
  | "manual_step_approval"
  | "manual_step_input";

export type NodeGroup = "github" | "linear" | "default";
export type NodeCategory = "trigger" | "agent" | "flow_control" | "manual_step";

export interface WorkflowNode {
  id: string;
  type: NodeType;
  group: NodeGroup;
  category: NodeCategory;
  position: Position;
  data: Record<string, any>;
}

export interface CreateWorkflowRequest {
  title: string;
  description: string;
  nodes: Record<string, WorkflowNode>;
  adjacency_list?: Record<string, string[]>;
  variables?: Record<string, string>;
}

export interface WorkflowGraph {
  id: string;
  workflow_id: string;
  nodes: Record<string, WorkflowNode>;
  adjacency_list: Record<string, string[]>;
  created_at: string;
  updated_at: string;
}

export interface Workflow {
  id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_paused: boolean;
  version: string;
  graph: WorkflowGraph;
  variables: Record<string, string>;
}

// Execution types
export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: "running" | "completed" | "failed" | "cancelled";
  started_at: string;
  completed_at?: string;
  error_message?: string;
  trigger_data?: Record<string, any>;
  execution_logs?: ExecutionLog[];
}

export interface ExecutionLog {
  id: string;
  execution_id: string;
  node_id: string;
  node_type: string;
  status: "pending" | "running" | "completed" | "failed";
  started_at: string;
  completed_at?: string;
  error_message?: string;
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
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

      // Handle both response structures: direct workflow or nested in workflow property
      const createdWorkflow = response.data.workflow || response.data;
      return createdWorkflow;
    } catch (error) {
      console.error("Error creating workflow:", error);
      throw error;
    }
  }

  static async updateWorkflow(
    workflowId: string,
    workflow: CreateWorkflowRequest // Changed to CreateWorkflowRequest
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

  static async getWorkflowLogs(
    workflowId: string
  ): Promise<WorkflowExecution[]> {
    try {
      const headers = await getHeaders();
      const response = await axios.get(`${this.BASE_URL}/${workflowId}/logs`, {
        headers,
      });
      return response.data.executions;
    } catch (error) {
      console.error("Error fetching workflow logs:", error);
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

  /**
   * Refreshes the trigger hash for a given node type.
   * Deactivates any existing hash for the user and node type, and returns a new one.
   * Returns: { trigger_hash, node_type, created_at, webhook_url }
   */
  static async refreshTriggerHash(
    nodeType: string // e.g., "github", "linear", etc.
  ): Promise<{
    trigger_hash: string;
    node_type: string;
    created_at: string;
    webhook_url: string;
  }> {
    try {
      const headers = await getHeaders();
      const baseUrl = `${process.env.NEXT_PUBLIC_WORKFLOWS_URL}/api/v1/integrations`;

      const requestBody = {
        node_type: nodeType,
      };

      const response = await axios.put(`${baseUrl}/trigger-hash`, requestBody, {
        headers,
      });

      // Return the full response object as per the new API
      return response.data;
    } catch (error) {
      console.error("Error refreshing trigger hash:", error);
      throw error;
    }
  }
}
