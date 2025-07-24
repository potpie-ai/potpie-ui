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
  Maximize2,
  Minimize2,
  ExternalLink,
} from "lucide-react";
import WorkflowService from "@/services/WorkflowService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null);
  const [fullscreenLogs, setFullscreenLogs] = useState<{
    execution: WorkflowExecution;
    isOpen: boolean;
  }>({ execution: {} as WorkflowExecution, isOpen: false });

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

        // Fetch executions using the new API
        const _executions = await WorkflowService.getWorkflowExecutions(
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
      const _executions = await WorkflowService.getWorkflowExecutions(
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

  const openFullscreenLogs = (execution: WorkflowExecution) => {
    setFullscreenLogs({ execution, isOpen: true });
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
            <Accordion
              type="single"
              collapsible
              className="space-y-4"
              value={openAccordionId || undefined}
              onValueChange={(value) => setOpenAccordionId(value)}
            >
              {executions.map((execution) => (
                <AccordionItem
                  key={execution.id || `execution-${Math.random()}`}
                  value={execution.id || ""}
                >
                  <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <AccordionTrigger className="px-6 py-6 hover:bg-gray-50 transition-colors [&[data-state=open]>svg]:rotate-180">
                      <div className="w-full">
                        {/* Top Row: Execution ID, Status, and Date */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(execution.status)}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-lg">
                                    Execution #
                                    {execution.id
                                      ? execution.id.slice(-8)
                                      : "Unknown"}
                                  </span>
                                  <Badge
                                    variant={getStatusBadgeVariant(
                                      execution.status
                                    )}
                                  >
                                    {execution.status || "unknown"}
                                  </Badge>
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  Started{" "}
                                  {execution.started_at
                                    ? dayjs(execution.started_at).fromNow()
                                    : "Unknown time"}
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
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">
                              {execution.started_at
                                ? dayjs(execution.started_at).format(
                                    "MMM D, YYYY"
                                  )
                                : "Unknown"}
                            </div>
                            <div className="text-sm text-gray-600">
                              {execution.started_at
                                ? dayjs(execution.started_at).format("h:mm A")
                                : "Unknown"}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Row: Quick Stats */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Nodes
                            </p>
                            <p className="text-sm font-semibold text-gray-700">
                              {execution.execution_logs?.length || 0}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Completed
                            </p>
                            <p className="text-sm font-semibold text-green-600">
                              {execution.execution_logs?.filter(
                                (log) => log.status === "completed"
                              ).length || 0}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Failed
                            </p>
                            <p className="text-sm font-semibold text-red-600">
                              {execution.execution_logs?.filter(
                                (log) => log.status === "failed"
                              ).length || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent>
                      <div className="px-6 pb-6 border-t border-gray-100 bg-gray-50">
                        <div className="pt-4 space-y-6">
                          {/* Error Message */}
                          {execution.error_message && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
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

                          {/* Node Execution Logs */}
                          {execution.execution_logs &&
                            execution.execution_logs.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-sm font-semibold text-gray-700">
                                    Node Execution Logs
                                  </h4>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          openFullscreenLogs(execution)
                                        }
                                        className="gap-2"
                                      >
                                        <Maximize2 className="h-4 w-4" />
                                        Fullscreen
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>View logs in fullscreen mode</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="bg-white rounded-lg border p-4 space-y-3">
                                  {execution.execution_logs.map((log) => (
                                    <div
                                      key={log.id || `log-${Math.random()}`}
                                      className="border rounded-lg p-4 bg-gray-50"
                                    >
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                          {getStatusIcon(log.status)}
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-mono text-sm font-medium">
                                                {log.node_id || "Unknown Node"}
                                              </span>
                                              <Badge
                                                variant="outline"
                                                className="text-xs"
                                              >
                                                {log.node_type || "unknown"}
                                              </Badge>
                                              <Badge
                                                variant={getStatusBadgeVariant(
                                                  log.status
                                                )}
                                                className="text-xs"
                                              >
                                                {log.status || "unknown"}
                                              </Badge>
                                              {log.iteration !== undefined && (
                                                <Badge
                                                  variant="secondary"
                                                  className="text-xs"
                                                >
                                                  Iteration {log.iteration}
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="text-xs text-gray-600 mt-1">
                                              {log.started_at
                                                ? dayjs(log.started_at).format(
                                                    "MMM D, h:mm A"
                                                  )
                                                : "Unknown time"}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-sm font-medium text-gray-700">
                                            {log.completed_at && log.started_at
                                              ? formatDuration(
                                                  log.started_at,
                                                  log.completed_at
                                                )
                                              : "Running..."}
                                          </div>
                                          {log.completed_at && (
                                            <div className="text-xs text-gray-600">
                                              Completed:{" "}
                                              {dayjs(log.completed_at).format(
                                                "h:mm A"
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Detailed Logs */}
                                      {log.logs && log.logs.length > 0 && (
                                        <div className="mb-3">
                                          <h6 className="text-xs font-medium text-gray-700 mb-2">
                                            Execution Logs
                                          </h6>
                                          <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {log.logs.map((logEntry, index) => (
                                              <div
                                                key={index}
                                                className={`p-2 rounded text-xs ${
                                                  logEntry.status === "failed"
                                                    ? "bg-red-50 border border-red-200"
                                                    : logEntry.status ===
                                                        "completed"
                                                      ? "bg-green-50 border border-green-200"
                                                      : "bg-blue-50 border border-blue-200"
                                                }`}
                                              >
                                                <div className="flex items-center justify-between mb-1">
                                                  <span className="font-medium text-gray-700">
                                                    {logEntry.status
                                                      .charAt(0)
                                                      .toUpperCase() +
                                                      logEntry.status.slice(1)}
                                                  </span>
                                                  <span className="text-gray-500">
                                                    {dayjs(
                                                      logEntry.timestamp
                                                    ).format("h:mm:ss")}
                                                  </span>
                                                </div>
                                                <div className="text-gray-600 whitespace-pre-wrap">
                                                  {logEntry.details}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {log.error_message && (
                                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
                                          <p className="text-sm font-medium text-red-800 mb-1">
                                            Error
                                          </p>
                                          <p className="text-sm text-red-700">
                                            {log.error_message}
                                          </p>
                                        </div>
                                      )}

                                      {(log.input_data || log.output_data) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {log.input_data && (
                                            <div>
                                              <h5 className="text-sm font-medium text-gray-700 mb-2">
                                                Input Data
                                              </h5>
                                              <div className="bg-white border rounded p-2 max-h-32 overflow-y-auto">
                                                <pre className="text-xs text-gray-700 overflow-x-auto">
                                                  {JSON.stringify(
                                                    log.input_data,
                                                    null,
                                                    2
                                                  )}
                                                </pre>
                                              </div>
                                            </div>
                                          )}
                                          {log.output_data && (
                                            <div>
                                              <h5 className="text-sm font-medium text-gray-700 mb-2">
                                                Output Data
                                              </h5>
                                              <div className="bg-white border rounded p-2 max-h-32 overflow-y-auto">
                                                <pre className="text-xs text-gray-700 overflow-x-auto">
                                                  {JSON.stringify(
                                                    log.output_data,
                                                    null,
                                                    2
                                                  )}
                                                </pre>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          {/* Trigger Data */}
                          {execution.trigger_data && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                Trigger Data
                              </h4>
                              <div className="bg-white rounded-lg border p-4 max-h-64 overflow-y-auto">
                                <pre className="text-sm text-gray-700 overflow-x-auto">
                                  {JSON.stringify(
                                    execution.trigger_data,
                                    null,
                                    2
                                  )}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen Logs Dialog */}
      <Dialog
        open={fullscreenLogs.isOpen}
        onOpenChange={(open) =>
          setFullscreenLogs((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                Execution Logs - #
                {fullscreenLogs.execution.id
                  ? fullscreenLogs.execution.id.slice(-8)
                  : "Unknown"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFullscreenLogs((prev) => ({ ...prev, isOpen: false }))
                }
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] space-y-4">
            {fullscreenLogs.execution.execution_logs?.map((log) => (
              <div
                key={log.id || `log-${Math.random()}`}
                className="border rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {log.node_id || "Unknown Node"}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-600">
                          {log.node_type || "unknown"} •{" "}
                          {log.status || "unknown"}
                        </span>
                        {log.iteration !== undefined && (
                          <Badge variant="secondary" className="text-xs">
                            Iteration {log.iteration}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-700">
                      {log.completed_at && log.started_at
                        ? formatDuration(log.started_at, log.completed_at)
                        : "Running..."}
                    </div>
                    <div className="text-xs text-gray-600">
                      {log.started_at
                        ? dayjs(log.started_at).format("MMM D, h:mm A")
                        : "Unknown time"}
                    </div>
                  </div>
                </div>

                {/* Detailed Logs */}
                {log.logs && log.logs.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">
                      Execution Logs
                    </h5>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {log.logs.map((logEntry, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg ${
                            logEntry.status === "failed"
                              ? "bg-red-50 border border-red-200"
                              : logEntry.status === "completed"
                                ? "bg-green-50 border border-green-200"
                                : "bg-blue-50 border border-blue-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-700">
                              {logEntry.status.charAt(0).toUpperCase() +
                                logEntry.status.slice(1)}
                            </span>
                            <span className="text-sm text-gray-500">
                              {dayjs(logEntry.timestamp).format(
                                "MMM D, h:mm:ss"
                              )}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 whitespace-pre-wrap bg-white p-2 rounded border">
                            {logEntry.details}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {log.error_message && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm font-medium text-red-800 mb-1">
                      Error
                    </p>
                    <p className="text-sm text-red-700">{log.error_message}</p>
                  </div>
                )}

                {(log.input_data || log.output_data) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {log.input_data && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">
                          Input Data
                        </h5>
                        <pre className="text-xs bg-white border rounded p-2 overflow-x-auto max-h-48 overflow-y-auto">
                          {JSON.stringify(log.input_data, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.output_data && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">
                          Output Data
                        </h5>
                        <pre className="text-xs bg-white border rounded p-2 overflow-x-auto max-h-48 overflow-y-auto">
                          {JSON.stringify(log.output_data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
