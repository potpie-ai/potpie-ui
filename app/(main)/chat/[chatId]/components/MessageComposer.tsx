import getHeaders from "@/app/utils/headers.util";
import { AvatarImage } from "@/components/ui/avatar";
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
  ImageIcon,
  Paperclip,
} from "lucide-react";
import { FC, useRef, useState, KeyboardEvent, useEffect } from "react";
import ChatService from "@/services/ChatService";
import Image from "next/image";
import MinorService from "@/services/minorService";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import { useQuery } from "@tanstack/react-query";

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
  const { backgroundTaskActive } = useSelector((state: RootState) => state.chat);

  // Modify the disabled prop logic in the component
  const isDisabled = disabled || backgroundTaskActive;

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
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const messageRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Update config when images or nodes change
  useEffect(() => {
    composer.setRunConfig({
      custom: {
        selectedNodes: selectedNodes,
        images: images
      }
    });
  }, [selectedNodes, images, composer]);

  // Use a flag to prevent double processing
  const processingPaste = useRef(false);

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
    // For now, we'll handle images through the runtime custom config
    // The actual image handling will be done in the runtime when onNew is called
    
    composer.send();
    setMessage("");
    setSelectedNodes([]);
    setImages([]);
    setImagePreviews([]);
  };

  const handleImageSelect = (files: FileList | null) => {
    if (!files) return;
    
    const newImages = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (newImages.length === 0) return;
    
    setImages(prev => [...prev, ...newImages]);
    
    // Generate previews
    newImages.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreviews(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImagePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!isMultimodalEnabled()) return;

    // Prevent double processing
    if (processingPaste.current) return;
    processingPaste.current = true;
    
    console.log('Paste event triggered', e.clipboardData?.items);
    const items = e.clipboardData?.items;
    if (!items) {
      processingPaste.current = false;
      return;
    }

    let hasImage = false;
    const newImages: File[] = [];
    
    for (const item of Array.from(items)) {
      console.log('Clipboard item:', item.type, item.kind);
      if (item.type.startsWith('image/')) {
        hasImage = true;
        e.preventDefault();
        const file = item.getAsFile();
        console.log('Image file:', file);
        if (file) {
          newImages.push(file);
        }
      }
    }
    
    if (hasImage && newImages.length > 0) {
      console.log('Image detected and processed:', newImages.length);
      
      // Add images to state
      setImages(prev => [...prev, ...newImages]);
      
      // Generate previews
      newImages.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setImagePreviews(prev => [...prev, e.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    
    // Reset the flag after a short delay
    setTimeout(() => {
      processingPaste.current = false;
    }, 100);
  };

  // Add keyboard paste handler as backup
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      // Let the paste event handle it
      return;
    }
    
    // Handle existing key functionality if needed
    if (e.target === messageRef.current) {
      handleKeyPress(e as any);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isMultimodalEnabled()) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isMultimodalEnabled()) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isMultimodalEnabled()) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files) {
      handleImageSelect(files);
    }
  };

  const [currPlan, setCurrPlan] = useState<string | undefined>(undefined);
  const { user } = useAuthContext();
  const [currentModel, setCurrentModel] = useState<{
    provider: string;
    name: string;
    id: string;
  } | null>(null);
  
  // Use React Query to fetch user subscription (same as Sidebar to avoid duplicate calls)
  const { data: userSubscription } = useQuery({
    queryKey: ["userSubscription", user?.uid],
    queryFn: () => MinorService.fetchUserSubscription(user?.uid as string),
    enabled: !!user?.uid,
    retry: false,
  });

  // Update currPlan when userSubscription data changes
  useEffect(() => {
    if (userSubscription?.plan_type) {
      setCurrPlan(userSubscription.plan_type);
    }
  }, [userSubscription?.plan_type]);

  const loadCurrentModel = async () => {
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
          <button
            type="button"
            title="Enhance Prompt"
            className="size-8 p-2 transition ease-in bg-white hover:bg-orange-200 rounded-md flex items-center justify-center"
            onClick={handleEnhancePrompt}
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
          <ComposerPrimitive.Cancel className="my-2.5 size-8 p-2 transition-opacity ease-in rounded-md flex items-center justify-center bg-white hover:bg-gray-100 border-none cursor-pointer">
            <CircleStopIcon />
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
            <button
              type="button"
              className="ml-2 h-4 w-4 hover:bg-red-400/50 hover:scale-105 hover:shadow-md transition ease-out rounded-sm flex items-center justify-center"
              onClick={() => handleNodeDeselect(node)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <div 
        ref={containerRef}
        className={`flex flex-col w-full items-start gap-4 transition-all duration-200 ${
          isDragOver ? 'bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-2' : ''
        }`}
        onPaste={handleImagePaste}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        tabIndex={0}
        style={{ outline: 'none' }}
      >
        {/* Drag over indicator */}
        {isMultimodalEnabled() && isDragOver && (
          <div className="flex items-center justify-center w-full py-8 text-blue-600">
            <div className="text-center">
              <ImageIcon className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-medium">Drop images here to upload</p>
            </div>
          </div>
        )}

        {/* Image Previews */}
        {isMultimodalEnabled() && imagePreviews.length > 0 && !isDragOver && (
          <div className="flex flex-wrap gap-2 px-4">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative">
                <img
                  src={preview}
                  alt={`Upload ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border"
                />
                <div
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex flex-row w-full items-end gap-2">
          {/* Attachment Button - moved to left side */}
          {isMultimodalEnabled() && (
            <div className="flex items-center pb-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleImageSelect(e.target.files)}
                accept="image/*"
                multiple
                className="hidden"
              />
              <button
                type="button"
                title="Attach Images"
                className="size-8 p-2 transition-opacity ease-in hover:bg-gray-100 rounded-md flex items-center justify-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <ComposerPrimitive.Input
            submitOnEnter={!isDisabled}
            ref={messageRef}
            value={message}
            rows={1}
            autoFocus
            placeholder={"Type @ followed by file or function name, or paste/upload images"}
            onChange={handleMessageChange}
            onKeyDown={handleKeyPress}
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
        <DialogTrigger 
          className="p-2 transition ease-in bg-white hover:bg-gray-200 rounded-md flex items-center justify-center border-none cursor-pointer"
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
