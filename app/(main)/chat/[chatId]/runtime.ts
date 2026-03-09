"use client";
import {
  useLocalRuntime,
  type ChatModelAdapter,
  type ChatModelRunOptions,
  type ThreadHistoryAdapter,
  type ThreadMessage,
  type ThreadAssistantMessage,
  type ThreadUserMessage,
  type TextMessagePart,
  type ImageMessagePart,
  type ToolCallMessagePart,
  type CompleteAttachment,
  type AttachmentAdapter,
  type PendingAttachment,
} from "@assistant-ui/react";
import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import ChatService, {
  type ToolCall,
  type LoadedMessage,
} from "@/services/ChatService";
import { SessionInfo } from "@/lib/types/session";
import { isMultimodalEnabled } from "@/lib/utils";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/state/store";
import { clearPendingMessage } from "@/lib/state/Reducers/chat";
import { toast } from "sonner";

// Type for tool call result structure from backend
interface ToolCallResult {
  event_type: string;
  response: string;
  details: {
    summary: string;
  };
}

interface StreamingToolCallPart extends ToolCallMessagePart {
  streamState?: ToolCallResult;
  result?: ToolCallResult;
  isError?: boolean;
}

// Backend message shape (loadMessages returns LoadedMessage[])
type BackendMessage = LoadedMessage & { created_at?: string };

// Resume session info interface
interface ResumeSessionInfo {
  sessionId: string;
  cursor: string;
}

// Streaming state interface (for ongoing streams)
interface StreamingState {
  sessionId: string | null;
  currentCursor: string;
  isStreaming: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
}

// Return type for the hook
export interface ChatRuntimeResult {
  runtime: ReturnType<typeof useLocalRuntime>;
  isBackgroundTaskActive: boolean;
}

