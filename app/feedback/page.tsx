"use client";

import Image from "next/image";
import {
  ChangeEvent,
  FC,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { SharedMarkdown } from "@/components/chat/SharedMarkdown";
import { cn } from "@/lib/utils";

import {
  fetchComparisonDetail,
  fetchComparisons,
  fetchMyVotes,
  submitVote,
} from "./api";
import {
  ChosenPosition,
  ComparisonDetail,
  ComparisonSummary,
  REASON_TAGS,
  ReasonTag,
  VotePayload,
  VoteResponse,
  VoterIdentity,
} from "./types";

const IDENTITY_STORAGE_KEY = "potpie-feedback-identity";
const SESSION_STORAGE_KEY = "potpie-feedback-session-id";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadIdentity(): VoterIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(IDENTITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VoterIdentity;
    if (!parsed.name || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveIdentity(identity: VoterIdentity) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(identity));
}

function loadSessionId(): string {
  if (typeof window === "undefined") return randomId();
  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;
  const fresh = randomId();
  window.localStorage.setItem(SESSION_STORAGE_KEY, fresh);
  return fresh;
}

const BrandHeader: FC<{
  rightSlot?: React.ReactNode;
}> = ({ rightSlot }) => (
  <div className="border-b border-border-light bg-background/80 backdrop-blur sticky top-0 z-10">
    <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 py-4">
      <div className="flex items-center gap-3 min-w-0">
        <Image
          src="/images/Logomark.svg"
          alt="Potpie"
          width={110}
          height={28}
          priority
          className="h-7 w-auto object-contain object-left"
        />
        <span className="hidden text-xs font-medium uppercase tracking-[0.18em] text-muted-text sm:inline">
          Human Evaluation
        </span>
      </div>
      {rightSlot ?? null}
    </div>
  </div>
);

const IdentityCard: FC<{
  onSubmit: (identity: VoterIdentity) => void;
}> = ({ onSubmit }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) {
      setError("Please tell us your name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid work email.");
      return;
    }
    setError(null);
    onSubmit({
      name: trimmedName,
      email: trimmedEmail,
      role: role.trim() || undefined,
    });
  };

  return (
    <div className="mx-auto mt-12 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
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
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground-color">
            Help us compare answers
          </h1>
          <p className="text-sm leading-relaxed text-muted-text">
            Two AI assistants answered the same codebase questions. Pick the response you
            find more useful.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handle}>
          <div className="space-y-1.5">
            <Label htmlFor="voter-name" className="text-foreground-color">
              Name
            </Label>
            <Input
              id="voter-name"
              value={name}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setName(event.target.value)
              }
              placeholder="Jane Doe"
              autoComplete="name"
              required
              className="bg-card"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="voter-email" className="text-foreground-color">
              Work email
            </Label>
            <Input
              id="voter-email"
              type="email"
              value={email}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setEmail(event.target.value)
              }
              placeholder="jane@potpie.ai"
              autoComplete="email"
              required
              className="bg-card"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="voter-role" className="text-foreground-color">
              Role <span className="text-muted-text">(optional)</span>
            </Label>
            <Input
              id="voter-role"
              value={role}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setRole(event.target.value)
              }
              placeholder="Engineer / PM / Eval team"
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
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:shadow-md"
          >
            Start voting
          </Button>
        </form>
        <p className="mt-5 text-center text-[11px] text-muted-text">
          Your name and email are stored only to attribute votes. No password, no auth.
        </p>
      </div>
    </div>
  );
};

