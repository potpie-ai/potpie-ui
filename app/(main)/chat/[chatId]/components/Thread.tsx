
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
import { useMemo, useState, type FC } from "react";
import {
  ArrowDownIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  Loader,
  RefreshCwIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import ReactMarkdown from "react-markdown";
import MyCodeBlock from "@/components/codeBlock";
import MessageComposer from "./MessageComposer";
import remarkGfm from "remark-gfm";
import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";

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

  runtime.subscribe(() => {
    setIsLoading((runtime.getState().extras as any)?.loading === true || false);
  });

  let userMessage = useMemo(() => {
    return UserMessageWithURL(userImageURL);
  }, [userImageURL]);

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
                <div className="pb-24 bg-inherit min-w-96 w-full">
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
              {<Composer projectId={projectId} disabled={writeDisabled} conversation_id={conversation_id} />}
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
  const markdownContent = content;

  return (
    <ReactMarkdown
      className="markdown-content break-words break-before-avoid [&_p]:!leading-tight [&_p]:!my-0.5 [&_li]:!my-0.5 animate-blink"
      components={{
        code: ({ children }) => (
          <span className="whitespace-pre-wrap">
            <code className="bg-gray-100 text-red-500 overflow-x-scroll rounded px-1 py-0.5 text-sm font-bold">
              {children}
            </code>
          </span>
        ),
      }}
      remarkPlugins={[remarkGfm]}
    >
      {markdownContent}
    </ReactMarkdown>
  );
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
            {section.type === "code" && (
              <div className="pb-4 text-xs max-w-4xl">
                <MyCodeBlock
                  code={section.content}
                  language={section.language || "json"}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};
const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="h-8 w-8 z-20 mb-8 rounded-full hover:scale-105 shadow-md hover:shadow-lg disabled:invisible transition ease-out"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
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
        autoSend
      >
        <span className="line-clamp-2 text-ellipsis text-sm">
          What does this repo do?
        </span>
      </ThreadPrimitive.Suggestion>
      <ThreadPrimitive.Suggestion
        className="hover:bg-slate-300/20 flex max-w-sm min-w-fit basis-0 flex-col items-center justify-center rounded-full p-3 border border-neutral-400/20 transition-colors ease-in"
        prompt="How do i add integration tests to @somefile.ext?"
        method="replace"
        autoSend
      >
        <span className="line-clamp-2 text-ellipsis text-sm">
          How do i add integration tests to @ ?
        </span>
      </ThreadPrimitive.Suggestion>
      <ThreadPrimitive.Suggestion
        className="hover:bg-slate-300/20 flex max-w-sm min-w-fit basis-0 flex-col items-center justify-center rounded-full p-3 border border-neutral-400/20 transition-colors ease-in"
        prompt="Write a typescript client for the router at @"
        method="replace"
        autoSend
      >
        <span className="line-clamp-2 text-ellipsis text-sm">
          Write a typescript client for the router at @
        </span>
      </ThreadPrimitive.Suggestion>
    </div>
  );
};

const Composer: FC<{ projectId: string; disabled: boolean; conversation_id: string }> = ({
  projectId,
  disabled,
  conversation_id,
}) => {
  const composer = useComposerRuntime();

  const setSelectedNodesInConfig = (selectedNodes: any[]) => {
    composer.setRunConfig({
      custom: {
        selectedNodes: selectedNodes,
      },
    });
  };

  const [key, setKey] = useState(0);

  const runtime = useThreadRuntime();
  const [isStreaming, setIsStreaming] = useState(false);
  runtime.subscribe(() => {
    setIsStreaming(
      (runtime.getState().extras as any)?.streaming === true || false
    );
  });

  return (
    <ComposerPrimitive.Root
      className="bg-white z-10 w-3/4 focus-within:-translate-y-4 focus-within:border-ring/50 flex flex-wrap items-end rounded-lg border px-2.5 shadow-xl focus-within:shadow-2xl transition-all ease-in-out"
      onSubmit={() => {
        setKey(key + 1); // Current this is used to rerender MessageComposer (so that message and nodes are reset)
      }}
    >
      <MessageComposer
        projectId={projectId}
        conversation_id = {conversation_id}
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex items-center justify-end w-full"
    >
      <MessagePrimitive.Root className="w-auto pr-5 grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 [&:where(>*)]:col-start-2 max-w-[var(--thread-max-width)] py-4">
        <div className="bg-[#f7e6e6] text-foreground max-w-[calc(var(--thread-max-width)*0.8)] break-words rounded-3xl px-5 py-2.5 col-start-2 row-start-2">
          <MessagePrimitive.Content />
        </div>
      </MessagePrimitive.Root>
      <Avatar className="mr-4 rounded-md bg-transparent">
        <AvatarImage src={userPhotoURL} alt="User" />
        <AvatarFallback className="bg-lime-500 text-white">U</AvatarFallback>
      </Avatar>
    </motion.div>
  );
};

