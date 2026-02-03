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
import ChatService from "@/services/ChatService";
import { SessionInfo } from "@/lib/types/session";
import { isMultimodalEnabled } from "@/lib/utils";

// Type for tool call result structure from backend
interface ToolCallResult {
  event_type: string;
  response: string;
  details: {
    summary: string;
  };
  accumulated_response?: string; // Accumulated from stream_part chunks
  is_complete?: boolean; // Whether this is the final part
  is_streaming?: boolean; // Whether this tool call is currently streaming
}

interface StreamingToolCallPart extends ToolCallMessagePart {
  streamState?: ToolCallResult;
  result?: ToolCallResult;
  isError?: boolean;
  timestamp?: number; // When this tool call was first created
  lastUpdated?: number; // When this tool call was last updated
}

// Content part with timestamp for ordering
interface TimestampedContentPart {
  part: TextMessagePart | StreamingToolCallPart;
  timestamp: number;
  type: "text" | "tool-call";
}

// Type for backend message structure
interface BackendMessage {
  id: string;
  text: string;
  sender: "user" | "agent";
  citations: unknown[];
  has_attachments?: boolean;
  attachments?: Array<{
    attachment_type: string;
    download_url?: string;
  }>;
  created_at?: string;
}

// Return type for the hook
export interface ChatRuntimeResult {
  runtime: ReturnType<typeof useLocalRuntime>;
  isSessionResuming: boolean;
  isBackgroundTaskActive: boolean;
}