const ResponseCard: FC<{
  label: "A" | "B";
  body: string;
  selected: boolean;
  onSelect: () => void;
}> = ({ label, body, selected, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className={cn(
      "group flex w-full flex-col rounded-2xl border bg-card p-5 text-left transition-all duration-200",
      "hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-22px_rgba(2,45,44,0.25)]",
      selected
        ? "border-primary ring-2 ring-primary/25"
        : "border-border-light hover:border-primary/60",
    )}
  >
    <div className="mb-3 flex items-center justify-between">
      <span
        className={cn(
          "inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-full px-2 text-xs font-semibold uppercase tracking-wider transition-colors",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-text group-hover:bg-tertiary",
        )}
      >
        Response {label}
      </span>
      <span
        className={cn(
          "text-xs transition-colors",
          selected
            ? "font-medium text-primary"
            : "text-muted-text group-hover:text-foreground-color",
        )}
      >
        {selected ? "Selected" : "Click to choose"}
      </span>
    </div>
    <div className="max-h-[440px] overflow-y-auto rounded-xl bg-background/60 p-4 text-sm leading-relaxed text-foreground-color ring-1 ring-border-light/60">
      <SharedMarkdown content={body} />
    </div>
  </button>
);

const ReasonChips: FC<{
  value: ReasonTag[];
  onChange: (next: ReasonTag[]) => void;
}> = ({ value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {REASON_TAGS.map((tag) => {
      const selected = value.includes(tag);
      return (
        <button
          type="button"
          key={tag}
          onClick={() => {
            if (selected) {
              onChange(value.filter((existing) => existing !== tag));
            } else {
              onChange([...value, tag]);
            }
          }}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150",
            selected
              ? "border-primary bg-primary/10 text-primary"
              : "border-border-light bg-card text-muted-text hover:border-primary/40 hover:text-foreground-color",
          )}
        >
          {tag}
        </button>
      );
    })}
  </div>
);

const QuestionProgressStrip: FC<{
  total: number;
  currentIndex: number;
  votedIds: Set<string>;
  comparisons: ComparisonSummary[];
  onJump: (index: number) => void;
}> = ({ total, currentIndex, votedIds, comparisons, onJump }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {comparisons.map((comp, index) => {
      const voted = votedIds.has(comp.id);
      const isCurrent = index === currentIndex;
      return (
        <button
          type="button"
          key={comp.id}
          onClick={() => onJump(index)}
          title={`Q${index + 1}${voted ? " · voted" : ""}`}
          className={cn(
            "inline-flex h-7 min-w-[2rem] items-center justify-center rounded-full px-2 text-[11px] font-medium transition-all duration-150",
            isCurrent
              ? "bg-primary text-primary-foreground shadow-sm"
              : voted
                ? "bg-accent/80 text-foreground-color hover:bg-accent"
                : "bg-muted text-muted-text hover:bg-tertiary",
          )}
        >
          {voted && !isCurrent ? `Q${index + 1} ✓` : `Q${index + 1}`}
        </button>
      );
    })}
    <span className="ml-2 text-[11px] text-muted-text">
      {votedIds.size} of {total} done
    </span>
  </div>
);

