"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { onAuthStateChanged } from "firebase/auth";
import { Github, Layers, Loader2, RefreshCw, Link2 } from "lucide-react";
import getHeaders from "@/app/utils/headers.util";
import { auth } from "@/configs/Firebase-config";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import SourcesService, {
  type LinearTeam,
  type ProjectSourceRow,
  type SourceConnection,
} from "@/services/SourcesService";
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
  /** All projects for the signed-in user (from GET /api/v1/projects/list). */
  const [allProjects, setAllProjects] = useState<
    Array<{ id: string; repo_name: string; branch_name?: string; status: string }>
  >([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  /** GitHub sync only uses parsed “ready” projects; Linear attach can use any owned project. */
  const readyProjects = useMemo(
    () =>
      allProjects.filter(
        (p) => (p.status || "").toLowerCase() === "ready"
      ),
    [allProjects]
  );

  /** Linear: connections + team attach (GET/POST /api/v1/sources/...) */
  const [connections, setConnections] = useState<SourceConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [linearIntegrationId, setLinearIntegrationId] = useState<string>("");
  const [linearTeams, setLinearTeams] = useState<LinearTeam[]>([]);
  const [loadingLinearTeams, setLoadingLinearTeams] = useState(false);
  const [selectedLinearTeamId, setSelectedLinearTeamId] = useState<string>("");
  const [linearProjectId, setLinearProjectId] = useState<string>("");
  const [attachingLinear, setAttachingLinear] = useState(false);
  const [syncingLinear, setSyncingLinear] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [githubLinkedViaLogin, setGithubLinkedViaLogin] = useState(false);
  const [projectSources, setProjectSources] = useState<ProjectSourceRow[]>([]);
  const [loadingProjectSources, setLoadingProjectSources] = useState(false);

  // Wait for Firebase auth before calling /projects/list — otherwise getHeaders() has no
  // Bearer token and the backend logs “No credential provided”.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAllProjects([]);
        setConnections([]);
        setLinearIntegrationId("");
        setGithubLinkedViaLogin(false);
        setLoadingProjects(false);
        setLoadingConnections(false);
        return;
      }
      setGithubLinkedViaLogin(
        user.providerData.some((provider) => provider.providerId === "github.com")
      );
      setLoadingProjects(true);
      setLoadingConnections(true);
      try {
        const [projectData, connectionData] = await Promise.all([
          BranchAndRepositoryService.getUserProjects(),
          SourcesService.getConnections(),
        ]);
        const list = (Array.isArray(projectData) ? projectData : []).filter(
          (p: { repo_name?: string }) => Boolean(p.repo_name)
        );
        setAllProjects(list);
        setConnections(connectionData);
        const linear = connectionData.filter(
          (c) =>
            c.provider === "linear" &&
            c.connected &&
            c.integration_id
        );
        if (linear.length === 1 && linear[0].integration_id) {
          setLinearIntegrationId(linear[0].integration_id);
        }
      } catch {
        toast.error("Failed to load projects or connections.");
        setAllProjects([]);
      } finally {
        setLoadingProjects(false);
        setLoadingConnections(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!linearIntegrationId) {
      setLinearTeams([]);
      setSelectedLinearTeamId("");
      return;
    }
    let cancelled = false;
    const loadTeams = async () => {
      setLoadingLinearTeams(true);
      setSelectedLinearTeamId("");
      try {
        const teams = await SourcesService.getLinearTeams(linearIntegrationId);
        if (!cancelled) setLinearTeams(teams);
      } catch (err: unknown) {
        if (!cancelled) {
          const msg =
            axios.isAxiosError(err) && err.response?.data?.detail
              ? String(err.response.data.detail)
              : "Could not load Linear teams.";
          toast.error(msg);
          setLinearTeams([]);
        }
      } finally {
        if (!cancelled) setLoadingLinearTeams(false);
      }
    };
    void loadTeams();
    return () => {
      cancelled = true;
    };
  }, [linearIntegrationId]);

  const loadProjectSources = async (projectId: string) => {
    if (!projectId) {
      setProjectSources([]);
      return;
    }
    setLoadingProjectSources(true);
    try {
      const sources = await SourcesService.getProjectSources(projectId);
      setProjectSources(sources);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? String(err.response.data.detail)
          : "Could not load project sources.";
      toast.error(msg);
      setProjectSources([]);
    } finally {
      setLoadingProjectSources(false);
    }
  };

  useEffect(() => {
    if (!linearProjectId) {
      setProjectSources([]);
      return;
    }
    void loadProjectSources(linearProjectId);
  }, [linearProjectId]);

  const handleCreateWorkspaceProject = async () => {
    setCreatingWorkspace(true);
    try {
      const created = await BranchAndRepositoryService.createWorkspaceProject();
      setAllProjects((prev) => [
        ...prev,
        {
          id: created.id,
          repo_name: created.repo_name,
          branch_name: created.branch_name,
          status: created.status,
        },
      ]);
      setLinearProjectId(created.id);
      toast.success("Workspace project created — you can link a Linear team to it.");
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? String(err.response.data.detail)
          : err instanceof Error
            ? err.message
            : "Could not create workspace.";
      toast.error(msg);
    } finally {
      setCreatingWorkspace(false);
    }
  };

  const linearIntegrations = connections.filter(
    (c) => c.provider === "linear" && c.connected && c.integration_id
  );
  const githubIntegrations = connections.filter(
    (c) => c.provider === "github" && c.connected
  );
  const githubIntegrationCount = githubIntegrations.length;
  const hasGitHubLiveIntegration =
    githubIntegrationCount > 0 || githubLinkedViaLogin;

  const handleAttachLinearTeam = async () => {
    if (!linearProjectId || !linearIntegrationId || !selectedLinearTeamId) {
      toast.error("Select a project, Linear connection, and team.");
      return;
    }
    const team = linearTeams.find((t) => t.id === selectedLinearTeamId);
    setAttachingLinear(true);
    try {
      await SourcesService.attachLinearTeam(linearProjectId, {
        integration_id: linearIntegrationId,
        team_id: selectedLinearTeamId,
        team_name: team?.name ?? null,
      });
      toast.success("Linear team linked to project.");
      await loadProjectSources(linearProjectId);
      try {
        await SourcesService.syncProjectSources(linearProjectId);
        toast.info("Sync queued for this project’s sources.");
      } catch {
        /* sync is best-effort */
      }
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? String(err.response.data.detail)
          : err instanceof Error
            ? err.message
            : "Failed to attach Linear team.";
      toast.error(msg);
    } finally {
      setAttachingLinear(false);
    }
  };

  const handleSyncLinearSources = async () => {
    if (!linearProjectId) {
      toast.error("Select a project first.");
      return;
    }
    setSyncingLinear(true);
    try {
      const data = (await SourcesService.syncProjectSources(
        linearProjectId
      )) as { linear_sources_queued?: number };
      const n = data.linear_sources_queued ?? 0;
      toast.success(
        n > 0
          ? `Sync queued (${n} Linear source${n === 1 ? "" : "s"}).`
          : "Sync queued. No Linear sources on this project yet — attach a team first."
      );
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? String(err.response.data.detail)
          : err instanceof Error
            ? err.message
            : "Could not queue sync.";
      toast.error(msg);
    } finally {
      setSyncingLinear(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const headers = await getHeaders();
      const payloadProjectIds =
        selectedProjectId === "all"
          ? readyProjects.map((project) => project.id)
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

      {!loadingProjects && allProjects.length === 0 && (
        <Card className="border-amber-200 bg-amber-50/60 dark:bg-amber-950/20">
          <CardContent className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-950 dark:text-amber-100">
              Your account has no projects yet. Parse a repo from <strong>New chat</strong>,
              or create a minimal workspace here so you can attach Linear and other sources.
            </p>
            <Button
              type="button"
              variant="default"
              className="shrink-0"
              onClick={handleCreateWorkspaceProject}
              disabled={creatingWorkspace}
            >
              {creatingWorkspace ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create workspace project"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              <CardTitle>Linear</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              After you connect Linear in{" "}
              <span className="font-medium text-foreground">Integrations</span>, choose
              a project and a team so context can sync from that team.
            </CardDescription>
            {loadingConnections ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking Linear connection…
              </div>
            ) : linearIntegrations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No Linear integration connected. Connect Linear first, then return here
                to attach a team to a project.
              </p>
            ) : (
              <div className="space-y-3">
                {linearIntegrations.length > 1 && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Linear connection
                    </label>
                    <Select
                      value={linearIntegrationId}
                      onValueChange={setLinearIntegrationId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select integration" />
                      </SelectTrigger>
                      <SelectContent>
                        {linearIntegrations.map((c) => (
                          <SelectItem
                            key={c.integration_id!}
                            value={c.integration_id!}
                          >
                            {c.name || c.integration_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Project
                  </label>
                  <Select
                    value={linearProjectId}
                    onValueChange={setLinearProjectId}
                    disabled={loadingProjects || allProjects.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {allProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.repo_name}
                          {(project.status || "").toLowerCase() !== "ready"
                            ? ` (${project.status || "not ready"})`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Linear team
                  </label>
                  <Select
                    value={selectedLinearTeamId}
                    onValueChange={setSelectedLinearTeamId}
                    disabled={
                      !linearIntegrationId ||
                      loadingLinearTeams ||
                      linearTeams.length === 0
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingLinearTeams
                            ? "Loading teams…"
                            : linearTeams.length === 0
                              ? "No teams (check token)"
                              : "Select team"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {linearTeams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                          {t.key ? ` (${t.key})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button
                    onClick={handleAttachLinearTeam}
                    disabled={
                      attachingLinear ||
                      !linearProjectId ||
                      !selectedLinearTeamId ||
                      !linearIntegrationId
                    }
                    variant="secondary"
                    className="w-full sm:w-auto"
                  >
                    {attachingLinear ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Linking…
                      </>
                    ) : (
                      <>
                        <Link2 className="mr-2 h-4 w-4" />
                        Attach team to project
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    onClick={handleSyncLinearSources}
                    disabled={
                      syncingLinear ||
                      !linearProjectId ||
                      loadingProjects
                    }
                    className="w-full sm:w-auto"
                  >
                    {syncingLinear ? (
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
                </div>
                <p className="text-xs text-muted-foreground">
                  Sync now queues ingestion for this project’s sources (Linear team
                  when attached; GitHub backfill runs too if that source exists).
                </p>
                <div className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Attached sources for selected project
                    </p>
                    {linearProjectId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void loadProjectSources(linearProjectId)}
                        disabled={loadingProjectSources}
                        className="h-7 px-2 text-xs"
                      >
                        {loadingProjectSources ? "Refreshing..." : "Refresh"}
                      </Button>
                    )}
                  </div>
                  {!linearProjectId ? (
                    <p className="text-xs text-muted-foreground">
                      Select a project to view attached sources.
                    </p>
                  ) : loadingProjectSources ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading attached sources...
                    </div>
                  ) : projectSources.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No sources attached yet for this project.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {projectSources.map((source) => {
                        const scope = source.scope_json || {};
                        const teamName =
                          typeof scope.team_name === "string"
                            ? scope.team_name
                            : null;
                        const teamId =
                          typeof scope.team_id === "string" ? scope.team_id : null;
                        return (
                          <div
                            key={source.id}
                            className="rounded-sm border bg-muted/20 px-2 py-1.5"
                          >
                            <p className="text-xs font-medium">
                              {source.provider} / {source.source_kind}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {teamName
                                ? `Team: ${teamName}${teamId ? ` (${teamId})` : ""}`
                                : teamId
                                  ? `Team ID: ${teamId}`
                                  : "Scope attached"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
            <div className="mb-4">
              {loadingConnections ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking GitHub connection…
                </div>
              ) : hasGitHubLiveIntegration ? (
                <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                  GitHub integration is live
                  {githubIntegrationCount > 0
                    ? ` (${githubIntegrationCount} connected)`
                    : " via your login."}
                  You can sync sources now.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No GitHub integration detected yet. Connect GitHub from login or
                  Integrations to enable source syncing.
                </p>
              )}
            </div>
            <div className="mb-4 space-y-3">
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                disabled={loadingProjects || readyProjects.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project to sync" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All ready projects ({readyProjects.length})
                  </SelectItem>
                  {readyProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.repo_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedProjectId === "all"
                  ? `Syncing all ${readyProjects.length} ready project(s).`
                  : `Syncing selected project.`}
              </p>
            </div>
            <Button
              onClick={handleSyncAll}
              disabled={syncing || loadingProjects || readyProjects.length === 0}
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
