"use client";

import { Button } from "@/components/ui/button";
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
import AgentService from "@/services/AgentService";

import WorkflowService, { Trigger, Workflow } from "@/services/WorkflowService";
import { Hammer, LucideEdit, LucideTrash } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Agent {
  id: string;
  name: string;
}

const Workflows = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const workflows = await WorkflowService.getWorkflowsList();
      setWorkflows(workflows);

      const agents = await AgentService.getAgentTypes();
      setAvailableAgents(
        agents.map((agent: any) => ({ id: agent.id, name: agent.name }))
      );
      const _triggers = await WorkflowService.getAllTriggers();
      setTriggers(_triggers);
      setLoading(false);
    }

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
        <Link href={"/workflows/create"}>
          <Button className="gap-2">
            <Hammer className="h-6 w-6" />
            Create Workflow
          </Button>
        </Link>
      </div>

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
              <TableHead className="w-[200px] text-primary">Trigger</TableHead>
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
              workflows
                .sort(
                  (a: any, b: any) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                ) // Sort by created_at in descending order
                .map((workflow) => (
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
                      {triggers.find(
                        (trigger) => trigger.id == workflow?.triggers[0]
                      )?.name || "<Unknown Trigger>"}
                    </TableCell>
                    <TableCell>
                      {new Date(workflow.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
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
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Workflows;
