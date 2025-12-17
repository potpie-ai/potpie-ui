import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useComposerRuntime,
  useMessage,
  useMessageRuntime,
  useThreadRuntime,
} from "@assistant-ui/react";
import { useEffect, useMemo, useState, type FC, useCallback } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import {
  ArrowDownIcon,
  CheckIcon,
  CheckCircle,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  ExternalLinkIcon,
  Loader,
  RefreshCwIcon,
} from "lucide-react";
import { cn, isMultimodalEnabled } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { SharedMarkdown } from "@/components/chat/SharedMarkdown";
import { MermaidDiagram } from "@/components/chat/MermaidDiagram";
import MyCodeBlock from "@/components/codeBlock";
import MessageComposer from "./MessageComposer";
import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionTrigger } from "@/components/ui/accordion";
import { AccordionContent, AccordionItem } from "@radix-ui/react-accordion";
import { parseHITLMetadata, removeHITLMetadata, HITLMetadata } from "@/lib/utils/hitlMetadata";
import { HITLRequestChat } from "./HITLRequestChat";

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
  const runtime = useThreadRuntime();
  const [isLoading, setIsLoading] = useState(true);
  const { backgroundTaskActive, sessionResuming } = useSelector((state: RootState) => state.chat);

  useEffect(() => {
    const unsubscribe = runtime.subscribe(() => {
      setIsLoading(
        (runtime.getState().extras as any)?.loading === true || false
      );
    });
    return () => unsubscribe();
  }, [runtime]);

  let userMessage = useMemo(() => {
    return UserMessageWithURL(userImageURL);
  }, [userImageURL]);

  // Add loading state for background tasks
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
        {isLoading ? (
          <div className="flex items-center justify-center h-full space-x-1 mt-2">
            <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse"></span>
            <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-100"></span>
            <span className="h-2 w-2 bg-gray-500 rounded-full animate-pulse delay-200"></span>
          </div>
        ) : (
          <div className="bg-background h-full w-full">
            <ThreadPrimitive.If empty>
              <div className="w-full h-full flex justify-center items-center">
                <ThreadWelcome showSuggestions={!writeDisabled} />
              </div>
            </ThreadPrimitive.If>

            <ThreadPrimitive.If empty={false}>
              <ThreadPrimitive.Viewport className="flex h-[calc(100%-80px)] flex-col items-center bg-background overflow-hidden overflow-y-scroll scroll-smooth inset-0 from-white via-transparent to-white [mask-image:linear-gradient(to_bottom,transparent_0%,white_5%,white_95%,transparent_100%)]">
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
              {
                <Composer
                  projectId={projectId}
                  disabled={writeDisabled}
                  conversation_id={conversation_id}
                />
              }
            </div>
          </div>
        )}
      </div>
    </ThreadPrimitive.Root>
  );
};

