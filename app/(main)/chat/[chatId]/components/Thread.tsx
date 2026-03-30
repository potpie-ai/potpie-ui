"use client";
import {
  ActionBarPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useThreadRuntime,
  useMessage,
} from "@assistant-ui/react";
import type { PropsWithChildren } from "react";
import {
  useEffect,
  useMemo,
  useState,
  useRef,
  type FC,
  useCallback,
  memo,
} from "react";
import {
  AlertTriangle,
  ArrowDownIcon,
  CheckIcon,
  ChevronDown,
  CopyIcon,
  Lightbulb,
  Loader2,
  RefreshCwIcon,
  Wrench,
} from "lucide-react";
import { cn, isMultimodalEnabled, stripAssistantMarkers } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import {
  MarkdownText,
  StandaloneMarkdown,
} from "@/components/assistant-ui/markdown-text";
import { UserMessageAttachments } from "@/components/assistant-ui/attachment";
import { MonacoDiffView } from "@/components/diff-editor/MonacoDiffView";
import MessageComposer from "./MessageComposer";
import { motion } from "motion/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { ToolResultContent } from "@/components/stream/ToolResultContent";


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

    let innerTimeoutId: ReturnType<typeof setTimeout> | undefined;

    // Subscribe to runtime changes
    const unsubscribe = runtime.subscribe(() => {
      const nextState = runtime.getState();

      if (Array.isArray(nextState.messages) && nextState.messages.length > 0) {
        clearTimeout(timeoutId);
        clearTimeout(innerTimeoutId);
        setIsInitialLoading(false);
        unsubscribe();
        return;
      }

      if (Array.isArray(nextState.messages) && nextState.messages.length === 0) {
        clearTimeout(innerTimeoutId);
        innerTimeoutId = setTimeout(() => {
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
      clearTimeout(innerTimeoutId);
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
      <div className="relative h-full w-full bg-background">
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

            <div className="sticky bottom-0 left-0 right-0 z-20 flex flex-col items-center justify-center border-t border-border/60 bg-background px-4 py-3">
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
    <ComposerPrimitive.Root className="relative z-10 w-3/4 bg-[#FFFDFC] flex flex-wrap items-end rounded-lg border border-gray-200 px-2.5 shadow-xl transition-all ease-in-out">
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
  const [isAtBottom, setIsAtBottom] = useState(true);
  const rafIdRef = useRef<number | null>(null);

  const checkScrollPosition = useCallback(() => {
    if (rafIdRef.current !== null) return;

    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;

      const viewport = document.querySelector(".thread-viewport");
      if (!viewport) return;

      const { scrollTop, scrollHeight, clientHeight } = viewport as HTMLElement;
      const isBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 20;
      setIsAtBottom(isBottom);
    });
  }, []);

  useEffect(() => {
    const viewport = document.querySelector(".thread-viewport");
    if (!viewport) return;

    viewport.addEventListener("scroll", checkScrollPosition);
    return () => {
      viewport.removeEventListener("scroll", checkScrollPosition);
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [checkScrollPosition]);

  const scrollToBottom = () => {
    const viewport = document.querySelector(".thread-viewport");
    if (!viewport) return;

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth",
    });
  };

  if (isAtBottom) return null;

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
  details: {
    summary?: string;
    command?: string;
    [key: string]: unknown;
  }; // Maps to tool_call_details from API (shape varies by tool)
  is_complete?: boolean;
  stream_part?: string | null;
  accumulated_stream_part?: string;
  accumulated_response?: string; // Accumulated from stream_part chunks
  is_streaming?: boolean; // Whether this tool call is currently streaming
  latest_tool_response?: string;
  derived_preview?: string;
  preview_text?: string;
}

const CustomToolCall = memo(({
  toolCallId,
  toolName,
  argsText,
  result,
  args,
}: {
  toolCallId: string;
  toolName: string;
  argsText?: string;
  result?: unknown;
  args?: unknown;
}) => {
  // Get the full message to access the complete tool call part with streamState
  const message = useMessage();
  const toolCallPart = message.content.find(
    (c) => c.type === "tool-call" && (c as any).toolCallId === toolCallId
  ) as any;

  // Extract tool call state - check streamState first (for streaming), then result (for completed)
  const streamState = toolCallPart?.streamState as ToolCallStreamState | undefined;
  const resultStateRaw = result as any as ToolCallStreamState | undefined;
  const currentState = streamState ?? resultStateRaw;

  // Snapshot result event for result content
  const [resultStateLocal, setResultStateLocal] = useState<ToolCallStreamState | null>(null);

  useEffect(() => {
    if (!currentState) return;
    const eventType = currentState.event_type || "";
    if (eventType === "result" || eventType === "delegation_result") {
      setResultStateLocal(currentState);
    }
  }, [currentState]);

  const isComplete =
    currentState?.is_complete !== undefined ? currentState.is_complete : true;
  const eventType = currentState?.event_type || "";

  const isError = toolCallPart?.isError ?? currentState?.event_type === "error";
  const isCompleted =
    (eventType === "result" ||
      eventType === "delegation_result" ||
      isComplete) &&
    !isError;

  // Build result string for preview/expandable content
  const completedState = resultStateLocal ?? (isCompleted ? currentState : null);
  const resultContent =
    completedState?.accumulated_response?.trim() ||
    (typeof completedState?.details?.command === "string"
      ? completedState.details.command.trim()
      : undefined) ||
    completedState?.details?.summary?.trim() ||
    completedState?.latest_tool_response?.trim() ||
    completedState?.response?.trim() ||
    "";

  // Preview: first 52 chars, collapsed to one line
  const resultPreview = resultContent
    ? (() => {
        const oneLine = resultContent.replace(/\s+/g, " ").trim();
        return oneLine.length <= 52 ? oneLine : oneLine.slice(0, 52) + "…";
      })()
    : "";

  const rawPreviewFromArgs = argsText?.trim() || "";
  const runningPreviewText =
    currentState?.preview_text?.trim() ||
    currentState?.latest_tool_response?.trim() ||
    currentState?.response?.trim() ||
    currentState?.derived_preview?.trim() ||
    rawPreviewFromArgs ||
    "Calling tool...";

  const streamPreview = (() => {
    const oneLine = runningPreviewText.replace(/\s+/g, " ").trim();
    if (!oneLine) return "";
    return oneLine.length <= 72 ? oneLine : oneLine.slice(0, 69) + "…";
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "rounded-lg border border-zinc-200/90 bg-white min-w-0 overflow-hidden",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        isError && "border-red-200"
      )}
    >
      {!isCompleted && !isError ? (
        /* Running state */
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Loader2 className="h-4 w-4 shrink-0 text-amber-600 animate-spin" aria-hidden />
          <span className="font-mono text-xs font-medium text-zinc-700 truncate">{toolName}</span>
          {streamPreview && (
            <span
              className="font-mono text-[10px] text-zinc-500 truncate min-w-0"
              title={runningPreviewText}
            >
              {streamPreview}
            </span>
          )}
          <span className="ml-auto rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
            Running
          </span>
        </div>
      ) : isError ? (
        /* Error state */
        <div className="flex items-center gap-3 px-3 py-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-50">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" aria-hidden />
          </span>
          <span className="font-mono text-xs font-medium text-zinc-700 truncate">{toolName}</span>
          <span className="ml-auto rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
            Failed
          </span>
        </div>
      ) : (
        /* Done state — accordion */
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value={toolCallId} className="border-none">
            <AccordionTrigger
              className={cn(
                "py-2.5 pr-3 pl-3 hover:no-underline hover:bg-zinc-50/80",
                "[&[data-state=open]>svg]:rotate-180"
              )}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50">
                  <Wrench className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                </span>
                <span className="font-mono text-xs font-medium text-zinc-800 shrink-0">
                  {toolName}
                </span>
                {resultPreview && (
                  <span
                    className="text-[10px] italic text-zinc-400 truncate min-w-0"
                    title={resultContent.replace(/\s+/g, " ").trim().slice(0, 200)}
                  >
                    {resultPreview}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="overflow-hidden">
              <div
                className={cn(
                  "max-h-48 overflow-y-auto overflow-x-hidden",
                  "border-t border-zinc-100 bg-zinc-50/80 p-3 text-xs text-zinc-700",
                  "[scrollbar-width:thin]"
                )}
              >
                {resultContent ? (
                  <ToolResultContent result={resultContent} />
                ) : (
                  <span className="text-zinc-500">No output</span>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </motion.div>
  );
});

CustomToolCall.displayName = "CustomToolCall";


const renderReasoningParagraphs = (text: string) => {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => (
      <p key={`reasoning-paragraph-${index}`} className="leading-relaxed">
        {paragraph}
      </p>
    ));
};

const InlineMessageContent = memo(() => {
  const message = useMessage();
  const parts = message.content;
  const firstToolIndex = parts.findIndex((part) => part.type === "tool-call");

  const reasoningText =
    (
      parts.find((part) => part.type === "reasoning") as
        | { type: "reasoning"; text: string }
        | undefined
    )?.text ?? "";

  const collectText = (predicate: (_: any, index: number) => boolean) =>
    parts
      .map((part, index) => ({ part, index }))
      .filter(({ part, index }) => part.type === "text" && predicate(part, index))
      .map(({ part }) =>
        stripAssistantMarkers((part as any).text ?? "")
      )
      .filter((text) => text.trim())
      .join("\n\n");

  const initialText =
    firstToolIndex === -1
      ? collectText(() => true)
      : collectText((_, index) => index < firstToolIndex);

  const finalText =
    firstToolIndex === -1
      ? ""
      : collectText((_, index) => index > firstToolIndex);

  const toolCalls = parts.filter((part) => part.type === "tool-call") as any[];

  return (
    <div className="inline-message-content space-y-4">
      {reasoningText.trim() && (
        <details className="group rounded-xl border border-neutral-200 bg-neutral-100/70">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-neutral-700 marker:content-['']">
            <span className="flex items-center gap-2 font-medium">
              <Lightbulb className="h-4 w-4 text-neutral-500" />
              Think
            </span>
            <ChevronDown className="h-4 w-4 text-neutral-500 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-3 border-t border-neutral-200 px-4 py-4 text-[15px] text-neutral-700">
            {renderReasoningParagraphs(reasoningText)}
          </div>
        </details>
      )}

      {initialText.trim() && (
        <StandaloneMarkdown
          text={initialText}
          className="markdown-content break-words [&_p]:!my-2"
        />
      )}

      {toolCalls.length > 0 && (
        <div className="space-y-1">
          {toolCalls.map((tool, index) => (
            <CustomToolCall
              key={`tool-call-${tool.toolCallId || index}`}
              toolCallId={tool.toolCallId}
              toolName={tool.toolName}
              argsText={tool.argsText}
              result={tool.result}
              args={tool.args}
            />
          ))}
        </div>
      )}

      {finalText.trim() && (
        <StandaloneMarkdown
          text={finalText}
          className="markdown-content break-words [&_p]:!my-2"
        />
      )}
    </div>
  );
});

InlineMessageContent.displayName = "InlineMessageContent";

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

  const textContent = message.content.find((c) => c.type === "text");
  const hasText = textContent?.type === "text" && textContent.text.trim().length > 0;
  const hasToolCalls = message.content.some((c) => c.type === "tool-call");
  const hasReasoning = message.content.some((c) => c.type === "reasoning");
  const hasAnyContent = hasText || hasToolCalls || hasReasoning;

  const isLastMessage = message.isLast;
  const isRunning = isLastMessage && threadRuntime.getState().isRunning;

  const showSkeleton = isLastMessage && isRunning && !hasAnyContent;
  const showPulsatingDots = isLastMessage && isRunning && hasAnyContent;

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

          {/* Pulsating dots while streaming after content has started arriving */}
          {showPulsatingDots && (
            <div className="flex items-center gap-1.5 mt-4" role="status" aria-label="Agent is responding">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full bg-foreground/30 animate-loading-dot"
                  style={{ animationDelay: `${i * 0.16}s` }}
                />
              ))}
            </div>
          )}
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
