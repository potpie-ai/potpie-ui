import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import getHeaders from "@/app/utils/headers.util";
import { setChat } from "@/lib/state/Reducers/chat";
import { AppDispatch, RootState } from "@/lib/state/store";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { agentsRequireNodes, systemAgents } from "@/lib/Constants";

interface NodeSelectorFormProps {
  projectId: string;
  disabled: boolean;
  onSubmit: (message: string) => void;
}

const NodeSelectorForm: React.FC<NodeSelectorFormProps> = ({
  projectId,
  disabled,
  onSubmit,
}) => {
  const [isNodeListVisible, setIsNodeListVisible] = useState(false);
  const [nodeOptions, setNodeOptions] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [isNodeSelected, setIsNodeSelected] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(-1);

  const messageRef = useRef<HTMLTextAreaElement>(null);
  const nodeListRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const dispatch: AppDispatch = useDispatch();
  const { selectedNodes, agentId } = useSelector(
    (state: RootState) => state.chat
  );

  const fetchNodes = async (query: string) => {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
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
      setIsNodeListVisible(true);
      setSelectedNodeIndex(0);
    } catch (error) {
      console.error("Error fetching nodes:", error);
      setNodeOptions([]);
    }
  };

  useEffect(() => {
    if (nodeListRef.current && selectedNodeIndex >= 0) {
      const selectedNode = nodeListRef.current.querySelector(`li:nth-child(${selectedNodeIndex + 1})`);
      selectedNode?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedNodeIndex]);
  

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (isNodeListVisible && selectedNodeIndex >= 0) {
        e.preventDefault();
        handleNodeSelect(nodeOptions[selectedNodeIndex]);
      } else {
        handleSubmit(e as unknown as FormEvent);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedNodeIndex((prevIndex) => Math.min(prevIndex + 1, nodeOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedNodeIndex((prevIndex) => Math.max(prevIndex - 1, 0));
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
  
    const cursorPosition = e.target.selectionStart;
    const lastAtPosition = value.lastIndexOf("@", cursorPosition);
  
    if (lastAtPosition !== -1 && cursorPosition > lastAtPosition) {
      if (isNodeSelected) setIsNodeSelected(false);
  
      const query = value.substring(lastAtPosition + 1, cursorPosition);
  
      if (query.trim().length > 0 && !query.includes(" ")) {
        if (searchTimeout) clearTimeout(searchTimeout);
  
        const timeoutId = setTimeout(() => {
          fetchNodes(query);
        }, 300);
  
        setSearchTimeout(timeoutId);
      } else {
        setNodeOptions([]);
        setIsNodeListVisible(false);
      }
    } else {
      setIsNodeListVisible(false);
    }
  };
  
  const handleNodeSelect = (node: any) => {
    const cursorPosition = messageRef.current?.selectionStart || 0;
    const messageBeforeCursor = message.slice(0, cursorPosition);
    const messageAfterCursor = message.slice(cursorPosition);
  
    const lastAtPosition = messageBeforeCursor.lastIndexOf('@');
    if (lastAtPosition !== -1) {
      const textBeforeAt = messageBeforeCursor.slice(0, lastAtPosition); 
      const textAfterAt = messageBeforeCursor.slice(lastAtPosition + 1);
    
      const spaceAfterAt = textAfterAt.indexOf(' ');
      const nodeName = spaceAfterAt !== -1 ? textAfterAt.slice(0, spaceAfterAt) : textAfterAt;
  
      const nodeText = `@${node.name} `;
    
      const newMessage = `${textBeforeAt}${nodeText}${messageAfterCursor}`;
      setMessage(newMessage);
      dispatch(setChat({ selectedNodes: [...selectedNodes, node] }));
    }
  
    setIsNodeListVisible(false);
    setIsNodeSelected(true);
  };
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
  
    const processedMessage = message.replace(/@([^\s]+)/g, (match, nodeName) => {
      const node = nodeOptions.find((node) => node.name === nodeName);
      return node ? `@${node.name}` : match;
    });
  
    onSubmit(processedMessage);
    setMessage("");
  };
  

  const handleNodeRemove = (node: any) => {
    dispatch(
      setChat({
        selectedNodes: selectedNodes.filter((n) => n.node_id !== node.node_id),
      })
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        nodeListRef.current &&
        !nodeListRef.current.contains(event.target as any)
      ) {
        setIsNodeListVisible(false);
      }
    };

    if (isNodeListVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNodeListVisible]);

  const renderNodeList = () => {
    if (!isNodeListVisible || nodeOptions.length === 0) return null;

    const formRect = formRef.current?.getBoundingClientRect();

    return ReactDOM.createPortal(
      <div
        ref={nodeListRef}
        className="fixed w-[50%] bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto z-50"
        style={{
          left: formRect ? formRect.left : "0px",
          bottom: formRect ? window.innerHeight - formRect.top + 10 : "0px",
        }}
      >
        <ul>
          {nodeOptions.map((node, index) => (
            <li
              key={node.node_id}
              className={`cursor-pointer p-1 px-2 ${index === selectedNodeIndex ? "bg-gray-200" : "hover:bg-gray-200"}`}
              onClick={(e) => {
                e.stopPropagation();
                handleNodeSelect(node);
              }}
            >
              <div className="font-semibold">{node.name}</div>
              <div className="text-sm text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
                {truncateFilePath(node.file_path)}
              </div>
            </li>
          ))}
        </ul>
      </div>,
      document.body
    );
  };

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
        ? '...' + filePath.slice(-maxLength + fileName.length + 3)
        : filePath;

    return truncatedPath;
  };

  return (
    <form
      className="sticky bottom-6 overflow-hidden rounded-lg bg-card border border-[#edecf4] shadow-md flex flex-col"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <div className="flex items-center p-2 pl-4">
        {selectedNodes.map((node) => (
          <div
            key={node.node_id}
            className="flex items-center space-x-2 bg-[#f7e6e6] p-1 rounded-lg mr-2"
          >
            <span className="pl-1">{node.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 hover:bg-white"
              onClick={() => handleNodeRemove(node)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Textarea
        ref={messageRef}
        value={message}
        onChange={handleMessageChange}
        id="message"
        disabled={disabled}
        placeholder={systemAgents.find((a) => a.id === agentId)?.prompt ?? "Type @ followed by file or function name"}
        className="min-h-12 text-base resize-none border-0 p-3 px-7"
        onKeyDown={handleKeyPress}
      />
        {renderNodeList()}
        <div className="flex items-center p-3 pt-0 ">
        <Button type="submit" size="sm" className="ml-auto !bg-transparent mb-1 fill-primary" disabled={disabled}>
          <Image src={"/images/sendmsg.svg"} alt="logo" width={20} height={20} />
        </Button>
      </div>
    </form>
  );
};

export default NodeSelectorForm;