// Create the adapter that bridges our Redis backend to assistant-ui
const createChatAdapter = (
  chatId: string,
  isBackgroundTaskActiveRef: React.MutableRefObject<boolean>,
  streamingStateRef: React.MutableRefObject<StreamingState>,
  resumeSessionRef: React.MutableRefObject<ResumeSessionInfo | null>
): ChatModelAdapter => {
  return {
    async *run({ messages, abortSignal, context }: ChatModelRunOptions) {
      console.log("[Adapter] run() called with messages:", messages.length);

      // Check if this is a resume run FIRST
      const resumeSession = resumeSessionRef.current;

      // inside createChatAdapter -> run function
      if (resumeSession) {
        const { sessionId, cursor } = resumeSession;
        resumeSessionRef.current = null;

        // 1. A simple queue to bridge callback -> generator
        const queue: any[] = [];
        let resolve: ((value: any) => void) | null = null;
        let finished = false;

        const pushToQueue = (
          accumulatedText: string,
          toolCallsMap: Map<string, any>,
          accumulatedThinking?: string | null
        ) => {
          const content: (
            | TextMessagePart
            | ToolCallMessagePart
            | { type: "reasoning"; text: string }
          )[] = [];

          // Thinking (reasoning) first, then tool calls, then text
          if (accumulatedThinking && accumulatedThinking.trim()) {
            content.push({
              type: "reasoning",
              text: accumulatedThinking,
            });
          }
          for (const tool of toolCallsMap.values()) {
            if (tool.toolCallId && tool.toolName) {
              content.push(tool);
            }
          }
          content.push({ type: "text", text: accumulatedText || "" });

          const chunk = { content };
          if (resolve) {
            resolve(chunk);
            resolve = null;
          } else {
            queue.push(chunk);
          }
        };

        // Map to accumulate tool calls during resume
        const accumulatedToolCalls = new Map<string, StreamingToolCallPart>();
        let accumulatedThinking: string | null = null;

        // 2. Start the backend call
        ChatService.resumeWithCursor(
          chatId,
          sessionId,
          cursor,
          (message, tool_calls, thinking) => {
            if (thinking !== undefined) {
              accumulatedThinking = thinking ?? null;
            }
            // Process tool calls into the map
            tool_calls.forEach((toolCallJson) => {
              try {
                const parsed =
                  typeof toolCallJson === "string"
                    ? JSON.parse(toolCallJson)
                    : toolCallJson;
                const {
                  call_id,
                  tool_name,
                  tool_call_details,
                  event_type,
                  tool_response,
                } = parsed;

                const rawArgs = tool_call_details?.arguments;

                const previous =
                  accumulatedToolCalls.get(call_id) ??
                  ({
                    type: "tool-call" as const,
                    toolCallId: call_id,
                    toolName: tool_name,
                    args:
                      typeof rawArgs === "object" && rawArgs !== null
                        ? rawArgs
                        : {},
                    argsText:
                      typeof rawArgs === "string"
                        ? rawArgs
                        : JSON.stringify(rawArgs ?? {}, null, 2),
                  } as StreamingToolCallPart);

                const argsValue =
                  rawArgs === undefined
                    ? previous.args
                    : typeof rawArgs === "object" && rawArgs !== null
                      ? rawArgs
                      : {};

                const argsTextValue =
                  rawArgs === undefined
                    ? previous.argsText
                    : typeof rawArgs === "string"
                      ? rawArgs
                      : JSON.stringify(rawArgs, null, 2);

                const streamState: ToolCallResult = {
                  event_type,
                  response: tool_response,
                  details: tool_call_details,
                };

                const next: StreamingToolCallPart = {
                  ...previous,
                  streamState,
                  toolName: tool_name,
                  args: argsValue,
                  argsText: argsTextValue,
                };

                if (event_type === "result" || event_type === "error") {
                  next.result = streamState;
                  next.isError = event_type === "error";
                } else {
                  next.result = undefined;
                  next.isError = false;
                }

                accumulatedToolCalls.set(call_id, next);
              } catch (e) {
                console.error("Error processing tool call during resume:", e);
              }
            });

            // Push the current state to the queue
            pushToQueue(message, accumulatedToolCalls, accumulatedThinking);
          },
          abortSignal
        )
          .then(() => {
            finished = true;
            if (resolve) resolve(null);
          })
          .catch((err) => {
            finished = true;
            if (resolve) resolve(null);
          });

        // 3. The Generator Loop
        while (true) {
          if (queue.length > 0) {
            yield queue.shift();
          } else if (finished) {
            break;
          } else {
            const next = await new Promise((res) => {
              resolve = res;
            });
            if (!next) break;
            yield next;
          }
        }
        return;
      }

      // NORMAL MODE: Existing code for regular message streaming
      // Prevent new messages during background tasks
      if (isBackgroundTaskActiveRef.current) {
        console.warn("Cannot send message while background task is active");
        throw new Error("Background task is active");
      }

      // Get the last user message
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== "user") {
        throw new Error("No user message found");
      }

      // Extract text content
      const textContent = lastMessage.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("Message must contain text");
      }

      // Extract custom config (selectedNodes)
      interface RunConfig {
        custom?: {
          selectedNodes?: unknown[];
        };
      }
      const runConfig = (context as { runConfig?: RunConfig }).runConfig;
      const selectedNodes =
        (runConfig?.custom?.selectedNodes as unknown[]) || [];

      // Extract images from message attachments (the assistant-ui way)
      const images: File[] = [];
      if (isMultimodalEnabled() && lastMessage.role === "user") {
        const userMessage = lastMessage as ThreadUserMessage;
        if (userMessage.attachments) {
          userMessage.attachments.forEach((attachment) => {
            if (
              attachment.type === "image" &&
              "file" in attachment &&
              attachment.file
            ) {
              images.push(attachment.file);
            }
          });
        }
      }

      // Initialize streaming state
      streamingStateRef.current.isStreaming = true;
      streamingStateRef.current.currentCursor = "0-0";
      streamingStateRef.current.sessionId = null;

      // Convert callback-based ChatService to async iterable
      const streamAsyncIterable = async function* () {
        let accumulatedText = "";
        let accumulatedThinking: string | null = null;
        let accumulatedToolCalls = new Map<string, StreamingToolCallPart>();
        let resolveNext: ((value: boolean) => void) | null = null;
        let rejectStream: ((error: Error) => void) | null = null;
        let hasUpdate = false;
        let aborted = false;

        // Create a promise that resolves when new data arrives
        let waitForUpdate = new Promise<boolean>((resolve, reject) => {
          resolveNext = resolve;
          rejectStream = reject;
        });

        // Handle abort signal
        const handleAbort = () => {
          if (aborted) return;
          aborted = true;

          // Call stop endpoint
          void ChatService.stopMessage(chatId);

          // Break out of the waiting loop
          if (resolveNext) {
            resolveNext(false);
          }
          if (rejectStream) {
            rejectStream(new DOMException("Aborted", "AbortError"));
          }
        };

        // Listen for abort signal
        if (abortSignal) {
          if (abortSignal.aborted) {
            await handleAbort();
            return;
          }
          abortSignal.addEventListener("abort", handleAbort);
        }

        // Start the streaming
        const streamPromise = ChatService.streamMessage(
          chatId,
          textContent.text,
          selectedNodes,
          images,
          (
            message: string,
            tool_calls: any[],
            citations: string[],
            thinking?: string | null
          ) => {
            if (abortSignal?.aborted || aborted) return;

            // Update accumulated state
            accumulatedText = message;
            if (thinking !== undefined) {
              accumulatedThinking = thinking ?? null;
            }

            tool_calls.forEach((toolCallJson) => {
              try {
                // Detect whether toolCallJson is a string or already an object
                const parsed =
                  typeof toolCallJson === "string"
                    ? JSON.parse(toolCallJson)
                    : toolCallJson;
                const {
                  call_id,
                  tool_name,
                  tool_call_details,
                  event_type,
                  tool_response,
                } = parsed;

                const rawArgs = tool_call_details?.arguments;

                const previous =
                  accumulatedToolCalls.get(call_id) ??
                  ({
                    type: "tool-call" as const,
                    toolCallId: call_id,
                    toolName: tool_name,
                    args:
                      typeof rawArgs === "object" && rawArgs !== null
                        ? rawArgs
                        : {},
                    argsText:
                      typeof rawArgs === "string"
                        ? rawArgs
                        : JSON.stringify(rawArgs ?? {}, null, 2),
                  } as StreamingToolCallPart);

                const argsValue =
                  rawArgs === undefined
                    ? previous.args
                    : typeof rawArgs === "object" && rawArgs !== null
                      ? rawArgs
                      : {};

                const argsTextValue =
                  rawArgs === undefined
                    ? previous.argsText
                    : typeof rawArgs === "string"
                      ? rawArgs
                      : JSON.stringify(rawArgs, null, 2);

                const streamState: ToolCallResult = {
                  event_type,
                  response: tool_response,
                  details: tool_call_details,
                };

                const next: StreamingToolCallPart = {
                  ...previous,
                  streamState,
                  toolName: tool_name,
                  args: argsValue,
                  argsText: argsTextValue,
                };

                if (event_type === "result" || event_type === "error") {
                  next.result = streamState;
                  next.isError = event_type === "error";
                } else {
                  next.result = undefined;
                  next.isError = false;
                }

                accumulatedToolCalls.set(call_id, next);
              } catch (e) {
                console.warn("Error parsing tool call:", e);
              }
            });

            // Signal that we have an update
            hasUpdate = true;
            if (resolveNext && !aborted) {
              resolveNext(true);
              // Create new promise for next update
              waitForUpdate = new Promise<boolean>((resolve, reject) => {
                resolveNext = resolve;
                rejectStream = reject;
              });
            }
          },
          streamingStateRef.current.sessionId || undefined,
          abortSignal ?? undefined
        )
          .then((result) => {
            // Store final session ID
            streamingStateRef.current.sessionId = result.sessionId;
            streamingStateRef.current.isStreaming = false;
            return result;
          })
          .catch((error) => {
            streamingStateRef.current.isStreaming = false;
            if (!aborted && rejectStream) {
              rejectStream(error);
            }
            throw error;
          });

        // Yield updates as they arrive
        let streamFinished = false;

        try {
          while (!streamFinished && !aborted) {
            // Wait for next update or completion
            await Promise.race([
              waitForUpdate,
              streamPromise.then(() => {
                streamFinished = true;
              }),
            ]);

            // Check if we were aborted during the wait
            if (aborted) {
              break;
            }

            if (hasUpdate && !aborted) {
              hasUpdate = false;

              // Yield current accumulated state: thinking first, then tool calls, then text
              yield {
                content: [
                  ...(accumulatedThinking
                    ? [
                        {
                          type: "reasoning" as const,
                          text: accumulatedThinking,
                        },
                      ]
                    : []),
                  ...Array.from(accumulatedToolCalls.values()),
                  ...(accumulatedText
                    ? [{ type: "text" as const, text: accumulatedText }]
                    : []),
                ] as readonly (
                  | TextMessagePart
                  | ToolCallMessagePart
                  | { type: "reasoning"; text: string }
                )[],
              };
            }
          }

          // Final yield after stream completes to ensure all content is sent
          if (!aborted) {
            const hasContent =
              accumulatedThinking ||
              accumulatedToolCalls.size > 0 ||
              accumulatedText;
            if (hasContent) {
              yield {
                content: [
                  ...(accumulatedThinking
                    ? [
                        {
                          type: "reasoning" as const,
                          text: accumulatedThinking,
                        },
                      ]
                    : []),
                  ...Array.from(accumulatedToolCalls.values()),
                  ...(accumulatedText
                    ? [{ type: "text" as const, text: accumulatedText }]
                    : []),
                ] as readonly (
                  | TextMessagePart
                  | ToolCallMessagePart
                  | { type: "reasoning"; text: string }
                )[],
              };
            }
          }
        } catch (error) {
          if (!aborted) {
            throw error;
          }
        } finally {
          // Clean up abort listener
          if (abortSignal) {
            abortSignal.removeEventListener("abort", handleAbort);
          }
          streamingStateRef.current.isStreaming = false;
        }
      };

      // Use the async iterable with for await
      try {
        for await (const chunk of streamAsyncIterable()) {
          yield chunk;
        }
      } catch (error) {
        if (abortSignal?.aborted) {
          return;
        }
        console.error("Error streaming message:", error);
        throw error;
      }
    },
  };
};

