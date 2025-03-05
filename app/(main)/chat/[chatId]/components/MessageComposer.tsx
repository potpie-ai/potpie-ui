import getHeaders from "@/app/utils/headers.util";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";
import {
  ComposerPrimitive,
  ThreadPrimitive,
  useComposerRuntime,
} from "@assistant-ui/react";
import axios from "axios";
import { SendHorizontalIcon, CircleStopIcon, X } from "lucide-react";
import { FC, useRef, useState, KeyboardEvent, useEffect } from "react";

interface MessageComposerProps extends React.HTMLAttributes<HTMLDivElement> {
  projectId: string;
  input: string;
  nodes: NodeOption[];
  disabled: boolean;
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

const MessageComposer = ({
  projectId,
  input,
  nodes,
  disabled,
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
              <Skeleton className="w-full h-20" />
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

  const ComposerAction: FC<{ disabled: boolean }> = ({ disabled }) => {
    return (
      <div>
        {/* enable below code with prompt enhancer feature */}
        {/* <div className="flex items-center justify-end">
          <TooltipIconButton
            tooltip="Enhance Prompt"
            variant="default"
            className="size-8 p-2 transition ease-in bg-white hover:bg-orange-200"
            onClick={handleEnhancePrompt}
          >
            <span className="text-lg">✨</span>
          </TooltipIconButton>
        </div> */}
        <ThreadPrimitive.If running={false}>
          <ComposerPrimitive.Send disabled={disabled}>
            <TooltipIconButton
              disabled={disabled}
              tooltip="Send"
              variant="default"
              className="my-2.5 size-8 p-2 transition-opacity ease-in"
            >
              <SendHorizontalIcon />
            </TooltipIconButton>
          </ComposerPrimitive.Send>
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
    // try {
    //   setIsTextareaDisabled(true);
    //   setMessage("Enhancing...");
    //   const enhancedMessage = await ChatService.enhancePrompt(
    //     conversation_id,
    //     message
    //   );
    //   setMessage(enhancedMessage);
    // } catch (error) {
    //   console.error("Error enhancing prompt:", error);
    // } finally {
    //   setIsTextareaDisabled(false);
    // }
  };

  return (
    <div className="flex flex-col w-full p-2 ">
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
      <div className="flex w-full items-start gap-4">
        <ComposerPrimitive.Input
          submitOnEnter={!disabled}
          ref={messageRef}
          value={message}
          rows={1}
          autoFocus
          placeholder={"Type @ followed by file or function name"}
          onChange={handleMessageChange}
          onKeyDown={handleKeyPress}
          className="placeholder:text-muted-foreground max-h-80 flex-grow resize-none border-none bg-transparent px-4 py-4 text-sm outline-none focus:ring-0 disabled:cursor-not-allowed"
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
