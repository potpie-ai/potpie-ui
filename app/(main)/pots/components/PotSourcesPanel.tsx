"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FolderOpen,
  GitBranch,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LinearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.886 4.18ZM1.06 6.811a11.95 11.95 0 0 0-.973 3.207l13.89 13.888a11.95 11.95 0 0 0 3.206-.973L1.06 6.81ZM.002 12.066l11.93 11.931c-.642-.057-1.27-.166-1.879-.323L.325 13.945a11.96 11.96 0 0 1-.323-1.879Zm.467 4.528a12.06 12.06 0 0 0 6.937 6.937L.469 16.594Z" />
    </svg>
  );
}
import PotService, { PotSource } from "@/services/PotService";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import IntegrationService, {
  ConnectedIntegration,
} from "@/services/IntegrationService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";

type Props = {
  potId: string;
  isOwner: boolean;
  onPrimaryRepoChanged: () => void;
};

type GithubRepo = {
  id?: string | number;
  full_name?: string;
  name?: string;
  owner?: { login?: string } | string;
  default_branch?: string;
  html_url?: string;
};

type LinearTeam = { id: string; name: string; key?: string };

type SourceTypeId = "github_repository" | "linear_team";

type SourceTypeOption = {
  id: SourceTypeId;
  provider: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  // True when no extra credential beyond the user's OAuth login is needed.
  alwaysAvailable?: boolean;
  // For integration-backed types, integration row picked here (one connection per provider for now).
  requiresIntegrationType?: string;
};

const SOURCE_TYPES: SourceTypeOption[] = [
  {
    id: "github_repository",
    provider: "github",
    label: "GitHub repository",
    description: "Pick a repo from your GitHub account.",
    icon: <GitBranch className="h-4 w-4" />,
    alwaysAvailable: true,
  },
  {
    id: "linear_team",
    provider: "linear",
    label: "Linear team",
    description: "Pull issues from a team in your Linear workspace.",
    icon: <Users className="h-4 w-4" />,
    requiresIntegrationType: "linear",
  },
];

const GITHUB_REPO_PAGE_SIZE = 20;

function extractRepoIdentity(repo: GithubRepo): {
  owner: string;
  repo: string;
  default_branch?: string;
  external_repo_id?: string;
  remote_url?: string;
} | null {
  const fullName = repo.full_name;
  let owner = "";
  let name = "";
  if (typeof fullName === "string" && fullName.includes("/")) {
    [owner, name] = fullName.split("/", 2);
  } else if (repo.owner && typeof repo.owner === "object" && repo.owner.login) {
    owner = repo.owner.login;
    name = repo.name ?? "";
  } else if (typeof repo.owner === "string") {
    owner = repo.owner;
    name = repo.name ?? "";
  }
  if (!owner || !name) return null;
  return {
    owner,
    repo: name,
    default_branch: repo.default_branch,
    external_repo_id: repo.id != null ? String(repo.id) : undefined,
    remote_url: repo.html_url,
  };
}

function describeSource(s: PotSource): { title: string; subtitle: string | null; url: string | null; avatarUrl: string | null } {
  if (s.source_kind === "repository" && s.provider === "github") {
    const owner = (s.scope.owner as string | undefined) || "";
    const repo = (s.scope.repo as string | undefined) || "";
    const branch = (s.scope.default_branch as string | undefined) || null;
    const remoteUrl = (s.scope.remote_url as string | undefined) || null;
    const url = remoteUrl || (owner && repo ? `https://github.com/${owner}/${repo}` : null);
    const avatarUrl = owner ? `https://avatars.githubusercontent.com/${owner}?s=40` : null;
    return { title: owner && repo ? `${owner}/${repo}` : s.id, subtitle: branch, url, avatarUrl };
  }
  if (s.source_kind === "issue_tracker_team" && s.provider === "linear") {
    const teamName = (s.scope.team_name as string | undefined) || null;
    const teamId = (s.scope.team_id as string | undefined) || null;
    return { title: teamName || teamId || s.id, subtitle: null, url: null, avatarUrl: null };
  }
  return { title: s.id, subtitle: null, url: null, avatarUrl: null };
}

