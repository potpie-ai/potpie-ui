import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { Visibility } from "@/lib/Constants";
import { SessionInfo, TaskStatus } from "@/lib/types/session";
import { isMultimodalEnabled } from "@/lib/utils";

/** Tool call from message history / stream API */
export interface ToolCall {
  call_id: string;
  event_type: "call" | "result" | "delegation_call" | "delegation_result" | "error";
  tool_name: string;
  tool_response: string;
  tool_call_details: {
    summary?: string;
    [key: string]: unknown;
  };
  stream_part?: string | null;
  is_complete: boolean;
}

/** Message shape returned by loadMessages (includes thinking & tool_calls) */
export interface LoadedMessage {
  id: string;
  text: string;
  sender: "user" | "agent";
  citations: string[];
  has_attachments: boolean;
  attachments: unknown[];
  tool_calls: ToolCall[] | null;
  thinking: string | null;
}

export default class ChatService {
  private static extractJsonObjects(input: string): {
    objects: string[];
    remaining: string;
  } {
    const objects: string[] = [];
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    let startIndex = -1;

    for (let i = 0; i < input.length; i++) {
      const char = input[i]!;

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        if (inString) {
          escapeNext = true;
        }
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === "{") {
        if (depth === 0) {
          startIndex = i;
        }
        depth++;
      } else if (char === "}") {
        if (depth === 0) continue;
        depth--;
        if (depth === 0 && startIndex !== -1) {
          objects.push(input.slice(startIndex, i + 1));
          startIndex = -1;
        }
      }
    }

    const remaining =
      depth > 0 && startIndex !== -1 ? input.slice(startIndex) : "";