// Map API tool call to assistant-ui ToolCallMessagePart (for history-loaded messages)
function apiToolCallToPart(tc: ToolCall): StreamingToolCallPart {
  const rawArgs = tc.tool_call_details?.arguments;
  const args: Record<string, unknown> =
    typeof rawArgs === "object" && rawArgs !== null ? (rawArgs as Record<string, unknown>) : {};
  const argsText =
    typeof rawArgs === "string"
      ? rawArgs
      : JSON.stringify(rawArgs ?? {}, null, 2);
  const result: ToolCallResult = {
    event_type: tc.event_type,
    response: tc.tool_response,
    details:
      typeof tc.tool_call_details === "object" && tc.tool_call_details !== null
        ? {
            ...tc.tool_call_details,
            summary: tc.tool_call_details.summary ?? "",
          }
        : { summary: "" },
  };
  return {
    type: "tool-call",
    toolCallId: tc.call_id,
    toolName: tc.tool_name,
    args: args as ToolCallMessagePart["args"],
    argsText,
    result,
    isError: tc.event_type === "error",
  };
}

// Deduplicate API tool_calls by call_id (API may send same call_id for "call" and "result" events)
// and merge into one part per tool call, preserving first-seen order.
function dedupeToolCalls(toolCalls: ToolCall[]): ToolCall[] {
  const byId = new Map<string, ToolCall>();
  for (const tc of toolCalls) {
    const existing = byId.get(tc.call_id);
    if (!existing) {
      byId.set(tc.call_id, { ...tc });
    } else {
      // Merge: prefer result/delegation_result (or error) event for final state
      if (
        tc.event_type === "result" ||
        tc.event_type === "delegation_result" ||
        tc.event_type === "error"
      ) {
        byId.set(tc.call_id, {
          ...existing,
          ...tc,
          tool_response: tc.tool_response,
          tool_call_details: tc.tool_call_details ?? existing.tool_call_details,
          is_complete: tc.is_complete ?? existing.is_complete,
        });
      }
    }
  }
  return Array.from(byId.values());
}

