"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Check, AlertCircle } from "lucide-react";
import PlanService from "@/services/PlanService";
import SpecService from "@/services/SpecService";
import { PlanStatusResponse, PlanItem } from "@/lib/types/spec";
import { toast } from "sonner";

export default function PlanPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const recipeId = searchParams.get("recipeId");
  const specId = searchParams.get("specId");
  const planIdFromUrl = searchParams.get("planId");

  const [planId, setPlanId] = useState<string | null>(planIdFromUrl);
  const [planStatus, setPlanStatus] = useState<PlanStatusResponse | null>(null);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [nextStart, setNextStart] = useState<number | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Submit plan generation if we have recipeId or specId but no planId
  const submitPlanMutation = useMutation({
    mutationFn: async () => {
      if (!recipeId && !specId) {
        throw new Error("Recipe ID or Spec ID is required");
      }
      return await PlanService.submitPlanGeneration({
        recipe_id: recipeId || undefined,
        spec_id: specId || undefined,
      });
    },
    onSuccess: (data) => {
      setPlanId(data.plan_id);
      // Update URL with planId
      const params = new URLSearchParams(searchParams.toString());
      params.set("planId", data.plan_id);
      router.replace(`/plan?${params.toString()}`);
      toast.success("Plan generation started");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to start plan generation");
    },
  });

  // Fetch plan status
  const { data: statusData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["plan-status", planId, recipeId, specId],
    queryFn: async () => {
      if (planId) {
        return await PlanService.getPlanStatus(planId);
      } else if (specId) {
        return await PlanService.getPlanStatusBySpecId(specId);
      } else if (recipeId) {
        return await PlanService.getPlanStatusByRecipeId(recipeId);
      }
      return null;
    },
    enabled: !!(planId || specId || recipeId),
    refetchInterval: (data) => {
      // Poll every 2 seconds if plan is in progress
      if (data?.plan_gen_status === "IN_PROGRESS" || data?.plan_gen_status === "SUBMITTED") {
        return 2000;
      }
      return false;
    },
  });

  // Update plan status when query data changes
  useEffect(() => {
    if (statusData) {
      setPlanStatus(statusData);
      // If we got a plan_id from the status, store it
      if (statusData.plan_id && !planId) {
        setPlanId(statusData.plan_id);
      }
    }
  }, [statusData, planId]);

  // Auto-submit plan generation if we have recipeId/specId but no planId
  useEffect(() => {
    if ((recipeId || specId) && !planId && !submitPlanMutation.isPending && !statusData) {
      submitPlanMutation.mutate();
    }
  }, [recipeId, specId, planId]);

  // Fetch plan items when plan is completed
  const fetchPlanItems = async (start: number = 0) => {
    if (!planId) return;
    
    try {
      setIsLoadingItems(true);
      const response = await PlanService.getPlanItems(planId, start, 20);
      if (start === 0) {
        setPlanItems(response.plan_items);
      } else {
        setPlanItems((prev) => [...prev, ...response.plan_items]);
      }
      setNextStart(response.next_start);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch plan items");
    } finally {
      setIsLoadingItems(false);
    }
  };

  useEffect(() => {
    if (planStatus?.plan_gen_status === "COMPLETED" && planId && planItems.length === 0) {
      fetchPlanItems(0);
    }
  }, [planStatus?.plan_gen_status, planId]);

  if (!recipeId && !specId && !planId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">No recipe ID, spec ID, or plan ID provided</p>
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

  const isGenerating = planStatus?.plan_gen_status === "IN_PROGRESS" || planStatus?.plan_gen_status === "SUBMITTED";
  const isCompleted = planStatus?.plan_gen_status === "COMPLETED";
  const isFailed = planStatus?.plan_gen_status === "FAILED";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-background rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">
            Implementation Plan
          </h1>

          {/* Plan Generation Status */}
          {isGenerating && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    {planStatus?.status_message || "Generating plan..."}
                  </p>
                  {planStatus && (
                    <div className="mt-2">
                      {(planStatus.progress_percent !== null && planStatus.progress_percent !== undefined) && (
                        <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${planStatus.progress_percent}%` }}
                          />
                        </div>
                      )}
                      <p className="text-xs text-blue-700 mt-1">
                        Step {planStatus.current_step + 1}/3
                        {planStatus.progress_percent !== null && planStatus.progress_percent !== undefined && ` • ${planStatus.progress_percent}%`}
                        {planStatus.total_items !== null && planStatus.total_items !== undefined && planStatus.items_completed !== null && planStatus.items_completed !== undefined && ` • ${planStatus.items_completed}/${planStatus.total_items} items`}
                      </p>
                    </div>
                  )}
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

          {/* Plan Items */}
          {isCompleted && planItems.length > 0 && (
            <div className="space-y-6">
              {planItems.map((item, index) => (
                <div
                  key={item.item_number}
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

                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Verification Criteria
                      </h4>
                      <p className="text-sm text-gray-700">{item.verification_criteria}</p>
                    </div>

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

              {/* Load More Button */}
              {nextStart !== null && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={() => fetchPlanItems(nextStart)}
                    disabled={isLoadingItems}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingItems ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                        Loading...
                      </>
                    ) : (
                      "Load More Items"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {isCompleted && planItems.length === 0 && !isLoadingItems && (
            <div className="text-center py-12">
              <p className="text-gray-500">No plan items available yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


