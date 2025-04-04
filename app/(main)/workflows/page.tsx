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
import WorkflowService, { Workflow } from "@/services/WorkflowService";
import { Hammer, LucideEdit, LucideTrash } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const Workflows = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkflows() {
      setLoading(true);
      const workflows = await WorkflowService.getWorkflowsList();
      setWorkflows(workflows);
      setLoading(false);
    }
    fetchWorkflows();
  }, []);

  const handleCreateWorkflow = () => {};
  const handleWorkflowClick = (workflow: Workflow) => {};
  const handleProjectClick = (workflow: Workflow) => {};
  const handleEditWorkflow = (workflow: Workflow) => {};
  const handleDeleteWorkflow = (workflow: Workflow) => {};

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
        <Button onClick={handleCreateWorkflow} className="gap-2">
          <Hammer className="h-6 w-6" />
          Create Workflow
        </Button>
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
              <TableHead className="w-[200px] text-primary">
                Created At
              </TableHead>
              <TableHead className="w-[200px] text-primary text-end">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <>
                <TableRow className="w-full">
                  <Skeleton className="w-full h-8 my-4" />
                </TableRow>
                <TableRow className="w-full">
                  <Skeleton className="w-full h-8 my-4" />
                </TableRow>
                <TableRow className="w-full">
                  <Skeleton className="w-full h-8 my-4" />
                </TableRow>
                <TableRow className="w-full">
                  <Skeleton className="w-full h-8 my-4" />
                </TableRow>
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
                        onClick={() => handleWorkflowClick(workflow)}
                      >
                        {workflow.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/projects/${workflow.project_id}`}
                        onClick={() => handleProjectClick(workflow)}
                      >
                        {workflow?.project_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {new Date(workflow.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-5">
                        <div className="flex gap-3"></div>
                        <Link href={`/workflows/${workflow.id}/edit`}>
                          <Button
                            variant="link"
                            className="configure-button hover:bg-gray-200"
                            onClick={() => {
                              handleEditWorkflow(workflow);
                            }}
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