// Helper function to convert messages to ThreadMessage format
const convertToThreadMessage = (msg: BackendMessage): ThreadMessage => {
  const role = msg.sender === "user" ? "user" : "assistant";
  const createdAt = msg.created_at ? new Date(msg.created_at) : new Date();

  // User messages: text + optional images
  if (role === "user") {
    const content: (TextMessagePart | ImageMessagePart)[] = [
      { type: "text", text: msg.text || "" },
    ];
    const attachments: CompleteAttachment[] = [];

    if (
      isMultimodalEnabled() &&
      msg.has_attachments &&
      msg.attachments &&
      msg.attachments.length > 0
    ) {
      const attachmentList = msg.attachments as Array<{
        attachment_type: string;
        download_url?: string;
      }>;
      const imageAttachments = attachmentList.filter(
        (attachment) =>
          attachment.attachment_type === "image" && attachment.download_url
      );
      imageAttachments.forEach((attachment, index) => {
        if (attachment.download_url) {
          content.push({
            type: "image",
            image: attachment.download_url,
          });
          attachments.push({
            id: `${msg.id}-attachment-${index}`,
            type: "image",
            name: `Image ${index + 1}`,
            contentType: "image/*",
            status: { type: "complete" },
            content: [
              { type: "image", image: attachment.download_url },
            ],
          });
        }
      });
    }

    return {
      id: msg.id,
      role: "user",
      content: content as ThreadUserMessage["content"],
      attachments,
      metadata: { custom: {} },
      createdAt,
    };
  }

  // Assistant messages: thinking (reasoning) first, then tool calls, then text; optional images
  const assistantContent: (
    | TextMessagePart
    | ImageMessagePart
    | ToolCallMessagePart
    | { type: "reasoning"; text: string }
  )[] = [];

  if (msg.thinking && msg.thinking.trim()) {
    assistantContent.push({ type: "reasoning", text: msg.thinking });
  }
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    const uniqueToolCalls = dedupeToolCalls(msg.tool_calls);
    assistantContent.push(...uniqueToolCalls.map(apiToolCallToPart));
  }
  assistantContent.push({ type: "text", text: msg.text || "" });

  return {
    id: msg.id,
    role: "assistant",
    content: assistantContent as ThreadAssistantMessage["content"],
    status: { type: "complete", reason: "stop" },
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
    createdAt,
  };
};

