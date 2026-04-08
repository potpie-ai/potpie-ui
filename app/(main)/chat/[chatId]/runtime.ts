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
import MediaService from "@/services/MediaService";
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
    summary?: string;
    command?: string;
    [key: string]: unknown;
  };
  is_complete?: boolean;
  stream_part?: string | null;
  accumulated_stream_part?: string;
  latest_tool_response?: string;
  derived_preview?: string;
  preview_text?: string;
}

interface StreamingToolCallPart extends ToolCallMessagePart {
  streamState?: ToolCallResult;
  result?: ToolCallResult;
  isError?: boolean;
}

const THINK_BLOCK_REGEX = /<think>([\s\S]*?)<\/think>/gi;

const extractThinkingFromText = (
  input: string | null | undefined
): { cleanText: string; extractedThinking: string | null } => {
  const raw = input ?? "";
  if (!raw) {
    return { cleanText: "", extractedThinking: null };
  }

  const thinkingParts: string[] = [];
  const cleanText = raw
    .replace(THINK_BLOCK_REGEX, (_, block: string) => {
      const trimmed = block?.trim?.() ?? "";
      if (trimmed) {
        thinkingParts.push(trimmed);
      }
      return "";
    })
    .replace(/<\/?think>/gi, "");

  return {
    cleanText,
    extractedThinking:
      thinkingParts.length > 0 ? thinkingParts.join("\n\n") : null,
  };
};

type ChronologicalPart =
  | { type: "text"; id: string; text: string }
  | { type: "tool-call-ref"; toolCallId: string };

const toThreadContent = (
  chronologicalParts: ChronologicalPart[],
  toolCallsMap: Map<string, StreamingToolCallPart>,
  thinking?: string | null
): (
  | TextMessagePart
  | ToolCallMessagePart
  | { type: "reasoning"; text: string }
)[] => {
  const content: (
    | TextMessagePart
    | ToolCallMessagePart
    | { type: "reasoning"; text: string }
  )[] = [];

  if (thinking && thinking.trim()) {
    content.push({ type: "reasoning", text: thinking });
  }

  chronologicalParts.forEach((part) => {
    if (part.type === "text") {
      if (part.text) {
        content.push({ type: "text", text: part.text });
      }
      return;
    }

    const tool = toolCallsMap.get(part.toolCallId);
    if (tool?.toolCallId && tool.toolName) {
      content.push(tool);
    }
  });

  return content;
};

