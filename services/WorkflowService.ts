import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

export interface Workflow {
  title: string;
  description?: string;
  created_at: string;
  id: string;
  project_id: string;
  project_name: string;
}

const mockData = [
  {
    id: "1",
    title: "Workflow 1",
    description: "Description for Workflow 1",
    created_at: "2023-10-01T12:00:00Z",
    project_id: "project_1",
    project_name: "Project 1",
  },
  {
    id: "2",
    title: "Workflow 2",
    description: "Description for Workflow 1",
    created_at: "2023-10-02T12:00:00Z",
    project_id: "project_2",
    project_name: "Project 2",
  },
];

export default class WorkflowService {
  static async getWorkflowsList(): Promise<Workflow[]> {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return mockData;
    try {
      const headers = await getHeaders();
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/workflows`,
        {
          headers,
        }
      );
      return response.data.workflows;
    } catch (error) {
      console.log("Error fetching profile picture:", error);
    }
    return [];
  }

  static async getWorkflowById(
    workflowId: string
  ): Promise<Workflow | undefined> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return mockData[0];
    try {
      const headers = await getHeaders();
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/workflows/${workflowId}`,
        {
          headers,
        }
      );
      return response.data.workflow;
    } catch (error) {
      console.log("Error fetching profile picture:", error);
    }
    return;
  }
}
