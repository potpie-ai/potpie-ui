import getHeaders from "@/app/utils/headers.util";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
} from "@assistant-ui/react";
import { Avatar, AvatarFallback } from "@radix-ui/react-avatar";
import { Dialog } from "@radix-ui/react-dialog";

import axios from "axios";
import {
  SendHorizontalIcon,
  CircleStopIcon,
  X,
  Loader2Icon,
  Crown,
} from "lucide-react";
import { FC, useRef, useState, KeyboardEvent, useEffect } from "react";
import ChatService from "@/services/ChatService";
import Image from "next/image";
import MinorService from "@/services/minorService";
import { useAuthContext } from "@/contexts/AuthContext";

interface MessageComposerProps extends React.HTMLAttributes<HTMLDivElement> {
  projectId: string;
  input: string;
  nodes: NodeOption[];
  disabled: boolean;
  conversation_id: string;
  setSelectedNodesInConfig: (selectedNodes: any[]) => void;
}

interface NodeOption {
  content: string;
  file_path: string;
  match_type: string;
  name: string;
  node_id: string;
  relevance: number;
}

const free_models = ["openai/gpt-4.1", "openai/gpt-4o", "openai/gpt-4.1-mini"];

const MessageComposer = ({
  projectId,
  input,
  nodes,
  disabled,
  conversation_id,
  setSelectedNodesInConfig,
}: MessageComposerProps) => {
  const [nodeOptions, setNodeOptions] = useState<NodeOption[]>([]);

  const [selectedNodes, setSelectedNodes] = useState<NodeOption[]>(nodes);
  useEffect(() => {
    setSelectedNodesInConfig(selectedNodes);
  }, [selectedNodes, setSelectedNodesInConfig]);

  const [message, setMessage] = useState(input);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(-1);
  const [isSearchingNode, setIsSearchingNode] = useState(false);
  const [isTextareaDisabled, setIsTextareaDisabled] = useState(false);

  const messageRef = useRef<HTMLTextAreaElement>(null);

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
    }
    setIsSearchingNode(false);
  };

  const composer = useComposerRuntime();
  composer.subscribe(() => {
    if (message != composer.getState().text) {
      setMessage(composer.getState().text);
    }
  });

  const handleNodeSelect = (node: NodeOption) => {
    const cursorPosition = messageRef.current?.selectionStart || 0;
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
    setSelectedNodes((curr) => curr.filter((n) => n.node_id != node.node_id));
  };

  const handleMessageChange = (e: any) => {
    const value: string = e.target.value;
    setMessage(value);

    const cursorPosition = e.target.selectionStart;
    const lastAtPosition = value.lastIndexOf("@");

    if (
      lastAtPosition !== -1 &&
      cursorPosition > lastAtPosition &&
      !value.slice(lastAtPosition, cursorPosition + 1).includes(" ")
    ) {
      const query = value.substring(lastAtPosition + 1, cursorPosition);
      if (query.trim().length > 0 && !query.includes(" ")) {
        if (searchTimeout) clearTimeout(searchTimeout);

        setIsSearchingNode(true);
        const timeoutId = setTimeout(() => {
          fetchNodes(query);
          setIsSearchingNode(false);
        }, 300);
        setSearchTimeout(timeoutId);
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
        } else {
          // handleSubmit(e as unknown as FormEvent);
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
    if (e.key != "Enter" && e.key != "ArrowDown" && e.key != "ArrowUp")
      handleMessageChange(e);
  };

  const selectedNodeRef = useRef<HTMLLIElement | null>(null);

  // Scroll to the target element when targetIndex changes
  useEffect(() => {
    if (selectedNodeRef.current && selectedNodeIndex > 4) {
      selectedNodeRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [selectedNodeIndex]);

  const NodeSelection = () => {
    return (
      <div className="max-h-40 overflow-scroll border-2 rounded-sm border-gray-400/40">
        {
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
                    className={`flex m-1 flex-row cursor-pointer rounded-sm text-s p1 px-2 transition ease-out ${index === selectedNodeIndex ? "bg-gray-200" : "hover:bg-gray-200"}`}
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
        }
      </div>
    );
  };

  const handleSend = () => {
    composer.send();
    setMessage("");
    setSelectedNodes([]);
  };

  const [currPlan, setCurrPlan] = useState<string | undefined>(undefined);
  const { user } = useAuthContext();
  const [currentModel, setCurrentModel] = useState<{
    provider: string;
    name: string;
    id: string;
  } | null>(null);
  const loadCurrentModel = async () => {
    try {
      const data = await MinorService.fetchUserSubscription(user?.uid);
      setCurrPlan(data.plan_type);
    } catch (error) {
      console.error("Error fetching user plan: ", error);
    }
    const res = await ModelService.getCurrentModel();

    res &&
      res.chat_model &&
      setCurrentModel({
        provider: res.chat_model.provider,
        name: res.chat_model.name,
        id: res.chat_model.id,
      });
  };
  useEffect(() => {
    loadCurrentModel();
  }, []);

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
          <TooltipIconButton
            tooltip="Enhance Prompt"
            variant="default"
            className="size-8 p-2 transition ease-in bg-white hover:bg-orange-200"
            onClick={handleEnhancePrompt}
          >
            <span className="text-lg">✨</span>
          </TooltipIconButton>
        </div>
        <ThreadPrimitive.If running={false}>
          <TooltipIconButton
            disabled={disabled}
            tooltip="Send"
            variant="default"
            className="my-2.5 size-8 p-2 transition-opacity ease-in"
            onClick={handleSend}
          >
            <SendHorizontalIcon />
          </TooltipIconButton>
        </ThreadPrimitive.If>
        <ThreadPrimitive.If running>
          <ComposerPrimitive.Cancel asChild>
            <TooltipIconButton
              disabled={disabled}
              tooltip="Cancel"
              variant="default"
              className="my-2.5 size-8 p-2 transition-opacity ease-in"
            >
              <CircleStopIcon />
            </TooltipIconButton>
          </ComposerPrimitive.Cancel>
        </ThreadPrimitive.If>
      </div>
    );
  };

  const handleEnhancePrompt = async () => {
    try {
      setIsTextareaDisabled(true);
      setMessage("Enhancing...");
      const enhancedMessage = await ChatService.enhancePrompt(
        conversation_id,
        message
      );
      setMessage(enhancedMessage);
      composer.setText(enhancedMessage);
    } catch (error) {
      console.error("Error enhancing prompt:", error);
    } finally {
      setIsTextareaDisabled(false);
    }
  };

  return (
    <div className="flex flex-col w-full p-2">
      {(nodeOptions?.length > 0 || isSearchingNode) && <NodeSelection />}
      <div className="flex flex-row">
        {/* display selected nodes */}
        {selectedNodes.map((node) => (
          <div
            key={node.name}
            className="flex flex-row items-center justify-center p-2 m-2 rounded-full bg-[#f7e6e6] shadow-sm"
          >
            <span>{node.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="ml-2 h-4 w-4 hover:bg-red-400/50 hover:scale-105 hover:shadow-md transition ease-out"
              onClick={() => handleNodeDeselect(node)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex flex-col w-full items-start gap-4">
        <ComposerPrimitive.Input
          submitOnEnter={!disabled}
          ref={messageRef}
          value={message}
          rows={1}
          autoFocus
          placeholder={"Type @ followed by file or function name"}
          onChange={handleMessageChange}
          onKeyDown={handleKeyPress}
          className="w-full placeholder:text-gray-400 max-h-80 flex-grow resize-none border-none bg-transparent px-4 py-4 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed"
        />
        <ComposerAction disabled={disabled} />
      </div>
    </div>
  );
};

export default MessageComposer;

const truncateFilePath = (filePath: string) => {
  if (!filePath) {
    return;
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
  currentModel: { provider: string; name: string } | null;
  disabled: boolean;
  currPlan: string | undefined;
  loadCurrentModel: () => {};
}> = ({ currentModel, disabled, currPlan, loadCurrentModel }) => {
  // ModelService.listModels();
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

    const response = res.models
      // .filter((model) => model.is_chat_model)
      .map((model) => {
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
        <DialogTrigger asChild>
          <Button
            variant={"secondary"}
            className="p-2 transition ease-in bg-white hover:bg-gray-200"
            disabled={disabled}
            onClick={handleModelList}
          >
            <div className="flex flex-row justify-center items-center">
              <Image
                height={20}
                width={20}
                src={currentModel.provider + ".svg"}
                alt={currentModel.provider.charAt(0)}
              />

              <h1 className="ml-2 opacity-70">{currentModel.name}</h1>
            </div>
          </Button>
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
                              className={`flex flex-row items-start ${selectedId === model.id ? "animate-pulse" : ""} ${!free_models.includes(model.id) && currPlan == "free" ? "opacity-50" : ""}`}
                              onSelect={handleModelSelect(model.id)}
                              value={model.name + " " + model.provider}
                            >
                              <Avatar className="overflow-hidden rounded-full w-10 h-10">
                                <AvatarImage
                                  src={model.provider + ".svg"}
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
