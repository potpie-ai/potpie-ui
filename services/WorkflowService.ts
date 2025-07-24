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
  // Additional fields from the new API structure
  iteration?: number;
  logs?: Array<{
    status: string;
    timestamp: string;
    details: string;
  }>;
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
  private static readonly BASE_URL = `${process.env.NEXT_PUBLIC_WORKFLOWS_URL}/api/v1`;
  private static readonly WORKFLOWS_URL = `${this.BASE_URL}/workflows`;
  private static readonly EXECUTION_URL = `${this.BASE_URL}/execution`;

  // --- TRIGGER METHODS ---

  static async getAllTriggers(): Promise<Trigger[]> {
    try {
      const headers = await getHeaders();
      const response = await axios.get(`${this.BASE_URL}/triggers`, {
        headers,
      });
      return response.data.available_triggers;
    } catch (error) {
      console.error("Error fetching triggers:", error);
      throw error;
    }
  }

  // --- WORKFLOW MANAGEMENT METHODS ---

  static async getWorkflowsList(): Promise<Workflow[]> {
    try {
      const headers = await getHeaders();
      const response = await axios.get(this.WORKFLOWS_URL, { headers });
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
      const response = await axios.get(`${this.WORKFLOWS_URL}/${workflowId}`, {
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
      const response = await axios.post(this.WORKFLOWS_URL, workflow, {
        headers,
      });

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
    workflow: CreateWorkflowRequest
  ): Promise<Workflow | undefined> {
    try {
      const headers = await getHeaders();
      const response = await axios.put(
        `${this.WORKFLOWS_URL}/${workflowId}`,
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
      await axios.delete(`${this.WORKFLOWS_URL}/${workflowId}`, { headers });
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
        `${this.WORKFLOWS_URL}/triggers/${triggerId}`,
        { headers }
      );
      return response.data.workflows;
    } catch (error) {
      console.error("Error fetching workflows by trigger:", error);
      throw error;
    }
  }

  // --- EXECUTION MANAGEMENT METHODS ---

  /**
   * Get all executions for the authenticated user
   * @param workflowId Optional workflow ID to filter executions
   * @returns Promise<WorkflowExecution[]> Array of workflow executions
   */
  static async getAllExecutions(
    workflowId?: string
  ): Promise<WorkflowExecution[]> {
    try {
      const headers = await getHeaders();
      const url = workflowId
        ? `${this.EXECUTION_URL}/?workflow_id=${workflowId}`
        : this.EXECUTION_URL;

      const response = await axios.get(url, { headers });
      console.log("API Response:", response.data);
      console.log("Executions array:", response.data.executions);

      // Map the API response to our expected interface structure
      const mappedExecutions: WorkflowExecution[] =
        response.data.executions.map((execution: any) => ({
          id: execution.wf_exec_id,
          workflow_id: execution.wf_id,
          status: execution.status,
          started_at: execution.start_time,
          completed_at: execution.end_time,
          error_message: execution.error_message,
          trigger_data: execution.event,
          execution_logs:
            execution.node_executions?.map((nodeExec: any) => ({
              id: nodeExec.node_exec_id || `node-${Math.random()}`,
              execution_id: execution.wf_exec_id,
              node_id: nodeExec.node_id || "unknown",
              node_type: nodeExec.node_id?.split("_")[0] || "unknown", // Extract type from node_id
              status: nodeExec.status || "unknown",
              started_at: nodeExec.start_time || execution.start_time,
              completed_at: nodeExec.end_time,
              error_message:
                nodeExec.logs?.find((log: any) => log.status === "failed")
                  ?.details || null,
              input_data: nodeExec.input_data,
              output_data: nodeExec.output_data,
              // Add additional fields from the new API structure
              iteration: nodeExec.iteration,
              logs: nodeExec.logs || [],
            })) || [],
        }));

      return mappedExecutions;
    } catch (error) {
      console.error("Error fetching executions:", error);
      throw error;
    }
  }

  /**
   * Get detailed logs for a specific execution
   * @param executionId The ID of the execution to get logs for
   * @returns Promise<WorkflowExecution> Detailed execution with logs
   */
  static async getExecutionLogs(
    executionId: string
  ): Promise<WorkflowExecution> {
    try {
      const headers = await getHeaders();
      const response = await axios.get(
        `${this.EXECUTION_URL}/logs?execution_id=${executionId}`,
        {
          headers,
        }
      );

      const execution = response.data.execution;

      // Map the API response to our expected interface structure
      const mappedExecution: WorkflowExecution = {
        id: execution.wf_exec_id,
        workflow_id: execution.wf_id,
        status: execution.status,
        started_at: execution.start_time,
        completed_at: execution.end_time,
        error_message: execution.error_message,
        trigger_data: execution.event,
        execution_logs:
          execution.node_executions?.map((nodeExec: any) => ({
            id: nodeExec.id || `node-${Math.random()}`,
            execution_id: execution.wf_exec_id,
            node_id: nodeExec.node_id || "unknown",
            node_type: nodeExec.node_type || "unknown",
            status: nodeExec.status || "unknown",
            started_at: nodeExec.start_time || execution.start_time,
            completed_at: nodeExec.end_time,
            error_message: nodeExec.error_message,
            input_data: nodeExec.input_data,
            output_data: nodeExec.output_data,
          })) || [],
      };

      return mappedExecution;
    } catch (error) {
      console.error("Error fetching execution logs:", error);
      throw error;
    }
  }

  /**
   * Get executions for a specific workflow
   * @param workflowId The ID of the workflow to get executions for
   * @returns Promise<WorkflowExecution[]> Array of workflow executions
   */
  static async getWorkflowExecutions(
    workflowId: string
  ): Promise<WorkflowExecution[]> {
    try {
      return await this.getAllExecutions(workflowId);
    } catch (error) {
      console.error("Error fetching workflow executions:", error);
      throw error;
    }
  }

  // --- WORKFLOW CONTROL METHODS ---

  static async pauseWorkflow(workflowId: string): Promise<void> {
    try {
      const headers = await getHeaders();
      await axios.post(
        `${this.WORKFLOWS_URL}/${workflowId}/pause`,
        {},
        { headers }
      );
    } catch (error) {
      console.error("Error pausing workflow:", error);
      throw error;
    }
  }

  static async resumeWorkflow(workflowId: string): Promise<void> {
    try {
      const headers = await getHeaders();
      await axios.post(
        `${this.WORKFLOWS_URL}/${workflowId}/resume`,
        {},
        { headers }
      );
    } catch (error) {
      console.error("Error resuming workflow:", error);
      throw error;
    }
  }

  // --- INTEGRATION METHODS ---

  /**
   * Refreshes the trigger hash for a given node type.
   * Deactivates any existing hash for the user and node type, and returns a new one.
   * @param nodeType The node type (e.g., "github", "linear", etc.)
   * @returns Promise with trigger hash details
   */
  static async refreshTriggerHash(nodeType: string): Promise<{
    trigger_hash: string;
    node_type: string;
    created_at: string;
    webhook_url: string;
  }> {
    try {
      const headers = await getHeaders();
      const baseUrl = `${this.BASE_URL}/integrations`;

      const requestBody = {
        node_type: nodeType,
      };

      const response = await axios.put(`${baseUrl}/trigger-hash`, requestBody, {
        headers,
      });

      return response.data;
    } catch (error) {
      console.error("Error refreshing trigger hash:", error);
      throw error;
    }
  }
}
