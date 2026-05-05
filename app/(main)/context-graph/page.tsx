"use client";

import "reactflow/dist/style.css";

import React, { useEffect, useState } from "react";

import { ProjectContextGraphExplorer } from "@/components/context-graph/ProjectContextGraphExplorer";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import { toast } from "@/components/ui/sonner";

export default function ContextGraphPage() {
  const [loadingPots, setLoadingPots] = useState(true);
  const [pots, setPots] = useState<
    Array<{ id: string; display_name: string | null; slug: string | null; primary_repo_name: string | null; archived_at: string | null }>
  >([]);

  useEffect(() => {
    const loadPots = async () => {
      setLoadingPots(true);
      try {
        const data = await BranchAndRepositoryService.getPots();
        setPots(data.filter((p) => !p.archived_at));
      } catch (_error) {
        toast.error("Failed to load pots for context graph explorer.");
      } finally {
        setLoadingPots(false);
      }
    };
    void loadPots();
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Context Graph</h1>
        <p className="text-muted-foreground">
          Explore context relationships across your pots — services, features, repositories, and more.
        </p>
      </div>

      <ProjectContextGraphExplorer
        pots={pots}
        loadingPots={loadingPots}
      />
    </div>
  );
}
