"use client";
import {
  ActionBarPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useThreadRuntime,
  useMessage,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import type { PropsWithChildren } from "react";
import {
  useEffect,
  useMemo,
  useState,
  useRef,
  type FC,
  useCallback,
} from "react";
import {
  AlertTriangle,
  ArrowDownIcon,
  CheckIcon,
  CopyIcon,
  RefreshCwIcon,
  Loader,
} from "lucide-react";
import { isMultimodalEnabled } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import {
  MarkdownText,
  StandaloneMarkdown,
} from "@/components/assistant-ui/markdown-text";
import { UserMessageAttachments } from "@/components/assistant-ui/attachment";
import MessageComposer from "./MessageComposer";
import { motion } from "motion/react";
import {
  Accordion,
  AccordionTrigger,
  AccordionContent,
  AccordionItem,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Reasoning, ReasoningGroup } from "@/components/assistant-ui/reasoning";

interface ThreadProps {
  projectId: string;
  writeDisabled: boolean;
  userImageURL: string;
  conversation_id: string;
  isSessionResuming: boolean;
  isBackgroundTaskActive: boolean;
  hasPendingMessage?: boolean; // New prop to detect pending message
}

export const Thread: FC<ThreadProps> = ({
  projectId,
  writeDisabled,
  userImageURL,
  conversation_id,
  isSessionResuming,
  isBackgroundTaskActive,
  hasPendingMessage = false,
}) => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const runtime = useThreadRuntime();

  // Move useMemo before any early returns to satisfy React Hooks rules
  const userMessage = useMemo(() => {
    const UserMessageComponent = () => (
      <UserMessage userPhotoURL={userImageURL} />
    );
    UserMessageComponent.displayName = "UserMessageComponent";
    return UserMessageComponent;
  }, [userImageURL]);

  useEffect(() => {
    const state = runtime.getState();
    const messagesLoaded = Array.isArray(state.messages) && state.messages.length > 0;
    const isEmptyChat = Array.isArray(state.messages) && state.messages.length === 0;

    // If messages have actual content, we're no longer in initial loading
    if (messagesLoaded) {
      setIsInitialLoading(false);
      return;
    }

    // If empty array AND has pending message, keep loading to avoid showing empty chat
    if (isEmptyChat && hasPendingMessage) {
      return;
    }

    // Safety timeout: Clear loading after 10 seconds if history never loads
    const timeoutId = setTimeout(() => {
      setIsInitialLoading((prev) => {
        if (prev) {
          return false;
        }
        return prev;
      });
    }, 10000);

    // Subscribe to runtime changes
    const unsubscribe = runtime.subscribe(() => {
      const nextState = runtime.getState();

      if (Array.isArray(nextState.messages) && nextState.messages.length > 0) {
        clearTimeout(timeoutId);
        setIsInitialLoading(false);
        unsubscribe();
        return;
      }

      if (Array.isArray(nextState.messages) && nextState.messages.length === 0) {
        setTimeout(() => {
          const finalState = runtime.getState();
          if (Array.isArray(finalState.messages) && finalState.messages.length === 0) {
            if (hasPendingMessage) {
              return;
            }
            clearTimeout(timeoutId);
            setIsInitialLoading(false);
            unsubscribe();
          }
        }, 500);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [runtime, hasPendingMessage]);

  // Watch for message additions to clear loading when pending message sends
  useEffect(() => {
    if (!hasPendingMessage || !isInitialLoading) {
      return;
    }

    const unsubscribe = runtime.subscribe(() => {
      const state = runtime.getState();
      const messageCount = Array.isArray(state.messages) ? state.messages.length : 0;

      if (messageCount > 0) {
        setIsInitialLoading(false);
        unsubscribe();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [hasPendingMessage, isInitialLoading, runtime]);

  return (
    <ThreadPrimitive.Root className="px-10 bg-background box-border h-full text-sm flex justify-center items-center">
      <div className="h-full w-full bg-background">
        {(() => {
          if (isInitialLoading) {
            return (
              <div className="flex items-center justify-center h-full space-x-1 mt-2">
                <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse"></span>
                <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-100"></span>
                <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-200"></span>
              </div>
            );
          } else {
            return (
          <>
            {/* Built-in loading state - no manual state needed */}
            <ThreadPrimitive.If empty>
              <div className="w-full h-full flex justify-center items-center">
                <ThreadWelcome showSuggestions={!writeDisabled} />
              </div>
            </ThreadPrimitive.If>

            <ThreadPrimitive.If empty={false}>
              <ThreadPrimitive.Viewport className="flex h-[calc(100%-80px)] flex-col items-center bg-background overflow-hidden overflow-y-scroll scroll-smooth inset-0 from-white via-transparent to-white [mask-image:linear-gradient(to_bottom,transparent_0%,white_5%,white_95%,transparent_100%)] thread-viewport">
                <div className="pb-36 bg-inherit min-w-96 w-full">
                  <ThreadPrimitive.Messages
                    components={{
                      UserMessage: userMessage,
                      AssistantMessage: AssistantMessage,
                    }}
                  />
                </div>
              </ThreadPrimitive.Viewport>
            </ThreadPrimitive.If>

            <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center justify-center">
              <ThreadScrollToBottom />
              <Composer
                projectId={projectId}
                disabled={writeDisabled}
                conversation_id={conversation_id}
              />
            </div>
          </>
            );
          }
        })()}
      </div>
    </ThreadPrimitive.Root>
  );
};

const ThreadWelcome: FC<{ showSuggestions: boolean }> = ({
  showSuggestions,
}) => {
  return (
    <ThreadPrimitive.Empty>
      <div className="flex w-full h-full max-w-[var(--thread-max-width)] flex-grow flex-col">
        <div className="flex w-full flex-grow flex-col items-center justify-center">
          <Avatar className="rounded-none">
            <AvatarImage src="/images/logo.svg" alt="Agent" />
            <AvatarFallback className="bg-transparent">P</AvatarFallback>
          </Avatar>
          <p className="mt-4 font-medium">How can I help you today?</p>
          {showSuggestions && (
            <div className="mt-16">
              <ThreadWelcomeSuggestions />
            </div>
          )}
        </div>
      </div>
    </ThreadPrimitive.Empty>
  );
};

const ThreadWelcomeSuggestions: FC = () => {
  return (
    <div className="mt-3 flex w-full items-stretch justify-center gap-4">
      <ThreadPrimitive.Suggestion
        className="hover:bg-slate-300/20 flex max-w-sm min-w-fit basis-0 flex-col items-center justify-center rounded-full border border-neutral-400/20 p-3 transition-colors ease-in"
        prompt="What does this repo do?"
        method="replace"
      >
        <span className="line-clamp-2 text-ellipsis text-sm">
          What does this repo do?
        </span>
      </ThreadPrimitive.Suggestion>
      <ThreadPrimitive.Suggestion
        className="hover:bg-slate-300/20 flex max-w-sm min-w-fit basis-0 flex-col items-center justify-center rounded-full p-3 border border-neutral-400/20 transition-colors ease-in"
        prompt="How do i add integration tests to @somefile.ext?"
        method="replace"
      >
        <span className="line-clamp-2 text-ellipsis text-sm">
          How do i add integration tests to @ ?
        </span>
      </ThreadPrimitive.Suggestion>
      <ThreadPrimitive.Suggestion
        className="hover:bg-slate-300/20 flex max-w-sm min-w-fit basis-0 flex-col items-center justify-center rounded-full p-3 border border-neutral-400/20 transition-colors ease-in"
        prompt="Write a typescript client for the router at @"
        method="replace"
      >
        <span className="line-clamp-2 text-ellipsis text-sm">
          Write a typescript client for the router at @
        </span>
      </ThreadPrimitive.Suggestion>
    </div>
  );
};

const Composer: FC<{
  projectId: string;
  disabled: boolean;
  conversation_id: string;
}> = ({ projectId, disabled, conversation_id }) => {
  // REMOVED: Manual runtime subscriptions and state
  // REMOVED: isStreaming check - assistant-ui handles this

  return (
    <ComposerPrimitive.Root className="bg-background z-10 w-3/4 focus-within:border-ring/50 flex flex-wrap items-end rounded-lg border px-2.5 shadow-xl focus-within:shadow-2xl transition-all ease-in-out">
      <MessageComposer
        projectId={projectId}
        conversation_id={conversation_id}
        disabled={disabled}
      />
    </ComposerPrimitive.Root>
  );
};

const UserMessage: FC<{ userPhotoURL: string }> = ({ userPhotoURL }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex items-center justify-end w-full"
    >
      <MessagePrimitive.Root className="w-auto pr-5 grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 [&:where(>*)]:col-start-2 max-w-[var(--thread-max-width)] py-4">
        <div className="bg-gray-100 text-black max-w-[calc(var(--thread-max-width)*0.8)] break-words rounded-3xl px-5 py-2.5 col-start-2 row-start-2">
          {/* Display attachments using assistant-ui component */}
          {isMultimodalEnabled() && <UserMessageAttachments />}

          <MessagePrimitive.Parts
            components={{
              Image: () => null, //UserMessageAttachments already handles images
            }}
          />
        </div>
      </MessagePrimitive.Root>
      <Avatar className="mr-4 rounded-md bg-transparent">
        <AvatarImage src={userPhotoURL} alt="User" />
        <AvatarFallback className="bg-gray-400 text-white">U</AvatarFallback>
      </Avatar>
    </motion.div>
  );
};

const ThreadScrollToBottom: FC = () => {
  const threadRuntime = useThreadRuntime();
  const [showButton, setShowButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const checkScrollPosition = useCallback(() => {
    const viewport = document.querySelector(".thread-viewport");
    if (!viewport) return;

    const { scrollTop, scrollHeight, clientHeight } = viewport as HTMLElement;
    const isBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 20;
    setIsAtBottom(isBottom);
    setShowButton(!isBottom);
  }, []);

  useEffect(() => {
    const viewport = document.querySelector(".thread-viewport");
    if (!viewport) return;

    viewport.addEventListener("scroll", checkScrollPosition);
    return () => viewport.removeEventListener("scroll", checkScrollPosition);
  }, [checkScrollPosition]);

  const scrollToBottom = () => {
    const viewport = document.querySelector(".thread-viewport");
    if (!viewport) return;

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth",
    });
  };

  if (!showButton) return null;

  return (
    <button
      onClick={scrollToBottom}
      className="mb-2 p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
      aria-label="Scroll to bottom"
    >
      <ArrowDownIcon className="h-5 w-5" />
    </button>
  );
};

// Custom ToolCall component for assistant-ui
interface ToolCallStreamState {
  event_type: string;
  response: string; // Maps to tool_response from API (status message)
  details: { summary: string }; // Maps to tool_call_details.summary from API
  accumulated_response?: string; // Accumulated from stream_part chunks
  is_complete?: boolean; // Whether this is the final part
  is_streaming?: boolean; // Whether this tool call is currently streaming
}

const CustomToolCall: ToolCallMessagePartComponent = ({
  toolCallId,
  toolName,
  argsText,
  result,
}) => {
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default
  const threadRuntime = useThreadRuntime();

  // Get the full message to access the complete tool call part with streamState
  const message = useMessage();
  const toolCallPart = message.content.find(
    (c) => c.type === "tool-call" && (c as any).toolCallId === toolCallId
  ) as any;

  // Extract tool call state - check streamState first (for streaming), then result (for completed)
  const streamState = toolCallPart?.streamState as
    | ToolCallStreamState
    | undefined;
  const resultState = result as any as ToolCallStreamState | undefined;
  // Use streamState if available (current streaming state), otherwise use resultState (final state)
  const currentState = streamState ?? resultState;

  // Track call and result events separately
  // According to API docs:
  // - "call" event: tool_response = status message, summary = what tool will do
  // - "result" event: tool_response = completion message, summary = result details, stream_part = streaming content
  const [callState, setCallState] = useState<ToolCallStreamState | null>(null);
  const [resultStateLocal, setResultStateLocal] =
    useState<ToolCallStreamState | null>(null);

  // Update state based on event_type from the current state
  useEffect(() => {
    if (!currentState) return;

    const eventType = currentState.event_type || "";

    if (eventType === "call" || eventType === "delegation_call") {
      setCallState(currentState);
    } else if (eventType === "result" || eventType === "delegation_result") {
      setResultStateLocal(currentState);
    }
  }, [currentState]);

  // Use accumulated_response if streaming, otherwise use response
  const isStreamingFromState = currentState?.is_streaming ?? false;
  const isComplete =
    currentState?.is_complete !== undefined ? currentState.is_complete : true;
  const eventType = currentState?.event_type || "";

  // Status messages (tool_response from API)
  const callStatusMessage = callState?.response || "";
  const resultStatusMessage = resultStateLocal?.response || "";

  // Detailed summaries (tool_call_details.summary from API)
  const callSummary = callState?.details?.summary || "";
  const resultSummary = resultStateLocal?.details?.summary || "";

  // Streaming content (accumulated stream_part)
  const streamingContent = resultStateLocal?.accumulated_response || "";

  const isError = toolCallPart?.isError ?? currentState?.event_type === "error";
  const isCompleted =
    (eventType === "result" ||
      eventType === "delegation_result" ||
      isComplete) &&
    !isError;
  const hasCallInfo = !!(callStatusMessage || callSummary);
  const hasResultInfo = !!(
    resultStatusMessage ||
    resultSummary ||
    streamingContent
  );

  // Track thread running state
  const [threadIsRunning, setThreadIsRunning] = useState(false);

  // Subscribe to thread runtime to track streaming state
  useEffect(() => {
    if (!message.isLast) {
      setThreadIsRunning(false);
      return;
    }

    const unsubscribe = threadRuntime.subscribe(() => {
      const runtimeState = threadRuntime.getState();
      const lastMessage = runtimeState.messages.at(-1);
      const running = lastMessage?.id === message.id && runtimeState.isRunning;
      setThreadIsRunning(running);
    });

    // Set initial state
    const initialState = threadRuntime.getState();
    const lastMessage = initialState.messages.at(-1);
    const running = lastMessage?.id === message.id && initialState.isRunning;
    setThreadIsRunning(running);

    return unsubscribe;
  }, [message.isLast, message.id, threadRuntime]);

  // Check if streaming is ongoing for this tool call
  // Streaming if: has streamState (actively receiving updates), not completed, not error, and thread is running
  // Also check the is_streaming flag from the state
  const isToolCallStreaming =
    (isStreamingFromState || (!!streamState && !isCompleted && !isError)) &&
    message.isLast &&
    threadIsRunning;

  // Deduplicate status messages - if result message is same as call message, don't show both
  const showCallStatus =
    callStatusMessage && callStatusMessage !== resultStatusMessage;
  const showResultStatus =
    resultStatusMessage && resultStatusMessage !== callStatusMessage;

  // Deduplicate summaries - if they're the same, only show one
  const showCallSummary =
    callSummary &&
    callSummary !== resultSummary &&
    callSummary !== streamingContent;
  const showResultSummary =
    resultSummary &&
    resultSummary !== callSummary &&
    resultSummary !== streamingContent;

  // Combine all content for the collapsible block
  const hasAnyContent = hasCallInfo || hasResultInfo || !isCompleted;
  const rawDisplayStatus = showResultStatus
    ? resultStatusMessage
    : showCallStatus
      ? callStatusMessage
      : toolName;
  // Backend may send null/empty tool_response as the string "None" (e.g. Python); don't show that
  const displayStatus =
    rawDisplayStatus?.trim() &&
    rawDisplayStatus.trim().toLowerCase() !== "none"
      ? rawDisplayStatus
      : (toolName?.trim() || "Tool call");

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="w-full max-w-2xl my-2 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 border-l-4 border-l-neutral-400 dark:border-l-neutral-500 shadow-sm"
    >
      {hasAnyContent && (
        <Accordion
          type="single"
          collapsible
          value={isExpanded ? toolCallId : ""}
          onValueChange={(value) => {
            setIsExpanded(value === toolCallId);
          }}
          className="w-full"
        >
          <AccordionItem value={toolCallId} className="border-0">
            <AccordionTrigger className="py-2 px-3 hover:no-underline text-xs text-muted-foreground flex items-center gap-2">
              <div className="flex items-center gap-2">
                {isError ? (
                  <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
                ) : isCompleted ? (
                  <CheckIcon className="h-3 w-3 text-green-600 flex-shrink-0" />
                ) : (
                  <Loader className="h-3 w-3 animate-spin flex-shrink-0" />
                )}
                <span className="text-xs text-foreground/70">
                  {displayStatus}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-0 pb-2 px-3">
              <div className="space-y-2 text-xs">
                {/* Call Event - Tool execution info */}
                {showCallStatus && (
                  <div className="text-foreground/80 italic">
                    {callStatusMessage}
                  </div>
                )}
                {showCallSummary && (
                  <div className="text-foreground/70 bg-white/30 dark:bg-neutral-900/30 rounded px-2 py-1.5 border border-neutral-200/50 dark:border-neutral-700/50">
                    <StandaloneMarkdown
                      text={callSummary}
                      className="markdown-content break-words text-xs"
                    />
                  </div>
                )}

                {/* Result Event - Tool result */}
                {showResultStatus && (
                  <div className="text-foreground/90 font-medium">
                    {resultStatusMessage}
                  </div>
                )}
                {/* Streaming content (from stream_part) */}
                {streamingContent && (
                  <div className="text-foreground/90 bg-white/50 dark:bg-neutral-900/50 rounded px-2 py-1.5 border border-neutral-200 dark:border-neutral-700">
                    {isToolCallStreaming && !isCompleted && (
                      <span className="inline-block w-1 h-4 mr-1 bg-current animate-pulse" />
                    )}
                    <StandaloneMarkdown
                      text={streamingContent}
                      className="markdown-content break-words text-xs"
                    />
                  </div>
                )}
                {/* Result summary (from tool_call_details.summary) */}
                {showResultSummary && (
                  <div className="text-foreground/80 bg-white/30 dark:bg-neutral-900/30 rounded px-2 py-1.5 border border-neutral-200/50 dark:border-neutral-700/50">
                    <StandaloneMarkdown
                      text={resultSummary}
                      className="markdown-content break-words text-xs"
                    />
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </motion.div>
  );
};

// Wrapper for tool call that works outside MessagePrimitive.Parts context
const InlineToolCall: FC<{ part: any }> = ({ part }) => {
  // CustomToolCall uses useMessage() internally, so it should work
  // We just need to ensure the part is in the message content
  const ToolCallComponent = CustomToolCall as any;

  return (
    <div className="w-full my-4">
      <ToolCallComponent
        toolCallId={part.toolCallId}
        toolName={part.toolName || "tool"}
        argsText={part.argsText || ""}
        result={part.result}
      />
    </div>
  );
};

// Custom inline message content renderer - renders parts in order, interleaving tool calls with text
const InlineMessageContent: FC = () => {
  const message = useMessage();

  return (
    <div className="inline-message-content">
      {message.content.map((part, index) => {
        if (part.type === "text") {
          // Only render non-empty text segments
          if (!part.text || !part.text.trim()) {
            return null;
          }
          return (
            <div key={`text-${index}`} className="w-full my-1">
              <StandaloneMarkdown
                text={part.text}
                className="markdown-content break-words break-before-avoid [&_p]:!leading-tight [&_p]:!my-0.5 [&_li]:!my-0.5"
              />
            </div>
          );
        } else if (part.type === "tool-call") {
          const toolCallPart = part as any;
          return (
            <InlineToolCall
              key={`tool-${toolCallPart.toolCallId}`}
              part={toolCallPart}
            />
          );
        } else if (part.type === "reasoning") {
          // Reasoning parts are handled by MessagePrimitive.Parts
          // We'll render them using the Reasoning component directly
          const reasoningPart = part as any;
          return (
            <div key={`reasoning-${index}`} className="w-full my-2">
              <Reasoning type="reasoning" text={reasoningPart.text || ""} />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

// Custom ToolGroup component - renders tool calls inline with message content
// This is kept for compatibility but should not be used with InlineMessageContent
const CustomToolGroup: FC<
  PropsWithChildren<{ startIndex: number; endIndex: number }>
> = ({ startIndex, endIndex, children }) => {
  const message = useMessage();
  const toolGroupRef = useRef<HTMLDivElement>(null);

  // Get tool calls from THIS message's content
  const toolCalls = message.content
    .slice(startIndex, endIndex + 1)
    .filter((c) => c.type === "tool-call") as Array<{
    type: "tool-call";
    toolCallId: string;
    result?: any;
    streamState?: ToolCallStreamState;
    isError?: boolean;
  }>;

  // Show tool calls inline - no wrapper accordion, just render them directly
  if (toolCalls.length === 0) return null;

  return (
    <div ref={toolGroupRef} className="my-2">
      <ul className="w-full space-y-1">{children}</ul>
    </div>
  );
};

const AssistantMessage: FC = () => {
  const message = useMessage();
  const threadRuntime = useThreadRuntime();

  // Check if message is loading (has no text content yet) and thread is running
  const textContent = message.content.find((c) => c.type === "text");
  const hasText =
    textContent &&
    textContent.type === "text" &&
    textContent.text.trim().length > 0;

  // Check if there are any tool calls (reasoning) in the message
  const hasToolCalls = message.content.some((c) => c.type === "tool-call");

  const isRunning = threadRuntime.getState().isRunning;
  const isLastMessage = message.isLast;

  // Only show skeleton when running, no text, and no tool calls (no streaming has started)
  const showSkeleton = isLastMessage && isRunning && !hasText && !hasToolCalls;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "backInOut", stiffness: 50 }}
    >
      <MessagePrimitive.Root className="w-11/12 grid grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] relative">
        <Avatar className="mr-4 rounded-none bg-transparent">
          <AvatarImage src="/images/logo.svg" alt="Agent" />
          <AvatarFallback className="bg-gray-400 text-white">P</AvatarFallback>
        </Avatar>

        <div className="rounded-md text-foreground max-w-[calc(var(--thread-max-width)*0.8)] break-words leading-7 col-span-2 col-start-2 row-start-1 my-1.5">
          {/* Error display */}
          <MessagePrimitive.Error>
            <div className="text-red-400 mb-2">
              There was an error while serving your request. Please try again or
              try with a different model
            </div>
          </MessagePrimitive.Error>

          {/* Show skeleton when message is loading but has no content yet */}
          {showSkeleton && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.2,
                ease: "backInOut",
                staggerChildren: 0.3,
              }}
            >
              <Skeleton key={1} className="h-4 w-1/2 mb-2"></Skeleton>
              <Skeleton key={2} className="h-4 w-1/2 mb-2"></Skeleton>
              <Skeleton key={3} className="h-4 w-1/3"></Skeleton>
            </motion.div>
          )}

          {/* Render message content inline - tool calls appear between text segments */}
          <InlineMessageContent />
        </div>

        <AssistantActionBar />
      </MessagePrimitive.Root>
    </motion.div>
  );
};

const AssistantActionBar: FC = () => {
  // No need for useMessage() - MessagePrimitive.If provides context automatically
  return (
    <ActionBarPrimitive.Root
      autohide="not-last"
      autohideFloat="single-branch"
      className="text-black flex gap-1 col-start-3 row-start-2 -ml-1 data-[floating]:bg-background data-[floating]:absolute data-[floating]:rounded-md data-[floating]:border data-[floating]:p-1 data-[floating]:shadow-sm"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <MessagePrimitive.If copied>
            <CheckIcon />
          </MessagePrimitive.If>
          <MessagePrimitive.If copied={false}>
            <CopyIcon />
          </MessagePrimitive.If>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>

      <MessagePrimitive.If last>
        <ThreadPrimitive.If running={false}>
          <ActionBarPrimitive.Reload asChild>
            <TooltipIconButton tooltip="Refresh">
              <RefreshCwIcon />
            </TooltipIconButton>
          </ActionBarPrimitive.Reload>
        </ThreadPrimitive.If>
      </MessagePrimitive.If>
    </ActionBarPrimitive.Root>
  );
};
