"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, XCircle, UserPlus } from "lucide-react";
import PotService from "@/services/PotService";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; potId: string }
  | { kind: "needsSignup" }
  | { kind: "error"; message: string };

// Backend signals "authenticated but no account yet" with this phrase
// (account creation is owned by the frontend signup flow).
function isSignupRequired(message: string): boolean {
  return /sign up/i.test(message);
}

export default function JoinPotPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [state, setState] = useState<State>({ kind: "idle" });

  // Bring the user back to this exact link after they finish signing up.
  const returnTo = token
    ? `/pots/join?token=${encodeURIComponent(token)}`
    : "/pots";
  const signUpHref = `/sign-up?redirect=${encodeURIComponent(returnTo)}`;
  const signInHref = `/sign-in?redirect=${encodeURIComponent(returnTo)}`;

  useEffect(() => {
    if (!token) {
      setState({ kind: "error", message: "No invitation token provided." });
      return;
    }
    setState({ kind: "loading" });
    PotService.acceptInvitation(token)
      .then((out) => setState({ kind: "success", potId: out.pot_id }))
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : "Could not accept invitation";
        setState(
          isSignupRequired(message)
            ? { kind: "needsSignup" }
            : { kind: "error", message },
        );
      });
  }, [token]);

  return (
    <div className="pot-theme flex min-h-svh flex-1 items-center justify-center bg-background px-6 text-foreground">
      <div className="pot-dots pot-dots-fade flex w-full max-w-md flex-col items-center px-6 py-20 text-center">
        {state.kind === "loading" || state.kind === "idle" ? (
          <>
            <Skeleton className="h-11 w-11 rounded-full bg-muted" />
            <Skeleton className="mt-5 h-4 w-44 bg-muted" />
            <Skeleton className="mt-2.5 h-3 w-56 bg-muted" />
          </>
        ) : state.kind === "success" ? (
          <JoinStatus
            icon={CheckCircle2}
            iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            title="You're in"
            description="Invitation accepted — this pot is now in your list."
          >
            <Button className="w-full" onClick={() => router.push(`/pots`)}>
              Open pots
            </Button>
          </JoinStatus>
        ) : state.kind === "needsSignup" ? (
          <JoinStatus
            icon={UserPlus}
            iconClassName="bg-primary/10 text-primary"
            title="Create your account to join"
            description="Sign up with the same email this invitation was sent to — we'll bring you right back here to finish joining."
          >
            <Button className="w-full" onClick={() => router.push(signUpHref)}>
              Sign up to continue
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(signInHref)}
            >
              I already have an account
            </Button>
          </JoinStatus>
        ) : (
          <JoinStatus
            icon={XCircle}
            iconClassName="bg-rose-500/10 text-rose-600 dark:text-rose-400"
            title="Couldn't accept the invitation"
            description={state.message}
          >
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/pots")}
            >
              Back to pots
            </Button>
          </JoinStatus>
        )}
      </div>
    </div>
  );
}

/** Centered status stack: tinted icon, title, description, stacked actions. */
function JoinStatus({
  icon: Icon,
  iconClassName,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  iconClassName?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <>
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full",
          iconClassName,
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <h1 className="mt-4 text-base font-semibold">{title}</h1>
      {description ? (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children ? (
        <div className="mt-6 flex w-full max-w-[260px] flex-col gap-2">
          {children}
        </div>
      ) : null}
    </>
  );
}
