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
import { useEffect, useMemo, useState, type FC, useCallback } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
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
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
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
import { SharedMarkdown } from "@/components/chat/SharedMarkdown";

interface ThreadProps {
  projectId: string;
  writeDisabled: boolean;
  userImageURL: string;
  conversation_id: string;
}

export const Thread: FC<ThreadProps> = ({
  projectId,
  writeDisabled,
  userImageURL,
  conversation_id,
}) => {
  const { backgroundTaskActive, sessionResuming } = useSelector(
    (state: RootState) => state.chat
  );
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
    const hasMessages = state.messages && state.messages.length > 0;
    setIsInitialLoading(!hasMessages);

    const unsubscribe = runtime.subscribe(() => {
      const nextState = runtime.getState();
      if (
        isInitialLoading &&
        nextState.messages &&
        nextState.messages.length > 0
      ) {
        setIsInitialLoading(false);
      }
    });

    return unsubscribe;
  }, [runtime, isInitialLoading]);
  
  // Loading state for background tasks (not for normal streaming)
  if (backgroundTaskActive && !sessionResuming) {
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
  const isError = toolCallPart?.isError ?? (resultState?.event_type === "error") ?? false;
  const isCompleted = status === "result" && !isError;
  const hasDetails = !!details_summary;

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
          value={isExpanded ? toolCallId : ""}
          onValueChange={(value) => setIsExpanded(value === toolCallId)}
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
              <div className="text-xs text-foreground bg-background/60 rounded-md px-4 py-3">
                <SharedMarkdown
                  content={details_summary}
                  className="markdown-content break-words text-xs"
                />
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
  const allCompleted = toolCalls.length > 0 && toolCalls.every((call) => {
    const result = call.result as any;
    const streamState = call.streamState as any;
    const state = streamState ?? result;
    const isError = call.isError ?? result?.isError ?? (state?.event_type === "error");
    return state?.event_type === "result" && !isError;
  });

  // Track running state - ONLY for THIS message
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
    
    return unsubscribe;
  }, [message.isLast, message.id, threadRuntime]);

  // Auto-close accordion when all tool calls are completed and thread is not running
  useEffect(() => {
    if (accordionTransitionDone) return;
    // Only auto-close for this message's tool calls
    if (allCompleted && !isRunning) {
      const timer = setTimeout(() => {
        setAccordionValue("");
        setAccordionTransitionDone(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [allCompleted, isRunning, accordionTransitionDone]);

  // Show tool calls even while running (they should appear during streaming)
  // Only hide if there are no tool calls at all
  if (toolCalls.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mb-4"
    >
      <Accordion
        type="single"
        collapsible
        value={accordionValue}
        onValueChange={(value) => setAccordionValue(value)}
      >
        <AccordionItem value="tool-results" className="border-b-0">
          <AccordionTrigger className="w-96 p-0 flex flex-row justify-start items-center">
            <div className="italic mr-2">
              {allCompleted ? "Reasoning completed" : "Reasoning in progress"}
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
  const isRunning = threadRuntime.getState().isRunning;
  const isLastMessage = message.isLast;
  const showSkeleton = isLastMessage && isRunning && !hasText;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "backInOut", stiffness: 50 }}
    >
      <MessagePrimitive.Root className="w-11/12 grid grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] relative">
        <Avatar className="mr-4 rounded-none bg-transparent">
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
