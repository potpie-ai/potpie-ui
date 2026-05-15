"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, UserPlus } from "lucide-react";
import PotService from "@/services/PotService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept pot invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.kind === "loading" || state.kind === "idle" ? (
            <p className="text-sm text-muted-foreground">
              Accepting invitation…
            </p>
          ) : state.kind === "success" ? (
            <>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-sm font-medium">You&apos;re in.</p>
              </div>
              <Button className="w-full" onClick={() => router.push(`/pots`)}>
                Open pots
              </Button>
            </>
          ) : state.kind === "needsSignup" ? (
            <>
              <div className="flex items-center gap-2 text-foreground">
                <UserPlus className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium">
                  Create your account to join this pot.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Sign up with the same email this invitation was sent to —
                we&apos;ll bring you right back here to finish joining.
              </p>
              <Button
                className="w-full"
                onClick={() => router.push(signUpHref)}
              >
                Sign up to continue
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(signInHref)}
              >
                I already have an account
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                <p className="text-sm font-medium">{state.message}</p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/pots")}
              >
                Back to pots
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