const ComparisonView: FC<{
  identity: VoterIdentity;
  sessionId: string;
  comparison: ComparisonDetail;
  comparisonIndex: number;
  totalCount: number;
  alreadyVoted: VoteResponse | null;
  onSubmitted: (vote: VoteResponse) => void;
  onAdvance: () => void;
}> = ({
  identity,
  sessionId,
  comparison,
  comparisonIndex,
  totalCount,
  alreadyVoted,
  onSubmitted,
  onAdvance,
}) => {
  const [position, setPosition] = useState<ChosenPosition | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [reasonTags, setReasonTags] = useState<ReasonTag[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const mountedAt = useRef<number>(Date.now());

  useEffect(() => {
    setPosition(null);
    setConfidence(null);
    setReasonTags([]);
    setComment("");
    mountedAt.current = Date.now();
  }, [comparison.id]);

  const handleSubmit = useCallback(async () => {
    if (!position) {
      toast.error("Pick a response first.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: VotePayload = {
        comparison_id: comparison.id,
        chosen_position: position,
        ballot_id: comparison.ballot_id,
        voter_name: identity.name,
        voter_email: identity.email,
        voter_role: identity.role,
        confidence: confidence ?? undefined,
        reason_tags: reasonTags.length ? reasonTags : undefined,
        comment: comment.trim() ? comment.trim() : undefined,
        time_on_page_ms: Date.now() - mountedAt.current,
        session_id: sessionId,
      };
      const result = await submitVote(payload);
      onSubmitted(result);
      toast.success("Vote recorded.");
      onAdvance();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit vote.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [
    position,
    comparison.id,
    comparison.ballot_id,
    identity.name,
    identity.email,
    identity.role,
    confidence,
    reasonTags,
    comment,
    sessionId,
    onSubmitted,
    onAdvance,
  ]);

  return (
    <div
      key={comparison.id}
      className="mx-auto w-full max-w-6xl animate-in fade-in slide-in-from-bottom-2 duration-300 px-6 pb-16"
    >
      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-text">
            Question {comparisonIndex + 1} of {totalCount}
          </p>
          <h2
            className="mt-1 text-2xl font-semibold tracking-tight text-foreground-color sm:text-3xl"
            style={{ fontFamily: "var(--font-uncut)" }}
          >
            Pick the more useful response
          </h2>
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{
            width: `${((comparisonIndex + 1) / totalCount) * 100}%`,
          }}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-border-light bg-card p-6 shadow-[0_10px_30px_-22px_rgba(2,45,44,0.2)]">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-text">
          The question
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-foreground-color">
          {comparison.question}
        </p>
        {alreadyVoted ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent/30 px-3 py-1 text-xs font-medium text-foreground-color">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            You already voted on this question. Submitting again overwrites your earlier vote.
          </p>
        ) : null}
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        <ResponseCard
          label="A"
          body={comparison.response_a}
          selected={position === "a"}
          onSelect={() => setPosition("a")}
        />
        <ResponseCard
          label="B"
          body={comparison.response_b}
          selected={position === "b"}
          onSelect={() => setPosition("b")}
        />
      </section>

      <section className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPosition("tie")}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-150",
            position === "tie"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border-light bg-card text-muted-text hover:border-primary/40 hover:text-foreground-color",
          )}
        >
          Tie &mdash; equally good
        </button>
        <button
          type="button"
          onClick={() => setPosition("neither")}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-150",
            position === "neither"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border-light bg-card text-muted-text hover:border-primary/40 hover:text-foreground-color",
          )}
        >
          Neither is acceptable
        </button>
      </section>

      <section className="mt-6 rounded-2xl border border-border-light bg-card p-6 shadow-[0_10px_30px_-22px_rgba(2,45,44,0.2)]">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label className="text-sm text-foreground-color">
              Confidence <span className="text-muted-text">(optional)</span>
            </Label>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() =>
                    setConfidence(confidence === value ? null : value)
                  }
                  className={cn(
                    "h-9 w-9 rounded-full border text-sm font-medium transition-all duration-150",
                    confidence === value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border-light bg-card text-muted-text hover:border-primary/40 hover:text-foreground-color",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-text">
              1 = guessing &middot; 5 = certain
            </p>
          </div>

          <div>
            <Label className="text-sm text-foreground-color">
              What drove your choice <span className="text-muted-text">(optional)</span>
            </Label>
            <div className="mt-2">
              <ReasonChips value={reasonTags} onChange={setReasonTags} />
            </div>
          </div>
        </div>

        <div className="mt-5">
          <Label htmlFor="comment" className="text-sm text-foreground-color">
            Comment <span className="text-muted-text">(optional)</span>
          </Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Anything you noticed about either response..."
            className="mt-2 min-h-[80px] bg-card focus-visible:ring-primary/40"
          />
        </div>
      </section>

      <div className="mt-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!position || submitting}
          className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit & next"}
        </Button>
      </div>
    </div>
  );
};

const FinishedState: FC<{
  totalCount: number;
  votedCount: number;
  onRestart: () => void;
  onChangeIdentity: () => void;
}> = ({ totalCount, votedCount, onRestart, onChangeIdentity }) => (
  <div className="mx-auto mt-16 w-full max-w-md animate-in fade-in zoom-in-95 duration-500 px-6">
    <div className="rounded-2xl border border-border-light bg-card p-10 text-center shadow-[0_18px_40px_-24px_rgba(2,45,44,0.18)]">
      <Image
        src="/images/Logomark.svg"
        alt="Potpie"
        width={132}
        height={32}
        className="mx-auto mb-4 h-8 w-auto object-contain"
      />
      <h2
        className="text-2xl font-semibold tracking-tight text-foreground-color"
        style={{ fontFamily: "var(--font-uncut)" }}
      >
        Thanks for voting
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-text">
        You&apos;ve voted on {votedCount} of {totalCount} questions. Your responses are saved.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button
          variant="outline"
          onClick={onRestart}
          className="border-border-light text-foreground-color hover:bg-muted"
        >
          Review or revise
        </Button>
        <Button
          variant="ghost"
          onClick={onChangeIdentity}
          className="text-muted-text hover:bg-muted hover:text-foreground-color"
        >
          Switch user
        </Button>
      </div>
    </div>
  </div>
);

