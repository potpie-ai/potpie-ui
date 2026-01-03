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
}

interface StreamingToolCallPart extends ToolCallMessagePart {
  streamState?: ToolCallResult;
  result?: ToolCallResult;
  isError?: boolean;
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
  isBackgroundTaskActiveRef: React.MutableRefObject<boolean>,
): ChatModelAdapter => {
  return {
    async *run({ messages, abortSignal, context }: ChatModelRunOptions) {
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
            if (attachment.type === "image" && "file" in attachment && attachment.file) {
              images.push(attachment.file);
            }
          });
        }
      }

      // Convert callback-based ChatService to async iterable
      const streamAsyncIterable = async function* () {
        let accumulatedText = "";
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
          (message: string, tool_calls: any[], citations: string[]) => {
            if (abortSignal?.aborted || aborted) return;

            // Update accumulated state
            accumulatedText = message;

            tool_calls.forEach((toolCallJson) => {
              try {
                // Detect whether toolCallJson is a string or already an object
                const parsed = typeof toolCallJson === "string" 
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
              streamPromise.then(() => { streamFinished = true; }),
            ]);

            // Check if we were aborted during the wait
            if (aborted) {
              break;
            }

            if (hasUpdate && !aborted) {
              hasUpdate = false;
              
              // Yield current accumulated state
              yield {
                content: [
                  ...Array.from(accumulatedToolCalls.values()),
                  ...(accumulatedText
                    ? [{ type: "text" as const, text: accumulatedText }]
                    : []),
                ] as readonly (TextMessagePart | ToolCallMessagePart)[],
              };
            }
          }
          
          // Final yield after stream completes to ensure all content is sent
          if (!aborted && accumulatedText) {
            yield {
              content: [
                ...Array.from(accumulatedToolCalls.values()),
                ...(accumulatedText
                  ? [{ type: "text" as const, text: accumulatedText }]
                  : []),
              ] as readonly (TextMessagePart | ToolCallMessagePart)[],
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

  // Prepare attachments array for Assistant UI
  const attachments: CompleteAttachment[] = [];

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
      attachments, // Now populated with actual attachments
      metadata: {
        custom: {},
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
export function useChatRuntime(chatId: string | null | undefined): ChatRuntimeResult {
  // Local state for session management (no Redux)
  const [isSessionResuming, setIsSessionResuming] = useState(false);
  const [isBackgroundTaskActive, setIsBackgroundTaskActive] = useState(false);
  
  // Use ref for the adapter to avoid stale closure issues
  const isBackgroundTaskActiveRef = useRef(isBackgroundTaskActive);
  useEffect(() => {
    isBackgroundTaskActiveRef.current = isBackgroundTaskActive;
  }, [isBackgroundTaskActive]);

  // Resume active session helper
  const resumeActiveSession = useCallback(
    async (sessionInfo: SessionInfo) => {
      try {
        if (!chatId) return;

        setIsSessionResuming(true);

        // Resume the session stream from backend
        await ChatService.resumeActiveSession(
          chatId,
          sessionInfo.sessionId,
          (message: string, tool_calls: any[], citations: string[]) => {
            // The history adapter will reload messages after resume completes
            // This callback handles streaming updates during resume
          }
        );

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
        if (activeSession && activeSession.status === "active") {
          setIsBackgroundTaskActive(true);
          // Resume active session
          await resumeActiveSession(activeSession);
        }
      } catch (error) {
        console.error("Error checking active session:", error);
      }
    };

    checkActiveSession();
  }, [chatId, resumeActiveSession]);

  // Create the chat adapter - use ref to avoid recreation on state change
  const adapter = useMemo(() => {
    const safeChatId: string = (chatId || "") as string;
    return createChatAdapter(safeChatId, isBackgroundTaskActiveRef);
  }, [chatId]); // Only recreate when chatId changes, not backgroundTaskActive

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

  const onMessage = async (message: string) => {
    const userMessage: ThreadMessageLike = {
      role: "user",
      content: [{ type: "text", text: message }],
    };
    setIsRunning(true);
    setMessages((currentMessages) => [...currentMessages, userMessage]);

    setMessages((currentMessages) => {
      return [...currentMessages, getMessageFromText(undefined, "")];
    });
    await ChatService.streamMessage(
      chatId,
      message,
      [], // @ts-ignore
      [], // No images for this function
      (message: string, tool_calls: any[]) => {
        setIsRunning(false);
        setExtras({ loading: false, streaming: true, error: false });

        setMessages((currentMessages) => {
          return [
            ...currentMessages.slice(0, -1),
            getMessageFromText(currentMessages.at(-1)?.id, message, tool_calls),
          ];
        });
      }
    );
    setIsRunning(false);
    setExtras({ loading: false, streaming: false, error: false });
  };

  const onNew = async (message: AppendMessage) => {
    // Prevent new messages during background tasks
    if (backgroundTaskActive) {
      console.warn("Cannot send message while background task is active");
      return;
    }

    // Extract text content
    const textContent = message.content.find(c => c.type === "text");
    if (!textContent) {
      throw new Error("Message must contain text content");
    }

    // Only extract images if multimodal enabled
    const images: File[] = isMultimodalEnabled()
      ? (message.runConfig?.custom?.images as File[]) || []
      : [];

    // Create image content for display (only if enabled)
    const imageContent = isMultimodalEnabled()
      ? images.map(image => ({
          type: "image" as const,
          image: URL.createObjectURL(image)
        }))
      : [];

    // Create user message with both text and images
    const userMessage: ThreadMessageLike = {
      role: "user",
      content: [
        { type: "text", text: textContent.text },
        ...imageContent
      ],
    };
    setIsRunning(true);
    setMessages((currentMessages) => [...currentMessages, userMessage]);

    setMessages((currentMessages) => {
      return [...currentMessages, getMessageFromText(undefined, "")];
    });
    try {
      await ChatService.streamMessage(
        chatId,
        textContent.text,
        (message.runConfig?.custom?.selectedNodes as any[]) || [],
        images, // Pass images to the service
        (message: string, tool_calls: any[]) => {
          setIsRunning(false);
          setExtras({ loading: false, streaming: true, error: false });

          setMessages((currentMessages) => {
            return [
              ...currentMessages.slice(0, -1),
              getMessageFromText(
                currentMessages.at(-1)?.id,
                message,
                tool_calls
              ),
            ];
          });
        }
      );
    } catch (error) {
      setIsRunning(false);
      setExtras({
        loading: false,
        streaming: false,
        error: true,
      });
      console.error("Error streaming message:", error);
      return;
    }
    setIsRunning(false);
    setExtras({ loading: false, streaming: false, error: false });
  };

  const onReload = async (parentId: string | null) => {
    setIsRunning(true);
    try {
      await ChatService.regenerateMessage(
        chatId,
        [],
        (message: string, tool_calls: any[]) => {
          setIsRunning(false);
          setExtras({ loading: false, streaming: true, error: false });
          setMessages((currentMessages) => {
            return [
              ...currentMessages.slice(0, -1),
              getMessageFromText(
                currentMessages.at(-1)?.id,
                message,
                tool_calls
              ),
            ];
          });
        }
      );
    } catch (error) {
      setIsRunning(false);
      setExtras({
        loading: false,
        streaming: false,
        error: true,
      });
      console.error("Error streaming message:", error);
      return;
    }
    setIsRunning(false);
    setExtras({ loading: false, streaming: false, error: false });
  };

  // Create a wrapper for setMessages that accepts readonly arrays
  const setMessagesWrapper = (newMessages: readonly ThreadMessageLike[]) => {
    setMessages([...newMessages]);
  };

  return useExternalStoreRuntime<ThreadMessageLike>({
    isRunning,
    messages,
    extras,
    setMessages: setMessagesWrapper,
    onNew,
    onReload,
    convertMessage,
  });

  return {
    runtime,
    isSessionResuming,
    isBackgroundTaskActive,
  };
}
