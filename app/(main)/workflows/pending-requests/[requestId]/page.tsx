"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import WorkflowService, { HITLRequest, HITLResponseRequest } from "@/services/WorkflowService";
import { Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";

export default function HITLRequestDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const requestId = params.requestId as string;
  const executionId = searchParams.get("executionId") || "";
  const nodeId = searchParams.get("nodeId") || "";
  const iteration = parseInt(searchParams.get("iteration") || "0");

  const [request, setRequest] = useState<HITLRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<Record<string, any>>({});
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (executionId && nodeId) {
      loadRequest();
    }
  }, [executionId, nodeId, iteration]);

  const loadRequest = async () => {
    try {
      setLoading(true);
      const data = await WorkflowService.getHITLRequest(executionId, nodeId, iteration);
      setRequest(data);
      setError(null);
      
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
      setError(err.message || "Failed to load request");
      console.error("Error loading HITL request:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (approved?: boolean, requestChanges?: boolean) => {
    if (!request) return;

    try {
      setSubmitting(true);

      // Prepare response data
      let finalResponseData: Record<string, any> = { ...responseData };
      
      if (request.node_type === "approval") {
        finalResponseData = { approved: approved ?? responseData.approved };
      } else if (request.node_type === "input") {
        // Check if this is review mode (loop back configured)
        if (request.loop_back_node_id) {
          // Review mode: handle approve vs request changes
          const loopBackCondition = request.loop_back_condition || "needs_changes";
          
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
          // For input nodes, filter out empty string values but keep other values
          // If fields are defined, only include those fields
          if (request.fields && request.fields.length > 0) {
          // Validate required fields
          for (const field of request.fields) {
            if (field.required && !responseData[field.name]) {
              toast.error(`Field "${field.name}" is required`);
              setSubmitting(false);
              return;
            }
          }
          // Only include fields that are defined in the node configuration
          const filteredData: Record<string, any> = {};
          request.fields.forEach((field) => {
            const value = responseData[field.name];
            if (value !== undefined && value !== "" && value !== null) {
              filteredData[field.name] = value;
            } else if (field.type === "multi_select") {
              // Multi-select can be empty array
              filteredData[field.name] = value || [];
            } else if (field.required) {
              // Required fields must have a value (already validated above)
              filteredData[field.name] = value || "";
            }
            // Skip optional empty fields
          });
          finalResponseData = filteredData;
          
          // Ensure at least one field has a value (or all required fields are present)
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
          // No fields defined - allow empty response_data object
          // This handles the case where Input node has no fields configured
          finalResponseData = {};
        }
        }
      }

      // For approval nodes, response_data should never be empty
      if (request.node_type === "approval" && Object.keys(finalResponseData).length === 0) {
        toast.error("Response data cannot be empty");
        setSubmitting(false);
        return;
      }

      const response: HITLResponseRequest = {
        response_data: finalResponseData,
        ...(comment ? { comment } : {}),
      };

      console.log("Submitting HITL response:", JSON.stringify(response, null, 2));

      const result = await WorkflowService.submitHITLResponse(
        executionId,
        nodeId,
        iteration,
        response
      );

      if (result.success) {
        toast.success(result.message || "Response submitted successfully");
<<<<<<< HEAD
        // Invalidate sidebar count query to update immediately
        if (user?.uid) {
          queryClient.invalidateQueries({ queryKey: ["pendingHITLRequests", user.uid] });
        }
        router.push("/workflows/pending-requests");
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-20 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-700">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>{error || "Request not found"}</span>
            </div>
            <Link href="/workflows/pending-requests">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Requests
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = request.status === "expired" || 
    (request.time_remaining_seconds !== undefined && request.time_remaining_seconds <= 0);

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Link href="/workflows/pending-requests">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requests
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">
                {request.node_type === "approval" ? "Approval Request" : "Input Request"}
              </CardTitle>
              {request.workflow_title && (
                <CardDescription>
                  Workflow: {request.workflow_title}
                </CardDescription>
              )}
            </div>
            <Badge variant={isExpired ? "destructive" : "default"}>
              {isExpired ? "Expired" : request.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Request Message */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Message</Label>
            <p className="text-gray-700 bg-gray-50 p-4 rounded-md">{request.message}</p>
          </div>

          {/* Time Information */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>
              Created {formatRelativeTime(request.created_at)}
            </span>
            {request.time_remaining_seconds !== undefined && request.time_remaining_seconds > 0 && (
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {Math.floor(request.time_remaining_seconds / 3600)}h{" "}
                {Math.floor((request.time_remaining_seconds % 3600) / 60)}m remaining
              </span>
            )}
          </div>

          {/* Previous Node Result */}
          {request.previous_node_result && (
            <div>
              <Label className="text-sm font-semibold mb-2 block">Previous Step Result</Label>
              <div className="bg-blue-50 p-4 rounded-md text-sm text-gray-700">
                {request.previous_node_result}
              </div>
            </div>
          )}

          {/* Approval Node Response */}
          {request.node_type === "approval" && request.status === "pending" && !isExpired && (
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
          {request.node_type === "input" && request.status === "pending" && !isExpired && (
            <div className="space-y-4">
              {/* Review Mode: Show when loop_back_node_id is configured */}
              {request.loop_back_node_id ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                    <p className="text-sm text-blue-700 font-medium mb-2">
                      Review Mode: You can approve the current result or request changes to loop back to the previous step.
                    </p>
                  </div>
                  
                  {/* Show Input Fields if configured */}
                  {request.fields && request.fields.length > 0 && (
                    <div className="space-y-4">
                      <Label className="text-sm font-semibold">Provide Input</Label>
                      {request.fields.map((field) => (
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  {request.fields && request.fields.length > 0 ? (
                    request.fields.map((field) => (
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                      <p className="text-yellow-700 text-sm">
                        ⚠️ No input fields are configured for this Input node. You can still submit a response with a comment.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Comment Field */}
          {(request.node_type === "approval" || request.node_type === "input") &&
            request.status === "pending" &&
            !isExpired && (
              <div>
                <Label htmlFor="comment">Comment (Optional)</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={submitting}
                  placeholder="Add any additional notes..."
                  rows={3}
                />
              </div>
            )}

          {/* Submit Button for Input Nodes (only show if not in review mode) */}
          {request.node_type === "input" && request.status === "pending" && !isExpired && !request.loop_back_node_id && (
            <Button
              onClick={() => handleSubmit()}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Submitting..." : "Submit Response"}
            </Button>
          )}

          {/* Expired Message */}
          {isExpired && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
              <div className="flex items-center text-yellow-700">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span>This request has expired and can no longer be responded to.</span>
              </div>
            </div>
          )}

          {/* Already Responded */}
          {request.status === "responded" && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-md">
              <div className="flex items-center text-green-700">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span>This request has already been responded to.</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

