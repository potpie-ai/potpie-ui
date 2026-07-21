"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ChevronRight,
  FolderGit2,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  Search,
  SquareKanban,
  Star,
  Trash2,
} from "lucide-react";

import PotService, { PotSource } from "@/services/PotService";
import BranchAndRepositoryService from "@/services/BranchAndRepositoryService";
import IntegrationService, {
  ConnectedIntegration,
} from "@/services/IntegrationService";
import {
  getDemoConnectedIntegrations,
  isDemoPotId,
} from "@/lib/mock/demoPots";
import {
  EmptyState,
  MonoChip,
  PageHeader,
  StatusDot,
  type StatusTone,
} from "@/app/(main)/pots/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { cn } from "@/lib/utils";

type Props = {
  potId: string;
  isOwner: boolean;
  onPrimaryRepoChanged: () => void;
  /** "owner/repo" of the pot's primary repository, if any (display only). */
  primaryRepoName?: string | null;
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
  icon: LucideIcon;
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
    icon: FolderGit2,
    alwaysAvailable: true,
  },
  {
    id: "linear_team",
    provider: "linear",
    label: "Linear team",
    description: "Pull issues from a team in your Linear workspace.",
    icon: SquareKanban,
    requiresIntegrationType: "linear",
  },
];

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

function describeSource(s: PotSource): {
  title: string;
  ref: string | null;
  url: string | null;
} {
  if (s.source_kind === "repository" && s.provider === "github") {
    const owner = (s.scope.owner as string | undefined) || "";
    const repo = (s.scope.repo as string | undefined) || "";
    const branch = (s.scope.default_branch as string | undefined) || null;
    const remoteUrl = (s.scope.remote_url as string | undefined) || null;
    const url =
      remoteUrl ||
      (owner && repo ? `https://github.com/${owner}/${repo}` : null);
    return { title: owner && repo ? `${owner}/${repo}` : s.id, ref: branch, url };
  }
  if (s.source_kind === "issue_tracker_team" && s.provider === "linear") {
    const teamName = (s.scope.team_name as string | undefined) || null;
    const teamId = (s.scope.team_id as string | undefined) || null;
    return { title: teamName || teamId || s.id, ref: null, url: null };
  }
  return { title: s.id, ref: null, url: null };
}

function sourceKindIcon(s: PotSource): LucideIcon {
  if (s.source_kind === "issue_tracker_team") return SquareKanban;
  return FolderGit2;
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const minutes = Math.floor((Date.now() - then) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function syncStatus(s: PotSource): {
  tone: StatusTone;
  label: string;
  detail?: string;
} {
  if (s.last_error) {
    return { tone: "error", label: "Sync failed", detail: s.last_error };
  }
  if (!s.sync_enabled) {
    return { tone: "idle", label: "Paused" };
  }
  if (s.last_sync_at) {
    return {
      tone: "ok",
      label: `Synced ${formatRelativeTime(s.last_sync_at)}`,
      detail: new Date(s.last_sync_at).toLocaleString(),
    };
  }
  return { tone: "warn", label: "Waiting for first sync" };
}

function PrimaryChip() {
  return (
    <span
      title="Primary repository for this pot"
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
    >
      <Star className="h-2.5 w-2.5 fill-current" />
      Primary
    </span>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <Skeleton className="h-4 w-4 rounded bg-muted" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-52 max-w-full bg-muted" />
        <Skeleton className="h-3 w-32 bg-muted" />
      </div>
    </div>
  );
}

function DialogRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-44 max-w-full bg-muted" />
        <Skeleton className="h-3 w-24 bg-muted" />
      </div>
      <Skeleton className="h-8 w-16 bg-muted" />
    </div>
  );
}

