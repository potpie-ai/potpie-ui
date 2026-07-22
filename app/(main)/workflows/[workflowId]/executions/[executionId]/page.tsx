"use client";

import {
  Workflow,
  WorkflowExecution,
  ExecutionTree,
} from "@/services/WorkflowService";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";
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
import {
  getDemoExecutionById,
  getDemoExecutionTree,
  getDemoWorkflowById,
  isDemoWorkflowId,
} from "@/lib/mock/demoWorkflows";

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
      // Demo workflows are served from hardcoded data, no backend needed
      if (isDemoWorkflowId(params.workflowId)) {
        setWorkflow(getDemoWorkflowById(params.workflowId));
        setExecution(getDemoExecutionById(params.executionId));
        setExecutionTree(getDemoExecutionTree(params.executionId));
        setLoading(false);
        return;
      }

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

    if (isDemoWorkflowId(params.workflowId)) {
      setExecutionTree(getDemoExecutionTree(params.executionId));
      return;
    }

    try {
      setRefreshing(true);
      const _tree = await WorkflowService.getExecutionTree(
        params.workflowId,
        params.executionId
      );

      // Only update if we got valid data
      if (
        _tree &&
        _tree.execution_tree &&
        Object.keys(_tree.execution_tree).length > 0
      ) {
        setExecutionTree(_tree);
      } else {
        console.warn("Received empty execution tree data");
      }
    } catch (error) {
      console.error("Error refreshing execution tree:", error);
      const errorMessage = parseApiError(error);
      // Don't show error toast for polling failures to avoid spam
      if (!refreshing) {
        toast.error(errorMessage);
      }
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

  const eventLog = (execution.execution_logs ?? [])
    .flatMap(
      (nodeLog) =>
        nodeLog.logs?.map((event) => ({
          nodeId: nodeLog.node_id,
          status: event.status,
          timestamp: event.timestamp,
          details: event.details,
        })) ?? []
    )
    .sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

  const getEventDotColor = (status: string) => {
    switch (status) {
      case "success":
      case "completed":
        return "bg-green-500";
      case "error":
      case "failed":
        return "bg-red-500";
      case "warning":
        return "bg-yellow-500";
      case "running":
        return "bg-blue-500";
      default:
        return "bg-gray-400";
    }
  };

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
          {execution.trigger_data &&
            Object.keys(execution.trigger_data).length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-600 mb-2">
                  Trigger Event
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(execution.trigger_data).map(
                    ([key, value]) => (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                      >
                        <span className="font-medium">{key}:</span>
                        <span className="max-w-[320px] truncate">
                          {String(value)}
                        </span>
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          {execution.error_message && (
            <div className="mt-6 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{execution.error_message}</p>
            </div>
          )}
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
                isPending={
                  !["completed", "failed", "cancelled"].includes(
                    execution.status
                  )
                }
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

      {/* Event Log */}
      {eventLog.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Event Log</CardTitle>
              <span className="text-sm text-gray-500">
                {eventLog.length} events
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {eventLog.map((event, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-gray-50"
                >
                  <div
                    className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${getEventDotColor(
                      event.status
                    )}`}
                  />
                  <div className="w-20 flex-shrink-0 pt-0.5 font-mono text-xs text-gray-500">
                    {formatLocalTime(event.timestamp, "h:mm:ss A")}
                  </div>
                  <Badge
                    variant="outline"
                    className="flex-shrink-0 font-mono text-[10px]"
                  >
                    {event.nodeId}
                  </Badge>
                  <p className="min-w-0 flex-1 text-sm text-gray-700">
                    {event.details}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
