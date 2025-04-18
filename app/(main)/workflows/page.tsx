"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import AgentService from "@/services/AgentService";

import WorkflowService, { Trigger, Workflow } from "@/services/WorkflowService";
import { TooltipTrigger } from "@radix-ui/react-tooltip";
import {
  FilePlus2,
  Hammer,
  LucideEdit,
  LucideTrash,
  Pause,
  Play,
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

  async function fetchData() {
    console.log("fetching...");
    setLoading(true);
    const workflows = await WorkflowService.getWorkflowsList();
    setWorkflows(
      workflows.sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    );

    const agents = await AgentService.getAgentTypes();
    setAvailableAgents(
      agents.map((agent: any) => ({ id: agent.id, name: agent.name }))
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
        <Button onClick={() => setOpenTemplateModal(true)} className="gap-2">
          <FilePlus2 className="h-6 w-6" />
          Create from Template
        </Button>
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
        <Table className="mt-10">
          <TableHeader className="font-semibold text-red">
            <TableRow className="border-b border-border font-semibold text-red">
              <TableHead className="w-[200px] text-primary">Title</TableHead>
              <TableHead className="w-[200px] text-primary">
                Repository
              </TableHead>
              <TableHead className="w-[200px] text-primary">Agent</TableHead>
              <TableHead className="w-[200px] text-primary">Triggers</TableHead>
              <TableHead className="w-[200px] text-primary">
                Created At
              </TableHead>
              <TableHead className="w-[200px] text-primary pl-4">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <>
                {[...Array(5)].map((_, index) => (
                  <TableRow key={index} className="w-full">
                    <TableCell>
                      <Skeleton className="w-1/3 h-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="w-2/3 h-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="w-2/3 h-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="w-1/3 h-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="w-4/5 h-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="w-1/5 h-8" />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ) : (
              workflows.map((workflow, index) => (
                <TableRow
                  key={workflow.id}
                  className="hover:bg-red border-b border-gray-200 text-black"
                >
                  <TableCell>
                    <Link
                      href={`/workflows/${workflow.id}`}
                      className="hover:text-blue-600"
                    >
                      {workflow.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {workflow.repo_name || "<Deleted project>"}
                  </TableCell>
                  <TableCell>
                    {availableAgents.find(
                      (agent) => agent.id == workflow?.agent_id
                    )?.name || "<Deleted Agent>"}
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger className="space-y-2">
                        {triggers.find(
                          (trigger) => trigger.id == workflow?.triggers[0]
                        )?.name || "<Unknown Trigger>"}{" "}
                        {workflow.triggers.length > 1
                          ? ` +${workflow.triggers.length - 1}`
                          : ""}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="space-y-2">
                        {workflow.triggers.map(
                          (current: string, index: number) => (
                            <div key={index} className="">
                              <span className="text-sm text-gray-700">
                                {triggers.find(
                                  (trigger) => trigger.id == current
                                )?.name || "<Unknown Trigger>"}
                              </span>
                            </div>
                          )
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {new Date(workflow.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        className=""
                        onClick={() => {
                          handlePause(workflow, index);
                        }}
                      >
                        {workflow.is_paused ? (
                          <Play className="h-4 w-4 stroke-slate-500" />
                        ) : (
                          <Pause className="h-4 w-4 stroke-slate-500" />
                        )}
                      </Button>
                      <Link href={`/workflows/${workflow.id}/edit`}>
                        <Button
                          variant="link"
                          className="configure-button hover:bg-gray-200"
                        >
                          <LucideEdit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        className="text-red-600 hover:text-red-800 hover:bg-red-100"
                        onClick={() => {
                          handleDeleteWorkflow(workflow);
                        }}
                      >
                        <LucideTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
            {workflows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-[500px]">
                  <div>No workflows found. Create your first workflow</div>
                  <Link href={"/workflows/create"}>
                    <Button className="gap-2 mt-4">
                      <Hammer className="h-6 w-6" />
                      Create Workflow
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Workflows;