// Create Thread History Adapter
// This adapter handles loading historical messages and persisting new messages
const createHistoryAdapter = (chatId: string): ThreadHistoryAdapter => {
  return {
    async load() {
      if (!chatId) {
        return { messages: [] };
      }

      try {
        const messages = await ChatService.loadMessages(chatId, 0, 1000);
        const convertedMessages = messages.map(convertToThreadMessage);

        return {
          messages: convertedMessages.map(
            (message: ThreadMessage, index: number) => ({
              message,
              parentId: index === 0 ? null : convertedMessages[index - 1].id,
            })
          ),
        };
      } catch (error) {
        console.error("Error loading messages in history adapter:", error);
        return { messages: [] };
      }
    },

    async append() {
      // Backend automatically saves messages when sent via streamMessage
      return Promise.resolve();
    },
  };
};

// Create Attachments Adapter
// This adapter handles file attachments (images)
const createAttachmentsAdapter = (): AttachmentAdapter => {
  // Track object URLs so we can revoke them and prevent memory leaks
  const objectUrls = new Map<string, string>();

  return {
    accept: "image/*",
    async add({ file }: { file: File }): Promise<PendingAttachment> {
      // Create object URL for preview
      const objectUrl = URL.createObjectURL(file);
      const attachmentId = crypto.randomUUID();

      // Store the URL so we can revoke it later
      objectUrls.set(attachmentId, objectUrl);

      // Return the pending attachment object
      const attachment: PendingAttachment = {
        id: attachmentId,
        type: "image",
        name: file.name,
        contentType: file.type,
        status: { type: "requires-action", reason: "composer-send" },
        file,
        content: [
          {
            type: "image",
            image: objectUrl,
          },
        ],
      };

      return attachment;
    },
    async remove(attachment: PendingAttachment) {
      // Revoke the object URL to free memory
      const objectUrl = objectUrls.get(attachment.id);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrls.delete(attachment.id);
      }
      return Promise.resolve();
    },
    async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
      // Revoke the object URL now that the attachment is sent
      const objectUrl = objectUrls.get(attachment.id);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrls.delete(attachment.id);
      }

      // IMPORTANT: Preserve the file property so runtime can extract it later
      const completeAttachment: CompleteAttachment = {
        id: attachment.id,
        type: attachment.type,
        name: attachment.name,
        contentType: attachment.contentType,
        status: { type: "complete" },
        file: attachment.file, // Preserve the File object for backend upload
        content: attachment.content || [],
      };

      return completeAttachment;
    },
  };
};

