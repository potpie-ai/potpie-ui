"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import WorkflowService, { HITLResponseRequest } from "@/services/WorkflowService";
import { HITLMetadata } from "@/lib/utils/hitlMetadata";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { formatRelativeTime } from "@/lib/utils";

dayjs.extend(relativeTime);

interface HITLRequestChatProps {
  metadata: HITLMetadata;
  onResponseSubmitted?: (responseData: Record<string, any>, action?: string) => void;
}

export const HITLRequestChat: React.FC<HITLRequestChatProps> = ({
  metadata,
  onResponseSubmitted,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const [responseData, setResponseData] = useState<Record<string, any>>({});
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResponse, setSubmittedResponse] = useState<{
    data: Record<string, any>;
    action?: string;
  } | null>(null);

  const timeoutAt = dayjs(metadata.hitl_timeout_at);
  const isExpired = timeoutAt.isBefore(dayjs());
  const timeRemaining = timeoutAt.diff(dayjs(), "second");
  const timeRemainingFormatted = timeRemaining > 0 
    ? `${Math.floor(timeRemaining / 3600)}h ${Math.floor((timeRemaining % 3600) / 60)}m remaining`
    : "Expired";

  // Check if this is a review mode (has loop_back_node_id)
  const isReviewMode = !!(metadata as any).hitl_loop_back_node_id;
  const loopBackCondition = (metadata as any).hitl_loop_back_condition || "needs_changes";

  // Initialize response data based on node type
  React.useEffect(() => {
    if (metadata.hitl_node_type === "approval") {
      setResponseData({ approved: false });
    } else if (metadata.hitl_node_type === "input" && metadata.hitl_fields) {
      const initialData: Record<string, any> = {};
      metadata.hitl_fields.forEach((field) => {
        if (field.type === "multi_select") {
          initialData[field.name] = [];
        } else {
          initialData[field.name] = "";
        }
      });
      setResponseData(initialData);
    }
  }, [metadata]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setResponseData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async (approved?: boolean, requestChanges?: boolean) => {
    if (!metadata) return;

    // Prepare response data based on node type
    let finalResponseData: Record<string, any> = { ...responseData };
    let action: string | undefined;

    if (metadata.hitl_node_type === "approval") {
      // For approval nodes, use approved parameter
      finalResponseData = { approved: approved ?? responseData.approved };
      action = approved ? "approved" : "rejected";
    } else if (metadata.hitl_node_type === "input") {
      // Check if this is review mode (loop back configured)
      if (isReviewMode) {
        // Review mode: handle approve vs request changes
        if (requestChanges === true) {
          // User clicked "Request Changes" - set needs_changes to true
          finalResponseData[loopBackCondition] = true;
          action = "requested_changes";
          // Include changes/feedback if provided
          if (responseData.changes) {
            finalResponseData.changes = responseData.changes;
          }
        } else if (requestChanges === false) {
          // User clicked "Approve and Continue" - don't set needs_changes (or set to false)
          finalResponseData[loopBackCondition] = false;
          action = "approved";
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
        // Validate required fields
        if (metadata.hitl_fields) {
          for (const field of metadata.hitl_fields) {
            if (field.required && !responseData[field.name]) {
              toast.error(`Field "${field.name}" is required`);
              return;
            }
          }
          // Only include fields that are defined in the node configuration
          const filteredData: Record<string, any> = {};
          metadata.hitl_fields.forEach((field) => {
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
          });
          finalResponseData = filteredData;
          
          // Ensure at least one field has a value
          const hasAnyValue = Object.values(finalResponseData).some(
            (value) => value !== "" && value !== null && value !== undefined && 
            (Array.isArray(value) ? value.length > 0 : true)
          );
          if (!hasAnyValue) {
            toast.error("Please fill in at least one field");
            return;
          }
        }
        action = "submitted";
      }
    }

    setIsSubmitting(true);

    try {
      const response: HITLResponseRequest = {
        response_data: finalResponseData,
        ...(comment ? { comment } : {}),
      };

      await WorkflowService.submitHITLResponse(
        metadata.hitl_execution_id,
        metadata.hitl_node_id,
        metadata.hitl_iteration,
        response
      );

      // Store submitted response to show in chat
      setSubmittedResponse({ data: finalResponseData, action });
      
      toast.success("Response submitted successfully! The workflow will continue.");
      
      // Invalidate pending requests query to update sidebar count
      queryClient.invalidateQueries({ queryKey: ['pendingHITLRequests'] });
      if (user?.uid) {
        queryClient.invalidateQueries({ queryKey: ['pendingHITLRequests', user.uid] });
      }
      
      // Call callback with response data
      onResponseSubmitted?.(finalResponseData, action);
    } catch (error: any) {
      console.error("Error submitting HITL response:", error);
      toast.error(error.response?.data?.detail || "Failed to submit response");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show submitted response instead of the form
  if (submittedResponse) {
    const responseText = formatResponseText(submittedResponse.data, submittedResponse.action, metadata.hitl_node_type);
    return (
      <Card className="my-4 border-2 border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-700 font-medium">
                {submittedResponse.action === "approved" ? "Approved" :
                 submittedResponse.action === "rejected" ? "Rejected" :
                 submittedResponse.action === "requested_changes" ? "Changes Requested" :
                 "Response Submitted"}
              </span>
            </div>
            <div className="text-sm text-gray-700 mt-2">
              <strong>Response:</strong> {responseText}
            </div>
            {comment && (
              <div className="text-sm text-gray-600 mt-1">
                <strong>Comment:</strong> {comment}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isExpired) {
    return (
      <Card className="my-4 border-2 border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <AlertCircle className="h-5 w-5" />
            Request Expired
          </CardTitle>
          <CardDescription>
            This request has expired. The workflow will proceed with the timeout action.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="my-4 border-2 border-blue-200 bg-white shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl mb-1">
              {metadata.hitl_node_type === "approval" ? "Approval Request" : "Input Request"}
            </CardTitle>
            <CardDescription className="text-xs">
              Request ID: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{metadata.hitl_request_id}</code>
            </CardDescription>
          </div>
          <Badge variant={isExpired ? "destructive" : "default"} className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeRemainingFormatted}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Approval Node Response */}
        {metadata.hitl_node_type === "approval" && (
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Your Decision</Label>
            <div className="flex gap-4">
              <Button
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
            <div>
              <Label htmlFor="comment">Comment (Optional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isSubmitting}
                placeholder="Add any additional notes..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {/* Input Node Response */}
        {metadata.hitl_node_type === "input" && (
          <div className="space-y-4">
            {/* Review Mode: Show when loop_back_node_id is configured */}
            {isReviewMode ? (
              <>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                  <p className="text-sm text-blue-700 font-medium mb-2">
                    Review Mode: You can approve the current result or request changes to loop back to the previous step.
                  </p>
                </div>
                
                {/* Show Input Fields if configured */}
                {metadata.hitl_fields && metadata.hitl_fields.length > 0 && (
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold">Provide Input</Label>
                    {metadata.hitl_fields.map((field) => (
                      <div key={field.name}>
                        <Label htmlFor={field.name} className="mb-2 block">
                          {field.name}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {renderFieldInput(field, responseData[field.name] || "", handleFieldChange, isSubmitting)}
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
                    disabled={isSubmitting}
                    placeholder="Describe any changes or feedback you'd like..."
                    rows={4}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button
                    onClick={() => handleSubmit(undefined, false)} // false = don't set needs_changes
                    disabled={isSubmitting}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve and Continue
                  </Button>
                  <Button
                    onClick={() => handleSubmit(undefined, true)} // true = set needs_changes
                    disabled={isSubmitting}
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
                {metadata.hitl_fields && metadata.hitl_fields.length > 0 ? (
                  metadata.hitl_fields.map((field) => (
                    <div key={field.name}>
                      <Label htmlFor={field.name} className="mb-2 block">
                        {field.name}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {renderFieldInput(field, responseData[field.name] || "", handleFieldChange, isSubmitting)}
                    </div>
                  ))
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                    <p className="text-yellow-700 text-sm">
                      ⚠️ No input fields are configured for this Input node. You can still submit a response with a comment.
                    </p>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="comment">Comment (Optional)</Label>
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Add any additional notes..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
                
                <Button
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? "Submitting..." : "Submit Response"}
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper function to render field inputs
function renderFieldInput(
  field: { name: string; type: string; options?: string[]; required?: boolean },
  value: any,
  onChange: (fieldName: string, value: any) => void,
  disabled: boolean
) {
  switch (field.type) {
    case "text":
    case "string":
      return (
        <Input
          id={field.name}
          type="text"
          value={value || ""}
          onChange={(e) => onChange(field.name, e.target.value)}
          required={field.required}
          disabled={disabled}
          className="mt-1"
        />
      );
    case "textarea":
      return (
        <Textarea
          id={field.name}
          value={value || ""}
          onChange={(e) => onChange(field.name, e.target.value)}
          required={field.required}
          disabled={disabled}
          className="mt-1"
          rows={4}
        />
      );
    case "number":
      return (
        <Input
          id={field.name}
          type="number"
          value={value || ""}
          onChange={(e) => onChange(field.name, parseFloat(e.target.value) || 0)}
          required={field.required}
          disabled={disabled}
          className="mt-1"
        />
      );
    case "select":
      return (
        <select
          id={field.name}
          value={value || ""}
          onChange={(e) => onChange(field.name, e.target.value)}
          disabled={disabled}
          required={field.required}
          className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
        >
          <option value="">Select an option</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    case "multi_select":
      return (
        <div className="space-y-2 mt-1">
          {field.options?.map((option) => (
            <label key={option} className="flex items-center">
              <input
                type="checkbox"
                checked={(value || []).includes(option)}
                onChange={(e) => {
                  const current = value || [];
                  const updated = e.target.checked
                    ? [...current, option]
                    : current.filter((v: string) => v !== option);
                  onChange(field.name, updated);
                }}
                disabled={disabled}
                className="mr-2"
              />
              {option}
            </label>
          ))}
        </div>
      );
    case "boolean":
      return (
        <div className="mt-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => onChange(field.name, e.target.checked)}
              disabled={disabled}
              className="rounded"
            />
            <span>{field.name}</span>
          </label>
        </div>
      );
    case "file":
      return (
        <Input
          id={field.name}
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onChange(field.name, file.name);
            }
          }}
          disabled={disabled}
          required={field.required}
          className="mt-1"
        />
      );
    default:
      return (
        <Input
          id={field.name}
          type={field.type}
          value={value || ""}
          onChange={(e) => onChange(field.name, e.target.value)}
          required={field.required}
          disabled={disabled}
          className="mt-1"
        />
      );
  }
}

// Helper function to format response text for display
function formatResponseText(
  responseData: Record<string, any>,
  action?: string,
  nodeType?: string
): string {
  if (nodeType === "approval") {
    return responseData.approved ? "Approved" : "Rejected";
  }
  
  if (action === "requested_changes") {
    return "Requested changes";
  }
  
  if (action === "approved") {
    return "Approved and continuing";
  }
  
  // Format input fields
  const fields = Object.entries(responseData)
    .filter(([key]) => key !== "needs_changes" && key !== "changes")
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: ${value.join(", ")}`;
      }
      return `${key}: ${value}`;
    });
  
  return fields.length > 0 ? fields.join(", ") : "Submitted";
}
