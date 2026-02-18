import getHeaders from "@/app/utils/headers.util";
import { Button } from "@/components/ui/button";
import { isMultimodalEnabled } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import ModelService from "@/services/ModelService";
import {
  ComposerPrimitive,
  ThreadPrimitive,
  useComposerRuntime,
  useThreadRuntime,
} from "@assistant-ui/react";
import {
  ComposerAddAttachment,
  ComposerAttachments,
} from "@/components/assistant-ui/attachment";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { Dialog } from "@radix-ui/react-dialog";
import axios from "axios";
import {
  SendHorizontalIcon,
  CircleStopIcon,
  X,
  Loader2Icon,
  Crown,
  Zap,
} from "lucide-react";
import {
  FC,
  useRef,
  useState,
  KeyboardEvent,
  useEffect,
  useCallback,
} from "react";
import ChatService from "@/services/ChatService";
import Image from "next/image";
import MinorService from "@/services/minorService";
import { useAuthContext } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

interface MessageComposerProps {
  projectId: string;
  disabled: boolean;
  conversation_id: string;
}

interface NodeOption {
  content: string;
  file_path: string;
  match_type: string;
  name: string;
  node_id: string;
  relevance: number;
}

const free_models = ["openai/gpt-5-mini", "openrouter/moonshotai/kimi-k2.5"];

