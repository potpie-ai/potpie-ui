import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from "react";
import ReactDOM from "react-dom"; // Import ReactDOM for portal
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import getHeaders from "@/app/utils/headers.util";

interface Node {
  node_id: string;
  name: string;
  file_path: string;
}

interface NodeSelectorFormProps {
  projectId: string;
  onSubmit: (message: string, selectedNodes: Node[]) => void;
}

const NodeSelectorForm: React.FC<NodeSelectorFormProps> = ({ projectId, onSubmit }) => {
  const [isNodeListVisible, setIsNodeListVisible] = useState(false); // To show or hide node options
  const [nodeInput, setNodeInput] = useState(""); // Store node input after '@'
  const [nodeOptions, setNodeOptions] = useState<Node[]>([]); // List of nodes to show in dropdown
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]); // Selected nodes
  const [message, setMessage] = useState(""); // Message text with nodes
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const nodeListRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Fetch nodes based on the search query after '@'
  const fetchNodes = async (query: string) => {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    try {
      const response = await axios.post(
        `${baseUrl}/api/v1/search`,
        {
          project_id: projectId,
          query: query,
        },
        { headers }
      );

      if (response.data.results && response.data.results.length > 0) {
        setNodeOptions(response.data.results);
      } else if (response.data.length > 0) {
        setNodeOptions(response.data);
      } else {
        setNodeOptions([]);
      }

      setIsNodeListVisible(true);
    } catch (error) {
      console.error("Error fetching nodes:", error);
      setNodeOptions([]);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!message || message.trim() === "") return;

    onSubmit(message, selectedNodes);
    setMessage("");
    setSelectedNodes([]);
  };

  // Handle keypress event for Enter key to submit the form
  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Detect '@' and trigger node input
    const cursorPosition = e.target.selectionStart;
    const lastAtPosition = value.lastIndexOf("@", cursorPosition);

    if (lastAtPosition !== -1 && cursorPosition > lastAtPosition) {
      const query = value.substring(lastAtPosition + 1, cursorPosition);
      if (query.trim().length > 0) {
        fetchNodes(query); // Fetch nodes based on the text after '@'
      } else {
        setNodeOptions([]);
        setIsNodeListVisible(false);
      }
    } else {
      setIsNodeListVisible(false);
    }
  };

  const handleNodeSelect = (node: Node) => {
    if (!selectedNodes.some((n) => n.node_id === node.node_id)) {
      setSelectedNodes([...selectedNodes, node]);
    }

    // Remove the "@node" input from the message and close the dropdown
    const cursorPosition = messageRef.current?.selectionStart || 0;
    const textBeforeAt = message.slice(0, message.lastIndexOf("@", cursorPosition));
    const textAfterAt = message.slice(cursorPosition);

    // Update the message without the @node part
    setMessage(`${textBeforeAt}${textAfterAt}`);
    setIsNodeListVisible(false);
  };

  const handleNodeRemove = (node: Node) => {
    setSelectedNodes(selectedNodes.filter((n) => n.node_id !== node.node_id));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nodeListRef.current && !nodeListRef.current.contains(event.target as any)) {
        setTimeout(() => setIsNodeListVisible(false), 100);
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

  // Render node list in a portal to flow outside the form
  const renderNodeList = () => {
    if (!isNodeListVisible || nodeOptions.length === 0) return null;

    const formRect = formRef.current?.getBoundingClientRect();

    return ReactDOM.createPortal(
      <div
        ref={nodeListRef}
        className="fixed w-[50%] bg-white border border-gray-300 rounded-lg p-2 shadow-lg max-h-40 overflow-y-auto z-50 -mb-2" // Using `fixed` and `-mb-2` to move above
        style={{
          left: formRect ? formRect.left : '0px',
          bottom: formRect ? window.innerHeight - formRect.top + 10 : '0px',  // Position it above the input
        }}
      >
        <ul>
          {nodeOptions.map((node) => (
            <li
              key={node.node_id}
              className="cursor-pointer p-1 hover:bg-gray-200"
              onClick={(e) => {
                e.stopPropagation();
                handleNodeSelect(node);
              }}
            >
              <div className="font-semibold">{node.name}</div>
              <div className="text-sm text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
                {node.file_path.length > 100
                  ? '...' + node.file_path.slice(-100)
                  : node.file_path}
              </div>
            </li>
          ))}
        </ul>
      </div>
      ,
      document.body
    );
  };

  return (
    <form
      className="sticky bottom-6 overflow-hidden rounded-lg bg-card focus-within:ring-1 focus-within:ring-ring border border-border shadow-md flex flex-col"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      {/* Selected Nodes Chips */}
      <div className="flex items-center p-2 pl-4">
        {selectedNodes.map((node) => (
          <div
            key={node.node_id}
            className="flex items-center space-x-2 bg-primary p-1 rounded-lg mr-2"
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

      {/* Textarea for message input */}
      <Textarea
        ref={messageRef}
        value={message}
        onChange={handleMessageChange}
        id="message"
        placeholder="Start chatting with the expert...."
        className="min-h-12 h-[50%] text-base resize-none border-0 p-3 px-7 shadow-none focus-visible:ring-0"
        onKeyPress={handleKeyPress}
      />

      {renderNodeList()}

      {/* Submit button */}
      <div className="flex items-center p-3 pt-0 ">
        <Button type="submit" size="sm" className="ml-auto !bg-transparent mb-1">
          <Image
            src={"/images/sendmsg.svg"}
            alt="logo"
            width={20}
            height={20}
          />
        </Button>
      </div>
    </form>
  );
};

export default NodeSelectorForm;