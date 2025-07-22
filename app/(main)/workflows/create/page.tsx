"use client";

import { z } from "zod";
import { WorkflowEditor } from "../components/editor/WorkflowEditor";
import { Workflow } from "@/services/WorkflowService";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function CreateWorkflowPage() {
  const router = useRouter();
  const handleSave = async (workflow: Workflow, isNewWorkflow: boolean) => {
    if (
      workflow &&
      workflow.id &&
      workflow.id !== "default-id" &&
      workflow.id !== ""
    ) {
      if (isNewWorkflow) {
        toast.success("Workflow created successfully!");

        // Add a small delay to ensure the toast is shown before redirect
        setTimeout(() => {
          try {
            router.push(`/workflows/${workflow.id}?mode=edit`);
          } catch (error) {
            // Fallback: try window.location if router fails
            window.location.href = `/workflows/${workflow.id}?mode=edit`;
          }
        }, 100);
      } else {
        toast.success("Workflow saved successfully!");
      }
    }
  };
  return (
    <div className="h-screen w-full">
      <WorkflowEditor mode="edit" debugMode={true} onSave={handleSave} />
    </div>
  );
}