// Hook to create and manage the runtime
// Returns runtime along with session states for components to use
export function useChatRuntime(
  chatId: string | null | undefined
): ChatRuntimeResult {
  console.log("[Runtime] useChatRuntime called with chatId:", chatId);
  // Keep only isBackgroundTaskActive
  const [isBackgroundTaskActive, setIsBackgroundTaskActive] = useState(false);

  // Streaming state ref (for ongoing streams)
  const streamingStateRef = useRef<StreamingState>({
    sessionId: null,
    currentCursor: "0-0",
    isStreaming: false,
    isReconnecting: false,
    reconnectAttempts: 0,
  });

  // Use ref for the adapter to avoid stale closure issues
  const isBackgroundTaskActiveRef = useRef(isBackgroundTaskActive);
  useEffect(() => {
    isBackgroundTaskActiveRef.current = isBackgroundTaskActive;
  }, [isBackgroundTaskActive]);

  // Resume session ref - must be before resumeActiveSession
  const resumeSessionRef = useRef<ResumeSessionInfo | null>(null);

  // Create the chat adapter - use ref to avoid recreation on state change
  const adapter = useMemo(() => {
    const safeChatId: string = (chatId || "") as string;
    return createChatAdapter(
      safeChatId,
      isBackgroundTaskActiveRef,
      streamingStateRef,
      resumeSessionRef
    );
  }, [chatId]); // Only recreate when chatId changes

  // Create the history adapter
  const historyAdapter = useMemo(() => {
    if (!chatId) {
      return undefined;
    }
    return createHistoryAdapter(chatId);
  }, [chatId]);

  // Create the attachments adapter
  const attachmentsAdapter = useMemo(() => {
    return createAttachmentsAdapter();
  }, []);

  const runtime = useLocalRuntime(adapter, {
    adapters: historyAdapter
      ? {
          history: historyAdapter,
          attachments: attachmentsAdapter,
        }
      : {
          attachments: attachmentsAdapter,
        },
  });

  // Resume active session handler - must be after runtime is created
  const resumeActiveSession = useCallback(
    async (
      sessionInfo: SessionInfo,
      runtime: ReturnType<typeof useLocalRuntime>
    ) => {
      if (!chatId) return;

      console.log(
        "[Runtime] Preparing resume for session:",
        sessionInfo.sessionId
      );

      // Set the resume ref so the Adapter's run() method knows what to do
      resumeSessionRef.current = {
        sessionId: sessionInfo.sessionId,
        cursor: sessionInfo.cursor || "0-0",
      };

      setIsBackgroundTaskActive(true);

      try {
        // Access the thread specifically
        const thread = runtime.thread;

        if (!thread) {
          console.error("[Runtime] Thread not available on runtime");
          setIsBackgroundTaskActive(false);
          return;
        }

        // Helper to get messages from current state
        const getMessages = () => thread.getState().messages;

        // Wait for messages to be available (History Load)
        if (!getMessages() || getMessages().length === 0) {
          await new Promise<void>((resolve) => {
            const unsubscribe = thread.subscribe(() => {
              if (getMessages()?.length > 0) {
                unsubscribe();
                resolve();
              }
            });
            setTimeout(() => {
              unsubscribe();
              resolve();
            }, 5000);
          });
        }

        const messages = getMessages();
        const lastMsg = messages?.[messages.length - 1];

        // Trigger the adapter. startRun() will call your Adapter's run()
        // using the existing messages in the thread as context.
        // ✅ FIX: Explicitly pass the ID of the user message.
        // This tells assistant-ui: "Start a run responding TO this specific message."
        // This bypasses the internal state lookup that was causing the parentId error.
        if (lastMsg?.role === "user") {
          console.log(
            "[Runtime] Triggering startRun to resume stream for message:",
            lastMsg.id
          );

          // Passing the ID is the critical part to avoid the 'parentId' TypeError
          await thread.startRun(lastMsg.id);

          console.log("[Runtime] Resume stream completed");
        } else {
          console.log(
            "[Runtime] Last message is not from user, skipping resume. Role:",
            lastMsg?.role
          );
        }

        // Reset background task state after resume completes
        // Note: This happens after startRun() completes, which means the adapter has finished streaming
        setIsBackgroundTaskActive(false);
      } catch (error) {
        console.error("[Runtime] Error triggering resume:", error);
        resumeSessionRef.current = null;
        setIsBackgroundTaskActive(false);
      }
    },
    [chatId, runtime]
  );

  // Check for active session on mount
  useEffect(() => {
    console.log("[Runtime] useEffect triggered, chatId:", chatId);
    let isMounted = true;

    const checkAndResume = async () => {
      if (!chatId) {
        console.log("[Runtime] No chatId, skipping session check");
        return;
      }

      try {
        console.log("[Runtime] Checking for active session...");
        const activeSession = await ChatService.detectActiveSession(chatId);
        console.log("[Runtime] Active session result:", activeSession);

        if (!isMounted) {
          console.log("[Runtime] Component unmounted, skipping");
          return;
        }

        if (!activeSession) {
          console.log("[Runtime] No active session found");
          return;
        }

        if (activeSession.status !== "active") {
          console.log(
            "[Runtime] Session status is not active:",
            activeSession.status
          );
          return;
        }

        console.log(
          "[Runtime] Active session detected:",
          activeSession.sessionId
        );

        // Access the thread from runtime
        const thread = runtime.thread;

        if (!thread) {
          console.error("[Runtime] Thread not available on runtime");
          return;
        }

        // Ensure history is loaded - use getState() to access messages
        const getMessages = () => thread.getState().messages;
        if (!getMessages() || getMessages().length === 0) {
          // Wait for history load...
          await new Promise<void>((resolve) => {
            const unsubscribe = thread.subscribe(() => {
              const msgs = getMessages();
              if (msgs && msgs.length > 0) {
                unsubscribe();
                resolve();
              }
            });
            setTimeout(() => {
              unsubscribe();
              resolve();
            }, 5000);
          });
        }

        if (isMounted) {
          await resumeActiveSession(activeSession, runtime);
        }
      } catch (error) {
        console.error("[Runtime] Error checking active session:", error);
      }
    };

    const timer = setTimeout(checkAndResume, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [chatId, runtime, resumeActiveSession]);

  // Handle resume marker in adapter - remove temporary user message
  // This is handled in the adapter's run() method by checking for resume mode first

  return {
    runtime,
    isBackgroundTaskActive,
  };
}

// Hook for handling pending messages from newchat page
export function usePendingMessageHandler(
  runtime: ReturnType<typeof useLocalRuntime>,
  chatId: string | null | undefined
) {
  const dispatch = useDispatch<AppDispatch>();
  const pendingMessage = useSelector(
    (state: RootState) => state.chat.pendingMessage
  );
  const hasSentPendingMessage = useRef(false);

  useEffect(() => {
    if (!pendingMessage || !chatId || hasSentPendingMessage.current) {
      return;
    }

    console.log(
      "[PendingMessage] Detected pending message, sending via runtime:",
      pendingMessage
    );
    hasSentPendingMessage.current = true;

    // Wait for runtime to be ready
    const sendPendingMessage = async () => {
      try {
        // Small delay to ensure runtime is fully initialized
        await new Promise((resolve) => setTimeout(resolve, 100));

        const thread = runtime.thread;
        if (!thread) {
          console.error("[PendingMessage] Thread not available");
          dispatch(clearPendingMessage());
          return;
        }

        // Send message through thread's composer
        // This ensures it goes through the adapter and proper streaming happens
        const composer = thread.composer;
        if (!composer) {
          console.error("[PendingMessage] Composer not available");
          dispatch(clearPendingMessage());
          return;
        }

        composer.setText(pendingMessage);

        // Trigger send
        await composer.send();

        console.log(
          "[PendingMessage] Successfully sent pending message via runtime"
        );

        // Clear pending message
        dispatch(clearPendingMessage());
      } catch (error) {
        console.error("[PendingMessage] Error sending pending message:", error);
        toast.error("Failed to send message. You can retry in the chat.");

        // Clear pending message even on error to prevent infinite retry
        dispatch(clearPendingMessage());
      }
    };

    sendPendingMessage();
  }, [pendingMessage, chatId, runtime, dispatch]);
}