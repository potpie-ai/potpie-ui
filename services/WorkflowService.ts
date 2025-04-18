import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

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
