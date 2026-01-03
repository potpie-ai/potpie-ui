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
import { useEffect, useMemo, useState, useRef, type FC, useCallback } from "react";
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
import { MarkdownText, StandaloneMarkdown } from "@/components/assistant-ui/markdown-text";
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
}

export const Thread: FC<ThreadProps> = ({
  projectId,
  writeDisabled,
  userImageURL,
  conversation_id,
  isSessionResuming,
  isBackgroundTaskActive,
}) => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const runtime = useThreadRuntime();

  // Move useMemo before any early returns to satisfy React Hooks rules
  const userMessage = useMemo(() => {
    const UserMessageComponent = () => <UserMessage userPhotoURL={userImageURL} />;
    UserMessageComponent.displayName = 'UserMessageComponent';
    return UserMessageComponent;
  }, [userImageURL]);

  useEffect(() => {
    const state = runtime.getState();
    // Check if messages array exists (even if empty) - this means history load has completed
    const messagesLoaded = Array.isArray(state.messages);
    
    // If messages have been loaded (array exists), we're no longer in initial loading
    // This handles both empty chats ([]) and chats with messages
    if (messagesLoaded) {
      setIsInitialLoading(false);
      return; // Early return if already loaded
    }

    // Safety timeout: Clear loading after 10 seconds if history never loads
    // This prevents infinite loading in case of network errors or adapter failures
    const timeoutId = setTimeout(() => {
      setIsInitialLoading((prev) => {
        // Only clear if still loading
        if (prev) {
          console.warn("History load timeout - clearing initial loading state");
          return false;
        }
        return prev;
      });
    }, 10000);

    // Messages haven't loaded yet, subscribe to changes
    const unsubscribe = runtime.subscribe(() => {
      const nextState = runtime.getState();
      // Once messages array exists (history load completed), clear loading
      // This works for both empty chats ([]) and chats with messages
      if (Array.isArray(nextState.messages)) {
        clearTimeout(timeoutId);
        setIsInitialLoading(false);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [runtime]);
  
  // Loading state for background tasks (not for normal streaming)
  if (isBackgroundTaskActive && !isSessionResuming) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Background task in progress...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ThreadPrimitive.Root className="px-10 bg-background box-border h-full text-sm flex justify-center items-center">
      <div className="h-full w-full bg-background">
        {isInitialLoading ? (
          <div className="flex items-center justify-center h-full space-x-1 mt-2">
            <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse"></span>
            <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-100"></span>
            <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-200"></span>
          </div>
        ) : (
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
        )}
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
            <AvatarImage src="/images/potpie-blue.svg" alt="Agent" />
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
    <ComposerPrimitive.Root className="bg-white z-10 w-3/4 focus-within:border-ring/50 flex flex-wrap items-end rounded-lg border px-2.5 shadow-xl focus-within:shadow-2xl transition-all ease-in-out">
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
      className="flex items-start justify-end w-full"
    >
      <MessagePrimitive.Root className="w-auto pr-5 grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 [&:where(>*)]:col-start-2 max-w-[var(--thread-max-width)] py-4">
        <div className="bg-gray-100 text-black max-w-[calc(var(--thread-max-width)*0.8)] break-words rounded-3xl px-5 py-2.5 col-start-2 row-start-2">
          {/* Display attachments using assistant-ui component */}
          {isMultimodalEnabled() && <UserMessageAttachments />}
          
          <MessagePrimitive.Parts
            components={{
              Text: MarkdownText,
              Image: () => null, //UserMessageAttachments already handles images
            }}
          />
        </div>
      </MessagePrimitive.Root>
      <Avatar className="mr-4 self-start rounded-md bg-transparent">
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
  response: string;
  details: { summary: string };
}

const CustomToolCall: ToolCallMessagePartComponent = ({
  toolCallId,
  toolName,
  argsText,
  result,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const threadRuntime = useThreadRuntime();
  
  // Get the full message to access the complete tool call part with streamState
  const message = useMessage();
  const toolCallPart = message.content.find(
    (c) => c.type === "tool-call" && (c as any).toolCallId === toolCallId
  ) as any;

  // Extract tool call state - check streamState first (for streaming), then result (for completed)
  const streamState = toolCallPart?.streamState as ToolCallStreamState | undefined;
  const resultState = result as any as ToolCallStreamState | undefined;
  const state = streamState ?? resultState;

  const status = state?.event_type || "";
  const messageText = state?.response || "";
  const details_summary = state?.details?.summary || "";
  const isError = toolCallPart?.isError ?? (resultState?.event_type === "error");
  const isCompleted = status === "result" && !isError;
  const hasDetails = !!details_summary;

  // Track thread running state
  const [threadIsRunning, setThreadIsRunning] = useState(false);

  // Subscribe to thread runtime to track streaming state
  useEffect(() => {
    if (!message.isLast) {
      setThreadIsRunning(false);
      return;
    }

    const unsubscribe = threadRuntime.subscribe(() => {
      const state = threadRuntime.getState();
      const lastMessage = state.messages.at(-1);
      const running = lastMessage?.id === message.id && state.isRunning;
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
  const isStreaming = !!streamState && !isCompleted && !isError && message.isLast && threadIsRunning;

  // Auto-expand accordion when streaming starts, keep it open during streaming
  useEffect(() => {
    if (isStreaming) {
      setIsExpanded(true);
    }
  }, [isStreaming]);

  return (
    <motion.li
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-md bg-muted/40 px-4 py-3"
    >
      {hasDetails ? (
        <Accordion
          type="single"
          collapsible
          value={isStreaming ? toolCallId : (isExpanded ? toolCallId : "")}
          onValueChange={(value) => {
            // Only allow manual control when not streaming
            if (!isStreaming) {
              setIsExpanded(value === toolCallId);
            }
          }}
        >
          <AccordionItem value={toolCallId} className="border-0">
            <AccordionTrigger className="py-0 px-0 hover:no-underline">
              <div className="flex items-center gap-2 text-sm text-muted-foreground w-full">
                {isError ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : isCompleted ? (
                  <CheckIcon className="h-4 w-4 text-green-600" />
                ) : (
                  <Loader className="h-4 w-4 animate-spin" />
                )}
                <span className="italic text-foreground flex-1 text-left">
                  {messageText || `Tool: ${toolName}`}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-0 px-0">
              <div className="text-xs text-foreground bg-background/60 rounded-md px-4 py-3 max-h-[350px] overflow-y-auto">
                <StandaloneMarkdown text={details_summary} className="markdown-content break-words text-xs" />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isError ? (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          ) : isCompleted ? (
            <CheckIcon className="h-4 w-4 text-green-600" />
          ) : (
            <Loader className="h-4 w-4 animate-spin" />
          )}
          <span className="italic text-foreground">
            {messageText || `Tool: ${toolName}`}
          </span>
        </div>
      )}
    </motion.li>
  );
};

// Custom ToolGroup component for assistant-ui with accordion and auto-close
const CustomToolGroup: FC<
  PropsWithChildren<{ startIndex: number; endIndex: number }>
> = ({ startIndex, endIndex, children }) => {
  const message = useMessage();
  const threadRuntime = useThreadRuntime();
  const [accordionValue, setAccordionValue] = useState("tool-results");
  const [accordionTransitionDone, setAccordionTransitionDone] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const toolGroupRef = useRef<HTMLDivElement>(null);
  const prevToolCallCountRef = useRef(0);

  // Get tool calls from THIS message's content (not the thread's last message)
  const toolCalls = message.content
    .slice(startIndex, endIndex + 1)
    .filter((c) => c.type === "tool-call") as Array<{
      type: "tool-call";
      toolCallId: string;
      result?: any;
      streamState?: ToolCallStreamState;
      isError?: boolean;
    }>;

  // Check if all tool calls IN THIS MESSAGE are completed
  const allToolCallsHaveResults = toolCalls.length > 0 && toolCalls.every((call) => {
    const result = call.result as any;
    const streamState = call.streamState as any;
    const state = streamState ?? result;
    const isError = call.isError ?? result?.isError ?? (state?.event_type === "error");
    return state?.event_type === "result" || isError;
  });

  // Check message status - 'running' means still streaming, anything else means done
  // Status types: "running" | "requires-action" | "incomplete" | "complete" (on ThreadAssistantMessage)
  const messageStatus = message.status;
  const isMessageStillRunning = messageStatus?.type === "running";
  
  // Track thread running state - ONLY for THIS message
  useEffect(() => {
    // Only track running state if this is the last message
    if (!message.isLast) {
      setIsRunning(false);
      return;
    }
    
    const unsubscribe = threadRuntime.subscribe(() => {
      const state = threadRuntime.getState();
      // Check if THIS specific message is the one currently running
      const lastMessage = state.messages.at(-1);
      const running = lastMessage?.id === message.id && state.isRunning;
      setIsRunning(running);
    });
    
    // Set initial state
    const initialState = threadRuntime.getState();
    const lastMessage = initialState.messages.at(-1);
    setIsRunning(lastMessage?.id === message.id && initialState.isRunning);
    
    return unsubscribe;
  }, [message.isLast, message.id, threadRuntime]);

  // For non-last messages (historical), they're always complete
  // For last message: still streaming if thread running OR message status is "running"
  const isStillStreaming = message.isLast ? (isRunning || isMessageStillRunning) : false;
  
  // Completed when: all tool calls have results AND not streaming anymore
  const isCompleted = allToolCallsHaveResults && !isStillStreaming;

  // Auto-scroll when new tool calls are added or updated
  useEffect(() => {
    if (!message.isLast || !isStillStreaming) return;
    
    // Check if tool calls count changed or content updated
    if (toolCalls.length > prevToolCallCountRef.current) {
      prevToolCallCountRef.current = toolCalls.length;
      
      // Scroll to make tool group visible
      const viewport = document.querySelector(".thread-viewport");
      if (viewport) {
        // Smooth scroll to bottom with a small delay for DOM update
        requestAnimationFrame(() => {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: "smooth",
          });
        });
      }
    }
  }, [toolCalls.length, isStillStreaming, message.isLast]);

  // Also scroll when tool call results update
  useEffect(() => {
    if (!message.isLast || !isStillStreaming) return;
    
    const viewport = document.querySelector(".thread-viewport");
    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  }, [toolCalls.map(tc => tc.streamState?.event_type).join(","), isStillStreaming, message.isLast]);

  // Auto-close accordion when completed
  useEffect(() => {
    if (accordionTransitionDone) return;
    if (isCompleted) {
      const timer = setTimeout(() => {
        setAccordionValue("");
        setAccordionTransitionDone(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, accordionTransitionDone]);

  // Show tool calls even while running (they should appear during streaming)
  // Only hide if there are no tool calls at all
  if (toolCalls.length === 0) return null;

  return (
    <motion.div
      ref={toolGroupRef}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mb-4"
    >
      <Accordion
        type="single"
        collapsible
        value={isStillStreaming ? "tool-results" : accordionValue}
        onValueChange={(value) => {
          // Only allow manual control when not streaming
          if (!isStillStreaming) {
            setAccordionValue(value);
          }
        }}
      >
        <AccordionItem value="tool-results" className="border-b-0">
          <AccordionTrigger className="w-96 p-0 flex flex-row justify-start items-center">
            <div className="flex items-center gap-2 italic mr-2">
              {isStillStreaming ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Reasoning in progress</span>
                </>
              ) : isCompleted ? (
                <>
                  <CheckIcon className="h-4 w-4 text-green-600" />
                  <span>Reasoning completed</span>
                </>
              ) : (
                <span>Reasoning</span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <motion.ul className="w-full space-y-3">{children}</motion.ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </motion.div>
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
      <MessagePrimitive.Root className="w-11/12 grid items-start grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] relative">
        <Avatar className="mr-4 self-start rounded-none bg-transparent">
          <AvatarImage src="/images/potpie-blue.svg" alt="Agent" />
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

          {/* Use MessagePrimitive.Parts to automatically render all content */}
          {/* The Parts component handles loading states automatically */}
          <MessagePrimitive.Parts
            components={{
              Text: MarkdownText,
              Reasoning: Reasoning,
              ReasoningGroup: ReasoningGroup,
              ToolGroup: CustomToolGroup,
              tools: {
                Fallback: CustomToolCall,
              },
            }}
          />
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
