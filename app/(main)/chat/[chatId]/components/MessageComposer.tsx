import getHeaders from "@/app/utils/headers.util";
import { Button } from "@/components/ui/button";
import { isMultimodalEnabled, getAgentDisplayLabel } from "@/lib/utils";
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
import axios from "axios";
import { Agent } from "@/lib/state/Reducers/chat";
import {
  SendHorizontalIcon,
  CircleStopIcon,
  X,
  Crown,
  ChevronDown,
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
import MinorService from "@/services/minorService";
import AgentService from "@/services/AgentService";
import { useAuthContext } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import { setChat } from "@/lib/state/Reducers/chat";
import { toast } from "@/components/ui/sonner";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface AttachedFile {
  name: string;
  size: number;
  type: string;
  file: File;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";
const IS_LOCALHOST =
  BASE_URL.startsWith("http://localhost") ||
  BASE_URL.startsWith("http://127.0.0.1");

// Agent IDs that can be switched to
const SWITCHABLE_AGENT_IDS = [
  "codebase_qna_agent",
  "debugging_agent",
  "code_generation_agent",
  ...(IS_LOCALHOST ? ["spec_generation_agent"] : []),
];

// SVG icons for agent modes
const AgentModeIcons: Record<string, React.ReactNode> = {
  codebase_qna_agent: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 10.25C9.5664 10.25 11 8.2353 11 5.75C11 3.26472 10.0664 1.25 6 1.25C2.06641 1.25 1 3.26472 1 5.75C1 6.7856 1.18517 7.73955 1.6858 8.5C2.3164 9.5 1.99626 10.4166 1.5 10.75C2.30774 10.75 2.85105 10.4929 3.19619 10.2383C3.44126 10.0575 3.75344 9.9682 4.0492 10.0407C4.60345 10.1766 5.24955 10.25 6 10.25Z" stroke="#00291C" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 4.5C5 3.94771 5.4477 3.5 6 3.5C6.5523 3.5 7 3.94771 7 4.5C7 4.78888 6.8775 5.04915 6.6816 5.2317C6.3786 5.5141 6 5.8358 6 6.25M6.0625 7.875H6M6.125 7.875C6.125 7.94405 6.06905 8 6 8C5.93095 8 5.875 7.94405 5.875 7.875C5.875 7.80595 5.93095 7.75 6 7.75C6.06905 7.75 6.125 7.80595 6.125 7.875Z" stroke="#00291C" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  debugging_agent: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.50661 2.49512C1.44668 3.02512 1.77631 4.21112 3.24468 4.21112" stroke="#00291C" strokeWidth="0.75" strokeLinecap="round"/>
      <path d="M8.79688 4.19046C9.41717 4.28946 10.5559 3.74946 10.4972 2.50146" stroke="#00291C" strokeWidth="0.75" strokeLinecap="round"/>
      <path d="M10.4957 10.4994C10.5257 9.97143 10.0882 8.77743 8.79883 8.71143" stroke="#00291C" strokeWidth="0.75" strokeLinecap="round"/>
      <path d="M3.22514 8.73572C2.82439 8.61572 1.50586 9.16772 1.50586 10.4997" stroke="#00291C" strokeWidth="0.75" strokeLinecap="round"/>
      <path d="M4.66428 3.05951C4.67627 2.54951 4.92199 1.49951 6.00078 1.49951C6.95973 1.49951 7.29238 2.30951 7.33733 3.05951M3.12998 4.70951C3.18992 4.31951 3.64541 3.40751 4.68226 3.31751C5.73108 3.27791 7.16948 3.29351 7.43918 3.33551C7.79278 3.36698 8.64688 3.71951 8.87463 4.70951C8.95553 5.21949 8.91358 5.93949 8.92553 6.35949C8.90758 6.77949 8.95968 7.63124 8.87758 8.06949C8.81768 8.54949 8.49403 9.23349 8.05053 9.65349C7.39123 10.3615 5.58128 11.1055 4.017 9.72549C3.20789 8.94549 3.15395 8.18949 3.09402 7.88949C3.07795 7.72864 3.0787 6.93824 3.08203 6.17949C3.07005 5.52309 3.0855 4.89041 3.12998 4.70951Z" stroke="#00291C" strokeWidth="0.75"/>
      <path d="M1.50586 6.44922H2.97423" stroke="#00291C" strokeWidth="0.75" strokeLinecap="round"/>
      <path d="M10.497 6.44922H9.05859" stroke="#00291C" strokeWidth="0.75" strokeLinecap="round"/>
      <path d="M6.00195 8.24951V10.1395" stroke="#00291C" strokeWidth="0.75" strokeLinecap="round"/>
    </svg>
  ),
  custom_agent: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.8638 1.72209L7.7437 3.49644C7.8637 3.74343 8.18365 3.98035 8.45365 4.02571L10.0485 4.29287C11.0684 4.46426 11.3083 5.2103 10.5734 5.94625L9.33355 7.19635C9.12355 7.40805 9.0086 7.81635 9.07355 8.10875L9.42855 9.65625C9.7085 10.8811 9.06355 11.355 7.9887 10.7148L6.49385 9.8226C6.2239 9.6613 5.77895 9.6613 5.50395 9.8226L4.00913 10.7148C2.93925 11.355 2.28932 10.8761 2.56929 9.65625L2.92425 8.10875C2.98924 7.81635 2.87426 7.40805 2.66428 7.19635L1.42442 5.94625C0.6945 5.2103 0.929475 4.46426 1.94936 4.29287L3.54418 4.02571C3.80915 3.98035 4.12912 3.74343 4.2491 3.49644L5.129 1.72209C5.60895 0.759304 6.38885 0.759304 6.8638 1.72209Z" stroke="#00291C" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  spec_generation_agent: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.49023 3.50781C7.49023 3.50781 7.74023 3.75781 7.99023 4.25781C7.99023 4.25781 8.78433 3.00781 9.49023 2.75781" stroke="#00291C" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.99743 1.0107C3.74819 0.957812 2.78306 1.10172 2.78306 1.10172C2.17364 1.1453 1.00573 1.48696 1.00574 3.4823C1.00575 5.46068 0.99282 7.89968 1.00574 8.87198C1.00574 9.46603 1.37355 10.8517 2.64663 10.9259C4.19405 11.0162 6.98137 11.0354 8.26022 10.9259C8.60257 10.9066 9.74232 10.6379 9.88657 9.39783C10.036 8.11318 10.0063 7.22038 10.0063 7.00788" stroke="#00291C" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.9999 3.50781C10.9999 4.88852 9.87957 6.00783 8.49752 6.00783C7.11547 6.00783 5.99512 4.88852 5.99512 3.50781C5.99512 2.1271 7.11547 1.00781 8.49752 1.00781C9.87957 1.00781 10.9999 2.1271 10.9999 3.50781Z" stroke="#00291C" strokeWidth="0.75" strokeLinecap="round"/>
      <path d="M3.49023 6.50781H5.49022" stroke="#00291C" strokeWidth="0.75" strokeLinecap="round"/>
      <path d="M3.49023 8.50781H7.49022" stroke="#00291C" strokeWidth="0.75" strokeLinecap="round"/>
    </svg>
  ),
  code_generation_agent: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.99998 9C4.99998 9 3.75 8.0794 3.75 7.75C3.75 7.4206 4.99998 6.5 4.99998 6.5" stroke="#00291C" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 9C7 9 8.25 8.0794 8.25 7.75C8.25 7.4206 7 6.5 7 6.5" stroke="#00291C" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.5 1.25V1.5C6.5 2.91421 6.5 3.62132 6.93935 4.06066C7.3787 4.5 8.0858 4.5 9.5 4.5H9.75M10 5.32845V7C10 8.8856 10 9.82845 9.4142 10.4142C8.82845 11 7.8856 11 6 11C4.11438 11 3.17157 11 2.58578 10.4142C2 9.82845 2 8.8856 2 7V4.72792C2 3.10541 2 2.29416 2.44303 1.74467C2.53254 1.63366 2.63365 1.53254 2.74466 1.44304C3.29415 1 4.10541 1 5.7279 1C6.0807 1 6.25705 1 6.4186 1.05701C6.4522 1.06886 6.4851 1.0825 6.51725 1.09787C6.6718 1.17177 6.7965 1.2965 7.04595 1.54594L9.4142 3.91422C9.70325 4.20325 9.84775 4.34776 9.9239 4.53153C10 4.7153 10 4.91968 10 5.32845Z" stroke="#00291C" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

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
  const [isSwitchingModel, setIsSwitchingModel] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const dispatch = useDispatch();
  const { agentId, allAgents } = useSelector((state: RootState) => state.chat);

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

  const isDisabled = disabled || isThreadRunning;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setAttachedFiles([]);
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
      <div className="max-h-40 overflow-scroll rounded-lg border border-gray-200 bg-[#FFFDFC] shadow-lg">
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

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles: AttachedFile[] = Array.from(files).map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        file,
      }));
      setAttachedFiles((prev) => [...prev, ...newFiles]);
      toast.success(`Attached ${files.length} file(s)`);
    }
    // Reset the input so the same file can be selected again
    e.target.value = "";
  };

  const handleRemoveAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
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

  // Fetch agents directly instead of relying on Redux state
  const { data: fetchedAgents } = useQuery({
    queryKey: ["agents"],
    queryFn: () => AgentService.getAgentTypes(),
    retry: false,
  });

  // Use fetched agents, fallback to Redux state
  const agents: Agent[] = (fetchedAgents || allAgents || []) as Agent[];

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

  // Agent switch handlers
  const handleSelectAgent = async (selectedAgentId: string) => {
    if (isSwitchingModel) return;
    try {
      setIsSwitchingModel(true);
      await ChatService.updateAgent(conversation_id, selectedAgentId);
      dispatch(setChat({ agentId: selectedAgentId }));
      toast.success("Model switched successfully");
    } catch (error) {
      console.error("Error switching agent:", error);
      toast.error("Failed to switch model");
    } finally {
      setIsSwitchingModel(false);
    }
  };

  // Build agent options for dropdown - separate modes and custom agents
  const modeOptions = agents
    ? agents
        .filter((agent) => agent.id && SWITCHABLE_AGENT_IDS.includes(agent.id))
        .map((agent) => ({
          id: agent.id || "",
          label: getAgentDisplayLabel(agent.id || "", agent.name || ""),
        }))
    : [];

  const customAgentOptions = agents
    ? agents
        .filter((agent) => agent.status !== "SYSTEM")
        .map((agent) => ({
          id: agent.id || "",
          label: getAgentDisplayLabel(agent.id || "", agent.name || ""),
        }))
    : [];

  const ComposerAction: FC<{ disabled: boolean }> = ({ disabled }) => {
    return (
      <div className="flex flex-row w-full items-center justify-between space-x-4">
        {/* Left: Agent Dropdown + Attach Trigger */}
        <div className="flex flex-row items-center gap-2 pl-4">
          {/* Agent Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs font-medium gap-2 border-0"
                style={{ backgroundColor: "#B6E34329" }}
                disabled={isSwitchingModel}
              >
                {(modeOptions.find((o) => o.id === agentId)
                  ? AgentModeIcons[agentId]
                  : customAgentOptions.find((o) => o.id === agentId)
                    ? AgentModeIcons["custom_agent"]
                    : null) || null}
                {getAgentDisplayLabel(
                  agentId,
                  agents.find((a) => a.id === agentId)?.name || ""
                )}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-100">
              {/* Modes Section */}
              {modeOptions.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Mode
                  </div>
                  {modeOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.id}
                      onClick={() => handleSelectAgent(option.id)}
                      className={`cursor-pointer flex items-center gap-2 ${
                        agentId === option.id ? "bg-zinc-100 font-medium" : ""
                      }`}
                    >
                      {AgentModeIcons[option.id] || (
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                          <rect width="24" height="24" rx="4" fill="#E5E7EB"/>
                        </svg>
                      )}
                      <span className="truncate">{option.label}</span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              {/* Custom Agents Section */}
              {customAgentOptions.length > 0 && (
                <>
                  <div className="my-1 border-t border-transparent" />
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Custom Agent
                  </div>
                  {customAgentOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.id}
                      onClick={() => handleSelectAgent(option.id)}
                      className={`cursor-pointer flex items-center gap-2 ${
                        agentId === option.id ? "bg-zinc-100 font-medium" : ""
                      }`}
                    >
                      {AgentModeIcons["custom_agent"] || (
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                          <rect width="24" height="24" rx="4" fill="#E5E7EB"/>
                        </svg>
                      )}
                      <span className="truncate">{option.label}</span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Attach Trigger */}
          <button
            type="button"
            className="flex h-8 items-center justify-start gap-2 border-0 bg-transparent"
            aria-label="Attach files"
            onClick={handleAttachClick}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4V3C4 1.89543 4.89543 1 6 1C7.10455 1 8 1.89543 8 3V9C8 10.1046 7.10455 11 6 11C4.89543 11 4 10.1046 4 9V6.75C4 6.05965 4.55964 5.5 5.25 5.5C5.94035 5.5 6.5 6.05965 6.5 6.75V8" stroke="#00291C" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-xs font-medium">Attach</span>
          </button>
          {/* Hidden file input for attachments */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".docx,.pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg"
            multiple
            onChange={handleFileChange}
          />
        </div>

        {/* Right: Model Selection + Send */}
        <div className="flex flex-row items-center justify-end space-x-4">
          <ModelSelection
            currentModel={currentModel}
            currPlan={currPlan}
            loadCurrentModel={loadCurrentModel}
            disabled={disabled}
          />
        <ThreadPrimitive.If running={false}>
          <button
            type="button"
            disabled={isDisabled}
            title="Send"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
            onClick={handleSend}
          >
            <SendHorizontalIcon className="h-4 w-4" />
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
      </div>
    );
  };

  return (
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

        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-2 pl-4">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Attachments
            </span>
            {attachedFiles.map((file, index) => (
              <span
                key={index}
                className="flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 shadow-sm"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 4V3C4 1.89543 4.89543 1 6 1C7.10455 1 8 1.89543 8 3V9C8 10.1046 7.10455 11 6 11C4.89543 11 4 10.1046 4 9V6.75C4 6.05965 4.55964 5.5 5.25 5.5C5.94035 5.5 6.5 6.05965 6.5 6.75V8" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="max-w-32 truncate">{file.name}</span>
                <button
                  type="button"
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/80 text-blue-600 transition hover:bg-white hover:text-blue-800"
                  onClick={() => handleRemoveAttachedFile(index)}
                  aria-label={`Remove ${file.name}`}
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
          {isMultimodalEnabled() && <ComposerAttachments />}

          <div className="flex flex-row w-full items-end gap-2">
            {isMultimodalEnabled() && (
              <div className="flex items-center pb-4">
                <ComposerAddAttachment />
              </div>
            )}
            <div className="w-full">
              <ComposerPrimitive.Input
                submitOnEnter={!isDisabled}
                ref={textareaRef}
                value={message}
                rows={1}
                autoFocus
                placeholder="Use @ to mention a file or function"
                onChange={handleMessageChange}
                onKeyDown={handleKeyPress}
                disabled={isDisabled}
                className="w-full placeholder-dm-mono placeholder:text-gray-400 max-h-80 flex-grow resize-none border-none bg-transparent px-4 py-4 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex items-center justify-end w-full">
            <ComposerAction disabled={isDisabled} />
          </div>
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
  const router = useRouter();
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [models, setModels] = useState<
    { provider: string; name: string; id: string; description: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const isFreeUser = !currPlan || currPlan === "free";

  const isModelAvailable = (provider: string) => {
    if (!isFreeUser) return true;
    const p = (provider || "").toLowerCase().replace(/[\s.-]/g, "");
    return !(p === "openai" || p === "anthropic" || p === "gemini");
  };

  const handleModelList = async () => {
    setLoading(true);
    try {
      const res = await ModelService.listModels();
      const next =
        res.models?.map((model) => ({
          provider: model.provider,
          name: model.name,
          id: model.id,
          description: model.description,
        })) ?? [];
      const free = next.filter((m) => isModelAvailable(m.provider));
      const paid = next.filter((m) => !isModelAvailable(m.provider));
      setModels(isFreeUser ? [...free, ...paid] : next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu
      open={modelDropdownOpen}
      onOpenChange={(open) => {
        setModelDropdownOpen(open);
        if (open) void handleModelList();
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 h-8 px-3 text-xs font-medium cursor-pointer hover:opacity-90 focus:outline-none transition-opacity rounded-full"
          style={{
            backgroundColor: "#F7F7F7",
            
            color: "#00291C",
          }}
          aria-label={isFreeUser ? "Upgrade to change plan" : "Change model"}
          disabled={disabled}
        >
          <span className="shrink-0">{currentModel?.name ?? "ZLM 4.7"}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="end"
        className="min-w-[280px] w-[280px] p-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg"
      >
        <div className="py-1 max-h-[320px] overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-zinc-500">Loading models...</div>
          ) : models.length === 0 ? (
            <div className="px-4 py-3 text-sm text-zinc-500">No models found</div>
          ) : (
            models.map((model) => {
              const available = isModelAvailable(model.provider);
              return (
                <DropdownMenuItem
                  key={model.id}
                  title={model.description ?? undefined}
                  onClick={async (e) => {
                    if (!available) {
                      e.preventDefault();
                      setModelDropdownOpen(false);
                      router.push("/user-subscription");
                      return;
                    }
                    try {
                      await ModelService.setCurrentModel(model.id);
                      await loadCurrentModel();
                    } catch {
                      // Keep current model on update failure.
                    }
                    setModelDropdownOpen(false);
                  }}
                  className={`flex flex-col items-start gap-0.5 py-2.5 ${
                    available ? "cursor-pointer" : "cursor-default opacity-90"
                  } ${currentModel?.id === model.id ? "bg-zinc-100 font-medium" : ""}`}
                  style={{ color: available ? "#00291C" : "#9ca3af" }}
                >
                  <div className="flex w-full items-center gap-2 flex-wrap">
                    <span className={available ? "" : "text-gray-400"}>
                      {model.name}
                    </span>
                    {!available && (
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-gray-700">
                        <Crown className="h-3 w-3 shrink-0" />
                        Upgrade Plan
                      </span>
                    )}
                  </div>
                  {model.description && (
                    <span
                      className="text-xs italic block mt-0.5"
                      style={{ color: available ? "#A6A6AF" : "#9ca3af" }}
                    >
                      {model.description}
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
        {isFreeUser && (
          <div className="p-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => {
                setModelDropdownOpen(false);
                router.push("/user-subscription");
              }}
              className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Upgrade to change plan
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
