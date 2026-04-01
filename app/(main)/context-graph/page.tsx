"use client";

import "reactflow/dist/style.css";

import React, { useEffect, useState } from "react";

import { ProjectContextGraphExplorer } from "@/components/context-graph/ProjectContextGraphExplorer";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import { toast } from "@/components/ui/sonner";

export default function ContextGraphPage() {
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projects, setProjects] = useState<
    Array<{ id: string; repo_name: string; branch_name?: string; status: string }>
  >([]);

  useEffect(() => {
    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const data = await BranchAndRepositoryService.getUserProjects();
        const readyProjects = (Array.isArray(data) ? data : []).filter(
          (p: { repo_name?: string; status?: string }) =>
            Boolean(p.repo_name) && (p.status || "").toLowerCase() === "ready"
        );
        setProjects(readyProjects);
      } catch (_error) {
        toast.error("Failed to load projects for context graph explorer.");
      } finally {
        setLoadingProjects(false);
      }
    };
    void loadProjects();
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Context Graph</h1>
        <p className="text-muted-foreground">
          Explore project context relationships across pull requests, decisions,
          commits, files, code entities, and integration-linked nodes.
        </p>
      </div>

      <ProjectContextGraphExplorer
        projects={projects}
        loadingProjects={loadingProjects}
      />
    </div>
  );
}
