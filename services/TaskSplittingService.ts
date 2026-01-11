import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { parseApiError } from "@/lib/utils";
import {
  SubmitTaskSplittingRequest,
  SubmitTaskSplittingResponse,
  TaskSplittingStatusResponse,
  TaskSplittingItemsResponse,
} from "@/lib/types/spec";

export default class TaskSplittingService {
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_WORKFLOWS_URL;
  private static readonly API_BASE = `${this.BASE_URL}/api/v1/recipe/task-splitting`;

  /**
   * Submit task splitting request
   * @param request - Task splitting request with plan_item_id
   * @returns Task splitting submission response with task_splitting_id
   */
  static async submitTaskSplitting(
    request: SubmitTaskSplittingRequest
  ): Promise<SubmitTaskSplittingResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.post<SubmitTaskSplittingResponse>(
        this.API_BASE,
        request,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error submitting task splitting:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get task splitting status by task_splitting_id
   * @param taskSplittingId - Task splitting UUID
   * @returns Current task splitting status
   */
  static async getTaskSplittingStatus(
    taskSplittingId: string
  ): Promise<TaskSplittingStatusResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<TaskSplittingStatusResponse>(
        `${this.API_BASE}/${taskSplittingId}/status`,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching task splitting status:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Fetch task splitting items (task DAG layers) with pagination
   * @param taskSplittingId - Task splitting UUID
   * @param start - Starting layer order (default: 0)
   * @param limit - Maximum layers to return (default: 10, max: 100)
   * @returns Task splitting items response with pagination info
   */
  static async getTaskSplittingItems(
    taskSplittingId: string,
    start: number = 0,
    limit: number = 10
  ): Promise<TaskSplittingItemsResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.get<TaskSplittingItemsResponse>(
        `${this.API_BASE}/${taskSplittingId}/items`,
        {
          headers,
          params: { start, limit },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching task splitting items:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }
}

