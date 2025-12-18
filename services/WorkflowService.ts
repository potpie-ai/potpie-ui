import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { parseApiError } from "@/lib/utils";

// Helper function to convert camelCase fields to snake_case and prioritize snake_case
const normalizeWorkflowData = (data: any): any => {
  if (!data || typeof data !== "object") return data;

  const normalized: any = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip if we already have the snake_case version
    const snakeCaseKey = key.replace(
      /[A-Z]/g,
      (letter) => `_${letter.toLowerCase()}`
    );

    if (key === snakeCaseKey) {
      // Already snake_case, keep as is
      normalized[key] = value;
    } else if (data[snakeCaseKey] !== undefined) {
      // We have both camelCase and snake_case, prioritize snake_case
      normalized[snakeCaseKey] = data[snakeCaseKey];
    } else {
      // Only have camelCase, convert to snake_case
      normalized[snakeCaseKey] = value;
    }
  }

  return normalized;
};

// Helper function to clean up agent node data specifically
const cleanAgentNodeData = (nodeData: any): any => {
  if (!nodeData || typeof nodeData !== "object") return nodeData;

  const cleaned: any = {};

  // Map of camelCase to snake_case for agent fields
  const fieldMappings = {
    agentId: "agent_id",
    agentName: "name",
    repoName: "repo_name",
    branchName: "branch_name",
    useCurrentBranch: "use_current_branch",
  };

  for (const [key, value] of Object.entries(nodeData)) {
    if (fieldMappings[key as keyof typeof fieldMappings]) {
      // Convert camelCase to snake_case
      const snakeCaseKey = fieldMappings[key as keyof typeof fieldMappings];
      cleaned[snakeCaseKey] = value;
    } else {
      // Keep other fields as is
      cleaned[key] = value;
    }
  }

  return cleaned;
};

// --- NEW TYPES BASED ON BACKEND DOCS ---
export interface Position {
  x: number;
  y: number;
}

export interface WorkflowValidation {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface WorkflowResponse {
  workflow: Workflow;
  validation: WorkflowValidation;
}

export type NodeType =
  | "trigger_github_pr_opened"
  | "trigger_github_pr_closed"
  | "trigger_github_pr_reopened"
  | "trigger_github_pr_merged"
  | "trigger_github_issue_opened"
  | "trigger_linear_issue_created"
  | "trigger_sentry_issue_created"
  | "trigger_webhook"
  | "custom_agent"
  | "action_agent"
  | "flow_control_conditional"
  | "flow_control_collect"
  | "flow_control_selector"
  | "manual_step_approval"
  | "manual_step_input";

export type NodeGroup = "github" | "linear" | "sentry" | "default";
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
  validation?: WorkflowValidation;
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
  // New field for predecessor relationship
  predecessor_node_id?: string;
}

// New interfaces for execution trees
export interface ExecutionTreeNode {
  node_id: string;
  predecessor: string | null;
  children: string[];
  status: "pending" | "running" | "completed" | "failed";
  start_time: string;
  end_time?: string;
  iteration: number;
  logs: Array<{
    status: string;
    timestamp: string;
    details: string;
  }>;
}

