"use client";
import { useRouter } from "next/navigation";
import { useFeatureFlagEnabled } from "posthog-js/react";
import React, { useEffect, useState } from "react";

const NewAgents = ({ children }: { children: React.ReactNode }) => {
  const flagEnabled = useFeatureFlagEnabled("custom_agents");
  const router = useRouter();
  const [isFlagResolved, setIsFlagResolved] = useState(false);
  console.log(flagEnabled);
  useEffect(() => {
    if (typeof flagEnabled !== "undefined") {
      setIsFlagResolved(true);
      if (!flagEnabled) {
        router.back();
      }
    }
  }, [flagEnabled, router]);

  if (!isFlagResolved) {
    return router.back();
  }

  return <>{children}</>;
};

export default NewAgents;
