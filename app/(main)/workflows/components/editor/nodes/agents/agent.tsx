import { WorkflowNode } from "@/services/WorkflowService";
import { getNodeColors } from "../color_utils";
import { SourceHandle, TargetHandle } from "../../handles";
import { Bot, Code } from "lucide-react";
import { FC, useEffect, useState } from "react";
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
import { RepoBranchSelector } from "../triggers/github/RepoBranchSelector";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAgentData } from "../../contexts/AgentDataContext";

interface AgentConfigProps {
  config: any;
  onConfigChange: (config: any) => void;
  readOnly?: boolean;
  workflow?: any;
}

export const AgentConfigComponent: FC<AgentConfigProps> = ({
  config,
  onConfigChange,
  readOnly = false,
  workflow,
}) => {
  const {
    agents: availableAgents,
    loading,
    error,
    refreshAgents,
  } = useAgentData();

  // Log when using shared agent data
  useEffect(() => {
    if (availableAgents.length > 0) {
      console.log(
        `[AgentConfigComponent] Using shared agent data with ${availableAgents.length} agents`
      );
    }
  }, [availableAgents.length]);

  // Only update config on click, don't re-fetch agents
  const handleSelectAgent = (agentId: string) => {
    if (readOnly) return;

    const selectedAgent = availableAgents.find((a) => a.id === agentId);

    // Ensure config exists and create a new config object
    const currentConfig = config || {};
    const newConfig = {
      ...currentConfig,
      // Set the correct snake_case fields
      agent_id: agentId,
      name: selectedAgent?.name,
    };

    // Always call onConfigChange to ensure the update happens
    onConfigChange(newConfig);
  };

  // Handle task change
  const handleTaskChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    onConfigChange({ ...(config || {}), task: e.target.value });
  };

  // Handle repository change
  const handleRepoChange = (repo: string) => {
    if (readOnly) return;
    onConfigChange({ ...(config || {}), repo_name: repo });
  };

  // Handle branch change
  const handleBranchChange = (branch: string) => {
    if (readOnly) return;
    onConfigChange({ ...(config || {}), branch_name: branch });
  };

  // Handle use current branch toggle
  const handleUseCurrentBranchChange = (useCurrentBranch: boolean) => {
    if (readOnly) return;
    onConfigChange({
      ...(config || {}),
      use_current_branch: useCurrentBranch,
      // Clear branch_name if using current branch
      branch_name: useCurrentBranch ? "" : config?.branch_name || "",
    });
  };

  // Handle use current repo toggle
  const handleUseCurrentRepoChange = (useCurrentRepo: boolean) => {
    if (readOnly) return;
    onConfigChange({
      ...(config || {}),
      use_current_repo: useCurrentRepo,
      // Clear repo_name if using current repo
      repo_name: useCurrentRepo ? "" : config?.repo_name || "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-medium">Choose an agent:</span>
        <RefreshCcw
          className={`h-4 w-4 cursor-pointer ${loading ? "animate-spin" : ""}`}
          onClick={readOnly ? undefined : refreshAgents}
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
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 pointer-events-auto bg-background rounded-full shadow border border-gray-200 w-8 h-8 flex items-center justify-center"
              disabled={readOnly}
            />
            <CarouselNext
              type="button"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 pointer-events-auto bg-background rounded-full shadow border border-gray-200 w-8 h-8 flex items-center justify-center"
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
                    (config?.agent_id || "") === agent.id
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
                  {(config?.agent_id || "") === agent.id && (
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
                      (config?.agent_id || "") === "create-agent"
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

      {/* Repository and Branch Selection */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Repository & Branch
        </label>

        {/* Use Current Repo Toggle */}
        <div className="flex items-center space-x-2 mb-3">
          <Checkbox
            id="useCurrentRepo"
            checked={config?.use_current_repo || false}
            onCheckedChange={handleUseCurrentRepoChange}
            disabled={readOnly}
          />
          <Label
            htmlFor="useCurrentRepo"
            className="text-sm font-medium text-gray-700 cursor-pointer"
          >
            Use current repository from execution variables
          </Label>
        </div>
        {(config?.use_current_repo || false) && (
          <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-md p-2 mb-3">
            ℹ️ The repository will be automatically determined based on the
            trigger&apos;s repository data. If the trigger isn&apos;t
            repository-related (e.g., manual trigger), it will use the
            workflow&apos;s default repository.
          </div>
        )}

        {/* Use Current Branch Toggle */}
        <div className="flex items-center space-x-2 mb-3">
          <Checkbox
            id="useCurrentBranch"
            checked={config?.use_current_branch || false}
            onCheckedChange={handleUseCurrentBranchChange}
            disabled={readOnly}
          />
          <Label
            htmlFor="useCurrentBranch"
            className="text-sm font-medium text-gray-700 cursor-pointer"
          >
            Use current branch from execution variables
          </Label>
        </div>
        {(config?.use_current_branch || false) && (
          <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-md p-2 mb-3">
            ℹ️ The branch will be automatically determined based on the
            trigger&apos;s branch data. If the trigger isn&apos;t branch-related
            (e.g., manual trigger), it will default to the &quot;main&quot;
            branch.
          </div>
        )}

        {!(config?.use_current_repo || false) && (
          <RepoBranchSelector
            repoName={config?.repo_name || ""}
            branchName={
              config?.use_current_branch || false
                ? ""
                : config?.branch_name || ""
            }
            onRepoChange={handleRepoChange}
            onBranchChange={handleBranchChange}
            readOnly={readOnly}
            repoOnly={config?.use_current_branch || false}
          />
        )}
      </div>

      {/* Task input field */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Task
        </label>
        <textarea
          className="w-full min-h-[60px] max-h-[160px] border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition resize-y"
          placeholder="Describe the main task for this agent..."
          value={config?.task || ""}
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
  const { agents } = useAgentData();
  const agentName = data.data?.name;
  const agentId = data.data?.agent_id;
  const task = data.data?.task;
  const repoName = data.data?.repo_name;
  const branchName = data.data?.branch_name;
  const useCurrentBranch = data.data?.use_current_branch;
  const useCurrentRepo = data.data?.use_current_repo;

  // Find agent name from shared data if we have agent_id but no agentName
  const resolvedAgent = agentId ? agents.find((a) => a.id === agentId) : null;
  const displayName = resolvedAgent?.name || agentName;

  return (
    <div className="w-full">
      <div
        className="p-3 border-b border-gray-200"
        style={{ backgroundColor: colors.secondary }}
      >
        <div className="flex items-center">
          <Bot className="w-5 h-5 mr-2" style={{ color: colors.primary }} />
          <h3 className="font-semibold text-gray-800">Custom Agent</h3>
        </div>
      </div>
      <div className="p-4 flex flex-col items-start gap-2">
        <div className="w-full">
          <p
            className={`font-semibold truncate ${
              displayName ? "text-gray-900" : "text-red-600"
            }`}
            title={displayName || undefined}
          >
            {displayName ? displayName : "No agent selected"}
          </p>
          {useCurrentRepo ? (
            <p className="mt-1 text-xs text-blue-600 truncate">
              📁 Current Repository
            </p>
          ) : (
            repoName && (
              <p
                className="mt-1 text-xs text-gray-600 truncate"
                title={repoName}
              >
                📁 {repoName}
              </p>
            )
          )}
          {useCurrentBranch ? (
            <p className="mt-1 text-xs text-blue-600 truncate">
              🌿 Current Branch
            </p>
          ) : (
            branchName && (
              <p
                className="mt-1 text-xs text-gray-600 truncate"
                title={branchName}
              >
                🌿 {branchName}
              </p>
            )
          )}
          <p
            className="mt-2 text-xs text-gray-700 line-clamp-2 max-w-full break-words"
            title={task || undefined}
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
