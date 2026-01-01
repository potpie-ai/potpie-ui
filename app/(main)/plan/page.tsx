/**
 * @deprecated This file is part of Flow A (mock flow) and will be removed in a future version.
 * 
 * Flow A has been replaced by Flow B which uses real API integration:
 * - Entry: /idea (instead of /newtask)
 * - Q&A: /repo (instead of /task/[taskId]/userqa)
 * - Spec: /task/[recipeId]/spec (now uses real API instead of mock data)
 * - Plan: /task/[recipeId]/plan_overview
 * 
 * This file should be removed after Flow B is fully tested and stable.
 * 
 * @see IMPLEMENTATION_PLAN_FLOW_B_SPEC_INTEGRATION.md
 * @see /app/(main)/idea/page.tsx - New entry point
 * @see /app/(main)/repo/page.tsx - Real Q&A flow
 */
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import QuestionService from "@/services/QuestionService";

export default function PlanPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("projectId");

  // TODO: Fetch plan from API
  // For now, show placeholder
  const { data: planData, isLoading } = useQuery({
    queryKey: ["plan", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      // TODO: Implement plan fetching
      return { plan_document: "Plan will be displayed here" };
    },
    enabled: !!projectId,
  });

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">No project ID provided</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">
            Implementation Plan
          </h1>
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-gray-700">
              {planData?.plan_document || "Plan will be generated here..."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}


