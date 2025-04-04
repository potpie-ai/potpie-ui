"use client";
import { Button } from "@/components/ui/button";
import WorkflowService, { Workflow } from "@/services/WorkflowService";
import { LucideEdit, LucideLoader2, LucideTrash } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const WorkflowPage = () => {
  const params: { workflowId: string } = useParams();

  const [workflow, setWorkflow] = useState<Workflow | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkflow() {
      setLoading(true);
      const workflow = await WorkflowService.getWorkflowById(params.workflowId);
      setWorkflow(workflow);
      setLoading(false);
    }
    fetchWorkflow();
  }, []);

  function handleDeleteWorkflow(workflow: Workflow | undefined) {
    throw new Error("Function not implemented.");
  }

  return (
    <div className="p-6">
      {loading ? (
        <div className="flex w-full h-svh items-center justify-center">
          <LucideLoader2 className="w-12 h-12 animate-spin" />
        </div>
      ) : (
        <>
          <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
            {workflow?.title}
          </h1>
          <p>{workflow?.description}</p>
          <div className="mt-8">
            {/* ACTION BAR */}
            <Link href={`/workflows/${workflow?.id}/edit`}>
              <Button
                variant="link"
                className="configure-button hover:bg-gray-200 outline-dashed outline-1"
              >
                Edit <LucideEdit className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="destructive"
              className="text-red-600 hover:text-red-800 hover:bg-red-100 ml-4 outline-dashed outline-1"
              onClick={() => {
                handleDeleteWorkflow(workflow);
              }}
            >
              Delete <LucideTrash className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default WorkflowPage;