const upsertStreamingToolCall = (
  toolCallsMap: Map<string, StreamingToolCallPart>,
  toolCallJson: unknown
): { toolCallId: string; isNew: boolean } | null => {
  try {
    const parsed =
      typeof toolCallJson === "string" ? JSON.parse(toolCallJson) : toolCallJson;
    const {
      call_id,
      tool_name,
      tool_call_details,
      event_type,
      tool_response,
    } = parsed as Record<string, any>;

    if (!call_id || !tool_name) {
      return null;
    }

    const trimToNonEmpty = (value: unknown): string | null => {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    };
    const derivePreviewFromArgs = (
      rawArgsValue: unknown,
      argsTextValue?: string
    ): string | null => {
      const candidatesFromObj = (obj: Record<string, unknown>): string | null => {
        const candidates = [
          obj.file_path,
          obj.file_paths,
          obj.path,
          obj.paths,
          obj.file,
          obj.target,
          obj.query,
          obj.pattern,
          obj.symbol,
          obj.command,
          obj.search_term,
        ];
        for (const candidate of candidates) {
          if (typeof candidate === "string" && candidate.trim()) {
            return candidate.trim();
          }
          if (Array.isArray(candidate) && candidate.length > 0) {
            const asStrings = candidate
              .filter((item) => typeof item === "string")
              .map((item) => item.trim())
              .filter(Boolean);
            if (asStrings.length > 0) {
              return asStrings.join(", ");
            }
          }
        }
        return null;
      };

      if (rawArgsValue && typeof rawArgsValue === "object") {
        const fromObject = candidatesFromObj(rawArgsValue as Record<string, unknown>);
        if (fromObject) return fromObject;
      }

      if (typeof rawArgsValue === "string") {
        try {
          const parsed = JSON.parse(rawArgsValue) as Record<string, unknown>;
          const fromParsed = candidatesFromObj(parsed);
          if (fromParsed) return fromParsed;
        } catch {
          const compact = rawArgsValue.replace(/\s+/g, " ").trim();
          if (compact) return compact.length > 140 ? `${compact.slice(0, 137)}...` : compact;
        }
      }

      if (argsTextValue) {
        try {
          const parsed = JSON.parse(argsTextValue) as Record<string, unknown>;
          const fromParsed = candidatesFromObj(parsed);
          if (fromParsed) return fromParsed;
        } catch {
          // ignore parse errors for partial stream payloads
        }
      }

      return null;
    };
    const selectPreview = ({
      latestToolResponse,
      derivedPreview,
      argsTextValue,
    }: {
      latestToolResponse?: string | null;
      derivedPreview?: string | null;
      argsTextValue?: string;
    }): string => {
      const normalizedResponse = trimToNonEmpty(latestToolResponse);
      if (normalizedResponse) return normalizedResponse;
      const normalizedDerived = trimToNonEmpty(derivedPreview);
      if (normalizedDerived) return normalizedDerived;
      const normalizedArgs = trimToNonEmpty(argsTextValue);
      if (normalizedArgs) return normalizedArgs;
      return "Calling tool...";
    };

    const rawArgs = tool_call_details?.arguments;
    const rawCommand = tool_call_details?.command;
    const rawStreamPart = parsed.stream_part;
    const streamPart =
      typeof rawStreamPart === "string" ? rawStreamPart : null;
    const isComplete =
      typeof parsed.is_complete === "boolean" ? parsed.is_complete : undefined;
    const command =
      typeof rawCommand === "string" && rawCommand.trim()
        ? rawCommand.trim()
        : null;
    const hadEntry = toolCallsMap.has(call_id);
    const previous =
      toolCallsMap.get(call_id) ??
      ({
        type: "tool-call" as const,
        toolCallId: call_id,
        toolName: tool_name,
        args:
          typeof rawArgs === "object" && rawArgs !== null
            ? rawArgs
            : command
              ? { command }
              : {},
        argsText:
          typeof rawArgs === "string"
            ? rawArgs
            : command
              ? command
              : streamPart
                ? streamPart
                : JSON.stringify(rawArgs ?? {}, null, 2),
      } as StreamingToolCallPart);

    const normalizedEventType =
      typeof event_type === "string" ? event_type.toLowerCase() : "";
    const isDeltaEvent = normalizedEventType.includes("delta");
    const previousEventType = (previous.streamState as ToolCallResult | undefined)
      ?.event_type;
    const previousWasDelta =
      typeof previousEventType === "string"
        ? previousEventType.toLowerCase().includes("delta")
        : false;
    const shouldAccumulateDelta =
      isDeltaEvent &&
      typeof streamPart === "string" &&
      streamPart.trim().length > 0 &&
      isComplete !== true;
    const resetOnFirstDelta = shouldAccumulateDelta && !previousWasDelta;

    const argsValue =
      rawArgs === undefined
        ? command
          ? { command }
          : previous.args
        : typeof rawArgs === "object" && rawArgs !== null
          ? rawArgs
          : {};

    const argsTextValue =
      rawArgs === undefined
        ? command
          ? command
          : streamPart
            ? (shouldAccumulateDelta
                ? resetOnFirstDelta
                  ? streamPart
                  : hadEntry && typeof previous.argsText === "string"
                    ? previous.argsText === "{}"
                      ? streamPart
                      : previous.argsText + streamPart
                    : streamPart
                : previous.argsText)
            : previous.argsText
        : typeof rawArgs === "string"
          ? rawArgs
          : JSON.stringify(rawArgs, null, 2);

    const previousStreamState = previous.streamState as ToolCallResult | undefined;
    const previousAccumulated =
      typeof (previous.streamState as ToolCallResult | undefined)
        ?.accumulated_stream_part === "string"
        ? (previous.streamState as ToolCallResult).accumulated_stream_part
        : "";

    const accumulated_stream_part = shouldAccumulateDelta
      ? resetOnFirstDelta
        ? streamPart ?? previousAccumulated
        : (previousAccumulated ?? "") + (streamPart ?? "")
      : previousAccumulated;

    const latestToolResponse =
      trimToNonEmpty(tool_response) ??
      trimToNonEmpty(previousStreamState?.latest_tool_response) ??
      trimToNonEmpty(previousStreamState?.response) ??
      null;
    const derivedPreview =
      derivePreviewFromArgs(rawArgs, argsTextValue) ??
      trimToNonEmpty(previousStreamState?.derived_preview);
    const previewText = selectPreview({
      latestToolResponse,
      derivedPreview,
      argsTextValue,
    });

    const streamState: ToolCallResult = {
      event_type,
      response: latestToolResponse ?? "",
      details: tool_call_details,
      is_complete: isComplete,
      stream_part: streamPart,
      accumulated_stream_part: accumulated_stream_part,
      latest_tool_response: latestToolResponse ?? undefined,
      derived_preview: derivedPreview ?? undefined,
      preview_text: previewText,
    };

    const next: StreamingToolCallPart = {
      ...previous,
      streamState,
      toolName: tool_name,
      args: argsValue,
      argsText: argsTextValue,
    };

    if (
      event_type === "result" ||
      event_type === "delegation_result" ||
      event_type === "error"
    ) {
      next.result = streamState;
      next.isError = event_type === "error";
    } else {
      next.result = undefined;
      next.isError = false;
    }

    toolCallsMap.set(call_id, next);
    return { toolCallId: call_id, isNew: !hadEntry };
  } catch {
    return null;
  }
};

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