const parseMessage = (message: string) => {
  if (message == undefined) {
    return;
  }
  const sections = [];
  let lastIndex = 0;
  let inCodeBlock = false;
  let currentLanguage = "";
  let currentCode = "";

  const lines = message.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const codeBlockMatch = line.match(/^```(\w+)?$/);

    if (codeBlockMatch) {
      if (!inCodeBlock) {
        // Start of code block
        if (lastIndex < i) {
          // Add text section before code block
          sections.push({
            type: "text",
            content: lines.slice(lastIndex, i).join("\n"),
          });
        }
        inCodeBlock = true;
        currentLanguage = codeBlockMatch[1] || "";
        currentCode = "";
        lastIndex = i + 1;
      } else {
        // End of code block
        sections.push({
          type: "code",
          content: currentCode.trim(),
          language: currentLanguage,
        });
        inCodeBlock = false;
        lastIndex = i + 1;
      }
    } else if (inCodeBlock) {
      currentCode += line + "\n";
    }
  }

  if (lastIndex < lines.length) {
    sections.push({
      type: "text",
      content: lines.slice(lastIndex).join("\n"),
    });
  }

  return sections;
};

const CustomMarkdown = ({ content }: { content: string }) => {
  return <SharedMarkdown content={content} />;
};

const MarkdownComponent = (content: any) => {
  const parsedSections = parseMessage(content.content.text);

  return (
    <ul>
      {parsedSections?.map((section, index) => {
        return (
          <li key={index}>
            {section.type === "text" && (
              <CustomMarkdown content={section.content} />
            )}
            {section.type === "code" && section.language === "mermaid" && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "backInOut", stiffness: 50 }}
                className="pb-4 text-xs max-w-4xl"
              >
                <MermaidDiagram chart={section.content} />
              </motion.div>
            )}
            {section.type === "code" && section.language !== "mermaid" && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "backInOut", stiffness: 50 }}
                className="pb-4 text-xs max-w-4xl"
              >
                <MyCodeBlock
                  code={section.content}
                  language={section.language || "json"}
                />
              </motion.div>
            )}
          </li>
        );
      })}
    </ul>
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
  const composer = useComposerRuntime();
  const [key, setKey] = useState(0);
  const runtime = useThreadRuntime();
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    const unsubscribe = runtime.subscribe(() => {
      setIsStreaming(
        (runtime.getState().extras as any)?.streaming === true || false
      );
    });
    return () => unsubscribe();
  }, [runtime]);

  const setSelectedNodesInConfig = useCallback(
    (selectedNodes: any[]) => {
      composer.setRunConfig({
        custom: {
          selectedNodes: selectedNodes,
        },
      });
    },
    [composer]
  );

  return (
    <ComposerPrimitive.Root
      className="bg-white z-10 w-3/4 focus-within:border-ring/50 flex flex-wrap items-end rounded-lg border px-2.5 shadow-xl focus-within:shadow-2xl transition-all ease-in-out"
      onSubmit={() => {
        setKey(key + 1);
      }}
    >
      <MessageComposer
        projectId={projectId}
        conversation_id={conversation_id}
        setSelectedNodesInConfig={setSelectedNodesInConfig}
        disabled={isStreaming || disabled}
        key={key}
        input={""}
        nodes={[]}
      />
    </ComposerPrimitive.Root>
  );
};

const UserMessageWithURL = (userPhotoURL: string) => {
  const node: FC = () => {
    return UserMessage({ userPhotoURL: userPhotoURL });
  };
  return node;
};

const UserMessage: FC<{ userPhotoURL: string }> = ({ userPhotoURL }) => {
  const message = useMessage();
  
  // Separate text and image content
  const textContent = message.content.find(c => c.type === "text");
  const imageContent = message.content.filter(c => c.type === "image");
  
  // Get text for HITL detection
  const messageText = (textContent as any)?.text || "";
  
  // Parse HITL metadata from user message (HITL requests may appear as user messages from backend)
  const hitlMetadata = useMemo(() => {
    if (!messageText) return null;
    console.log("🔍 [HITL UserMessage] Checking for metadata in user message. Length:", messageText.length);
    
    const parsed = parseHITLMetadata(messageText);
    if (parsed) {
      console.log("✅ [HITL UserMessage] Parsed metadata:", parsed.hitl_request_id);
      return parsed;
    }
    
    // Manual extraction fallback
    if (messageText.includes("HITL_METADATA") || messageText.includes("hitl_request_id")) {
      const hitlIndex = messageText.indexOf("HITL_METADATA");
      if (hitlIndex > -1) {
        const snippet = messageText.substring(
          Math.max(0, hitlIndex - 20),
          Math.min(messageText.length, hitlIndex + 3000)
        );
        const jsonStart = snippet.indexOf('{');
        const jsonEnd = snippet.lastIndexOf('}');
        if (jsonStart > 0 && jsonEnd > jsonStart) {
          try {
            let jsonStr = snippet.substring(jsonStart, jsonEnd + 1).trim();
            const extracted = JSON.parse(jsonStr);
            if (extracted.hitl_request_id && extracted.hitl_execution_id) {
              console.log("✅ [HITL UserMessage] Manually extracted metadata:", extracted.hitl_request_id);
              return extracted as HITLMetadata;
            }
          } catch (e) {
            console.error("❌ [HITL UserMessage] Manual extraction failed:", e);
          }
        }
      }
    }
    return null;
  }, [messageText]);
  
  // Clean text for display (remove HITL metadata)
  const displayText = useMemo(() => {
    if (!messageText) return "";
    if (messageText.includes("HITL_METADATA") || messageText.includes("hitl_request_id")) {
      const cleaned = removeHITLMetadata(messageText);
      console.log("🧹 [HITL UserMessage] Removed metadata. Original:", messageText.length, "Cleaned:", cleaned.length);
      return cleaned;
    }
    return messageText;
  }, [messageText]);
  
  const hasHitlKeywords = messageText.includes("HITL_METADATA") || messageText.includes("hitl_request_id");
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex items-center justify-end w-full"
    >
      <MessagePrimitive.Root className="w-auto pr-5 grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 [&:where(>*)]:col-start-2 max-w-[var(--thread-max-width)] py-4">
        <div className="bg-gray-100 text-black max-w-[calc(var(--thread-max-width)*0.8)] break-words rounded-3xl px-5 py-2.5 col-start-2 row-start-2">
          {/* Render HITL component if metadata is present (HITL requests may appear as user messages) */}
          {hitlMetadata ? (
            <div className="mb-4 w-full">
              <HITLRequestChat
                metadata={hitlMetadata}
                onResponseSubmitted={() => {
                  console.log("✅ HITL response submitted from user message");
                  if (typeof window !== 'undefined' && (window as any).queryClient) {
                    (window as any).queryClient.invalidateQueries({ queryKey: ['pendingHITLRequests'] });
                  }
                }}
              />
            </div>
          ) : hasHitlKeywords ? (
            // Metadata exists but parsing failed - show warning
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 mb-2">
                ⚠️ HITL request detected but metadata parsing failed.
              </p>
              <a 
                href="/workflows/pending-requests"
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                View pending requests
              </a>
            </div>
          ) : (
            <>
              {/* Only render image previews if multimodal enabled and images exist */}
              {isMultimodalEnabled() && imageContent.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {imageContent.map((img: any, index: number) => (
                    <div key={index} className="relative">
                      <img
                        src={img.image}
                        alt={`Uploaded ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                      />
                    </div>
                  ))}
                </div>
              )}
              
              {/* Render text content (cleaned of HITL metadata) */}
              {displayText && (
                <div className="break-words">{displayText}</div>
              )}
              
              {/* Fallback: if no custom content, use original */}
              {imageContent.length === 0 && !displayText && (
                <MessagePrimitive.Content />
              )}
            </>
          )}
        </div>
      </MessagePrimitive.Root>
      <Avatar className="mr-4 rounded-md bg-transparent">
        <AvatarImage src={userPhotoURL} alt="User" />
        <AvatarFallback className="bg-gray-400 text-white">U</AvatarFallback>
      </Avatar>
    </motion.div>
  );
};