// Create the adapter that bridges our Redis backend to assistant-ui
const createChatAdapter = (
  chatId: string,
  isBackgroundTaskActiveRef: React.MutableRefObject<boolean>
): ChatModelAdapter => {
  return {
    async *run({ messages, abortSignal, runConfig: optionsRunConfig }: ChatModelRunOptions) {
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

      // Extract custom config (selectedNodes, documentIds) from runConfig
      // runConfig is set by MessageComposer via composer.setRunConfig() and must include
      // documentIds so we can send attachment_ids to the message API
      interface RunConfigCustom {
        custom?: {
          selectedNodes?: unknown[];
          documentIds?: string[];
        };
      }
      const runConfig = (optionsRunConfig ?? {}) as RunConfigCustom;
      const selectedNodes =
        (runConfig?.custom?.selectedNodes as unknown[]) || [];
      const documentIds = runConfig?.custom?.documentIds || [];

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

      // Convert callback-based ChatService to async iterable
      const streamAsyncIterable = async function* () {
        let accumulatedText = "";
        let previousTextLength = 0;
        let accumulatedToolCalls = new Map<string, StreamingToolCallPart>();
        // Track content parts in chronological order
        let contentParts: TimestampedContentPart[] = [];
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
          documentIds,
          (message: string, tool_calls: any[], citations: string[]) => {
            if (abortSignal?.aborted || aborted) return;

            const now = Date.now();

            // Track text changes - if text has grown, it's a new segment
            const textChanged = message.length > previousTextLength;
            let newTextSegment = "";

            if (textChanged && accumulatedText !== message) {
              // New text segment arrived
              newTextSegment = message.slice(previousTextLength);
              previousTextLength = message.length;
              accumulatedText = message;
            }

            // Track if we have tool calls in this update
            const hasToolCalls = tool_calls && tool_calls.length > 0;

            // If we have new text and no tool calls, add it immediately
            // If we have new text and tool calls, we'll add it before tool calls
            if (newTextSegment.trim() && !hasToolCalls) {
              contentParts.push({
                part: { type: "text" as const, text: newTextSegment },
                timestamp: now,
                type: "text",
              });
            } else if (newTextSegment.trim() && hasToolCalls) {
              // Text arrived before tool calls in this callback
              contentParts.push({
                part: { type: "text" as const, text: newTextSegment },
                timestamp: now,
                type: "text",
              });
            }

            tool_calls.forEach((toolCallJson) => {
              try {
                // Detect whether toolCallJson is a string or already an object
                const parsed =
                  typeof toolCallJson === "string"
                    ? JSON.parse(toolCallJson)
                    : toolCallJson;

                // DEBUG: Log subagent streaming response
                console.log("[SubAgent Stream] Tool call update:", {
                  tool_name: parsed.tool_name,
                  call_id: parsed.call_id,
                  event_type: parsed.event_type,
                  has_stream_part: parsed.stream_part !== undefined,
                  stream_part_length: parsed.stream_part?.length || 0,
                  is_complete: parsed.is_complete,
                  has_tool_response: !!parsed.tool_response,
                  tool_response_length: parsed.tool_response?.length || 0,
                  full_data: parsed,
                });

                const {
                  call_id,
                  tool_name,
                  tool_call_details,
                  event_type,
                  tool_response,
                  stream_part,
                  is_complete,
                } = parsed;

                const rawArgs = tool_call_details?.arguments;

                const previous = accumulatedToolCalls.get(call_id);
                const isNewToolCall = !previous;

                const toolCallPart: StreamingToolCallPart =
                  previous ??
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
                    timestamp: now,
                    lastUpdated: now,
                  } as StreamingToolCallPart);

                const argsValue =
                  rawArgs === undefined
                    ? toolCallPart.args
                    : typeof rawArgs === "object" && rawArgs !== null
                      ? rawArgs
                      : {};

                const argsTextValue =
                  rawArgs === undefined
                    ? toolCallPart.argsText
                    : typeof rawArgs === "string"
                      ? rawArgs
                      : JSON.stringify(rawArgs, null, 2);

                // Handle streaming tool calls
                let accumulatedResponse = "";
                let isStreaming = false;
                let finalResponse = tool_response || "";

                if (stream_part !== undefined && stream_part !== null) {
                  // This is a streaming update
                  const previousState = previous?.streamState;
                  const previousAccumulated =
                    previousState?.accumulated_response || "";

                  // DEBUG: Log stream part details
                  console.log("[SubAgent Stream] Stream part received:", {
                    call_id,
                    tool_name,
                    stream_part_length: stream_part.length,
                    previous_accumulated_length: previousAccumulated.length,
                    is_complete,
                  });

                  // Accumulate stream parts
                  accumulatedResponse = previousAccumulated + stream_part;

                  // Determine final response:
                  // - If is_complete is true and tool_response is provided, prefer tool_response (authoritative final value)
                  // - Otherwise, use accumulated response if tool_response is empty or shorter
                  if (is_complete === true && tool_response) {
                    // Final chunk: prefer tool_response as it's the authoritative complete response
                    finalResponse = tool_response;
                    // Update accumulated to match final response for consistency
                    accumulatedResponse = tool_response;
                  } else if (
                    !tool_response ||
                    tool_response.length < accumulatedResponse.length
                  ) {
                    // Use accumulated response during streaming or if tool_response is partial
                    finalResponse = accumulatedResponse;
                  } else {
                    // tool_response is provided and is longer/complete
                    finalResponse = tool_response;
                  }

                  // Check if streaming is complete
                  isStreaming = !(is_complete === true);
                } else {
                  // Regular (non-streaming) tool call
                  accumulatedResponse = tool_response || "";
                  finalResponse = tool_response || "";
                  isStreaming = false;
                }

                const streamState: ToolCallResult = {
                  event_type,
                  response: finalResponse,
                  details: tool_call_details,
                  accumulated_response: accumulatedResponse || finalResponse,
                  is_complete: is_complete !== undefined ? is_complete : true,
                  is_streaming: isStreaming,
                };

                // DEBUG: Log final stream state
                console.log("[SubAgent Stream] Stream state updated:", {
                  call_id,
                  tool_name,
                  event_type,
                  response_length: finalResponse.length,
                  accumulated_length:
                    streamState.accumulated_response?.length || 0,
                  is_complete: streamState.is_complete,
                  is_streaming: streamState.is_streaming,
                });

                const next: StreamingToolCallPart = {
                  ...toolCallPart,
                  streamState,
                  toolName: tool_name,
                  args: argsValue,
                  argsText: argsTextValue,
                  timestamp: toolCallPart.timestamp ?? now,
                  lastUpdated: now,
                };

                if (event_type === "result" || event_type === "error") {
                  next.result = streamState;
                  next.isError = event_type === "error";
                } else {
                  next.result = undefined;
                  next.isError = false;
                }

                accumulatedToolCalls.set(call_id, next);

                // If this is a new tool call, add it to content parts
                if (isNewToolCall) {
                  contentParts.push({
                    part: next,
                    timestamp: now,
                    type: "tool-call",
                  });
                } else {
                  // Update existing tool call in content parts
                  const existingIndex = contentParts.findIndex(
                    (cp) =>
                      cp.type === "tool-call" &&
                      (cp.part as any).toolCallId === call_id
                  );
                  if (existingIndex !== -1) {
                    contentParts[existingIndex] = {
                      part: next,
                      timestamp: contentParts[existingIndex].timestamp, // Keep original timestamp
                      type: "tool-call",
                    };
                  }
                }
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
          undefined,
          abortSignal ?? undefined
        ).catch((error) => {
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

              // Sort content parts by timestamp to maintain chronological order
              const sortedParts = [...contentParts].sort(
                (a, b) => a.timestamp - b.timestamp
              );

              // Build final content array from sorted parts
              // For text, we need to merge consecutive text segments
              const finalContent: (TextMessagePart | ToolCallMessagePart)[] =
                [];
              let currentTextSegments: string[] = [];
              let textIndex = 0; // Track position in accumulated text

              for (const { part } of sortedParts) {
                if (part.type === "text") {
                  currentTextSegments.push(part.text);
                  textIndex += part.text.length;
                } else {
                  // If we have accumulated text, add it first
                  if (currentTextSegments.length > 0) {
                    finalContent.push({
                      type: "text" as const,
                      text: currentTextSegments.join(""),
                    });
                    currentTextSegments = [];
                  }
                  // Add tool call
                  finalContent.push(part);
                }
              }

              // Add any remaining text segments
              if (currentTextSegments.length > 0) {
                finalContent.push({
                  type: "text" as const,
                  text: currentTextSegments.join(""),
                });
              }

              // Fallback: if no content parts but we have text, include it
              // This handles the case where text arrives but hasn't been added to contentParts yet
              if (
                finalContent.length === 0 &&
                accumulatedText &&
                contentParts.length === 0
              ) {
                finalContent.push({
                  type: "text" as const,
                  text: accumulatedText,
                });
              }

              yield {
                content: finalContent as readonly (
                  | TextMessagePart
                  | ToolCallMessagePart
                )[],
              };
            }
          }

          // Final yield after stream completes to ensure all content is sent
          if (!aborted) {
            // Sort content parts by timestamp
            const sortedParts = [...contentParts].sort(
              (a, b) => a.timestamp - b.timestamp
            );

            // Build final content array
            const finalContent: (TextMessagePart | ToolCallMessagePart)[] = [];
            let currentTextSegments: string[] = [];

            for (const { part } of sortedParts) {
              if (part.type === "text") {
                currentTextSegments.push(part.text);
              } else {
                if (currentTextSegments.length > 0) {
                  finalContent.push({
                    type: "text" as const,
                    text: currentTextSegments.join(""),
                  });
                  currentTextSegments = [];
                }
                finalContent.push(part);
              }
            }

            if (currentTextSegments.length > 0) {
              finalContent.push({
                type: "text" as const,
                text: currentTextSegments.join(""),
              });
            }

            // Fallback: if no content parts but we have text, include it
            // This handles the case where text arrives but hasn't been added to contentParts yet
            if (
              finalContent.length === 0 &&
              accumulatedText &&
              contentParts.length === 0
            ) {
              finalContent.push({
                type: "text" as const,
                text: accumulatedText,
              });
            }

            yield {
              content: finalContent as readonly (
                | TextMessagePart
                | ToolCallMessagePart
              )[],
            };
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

// Helper function to convert messages to ThreadMessage format
const convertToThreadMessage = (msg: BackendMessage): ThreadMessage => {
  const content: (TextMessagePart | ImageMessagePart)[] = [
    { type: "text", text: msg.text || "" },
  ];

  // Prepare attachments array for Assistant UI (images only)
  const attachments: CompleteAttachment[] = [];
  const documentAttachments =
    msg.attachments?.filter(
      (attachment) => attachment.attachment_type !== "image"
    ) || [];

  // Add image content and attachments if multimodal enabled and attachments exist
  if (
    isMultimodalEnabled() &&
    msg.has_attachments &&
    msg.attachments &&
    msg.attachments.length > 0
  ) {
    const imageAttachments = msg.attachments.filter(
      (attachment) =>
        attachment.attachment_type === "image" && attachment.download_url
    );

    imageAttachments.forEach((attachment, index) => {
      if (attachment.download_url) {
        // Add to content for inline display
        content.push({
          type: "image",
          image: attachment.download_url,
        });

        // Add to attachments array for Assistant UI's attachment components
        attachments.push({
          id: `${msg.id}-attachment-${index}`,
          type: "image",
          name: `Image ${index + 1}`,
          contentType: "image/*",
          status: { type: "complete" },
          content: [
            {
              type: "image",
              image: attachment.download_url,
            },
          ],
        });
      }
    });
  }

  const role = msg.sender === "user" ? "user" : "assistant";
  const createdAt = msg.created_at ? new Date(msg.created_at) : new Date();

  if (role === "assistant") {
    const assistantMessage: ThreadAssistantMessage = {
      id: msg.id,
      role: "assistant",
      content: content as ThreadAssistantMessage["content"],
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
    return assistantMessage;
  } else {
    const userMessage: ThreadUserMessage = {
      id: msg.id,
      role: "user",
      content: content as ThreadUserMessage["content"],
      attachments, // Image attachments only
      metadata: {
        custom: {
          documentAttachments,
        },
      },
      createdAt,
    };
    return userMessage;
  }
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
  // Local state for session management (no Redux)
  const [isSessionResuming, setIsSessionResuming] = useState(false);
  const [isBackgroundTaskActive, setIsBackgroundTaskActive] = useState(false);

  // Use ref for the adapter to avoid stale closure issues
  const isBackgroundTaskActiveRef = useRef(isBackgroundTaskActive);
  useEffect(() => {
    isBackgroundTaskActiveRef.current = isBackgroundTaskActive;
  }, [isBackgroundTaskActive]);

  // Ref to store runtime for use in resume callback
  const runtimeRef = useRef<ReturnType<typeof useLocalRuntime> | null>(null);

  // State to trigger history reload after resume
  const [historyReloadKey, setHistoryReloadKey] = useState(0);

  // Create the chat adapter - use ref to avoid recreation on state change
  const adapter = useMemo(() => {
    const safeChatId: string = (chatId || "") as string;
    return createChatAdapter(safeChatId, isBackgroundTaskActiveRef);
  }, [chatId]); // Only recreate when chatId changes, not backgroundTaskActive

  // Create the history adapter - recreate when reload key changes to force reload
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const historyAdapter = useMemo(() => {
    if (!chatId) {
      return undefined;
    }
    // historyReloadKey is in dependencies to force recreation when it changes
    // We access it here to satisfy the linter, even though we don't use the value
    void historyReloadKey;
    return createHistoryAdapter(chatId);
  }, [chatId, historyReloadKey]);

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

  // Store runtime in ref for use in resume callback
  useEffect(() => {
    runtimeRef.current = runtime;
  }, [runtime]);

  // Resume active session helper
  const resumeActiveSession = useCallback(
    async (sessionInfo: SessionInfo) => {
      try {
        if (!chatId) return;

        setIsSessionResuming(true);

        const runtime = runtimeRef.current;
        if (!runtime) {
          console.warn("Runtime not available for resume");
          setIsSessionResuming(false);
          return;
        }

        // Track initial message count
        const initialMessages = await ChatService.loadMessages(chatId, 0, 1000);
        let lastMessageCount = initialMessages.length;

        // Set up periodic checking for updates during resume
        // This allows the UI to show progress as messages are saved to the backend
        const updateInterval = setInterval(async () => {
          try {
            const messages = await ChatService.loadMessages(chatId, 0, 1000);
            const currentCount = messages.length;

            // If new messages arrived, trigger history reload to show them
            if (currentCount > lastMessageCount) {
              lastMessageCount = currentCount;
              // Trigger history adapter reload by changing the key
              setHistoryReloadKey((prev) => prev + 1);
            }
          } catch (error) {
            console.warn(
              "Error checking for message updates during resume:",
              error
            );
          }
        }, 1500); // Check every 1.5 seconds to avoid too frequent reloads

        // Resume the session stream from backend
        await ChatService.resumeActiveSession(
          chatId,
          sessionInfo.sessionId,
          (message: string, tool_calls: any[], citations: string[]) => {
            // The callback receives streaming updates, but we can't directly inject them
            // into the runtime. Instead, we rely on the backend saving messages incrementally
            // and the periodic check above to reload and display them.
            // This ensures the UI stays in sync with the backend state.
          }
        );

        // Clear the update interval
        clearInterval(updateInterval);

        // Final reload after resume completes to ensure all messages are displayed
        const finalMessages = await ChatService.loadMessages(chatId, 0, 1000);
        if (finalMessages.length > lastMessageCount) {
          setHistoryReloadKey((prev) => prev + 1);
        }

        setIsBackgroundTaskActive(false);
        setIsSessionResuming(false);
      } catch (error) {
        console.error("Error resuming session:", error);
        setIsBackgroundTaskActive(false);
        setIsSessionResuming(false);
      }
    },
    [chatId]
  );

  // Handle active session detection on mount
  useEffect(() => {
    const checkActiveSession = async () => {
      if (!chatId) return;

      try {
        const activeSession = await ChatService.detectActiveSession(chatId);
        // Resume if status is "active" - this means there's an ongoing background task
        if (activeSession && activeSession.status === "active") {
          setIsBackgroundTaskActive(true);
          // Resume active session
          await resumeActiveSession(activeSession);
        } else {
          // If status is "completed" or "idle", no need to resume
          setIsBackgroundTaskActive(false);
        }
      } catch (error) {
        console.error("Error checking active session:", error);
        setIsBackgroundTaskActive(false);
      }
    };

    checkActiveSession();
  }, [chatId, resumeActiveSession]);

  return {
    runtime,
    isSessionResuming,
    isBackgroundTaskActive,
  };
}
