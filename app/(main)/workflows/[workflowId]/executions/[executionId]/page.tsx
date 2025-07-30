"use client";

import {
  Workflow,
  WorkflowExecution,
  ExecutionTree,
} from "@/services/WorkflowService";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  LucideLoader2,
  ArrowLeft,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import WorkflowService from "@/services/WorkflowService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatLocalTime,
  formatRelativeTime,
  parseApiError,
} from "@/lib/utils";
import { ExecutionTreeVisualizer } from "@/app/(main)/workflows/components/execution-tree/ExecutionTreeVisualizer";

export default function ExecutionDetailPage() {
  const params: { workflowId: string; executionId: string } = useParams();
  const router = useRouter();

  const [workflow, setWorkflow] = useState<Workflow | undefined>();
  const [execution, setExecution] = useState<WorkflowExecution | undefined>();
  const [executionTree, setExecutionTree] = useState<
    ExecutionTree | undefined
  >();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch workflow details
        const _workflow = await WorkflowService.getWorkflowById(
          params.workflowId
        );
        if (!_workflow) {
          router.push("/workflows");
          return;
        }
        setWorkflow(_workflow);

        // Fetch execution details
        const _execution = await WorkflowService.getExecutionLogs(
          params.executionId
        );
        setExecution(_execution);

        // Fetch execution tree
        try {
          const _tree = await WorkflowService.getExecutionTree(
            params.workflowId,
            params.executionId
          );
          setExecutionTree(_tree);
        } catch (error) {
          console.error("Error fetching execution tree:", error);
          // Tree fetch is optional, so we don't show an error toast
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        const errorMessage = parseApiError(error);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    if (params.workflowId && params.executionId) {
      fetchData();
    }
  }, [params.workflowId, params.executionId, router]);

  // Function to refresh execution tree data
  const refreshExecutionTree = async () => {
    if (!params.workflowId || !params.executionId) return;

    try {
      setRefreshing(true);
      const _tree = await WorkflowService.getExecutionTree(
        params.workflowId,
        params.executionId
      );
      setExecutionTree(_tree);
    } catch (error) {
      console.error("Error refreshing execution tree:", error);
      const errorMessage = parseApiError(error);
      toast.error(errorMessage);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Play className="h-4 w-4 text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "cancelled":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "running":
        return "default";
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      case "cancelled":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex w-full h-svh items-center justify-center">
        <LucideLoader2 className="w-12 h-12 animate-spin" />
      </div>
    );
  }

  if (!workflow || !execution) {
    return (
      <div className="flex w-full h-svh items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Execution not found</h2>
          <p className="text-gray-600">
            The execution you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`/workflows/${params.workflowId}/executions`)
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Execution #{execution.id ? execution.id.slice(-8) : "Unknown"}
            </h1>
            <p className="text-gray-600">
              {workflow.title} •{" "}
              {execution.started_at
                ? formatRelativeTime(execution.started_at)
                : "Unknown time"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant(execution.status)}>
            {execution.status || "unknown"}
          </Badge>
        </div>
      </div>

      {/* Execution Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Execution Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Status</h4>
              <div className="flex items-center gap-2">
                {getStatusIcon(execution.status)}
                <span className="font-medium">
                  {execution.status || "unknown"}
                </span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">
                Started
              </h4>
              <p className="font-medium">
                {execution.started_at
                  ? formatLocalTime(execution.started_at)
                  : "Unknown"}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">
                Completed
              </h4>
              <p className="font-medium">
                {execution.completed_at
                  ? formatLocalTime(execution.completed_at)
                  : "Running..."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Execution Tree */}
      {executionTree ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Execution Tree</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[600px] w-full">
              <ExecutionTreeVisualizer
                executionTree={executionTree}
                executionId={execution.id}
                debugMode={false}
                embedded={true}
                onRefresh={refreshExecutionTree}
                isRunning={execution.status === "running"}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Execution Tree</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <Clock className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Execution Tree Available
              </h3>
              <p className="text-gray-600">
                Execution tree data is not available for this execution.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