// Helper function to format response text for display
function formatResponseText(
  responseData: Record<string, any>,
  action?: string,
  nodeType?: string
): string {
  if (nodeType === "approval") {
    return responseData.approved ? "Approved" : "Rejected";
  }
  
  if (action === "requested_changes") {
    return "Requested changes";
  }
  
  if (action === "approved") {
    return "Approved and continuing";
  }
  
  // Format input fields
  const fields = Object.entries(responseData)
    .filter(([key]) => key !== "needs_changes" && key !== "changes")
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: ${value.join(", ")}`;
      }
      return `${key}: ${value}`;
    });
  
  return fields.length > 0 ? fields.join(", ") : "Submitted";
}

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

const AssistantMessage: FC = () => {
  const message = useMessage();
  const runtime = useMessageRuntime();
  const threadRuntime = useThreadRuntime();
  const [isStreaming, setIsStreaming] = useState(false);
  const [text, setText] = useState<string>(
    (message.content[0] as any)?.text || ""
  );
  const [isRunning, setIsRunning] = useState(false);
  const [accordianTransitionDone, setAccordianTransitionDone] = useState(false);
  const [accordionValue, setAccordianValue] = useState("tool-results");
  const [toolcallHeading, setToolcallHeading] = useState("Reasoning ...");
  const [toolsState, setToolsState] = useState<
    { id: string; message: string; status: string; details_summary: string }[]
  >([]);
  const [isError, setIsError] = useState(false);
  const [hitlResponseSubmitted, setHitlResponseSubmitted] = useState<{
    data: Record<string, any>;
    action?: string;
  } | null>(null);

  // Get initial text from message content (for non-streaming messages)
  const initialText = (message.content[0] as any)?.text || "";
  
  // Parse HITL metadata from message text (re-parse when text changes)
  // Also check initial text in case message is already loaded
  // IMPORTANT: Parse from raw text BEFORE any markdown processing
  const hitlMetadata = useMemo(() => {
    const textToCheck = text || initialText;
    console.log("🔍 [HITL] Checking for metadata in text. Length:", textToCheck.length, "Has HITL keywords:", textToCheck.includes("HITL_METADATA"));
    
    // Try parsing from current text state
    const parsedFromText = parseHITLMetadata(text);
    if (parsedFromText) {
      console.log("✅ [HITL] Parsed metadata from text state:", parsedFromText);
      return parsedFromText;
    }
    // Fallback: check initial message content if runtime text doesn't have it
    const parsedFromInitial = parseHITLMetadata(initialText);
    if (parsedFromInitial) {
      console.log("✅ [HITL] Parsed metadata from initial text:", parsedFromInitial);
      return parsedFromInitial;
    }
    // If regex parsing failed but keywords exist, try manual extraction
    if (textToCheck.includes("HITL_METADATA") || textToCheck.includes("hitl_request_id")) {
      console.warn("⚠️ [HITL] Regex parsing failed, trying manual extraction. Text length:", textToCheck.length);
      const hitlIndex = textToCheck.indexOf("HITL_METADATA");
      if (hitlIndex > -1) {
        // Extract a larger snippet to ensure we get the full JSON
        const snippet = textToCheck.substring(
          Math.max(0, hitlIndex - 20),
          Math.min(textToCheck.length, hitlIndex + 3000)
        );
        
        // Find the JSON object boundaries
        const jsonStart = snippet.indexOf('{');
        const jsonEnd = snippet.lastIndexOf('}');
        if (jsonStart > 0 && jsonEnd > jsonStart) {
          try {
            // Extract and parse JSON
            let jsonStr = snippet.substring(jsonStart, jsonEnd + 1);
            // Clean up any trailing characters
            jsonStr = jsonStr.trim();
            const extracted = JSON.parse(jsonStr);
            if (extracted.hitl_request_id && extracted.hitl_execution_id) {
              console.log("✅ [HITL] Manually extracted metadata in useMemo:", extracted);
              return extracted as HITLMetadata;
            }
          } catch (e) {
            console.error("❌ [HITL] Manual extraction in useMemo failed:", e);
            const jsonPreview = snippet.substring(jsonStart, Math.min(jsonStart + 500, jsonEnd + 1));
            console.error("❌ [HITL] JSON string preview:", jsonPreview);
          }
        } else {
          console.warn("⚠️ [HITL] Could not find JSON boundaries. HitlIndex:", hitlIndex, "Snippet length:", snippet.length);
        }
      }
    }
    return null;
  }, [text, initialText]);
  
  const displayText = useMemo(() => {
    const textToUse = text || initialText;
    // Always try to remove metadata, even if parsing failed
    // This ensures the HTML comment doesn't show in the UI
    if (textToUse.includes("HITL_METADATA") || textToUse.includes("hitl_request_id")) {
      const cleaned = removeHITLMetadata(textToUse);
      console.log("🧹 [HITL] Removed metadata from display text. Original length:", textToUse.length, "Cleaned length:", cleaned.length);
      if (cleaned.length < textToUse.length) {
        console.log("✅ [HITL] Successfully removed metadata");
      } else {
        console.warn("⚠️ [HITL] Metadata removal didn't change text length - regex might not be matching");
      }
      return cleaned;
    }
    return textToUse;
  }, [text, initialText, hitlMetadata]);

  useEffect(() => {
    if (isStreaming && text.length < 1200) {
      setToolcallHeading("Reasoning ...");
    }
    if (accordianTransitionDone) {
      return;
    }
    if (isStreaming && text.length < 1200) {
      setAccordianValue("tool-results");
      setToolcallHeading("Reasoning ...");
    } else if (isStreaming && text.length > 1200) {
      setAccordianValue("");
      setToolcallHeading("Reasoning completed");
      setAccordianTransitionDone(true);
    }
  }, [isStreaming, text, accordianTransitionDone]);

  // Initialize text from message content for all messages
  useEffect(() => {
    const msgText = (message.content[0] as any)?.text || "";
    if (msgText && msgText !== text) {
      setText(msgText);
      // Debug: Check if this message has HITL metadata
      if (msgText.includes("HITL_METADATA") || msgText.includes("hitl_request_id")) {
        console.log("📥 [HITL] Initialized text from message content. Length:", msgText.length);
        const metadata = parseHITLMetadata(msgText);
        console.log("📥 [HITL] Parsed metadata on init:", metadata);
      }
    }
  }, [message.content, message.id]);

  useEffect(() => {
    if (!message.isLast) return;

    const unsubscribeRuntime = runtime.subscribe(() => {
      const runtimeText = (runtime.getState().content[0] as any)?.text || "";
      setText(runtimeText);
      const tool_calls = runtime
        .getState()
        .content.filter((content) => content.type === "tool-call");

      const callStates = tool_calls.map((call) => {
        return {
          id: call.toolCallId,
          message: (call.result as any)?.response,
          status: (call.result as any)?.event_type,
          details_summary: (call.result as any)?.details?.summary,
        };
      });
      let res: {
        id: string;
        message: string;
        status: string;
        details_summary: string;
      }[] = [];
      for (var i = 0; i < callStates.length; i++) {
        const curr = callStates[i];
        const existing_call_index = res.findIndex((val) => curr.id === val.id);
        if (existing_call_index === -1) {
          res.push(curr);
        } else {
          curr.details_summary =
            res[existing_call_index].details_summary +
            "\n" +
            curr.details_summary;
          res[existing_call_index] = curr;
        }
      }
      setToolsState(res);
    });

    const unsubscribeThreadRuntime = threadRuntime.subscribe(() => {
      setIsStreaming(
        (threadRuntime.getState().extras as any).streaming || false
      );
      setIsError((threadRuntime.getState().extras as any).error || false);
      threadRuntime.getState().messages.at(-1)?.id === message.id &&
        setIsRunning(threadRuntime.getState().isRunning);
    });

    return () => {
      unsubscribeRuntime();
      unsubscribeThreadRuntime();
    };
  }, [message.isLast, message.id, runtime, threadRuntime]);

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
          {/* Render HITL request if metadata is present */}
          {/* Check if HITL keywords exist even if parsing failed */}
          {(() => {
            const hasHitlKeywords = (text || initialText).includes("HITL_METADATA") || (text || initialText).includes("hitl_request_id");
            console.log("🎨 [HITL] Rendering check - hasHitlKeywords:", hasHitlKeywords, "hitlMetadata:", !!hitlMetadata, "isRunning:", isRunning, "text length:", (text || initialText).length);
            
            // Use the parsed metadata (which includes manual extraction from useMemo)
            let metadataToUse = hitlMetadata;
            
            // If parsing failed but keywords exist, try one more time with the raw text
            // Remove isRunning check - HITL messages are complete, not streaming
            if (hasHitlKeywords && !metadataToUse) {
              console.warn("⚠️ [HITL] Parsing failed in useMemo, trying one more time in render");
              const rawText = text || initialText;
              metadataToUse = parseHITLMetadata(rawText);
              if (metadataToUse) {
                console.log("✅ [HITL] Successfully parsed in render:", metadataToUse.hitl_request_id);
              } else {
                // Last resort: try manual extraction
                const hitlIndex = rawText.indexOf("HITL_METADATA");
                if (hitlIndex > -1) {
                  const snippet = rawText.substring(
                    Math.max(0, hitlIndex - 20),
                    Math.min(rawText.length, hitlIndex + 3000)
                  );
                  const jsonStart = snippet.indexOf('{');
                  const jsonEnd = snippet.lastIndexOf('}');
                  if (jsonStart > 0 && jsonEnd > jsonStart) {
                    try {
                      let jsonStr = snippet.substring(jsonStart, jsonEnd + 1).trim();
                      const extracted = JSON.parse(jsonStr);
                      if (extracted.hitl_request_id && extracted.hitl_execution_id) {
                        console.log("✅ [HITL] Manually extracted metadata in render:", extracted.hitl_request_id);
                        metadataToUse = extracted as HITLMetadata;
                      }
                    } catch (e) {
                      console.error("❌ [HITL] Manual extraction in render failed:", e);
                    }
                  }
                }
              }
            }
            
            // Render HITL component if metadata is found (regardless of isRunning - HITL messages are complete)
            if (metadataToUse) {
              // Show interactive HITL component - hide the raw text
              console.log("✅ [HITL] Rendering HITLRequestChat component with metadata:", metadataToUse.hitl_request_id);
              return (
                <div className="mb-4 w-full">
                  <HITLRequestChat
                    metadata={metadataToUse}
                    onResponseSubmitted={(responseData, action) => {
                      // Store the submitted response to show in chat
                      setHitlResponseSubmitted({ data: responseData, action });
                      // Refresh pending requests count and show success
                      console.log("✅ HITL response submitted", responseData, action);
                      // Optionally invalidate queries to refresh sidebar count
                      if (typeof window !== 'undefined' && (window as any).queryClient) {
                        (window as any).queryClient.invalidateQueries({ queryKey: ['pendingHITLRequests'] });
                      }
                    }}
                  />
                </div>
              );
            } else if (hasHitlKeywords) {
              // Metadata exists but all parsing attempts failed - show a link to pending requests
              console.error("❌ [HITL] All parsing attempts failed - hasHitlKeywords:", hasHitlKeywords, "metadataToUse:", metadataToUse);
              const rawText = text || initialText;
              const hitlIndex = rawText.indexOf("HITL_METADATA");
              let requestId = "unknown";
              if (hitlIndex > -1) {
                const preview = rawText.substring(hitlIndex, Math.min(hitlIndex + 500, rawText.length));
                console.error("❌ [HITL] Raw metadata preview:", preview);
                // Try to extract request_id from the preview
                const requestIdMatch = preview.match(/"hitl_request_id"\s*:\s*"([^"]+)"/);
                if (requestIdMatch) {
                  requestId = requestIdMatch[1];
                }
              }
              return (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800 mb-2">
                    ⚠️ HITL request detected but metadata parsing failed.
                  </p>
                  <a 
                    href={`/workflows/pending-requests/${requestId}`}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Click here to view and respond to this request
                  </a>
                </div>
              );
            }
            return null;
          })()}
          {toolsState.length > 0 && !isRunning && (
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
                onValueChange={() => {
                  if (accordionValue === "") {
                    setAccordianValue("tool-results");
                  } else {
                    setAccordianValue("");
                  }
                }}
              >
                <AccordionItem value="tool-results" className="">
                  <AccordionTrigger className="w-96 p-0 flex flex-row justify-start items-center">
                    <div className="italic mr-2">{toolcallHeading}</div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-transparent">
                      <motion.ul
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="w-full"
                      >
                        {toolsState.map((toolState, index) => (
                          <motion.li
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              duration: 0.3,
                              ease: "easeOut",
                            }}
                            key={toolState.id}
                            className="m-1 rounded-sm"
                          >
                            <Accordion
                              type="single"
                              className=""
                              collapsible
                              defaultValue={toolState.id}
                            >
                              <AccordionItem value={toolState.id} className="">
                                <AccordionTrigger className="p-0 flex flex-row justify-start items-center">
                                  <div>
                                    {toolState.status === "result" ? (
                                      <CheckIcon
                                        className="h-4 w-4"
                                        color="green"
                                      />
                                    ) : (
                                      <Loader className="h-4 w-4 animate-spin" />
                                    )}
                                  </div>
                                  <div className="italic ml-2 mr-2">
                                    {toolState.message}
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-12 max-h-96 overflow-y-scroll">
                                  <SharedMarkdown
                                    content={toolState.details_summary}
                                    className="markdown-content break-words break-before-avoid stroke-red-600 text-xs"
                                  />
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </motion.li>
                        ))}
                      </motion.ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </motion.div>
          )}
          {/* Show submitted response if HITL was responded to */}
          {hitlResponseSubmitted && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-700 font-medium">
                  {hitlResponseSubmitted.action === "approved" ? "Approved" :
                   hitlResponseSubmitted.action === "rejected" ? "Rejected" :
                   hitlResponseSubmitted.action === "requested_changes" ? "Changes Requested" :
                   "Response Submitted"}
                </span>
              </div>
              <div className="text-sm text-gray-700">
                <strong>Response:</strong> {formatResponseText(hitlResponseSubmitted.data, hitlResponseSubmitted.action, hitlMetadata?.hitl_node_type)}
              </div>
            </div>
          )}
          {/* Show markdown content (cleaned of HITL metadata) */}
          {/* ALWAYS hide markdown when HITL keywords are detected - component will show instead */}
          {(() => {
            const hasHitlKeywords = (text || initialText).includes("HITL_METADATA") || (text || initialText).includes("hitl_request_id");
            
            // NEVER show markdown if HITL keywords are present and not yet responded to - the component handles display
            if (hasHitlKeywords && !hitlResponseSubmitted) {
              return null; // Component is rendered above, don't show markdown
            }
            
            // Only show markdown if there are no HITL keywords
            if (!isRunning && displayText && displayText.trim()) {
              return (
                <div>
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    transition={{
                      height: { duration: 1, ease: "backInOut" },
                      opacity: { duration: 0.3, delay: 0.5 },
                    }}
                    className="overflow-hidden"
                  >
                    <MarkdownComponent content={{ text: displayText }} />
                  </motion.div>
                </div>
              );
            }
            return null;
          })()}
          {(isRunning || !text) && !isError && (
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
          {isError && (
            <div className="text-red-400">
              There was an error while serving your request. Please try again or
              try with a different model
            </div>
          )}
        </div>
        {!isRunning && <AssistantActionBar streaming={isStreaming} />}
      </MessagePrimitive.Root>
    </motion.div>
  );
};

const AssistantActionBar: FC<{ streaming: boolean }> = ({ streaming }) => {
  const current_message = useMessage();

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
      {current_message.isLast && !streaming && (
        <ActionBarPrimitive.Reload asChild>
          <TooltipIconButton tooltip="Refresh">
            <RefreshCwIcon />
          </TooltipIconButton>
        </ActionBarPrimitive.Reload>
      )}
    </ActionBarPrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn("text-black inline-flex items-center text-xs", className)}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
