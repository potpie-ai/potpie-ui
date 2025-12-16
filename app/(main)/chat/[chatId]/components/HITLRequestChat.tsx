"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import WorkflowService, { HITLResponseRequest } from "@/services/WorkflowService";
import { HITLMetadata } from "@/lib/utils/hitlMetadata";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface HITLRequestChatProps {
  metadata: HITLMetadata;
  onResponseSubmitted?: () => void;
}

export const HITLRequestChat: React.FC<HITLRequestChatProps> = ({
  metadata,
  onResponseSubmitted,
}) => {
  const [responseData, setResponseData] = useState<Record<string, any>>({});
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isRejected, setIsRejected] = useState(false);

  const timeoutAt = dayjs(metadata.hitl_timeout_at);
  const isExpired = timeoutAt.isBefore(dayjs());
  const timeRemaining = timeoutAt.fromNow();

  const handleFieldChange = (fieldName: string, value: any) => {
    setResponseData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async (action?: "approve" | "reject") => {
    // Prepare response data based on node type
    let finalResponseData: Record<string, any> = { ...responseData };

    if (metadata.hitl_node_type === "approval") {
      // For approval nodes, use action
      if (action === "approve") {
        finalResponseData = { approved: true };
      } else if (action === "reject") {
        finalResponseData = { approved: false };
      } else {
        toast.error("Please select approve or reject");
        return;
      }
    } else {
      // Validate required fields for input nodes
      if (metadata.hitl_fields) {
        const requiredFields = metadata.hitl_fields.filter((f) => f.required);
        for (const field of requiredFields) {
          if (!finalResponseData[field.name] || String(finalResponseData[field.name]).trim() === "") {
            toast.error(`Please fill in the required field: ${field.name}`);
            return;
          }
        }
      }
    }

    setIsSubmitting(true);

    try {
      const response: HITLResponseRequest = {
        response_data: finalResponseData,
        comment: comment || undefined,
      };

      await WorkflowService.submitHITLResponse(
        metadata.hitl_execution_id,
        metadata.hitl_node_id,
        metadata.hitl_iteration,
        response
      );

      if (action === "approve") {
        setIsApproved(true);
      } else if (action === "reject") {
        setIsRejected(true);
      }

      toast.success("Response submitted successfully!");
      onResponseSubmitted?.();
    } catch (error: any) {
      console.error("Error submitting HITL response:", error);
      toast.error(error.response?.data?.detail || "Failed to submit response");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isApproved || isRejected) {
    return (
      <Card className="my-4 border-2 border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            {isApproved ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-green-700 font-medium">Approved</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-700 font-medium">Rejected</span>
              </>
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
    <Card className="my-4 border-2 border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Human-in-the-Loop: {metadata.hitl_node_type === "approval" ? "Approval" : "Input"} Required
          </CardTitle>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeRemaining}
          </Badge>
        </div>
        <CardDescription>
          Request ID: <code className="text-xs">{metadata.hitl_request_id}</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {metadata.hitl_node_type === "approval" ? (
          // Approval node UI
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() => handleSubmit("approve")}
                disabled={isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => handleSubmit("reject")}
                disabled={isSubmitting}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
            <div>
              <Label htmlFor="comment">Comment (optional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                className="mt-1"
              />
            </div>
          </div>
        ) : (
          // Input node UI
          <div className="space-y-4">
            {metadata.hitl_fields?.map((field) => (
              <div key={field.name}>
                <Label htmlFor={field.name}>
                  {field.name}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {field.type === "text" || field.type === "string" ? (
                  <Input
                    id={field.name}
                    type="text"
                    value={responseData[field.name] || ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    required={field.required}
                    className="mt-1"
                  />
                ) : field.type === "textarea" || field.type === "text" ? (
                  <Textarea
                    id={field.name}
                    value={responseData[field.name] || ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    required={field.required}
                    className="mt-1"
                    rows={4}
                  />
                ) : field.type === "boolean" ? (
                  <div className="mt-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={responseData[field.name] || false}
                        onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                        className="rounded"
                      />
                      <span>{field.name}</span>
                    </label>
                  </div>
                ) : (
                  <Input
                    id={field.name}
                    type={field.type}
                    value={responseData[field.name] || ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    required={field.required}
                    className="mt-1"
                  />
                )}
              </div>
            ))}
            <div>
              <Label htmlFor="comment">Comment (optional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