// Pre-uploaded attachment IDs (composer local id -> server id) so the stream
// can send attachment_ids even when the thread message no longer carries File blobs.
const attachmentLocalIdToServerId = new Map<string, string>();

const getAttachmentKind = (
  file: File
): "image" | "document" | "file" => {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  const lowerName = file.name.toLowerCase();
  if (
    lowerName.endsWith(".pdf") ||
    lowerName.endsWith(".doc") ||
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".json") ||
    lowerName.endsWith(".xml") ||
    lowerName.endsWith(".yaml") ||
    lowerName.endsWith(".yml")
  ) {
    return "document";
  }

  return "file";
};

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
          chronologicalParts: ChronologicalPart[],
          toolCallsMap: Map<string, StreamingToolCallPart>,
          accumulatedThinking?: string | null
        ) => {
          const chunk = {
            content: toThreadContent(
              chronologicalParts,
              toolCallsMap,
              accumulatedThinking
            ),
          };
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
        let lastMessageLength = 0;
        let textPartCounter = 0;
        const chronologicalParts: ChronologicalPart[] = [];

        // 2. Start the backend call
        ChatService.resumeWithCursor(
          chatId,
          sessionId,
          cursor,
          (message, tool_calls, thinking) => {
            const { cleanText, extractedThinking } = extractThinkingFromText(message);
            if (thinking !== undefined) {
              accumulatedThinking = thinking ?? null;
            } else if (extractedThinking) {
              accumulatedThinking = extractedThinking;
            }

            if (cleanText.length > lastMessageLength) {
              const textDelta = cleanText.slice(lastMessageLength);
              lastMessageLength = cleanText.length;
              const lastPart = chronologicalParts.at(-1);
              if (lastPart?.type === "text") {
                lastPart.text += textDelta;
              } else {
                chronologicalParts.push({
                  type: "text",
                  id: `resume-text-${textPartCounter++}`,
                  text: textDelta,
                });
              }
            } else {
              lastMessageLength = cleanText.length;
            }

            tool_calls.forEach((toolCallJson) => {
              const upsertResult = upsertStreamingToolCall(
                accumulatedToolCalls,
                toolCallJson
              );
              if (!upsertResult) {
                console.error("Error processing tool call during resume");
                return;
              }
              if (upsertResult.isNew) {
                chronologicalParts.push({
                  type: "tool-call-ref",
                  toolCallId: upsertResult.toolCallId,
                });
              }
            });

            // Push the current state to the queue
            pushToQueue(
              chronologicalParts,
              accumulatedToolCalls,
              accumulatedThinking
            );
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

      // Extract custom config (selectedNodes and attachmentIds)
      interface RunConfig {
        custom?: {
          selectedNodes?: unknown[];
          attachmentIds?: string[];
        };
      }
      const runConfig = (context as { runConfig?: RunConfig }).runConfig;
      const selectedNodes =
        (runConfig?.custom?.selectedNodes as unknown[]) || [];
      const runConfigAttachmentIds =
        (runConfig?.custom?.attachmentIds as string[]) || [];

      const userMessage = lastMessage as ThreadUserMessage;
      const userAttachments = userMessage.attachments ?? [];

      // Server IDs from adapter pre-upload (see createAttachmentsAdapter.send)
      const serverIdsFromPreUpload = userAttachments
        .map((a) => attachmentLocalIdToServerId.get(a.id))
        .filter((id): id is string => !!id);

      const mergedAttachmentIds = [
        ...new Set([...runConfigAttachmentIds, ...serverIdsFromPreUpload]),
      ];

      // Extract File objects for multipart upload, skipping attachments that were
      // already uploaded in send() (avoids double upload on the backend).
      const images: File[] = [];
      if (isMultimodalEnabled() && lastMessage.role === "user") {
        userAttachments.forEach((attachment) => {
          if (
            attachment.type !== "image" &&
            attachment.type !== "file" &&
            attachment.type !== "document"
          ) {
            return;
          }
          if (attachmentLocalIdToServerId.has(attachment.id)) {
            return;
          }
          if ("file" in attachment && attachment.file) {
            images.push(attachment.file);
          }
        });
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
        let lastMessageLength = 0;
        let textPartCounter = 0;
        const chronologicalParts: ChronologicalPart[] = [];
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

            const { cleanText, extractedThinking } = extractThinkingFromText(message);
            // Update accumulated state
            accumulatedText = cleanText;
            if (cleanText.length > lastMessageLength) {
              const textDelta = cleanText.slice(lastMessageLength);
              lastMessageLength = cleanText.length;
              const lastPart = chronologicalParts.at(-1);
              if (lastPart?.type === "text") {
                lastPart.text += textDelta;
              } else {
                chronologicalParts.push({
                  type: "text",
                  id: `stream-text-${textPartCounter++}`,
                  text: textDelta,
                });
              }
            } else {
              lastMessageLength = cleanText.length;
            }
            if (thinking !== undefined) {
              accumulatedThinking = thinking ?? null;
            } else if (extractedThinking) {
              accumulatedThinking = extractedThinking;
            }

            tool_calls.forEach((toolCallJson) => {
              const upsertResult = upsertStreamingToolCall(
                accumulatedToolCalls,
                toolCallJson
              );
              if (!upsertResult) {
                console.warn("Error parsing tool call");
                return;
              }
              if (upsertResult.isNew) {
                chronologicalParts.push({
                  type: "tool-call-ref",
                  toolCallId: upsertResult.toolCallId,
                });
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
          abortSignal ?? undefined,
          mergedAttachmentIds
        )
          .then((result) => {
            userAttachments.forEach((a) =>
              attachmentLocalIdToServerId.delete(a.id)
            );
            // Store final session ID
            streamingStateRef.current.sessionId = result.sessionId;
            streamingStateRef.current.isStreaming = false;
            return result;
          })
          .catch((error) => {
            userAttachments.forEach((a) =>
              attachmentLocalIdToServerId.delete(a.id)
            );
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

              yield {
                content: toThreadContent(
                  chronologicalParts,
                  accumulatedToolCalls,
                  accumulatedThinking
                ) as readonly (
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
                content: toThreadContent(
                  chronologicalParts,
                  accumulatedToolCalls,
                  accumulatedThinking
                ) as readonly (
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

/** API may return attachment_type as enum string; also allow document+image/* from mis-tagged uploads */
function isImageLikeAttachment(att: {
  attachment_type?: string;
  mime_type?: string;
}): boolean {
  const t = String(att.attachment_type ?? "").toLowerCase();
  const mime = String(att.mime_type ?? "").toLowerCase();
  return t === "image" || mime.startsWith("image/");
}

/** Signed URLs are absolute; fallback paths need the API origin */
function resolveAttachmentDownloadUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base =
    process.env.NEXT_PUBLIC_CONVERSATION_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "";
  if (!base) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base.replace(/\/$/, "")}${path}`;
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

    // Loaded API attachments: images go into message *content* parts so
    // MessagePrimitive.Parts (Image) renders them. Non-image files use the
    // attachments array for UserMessageAttachments tiles (PDF, etc.).
    if (msg.has_attachments && msg.attachments && msg.attachments.length > 0) {
      const attachmentList = msg.attachments as Array<{
        attachment_type?: string;
        mime_type?: string;
        download_url?: string;
        file_name?: string;
      }>;
      let docIndex = 0;
      attachmentList.forEach((attachment) => {
        const rawUrl = attachment.download_url as string | undefined;
        if (!rawUrl) return;
        const displayUrl = resolveAttachmentDownloadUrl(rawUrl);
        if (isImageLikeAttachment(attachment)) {
          content.push({
            type: "image",
            image: displayUrl,
          });
          return;
        }
        attachments.push({
          id: `${msg.id}-doc-${docIndex++}`,
          type: "document",
          name: attachment.file_name || "Attachment",
          contentType: attachment.mime_type || "application/octet-stream",
          status: { type: "complete" },
          content: [],
        });
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

  const { cleanText: cleanAssistantText, extractedThinking } = extractThinkingFromText(
    msg.text || ""
  );
  const resolvedThinking = msg.thinking?.trim() || extractedThinking;
  if (resolvedThinking && resolvedThinking.trim()) {
    assistantContent.push({ type: "reasoning", text: resolvedThinking });
  }
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    const uniqueToolCalls = dedupeToolCalls(msg.tool_calls);
    assistantContent.push(...uniqueToolCalls.map(apiToolCallToPart));
  }
  assistantContent.push({ type: "text", text: cleanAssistantText || "" });

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
    accept:
      ".doc,.docx,.pdf,.txt,.md,.csv,.json,.xml,.yaml,.yml,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg",
    async add({ file }: { file: File }): Promise<PendingAttachment> {
      // Create object URL for preview
      const objectUrl = URL.createObjectURL(file);
      const attachmentId = crypto.randomUUID();
      const attachmentType = getAttachmentKind(file);

      // Store the URL so we can revoke it later
      objectUrls.set(attachmentId, objectUrl);

      // Return the pending attachment object
      const attachment: PendingAttachment = {
        id: attachmentId,
        type: attachmentType,
        name: file.name,
        contentType: file.type,
        status: { type: "requires-action", reason: "composer-send" },
        file,
        content:
          attachmentType === "image"
            ? [
                {
                  type: "image",
                  image: objectUrl,
                },
              ]
            : [],
      };

      return attachment;
    },
    async remove(attachment: PendingAttachment) {
      attachmentLocalIdToServerId.delete(attachment.id);
      // Revoke the object URL to free memory
      const objectUrl = objectUrls.get(attachment.id);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrls.delete(attachment.id);
      }
      return Promise.resolve();
    },
    async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
      if (attachment.file && isMultimodalEnabled()) {
        try {
          const result = await MediaService.uploadFile(attachment.file);
          attachmentLocalIdToServerId.set(attachment.id, result.id);
        } catch (err) {
          console.error(
            "[AttachmentsAdapter] Pre-upload failed; will retry via FormData if the file is still on the message:",
            err
          );
        }
      }

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
    if (!pendingMessage?.text || !chatId || hasSentPendingMessage.current) {
      return;
    }

    console.log(
      "[PendingMessage] Detected pending message, sending via runtime:",
      pendingMessage.text
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

        composer.setText(pendingMessage.text);
        if (pendingMessage.attachmentIds?.length) {
          composer.setRunConfig({
            custom: {
              attachmentIds: pendingMessage.attachmentIds,
            },
          });
        }

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