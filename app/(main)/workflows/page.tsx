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
    setWorkflows(
      workflows.sort(
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
    <div>
      {/* HEADER */}
      <div className="flex w-full mx-auto items-center space-x-2 p-4 mt-6">
        <Input
          type="text"
          placeholder="Search your Workflows..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {/* <Button onClick={() => setOpenTemplateModal(true)} className="gap-2">
          <FilePlus2 className="h-6 w-6" />
          Create from Template
        </Button> */}
        <Link href={"/workflows/create"}>
          <Button className="gap-2">
            <Hammer className="h-6 w-6" />
            Create Workflow
          </Button>
        </Link>
      </div>

      {/* TEMPLATE MODAL */}
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

      {/* LIST WORKFLOWS */}
      <div className="w-full p-4">
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
                  <AccordionTrigger className="px-8 py-8 hover:bg-gray-50 transition-colors [&[data-state=open]>svg]:rotate-180">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center w-full space-x-6">
                        <div className="w-1/4 text-left flex-shrink-0">
                          <h3 className="text-xl font-semibold text-gray-900 mb-3 text-left">
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
                        <div className="flex items-center space-x-6 flex-1 min-w-0">
                          <div className="flex items-center space-x-3 text-left w-64 flex-shrink-0 overflow-hidden">
                            <Bot className="h-8 w-8 text-gray-500 flex-shrink-0" />
                            <div className="text-left min-w-0 flex-1 overflow-hidden">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide text-left mb-1">
                                Agent
                              </p>
                              <Tooltip>
                                <TooltipTrigger className="text-sm text-gray-700 font-medium text-left truncate block w-full overflow-hidden">
                                  {getAgentNames(workflow)[0] || "No Agent"}{" "}
                                  {getAgentNames(workflow).length > 1
                                    ? ` +${getAgentNames(workflow).length - 1}`
                                    : ""}
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  className="space-y-2"
                                >
                                  {getAgentNames(workflow).map(
                                    (agentName, index) => (
                                      <div key={index} className="">
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
                          <div className="flex items-center space-x-3 text-left w-64 flex-shrink-0 overflow-hidden">
                            <Zap className="h-8 w-8 text-gray-500 flex-shrink-0" />
                            <div className="text-left min-w-0 flex-1 overflow-hidden">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide text-left mb-1">
                                Triggers
                              </p>
                              <Tooltip>
                                <TooltipTrigger className="text-sm text-gray-700 font-medium text-left truncate block w-full overflow-hidden">
                                  {getTriggerNames(workflow)[0] ||
                                    "No triggers"}{" "}
                                  {getTriggerNames(workflow).length > 1
                                    ? ` +${getTriggerNames(workflow).length - 1}`
                                    : ""}
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  className="space-y-2"
                                >
                                  {getTriggerNames(workflow).map(
                                    (triggerName, index) => (
                                      <div key={index} className="">
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
                          <div className="flex items-center space-x-3 text-left w-40 flex-shrink-0 overflow-hidden">
                            <GitBranch className="h-8 w-8 text-gray-500 flex-shrink-0" />
                            <div className="text-left min-w-0 flex-1 overflow-hidden">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide text-left mb-1">
                                Status
                              </p>
                              <div className="flex items-center space-x-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${workflow.is_paused ? "bg-red-500" : "bg-green-500"} ${!workflow.is_paused ? "animate-pulse" : ""}`}
                                ></div>
                                <p className="text-sm text-gray-700 font-medium text-left truncate w-full overflow-hidden">
                                  {workflow.is_paused ? "Paused" : "Active"}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 text-left w-40 flex-shrink-0 overflow-hidden">
                            <History className="h-8 w-8 text-gray-500 flex-shrink-0" />
                            <div className="text-left min-w-0 flex-1 overflow-hidden">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide text-left mb-1">
                                Executions
                              </p>
                              <Link
                                href={`/workflows/${workflow.id}/executions`}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium text-left truncate block w-full overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View History
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 ml-6 flex-shrink-0">
                        <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-full">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">
                            {new Date(workflow.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 hover:bg-gray-200 flex items-center justify-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePause(workflow, index);
                                }}
                              >
                                {workflow.is_paused ? (
                                  <Play className="h-4 w-4 stroke-slate-500" />
                                ) : (
                                  <Pause className="h-4 w-4 stroke-slate-500" />
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
                                  className="h-10 w-10 p-0 hover:bg-gray-200 flex items-center justify-center"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <LucideEdit className="h-4 w-4" />
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
                                className="h-10 w-10 p-0 text-red-600 hover:text-red-800 hover:bg-red-100 flex items-center justify-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteWorkflow(workflow);
                                }}
                              >
                                <LucideTrash className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete workflow</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="px-6 pb-6 border-t border-gray-100 bg-gray-50">
                      <div className="pt-4 space-y-6">
                        {/* Workflow Details Section */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700">
                              Workflow Details
                            </h4>
                            <Link href={`/workflows/${workflow.id}/executions`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                              >
                                <History className="h-4 w-4" />
                                View Executions
                              </Button>
                            </Link>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-lg border">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">
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
                              <h5 className="text-sm font-medium text-gray-700 mb-2">
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
              <div>
                {searchTerm.trim()
                  ? `No workflows found matching "${searchTerm}". Try a different search term.`
                  : "No workflows found. Create your first workflow"}
              </div>
              <Link href={"/workflows/create"}>
                <Button className="gap-2 mt-4">
                  <Hammer className="h-6 w-6" />
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
