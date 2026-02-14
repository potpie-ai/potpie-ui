"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

type NavigationProgressContextValue = {
  startNavigation: () => void;
  endNavigation: () => void;
  isNavigating: boolean;
};

const NavigationProgressContext = createContext<NavigationProgressContextValue | null>(null);

export function NavigationProgressProvider({ children }: { children: React.ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);

  const startNavigation = useCallback(() => {
    setIsNavigating(true);
  }, []);

  const endNavigation = useCallback(() => {
    setIsNavigating(false);
  }, []);

  return (
    <NavigationProgressContext.Provider value={{ startNavigation, endNavigation, isNavigating }}>
      {children}
    </NavigationProgressContext.Provider>
  );
}

export function useNavigationProgress() {
  const ctx = useContext(NavigationProgressContext);
  if (!ctx) {
    return {
      startNavigation: () => {},
      endNavigation: () => {},
      isNavigating: false,
    };
  }
  return ctx;
}
