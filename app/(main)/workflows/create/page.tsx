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

  const handleCancel = () => {
    // Navigate back to workflows list
    router.push("/workflows");
  };

  const handleModeChange = (newMode: "view_only" | "edit" | "preview") => {
    // In create mode, we only support edit mode
    if (newMode !== "edit") {
      return;
    }
  };

  return (
    <div className="h-[100vh] w-full overflow-hidden">
      <WorkflowEditor
        mode="edit"
        debugMode={true}
        onSave={handleSave}
        onCancel={handleCancel}
        onModeChange={handleModeChange}
      />
    </div>
  );
}