    return { objects, remaining };
  }

  // Method for creating a chat with a shared agent
  static async createChat(params: {
    agent_id: string;
    repo_id: number;
    branch_id: string | number;
  }) {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL;
    try {
      // Prepare the request body
      const requestBody: any = {
        agent_id: params.agent_id,
        repo_id: params.repo_id,
      };

      // Add branch_id if it's a number, otherwise use branch_name
      if (typeof params.branch_id === "number") {
        requestBody.branch_id = params.branch_id;
      } else {
        requestBody.branch_name = params.branch_id;
      }

      const response = await axios.post(
        `${baseUrl}/api/v1/conversations`,
        requestBody,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error("Failed to create chat with the shared agent");
    }
  }

  static async detectActiveSession(
    conversationId: string
  ): Promise<SessionInfo | null> {
    try {
      const headers = await getHeaders();
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/active-session`,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No active session
      }
      throw error;
    }
  }

  static async checkBackgroundTaskStatus(
    conversationId: string
  ): Promise<TaskStatus> {
    try {
      const headers = await getHeaders();
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/task-status`,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      return { isActive: false, conversationId };
    }
  }

  static generateSessionId(
    conversationId: string,
    userId: string,
    prevHumanMessageId?: string
  ): string {
    // Format: conversation:{user_id}:{prev_human_message_id}
    const messageId = prevHumanMessageId || Date.now().toString();
    return `conversation:${userId}:${messageId}`;
  }

  static async resumeActiveSession(
    conversationId: string,
    sessionId: string,
    onMessageUpdate: (
      message: string,
      tool_calls: any[],
      citations: string[]
    ) => void
  ): Promise<{
    success: boolean;
    reason?: string;
    message?: string;
    citations?: string[];
  }> {
    try {
      const headers = await getHeaders();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/resume/${sessionId}`,
        {
          method: "POST",
          headers: headers as HeadersInit,
        }
      );

      if (response.status === 404) {
        // Session no longer exists or expired
        return { success: false, reason: "session_not_found" };
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response similar to streamMessage
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let currentMessage = "";
      let currentCitations: string[] = [];
      let currentToolCalls: any[] = [];
      let buffer = ""; // Buffer for incomplete JSON chunks

      if (reader) {
        const processJsonSegment = (jsonStr: string) => {
          if (!jsonStr) return;

          try {
            const data = JSON.parse(jsonStr);

            if (data.message !== undefined) {
              const messageWithEmojis = data.message.replace(
                /\\u[\dA-F]{4}/gi,
                (match: string) =>
                  String.fromCodePoint(parseInt(match.replace(/\\u/g, ""), 16))
              );
              currentMessage += messageWithEmojis;
              onMessageUpdate(
                currentMessage,
                currentToolCalls,
                currentCitations
              );
            }

            if (data.tool_calls !== undefined) {
              // DEBUG: Log raw tool calls from backend (resume)
              console.log(
                "[SubAgent Stream] Raw tool_calls received (resume):",
                {
                  count: data.tool_calls.length,
                  tool_calls: data.tool_calls,
                  full_data: data,
                }
              );

              currentToolCalls.push(...data.tool_calls);
              onMessageUpdate(
                currentMessage,
                currentToolCalls,
                currentCitations
              );
            }

            if (data.citations !== undefined) {
              currentCitations = data.citations;
              onMessageUpdate(
                currentMessage,
                currentToolCalls,
                currentCitations
              );
            }
          } catch (e) {
            // Try to recover by extracting multiple JSON objects
            const extracted = ChatService.extractJsonObjects(jsonStr);
            if (extracted.objects.length > 1) {
              extracted.objects.forEach(processJsonSegment);
              if (extracted.remaining.trim()) {
                console.warn(
                  "Residual data after recovering JSON chunk in resume:",
                  extracted.remaining
                );
              }
              return;
            }
            console.warn("Failed to parse JSON chunk in resume:", jsonStr, e);
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode chunk and add to buffer
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // Extract and process complete JSON objects from buffer
            const extracted = ChatService.extractJsonObjects(buffer);
            buffer = extracted.remaining;
            extracted.objects.forEach(processJsonSegment);
          }

          // Process any remaining complete JSON in buffer after stream ends
          const extracted = ChatService.extractJsonObjects(buffer);
          buffer = extracted.remaining;
          extracted.objects.forEach(processJsonSegment);

          if (buffer.trim()) {
            console.warn(
              "Unprocessed JSON buffer after resume stream end:",
              buffer
            );
          }
        } finally {
          reader.releaseLock();
        }
      }

      return {
        success: true,
        message: currentMessage,
        citations: currentCitations,
      };
    } catch (error) {
      console.error("Error resuming session:", error);
      return { success: false, reason: 'network_error' };
    }
  }

  static async resumeWithCursor(
    chatId: string,
    sessionId: string,
    cursor: string,
    onMessageUpdate: (
      message: string,
      tool_calls: any[],
      thinking?: string | null
    ) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    try {
      const headers = await getHeaders();

      // Build URL with cursor as query parameter
      const url = new URL(
        `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${chatId}/resume/${sessionId}`
      );
      if (cursor) {
        url.searchParams.set("cursor", cursor);
      }

      const response = await fetch(
        url.toString(),
        {
          method: "POST",
          headers: headers as HeadersInit,
          signal: abortSignal,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let currentMessage = "";
      let currentToolCalls: any[] = [];
      let currentThinking: string | null = null;
      let buffer = "";

      if (reader) {
        const processJsonSegment = (jsonStr: string) => {
          if (!jsonStr) return;

          try {
            const data = JSON.parse(jsonStr);

            if (data.message !== undefined) {
              const messageWithEmojis = data.message.replace(
                /\\u[\dA-F]{4}/gi,
                (match: string) =>
                  String.fromCodePoint(
                    parseInt(match.replace(/\\u/g, ""), 16)
                  )
              );
              currentMessage += messageWithEmojis;
              onMessageUpdate(currentMessage, currentToolCalls, currentThinking);
            }

            if (data.tool_calls !== undefined) {
              currentToolCalls.push(...data.tool_calls);
              onMessageUpdate(currentMessage, currentToolCalls, currentThinking);
            }

            if (data.thinking !== undefined) {
              currentThinking = data.thinking ?? null;
              onMessageUpdate(currentMessage, currentToolCalls, currentThinking);
            }
          } catch (e) {
            const extracted = ChatService.extractJsonObjects(jsonStr);
            if (extracted.objects.length > 1) {
              extracted.objects.forEach(processJsonSegment);
              if (extracted.remaining.trim()) {
                console.warn(
                  "Residual data after recovering JSON chunk in resumeWithCursor:",
                  extracted.remaining,
                );
              }
              return;
            }
            console.warn("Failed to parse JSON chunk in resumeWithCursor:", jsonStr, e);
          }
        };

        const cancelReader = () => {
          try {
            reader.cancel();
          } catch (e) {
            console.warn("Failed to cancel reader after abort:", e);
          }
        };

        if (abortSignal) {
          if (abortSignal.aborted) {
            cancelReader();
            throw new DOMException("Aborted", "AbortError");
          }
          abortSignal.addEventListener("abort", cancelReader, { once: true });
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const extracted = ChatService.extractJsonObjects(buffer);
            buffer = extracted.remaining;
            extracted.objects.forEach(processJsonSegment);
          }

          const extracted = ChatService.extractJsonObjects(buffer);
          buffer = extracted.remaining;
          extracted.objects.forEach(processJsonSegment);

          if (buffer.trim()) {
            console.warn("Unprocessed JSON buffer after resumeWithCursor stream end:", buffer);
          }
        } finally {
          reader.releaseLock();
          if (abortSignal) {
            abortSignal.removeEventListener("abort", cancelReader);
          }
        }
      }
    } catch (error) {
      if (
        abortSignal?.aborted ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        console.log("Resume with cursor aborted");
        return;
      }
      console.error("Error resuming with cursor:", error);
      throw error;
    }
  }

  static async streamMessage(
    conversationId: string,
    message: string,
    selectedNodes: any[],
    images: File[] = [],
    onMessageUpdate: (
      message: string,
      tool_calls: any[],
      citations: string[],
      thinking?: string | null
    ) => void,
    sessionId?: string, // New optional parameter
    abortSignal?: AbortSignal
  ): Promise<{ message: string; citations: string[]; sessionId: string }> {
    let currentSessionId = sessionId;

    // Check for existing active session if no sessionId provided
    if (!currentSessionId) {
      const activeSession = await this.detectActiveSession(conversationId);
      if (activeSession && activeSession.status === "active") {
        throw new Error(
          "Background task already active. Cannot start new stream."
        );
      }

      // Generate new session ID
      currentSessionId = this.generateSessionId(
        conversationId,
        "current_user_id",
        Date.now().toString()
      );
    }

    try {
      const headers = await getHeaders();
      const formData = new FormData();

      formData.append("content", message);
      formData.append("node_ids", JSON.stringify(selectedNodes));

      // Only process images if multimodal is enabled
      const enabledImages = isMultimodalEnabled() ? images : [];
      enabledImages.forEach((image, index) => {
        formData.append("images", image);
      });

      // Build URL with query parameters
      const url = new URL(
        `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/message`
      );
      url.searchParams.set("stream", "true");
      if (currentSessionId) {
        url.searchParams.set("session_id", currentSessionId);
      }

      const response = await this.streamWithRetry(
        url.toString(),
        {
          method: "POST",
          headers: headers as HeadersInit,
          body: formData,
        },
        onMessageUpdate,
        3, // max retries
        abortSignal
      );

      return {
        message: response.message,
        citations: response.citations,
        sessionId: currentSessionId,
      };
    } catch (error) {
      if (
        abortSignal?.aborted ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        return {
          message: "",
          citations: [],
          sessionId: currentSessionId!,
        };
      }
      console.error("Stream failed, attempting fallback polling:", error);

      // Fallback to polling if stream fails completely
      const fallbackResult = await this.pollForFinalMessage(conversationId);
      if (fallbackResult) {
        return { ...fallbackResult, sessionId: currentSessionId };
      }

      throw new Error("Stream failed and fallback polling unsuccessful");
    }
  }

  // New retry mechanism method
  static async streamWithRetry(
    url: string,
    options: RequestInit,
    onMessageUpdate: (
      message: string,
      tool_calls: any[],
      citations: string[],
      thinking?: string | null
    ) => void,
    maxRetries: number,
    abortSignal?: AbortSignal
  ): Promise<{ message: string; citations: string[] }> {
    let retries = 0;

    while (retries <= maxRetries) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: abortSignal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Process streaming response (existing logic from original streamMessage)
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let currentMessage = "";
        let currentCitations: string[] = [];
        let currentToolCalls: any[] = [];
        let currentThinking: string | null = null;
        let buffer = ""; // Buffer for incomplete JSON chunks

        const processJsonSegment = (jsonStr: string) => {
          if (!jsonStr) return;

          try {
            const data = JSON.parse(jsonStr);

            if (data.message !== undefined) {
              const messageWithEmojis = data.message.replace(
                /\\u[\dA-F]{4}/gi,
                (match: string) =>
                  String.fromCodePoint(parseInt(match.replace(/\\u/g, ""), 16))
              );
              currentMessage += messageWithEmojis;
              onMessageUpdate(
                currentMessage,
                currentToolCalls,
                currentCitations,
                currentThinking
              );
            }

            if (data.tool_calls !== undefined) {
              // DEBUG: Log raw tool calls from backend (streamMessage)
              console.log(
                "[SubAgent Stream] Raw tool_calls received (stream):",
                {
                  count: data.tool_calls.length,
                  tool_calls: data.tool_calls,
                  full_data: data,
                }
              );

              currentToolCalls.push(...data.tool_calls);
              onMessageUpdate(
                currentMessage,
                currentToolCalls,
                currentCitations,
                currentThinking
              );
            }

            if (data.citations !== undefined) {
              currentCitations = data.citations;
              onMessageUpdate(
                currentMessage,
                currentToolCalls,
                currentCitations,
                currentThinking
              );
            }

            if (data.thinking !== undefined) {
              currentThinking = data.thinking ?? null;
              onMessageUpdate(
                currentMessage,
                currentToolCalls,
                currentCitations,
                currentThinking
              );
            }
          } catch (e) {
            // Try to recover by extracting multiple JSON objects
            const extracted = ChatService.extractJsonObjects(jsonStr);
            if (extracted.objects.length > 1) {
              extracted.objects.forEach(processJsonSegment);
              if (extracted.remaining.trim()) {
                console.warn(
                  "Residual data after recovering JSON chunk:",
                  extracted.remaining
                );
              }
              return;
            }
            console.warn("Failed to parse JSON chunk:", jsonStr, e);
          }
        };

        if (reader) {
          const cancelReader = () => {
            try {
              reader.cancel();
            } catch (e) {
              console.warn("Failed to cancel reader after abort:", e);
            }
          };

          if (abortSignal) {
            if (abortSignal.aborted) {
              cancelReader();
              throw new DOMException("Aborted", "AbortError");
            }
            abortSignal.addEventListener("abort", cancelReader, { once: true });
          }

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;

              const extracted = ChatService.extractJsonObjects(buffer);
              buffer = extracted.remaining;
              extracted.objects.forEach(processJsonSegment);
            }

            const extracted = ChatService.extractJsonObjects(buffer);
            buffer = extracted.remaining;
            extracted.objects.forEach(processJsonSegment);

            if (buffer.trim()) {
              console.warn("Unprocessed JSON buffer after stream end:", buffer);
            }
          } finally {
            reader.releaseLock();
            if (abortSignal) {
              abortSignal.removeEventListener("abort", cancelReader);
            }
          }
        }

        return { message: currentMessage, citations: currentCitations };
      } catch (error) {
        if (
          abortSignal?.aborted ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          throw error;
        }
        retries++;
        if (retries > maxRetries) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, retries - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        console.warn(`Retry ${retries}/${maxRetries} after ${delay}ms delay`);
      }
    }

    throw new Error("Max retries exceeded");
  }

  static async pollForFinalMessage(
    conversationId: string,
    timeoutMs: number = 30000
  ): Promise<{ message: string; citations: string[] } | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Check if background task is still active
        const taskStatus = await this.checkBackgroundTaskStatus(conversationId);
        if (!taskStatus.isActive) {
          // Task completed, fetch latest messages
          const messages = await this.loadMessages(conversationId, 0, 1);
          if (messages.length > 0) {
            const latestMessage = messages[0];
            return {
              message: latestMessage.text,
              citations: latestMessage.citations || [],
            };
          }
        }

        // Wait 2 seconds before next poll
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error("Error polling for final message:", error);
      }
    }

    return null; // Timeout
  }

  static async loadMessages(
    conversationId: string,
    start: number,
    limit: number
  ): Promise<LoadedMessage[]> {
    const headers = await getHeaders();
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/messages`,
      {
        headers,
        params: { start, limit },
      }
    );

    return response.data.map(
      (message: {
        id: string;
        content: string;
        type: string;
        citations?: string[] | null;
        has_attachments?: boolean;
        attachments?: unknown[];
        tool_calls?: ToolCall[] | null;
        thinking?: string | null;
      }) => ({
        id: message.id,
        text: message.content ?? "",
        sender: message.type === "HUMAN" ? "user" : "agent",
        citations: message.citations ?? [],
        has_attachments: message.has_attachments ?? false,
        attachments: message.attachments ?? [],
        tool_calls: message.tool_calls ?? null,
        thinking: message.thinking ?? null,
      })
    );
  }

  static async loadConversationInfo(conversationId: string) {
    const headers = await getHeaders();

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/info`,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const { status, data } = error.response;

        if (status === 404) {
          return {
            type: "error",
            status,
            message: "Conversation not found",
            description: "The conversation does not exist or has been deleted.",
          };
        } else if (status === 401) {
          return {
            type: "error",
            status,
            message: "Unauthorized",
            description:
              "You do not have permission to access this conversation.",
          };
        } else if (status === 500) {
          return {
            type: "error",
            status,
            message: "Server Error",
            description:
              "There was a problem with the server. Please try again later.",
          };
        }

        return {
          type: "error",
          status,
          message: "error",
          description: data?.message ?? "Failed to load conversation info",
        };
      } else {
        return {
          type: "error",
          status: 500,
          message: "Network Error",
          description:
            "Failed to load conversation due to network or server issues.",
        };
      }
    }
  }
  static async regenerateMessage(
    conversationId: string,
    selectedNodes: any[],
    onMessageUpdate: (
      message: string,
      tool_calls: any[],
      citations: string[]
    ) => void
  ): Promise<{ message: string; citations: string[]; tool_calls: any[] }> {
    try {
      const headers = await getHeaders();

      // Build URL with query parameters
      const url = new URL(
        `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/regenerate`
      );
      url.searchParams.set("stream", "true");
      url.searchParams.set("background", "true");

      const response = await fetch(
        url.toString(),
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            node_ids: selectedNodes,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let currentMessage = "";
      let currentCitations: string[] = [];
      let currentToolCalls: any[] = [];
      let buffer = ""; // Buffer for incomplete JSON chunks

      const processJsonSegment = (jsonStr: string) => {
        if (!jsonStr) return;

        try {
          const data = JSON.parse(jsonStr);

          if (data.message !== undefined) {
            const messageWithEmojis = data.message.replace(
              /\\u[\dA-F]{4}/gi,
              (match: string) =>
                String.fromCodePoint(parseInt(match.replace(/\\u/g, ""), 16))
            );
            currentMessage += messageWithEmojis;
            onMessageUpdate(currentMessage, currentToolCalls, currentCitations);
          }

          if (data.tool_calls !== undefined) {
            currentToolCalls.push(...data.tool_calls);
            onMessageUpdate(currentMessage, currentToolCalls, currentCitations);
          }

          if (data.citations !== undefined) {
            currentCitations = data.citations;
            onMessageUpdate(currentMessage, currentToolCalls, currentCitations);
          }
        } catch (e) {
          // Try to recover by extracting multiple JSON objects
          const extracted = ChatService.extractJsonObjects(jsonStr);
          if (extracted.objects.length > 1) {
            extracted.objects.forEach(processJsonSegment);
            if (extracted.remaining.trim()) {
              console.warn(
                "Residual data after recovering JSON chunk in regenerate:",
                extracted.remaining
              );
            }
            return;
          }
          console.warn("Failed to parse JSON chunk in regenerate:", jsonStr, e);
        }
      };

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode chunk and add to buffer
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // Extract and process complete JSON objects from buffer
            const extracted = ChatService.extractJsonObjects(buffer);
            buffer = extracted.remaining;
            extracted.objects.forEach(processJsonSegment);
          }

          // Process any remaining complete JSON in buffer after stream ends
          const extracted = ChatService.extractJsonObjects(buffer);
          buffer = extracted.remaining;
          extracted.objects.forEach(processJsonSegment);

          if (buffer.trim()) {
            console.warn(
              "Unprocessed JSON buffer after regenerate stream end:",
              buffer
            );
          }
        } finally {
          reader.releaseLock();
        }
      }

      return {
        message: currentMessage,
        citations: currentCitations,
        tool_calls: currentToolCalls,
      };
    } catch (error) {
      // Handle regeneration error
      throw error;
    }
  }

  static async createConversation(
    userId: string,
    title: string,
    projectId: string | null,
    agentId: string,
    isHidden: boolean = false,
    repoName?: string | null,
    branchName?: string | null
  ) {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL;
    try {
      // Build request body with all required fields
      const requestBody: any = {
        user_id: userId,
        title: title,
        status: "active",
        project_ids: projectId ? [projectId] : [],
        agent_ids: [agentId],
      };

      // CRITICAL: Add repo_name and branch_name if provided
      // This ensures backend has the context it needs
      if (repoName) {
        requestBody.repo_name = repoName;
      }
      if (branchName) {
        requestBody.branch_name = branchName;
      }

      const response = await axios.post(
        `${baseUrl}/api/v1/conversations`,
        requestBody,
        { 
          headers: headers,
          params: isHidden ? { hidden: true } : undefined,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw new Error("Error creating conversation");
    }
  }

  static async getAllChats() {
    const headers = await getHeaders();
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations`,
      {
        params: {
          start: 0,
          limit: 1000,
        },
        headers: headers,
      }
    );
    return response.data.reverse();
  }

  static async renameChat(conversationId: string, title: string) {
    const headers = await getHeaders();
    const response = await axios.patch(
      `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/rename`,
      {
        title: title,
      },
      { headers: headers }
    );
    return response.data;
  }

  static async deleteChat(conversationId: string) {
    const headers = await getHeaders();
    const response = await axios.delete(
      `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}`,
      {
        headers,
      }
    );
    return response.data;
  }

  static async shareConversation(
    conversationId: string,
    recipientEmails: string[],
    visibility: Visibility
  ) {
    const headers = await getHeaders();
    const payload: any = {
      conversation_id: conversationId,
      visibility: visibility,
    };
    try {
      if (visibility === Visibility.PRIVATE) {
        const filteredEmails = recipientEmails.filter(
          (email) => email.trim() !== ""
        );
        payload.recipientEmails =
          filteredEmails.length > 0 ? filteredEmails : null; // Set to undefined if empty
      }
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/share`,
        payload,
        { headers }
      );

      return response.data;
    } catch (error: any) {
      if (error.response) {
        if (error.response.data && error.response.data.detail) {
          return {
            type: "error",
            message: error.response.data.detail,
          };
        }
      }

      return {
        type: "error",
        message: "Unable to share the conversation.",
      };
    }
  }
  static async getChatAccess(conversationId: string) {
    const headers = await getHeaders();
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/shared-emails`,
        { headers }
      );
      return response;
    } catch (error: any) {
      if (error.response) {
        return {
          type: "error",
          message: error.response.data.detail || "Unable to fetch access list.",
        };
      }

      return {
        type: "error",
        message: "Network error while fetching access list.",
      };
    }
  }

  static async enhancePrompt(conversationId: string | null, prompt: string) {
    const headers = await getHeaders();
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/prompts/enhancer`,
        {
          conversation_id: conversationId,
          prompt: prompt,
        },
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error("Error enhancing prompt:", error);
      throw error;
    }
  }

  static async stopMessage(conversationId: string, sessionId?: string): Promise<void> {
    try {
      const headers = await getHeaders();
      const url = new URL(
        `${process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL}/api/v1/conversations/${conversationId}/stop`
      );
      if (sessionId) {
        url.searchParams.set("session_id", sessionId);
      }
      await axios.post(
        url.toString(),
        {},
        { headers }
      );
    } catch (error) {
      console.error("Error stopping message:", error);
      // Don't throw - we still want to clean up even if stop endpoint fails
    }
  }
}
