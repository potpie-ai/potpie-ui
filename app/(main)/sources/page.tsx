"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Github, Loader2, RefreshCw } from "lucide-react";
import getHeaders from "@/app/utils/headers.util";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export default function SourcesPage() {
  const [syncing, setSyncing] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projects, setProjects] = useState<
    Array<{ id: string; repo_name: string; branch_name?: string; status: string }>
  >([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

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
        toast.error("Failed to load projects for selective sync.");
      } finally {
        setLoadingProjects(false);
      }
    };
    void loadProjects();
  }, []);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const headers = await getHeaders();
      const payloadProjectIds =
        selectedProjectId === "all"
          ? projects.map((project) => project.id)
          : [selectedProjectId];
      // Backend: app/main.py mounts create_context_router at /api/v1/context → POST /sync
      const res = await axios.post(
        `${BASE_URL}/api/v1/context/sync`,
        {
          project_ids: payloadProjectIds,
        },
        { headers }
      );
      const data = res.data as {
        status?: string;
        message?: string;
        enqueued?: number;
        total_eligible?: number;
      };
      if (data.status === "success") {
        toast.success(
          data.message ||
            `Sync started for ${data.enqueued ?? 0} project(s).`
        );
      } else {
        toast.error(data.message || "Sync request failed.");
      }
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? String(err.response.data.detail)
          : err instanceof Error
            ? err.message
            : "Failed to start sync.";
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sources</h1>
        <p className="text-muted-foreground">
          Data sources used to build project context (PRs, commits, etc.). Sync
          them to refresh the context graph for your projects.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              <CardTitle>GitHub</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Pull requests and (optionally) commits from your connected
              repositories. Select a project (or all ready projects) and then
              start sync.
            </CardDescription>
            <div className="mb-4 space-y-3">
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                disabled={loadingProjects || projects.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project to sync" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All ready projects ({projects.length})
                  </SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.repo_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedProjectId === "all"
                  ? `Syncing all ${projects.length} ready project(s).`
                  : `Syncing selected project.`}
              </p>
            </div>
            <Button
              onClick={handleSyncAll}
              disabled={syncing || loadingProjects || projects.length === 0}
              variant="default"
            >
              {syncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync now
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