export default function FeedbackPage() {
  const [identity, setIdentity] = useState<VoterIdentity | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [comparisons, setComparisons] = useState<ComparisonSummary[]>([]);
  const [comparisonIndex, setComparisonIndex] = useState(0);
  const [currentDetail, setCurrentDetail] = useState<ComparisonDetail | null>(
    null,
  );
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [votesByComparison, setVotesByComparison] = useState<
    Record<string, VoteResponse>
  >({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSessionId(loadSessionId());
    setIdentity(loadIdentity());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    fetchComparisons()
      .then(setComparisons)
      .catch((error: Error) => setLoadError(error.message));
  }, [hydrated]);

  useEffect(() => {
    if (!identity) return;
    fetchMyVotes(identity.email)
      .then((votes) => {
        const map: Record<string, VoteResponse> = {};
        for (const vote of votes) {
          map[vote.comparison_id] = vote;
        }
        setVotesByComparison(map);
      })
      .catch(() => {
        setVotesByComparison({});
      });
  }, [identity]);

  useEffect(() => {
    if (!comparisons.length || comparisonIndex >= comparisons.length) {
      setCurrentDetail(null);
      return;
    }
    const comparisonId = comparisons[comparisonIndex].id;
    setLoadingDetail(true);
    fetchComparisonDetail(comparisonId)
      .then((detail) => {
        setCurrentDetail(detail);
        setLoadError(null);
      })
      .catch((error: Error) => setLoadError(error.message))
      .finally(() => setLoadingDetail(false));
  }, [comparisons, comparisonIndex]);

  const handleIdentitySubmit = useCallback((next: VoterIdentity) => {
    saveIdentity(next);
    setIdentity(next);
  }, []);

  const handleChangeIdentity = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(IDENTITY_STORAGE_KEY);
    }
    setIdentity(null);
    setVotesByComparison({});
    setComparisonIndex(0);
  }, []);

  const handleVoteSubmitted = useCallback((vote: VoteResponse) => {
    setVotesByComparison((prev) => ({ ...prev, [vote.comparison_id]: vote }));
  }, []);

  const handleAdvance = useCallback(() => {
    setComparisonIndex((prev) => prev + 1);
  }, []);

  const votedIds = useMemo(
    () => new Set(Object.keys(votesByComparison)),
    [votesByComparison],
  );

  const headerRight = identity ? (
    <div className="flex items-center gap-4 text-xs text-muted-text">
      <span className="hidden sm:inline">
        Voting as{" "}
        <strong className="font-medium text-foreground-color">
          {identity.name}
        </strong>
      </span>
      <button
        type="button"
        onClick={handleChangeIdentity}
        className="rounded-full border border-border-light bg-card px-3 py-1 text-[11px] font-medium text-muted-text transition-colors hover:border-primary/40 hover:text-foreground-color"
      >
        Switch user
      </button>
    </div>
  ) : null;

  if (!hydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!identity) {
    return (
      <div className="min-h-screen bg-background">
        <BrandHeader />
        <IdentityCard onSubmit={handleIdentitySubmit} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background">
        <BrandHeader rightSlot={headerRight} />
        <div className="mx-auto mt-16 w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-700">Couldn&apos;t load questions</h2>
          <p className="mt-2 text-sm text-red-600">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!comparisons.length) {
    return (
      <div className="min-h-screen bg-background">
        <BrandHeader rightSlot={headerRight} />
        <div className="mx-auto mt-16 max-w-md text-center text-sm text-muted-text">
          Loading questions...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <BrandHeader
        rightSlot={
          <div className="flex flex-col items-end gap-2">
            {headerRight}
            <QuestionProgressStrip
              total={comparisons.length}
              currentIndex={comparisonIndex}
              votedIds={votedIds}
              comparisons={comparisons}
              onJump={(index) => setComparisonIndex(index)}
            />
          </div>
        }
      />

      {comparisonIndex >= comparisons.length ? (
        <FinishedState
          totalCount={comparisons.length}
          votedCount={votedIds.size}
          onRestart={() => setComparisonIndex(0)}
          onChangeIdentity={handleChangeIdentity}
        />
      ) : loadingDetail || !currentDetail ? (
        <div className="mx-auto mt-24 max-w-md text-center text-sm text-muted-text animate-pulse">
          Loading question...
        </div>
      ) : (
        <ComparisonView
          identity={identity}
          sessionId={sessionId}
          comparison={currentDetail}
          comparisonIndex={comparisonIndex}
          totalCount={comparisons.length}
          alreadyVoted={votesByComparison[currentDetail.id] ?? null}
          onSubmitted={handleVoteSubmitted}
          onAdvance={handleAdvance}
        />
      )}
    </div>
  );
}
