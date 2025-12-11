"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import WorkflowService, { HITLRequest, HITLResponseRequest } from "@/services/WorkflowService";
import { Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Trash2, Calendar, User, Users, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { formatLocalTime, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
dayjs.extend(relativeTime);

export default function PendingRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<HITLRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<HITLRequest | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [responseData, setResponseData] = useState<Record<string, any>>({});
  const [comment, setComment] = useState("");

  useEffect(() => {
    loadRequests();
    // Refresh every 30 seconds
    const interval = setInterval(loadRequests, 30000);
    return () => clearInterval(interval);
  }, [page, pageSize]);

  const loadRequests = async () => {
    try {
      setRefreshing(true);
      const data = await WorkflowService.listHITLRequests(undefined, page, pageSize);
      setRequests(data.requests || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 0);
      setHasNext(data.has_next || false);
      setHasPrevious(data.has_previous || false);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load requests");
      console.error("Error loading HITL requests:", err);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = async (requestId: string) => {
    try {
      console.log("🗑️ Deleting request:", requestId);
      const result = await WorkflowService.deleteHITLRequest(requestId);
      console.log("🗑️ Delete result:", result);
      
      if (result.success) {
        toast.success(result.message || "Request deleted successfully");
        // Close dialog first
        setDeleteDialogOpen(false);
        setRequestToDelete(null);
        // Refresh from server to ensure consistency
        await loadRequests();
      } else {
        toast.error(result.error || "Failed to delete request");
        setDeleteDialogOpen(false);
        setRequestToDelete(null);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || "Failed to delete request";
      toast.error(errorMessage);
      console.error("Error deleting HITL request:", err);
      console.error("Error response:", err.response?.data);
      // Close dialog even on error
      setDeleteDialogOpen(false);
      setRequestToDelete(null);
    }
  };

  const getStatusBadge = (request: HITLRequest) => {
    if (request.status === "pending") {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
          <Clock className="w-3 h-3 mr-1.5" />
          Pending
        </Badge>
      );
    } else if (request.status === "responded") {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
          <CheckCircle className="w-3 h-3 mr-1.5" />
          Responded
        </Badge>
      );
    } else if (request.status === "expired") {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
          <XCircle className="w-3 h-3 mr-1.5" />
          Expired
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        {request.status}
      </Badge>
    );
  };

  const getTimeRemaining = (request: HITLRequest) => {
    if (request.time_remaining_seconds !== undefined && request.time_remaining_seconds > 0) {
      const hours = Math.floor(request.time_remaining_seconds / 3600);
      const minutes = Math.floor((request.time_remaining_seconds % 3600) / 60);
      if (hours > 0) {
        return `${hours}h ${minutes}m remaining`;
      }
      return `${minutes}m remaining`;
    }
    return "Expired";
  };

  const openRequestDrawer = async (request: HITLRequest) => {
    setSelectedRequest(request);
    setDrawerOpen(true);
    setDrawerLoading(true);
    setResponseData({});
    setComment("");
    
    try {
      // Load full request details
      const data = await WorkflowService.getHITLRequest(
        request.execution_id,
        request.node_id,
        request.iteration
      );
      setSelectedRequest(data);
      
      // Initialize response data based on node type
      if (data.node_type === "approval") {
        setResponseData({ approved: false });
      } else if (data.node_type === "input" && data.fields) {
        const initialData: Record<string, any> = {};
        data.fields.forEach((field) => {
          if (field.type === "multi_select") {
            initialData[field.name] = [];
          } else {
            initialData[field.name] = "";
          }
        });
        setResponseData(initialData);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load request details");
      console.error("Error loading HITL request:", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleSubmit = async (approved?: boolean, requestChanges?: boolean) => {
    if (!selectedRequest) return;

    try {
      setSubmitting(true);

      // Prepare response data
      let finalResponseData: Record<string, any> = { ...responseData };
      
      if (selectedRequest.node_type === "approval") {
        finalResponseData = { approved: approved ?? responseData.approved };
      } else if (selectedRequest.node_type === "input") {
        // Check if this is review mode (loop back configured)
        if (selectedRequest.loop_back_node_id) {
          // Review mode: handle approve vs request changes
          const loopBackCondition = selectedRequest.loop_back_condition || "needs_changes";
          
          if (requestChanges === true) {
            // User clicked "Request Changes" - set needs_changes to true
            finalResponseData[loopBackCondition] = true;
            // Include changes/feedback if provided
            if (responseData.changes) {
              finalResponseData.changes = responseData.changes;
            }
          } else if (requestChanges === false) {
            // User clicked "Approve and Continue" - don't set needs_changes (or set to false)
            finalResponseData[loopBackCondition] = false;
            // Include changes/feedback if provided
            if (responseData.changes) {
              finalResponseData.changes = responseData.changes;
            }
          } else {
            // Fallback: if no explicit action, don't set needs_changes
            if (responseData.changes) {
              finalResponseData.changes = responseData.changes;
            }
          }
        } else {
          // Standard input mode
          if (selectedRequest.fields && selectedRequest.fields.length > 0) {
            // Validate required fields
            for (const field of selectedRequest.fields) {
              if (field.required && !responseData[field.name]) {
                toast.error(`Field "${field.name}" is required`);
                setSubmitting(false);
                return;
              }
            }
            // Only include fields that are defined in the node configuration
            const filteredData: Record<string, any> = {};
            selectedRequest.fields.forEach((field) => {
              const value = responseData[field.name];
              if (value !== undefined && value !== "" && value !== null) {
                filteredData[field.name] = value;
              } else if (field.type === "multi_select") {
                filteredData[field.name] = value || [];
              } else if (field.required) {
                filteredData[field.name] = value || "";
              }
            });
            finalResponseData = filteredData;
            
            const hasAnyValue = Object.values(finalResponseData).some(
              (value) => value !== "" && value !== null && value !== undefined && 
              (Array.isArray(value) ? value.length > 0 : true)
            );
            if (!hasAnyValue) {
              toast.error("Please fill in at least one field");
              setSubmitting(false);
              return;
            }
          } else {
            finalResponseData = {};
          }
        }
      }

      if (selectedRequest.node_type === "approval" && Object.keys(finalResponseData).length === 0) {
        toast.error("Response data cannot be empty");
        setSubmitting(false);
        return;
      }

      const response: HITLResponseRequest = {
        response_data: finalResponseData,
        ...(comment ? { comment } : {}),
      };

      const result = await WorkflowService.submitHITLResponse(
        selectedRequest.execution_id,
        selectedRequest.node_id,
        selectedRequest.iteration,
        response
      );

      if (result.success) {
        toast.success(result.message || "Response submitted successfully");
        setDrawerOpen(false);
        setSelectedRequest(null);
        await loadRequests(); // Refresh the list
      } else {
        toast.error(result.error || "Failed to submit response");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit response");
      console.error("Error submitting HITL response:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setResponseData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  if (loading && requests.length === 0) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Pending Requests</h1>
          <p className="text-muted-foreground mt-2">
            Review and respond to workflow approval and input requests
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pending Requests</h1>
          <p className="text-muted-foreground mt-2">
            Review and respond to workflow approval and input requests
          </p>
        </div>
        <Button 
          onClick={loadRequests} 
          variant="outline"
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center text-destructive">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {requests.length === 0 && !loading ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
            <p className="text-muted-foreground">
              All caught up! There are no pending approval or input requests at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {requests.map((request) => (
            <Card key={request.request_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Type Icon */}
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      request.node_type === "approval" 
                        ? "bg-green-100 dark:bg-green-900/30" 
                        : "bg-purple-100 dark:bg-purple-900/30"
                    }`}>
                      {request.node_type === "approval" ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      )}
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-base capitalize">
                            {request.node_type === "approval" ? "Approval" : "Input"}
                          </h3>
                          {getStatusBadge(request)}
                        </div>
                        {request.workflow_title && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {request.workflow_title}
                          </p>
                        )}
                        <p className="text-sm text-foreground leading-relaxed">
                          {request.message}
                        </p>
                      </div>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">Created:</span>
                        <span>{formatLocalTime(request.created_at)}</span>
                        <span className="text-xs">({formatRelativeTime(request.created_at)})</span>
                      </div>
                      {request.time_remaining_seconds !== undefined && request.time_remaining_seconds > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">Time remaining:</span>
                          <span className="text-green-600 dark:text-green-400 font-semibold">
                            {getTimeRemaining(request)}
                          </span>
                        </div>
                      )}
                      {(request.node_type === "approval" && request.approvers) || 
                       (request.node_type === "input" && request.assignee) ? (
                        <div className="flex items-center gap-1.5">
                          {request.node_type === "approval" ? (
                            <Users className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                          <span className="font-medium">
                            {request.node_type === "approval" ? "Approvers:" : "Assignee:"}
                          </span>
                          <span className="truncate max-w-[200px]">
                            {request.node_type === "approval" 
                              ? request.approvers?.join(", ") || "—"
                              : request.assignee || "—"}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {request.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setRequestToDelete(request.request_id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant={request.status === "pending" ? "default" : "outline"}
                      className="h-9"
                      onClick={() => openRequestDrawer(request)}
                    >
                      {request.status === "pending" ? "Respond" : "View"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 0 && (
            <Card className="mt-6">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  {/* Page Info */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} requests
                    </span>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="page-size" className="text-sm">Items per page:</Label>
                      <select
                        id="page-size"
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setPage(1); // Reset to first page when changing page size
                        }}
                        className="px-2 py-1 border border-input rounded-md bg-background text-sm"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  {/* Pagination Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!hasPrevious || loading}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            disabled={loading}
                            className="min-w-[40px]"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={!hasNext || loading}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setRequestToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => requestToDelete && handleDelete(requestToDelete)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {drawerLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse space-y-4 w-full">
                <div className="h-6 bg-muted rounded w-1/3"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-20 bg-muted rounded"></div>
              </div>
            </div>
          ) : selectedRequest ? (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-2xl mb-2">
                      {selectedRequest.node_type === "approval" ? "Approval Request" : "Input Request"}
                    </SheetTitle>
                    {selectedRequest.workflow_title && (
                      <SheetDescription>
                        Workflow: {selectedRequest.workflow_title}
                      </SheetDescription>
                    )}
                  </div>
                  <Badge variant={selectedRequest.status === "expired" ? "destructive" : "default"}>
                    {selectedRequest.status}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Request Message */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Message</Label>
                  <p className="text-sm text-foreground bg-muted p-4 rounded-md">{selectedRequest.message}</p>
                </div>

                {/* Time Information */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>Created {formatRelativeTime(selectedRequest.created_at)}</span>
                  </div>
                  {selectedRequest.time_remaining_seconds !== undefined && selectedRequest.time_remaining_seconds > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>
                        {Math.floor(selectedRequest.time_remaining_seconds / 3600)}h{" "}
                        {Math.floor((selectedRequest.time_remaining_seconds % 3600) / 60)}m remaining
                      </span>
                    </div>
                  )}
                </div>

                {/* Previous Node Result */}
                {selectedRequest.previous_node_result && (
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Previous Step Result</Label>
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md text-sm text-foreground">
                      {selectedRequest.previous_node_result}
                    </div>
                  </div>
                )}

                {/* Approval Node Response */}
                {selectedRequest.node_type === "approval" && selectedRequest.status === "pending" && 
                 selectedRequest.time_remaining_seconds !== undefined && selectedRequest.time_remaining_seconds > 0 && (
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold">Your Decision</Label>
                    <div className="flex gap-4">
                      <Button
                        onClick={() => handleSubmit(true)}
                        disabled={submitting}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleSubmit(false)}
                        disabled={submitting}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {/* Input Node Response */}
                {selectedRequest.node_type === "input" && selectedRequest.status === "pending" && 
                 selectedRequest.time_remaining_seconds !== undefined && selectedRequest.time_remaining_seconds > 0 && (
                  <div className="space-y-4">
                    {/* Review Mode: Show when loop_back_node_id is configured */}
                    {selectedRequest.loop_back_node_id ? (
                      <>
                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-md">
                          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">
                            Review Mode: You can approve the current result or request changes to loop back to the previous step.
                          </p>
                        </div>
                        
                        {/* Show Input Fields if configured */}
                        {selectedRequest.fields && selectedRequest.fields.length > 0 && (
                          <div className="space-y-4">
                            <Label className="text-sm font-semibold">Provide Input</Label>
                            {selectedRequest.fields.map((field) => (
                              <div key={field.name}>
                                <Label htmlFor={field.name} className="mb-2 block">
                                  {field.name}
                                  {field.required && <span className="text-red-500 ml-1">*</span>}
                                </Label>
                                {field.type === "text" && (
                                  <Textarea
                                    id={field.name}
                                    value={responseData[field.name] || ""}
                                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                    disabled={submitting}
                                    required={field.required}
                                  />
                                )}
                                {field.type === "number" && (
                                  <Input
                                    id={field.name}
                                    type="number"
                                    value={responseData[field.name] || ""}
                                    onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value) || 0)}
                                    disabled={submitting}
                                    required={field.required}
                                  />
                                )}
                                {field.type === "select" && (
                                  <select
                                    id={field.name}
                                    value={responseData[field.name] || ""}
                                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                    disabled={submitting}
                                    required={field.required}
                                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                                  >
                                    <option value="">Select an option</option>
                                    {field.options?.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                {field.type === "multi_select" && (
                                  <div className="space-y-2">
                                    {field.options?.map((option) => (
                                      <label key={option} className="flex items-center">
                                        <input
                                          type="checkbox"
                                          checked={(responseData[field.name] || []).includes(option)}
                                          onChange={(e) => {
                                            const current = responseData[field.name] || [];
                                            const updated = e.target.checked
                                              ? [...current, option]
                                              : current.filter((v: string) => v !== option);
                                            handleFieldChange(field.name, updated);
                                          }}
                                          disabled={submitting}
                                          className="mr-2"
                                        />
                                        {option}
                                      </label>
                                    ))}
                                  </div>
                                )}
                                {field.type === "file" && (
                                  <Input
                                    id={field.name}
                                    type="file"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleFieldChange(field.name, file.name);
                                      }
                                    }}
                                    disabled={submitting}
                                    required={field.required}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Changes/Feedback Input */}
                        <div>
                          <Label htmlFor="changes" className="mb-2 block">
                            Changes or Feedback (Optional)
                          </Label>
                          <Textarea
                            id="changes"
                            value={responseData.changes || ""}
                            onChange={(e) => handleFieldChange("changes", e.target.value)}
                            disabled={submitting}
                            placeholder="Describe any changes or feedback you'd like..."
                            rows={4}
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                          <Button
                            onClick={() => handleSubmit(undefined, false)} // false = don't set needs_changes
                            disabled={submitting}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve and Continue
                          </Button>
                          <Button
                            onClick={() => handleSubmit(undefined, true)} // true = set needs_changes
                            disabled={submitting}
                            variant="destructive"
                            className="flex-1"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Request Changes
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Standard Input Mode */}
                        <Label className="text-sm font-semibold">Provide Input</Label>
                        {selectedRequest.fields && selectedRequest.fields.length > 0 ? (
                          selectedRequest.fields.map((field) => (
                            <div key={field.name}>
                              <Label htmlFor={field.name} className="mb-2 block">
                                {field.name}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </Label>
                              {field.type === "text" && (
                                <Textarea
                                  id={field.name}
                                  value={responseData[field.name] || ""}
                                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                  disabled={submitting}
                                  required={field.required}
                                />
                              )}
                              {field.type === "number" && (
                                <Input
                                  id={field.name}
                                  type="number"
                                  value={responseData[field.name] || ""}
                                  onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value) || 0)}
                                  disabled={submitting}
                                  required={field.required}
                                />
                              )}
                              {field.type === "select" && (
                                <select
                                  id={field.name}
                                  value={responseData[field.name] || ""}
                                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                  disabled={submitting}
                                  required={field.required}
                                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                                >
                                  <option value="">Select an option</option>
                                  {field.options?.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              )}
                              {field.type === "multi_select" && (
                                <div className="space-y-2">
                                  {field.options?.map((option) => (
                                    <label key={option} className="flex items-center">
                                      <input
                                        type="checkbox"
                                        checked={(responseData[field.name] || []).includes(option)}
                                        onChange={(e) => {
                                          const current = responseData[field.name] || [];
                                          const updated = e.target.checked
                                            ? [...current, option]
                                            : current.filter((v: string) => v !== option);
                                          handleFieldChange(field.name, updated);
                                        }}
                                        disabled={submitting}
                                        className="mr-2"
                                      />
                                      {option}
                                    </label>
                                  ))}
                                </div>
                              )}
                              {field.type === "file" && (
                                <Input
                                  id={field.name}
                                  type="file"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleFieldChange(field.name, file.name);
                                    }
                                  }}
                                  disabled={submitting}
                                  required={field.required}
                                />
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4 rounded-md">
                            <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                              ⚠️ No input fields are configured for this Input node. You can still submit a response with a comment.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Comment Field */}
                {(selectedRequest.node_type === "approval" || selectedRequest.node_type === "input") &&
                  selectedRequest.status === "pending" &&
                  selectedRequest.time_remaining_seconds !== undefined && selectedRequest.time_remaining_seconds > 0 && (
                    <div>
                      <Label htmlFor="comment">Comment (Optional)</Label>
                      <Textarea
                        id="comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        disabled={submitting}
                        placeholder="Add any additional notes..."
                        rows={3}
                        className="mt-2"
                      />
                    </div>
                  )}

                {/* Submit Button for Input Nodes (only show if not in review mode) */}
                {selectedRequest.node_type === "input" && selectedRequest.status === "pending" && 
                 selectedRequest.time_remaining_seconds !== undefined && selectedRequest.time_remaining_seconds > 0 &&
                 !selectedRequest.loop_back_node_id && (
                  <Button
                    onClick={() => handleSubmit()}
                    disabled={submitting}
                    className="w-full"
                  >
                    {submitting ? "Submitting..." : "Submit Response"}
                  </Button>
                )}

                {/* Expired Message */}
                {(selectedRequest.status === "expired" || 
                  (selectedRequest.time_remaining_seconds !== undefined && selectedRequest.time_remaining_seconds <= 0)) && (
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4 rounded-md">
                    <div className="flex items-center text-yellow-700 dark:text-yellow-300">
                      <AlertCircle className="w-5 h-5 mr-2" />
                      <span>This request has expired and can no longer be responded to.</span>
                    </div>
                  </div>
                )}

                {/* Already Responded */}
                {selectedRequest.status === "responded" && (
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-md">
                    <div className="flex items-center text-green-700 dark:text-green-300">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span>This request has already been responded to.</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
