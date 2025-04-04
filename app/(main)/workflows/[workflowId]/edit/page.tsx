"use client";
import { useParams } from "next/navigation";

const WorkflowEditPage = () => {
  const params: { workflowId: string } = useParams();
  return (
    <div>
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
        Workflow Edit Page - {params.workflowId}
      </h1>
      <p>This is the workflow edit page.</p>
    </div>
  );
};

export default WorkflowEditPage;
