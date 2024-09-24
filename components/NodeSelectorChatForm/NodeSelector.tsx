import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from "react";
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
  const [isNodeInputVisible, setIsNodeInputVisible] = useState(false);
  const [nodeInput, setNodeInput] = useState("");
  const [nodeOptions, setNodeOptions] = useState<Node[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const nodeInputRef = useRef<HTMLDivElement>(null);

  // Fetch nodes based on the search query
  const fetchNodes = async (query: string) => {
    const headers = await getHeaders();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const response = await axios.post(
      `${baseUrl}/api/v1/search`,
      {
        project_id: projectId,
        query: query,
      },
      { headers }
    );
    setNodeOptions(response.data.results);
  };

  // Handle form submission
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const content = messageRef.current?.value;
    if (!content || content === "") return;

    // Call the onSubmit callback with the message and selected nodes
    onSubmit(content, selectedNodes);
    if (messageRef.current) messageRef.current.value = "";
    setSelectedNodes([]);
  };

  // Handle keypress event for Enter key to submit the form
  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  // Handle node selection
  const handleNodeSelect = (node: Node) => {
    if (!selectedNodes.some((n) => n.node_id === node.node_id)) {
      setSelectedNodes([...selectedNodes, node]);
    }
    setNodeInput("");
    setIsNodeInputVisible(false);
  };

  // Handle node removal
  const handleNodeRemove = (node: Node) => {
    setSelectedNodes(selectedNodes.filter((n) => n.node_id !== node.node_id));
  };

  // Handle input change for node search
  const handleNodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNodeInput(value);
    if (value.trim()) {
      fetchNodes(value);
    } else {
      setNodeOptions([]);
    }
  };

  // Handle clicking outside of the input to close the search box
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nodeInputRef.current && !nodeInputRef.current.contains(event.target as any)) {
        setTimeout(() => setIsNodeInputVisible(false), 100);
      }
    };
    if (isNodeInputVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNodeInputVisible]);

  return (
    <form
      className="sticky bottom-6 overflow-hidden rounded-lg bg-card focus-within:ring-1 focus-within:ring-ring border border-border shadow-md flex flex-col"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center p-2 pl-4" ref={nodeInputRef}>
        {selectedNodes.map((node) => (
          <div
            key={node.node_id}
            className="flex items-center space-x-2 bg-gray-200 p-1 rounded-lg mr-2"
          >
            <span>{node.name}</span>
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
        {isNodeInputVisible ? (
          <input
            type="text"
            value={nodeInput}
            onChange={handleNodeInputChange}
            className="border border-border p-1 rounded"
            placeholder="Search for nodes..."
          />
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-transparent"
            onClick={() => setIsNodeInputVisible(true)}
          >
            <Plus className="border-primary rounded-full border-2" />
            <span className="sr-only">Add Node</span>
          </Button>
        )}
      </div>

      {isNodeInputVisible && nodeInput && nodeOptions.length > 0 && (
        <div className="absolute bottom-40 w-[50%] left-80 right-4 bg-white border border-gray-300 rounded-lg p-2 shadow-lg max-h-40 overflow-y-auto z-50">
          <ul>
            {nodeOptions.map((node) => (
              <li
                key={node.node_id}
                className="cursor-pointer p-1 hover:bg-gray-200"
                onClick={() => handleNodeSelect(node)}
              >
                <div className="font-semibold">{node.name}</div>
                <div className="text-sm text-gray-500">{node.file_path}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Textarea
        ref={messageRef}
        id="message"
        placeholder="Start chatting with the expert...."
        className="min-h-12 h-[50%] text-base resize-none border-0 p-3 px-7 shadow-none focus-visible:ring-0"
        onKeyPress={handleKeyPress}
      />
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
