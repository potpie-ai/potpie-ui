"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  ChangeEvent,
  FC,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import {
  AdminAuthError,
  fetchAdminSummary,
  fetchAdminVotes,
} from "../api";
import type {
  AdminSummary,
  AdminVoteRow,
  ComparisonStats,
  ModelCounts,
} from "../types";

// chart.js + react-chartjs-2 are client-only and ~150kB combined; dynamic
// import keeps them off the initial bundle for the password gate.
const FeedbackCharts = dynamic(
  () => import("./FeedbackCharts").then((mod) => mod.FeedbackCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[280px] w-full place-items-center rounded-2xl border border-border-light bg-card text-sm text-muted-text animate-pulse">
        Loading charts...
      </div>
    ),
  },
);

const PASSWORD_STORAGE_KEY = "potpie-feedback-admin-password";

const BrandHeader: FC<{ right?: React.ReactNode }> = ({ right }) => (
  <div className="border-b border-border-light bg-background/80 backdrop-blur sticky top-0 z-10">
    <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 py-4">
      <Link href="/feedback" className="flex items-center gap-3 min-w-0">
        <Image
          src="/images/Logomark.svg"
          alt="Potpie"
          width={110}
          height={28}
          priority
          className="h-7 w-auto object-contain object-left"
        />
        <span className="hidden text-xs font-medium uppercase tracking-[0.18em] text-muted-text sm:inline">
          Eval &middot; Dashboard
        </span>
      </Link>
      {right ?? null}
    </div>
  </div>
);