function sourceIcon(s: PotSource) {
  if (s.provider === "linear") return <LinearIcon className="h-4 w-4 text-[#5E6AD2]" />;
  return <GithubIcon className="h-4 w-4 text-foreground" />;
}

function SourceProviderBadge({ s }: { s: PotSource }) {
  if (s.provider === "github") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
        {s.source_kind === "repository" ? "repository" : s.source_kind.replace(/_/g, " ")}
      </span>
    );
  }
  if (s.provider === "linear") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
        <Users className="h-3 w-3" />
        {s.source_kind === "issue_tracker_team" ? "Team" : s.source_kind.replace(/_/g, " ")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground border border-border">
      <GitBranch className="h-3 w-3" />
      {s.provider} / {s.source_kind.replace(/_/g, " ")}
    </span>
  );
}

export default function PotSourcesPanel({ potId, isOwner, onPrimaryRepoChanged }: Props) {
  const [sources, setSources] = useState<PotSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<SourceTypeId | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PotSource | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Connected integrations (used to gate non-GitHub source types).
  const [integrations, setIntegrations] = useState<ConnectedIntegration[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);

  // GitHub picker state
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubHasMore, setGithubHasMore] = useState(false);
  const [githubOffset, setGithubOffset] = useState(0);
  const [githubSearch, setGithubSearch] = useState("");
  const githubSearchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const githubRequestIdRef = useRef(0);
  const [attachingRepoKey, setAttachingRepoKey] = useState<string | null>(null);

  // Linear picker state
  const [linearIntegrationId, setLinearIntegrationId] = useState<string | null>(null);
  const [linearTeams, setLinearTeams] = useState<LinearTeam[]>([]);
  const [linearLoading, setLinearLoading] = useState(false);
  const [attachingTeamId, setAttachingTeamId] = useState<string | null>(null);

  // Manual GitHub fallback
  const [manualOpen, setManualOpen] = useState(false);
  const [manualRepo, setManualRepo] = useState("");
  const [manualBranch, setManualBranch] = useState("");
  const [addingManual, setAddingManual] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await PotService.listSources(potId);
      setSources(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load sources");
    } finally {
      setLoading(false);
    }
  }, [potId]);

  const refreshIntegrations = useCallback(async () => {
    setIntegrationsLoading(true);
    try {
      const data = await IntegrationService.getConnectedIntegrations();
      setIntegrations(data);
    } catch (e) {
      // Non-fatal — just means the Linear option is hidden until connect.
      console.warn("Failed to load integrations", e);
    } finally {
      setIntegrationsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    void refreshIntegrations();
  }, [refresh, refreshIntegrations]);

  const linearIntegrations = useMemo(
    () => integrations.filter((i) => i.type === "linear" && i.status === "active"),
    [integrations]
  );

  const attachedScopeKeys = useMemo(() => {
    const set = new Set<string>();
    sources.forEach((s) => {
      if (s.source_kind === "repository" && s.provider === "github") {
        const owner = (s.scope.owner as string | undefined) || "";
        const repo = (s.scope.repo as string | undefined) || "";
        if (owner && repo) set.add(`gh:${owner.toLowerCase()}/${repo.toLowerCase()}`);
      } else if (s.source_kind === "issue_tracker_team" && s.provider === "linear") {
        const teamId = (s.scope.team_id as string | undefined) || "";
        if (teamId) set.add(`linear:${teamId}`);
      }
    });
    return set;
  }, [sources]);

  // ---- Picker open/close + per-type bootstrapping --------------------

  const clearGithubSearchDebounce = () => {
    if (githubSearchDebounceRef.current) {
      clearTimeout(githubSearchDebounceRef.current);
      githubSearchDebounceRef.current = null;
    }
  };

  const resetGithubPicker = () => {
    clearGithubSearchDebounce();
    githubRequestIdRef.current += 1;
    setGithubSearch("");
    setGithubRepos([]);
    setGithubOffset(0);
    setGithubHasMore(false);
    setGithubLoading(false);
  };

  const openPicker = (typeId: SourceTypeId) => {
    setPickerType(typeId);
    setPickerOpen(true);
    if (typeId === "github_repository") {
      resetGithubPicker();
      void loadGithubPage(true, "");
    } else if (typeId === "linear_team") {
      // Auto-select the only Linear integration if there's exactly one.
      const id =
        linearIntegrations.length === 1
          ? linearIntegrations[0].integration_id
          : null;
      setLinearIntegrationId(id);
      setLinearTeams([]);
      if (id) void loadLinearTeams(id);
    }
  };

  const closePicker = () => {
    setPickerOpen(false);
    setPickerType(null);
    resetGithubPicker();
    setLinearTeams([]);
    setLinearIntegrationId(null);
  };

  const backToTypePicker = () => {
    if (pickerType === "github_repository") {
      resetGithubPicker();
    }
    setPickerType(null);
  };

  useEffect(() => {
    return () => {
      if (githubSearchDebounceRef.current) {
        clearTimeout(githubSearchDebounceRef.current);
      }
      githubRequestIdRef.current += 1;
    };
  }, []);

  // ---- GitHub picker -------------------------------------------------

  const loadGithubPage = async (reset: boolean, searchTerm = githubSearch) => {
    const requestId = githubRequestIdRef.current + 1;
    githubRequestIdRef.current = requestId;
    const trimmedSearch = searchTerm.trim().slice(0, 200);
    setGithubLoading(true);
    try {
      const offset = reset ? 0 : githubOffset;
      const page = await BranchAndRepositoryService.searchUserRepositories({
        search: trimmedSearch,
        limit: GITHUB_REPO_PAGE_SIZE,
        offset,
      });
      if (githubRequestIdRef.current !== requestId) return;
      setGithubRepos((prev) => (reset ? page.repositories : [...prev, ...page.repositories]));
      setGithubHasMore(page.has_next_page);
      setGithubOffset(offset + page.repositories.length);
    } catch {
      if (githubRequestIdRef.current === requestId) {
        toast.error("Failed to fetch GitHub repositories");
      }
    } finally {
      if (githubRequestIdRef.current === requestId) {
        setGithubLoading(false);
      }
    }
  };

  const searchGithubRepos = (value: string) => {
    if (value.length > 200) return;
    setGithubSearch(value);
    clearGithubSearchDebounce();
    githubRequestIdRef.current += 1;
    setGithubLoading(true);
    githubSearchDebounceRef.current = setTimeout(() => {
      void loadGithubPage(true, value.trim());
    }, 350);
  };

  const searchGithubReposNow = () => {
    clearGithubSearchDebounce();
    void loadGithubPage(true, githubSearch.trim());
  };

  const clearGithubSearch = () => {
    clearGithubSearchDebounce();
    setGithubSearch("");
    void loadGithubPage(true, "");
  };

  const handleAttachGithub = async (repo: GithubRepo) => {
    const identity = extractRepoIdentity(repo);
    if (!identity) {
      toast.error("Could not read repository identity.");
      return;
    }
    const key = `${identity.owner}/${identity.repo}`;
    setAttachingRepoKey(key);
    try {
      await PotService.addGithubRepositorySource(potId, identity);
      toast.success(`Attached ${key}`);
      await refresh();
      onPrimaryRepoChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to attach repository");
    } finally {
      setAttachingRepoKey(null);
    }
  };

  const handleManualAdd = async () => {
    const trimmed = manualRepo.trim();
    if (!trimmed.includes("/")) {
      toast.error("Enter repo as owner/repo");
      return;
    }
    const [owner, repo] = trimmed.split("/", 2);
    if (!owner || !repo) {
      toast.error("Enter repo as owner/repo");
      return;
    }
    setAddingManual(true);
    try {
      await PotService.addGithubRepositorySource(potId, {
        owner,
        repo,
        default_branch: manualBranch.trim() || undefined,
      });
      toast.success(`Attached ${owner}/${repo}`);
      setManualRepo("");
      setManualBranch("");
      setManualOpen(false);
      await refresh();
      onPrimaryRepoChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add repository");
    } finally {
      setAddingManual(false);
    }
  };

  // ---- Linear picker -------------------------------------------------

  const loadLinearTeams = async (integrationId: string) => {
    setLinearLoading(true);
    try {
      const teams = await PotService.listLinearTeams(potId, integrationId);
      setLinearTeams(teams);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to fetch Linear teams");
    } finally {
      setLinearLoading(false);
    }
  };

  const handleAttachLinearTeam = async (team: LinearTeam) => {
    if (!linearIntegrationId) return;
    setAttachingTeamId(team.id);
    try {
      await PotService.addLinearTeamSource(potId, {
        integration_id: linearIntegrationId,
        team_id: team.id,
        team_name: team.name,
      });
      toast.success(`Attached ${team.name}`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to attach team");
    } finally {
      setAttachingTeamId(null);
    }
  };

  // ---- Pause / resume / delete --------------------------------------

  const handleTogglePause = async (s: PotSource) => {
    setPendingActionId(s.id);
    const next = !s.sync_enabled;
    try {
      const updated = await PotService.patchSource(potId, s.id, {
        sync_enabled: next,
      });
      setSources((prev) => prev.map((row) => (row.id === s.id ? updated : row)));
      toast.success(next ? "Source resumed" : "Source paused");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update source");
    } finally {
      setPendingActionId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setDeleting(true);
    try {
      await PotService.deleteSource(potId, id);
      setSources((prev) => prev.filter((s) => s.id !== id));
      toast.success("Source removed.");
      onPrimaryRepoChanged();
      setConfirmDelete(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove source");
    } finally {
      setDeleting(false);
    }
  };

  // ---- Render --------------------------------------------------------

  const sourceTypeAvailability = SOURCE_TYPES.map((t) => {
    if (t.alwaysAvailable) return { ...t, available: true, missing: false };
    if (t.requiresIntegrationType === "linear") {
      return { ...t, available: linearIntegrations.length > 0, missing: linearIntegrations.length === 0 };
    }
    return { ...t, available: false, missing: true };
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Sources</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={refresh}>
              <RefreshCcw className="h-3.5 w-3.5" />
            </Button>
            {isOwner ? (
              <Button size="sm" onClick={() => setPickerOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add source
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : sources.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No sources attached yet. Add a GitHub repo or Linear team to start ingestion.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sources.map((s) => {
                const { title, subtitle, url, avatarUrl } = describeSource(s);
                const paused = !s.sync_enabled;
                return (
                  <div
                    key={s.id}
                    className="group flex flex-col rounded-xl border border-border bg-card hover:border-border/80 hover:shadow-sm transition-all"
                  >
                    {/* Card body */}
                    <div className="flex-1 px-4 pt-4 pb-3 space-y-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {avatarUrl ? (
                          <span className="relative inline-flex shrink-0 items-center w-7 h-5">
                            <span className="absolute left-0 text-muted-foreground z-0">{sourceIcon(s)}</span>
                            <img
                              src={avatarUrl}
                              alt=""
                              className="absolute left-2 h-5 w-5 rounded-full border-2 border-background z-10"
                            />
                          </span>
                        ) : (
                          <span className="shrink-0 text-muted-foreground">{sourceIcon(s)}</span>
                        )}
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate text-sm font-semibold leading-tight hover:underline"
                          >
                            {title}
                          </a>
                        ) : (
                          <span className="truncate text-sm font-semibold leading-tight">{title}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 items-center">
                        <SourceProviderBadge s={s} />
                        {subtitle ? (
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            {subtitle}
                          </Badge>
                        ) : null}
                        {paused ? (
                          <Badge variant="outline" className="text-[10px] font-normal text-amber-600 border-amber-300 bg-amber-50">
                            Paused
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-muted-foreground/70 leading-tight">
                        {s.last_sync_at
                          ? `Synced ${new Date(s.last_sync_at).toLocaleString()}`
                          : "No sync yet"}
                        {s.last_error ? (
                          <span className="text-destructive"> · {s.last_error}</span>
                        ) : null}
                      </p>
                    </div>
                    {/* Card footer */}
                    {isOwner ? (
                      <div className="flex items-center justify-end gap-1 px-3 py-2 border-t border-border/50 bg-muted/20 rounded-b-xl">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          disabled={pendingActionId === s.id}
                          onClick={() => handleTogglePause(s)}
                          title={paused ? "Resume" : "Pause"}
                        >
                          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setConfirmDelete(s)}
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add source dialog — type picker + per-type scope picker */}
      <Dialog
        open={pickerOpen}
        onOpenChange={(open) => (open ? setPickerOpen(true) : closePicker())}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {pickerType === "github_repository"
                ? "Add GitHub repository"
                : pickerType === "linear_team"
                  ? "Add Linear team"
                  : "Add source"}
            </DialogTitle>
          </DialogHeader>

          {pickerType === null ? (
            <div className="space-y-2 py-2">
              <p className="text-xs text-muted-foreground">
                Choose a source type. Source types come from{" "}
                <Link href="/integrations" className="underline text-primary">
                  your integrations
                </Link>
                .
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sourceTypeAvailability.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={!t.available || integrationsLoading}
                    onClick={() => openPicker(t.id)}
                    className="text-left rounded-lg border border-border/60 p-3 hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <div className="flex items-center gap-2">
                      {t.icon}
                      <span className="text-sm font-medium">{t.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                    {!t.available && t.missing ? (
                      <p className="mt-1 text-[11px] text-amber-600">
                        Connect {t.label.split(" ")[0]} on the{" "}
                        <Link
                          href="/integrations"
                          className="underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          integrations page
                        </Link>{" "}
                        first.
                      </p>
                    ) : null}
                  </button>
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    closePicker();
                    setManualOpen(true);
                  }}
                >
                  Add manually (owner/repo)
                </Button>
              </div>
            </div>
          ) : pickerType === "github_repository" ? (
            <div className="space-y-3 py-2">
              <div className="max-h-96 flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200">
                  <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                  <Input
                    placeholder="Search repositories..."
                    value={githubSearch}
                    onChange={(e) => searchGithubRepos(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") searchGithubReposNow();
                    }}
                    maxLength={200}
                    className="flex-1 h-8 text-[10px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent px-0"
                  />
                  {githubSearch.trim() ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-4 w-4 rounded-full hover:bg-zinc-100"
                      onClick={clearGithubSearch}
                      aria-label="Clear repository search"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  ) : null}
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 p-2">
                  {githubLoading ? (
                    <div className="p-7 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2.5 text-zinc-400" />
                      <p className="text-[10px] text-zinc-500">
                        {githubSearch.trim() ? "Searching repositories..." : "Loading repositories..."}
                      </p>
                    </div>
                  ) : githubRepos.length === 0 ? (
                    <div className="p-7 text-center">
                      <FolderOpen className="h-9 w-9 mx-auto mb-2.5 text-zinc-300" />
                      <p className="text-[10px] font-medium text-foreground mb-1">
                        {githubSearch.trim()
                          ? `No repositories found matching '${githubSearch.trim()}'`
                          : "No parsed repositories found"}
                      </p>
                      <p className="text-[9px] text-zinc-400">
                        {githubSearch.trim() ? "Try a different search term" : "Parse a repository to get started"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {githubRepos.map((repo, idx) => {
                        const identity = extractRepoIdentity(repo);
                        if (!identity) return null;
                        const key = `${identity.owner}/${identity.repo}`;
                        const alreadyAttached = attachedScopeKeys.has(`gh:${key.toLowerCase()}`);
                        return (
                          <div
                            key={`${key}-${idx}`}
                            className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 hover:bg-zinc-50"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[10px] font-medium text-foreground">{key}</p>
                              {identity.default_branch ? (
                                <p className="text-[9px] text-zinc-400 mt-0.5 truncate">
                                  default: {identity.default_branch}
                                </p>
                              ) : null}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 shrink-0 border border-zinc-200 bg-white text-[10px] hover:bg-zinc-50"
                              disabled={alreadyAttached || attachingRepoKey === key}
                              onClick={() => handleAttachGithub(repo)}
                            >
                              {alreadyAttached
                                ? "Attached"
                                : attachingRepoKey === key
                                  ? "Adding…"
                                  : "Attach"}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {githubHasMore ? (
                  <div className="border-t border-zinc-100 bg-white p-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={githubLoading}
                      onClick={() => loadGithubPage(false, githubSearch)}
                      className="h-7 w-full gap-1.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-50"
                    >
                      <Plus className="h-3 w-3" />
                      Load more
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : pickerType === "linear_team" ? (
            <div className="space-y-3 py-2">
              {linearIntegrations.length > 1 ? (
                <div className="space-y-1">
                  <Label>Linear workspace</Label>
                  <Select
                    value={linearIntegrationId ?? undefined}
                    onValueChange={(v) => {
                      setLinearIntegrationId(v);
                      void loadLinearTeams(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a Linear workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      {linearIntegrations.map((i) => (
                        <SelectItem key={i.integration_id} value={i.integration_id}>
                          {i.instanceName || i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="max-h-96 overflow-y-auto space-y-1 border border-border/60 rounded-lg p-2">
                {linearLoading ? (
                  <p className="text-xs text-muted-foreground px-2 py-2">Loading teams…</p>
                ) : linearTeams.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic px-2 py-4">
                    {linearIntegrationId
                      ? "No teams found in this workspace."
                      : "Pick a Linear workspace above to load teams."}
                  </p>
                ) : (
                  linearTeams.map((team) => {
                    const alreadyAttached = attachedScopeKeys.has(`linear:${team.id}`);
                    return (
                      <div
                        key={team.id}
                        className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{team.name}</p>
                          {team.key ? (
                            <p className="text-[11px] text-muted-foreground">{team.key}</p>
                          ) : null}
                        </div>
                        <Button
                          size="sm"
                          variant={alreadyAttached ? "ghost" : "outline"}
                          disabled={alreadyAttached || attachingTeamId === team.id}
                          onClick={() => handleAttachLinearTeam(team)}
                        >
                          {alreadyAttached
                            ? "Attached"
                            : attachingTeamId === team.id
                              ? "Adding…"
                              : "Attach"}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            {pickerType !== null ? (
              <Button variant="ghost" onClick={backToTypePicker}>
                Back
              </Button>
            ) : null}
            <Button variant="outline" onClick={closePicker}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual repo entry */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add repository manually</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Repository (owner/repo)</Label>
              <Input
                placeholder="acme/my-service"
                value={manualRepo}
                onChange={(e) => setManualRepo(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Default branch (optional)</Label>
              <Input
                placeholder="main"
                value={manualBranch}
                onChange={(e) => setManualBranch(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleManualAdd} disabled={addingManual}>
              {addingManual ? "Adding…" : "Attach"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => (!open ? setConfirmDelete(null) : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove source?</DialogTitle>
          </DialogHeader>
          {confirmDelete ? (
            <div className="space-y-2 py-2 text-sm">
              <p>
                You&apos;re about to remove{" "}
                <strong>{describeSource(confirmDelete).title}</strong> from this pot.
              </p>
              <p className="text-xs text-muted-foreground">
                Ingestion from this source will stop. Already-ingested data is kept.
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
