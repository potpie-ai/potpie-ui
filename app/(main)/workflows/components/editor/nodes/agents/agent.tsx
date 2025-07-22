import { WorkflowNode } from "@/services/WorkflowService";
import { getNodeColors } from "../color_utils";
import { SourceHandle, TargetHandle } from "../../handles";
import { Bot, Code } from "lucide-react";
import { FC, useEffect, useState } from "react";
import AgentService from "@/services/AgentService";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Plus, RefreshCcw } from "lucide-react";

interface AgentConfigProps {
  config: any;
  onConfigChange: (config: any) => void;
  readOnly?: boolean;
  workflow?: any;
}

// Simple in-memory cache for agents
let cachedAgents: any[] | null = null;

export const AgentConfigComponent: FC<AgentConfigProps> = ({
  config,
  onConfigChange,
  readOnly = false,
  workflow,
}) => {
  const [availableAgents, setAvailableAgents] = useState<any[]>(
    cachedAgents || []
  );
  const [loading, setLoading] = useState(!cachedAgents);

  async function fetchAgents() {
    setLoading(true);
    const agents = await AgentService.getAgentTypes();
    const filtered = agents
      .filter((agent: any) => agent.status !== "SYSTEM")
      .map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
      }));
    cachedAgents = filtered;
    setAvailableAgents(filtered);
    setLoading(false);
  }

  useEffect(() => {
    if (!cachedAgents) {
      fetchAgents();
    }
  }, []);

  // Only update config on click, don't re-fetch agents
  const handleSelectAgent = (agentId: string) => {
    if (readOnly) return;
    const selectedAgent = availableAgents.find((a) => a.id === agentId);
    if (config.agentId !== agentId) {
      onConfigChange({ ...config, agentId, agentName: selectedAgent?.name });
    }
  };

  // Handle task change
  const handleTaskChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    onConfigChange({ ...config, task: e.target.value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-medium">Choose an agent:</span>
        <RefreshCcw
          className={`h-4 w-4 cursor-pointer ${loading ? "animate-spin" : ""}`}
          onClick={readOnly ? undefined : fetchAgents}
        />
      </div>
      <div className="relative w-full px-12">
        {" "}
        {/* Added px-12 for arrow padding */}
        <Carousel
          opts={{ align: "start", slidesToScroll: 2 }}
          className="w-full"
        >
          {/* Arrow container with pointer-events-none */}
          <div className="pointer-events-none">
            <CarouselPrevious
              type="button"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 pointer-events-auto bg-white rounded-full shadow border border-gray-200 w-8 h-8 flex items-center justify-center"
              disabled={readOnly}
            />
            <CarouselNext
              type="button"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 pointer-events-auto bg-white rounded-full shadow border border-gray-200 w-8 h-8 flex items-center justify-center"
              disabled={readOnly}
            />
          </div>
          {availableAgents.length === 0 && loading && (
            <div className="flex items-center justify-start gap-4 w-full h-full">
              <Skeleton className="h-40 w-48 " />
              <Skeleton className="h-40 w-48 " />
              <Skeleton className="h-40 w-48 " />
              <Skeleton className="h-40 w-48 " />
            </div>
          )}
          <CarouselContent className="p-2 pl-10 pr-10">
            {availableAgents.map((agent) => (
              <CarouselItem
                key={agent.id}
                className="basis-1/4 min-w-[200px] max-w-[240px]"
              >
                <Card
                  className={cn(
                    "h-40 p-3 border rounded-lg cursor-pointer shadow-sm flex flex-col justify-between transition-all text-left",
                    config.agentId === agent.id
                      ? "bg-green-400/30 border-green-500"
                      : "border-gray-200 hover:shadow-md hover:scale-105"
                  )}
                  onClick={
                    readOnly ? undefined : () => handleSelectAgent(agent.id)
                  }
                  tabIndex={readOnly ? -1 : 0}
                  aria-disabled={readOnly}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="w-5 h-5 flex-shrink-0 text-purple-600" />
                    <span className="text-base font-semibold truncate flex-1">
                      {agent.name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-3 flex-1 mb-2">
                    {agent.description}
                  </p>
                  {config.agentId === agent.id && (
                    <span className="text-xs text-green-700 font-medium">
                      Selected
                    </span>
                  )}
                </Card>
              </CarouselItem>
            ))}
            {!loading && !readOnly && (
              <CarouselItem
                key={"create-agent"}
                className="basis-1/4 min-w-[200px] max-w-[240px]"
              >
                <Link href="/all-agents?createAgent=true" target="_blank">
                  <Card
                    className={cn(
                      "h-40 p-3 border rounded-lg cursor-pointer shadow-sm flex flex-col justify-center items-center transition-all text-left",
                      config.agentId === "create-agent"
                        ? "bg-green-400/30 border-green-500"
                        : "border-gray-200 hover:shadow-md hover:scale-105"
                    )}
                  >
                    <Plus className="h-8 w-8 mb-2 text-purple-600" />
                    <span className="text-sm font-medium text-center">
                      Create a new custom agent
                    </span>
                  </Card>
                </Link>
              </CarouselItem>
            )}
          </CarouselContent>
        </Carousel>
      </div>
      {/* Task input field */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Task
        </label>
        <textarea
          className="w-full min-h-[60px] max-h-[160px] border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition resize-y"
          placeholder="Describe the main task for this agent..."
          value={config.task || ""}
          onChange={handleTaskChange}
          disabled={readOnly}
        />
      </div>
    </div>
  );
};

// Node metadata for the palette
export const agentNodeMetadata = {
  type: "custom_agent",
  category: "agent",
  group: "default",
  name: "Custom Agent",
  description: "A custom AI agent that can perform tasks",
  icon: Bot,
  configComponent: AgentConfigComponent,
};

export const AgentNode = ({ data }: { data: WorkflowNode }) => {
  const colors = getNodeColors(data.group);
  const agentName = data.data?.agentName;
  const task = data.data?.task;
  return (
    <div className="w-full">
      <div
        className="p-3 border-b border-gray-200"
        style={{ backgroundColor: colors.secondary }}
      >
        <div className="flex items-center">
          <Bot className="w-5 h-5 mr-2" style={{ color: colors.primary }} />
          <h3 className="font-semibold text-gray-800">Agent</h3>
        </div>
      </div>
      <div className="p-4 flex flex-col items-start gap-2">
        <div className="w-full">
          <p
            className="font-semibold text-gray-900 truncate"
            title={agentName || undefined}
          >
            {agentName ? agentName : "No agent selected"}
          </p>
          <p
            className="mt-2 text-xs text-gray-700 line-clamp-2 max-w-full break-words"
            title={task || undefined}
            style={{ wordBreak: "break-word" }}
          >
            {task ? task : "No task specified"}
          </p>
        </div>
      </div>
      <TargetHandle />
      <SourceHandle />
    </div>
  );
};
