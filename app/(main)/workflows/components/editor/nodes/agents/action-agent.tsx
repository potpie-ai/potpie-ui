import { WorkflowNode } from "@/services/WorkflowService";
import { getNodeColors } from "../color_utils";
import { SourceHandle, TargetHandle } from "../../handles";
import { Bot, Server, Code } from "lucide-react";
import { FC, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface ActionAgentConfigProps {
  config: any;
  onConfigChange: (config: any) => void;
  readOnly?: boolean;
  workflow?: any;
}

export const ActionAgentConfigComponent: FC<ActionAgentConfigProps> = ({
  config,
  onConfigChange,
  readOnly = false,
  workflow,
}) => {
  const [newServer, setNewServer] = useState("");

  // Initialize config if it doesn't exist
  const currentConfig = config || {};
  const mcpServers = currentConfig.mcp_servers || [];
  const task = currentConfig.task || "";

  // Handle MCP server addition
  const handleAddServer = () => {
    if (newServer.trim() && !readOnly) {
      const updatedServers = [...mcpServers, newServer.trim()];
      onConfigChange({
        ...currentConfig,
        mcp_servers: updatedServers,
      });
      setNewServer("");
    }
  };

  // Handle MCP server removal
  const handleRemoveServer = (index: number) => {
    if (readOnly) return;
    const updatedServers = mcpServers.filter(
      (_: string, i: number) => i !== index
    );
    onConfigChange({
      ...currentConfig,
      mcp_servers: updatedServers,
    });
  };

  // Handle task change
  const handleTaskChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    onConfigChange({
      ...currentConfig,
      task: e.target.value,
    });
  };

  // Handle agent name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    onConfigChange({
      ...currentConfig,
      name: e.target.value,
    });
  };

  return (
    <div className="space-y-6">
      {/* Agent Name */}
      <div>
        <Label
          htmlFor="agent-name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Agent Name
        </Label>
        <Input
          id="agent-name"
          type="text"
          placeholder="Enter agent name..."
          value={currentConfig.name || ""}
          onChange={handleNameChange}
          disabled={readOnly}
          className="w-full"
        />
      </div>

      {/* MCP Servers */}
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-2">
          MCP Servers
        </Label>
        <div className="space-y-2">
          {mcpServers.map((server: string, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <Server className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span
                className="flex-1 text-sm bg-gray-50 px-3 py-2 rounded-md border truncate"
                title={server}
              >
                {server}
              </span>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveServer(index)}
                  className="text-red-500 hover:text-red-700 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          {!readOnly && (
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter MCP server URL or name..."
                value={newServer}
                onChange={(e) => setNewServer(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddServer()}
                className="flex-1 min-w-0"
              />
              <Button
                onClick={handleAddServer}
                disabled={!newServer.trim()}
                size="sm"
                className="flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Task */}
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">
          Task
        </Label>
        <Textarea
          placeholder="Describe the task for this action agent..."
          value={task}
          onChange={handleTaskChange}
          disabled={readOnly}
          className="w-full min-h-[80px] resize-y"
        />
      </div>

      {/* Info section */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <h4 className="text-sm font-medium text-blue-800 mb-1">
          About Action Agents
        </h4>
        <p className="text-xs text-blue-700">
          Action agents can connect to MCP (Model Context Protocol) servers to
          perform specific tasks. Add MCP server endpoints and define the tasks
          this agent should execute.
        </p>
      </div>
    </div>
  );
};

// Node metadata for the palette
export const actionAgentNodeMetadata = {
  type: "action_agent",
  category: "agent",
  group: "default",
  name: "Action Agent",
  description:
    "An agent that connects to MCP servers to perform specific tasks",
  icon: Bot,
  configComponent: ActionAgentConfigComponent,
};

export const ActionAgentNode = ({ data }: { data: WorkflowNode }) => {
  const colors = getNodeColors(data.group);
  const agentName = data.data?.name;
  const mcpServers = data.data?.mcp_servers || [];
  const task = data.data?.task || "";

  return (
    <div className="w-full">
      <div
        className="p-3 border-b border-gray-200"
        style={{ backgroundColor: colors.secondary }}
      >
        <div className="flex items-center">
          <Bot className="w-5 h-5 mr-2" style={{ color: colors.primary }} />
          <h3 className="font-semibold text-gray-800">Action Agent</h3>
        </div>
      </div>
      <div className="p-4 flex flex-col items-start gap-2">
        <div className="w-full">
          <p
            className={`font-semibold truncate ${
              agentName ? "text-gray-900" : "text-red-600"
            }`}
            title={agentName || undefined}
          >
            {agentName ? agentName : "No name specified"}
          </p>

          {mcpServers.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <Server className="w-3 h-3" />
                MCP Servers ({mcpServers.length})
              </p>
              <div className="space-y-1">
                {mcpServers.slice(0, 2).map((server: string, index: number) => (
                  <p
                    key={index}
                    className="text-xs text-gray-700 truncate max-w-full"
                    title={server}
                  >
                    • {server}
                  </p>
                ))}
                {mcpServers.length > 2 && (
                  <p className="text-xs text-gray-500">
                    +{mcpServers.length - 2} more
                  </p>
                )}
              </div>
            </div>
          )}

          {task && (
            <div className="mt-2">
              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <Code className="w-3 h-3" />
                Task
              </p>
              <p
                className="text-xs text-gray-700 line-clamp-2 max-w-full"
                title={task}
              >
                {task}
              </p>
            </div>
          )}

          {mcpServers.length === 0 && !task && (
            <p className="mt-2 text-xs text-gray-500">
              No MCP servers or task configured
            </p>
          )}
        </div>
      </div>
      <TargetHandle />
      <SourceHandle />
    </div>
  );
};