const PasswordGate: FC<{
  onAuthenticated: (password: string) => void;
}> = ({ onAuthenticated }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = password.trim();
    if (!trimmed) {
      setError("Password is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await fetchAdminSummary(trimmed);
      onAuthenticated(trimmed);
    } catch (err) {
      if (err instanceof AdminAuthError) {
        setError("Wrong password.");
      } else {
        setError(err instanceof Error ? err.message : "Sign-in failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-16 w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500 px-6">
      <div className="rounded-2xl border border-border-light bg-card p-8 shadow-[0_18px_40px_-24px_rgba(2,45,44,0.18)]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image
            src="/images/Logomark.svg"
            alt="Potpie"
            width={132}
            height={32}
            priority
            className="h-8 w-auto object-contain"
          />
          <h1
            className="mt-1 text-xl font-semibold tracking-tight text-foreground-color"
            style={{ fontFamily: "var(--font-uncut)" }}
          >
            Eval dashboard
          </h1>
          <p className="text-sm text-muted-text">
            Enter the admin password to view collected votes.
          </p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="admin-password" className="text-foreground-color">
              Password
            </Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
              autoFocus
              className="bg-card"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-600 animate-in fade-in slide-in-from-top-1">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 disabled:opacity-50"
          >
            {busy ? "Checking..." : "Unlock dashboard"}
          </Button>
        </form>
      </div>
    </div>
  );
};

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "potpie" | "copilot" | "tie" | "neither" | "neutral";
};

const accentClasses: Record<NonNullable<StatCardProps["accent"]>, string> = {
  potpie: "ring-1 ring-primary/20 bg-primary/[0.04]",
  copilot: "ring-1 ring-amber-300/40 bg-amber-50/60",
  tie: "ring-1 ring-blue-300/40 bg-blue-50/60",
  neither: "ring-1 ring-rose-300/40 bg-rose-50/50",
  neutral: "ring-1 ring-border-light bg-card",
};

const StatCard: FC<StatCardProps> = ({ label, value, hint, accent = "neutral" }) => (
  <div
    className={cn(
      "rounded-2xl border border-border-light p-5 transition-all duration-200 hover:shadow-[0_18px_36px_-22px_rgba(2,45,44,0.18)]",
      accentClasses[accent],
    )}
  >
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-text">
      {label}
    </p>
    <p
      className="mt-2 text-3xl font-semibold text-foreground-color"
      style={{ fontFamily: "var(--font-uncut)" }}
    >
      {value}
    </p>
    {hint ? <p className="mt-1 text-xs text-muted-text">{hint}</p> : null}
  </div>
);

const percentage = (part: number, total: number): string => {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
};

const BreakdownBar: FC<{ counts: ModelCounts }> = ({ counts }) => {
  const total = counts.total || 1;
  const segments = [
    { key: "potpie", val: counts.potpie, color: "bg-primary" },
    { key: "copilot", val: counts.copilot, color: "bg-amber-400" },
    { key: "tie", val: counts.tie, color: "bg-blue-400" },
    { key: "neither", val: counts.neither, color: "bg-rose-400" },
  ];
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      {segments.map((seg) =>
        seg.val ? (
          <div
            key={seg.key}
            className={cn(seg.color, "h-full transition-all duration-500")}
            style={{ width: `${(seg.val / total) * 100}%` }}
            title={`${seg.key}: ${seg.val}`}
          />
        ) : null,
      )}
    </div>
  );
};

const PerComparisonTable: FC<{ rows: ComparisonStats[] }> = ({ rows }) => (
  <div className="overflow-hidden rounded-2xl border border-border-light bg-card">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border-light bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-text">
          <th className="px-4 py-3">Question</th>
          <th className="px-3 py-3 text-right">Potpie</th>
          <th className="px-3 py-3 text-right">Copilot</th>
          <th className="px-3 py-3 text-right">Tie</th>
          <th className="px-3 py-3 text-right">Neither</th>
          <th className="px-3 py-3 text-right">Total</th>
          <th className="px-3 py-3 text-right">Avg conf.</th>
          <th className="px-4 py-3 w-32">Mix</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.comparison_id}
            className="border-b border-border-light/60 last:border-0 hover:bg-muted/30 transition-colors"
          >
            <td className="px-4 py-3 align-top text-foreground-color">
              <div className="line-clamp-2 max-w-[320px] text-[13px] leading-snug">
                {row.question}
              </div>
              <div className="mt-1 text-[11px] text-muted-text">
                {row.comparison_id}
              </div>
            </td>
            <td className="px-3 py-3 text-right">
              <span className="font-medium text-foreground-color">
                {row.counts.potpie}
              </span>
              <span className="ml-1 text-[11px] text-muted-text">
                {percentage(row.counts.potpie, row.counts.total)}
              </span>
            </td>
            <td className="px-3 py-3 text-right">
              <span className="font-medium text-foreground-color">
                {row.counts.copilot}
              </span>
              <span className="ml-1 text-[11px] text-muted-text">
                {percentage(row.counts.copilot, row.counts.total)}
              </span>
            </td>
            <td className="px-3 py-3 text-right text-foreground-color">
              {row.counts.tie}
            </td>
            <td className="px-3 py-3 text-right text-foreground-color">
              {row.counts.neither}
            </td>
            <td className="px-3 py-3 text-right font-medium text-foreground-color">
              {row.counts.total}
            </td>
            <td className="px-3 py-3 text-right text-muted-text">
              {row.avg_confidence == null ? "—" : row.avg_confidence.toFixed(2)}
            </td>
            <td className="px-4 py-3 align-middle">
              <BreakdownBar counts={row.counts} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

const modelPillClass = (model: string): string => {
  switch (model) {
    case "potpie":
      return "bg-primary/15 text-primary";
    case "copilot":
      return "bg-amber-100 text-amber-800";
    case "tie":
      return "bg-blue-100 text-blue-800";
    case "neither":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-muted text-muted-text";
  }
};

type VotesFilters = {
  voter: string;
  role: string;
  comparison: string;
  chosenModel: string;
  confidence: string;
  reason: string;
  comment: string; // "any" | "yes" | "no"
};

const DEFAULT_VOTE_FILTERS: VotesFilters = {
  voter: "",
  role: "all",
  comparison: "all",
  chosenModel: "all",
  confidence: "all",
  reason: "all",
  comment: "any",
};

const filterControlClass = cn(
  "h-7 w-full rounded-md border border-border-light bg-card px-2 text-[11px]",
  "text-foreground-color placeholder:text-muted-text",
  "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40",
);

const VotesTable: FC<{ rows: AdminVoteRow[] }> = ({ rows }) => {
  const [filters, setFilters] = useState<VotesFilters>(DEFAULT_VOTE_FILTERS);

  const updateFilter = useCallback(
    <K extends keyof VotesFilters>(key: K, value: VotesFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetFilters = useCallback(() => setFilters(DEFAULT_VOTE_FILTERS), []);

  // Build option lists from the data itself so filters only offer values that
  // actually appear in the loaded rows.
  const { roleOptions, comparisonOptions, reasonOptions } = useMemo(() => {
    const roles = new Set<string>();
    const comps = new Set<string>();
    const reasons = new Set<string>();
    for (const row of rows) {
      if (row.voter_role) roles.add(row.voter_role);
      comps.add(row.comparison_id);
      for (const tag of row.reason_tags ?? []) reasons.add(tag);
    }
    return {
      roleOptions: Array.from(roles).sort(),
      comparisonOptions: Array.from(comps).sort(),
      reasonOptions: Array.from(reasons).sort(),
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const voterNeedle = filters.voter.trim().toLowerCase();
    return rows.filter((row) => {
      if (voterNeedle) {
        const haystack = `${row.voter_name} ${row.voter_email}`.toLowerCase();
        if (!haystack.includes(voterNeedle)) return false;
      }
      if (filters.role !== "all" && (row.voter_role ?? "") !== filters.role) {
        return false;
      }
      if (
        filters.comparison !== "all" &&
        row.comparison_id !== filters.comparison
      ) {
        return false;
      }
      if (filters.chosenModel !== "all" && row.chosen_model !== filters.chosenModel) {
        return false;
      }
      if (filters.confidence !== "all") {
        const wanted = Number(filters.confidence);
        if (row.confidence !== wanted) return false;
      }
      if (filters.reason !== "all") {
        const tags = row.reason_tags ?? [];
        if (!tags.includes(filters.reason)) return false;
      }
      if (filters.comment === "yes" && !row.comment?.trim()) return false;
      if (filters.comment === "no" && !!row.comment?.trim()) return false;
      return true;
    });
  }, [rows, filters]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.voter.trim()) n += 1;
    if (filters.role !== "all") n += 1;
    if (filters.comparison !== "all") n += 1;
    if (filters.chosenModel !== "all") n += 1;
    if (filters.confidence !== "all") n += 1;
    if (filters.reason !== "all") n += 1;
    if (filters.comment !== "any") n += 1;
    return n;
  }, [filters]);

  return (
    <>
      <div className="mb-2 flex items-center justify-between text-[11px] text-muted-text">
        <span>
          Showing <strong className="text-foreground-color">{filteredRows.length}</strong>{" "}
          of {rows.length} votes
          {activeFilterCount ? ` · ${activeFilterCount} active filter${
            activeFilterCount === 1 ? "" : "s"
          }` : ""}
        </span>
        {activeFilterCount ? (
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-full border border-border-light bg-card px-2.5 py-0.5 font-medium text-muted-text transition-colors hover:border-primary/40 hover:text-foreground-color"
          >
            Clear filters
          </button>
        ) : null}
      </div>
      <div className="overflow-auto rounded-2xl border border-border-light bg-card max-h-[60vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_var(--border-light)]">
            <tr className="border-b border-border-light bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-text">
              <th className="px-4 py-3">Submitted</th>
              <th className="px-3 py-3">Voter</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Question</th>
              <th className="px-3 py-3">Chose</th>
              <th className="px-3 py-3 text-center">Conf.</th>
              <th className="px-3 py-3">Reasons</th>
              <th className="px-4 py-3">Comment</th>
            </tr>
            <tr className="border-b border-border-light bg-muted/30 align-top">
              <th className="px-4 py-2">
                <span className="text-[10px] text-muted-text">—</span>
              </th>
              <th className="px-3 py-2 min-w-[160px]">
                <input
                  type="text"
                  placeholder="Search name / email"
                  value={filters.voter}
                  onChange={(event) =>
                    updateFilter("voter", event.target.value)
                  }
                  className={filterControlClass}
                />
              </th>
              <th className="px-3 py-2 min-w-[120px]">
                <select
                  value={filters.role}
                  onChange={(event) => updateFilter("role", event.target.value)}
                  className={filterControlClass}
                >
                  <option value="all">All roles</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </th>
              <th className="px-3 py-2 min-w-[180px]">
                <select
                  value={filters.comparison}
                  onChange={(event) =>
                    updateFilter("comparison", event.target.value)
                  }
                  className={filterControlClass}
                >
                  <option value="all">All questions</option>
                  {comparisonOptions.map((cid) => (
                    <option key={cid} value={cid}>
                      {cid}
                    </option>
                  ))}
                </select>
              </th>
              <th className="px-3 py-2 min-w-[120px]">
                <select
                  value={filters.chosenModel}
                  onChange={(event) =>
                    updateFilter("chosenModel", event.target.value)
                  }
                  className={filterControlClass}
                >
                  <option value="all">All</option>
                  <option value="potpie">Potpie</option>
                  <option value="copilot">Copilot</option>
                  <option value="tie">Tie</option>
                  <option value="neither">Neither</option>
                </select>
              </th>
              <th className="px-3 py-2 min-w-[90px]">
                <select
                  value={filters.confidence}
                  onChange={(event) =>
                    updateFilter("confidence", event.target.value)
                  }
                  className={filterControlClass}
                >
                  <option value="all">Any</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </th>
              <th className="px-3 py-2 min-w-[140px]">
                <select
                  value={filters.reason}
                  onChange={(event) =>
                    updateFilter("reason", event.target.value)
                  }
                  className={filterControlClass}
                >
                  <option value="all">All reasons</option>
                  {reasonOptions.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </th>
              <th className="px-4 py-2 min-w-[110px]">
                <select
                  value={filters.comment}
                  onChange={(event) =>
                    updateFilter("comment", event.target.value)
                  }
                  className={filterControlClass}
                >
                  <option value="any">Any</option>
                  <option value="yes">Has comment</option>
                  <option value="no">No comment</option>
                </select>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-muted-text"
                >
                  {rows.length === 0
                    ? "No votes yet."
                    : "No votes match the current filters."}
                </td>
              </tr>
            ) : null}
            {filteredRows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border-light/60 last:border-0 hover:bg-muted/30 transition-colors align-top"
              >
                <td className="px-4 py-3 whitespace-nowrap text-[12px] text-muted-text">
                  {formatDate(row.submitted_at)}
                </td>
                <td className="px-3 py-3">
                  <div className="font-medium text-foreground-color">
                    {row.voter_name}
                  </div>
                  <div className="text-[11px] text-muted-text">{row.voter_email}</div>
                </td>
                <td className="px-3 py-3 text-[12px] text-muted-text">
                  {row.voter_role || "—"}
                </td>
                <td className="px-3 py-3 text-[12px] text-muted-text">
                  {row.comparison_id}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                      modelPillClass(row.chosen_model),
                    )}
                  >
                    {row.chosen_model}
                  </span>
                  <span className="ml-1 text-[10px] uppercase text-muted-text">
                    ({row.chosen_position})
                  </span>
                </td>
                <td className="px-3 py-3 text-center text-[12px] text-foreground-color">
                  {row.confidence ?? "—"}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.reason_tags?.length ? (
                      row.reason_tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-text"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-[12px] text-muted-text">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 max-w-[280px] text-[12px] text-muted-text">
                  {row.comment ? (
                    <span className="line-clamp-3 whitespace-pre-wrap">
                      {row.comment}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

const Dashboard: FC<{
  password: string;
  onSignOut: () => void;
}> = ({ password, onSignOut }) => {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [votes, setVotes] = useState<AdminVoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchAdminSummary(password),
      fetchAdminVotes(password, 500),
    ])
      .then(([s, v]) => {
        if (cancelled) return;
        setSummary(s);
        setVotes(v);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof AdminAuthError) {
          onSignOut();
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [password, refreshTick, onSignOut]);

  const headerRight = (
    <div className="flex items-center gap-2 text-xs">
      <Link
        href="/feedback"
        className="rounded-full border border-border-light bg-card px-3 py-1 text-[11px] font-medium text-muted-text transition-colors hover:border-primary/40 hover:text-foreground-color"
      >
        Go to voting page
      </Link>
      <button
        type="button"
        onClick={() => setRefreshTick((tick) => tick + 1)}
        className="rounded-full border border-border-light bg-card px-3 py-1 text-[11px] font-medium text-muted-text transition-colors hover:border-primary/40 hover:text-foreground-color"
      >
        Refresh
      </button>
      <button
        type="button"
        onClick={onSignOut}
        className="rounded-full border border-border-light bg-card px-3 py-1 text-[11px] font-medium text-muted-text transition-colors hover:border-primary/40 hover:text-foreground-color"
      >
        Sign out
      </button>
    </div>
  );

  if (loading && !summary) {
    return (
      <div className="min-h-screen bg-background">
        <BrandHeader right={headerRight} />
        <div className="mx-auto mt-24 max-w-md text-center text-sm text-muted-text animate-pulse">
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <BrandHeader right={headerRight} />
        <div className="mx-auto mt-16 w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-700">
            Couldn&apos;t load the dashboard
          </h2>
          <p className="mt-2 text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const overall = summary.by_model;
  const decisiveTotal = overall.potpie + overall.copilot;
  return (
    <div className="min-h-screen bg-background">
      <BrandHeader right={headerRight} />
      <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-6 animate-in fade-in duration-300">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-text">
              Eval snapshot
            </p>
            <h1
              className="mt-1 text-2xl font-semibold tracking-tight text-foreground-color sm:text-3xl"
              style={{ fontFamily: "var(--font-uncut)" }}
            >
              Potpie vs Copilot &mdash; human votes
            </h1>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total votes"
            value={summary.total_votes}
            hint={`${summary.unique_voters} unique voter${
              summary.unique_voters === 1 ? "" : "s"
            }`}
            accent="neutral"
          />
          <StatCard
            label="Potpie wins"
            value={overall.potpie}
            hint={`${percentage(overall.potpie, overall.total)} of all votes${
              decisiveTotal
                ? ` · ${percentage(overall.potpie, decisiveTotal)} head-to-head`
                : ""
            }`}
            accent="potpie"
          />
          <StatCard
            label="Copilot wins"
            value={overall.copilot}
            hint={`${percentage(overall.copilot, overall.total)} of all votes${
              decisiveTotal
                ? ` · ${percentage(overall.copilot, decisiveTotal)} head-to-head`
                : ""
            }`}
            accent="copilot"
          />
          <StatCard
            label="Tie / Neither"
            value={overall.tie + overall.neither}
            hint={`${overall.tie} tie · ${overall.neither} neither`}
            accent={overall.neither > overall.tie ? "neither" : "tie"}
          />
        </div>

        {summary.total_votes ? (
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-text">
            <span>Overall mix:</span>
            <div className="flex-1 max-w-md">
              <BreakdownBar counts={overall} />
            </div>
            <div className="flex flex-wrap gap-2">
              <LegendDot color="bg-primary" label="Potpie" />
              <LegendDot color="bg-amber-400" label="Copilot" />
              <LegendDot color="bg-blue-400" label="Tie" />
              <LegendDot color="bg-rose-400" label="Neither" />
            </div>
          </div>
        ) : null}

        <section className="mt-10">
          <h2
            className="mb-3 text-lg font-semibold text-foreground-color"
            style={{ fontFamily: "var(--font-uncut)" }}
          >
            At a glance
          </h2>
          <FeedbackCharts summary={summary} />
        </section>

        <section className="mt-10">
          <h2
            className="mb-3 text-lg font-semibold text-foreground-color"
            style={{ fontFamily: "var(--font-uncut)" }}
          >
            Per-question breakdown
          </h2>
          <PerComparisonTable rows={summary.by_comparison} />
        </section>

        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2
              className="text-lg font-semibold text-foreground-color"
              style={{ fontFamily: "var(--font-uncut)" }}
            >
              Recent votes
            </h2>
            <span className="text-xs text-muted-text">
              Showing {votes.length} most recent &middot; scroll within the table
            </span>
          </div>
          <VotesTable rows={votes} />
        </section>
      </div>
    </div>
  );
};

const LegendDot: FC<{ color: string; label: string }> = ({ color, label }) => (
  <span className="inline-flex items-center gap-1 text-[11px] text-muted-text">
    <span className={cn("h-2 w-2 rounded-full", color)} />
    {label}
  </span>
);

export default function AdminDashboardPage() {
  const [password, setPassword] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem(PASSWORD_STORAGE_KEY);
      if (stored) setPassword(stored);
    }
    setHydrated(true);
  }, []);

  const handleAuthenticated = useCallback((next: string) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(PASSWORD_STORAGE_KEY, next);
    }
    setPassword(next);
  }, []);

  const handleSignOut = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(PASSWORD_STORAGE_KEY);
    }
    setPassword(null);
  }, []);

  if (!hydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!password) {
    return (
      <div className="min-h-screen bg-background">
        <BrandHeader />
        <PasswordGate onAuthenticated={handleAuthenticated} />
      </div>
    );
  }

  return <Dashboard password={password} onSignOut={handleSignOut} />;
}
