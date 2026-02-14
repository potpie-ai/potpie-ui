"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import PlanService from "@/services/PlanService";
import { PlanStatusResponse, PlanItem } from "@/lib/types/spec";
import { toast } from "@/components/ui/sonner";

export default function PlanPage() {
  const searchParams = useSearchParams();
  const recipeId = searchParams.get("recipeId");

  const [planStatus, setPlanStatus] = useState<PlanStatusResponse | null>(null);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);

  // Submit plan generation if we have recipeId but no plan status yet
  const submitPlanMutation = useMutation({
    mutationFn: async () => {
      if (!recipeId) {
        throw new Error("Recipe ID is required");
      }
      return await PlanService.submitPlanGeneration({
        recipe_id: recipeId,
      });
    },
    onSuccess: () => {
      toast.success("Plan generation started");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to start plan generation");
    },
  });

  // Fetch plan status by recipe_id only (new API)
  const { data: statusData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["plan-status", recipeId],
    queryFn: async () => {
      if (recipeId) {
        return await PlanService.getPlanStatusByRecipeId(recipeId);
      }
      return null;
    },
    enabled: !!recipeId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.generation_status === "processing" || data?.generation_status === "pending") {
        return 2000;
      }
      return false;
    },
  });

  useEffect(() => {
    if (statusData) {
      setPlanStatus(statusData);
    }
  }, [statusData]);

  // Auto-submit plan generation if we have recipeId but no status yet
  useEffect(() => {
    if (recipeId && !submitPlanMutation.isPending && !statusData) {
      submitPlanMutation.mutate();
    }
  }, [recipeId]);

  // Extract plan items from phases when plan is completed (new API)
  useEffect(() => {
    if (planStatus?.generation_status === "completed" && planStatus.plan) {
      const items: PlanItem[] = [];
      let itemNumber = 1;
      planStatus.plan.phases.forEach((phase) => {
        phase.plan_items.forEach((item) => {
          items.push({
            id: item.plan_item_id,
            item_number: itemNumber++,
            order: item.order,
            title: item.title,
            detailed_objective: item.description,
            implementation_steps: [],
            description: item.description,
            verification_criteria: "",
            files: [],
            context_handoff: {},
            reasoning: "",
            architecture: "",
          });
        });
      });
      setPlanItems(items);
    }
  }, [planStatus?.generation_status, planStatus?.plan]);

  if (!recipeId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">No recipe ID provided</p>
      </div>
    );
  }

  if (isLoadingStatus && !planStatus) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isGenerating = planStatus?.generation_status === "processing" || planStatus?.generation_status === "pending";
  const isCompleted = planStatus?.generation_status === "completed";
  const isFailed = planStatus?.generation_status === "failed";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-background rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">
            Implementation Plan
          </h1>

          {isGenerating && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Generating plan...
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Status: {planStatus?.generation_status}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isFailed && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-900">
                    Plan generation failed
                  </p>
                  {planStatus?.error_message && (
                    <p className="text-xs text-red-700 mt-1">{planStatus.error_message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {isCompleted && planItems.length > 0 && (
            <div className="space-y-6">
              {planItems.map((item, index) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm">
                      {item.item_number}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="ml-11 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Detailed Objective
                      </h4>
                      <p className="text-sm text-gray-700">{item.detailed_objective}</p>
                    </div>

                    {item.implementation_steps.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Implementation Steps
                        </h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                          {item.implementation_steps.map((step, stepIndex) => (
                            <li key={stepIndex}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {item.files.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Files
                        </h4>
                        <div className="space-y-1">
                          {item.files.map((file, fileIndex) => (
                            <div
                              key={fileIndex}
                              className="text-sm text-gray-700 flex items-center gap-2"
                            >
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                file.type === "create"
                                  ? "bg-green-100 text-green-700"
                                  : file.type === "modify"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}>
                                {file.type}
                              </span>
                              <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                {file.path}
                              </code>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.verification_criteria && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Verification Criteria
                        </h4>
                        <p className="text-sm text-gray-700">{item.verification_criteria}</p>
                      </div>
                    )}

                    {item.reasoning && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Reasoning
                        </h4>
                        <p className="text-sm text-gray-600 italic">{item.reasoning}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isCompleted && planItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No plan items available yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
