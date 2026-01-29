import getHeaders from "@/app/utils/headers.util";
import { Button } from "@/components/ui/button";
import { isMultimodalEnabled } from "@/lib/utils";
import { toast } from "sonner";
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
  Paperclip,
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
import { DocumentAttachment, ValidationResponse } from "@/lib/types/attachment";
import {
  isDocumentTypeByFile,
  isImageTypeByFile,
  MAX_FILE_SIZE,
  getSupportedFileExtensions,
} from "@/lib/utils/fileTypes";
import { DocumentAttachmentCard } from "@/components/chat/DocumentAttachmentCard";
import { ValidationErrorModal } from "@/components/chat/ValidationErrorModal";
import { ContextUsageIndicator } from "@/components/chat/ContextUsageIndicator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

const free_models = ["openai/gpt-4.1", "openai/gpt-4o", "openai/gpt-4.1-mini"];

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
  const [documents, setDocuments] = useState<DocumentAttachment[]>([]);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<{
    validation: ValidationResponse;
    file: File;
  } | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [contextRefreshTrigger, setContextRefreshTrigger] = useState(0);
  const [uploadAbortController, setUploadAbortController] =
    useState<AbortController | null>(null);
  const [uploadLocked, setUploadLocked] = useState(false);

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
  const documentInputRef = useRef<HTMLInputElement>(null);

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

  // Update runtime config when nodes/documents change
  useEffect(() => {
    composer.setRunConfig({
      custom: {
        selectedNodes: selectedNodes,
        documentIds: documents.map((doc) => doc.id),
        documents: documents,
      },
    });
  }, [selectedNodes, documents, composer]);

  useEffect(() => {
    const unsubscribe =
      composer.unstable_on?.("send", () => {
        // Clear composer text
        composer.setText("");
        // Clear composer run config
        composer.setRunConfig({
          custom: {
            selectedNodes: [],
            documentIds: [],
            documents: [],
          },
        });
        // Clear React state
        setSelectedNodes([]);
        setNodeOptions([]);
        setSelectedNodeIndex(-1);
        setMessage("");
        setDocuments([]);
        setValidationError(null);
        setValidating(false);
        setUploadingDocument(false);
        setUploadProgress(0);
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
    // Ensure config is set with current documents before sending
    const documentIds = documents.map((doc) => doc.id);
    composer.setRunConfig({
      custom: {
        selectedNodes: selectedNodes,
        documentIds: documentIds,
        documents: documents,
      },
    });

    // Only send the message - let the "send" event handler manage cleanup
    composer.send();
  };

  const handleDocumentSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Prevent multiple simultaneous uploads
    if (uploadLocked || validating || uploadingDocument) {
      toast.info("Please wait", {
        description: "An upload is already in progress.",
      });
      return;
    }

    const file = files[0]; // Single document at a time for now

    // Client-side validation
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large", {
        description: `Maximum file size is 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`,
      });
      return;
    }

    if (!isDocumentTypeByFile(file)) {
      toast.error("Unsupported file type", {
        description: "Supported formats: PDF, DOCX, CSV, XLSX, code files (.py, .js, .ts, etc.), and markdown.",
      });
      return;
    }

    // Start upload process - set lock
    setUploadLocked(true);
    setValidating(true);

    try {
      const validation = await ChatService.validateDocument(conversation_id, file);

      if (!validation.can_upload) {
        // Show error modal
        setValidationError({ validation, file });
        return;
      }

      // Show warning if usage will be high
      if (validation.usage_after_upload && validation.usage_after_upload > 80) {
      console.warn(
        `High context usage after upload: ${validation.usage_after_upload}%`
      );
      }

      // Upload the document
      setValidating(false);
      setUploadingDocument(true);
      setUploadProgress(0);

      const controller = new AbortController();
      setUploadAbortController(controller);

      try {
        const uploadResult = await ChatService.uploadAttachment(
          file,
          undefined,
          (progress) => setUploadProgress(progress),
          controller.signal
        );

        // Get full metadata including token count
        const attachmentInfo = await ChatService.getAttachmentInfo(uploadResult.id);

        // Add to documents state
        const documentAttachment: DocumentAttachment = {
          ...uploadResult,
          file,
          token_count: attachmentInfo.file_metadata.token_count,
          metadata: attachmentInfo.file_metadata,
        };

        setDocuments(prev => [...prev, documentAttachment]);

        // Trigger context refresh
        setContextRefreshTrigger(prev => prev + 1);
      } catch (error: any) {
        if (error.name === 'AbortError' || error.name === 'CanceledError') {
          // User cancelled, already handled
          return;
        }
        console.error("Document upload error:", error);
        toast.error("Upload failed", {
          description:
            error.message || "Failed to upload document. Please try again.",
        });
      } finally {
        setUploadAbortController(null);
        setUploadingDocument(false);
      }
    } catch (error: any) {
      console.error("Document validation/upload error:", error);
      toast.error("Upload failed", {
        description:
          error.message || "Failed to upload document. Please try again.",
      });
    } finally {
      setValidating(false);
      setUploadLocked(false);
    }
  };

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
          <ComposerPrimitive.Cancel className="my-2.5 size-8 p-2 transition-opacity ease-in rounded-md flex items-center justify-center bg-white hover:bg-gray-100 border-none cursor-pointer">
            <CircleStopIcon />
          </ComposerPrimitive.Cancel>
        </ThreadPrimitive.If>
      </div>
    );
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

  const handleCloseValidationModal = () => {
    setValidationError(null);
  };

  const handleRemoveDocument = (index: number) => {
    const removedDoc = documents[index];
    setDocuments((prev) => prev.filter((_, i) => i !== index));

    // Trigger context refresh
    setContextRefreshTrigger((prev) => prev + 1);

    toast("Document removed", {
      description: removedDoc.file_name,
      action: {
        label: "Undo",
        onClick: () => {
          setDocuments((prev) => [
            ...prev.slice(0, index),
            removedDoc,
            ...prev.slice(index),
          ]);
          setContextRefreshTrigger((prev) => prev + 1);
        },
      },
      duration: 5000,
    });
  };

  const handleCancelUpload = () => {
    if (uploadAbortController) {
      uploadAbortController.abort();
      setUploadAbortController(null);
    }
    setUploadingDocument(false);
    setValidating(false);
    setUploadProgress(0);
    toast.info("Upload cancelled");
  };

  return (
    <>
      {/* Validation Error Modal */}
      {validationError && (
        <ValidationErrorModal
          open={!!validationError}
          onClose={handleCloseValidationModal}
          validation={validationError.validation}
          fileName={validationError.file.name}
          fileSize={validationError.file.size}
          onViewAttachments={() => {
            handleCloseValidationModal();
            if (documents.length > 0) {
              containerRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }
          }}
          onChangeModel={() => {
            handleCloseValidationModal();
            const modelTrigger = document.querySelector(
              '[class*="DialogTrigger"]'
            ) as HTMLButtonElement;
            if (modelTrigger) {
              setTimeout(() => modelTrigger.click(), 100);
            }
          }}
        />
      )}

      <div className="flex flex-col w-full p-2">
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
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/80 text-rose-600 transition hover:bg-white hover:text-rose-800"
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
          className="flex flex-col w-full items-start gap-4"
          tabIndex={0}
          style={{ outline: "none" }}
        >
          {/* Attachment Previews */}
          {isMultimodalEnabled() && <ComposerAttachments />}

          {/* Document Attachments */}
          {documents.length > 0 && (
            <div className="w-full px-4 space-y-2">
              <div className="text-xs font-medium text-gray-600">
                Documents ({documents.length})
              </div>
              {documents.map((doc, index) => (
                <DocumentAttachmentCard
                  key={doc.id}
                  attachment={doc}
                  onRemove={() => handleRemoveDocument(index)}
                  onDownload={() => {
                    ChatService.downloadAttachment(doc.id, doc.file_name);
                  }}
                />
              ))}
            </div>
          )}

          {/* Validation/Upload Loading State */}
          {validating && (
            <div className="w-full px-4 py-2 text-sm text-gray-600 flex items-center gap-2">
              <Loader2Icon className="w-4 h-4 animate-spin" />
              <span>Validating document...</span>
            </div>
          )}
          {uploadingDocument && (
            <div className="w-full px-4 py-2">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <div className="flex items-center gap-2">
                  <Loader2Icon className="w-4 h-4 animate-spin" />
                  <span>Uploading... {uploadProgress}%</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="text-xs text-red-500 hover:text-red-700 hover:underline"
                >
                  Cancel
                </button>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-row w-full items-end gap-2">
            {isMultimodalEnabled() && (
              <div className="flex items-center pb-4 gap-2">
                <ComposerAddAttachment />
                <input
                  type="file"
                  ref={documentInputRef}
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;

                    const file = files[0];
                    if (isImageTypeByFile(file)) {
                      toast.info("Use the image button for images.");
                    } else if (isDocumentTypeByFile(file)) {
                      void handleDocumentSelect(files);
                    } else {
                      toast.error("Unsupported file type", {
                        description: "Please select a supported document file.",
                      });
                    }

                    e.target.value = "";
                  }}
                  accept={getSupportedFileExtensions()}
                  multiple={false}
                  className="hidden"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="size-8 p-2 transition-opacity ease-in hover:bg-gray-100 rounded-md flex items-center justify-center"
                        onClick={() => documentInputRef.current?.click()}
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Attach document</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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

          <div className="flex items-center justify-between w-full">
            <ContextUsageIndicator
              conversationId={conversation_id}
              refreshTrigger={contextRefreshTrigger}
            />
            <ComposerAction disabled={isDisabled} />
          </div>
        </div>
      </div>
    </>
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
          className="p-2 transition ease-in bg-white hover:bg-gray-200 rounded-md flex items-center justify-center border-none cursor-pointer"
          disabled={disabled}
          onClick={handleModelList}
        >
          <div className="flex flex-row justify-center items-center">
            {currentModel.provider === "zai" ? (
              <Zap className="h-5 w-5" />
            ) : (
              <Image
                height={20}
                width={20}
                src={`/chat/${currentModel.provider}.svg`}
                alt={currentModel.provider.charAt(0)}
              />
            )}

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
                              {model.provider === "zai" ? (
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800">
                                  <Zap className="h-5 w-5" />
                                </div>
                              ) : (
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
                              )}
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
