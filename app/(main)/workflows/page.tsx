"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ValidationStatus } from "@/components/ui/validation-status";
import AgentService from "@/services/AgentService";

import WorkflowService, { Trigger, Workflow } from "@/services/WorkflowService";
import { WorkflowEditor } from "./components/editor";
import { TooltipTrigger } from "@radix-ui/react-tooltip";
import {
  FilePlus2,
  Hammer,
  LucideEdit,
  LucideTrash,
  Pause,
  Play,
  Calendar,
  GitBranch,
  Bot,
  Zap,
  History,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Agent {
  id: string;
  name: string;
}

interface Template {
  title: string;
  description?: string;
  agent_id: string;
  triggers: string[];
  task: string;
}

const templates = [
  {
    title: "PR Review Workflow",
    description: "automatically review pull requests on creation",
    triggers: ["github_pr_created"],
    task: "For the newly created pull request, review the code changes and add the review as a comment",
  },
  // Add more templates as needed
  {
    title: "Fix Issue Workflow",
    description: "automatically create a pull request to fix an issue",
    triggers: ["github_issue_added"],
    task: "For the newly created issue, analyze the issue. If it is a bug that is fixable, create a new branch add a commit with the fix and create a pull request",
  },
];

const Workflows = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    const workflows = await WorkflowService.getWorkflowsList();

    // Skip validation flow - set all workflows as valid by default
    const workflowsWithValidation = workflows.map((workflow) => ({
      ...workflow,
      validation: {
        is_valid: true, // Skip validation - assume all workflows are valid
        errors: [],
        warnings: [],
      },
    }));

    setWorkflows(
      workflowsWithValidation.sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    );

    // Fetch custom agents using getAgentList
    const customAgents = await AgentService.getAgentList();
    setAvailableAgents(
      customAgents.map((agent: any) => ({ id: agent.id, name: agent.name }))
    );
    const _triggers = await WorkflowService.getAllTriggers();
    setTriggers(_triggers);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteWorkflow = (workflow: Workflow) => {
    if (confirm("Are you sure you want to delete this workflow?")) {
      WorkflowService.deleteWorkflow(workflow.id).then(() => {
        setWorkflows((prevWorkflows) =>
          prevWorkflows.filter((w) => w.id !== workflow.id)
        );
      });
    }
  };

  const handlePause = async (workflow: Workflow, index: number) => {
    if (workflow.is_paused) {
      await WorkflowService.resumeWorkflow(workflow.id);
    } else {
      await WorkflowService.pauseWorkflow(workflow.id);
    }

    const updatedWorkflows = workflows.map((w, i) =>
      i === index ? { ...w, is_paused: !w.is_paused } : w
    );

    setWorkflows(updatedWorkflows);
  };

  const [openTemplateModal, setOpenTemplateModal] = useState(false);

  // Helper function to get trigger names from workflow graph
  const getTriggerNames = (workflow: Workflow) => {
    const triggerNodes = Object.values(workflow.graph.nodes).filter(
      (node) => node.category === "trigger"
    );
    return triggerNodes.map((node) => {
      const trigger = triggers.find((t) => t.id === node.type);
      return trigger?.name || node.type;
    });
  };

  // Helper function to get agent names from workflow graph
  const getAgentNames = (workflow: Workflow) => {
    const agentNodes = Object.values(workflow.graph.nodes).filter(
      (node) => node.type === "custom_agent"
    );

    return agentNodes.map((node) => {
      // Get the agent name from the node data
      const agentName = node.data?.agentName;
      if (agentName) {
        return agentName;
      }

      // Map agent_id to agent name from available agents (try both camelCase and snake_case)
      const agentId = node.data?.agentId || node.data?.agent_id;
      if (agentId) {
        const agent = availableAgents.find((a) => a.id === agentId);
        return agent?.name || `Agent ${agentId}`;
      }

      return "Unknown Agent";
    });
  };

  // Filter workflows based on search term
  const filteredWorkflows = workflows.filter((workflow) => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();

    // Search in title
    if (workflow.title.toLowerCase().includes(searchLower)) return true;

    // Search in description
    if (
      workflow.description &&
      workflow.description.toLowerCase().includes(searchLower)
    )
      return true;

    // Search in agent names
    const agentNames = getAgentNames(workflow);
    if (agentNames.some((name) => name.toLowerCase().includes(searchLower)))
      return true;

    // Search in trigger names
    const triggerNames = getTriggerNames(workflow);
    if (triggerNames.some((name) => name.toLowerCase().includes(searchLower)))
      return true;

    return false;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search workflows..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href={"/workflows/create"}>
                <Button className="gap-2">
                  <Hammer className="h-4 w-4" />
                  Create Workflow
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Template Modal */}
      <Dialog open={openTemplateModal} onOpenChange={setOpenTemplateModal}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Create from Template</h2>
            <p className="text-sm text-gray-500">
              Select a template to create a new workflow. You can customize it
            </p>
          </div>
          {templates.map((template, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 border p-4 rounded-md mt-4"
            >
              <h3 className="text-lg font-semibold">{template.title}</h3>
              <p className="text-sm text-gray-500">
                {template.description || "No description available"}
              </p>
              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold">Triggers</h4>
                <ul className="list-disc pl-5">
                  {template.triggers.map((trigger, index) => (
                    <li key={index} className="text-sm text-gray-700">
                      {trigger}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/workflows/create?template=${JSON.stringify(template)}`}
                >
                  <Button variant="outline" className="mt-2">
                    Use this template
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Skeleton className="w-1/3 h-6" />
                    <Skeleton className="w-1/6 h-6" />
                  </div>
                  <Skeleton className="w-2/3 h-4" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <Accordion
            type="single"
            collapsible
            className="space-y-4"
            value={openAccordionId || undefined}
            onValueChange={(value) => setOpenAccordionId(value)}
          >
            {filteredWorkflows.map((workflow, index) => (
              <AccordionItem key={workflow.id} value={workflow.id}>
                <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <AccordionTrigger className="px-6 py-6 hover:bg-gray-50 transition-colors [&[data-state=open]>svg]:rotate-180">
                    <div className="w-full">
                      {/* Top Row: Title, Description, and Date */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1 text-left">
                            <Link
                              href={`/workflows/${workflow.id}`}
                              className="hover:text-blue-600 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {workflow.title}
                            </Link>
                          </h3>
                          <p className="text-sm text-gray-600 text-left">
                            {workflow.description || "No description"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full ml-4 flex-shrink-0">
                          <Calendar className="h-3 w-3" />
                          <span className="font-medium">
                            {new Date(workflow.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Row: Metadata Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Agent */}
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Bot className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 text-left">
                              Agent
                            </p>
                            <Tooltip>
                              <TooltipTrigger className="text-sm text-gray-700 font-medium truncate block w-full text-left">
                                {getAgentNames(workflow)[0] || "No Agent"}
                                {getAgentNames(workflow).length > 1 &&
                                  ` +${getAgentNames(workflow).length - 1}`}
                              </TooltipTrigger>
                              <TooltipContent side="top" className="space-y-1">
                                {getAgentNames(workflow).map(
                                  (agentName, index) => (
                                    <div key={index}>
                                      <span className="text-sm text-gray-700">
                                        {agentName}
                                      </span>
                                    </div>
                                  )
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        {/* Triggers */}
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Zap className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 text-left">
                              Triggers
                            </p>
                            <Tooltip>
                              <TooltipTrigger className="text-sm text-gray-700 font-medium truncate block w-full text-left">
                                {getTriggerNames(workflow)[0] || "No triggers"}
                                {getTriggerNames(workflow).length > 1 &&
                                  ` +${getTriggerNames(workflow).length - 1}`}
                              </TooltipTrigger>
                              <TooltipContent side="top" className="space-y-1">
                                {getTriggerNames(workflow).map(
                                  (triggerName, index) => (
                                    <div key={index}>
                                      <span className="text-sm text-gray-700">
                                        {triggerName}
                                      </span>
                                    </div>
                                  )
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <GitBranch className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 text-left">
                              Status
                            </p>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  workflow.is_paused
                                    ? "bg-red-500"
                                    : "bg-green-500"
                                } ${!workflow.is_paused ? "animate-pulse" : ""}`}
                              />
                              <span className="text-sm text-gray-700 font-medium text-left">
                                {workflow.is_paused ? "Paused" : "Active"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <History className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 text-left ml-1">
                              Actions
                            </p>
                            <div className="flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 hover:bg-gray-200"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePause(workflow, index);
                                    }}
                                  >
                                    {workflow.is_paused ? (
                                      <Play className="h-3 w-3" />
                                    ) : (
                                      <Pause className="h-3 w-3" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {workflow.is_paused
                                      ? "Resume workflow"
                                      : "Pause workflow"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link
                                    href={`/workflows/${workflow.id}?mode=edit`}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 hover:bg-gray-200"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <LucideEdit className="h-3 w-3" />
                                    </Button>
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Edit workflow</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-red-600 hover:text-red-800 hover:bg-red-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteWorkflow(workflow);
                                    }}
                                  >
                                    <LucideTrash className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delete workflow</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link
                                    href={`/workflows/${workflow.id}/executions`}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 hover:bg-gray-200"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <History className="h-3 w-3" />
                                    </Button>
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View executions</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent>
                    <div className="px-6 pb-6 border-t border-gray-100 bg-gray-50">
                      <div className="pt-4 space-y-6">
                        {/* Workflow Details Section */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-gray-700">
                              Workflow Details
                            </h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-lg border">
                              <h5 className="text-sm font-medium text-gray-700 mb-3">
                                Configuration
                              </h5>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">
                                    Version:
                                  </span>
                                  <span className="text-sm font-medium">
                                    {workflow.version}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">
                                    Created:
                                  </span>
                                  <span className="text-sm font-medium">
                                    {new Date(
                                      workflow.created_at
                                    ).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">
                                    Updated:
                                  </span>
                                  <span className="text-sm font-medium">
                                    {new Date(
                                      workflow.updated_at
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border">
                              <h5 className="text-sm font-medium text-gray-700 mb-3">
                                Nodes
                              </h5>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">
                                    Total Nodes:
                                  </span>
                                  <span className="text-sm font-medium">
                                    {Object.keys(workflow.graph.nodes).length}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">
                                    Triggers:
                                  </span>
                                  <span className="text-sm font-medium">
                                    {
                                      Object.values(
                                        workflow.graph.nodes
                                      ).filter((n) => n.category === "trigger")
                                        .length
                                    }
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">
                                    Agents:
                                  </span>
                                  <span className="text-sm font-medium">
                                    {
                                      Object.values(
                                        workflow.graph.nodes
                                      ).filter((n) => n.category === "agent")
                                        .length
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Workflow Preview Section */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            Workflow Preview
                          </h4>
                          <div className="bg-white rounded-lg border h-96">
                            <WorkflowEditor
                              workflow={workflow}
                              mode="preview"
                              debugMode={false}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {filteredWorkflows.length === 0 && !loading && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-gray-600 mb-4">
                {searchTerm.trim()
                  ? `No workflows found matching "${searchTerm}". Try a different search term.`
                  : "No workflows found. Create your first workflow"}
              </div>
              <Link href={"/workflows/create"}>
                <Button className="gap-2">
                  <Hammer className="h-4 w-4" />
                  Create Workflow
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Workflows;
