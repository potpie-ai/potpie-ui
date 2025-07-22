"use client";

import { Workflow, WorkflowExecution } from "@/services/WorkflowService";
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
  RefreshCw,
} from "lucide-react";
import WorkflowService from "@/services/WorkflowService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export default function WorkflowExecutionsPage() {
  const params: { workflowId: string } = useParams();
  const router = useRouter();

  const [workflow, setWorkflow] = useState<Workflow | undefined>();
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
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

        // Fetch executions
        const _executions = await WorkflowService.getWorkflowLogs(
          params.workflowId
        );
        setExecutions(_executions);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Error loading workflow executions. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (params.workflowId) {
      fetchData();
    }
  }, [params.workflowId, router]);

  const refreshExecutions = async () => {
    setRefreshing(true);
    try {
      const _executions = await WorkflowService.getWorkflowLogs(
        params.workflowId
      );
      setExecutions(_executions);
      toast.success("Executions refreshed successfully");
    } catch (error) {
      console.error("Error refreshing executions:", error);
      toast.error("Error refreshing executions. Please try again.");
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

  const formatDuration = (startedAt: string, completedAt?: string) => {
    const start = dayjs(startedAt);
    const end = completedAt ? dayjs(completedAt) : dayjs();
    const duration = end.diff(start, "second");

    if (duration < 60) {
      return `${duration}s`;
    } else if (duration < 3600) {
      return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    } else {
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      return `${hours}h ${minutes}m`;
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
    <div className="w-full p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{workflow.title}</h1>
          <p className="text-gray-600">Execution History</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshExecutions}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/workflows/${params.workflowId}`)}
          >
            View Workflow
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Executions
                </p>
                <p className="text-2xl font-bold">{executions.length}</p>
              </div>
              <Play className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {executions.filter((e) => e.status === "completed").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">
                  {executions.filter((e) => e.status === "failed").length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Running</p>
                <p className="text-2xl font-bold text-blue-600">
                  {executions.filter((e) => e.status === "running").length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Executions List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          {executions.length === 0 ? (
            <div className="text-center py-8">
              <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No executions yet
              </h3>
              <p className="text-gray-600">
                {`This workflow hasn't been executed yet. Executions will appear
                here once the workflow is triggered.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {executions.map((execution) => (
                <div
                  key={execution.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(execution.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            Execution #{execution.id.slice(-8)}
                          </span>
                          <Badge
                            variant={getStatusBadgeVariant(execution.status)}
                          >
                            {execution.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Started {dayjs(execution.started_at).fromNow()}
                          {execution.completed_at && (
                            <span>
                              {" "}
                              • Duration:{" "}
                              {formatDuration(
                                execution.started_at,
                                execution.completed_at
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        {dayjs(execution.started_at).format("MMM D, YYYY")}
                      </div>
                      <div className="text-sm text-gray-600">
                        {dayjs(execution.started_at).format("h:mm A")}
                      </div>
                    </div>
                  </div>

                  {execution.error_message && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-red-800">
                            Error
                          </p>
                          <p className="text-sm text-red-700 mt-1">
                            {execution.error_message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {execution.execution_logs &&
                    execution.execution_logs.length > 0 && (
                      <div className="mt-3">
                        <Separator className="my-3" />
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">
                            Node Execution Logs
                          </p>
                          {execution.execution_logs.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <div className="flex items-center gap-2">
                                {getStatusIcon(log.status)}
                                <span className="font-mono text-xs">
                                  {log.node_id}
                                </span>
                                <span className="text-gray-600">
                                  ({log.node_type})
                                </span>
                              </div>
                              <div className="text-gray-600">
                                {log.completed_at
                                  ? formatDuration(
                                      log.started_at,
                                      log.completed_at
                                    )
                                  : "Running..."}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
