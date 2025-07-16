"use client";

import { z } from "zod";
import { WorkflowEditor } from "../components/editor/WorkflowEditor";
import {
  NodeCategory,
  NodeGroup,
  NodeType,
  Workflow,
} from "@/services/WorkflowService";

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 5 characters.",
  }),
  description: z.string().optional(),
  repo_name: z.string().nonempty(),
  branch: z.string().nonempty(),
  agent_id: z.string().nonempty(),
  triggers: z.array(z.string()).min(1, {
    message: "Please select at least one trigger.",
  }),
  task: z.string().min(20, {
    message: "must be at least 20 characters.",
  }),
});

interface Agent {
  id: string;
  name: string;
  description: string;
}

const dummyWorkflow: Workflow = {
  id: "10",
  title: "Test Workflow",
  description: "This is a test workflow",
  repo_name: "test-repo",
  branch: "main",
  agent_id: "1",
  created_by: "1",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  triggers: ["github_pr_opened"],
  hash: "123",
  task: "test-task",
  is_paused: false,
  graph: {
    nodes: {
      "1": {
        id: "1",
        type: NodeType.TRIGGER_GITHUB_PR_OPENED,
        group: NodeGroup.GITHUB,
        category: NodeCategory.TRIGGER,
        position: { x: 100, y: 100 },
        data: {
          repo_name: "test-repo",
          branch: "main",
        },
      },
      "2": {
        id: "2",
        type: NodeType.TRIGGER_LINEAR_ISSUE_CREATED,
        group: NodeGroup.LINEAR,
        category: NodeCategory.TRIGGER,
        position: { x: 400, y: 300 },
        data: {
          issue_id: "1",
        },
      },
      "3": {
        id: "3",
        type: NodeType.CUSTOM_AGENT,
        group: NodeGroup.DEFAULT,
        category: NodeCategory.AGENT,
        position: { x: 600, y: 100 },
        data: {
          agent_id: "asddw-asd-asd-asd-asd",
          name: "Test Agent",
          task: "This is a test task, it should be a long task",
        },
      },
      "4": {
        id: "4",
        type: NodeType.FLOW_CONTROL_CONDITIONAL,
        group: NodeGroup.DEFAULT,
        category: NodeCategory.FLOW_CONTROL,
        position: { x: 800, y: 200 },
        data: {
          condition: "if result contains 'test'",
        },
      },
      "5": {
        id: "5",
        type: NodeType.CUSTOM_AGENT,
        group: NodeGroup.DEFAULT,
        category: NodeCategory.AGENT,
        position: { x: 1100, y: 300 },
        data: {
          agent_id: "asddw-asd-asd-asd-asd",
          name: "Final Agent",
          task: "This is the final task, it should be a long task",
        },
      },
    },
    adjacency_list: {
      "1": ["3"],
      "2": ["3"],
      "3": ["4"],
      "4": ["5"],
    },
  },
};

export default function CreateWorkflowPage() {
  return (
    <div className="h-screen w-full">
      <WorkflowEditor workflow={dummyWorkflow} mode="edit" debugMode={true} />
    </div>
  );
}