export interface ExecutionTree {
  execution_tree: Record<string, ExecutionTreeNode>;
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

// HITL types (stub - not used in SSO PR)
// TODO: Remove when HITL functionality is implemented
export interface HITLRequest {
  request_id: string;
  execution_id: string;
  node_id: string;
  node_type: string;
  message: string;
  status: string;
  time_remaining_seconds?: number;
  iteration?: number;
  loop_back_node_id?: string;
  fields?: Array<{
    name: string;
    type: string;
    required?: boolean;
    options?: string[];
  }>;
  [key: string]: any; // Allow additional properties for pre-existing code
}

export interface HITLResponseRequest {
  request_id?: string;
  response?: string;
  approved?: boolean;
  response_data?: Record<string, any>;
  comment?: string;
  [key: string]: any; // Allow additional properties for pre-existing code
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
    } catch (error: any) {
      console.error("Error fetching triggers:", error);
      const errorMessage = parseApiError(error);

      // toast.error("Failed to fetch triggers", {
      //   description: errorMessage,
      //   duration: 3000,
      // });

      throw error;
    }
  }

  // --- WORKFLOW MANAGEMENT METHODS ---

  static async getWorkflowsList(): Promise<Workflow[]> {
    try {
      const headers = await getHeaders();
      const response = await axios.get(this.WORKFLOWS_URL, { headers });
      return response.data.workflows;
    } catch (error: any) {
      console.error("Error fetching workflows:", error);
      const errorMessage = parseApiError(error);

      // toast.error("Failed to fetch workflows", {
      //   description: errorMessage,
      //   duration: 3000,
      // });

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

      // Handle both old and new response formats
      const workflow = response.data.workflow || response.data;

      // Normalize the workflow data to prioritize snake_case fields
      const normalizedWorkflow = {
        ...workflow,
        graph: {
          ...workflow.graph,
          nodes: Object.fromEntries(
            Object.entries(workflow.graph.nodes || {}).map(
              ([nodeId, node]: [string, any]) => [
                nodeId,
                {
                  ...node,
                  data:
                    node.type === "custom_agent"
                      ? cleanAgentNodeData(node.data)
                      : normalizeWorkflowData(node.data),
                },
              ]
            )
          ),
        },
      };

      // If the response includes validation data, use it
      if (response.data.validation) {
        normalizedWorkflow.validation = response.data.validation;
      }

      return normalizedWorkflow;
    } catch (error: any) {
      console.error("Error fetching workflow:", error);
      const errorMessage = parseApiError(error);

      // toast.error("Failed to fetch workflow", {
      //   description: errorMessage,
      //   duration: 3000,
      // });

      throw error;
    }
  }

  static async createWorkflow(
    workflow: CreateWorkflowRequest
  ): Promise<WorkflowResponse> {
    try {
      const headers = await getHeaders();

      // Normalize the workflow data to prioritize snake_case fields
      const normalizedWorkflow = {
        ...workflow,
        nodes: Object.fromEntries(
          Object.entries(workflow.nodes).map(
            ([nodeId, node]: [string, WorkflowNode]) => [
              nodeId,
              {
                ...node,
                data:
                  node.type === "custom_agent"
                    ? cleanAgentNodeData(node.data)
                    : normalizeWorkflowData(node.data),
              },
            ]
          )
        ),
      };

      const response = await axios.post(
        this.WORKFLOWS_URL,
        normalizedWorkflow,
        {
          headers,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("Error creating workflow:", error);
      const errorMessage = parseApiError(error);

      // Don't show toast here - let the calling component handle error display
      throw error;
    }
  }

  static async updateWorkflow(
    workflowId: string,
    workflow: CreateWorkflowRequest
  ): Promise<WorkflowResponse> {
    try {
      const headers = await getHeaders();

      // Normalize the workflow data to prioritize snake_case fields
      const normalizedWorkflow = {
        ...workflow,
        nodes: Object.fromEntries(
          Object.entries(workflow.nodes).map(
            ([nodeId, node]: [string, WorkflowNode]) => [
              nodeId,
              {
                ...node,
                data:
                  node.type === "custom_agent"
                    ? cleanAgentNodeData(node.data)
                    : normalizeWorkflowData(node.data),
              },
            ]
          )
        ),
      };

      const response = await axios.put(
        `${this.WORKFLOWS_URL}/${workflowId}`,
        normalizedWorkflow,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error updating workflow:", error);
      const errorMessage = parseApiError(error);

      // Don't show toast here - let the calling component handle error display
      throw error;
    }
  }

  static async deleteWorkflow(workflowId: string): Promise<boolean> {
    try {
      const headers = await getHeaders();
      await axios.delete(`${this.WORKFLOWS_URL}/${workflowId}`, { headers });
      return true;
    } catch (error: any) {
      console.error("Error deleting workflow:", error);
      const errorMessage = parseApiError(error);

      // toast.error("Failed to delete workflow", {
      //   description: errorMessage,
      //   duration: 3000,
      // });

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
    } catch (error: any) {
      console.error("Error fetching workflows by trigger:", error);
      const errorMessage = parseApiError(error);

      // toast.error("Failed to fetch workflows by trigger", {
      //   description: errorMessage,
      //   duration: 3000,
      // });

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

      if (!workflowId) {
        // If no workflowId provided, use the general execution endpoint
        const response = await axios.get(this.EXECUTION_URL, { headers });
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
                predecessor_node_id: nodeExec.predecessor_node_id,
              })) || [],
          }));

        return mappedExecutions;
      } else {
        // Use the new workflow logs endpoint for specific workflow
        const response = await axios.get(
          `${this.WORKFLOWS_URL}/${workflowId}/logs`,
          { headers }
        );
        console.log("Workflow Logs API Response:", response.data);
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
                predecessor_node_id: nodeExec.predecessor_node_id,
              })) || [],
          }));

        return mappedExecutions;
      }
    } catch (error: any) {
      console.error("Error fetching executions:", error);
      const errorMessage = parseApiError(error);

      // toast.error("Failed to fetch executions", {
      //   description: errorMessage,
      //   duration: 3000,
      // });

      throw error;
    }
  }

  /**
   * Get execution tree for a specific execution
   * @param workflowId The ID of the workflow
   * @param executionId The ID of the execution to get tree for
   * @returns Promise<ExecutionTree> Execution tree structure
   */
  static async getExecutionTree(
    workflowId: string,
    executionId: string
  ): Promise<ExecutionTree> {
    try {
      const headers = await getHeaders();
      const response = await axios.get(
        `${this.WORKFLOWS_URL}/${workflowId}/logs/${executionId}/tree`,
        {
          headers,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("Error fetching execution tree:", error);
      const errorMessage = parseApiError(error);

      // toast.error("Failed to fetch execution tree", {
      //   description: errorMessage,
      //   duration: 3000,
      // });

      throw error;
    }
  }

  /**
   * Get detailed logs for a specific execution (legacy method - now returns tree)
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
            predecessor_node_id: nodeExec.predecessor_node_id,
          })) || [],
      };

      return mappedExecution;
    } catch (error: any) {
      console.error("Error fetching execution logs:", error);
      const errorMessage = parseApiError(error);

      // toast.error("Failed to fetch execution logs", {
      //   description: errorMessage,
      //   duration: 3000,
      // });

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
      // Use the new workflow logs endpoint which doesn't include execution trees
      return await this.getAllExecutions(workflowId);
    } catch (error) {
      console.error("Error fetching workflow executions:", error);
      throw error;
    }
  }

  /**
   * Get executions for a specific workflow with their execution trees
   * @param workflowId The ID of the workflow to get executions for
   * @returns Promise<Array<{execution: WorkflowExecution, tree: ExecutionTree}>> Array of executions with their trees
   */
  static async getWorkflowExecutionsWithTrees(
    workflowId: string
  ): Promise<Array<{ execution: WorkflowExecution; tree: ExecutionTree }>> {
    try {
      // First get all executions
      const executions = await this.getWorkflowExecutions(workflowId);

      // Then get the tree for each execution
      const executionsWithTrees = await Promise.all(
        executions.map(async (execution) => {
          try {
            const tree = await this.getExecutionTree(workflowId, execution.id);
            return { execution, tree };
          } catch (error) {
            console.error(
              `Error fetching tree for execution ${execution.id}:`,
              error
            );
            // Return execution without tree if tree fetch fails
            return { execution, tree: { execution_tree: {} } };
          }
        })
      );

      return executionsWithTrees;
    } catch (error: any) {
      console.error("Error fetching workflow executions with trees:", error);
      const errorMessage = parseApiError(error);

      // toast.error("Failed to fetch workflow executions", {
      //   description: errorMessage,
      //   duration: 3000,
      // });

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
    } catch (error: any) {
      console.error("Error pausing workflow:", error);
      const errorMessage = parseApiError(error);

      // toast.error("Failed to pause workflow", {
      //   description: errorMessage,
      //   duration: 3000,
      // });

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
    } catch (error: any) {
      console.error("Error resuming workflow:", error);
      const errorMessage = parseApiError(error);

      // toast.error("Failed to resume workflow", {
      //   description: errorMessage,
      //   duration: 3000,
      // });

      throw error;
    }
  }

  static async validateWorkflow(
    workflowId: string
  ): Promise<WorkflowValidation> {
    try {
      const headers = await getHeaders();
      const response = await axios.get(
        `${this.WORKFLOWS_URL}/${workflowId}/validate`,
        { headers }
      );
      return response.data.validation;
    } catch (error: any) {
      console.error("Error validating workflow:", error);
      const errorMessage = parseApiError(error);
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
    } catch (error: any) {
      console.error("Error refreshing trigger hash:", error);
      const errorMessage = parseApiError(error);

      // toast.error("Failed to refresh trigger hash", {
      //   description: errorMessage,
      //   duration: 3000,
      // });

      throw error;
    }
  }

  // HITL methods (stub - not used in SSO PR)
  // TODO: Implement when HITL functionality is added
  static async listHITLRequests(
    executionId?: string,
    page?: number,
    pageSize?: number
  ): Promise<{
    requests: HITLRequest[];
    total?: number;
    total_pages?: number;
    has_next?: boolean;
    has_previous?: boolean;
  }> {
    // Stub implementation - returns empty array
    return { requests: [], total: 0, total_pages: 0, has_next: false, has_previous: false };
  }

  static async getHITLRequest(
    executionId: string | number | undefined,
    nodeId: string | number | undefined,
    iteration?: number
  ): Promise<HITLRequest> {
    // Stub implementation - throws error
    throw new Error("HITL functionality not implemented");
  }

  static async deleteHITLRequest(requestId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    // Stub implementation
    throw new Error("HITL functionality not implemented");
  }

  static async submitHITLResponse(
    requestId: string,
    executionId: string | number | undefined,
    nodeId: string | number | undefined,
    response: HITLResponseRequest,
    iteration?: number
  ): Promise<any> {
    // Stub implementation
    throw new Error("HITL functionality not implemented");
  }
}
