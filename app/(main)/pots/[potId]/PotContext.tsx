"use client";

import React, { createContext, useContext } from "react";
import type { Pot } from "@/services/PotService";

type PotContextValue = {
  pot: Pot;
  isOwner: boolean;
  refetchPots: () => void;
};

const PotContext = createContext<PotContextValue | null>(null);

export function PotContextProvider({
  value,
  children,
}: {
  value: PotContextValue;
  children: React.ReactNode;
}) {
  return <PotContext.Provider value={value}>{children}</PotContext.Provider>;
}

export function usePotContext() {
  const ctx = useContext(PotContext);
  if (!ctx) {
    throw new Error("usePotContext must be used within PotContextProvider");
  }
  return ctx;
}
