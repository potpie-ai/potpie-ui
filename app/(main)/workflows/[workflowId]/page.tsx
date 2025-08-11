"use client";

import { Workflow } from "@/services/WorkflowService";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LucideLoader2, History } from "lucide-react";
import WorkflowService from "@/services/WorkflowService";
import { WorkflowEditor } from "../components/editor";
import { Button } from "@/components/ui/button";

export default function WorkflowPage() {
  const params: { workflowId: string } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [workflow, setWorkflow] = useState<Workflow | undefined>();
  const [loading, setLoading] = useState(true);

  // Get mode from URL search params, default to "view_only"
  const initialMode =
    searchParams.get("mode") === "edit"
      ? "edit"
      : searchParams.get("mode") === "preview"
        ? "preview"
        : "view_only";

  useEffect(() => {
    async function fetchWorkflow() {
      setLoading(true);
      try {
        const _workflow = await WorkflowService.getWorkflowById(
          params.workflowId
        );
        if (!_workflow) {
          router.push("/workflows");
          return;
        }
        setWorkflow(_workflow);
      } catch (error) {
        console.error("Error fetching workflow:", error);
        toast.error("Error loading workflow. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (params.workflowId) {
      fetchWorkflow();
    }
  }, [params.workflowId, router]);

  const handleSave = async (
    updatedWorkflow: Workflow,
    isNewWorkflow: boolean,
    validation?: any
  ) => {
    try {
      if (isNewWorkflow) {
        toast.success("Workflow created successfully!");
      } else {
        toast.success("Workflow saved successfully!");
      }
      // Don't redirect - stay on the current page
    } catch (error) {
      console.error("Error saving workflow:", error);
      toast.error("Error saving workflow. Please try again.");
    }
  };

  const handleCancel = () => {
    // Switch back to view mode
    router.push(`/workflows/${params.workflowId}`);
  };

  const handleModeChange = (newMode: "view_only" | "edit" | "preview") => {
    if (newMode === "edit") {
      router.push(`/workflows/${params.workflowId}?mode=edit`);
    } else if (newMode === "preview") {
      router.push(`/workflows/${params.workflowId}?mode=preview`);
    } else {
      router.push(`/workflows/${params.workflowId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex w-full h-svh items-center justify-center">
        <LucideLoader2 className="w-12 h-12 animate-spin" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex w-full h-svh items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Workflow not found</h2>
          <p className="text-gray-600">
            {`The workflow you're looking for doesn't exist.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100vh] w-full overflow-hidden">
      <WorkflowEditor
        workflow={workflow}
        mode={initialMode}
        debugMode={false}
        onSave={handleSave}
        onCancel={handleCancel}
        onModeChange={handleModeChange}
        onExecutionsClick={() =>
          router.push(`/workflows/${params.workflowId}/executions`)
        }
      />
    </div>
  );
}