export default function PotSourcesPanel({
  potId,
  isOwner,
  onPrimaryRepoChanged,
  primaryRepoName,
}: Props) {
  const [sources, setSources] = useState<PotSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
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
      setLoadFailed(false);
    } catch (e) {
      setLoadFailed(true);
      toast.error(e instanceof Error ? e.message : "Failed to load sources");
    } finally {
      setLoading(false);
    }
  }, [potId]);

  const refreshIntegrations = useCallback(async () => {
    setIntegrationsLoading(true);
    // Demo pots never touch the backend — resolve to synthetic connections so
    // the add-source picker stays consistent with the demo's attached sources.
    if (isDemoPotId(potId)) {
      setIntegrations(getDemoConnectedIntegrations(potId));
      setIntegrationsLoading(false);
      return;
    }
    try {
      const data = await IntegrationService.getConnectedIntegrations();
      setIntegrations(data);
    } catch (e) {
      // Non-fatal — just means the Linear option is hidden until connect.
      console.warn("Failed to load integrations", e);
    } finally {
      setIntegrationsLoading(false);
    }
  }, [potId]);

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

  // Quiet grouping by source kind — headers only when more than one kind
  // is actually attached.
  const sourceGroups = useMemo(() => {
    const groups: { key: string; label: string; items: PotSource[] }[] = [
      {
        key: "repositories",
        label: "Repositories",
        items: sources.filter((s) => s.source_kind === "repository"),
      },
      {
        key: "trackers",
        label: "Issue trackers",
        items: sources.filter((s) => s.source_kind === "issue_tracker_team"),
      },
      {
        key: "other",
        label: "Other sources",
        items: sources.filter(
          (s) =>
            s.source_kind !== "repository" &&
            s.source_kind !== "issue_tracker_team"
        ),
      },
    ];
    return groups.filter((g) => g.items.length > 0);
  }, [sources]);

  // ---- Picker open/close + per-type bootstrapping --------------------

  const openPicker = (typeId: SourceTypeId) => {
    setPickerType(typeId);
    setPickerOpen(true);
    if (typeId === "github_repository") {
      void loadGithubPage(true);
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
    setGithubSearch("");
    setGithubRepos([]);
    setGithubOffset(0);
    setGithubHasMore(false);
    setLinearTeams([]);
    setLinearIntegrationId(null);
  };

  // ---- GitHub picker -------------------------------------------------

  const loadGithubPage = async (reset: boolean) => {
    setGithubLoading(true);
    try {
      const offset = reset ? 0 : githubOffset;
      const page = await BranchAndRepositoryService.searchUserRepositories({
        search: githubSearch,
        limit: 20,
        offset,
      });
      setGithubRepos((prev) => (reset ? page.repositories : [...prev, ...page.repositories]));
      setGithubHasMore(page.has_next_page);
      setGithubOffset(offset + page.repositories.length);
    } catch {
      toast.error("Failed to fetch GitHub repositories");
    } finally {
      setGithubLoading(false);
    }
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

  const renderSourceRow = (s: PotSource) => {
    const { title, ref, url } = describeSource(s);
    const Icon = sourceKindIcon(s);
    const status = syncStatus(s);
    const isPrimary =
      Boolean(primaryRepoName) &&
      s.source_kind === "repository" &&
      title.toLowerCase() === (primaryRepoName as string).toLowerCase();
    const pending = pendingActionId === s.id;
    const paused = !s.sync_enabled;
    return (
      <div key={s.id} className="group flex items-center gap-3 py-3.5">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                title={title}
                className="truncate text-sm font-medium hover:underline"
              >
                {title}
              </a>
            ) : (
              <span className="truncate text-sm font-medium" title={title}>
                {title}
              </span>
            )}
            {ref ? <MonoChip className="shrink-0">{ref}</MonoChip> : null}
            {isPrimary ? <PrimaryChip /> : null}
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            <StatusDot tone={status.tone} />
            <span
              title={status.detail}
              className={cn(
                "truncate text-[13px] text-muted-foreground",
                status.tone === "error" && "text-rose-600 dark:text-rose-400"
              )}
            >
              {status.label}
              {status.tone === "error" && status.detail
                ? ` · ${status.detail}`
                : null}
            </span>
          </div>
        </div>
        {isOwner ? (
          <div
            className={cn(
              "flex shrink-0 items-center gap-1 transition-opacity",
              "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100",
              pending && "[@media(hover:hover)]:opacity-100"
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              disabled={pending}
              onClick={() => handleTogglePause(s)}
              title={paused ? "Resume sync" : "Pause sync"}
              aria-label={paused ? "Resume sync" : "Pause sync"}
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmDelete(s)}
              title="Remove source"
              aria-label="Remove source"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sources"
        description="Repositories and trackers this pot ingests context from."
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => void refresh()}
              title="Refresh sources"
              aria-label="Refresh sources"
            >
              <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            {isOwner ? (
              <Button size="sm" onClick={() => setPickerOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add source
              </Button>
            ) : null}
          </>
        }
      />

      {loading ? (
        <div className="divide-y divide-border/60 border-t border-border/70">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </div>
      ) : loadFailed && sources.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="Couldn't load sources"
          description="Something went wrong while fetching this pot's sources. Try again in a moment."
        >
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Try again
          </Button>
        </EmptyState>
      ) : sources.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title="No sources yet"
          description="Attach a GitHub repository or a Linear team and this pot will start ingesting context from it."
        >
          {isOwner ? (
            <Button size="sm" onClick={() => setPickerOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add your first source
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {sourceGroups.map((group) => (
            <div key={group.key}>
              {sourceGroups.length > 1 ? (
                <p className="border-b border-border/70 pb-2 text-[13px] font-medium text-muted-foreground">
                  {group.label}
                </p>
              ) : null}
              <div
                className={cn(
                  "divide-y divide-border/60",
                  sourceGroups.length === 1 && "border-t border-border/70"
                )}
              >
                {group.items.map(renderSourceRow)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add source dialog — type picker + per-type scope picker */}
      <Dialog
        open={pickerOpen}
        onOpenChange={(open) => (open ? setPickerOpen(true) : closePicker())}
      >
        <DialogContent className="pot-theme max-w-2xl">
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
            <div className="py-1">
              <p className="text-[13px] text-muted-foreground">
                Pick where this pot should ingest context from. More source
                types unlock as you connect{" "}
                <Link
                  href="/integrations"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  integrations
                </Link>
                .
              </p>
              <div className="mt-3 divide-y divide-border/60">
                {sourceTypeAvailability.map((t) => {
                  const TypeIcon = t.icon;
                  if (!t.available && t.missing) {
                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 py-3 opacity-70"
                      >
                        <TypeIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{t.label}</p>
                          <p className="text-[13px] text-muted-foreground">
                            Connect {t.label.split(" ")[0]} on the{" "}
                            <Link
                              href="/integrations"
                              className="underline underline-offset-2 hover:text-foreground"
                            >
                              integrations page
                            </Link>{" "}
                            first.
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={!t.available || integrationsLoading}
                      onClick={() => openPicker(t.id)}
                      className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      <TypeIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{t.label}</p>
                        <p className="text-[13px] text-muted-foreground">
                          {t.description}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  closePicker();
                  setManualOpen(true);
                }}
                className="mt-3 text-[13px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
              >
                Or add a repository manually (owner/repo)
              </button>
            </div>
          ) : pickerType === "github_repository" ? (
            <div className="space-y-3 py-1">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-9 pl-8"
                    placeholder="Search your repositories"
                    value={githubSearch}
                    onChange={(e) => setGithubSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void loadGithubPage(true);
                    }}
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadGithubPage(true)}
                >
                  Search
                </Button>
              </div>
              <div className="max-h-80 overflow-y-auto border-y border-border/60">
                <div className="divide-y divide-border/60">
                  {githubRepos.map((repo, idx) => {
                    const identity = extractRepoIdentity(repo);
                    if (!identity) return null;
                    const key = `${identity.owner}/${identity.repo}`;
                    const alreadyAttached = attachedScopeKeys.has(`gh:${key.toLowerCase()}`);
                    return (
                      <div
                        key={`${key}-${idx}`}
                        className="flex items-center gap-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium" title={key}>
                            {key}
                          </p>
                          {identity.default_branch ? (
                            <MonoChip className="mt-1">
                              {identity.default_branch}
                            </MonoChip>
                          ) : null}
                        </div>
                        <Button
                          size="sm"
                          variant={alreadyAttached ? "ghost" : "outline"}
                          className="h-8"
                          disabled={alreadyAttached || attachingRepoKey === key}
                          onClick={() => handleAttachGithub(repo)}
                        >
                          {alreadyAttached
                            ? "Attached"
                            : attachingRepoKey === key
                              ? "Attaching…"
                              : "Attach"}
                        </Button>
                      </div>
                    );
                  })}
                  {githubLoading ? (
                    <>
                      <DialogRowSkeleton />
                      <DialogRowSkeleton />
                      <DialogRowSkeleton />
                    </>
                  ) : null}
                </div>
                {githubRepos.length === 0 && !githubLoading ? (
                  <p className="py-8 text-center text-[13px] text-muted-foreground">
                    No matching repositories.
                  </p>
                ) : null}
              </div>
              {githubHasMore ? (
                <div className="flex justify-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={githubLoading}
                    onClick={() => loadGithubPage(false)}
                  >
                    Load more
                  </Button>
                </div>
              ) : null}
            </div>
          ) : pickerType === "linear_team" ? (
            <div className="space-y-3 py-1">
              {linearIntegrations.length > 1 ? (
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Linear workspace</Label>
                  <Select
                    value={linearIntegrationId ?? undefined}
                    onValueChange={(v) => {
                      setLinearIntegrationId(v);
                      void loadLinearTeams(v);
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Pick a Linear workspace" />
                    </SelectTrigger>
                    <SelectContent className="pot-theme">
                      {linearIntegrations.map((i) => (
                        <SelectItem key={i.integration_id} value={i.integration_id}>
                          {i.instanceName || i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="max-h-80 overflow-y-auto border-y border-border/60">
                {linearLoading ? (
                  <div className="divide-y divide-border/60">
                    <DialogRowSkeleton />
                    <DialogRowSkeleton />
                    <DialogRowSkeleton />
                  </div>
                ) : linearTeams.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-muted-foreground">
                    {linearIntegrationId
                      ? "No teams found in this workspace."
                      : "Pick a Linear workspace above to load teams."}
                  </p>
                ) : (
                  <div className="divide-y divide-border/60">
                    {linearTeams.map((team) => {
                      const alreadyAttached = attachedScopeKeys.has(`linear:${team.id}`);
                      return (
                        <div
                          key={team.id}
                          className="flex items-center gap-3 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate text-sm font-medium"
                              title={team.name}
                            >
                              {team.name}
                            </p>
                            {team.key ? (
                              <MonoChip className="mt-1">{team.key}</MonoChip>
                            ) : null}
                          </div>
                          <Button
                            size="sm"
                            variant={alreadyAttached ? "ghost" : "outline"}
                            className="h-8"
                            disabled={alreadyAttached || attachingTeamId === team.id}
                            onClick={() => handleAttachLinearTeam(team)}
                          >
                            {alreadyAttached
                              ? "Attached"
                              : attachingTeamId === team.id
                                ? "Attaching…"
                                : "Attach"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            {pickerType !== null ? (
              <Button variant="ghost" onClick={() => setPickerType(null)}>
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
        <DialogContent className="pot-theme">
          <DialogHeader>
            <DialogTitle>Add repository manually</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-[13px] text-muted-foreground">
              Use this if the repository doesn&apos;t show up in the picker.
            </p>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Repository (owner/repo)</Label>
              <Input
                className="h-9"
                placeholder="acme/my-service"
                value={manualRepo}
                onChange={(e) => setManualRepo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Default branch (optional)</Label>
              <Input
                className="h-9"
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
              {addingManual ? "Attaching…" : "Attach"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => (!open ? setConfirmDelete(null) : null)}
      >
        <DialogContent className="pot-theme">
          <DialogHeader>
            <DialogTitle>Remove source?</DialogTitle>
          </DialogHeader>
          {confirmDelete ? (
            <div className="space-y-2 py-1 text-sm">
              <p>
                You&apos;re about to remove{" "}
                <span className="font-medium">
                  {describeSource(confirmDelete).title}
                </span>{" "}
                from this pot.
              </p>
              <p className="text-[13px] text-muted-foreground">
                Ingestion from this source will stop. Already-ingested data is
                kept.
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