const MessageComposer = ({
  projectId,
  disabled,
  conversation_id,
}: MessageComposerProps) => {
  const [nodeOptions, setNodeOptions] = useState<NodeOption[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<NodeOption[]>([]);
  const [message, setMessage] = useState("");
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(-1);
  const [isSearchingNode, setIsSearchingNode] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Use thread runtime to check if streaming is in progress
  const threadRuntime = useThreadRuntime();
  const [isThreadRunning, setIsThreadRunning] = useState(false);

  // Subscribe to thread running state
  useEffect(() => {
    const unsubscribe = threadRuntime.subscribe(() => {
      setIsThreadRunning(threadRuntime.getState().isRunning);
    });
    // Set initial state
    setIsThreadRunning(threadRuntime.getState().isRunning);
    return unsubscribe;
  }, [threadRuntime]);

  const isDisabled = disabled || isThreadRunning || isEnhancing;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const composer = useComposerRuntime();

  // Sync composer text with local state only when composer text changes externally
  // Use refs to avoid closure issues and re-render loops
  const messageRef = useRef(message);
  const lastSyncedComposerText = useRef<string>("");

  // Keep messageRef in sync with message state
  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  useEffect(() => {
    const unsubscribe = composer.subscribe(() => {
      const composerText = composer.getState().text;
      // Only update local state if composer text changed externally (not from our onChange)
      // This prevents re-render loops when typing
      if (
        lastSyncedComposerText.current !== composerText &&
        messageRef.current !== composerText
      ) {
        lastSyncedComposerText.current = composerText;
        messageRef.current = composerText;
        setMessage(composerText);
      }
    });
    return unsubscribe;
  }, [composer]); // Only depend on composer, not message

  // Update runtime config when nodes change
  useEffect(() => {
    composer.setRunConfig({
      custom: {
        selectedNodes: selectedNodes,
      },
    });
  }, [selectedNodes, composer]);

  useEffect(() => {
    const unsubscribe =
      composer.unstable_on?.("send", () => {
        // Clear composer text
        composer.setText("");
        // Clear composer run config
        composer.setRunConfig({
          custom: {
            selectedNodes: [],
          },
        });
        // Clear React state
        setSelectedNodes([]);
        setNodeOptions([]);
        setSelectedNodeIndex(-1);
        setMessage("");
        // Clear refs
        messageRef.current = "";
        lastSyncedComposerText.current = "";
      }) ?? undefined;

    return unsubscribe;
  }, [composer]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Node fetching and handling
  const fetchNodes = async (query: string) => {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    setIsSearchingNode(true);
    try {
      const response = await axios.post(
        `${baseUrl}/api/v1/search`,
        { project_id: projectId, query },
        { headers }
      );
      if (response.data.results && response.data.results.length > 0) {
        setNodeOptions(response.data.results);
      } else {
        setNodeOptions([]);
      }
      setSelectedNodeIndex(0);
    } catch (error) {
      console.error("Error fetching nodes:", error);
      setNodeOptions([]);
    } finally {
      setIsSearchingNode(false);
    }
  };

  const handleNodeSelect = (node: NodeOption) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const messageBeforeCursor = message.slice(0, cursorPosition);
    const messageAfterCursor = message.slice(cursorPosition);

    if (selectedNodes.find((n) => n.node_id === node.node_id)) {
      return;
    }

    const lastAtPosition = messageBeforeCursor.lastIndexOf("@");
    if (lastAtPosition !== -1) {
      const textBeforeAt = messageBeforeCursor.slice(0, lastAtPosition);
      const textAfterAt = messageBeforeCursor.slice(lastAtPosition + 1);

      const spaceAfterAt = Math.min(
        textAfterAt.indexOf(" "),
        textAfterAt.indexOf("\n")
      );
      const rest =
        spaceAfterAt !== -1 ? textAfterAt.slice(0, spaceAfterAt) : textAfterAt;

      const nodeText = `@${node.name} `;

      const newMessage = `${textBeforeAt}${nodeText}${messageAfterCursor}`;
      setMessage(newMessage);
      composer.setText(newMessage);
    }

    setSelectedNodes((curr) => [...curr, node]);
    setNodeOptions([]);
  };

  const handleNodeDeselect = (node: NodeOption) => {
    setSelectedNodes((curr) => curr.filter((n) => n.node_id !== node.node_id));
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value: string = e.target.value;
    setMessage(value);
    composer.setText(value);
    // Update ref to prevent subscription from triggering update
    lastSyncedComposerText.current = value;

    const cursorPosition = e.target.selectionStart;
    const lastAtPosition = value.lastIndexOf("@");

    if (
      lastAtPosition !== -1 &&
      cursorPosition > lastAtPosition &&
      !value.slice(lastAtPosition, cursorPosition + 1).includes(" ")
    ) {
      const query = value.substring(lastAtPosition + 1, cursorPosition);
      if (query.trim().length > 0 && !query.includes(" ")) {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        // Debounce the search - fetchNodes owns the loading state
        const timeoutId = setTimeout(() => {
          void fetchNodes(query);
        }, 300);
        searchTimeoutRef.current = timeoutId;
      }
    } else {
      setNodeOptions([]);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (nodeOptions.length > 0) {
      if (e.key === "Enter" && !e.shiftKey && nodeOptions.length > 0) {
        if (selectedNodeIndex >= 0) {
          e.preventDefault();
          handleNodeSelect(nodeOptions[selectedNodeIndex]);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedNodeIndex((prevIndex) =>
          Math.min(prevIndex + 1, nodeOptions.length - 1)
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedNodeIndex((prevIndex) => Math.max(prevIndex - 1, 0));
      }
    }
  };

  const selectedNodeRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (selectedNodeRef.current && selectedNodeIndex > 4) {
      selectedNodeRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [selectedNodeIndex]);

  const NodeSelection = () => {
    return (
      <div className="max-h-40 overflow-scroll border-2 rounded-sm border-gray-400/40">
        <ul>
          {isSearchingNode ? (
            <Skeleton className="w-full h-20 m-4" />
          ) : (
            nodeOptions
              ?.sort((a, b) => b.relevance - a.relevance)
              .map((node, index) => (
                <li
                  key={node.node_id}
                  ref={(el) => {
                    if (index === selectedNodeIndex && el) {
                      selectedNodeRef.current = el;
                    }
                  }}
                  className={`flex m-1 flex-row cursor-pointer rounded-sm text-s p1 px-2 transition ease-out ${
                    index === selectedNodeIndex
                      ? "bg-gray-200"
                      : "hover:bg-gray-200"
                  }`}
                  onClick={() => handleNodeSelect(node)}
                >
                  <div className="font-semibold min-w-40">{node.name}</div>
                  <div className="ml-10 text-sm text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
                    {truncateFilePath(node.file_path)}
                  </div>
                </li>
              ))
          )}
        </ul>
      </div>
    );
  };

  const handleSend = () => {
    // Only send the message - let the "send" event handler manage cleanup
    composer.send();
  };

  const handleEnhancePrompt = async () => {
    try {
      setIsEnhancing(true);
      setMessage("Enhancing...");
      composer.setText("Enhancing...");
      const enhancedMessage = await ChatService.enhancePrompt(
        conversation_id,
        message
      );
      setMessage(enhancedMessage);
      composer.setText(enhancedMessage);
    } catch (error) {
      console.error("Error enhancing prompt:", error);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Model selection
  const [currPlan, setCurrPlan] = useState<string | undefined>(undefined);
  const { user } = useAuthContext();
  const [currentModel, setCurrentModel] = useState<{
    provider: string;
    name: string;
    id: string;
  } | null>(null);

  const { data: userSubscription } = useQuery({
    queryKey: ["userSubscription", user?.uid],
    queryFn: () => MinorService.fetchUserSubscription(user?.uid as string),
    enabled: !!user?.uid,
    retry: false,
  });

  useEffect(() => {
    if (userSubscription?.plan_type) {
      setCurrPlan(userSubscription.plan_type);
    }
  }, [userSubscription?.plan_type]);

  const loadCurrentModel = useCallback(async () => {
    try {
      const res = await ModelService.getCurrentModel();
      if (res && res.chat_model) {
        setCurrentModel({
          provider: res.chat_model.provider,
          name: res.chat_model.name,
          id: res.chat_model.id,
        });
      }
    } catch (error) {
      console.error("Error fetching current model: ", error);
    }
  }, []);

  useEffect(() => {
    loadCurrentModel();
  }, [loadCurrentModel]);

  const ComposerAction: FC<{ disabled: boolean }> = ({ disabled }) => {
    return (
      <div className="flex flex-row w-full items-center justify-end space-x-4">
        <ModelSelection
          currentModel={currentModel}
          currPlan={currPlan}
          loadCurrentModel={loadCurrentModel}
          disabled={disabled}
        />
        <div className="flex items-center justify-end">
          <button
            type="button"
            title="Enhance Prompt"
            className="size-8 p-2 transition ease-in bg-white hover:bg-orange-200 rounded-md flex items-center justify-center"
            onClick={handleEnhancePrompt}
            disabled={isDisabled}
          >
            <span className="text-lg">✨</span>
          </button>
        </div>
        <ThreadPrimitive.If running={false}>
          <button
            type="button"
            disabled={isDisabled}
            title="Send"
            className="my-2.5 size-8 p-2 transition-opacity ease-in rounded-md flex items-center justify-center bg-white hover:bg-gray-100"
            onClick={handleSend}
          >
            <SendHorizontalIcon />
          </button>
        </ThreadPrimitive.If>
        <ThreadPrimitive.If running>
          <ComposerPrimitive.Cancel
            className="my-2.5 size-8 p-2 transition-opacity ease-in rounded-md flex items-center justify-center bg-white hover:bg-gray-100 border-none cursor-pointer"
          >
            <CircleStopIcon />
          </ComposerPrimitive.Cancel>
        </ThreadPrimitive.If>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full py-2 bg-white rounded-lg">
      {(nodeOptions?.length > 0 || isSearchingNode) && <NodeSelection />}

      {selectedNodes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Context
          </span>
          {selectedNodes.map((node) => (
            <span
              key={node.node_id}
              className="flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-800 shadow-sm"
            >
              {node.name}
              <button
                type="button"
                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-background/80 text-rose-600 transition hover:bg-background hover:text-rose-800"
                onClick={() => handleNodeDeselect(node)}
                aria-label={`Remove ${node.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div
        ref={containerRef}
        className="flex flex-col w-full items-start gap-4 outline-none"
        tabIndex={0}
      >
        {/* Attachment Previews - using assistant-ui components */}
        {isMultimodalEnabled() && <ComposerAttachments />}

        <div className="flex flex-row w-full items-end gap-2">
          {/* Attachment Button - using assistant-ui component */}
          {isMultimodalEnabled() && (
            <div className="flex items-center pb-4">
              <ComposerAddAttachment />
            </div>
          )}

          <ComposerPrimitive.Input
            submitOnEnter={!isDisabled}
            ref={textareaRef}
            value={message}
            rows={1}
            autoFocus
            placeholder="Type @ followed by file or function name, or paste/upload images"
            onChange={handleMessageChange}
            onKeyDown={handleKeyPress}
            disabled={isDisabled}
            className="w-full placeholder:text-gray-400 max-h-80 flex-grow resize-none border-none bg-transparent px-4 py-4 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed"
          />
        </div>

        <ComposerAction disabled={isDisabled} />
      </div>
    </div>
  );
};

export default MessageComposer;

const truncateFilePath = (filePath: string) => {
  if (!filePath) {
    return "";
  }
  const maxLength = 100;
  if (filePath.length <= maxLength) {
    return filePath;
  }

  const fileNameIndex = filePath.lastIndexOf("/");
  const fileName = filePath.slice(fileNameIndex + 1);

  const truncatedPath =
    filePath.length > maxLength
      ? "..." + filePath.slice(-maxLength + fileName.length + 3)
      : filePath;

  return truncatedPath;
};

const ModelSelection: FC<{
  currentModel: { provider: string; name: string; id: string } | null;
  disabled: boolean;
  currPlan: string | undefined;
  loadCurrentModel: () => Promise<void>;
}> = ({ currentModel, disabled, currPlan, loadCurrentModel }) => {
  const _models: {
    [key: string]: {
      provider: string;
      name: string;
      id: string;
      description: string;
    }[];
  } = {};
  const [models, setModels] = useState(_models);
  const [loading, setLoading] = useState(true);

  const handleModelList = async () => {
    setLoading(true);
    const res = await ModelService.listModels();

    const response = res.models.map((model) => {
      return {
        provider: model.provider,
        name: model.name,
        id: model.id,
        description: model.description,
      };
    });

    let dict: {
      [key: string]: {
        provider: string;
        name: string;
        id: string;
        description: string;
      }[];
    } = {};
    for (let i = 0; i < response.length; i++) {
      if (!dict[response[i].provider]) {
        dict[response[i].provider] = [response[i]];
      } else {
        dict[response[i].provider].push(response[i]);
      }
    }

    setModels(dict);
    setLoading(false);
  };

  const [selectedId, setSelectedId] = useState("");

  const handleModelSelect = (id: string) => {
    if (currPlan == "free" && !free_models.includes(id)) {
      return;
    }
    return async () => {
      setSelectedId(id);
      await ModelService.setCurrentModel(id);
      await loadCurrentModel();
    };
  };

  return (
    <Dialog>
      {currentModel ? (
        <DialogTrigger
          className="p-2 transition ease-in bg-background hover:bg-gray-200 rounded-md flex items-center justify-center border-none cursor-pointer"
          disabled={disabled}
          onClick={handleModelList}
        >
          <div className="flex flex-row justify-center items-center">
            <Image
                height={20}
                width={20}
                src={`/chat/${currentModel.provider}.svg`}
                alt={currentModel.provider.charAt(0)}
              />

            <h1 className="ml-2 opacity-70">{currentModel.name}</h1>
          </div>
        </DialogTrigger>
      ) : (
        <div className="flex flex-row items-center justify-center">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-sm ml-1" />
        </div>
      )}
      <DialogContent
        showX={false}
        className="bg-transparent p-0 w-1/2 max-w-full max-h-full"
      >
        <DialogTitle hidden={true}>Select Model</DialogTitle>
        <DialogDescription hidden={true}>
          List of llm models to select from
        </DialogDescription>
        <Command className="rounded-lg border shadow-md w-full">
          <CommandInput placeholder="Type a command or search..." />
          {loading ? (
            <div className="m-4">
              <div className="flex flex-row items-center mb-2">
                <Skeleton className="w-10 h-10 rounded-full" />
                <Skeleton className="w-2/3 h-6 ml-2" />
              </div>
              <Skeleton className="w-2/3 h-6 mb-2" />
              <Skeleton className="w-2/3 h-6 mb-2" />
              <div className="flex flex-row items-center mb-2">
                <Skeleton className="w-10 h-10 rounded-full" />
                <Skeleton className="w-2/3 h-6 ml-2" />
              </div>
              <Skeleton className="w-2/3 h-6 mb-2" />
              <Skeleton className="w-2/3 h-6 mb-2" />
              <div className="flex flex-row items-center mb-2">
                <Skeleton className="w-10 h-10 rounded-full" />
                <Skeleton className="w-2/3 h-6 ml-2" />
              </div>
              <Skeleton className="w-2/3 h-6 mb-2" />
              <Skeleton className="w-2/3 h-6 mb-2" />
            </div>
          ) : (
            <CommandList className="px-5">
              <CommandEmpty>No models found</CommandEmpty>
              {models &&
                Object.keys(models).length > 0 &&
                Object.values(models).map((models_) => {
                  return (
                    models_.length > 0 && (
                      <CommandGroup
                        key={models_[0].provider}
                        heading={models_[0].provider}
                      >
                        {models_.map((model) => {
                          return (
                            <CommandItem
                              key={model.id}
                              className={`flex flex-row items-start ${
                                selectedId === model.id ? "animate-pulse" : ""
                              } ${
                                !free_models.includes(model.id) &&
                                currPlan == "free"
                                  ? "opacity-50"
                                  : ""
                              }`}
                              onSelect={handleModelSelect(model.id)}
                              value={model.name + " " + model.provider}
                            >
                                <Avatar className="overflow-hidden rounded-full w-10 h-10">
                                  <AvatarImage
                                    src={`/chat/${model.provider}.svg`}
                                    alt={model.provider}
                                    className="w-10 h-10"
                                  />
                                  <AvatarFallback>
                                    {model.provider.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              <div className="flex flex-col">
                                <div className="flex flex-row items-center">
                                  <span className="ml-2">{model.name}</span>
                                  {selectedId === model.id && (
                                    <Loader2Icon className="ml-2 h-3 w-3 animate-spin" />
                                  )}
                                  {!free_models.includes(model.id) &&
                                    currPlan == "free" && (
                                      <div className="text-xs shadow-sm flex items-center rounded-sm ml-2 p-0.5 px-1 bg-yellow-300">
                                        {" "}
                                        <Crown className="h-3 w-3 mr-1" />
                                        Upgrade Plan
                                      </div>
                                    )}
                                </div>
                                <div className="text-xs italic ml-2 mt-1">
                                  {model.description}
                                </div>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    )
                  );
                })}
            </CommandList>
          )}
        </Command>
      </DialogContent>
    </Dialog>
  );
};
