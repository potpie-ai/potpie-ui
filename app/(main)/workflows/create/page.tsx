"use client";

import { z } from "zod";
import { WorkflowEditor } from "../components/editor/WorkflowEditor";
import { Workflow } from "@/services/WorkflowService";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LucideLoader2 } from "lucide-react";
import { useState } from "react";
import { parseApiError } from "@/lib/utils";

export default function CreateWorkflowPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSave = async (workflow: Workflow, isNewWorkflow: boolean) => {
    try {
      setLoading(true);

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
    } catch (error) {
      console.error("Error saving workflow:", error);
      const errorMessage = parseApiError(error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
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

  const handleExecutionsClick = () => {
    // In create mode, executions don't exist yet, so we can either:
    // 1. Do nothing
    // 2. Show a toast message
    // 3. Redirect to workflows list
    toast.info("Executions are only available after the workflow is created.");
  };

  if (loading) {
    return (
      <div className="flex w-full h-svh items-center justify-center">
        <LucideLoader2 className="w-12 h-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[100vh] w-full overflow-hidden">
      <WorkflowEditor
        mode="edit"
        debugMode={true}
        onSave={handleSave}
        onCancel={handleCancel}
        onModeChange={handleModeChange}
        onExecutionsClick={handleExecutionsClick}
      />
    </div>
  );
}
