import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { parseApiError } from "@/lib/utils";
import {
  SubmitTaskSplittingRequest,
  SubmitTaskSplittingResponse,
  CreatePullRequestResponse,
  TaskSplittingStatusResponse,
  TaskSplittingItemsResponse,
} from "@/lib/types/spec";

export default class TaskSplittingService {
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_WORKFLOWS_URL;
  private static readonly API_BASE = `${this.BASE_URL}/codegen/task-splitting`;

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
      // Backend may return 409 with an existing task_splitting_id (idempotency).
      // Treat that as a successful "submission" so callers can proceed to polling.
      const status = error?.response?.status;
      const data = error?.response?.data;
      if (
        status === 409 &&
        data &&
        typeof data === "object" &&
        typeof data.task_splitting_id === "string"
      ) {
        return data as SubmitTaskSplittingResponse;
      }

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

  /**
   * User-triggered: create PR from completed codegen job
   */
  static async createPullRequest(
    taskSplittingId: string
  ): Promise<CreatePullRequestResponse> {
    try {
      const headers = await getHeaders();
      const response = await axios.post<CreatePullRequestResponse>(
        `${this.API_BASE}/${taskSplittingId}/create-pr`,
        {},
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error creating PR:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Connect to codegen SSE stream for real-time tool_call_start / tool_call_end / progress / end.
   * GET /codegen/task-splitting/{taskSplittingId}/stream
   */
  static connectCodegenStream(
    taskSplittingId: string,
    options: {
      cursor?: string | null;
      onEvent?: (eventType: string, data: Record<string, unknown>) => void;
      onError?: (error: string) => void;
      signal?: AbortSignal;
    }
  ): void {
    const url = `${this.API_BASE}/${taskSplittingId}/stream${options.cursor ? `?cursor=${encodeURIComponent(options.cursor)}` : ""}`;
    getHeaders()
      .then((headers) => {
        fetch(url, {
          method: "GET",
          headers: { ...headers, Accept: "text/event-stream" },
          credentials: "include",
          signal: options.signal,
        })
          .then(async (response) => {
            if (!response.ok) throw new Error(`Stream connect failed: ${response.status}`);
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader || !options.onEvent) return;
            let buffer = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n\n");
              buffer = lines.pop() || "";
              for (const block of lines) {
                if (!block.trim()) continue;
                let eventType = "message";
                let eventId: string | undefined;
                let data: Record<string, unknown> = {};
                for (const line of block.split("\n")) {
                  if (line.startsWith("event:")) eventType = line.replace(/^event:\s*/, "").trim();
                  if (line.startsWith("id:")) eventId = line.replace(/^id:\s*/, "").trim();
                  if (line.startsWith("data:")) {
                    try {
                      data = JSON.parse(line.replace(/^data:\s*/, "").trim()) as Record<string, unknown>;
                    } catch {
                      data = { raw: line.replace(/^data:\s*/, "").trim() };
                    }
                  }
                }
                if (eventId) data.eventId = eventId;
                options.onEvent?.(eventType, data);
                if (eventType === "end" || eventType === "error") return;
              }
            }
          })
          .catch((e) => options.onError?.(e instanceof Error ? e.message : String(e)));
      })
      .catch((e) => {
        options.onError?.(e instanceof Error ? e.message : String(e));
      });
  }

  /**
   * Retry a failed codegen job (manual retry)
   * @param taskSplittingId - Task splitting UUID
   * @returns Retry submission response
   */
  static async retryTaskSplitting(
    taskSplittingId: string
  ): Promise<{ task_splitting_id: string; status: string; message: string }> {
    try {
      const headers = await getHeaders();
      const response = await axios.post(
        `${this.API_BASE}/${taskSplittingId}/retry`,
        {},
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error retrying task splitting:", error);
      const errorMessage = parseApiError(error);
      throw new Error(errorMessage);
    }
  }
}