const AssistantMessage: FC = () => {
  const message = useMessage();
  const runtime = useMessageRuntime();

  const threadRuntime = useThreadRuntime();
  const [isStreaming, setIsStreaming] = useState(false);
  const [text, setText] = useState((message.content[0] as any)?.text || "");
  const [isRunning, setIsRunning] = useState(false);

  const [toolsState, setToolsState] = useState<
    { id: string; message: string; status: string }[]
  >([]);

  if (message.isLast) {
    runtime.subscribe(() => {
      setText((runtime.getState().content[0] as any)?.text || "");
      const tool_calls = runtime
        .getState()
        .content.filter((content) => content.type === "tool-call");

      const callStates = tool_calls.map((call) => {
        return {
          id: call.toolCallId,
          message: (call.result as any)?.response,
          status: (call.result as any)?.event_type,
        };
      });
      let res: { id: string; message: string; status: string }[] = [];
      for (var i = 0; i < callStates.length; i++) {
        const curr = callStates[i];
        const existing_call_index = res.findIndex((val) => curr.id === val.id);
        if (existing_call_index === -1) {
          res.push(curr);
        } else {
          res[existing_call_index] = curr;
        }
      }
      setToolsState(res);
    });

    threadRuntime.subscribe(() => {
      setIsStreaming(
        (threadRuntime.getState().extras as any).streaming || false
      );
      threadRuntime.getState().messages.at(-1)?.id === message.id &&
        setIsRunning(threadRuntime.getState().isRunning);
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <MessagePrimitive.Root className="w-11/12 grid grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] relative py-4">
        <Avatar className="mr-4 rounded-none bg-transparent">
          <AvatarImage src="/images/potpie-blue.svg" alt="Agent" />
          <AvatarFallback className="bg-blue-500 text-white">P</AvatarFallback>
        </Avatar>
        <div className="rounded-md text-foreground max-w-[calc(var(--thread-max-width)*0.8)] break-words leading-7 col-span-2 col-start-2 row-start-1 my-1.5">
          {toolsState.length > 0 && !isRunning && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mb-4"
            >
              <div className="w-96 bg-transparent">
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
                        duration: 0.6,
                        ease: "easeOut",
                      }}
                      key={toolState.id}
                      className="m-1 rounded-sm flex flex-row justify-start items-center"
                    >
                      <div>
                        {toolState.status === "result" ? (
                          <CheckIcon className="h-4 w-4" color="green" />
                        ) : (
                          <Loader className="h-4 w-4 animate-spin" />
                        )}
                      </div>
                      <div className="italic ml-2">{toolState.message}</div>
                    </motion.li>
                  ))}
                </motion.ul>
              </div>
            </motion.div>
          )}
          {!isRunning && text ? (
            <div>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                transition={{
                  height: { duration: 1, ease: "backInOut" },
                  opacity: { duration: 0.5, delay: 0.5 },
                }}
                className="overflow-hidden"
              >
                <MarkdownComponent content={{ text: text }} />
              </motion.div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.6,
                ease: "easeOut",
                staggerChildren: 0.5,
              }}
            >
              <Skeleton key={1} className="h-4 w-1/2 mb-2"></Skeleton>
              <Skeleton key={2} className="h-4 w-1/2 mb-2"></Skeleton>
              <Skeleton key={3} className="h-4 w-1/3"></Skeleton>
            </motion.div>
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
      className="text-muted-foreground flex gap-1 col-start-3 row-start-2 -ml-1 data-[floating]:bg-background data-[floating]:absolute data-[floating]:rounded-md data-[floating]:border data-[floating]:p-1 data-[floating]:shadow-sm"
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
      className={cn(
        "text-muted-foreground inline-flex items-center text-xs",
        className
      )}
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

