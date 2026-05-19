"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useNavigationProgress } from "@/contexts/NavigationProgressContext";

/** Global progress bar at the top of the viewport (primary colour) during route transitions. */
export function NavigationProgressBar() {
  const pathname = usePathname();
  const { isNavigating, endNavigation } = useNavigationProgress();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);

  // When route has changed (new page mounted), end the progress state
  useEffect(() => {
    endNavigation();
  }, [pathname, endNavigation]);

  useEffect(() => {
    if (isNavigating) {
      setVisible(true);
      setWidth(0);
      const start = performance.now();
      const duration = 300;
      const targetWidth = 90;
      let rafId: number;

      const tick = () => {
        const elapsed = performance.now() - start;
        const t = Math.min(elapsed / duration, 1);
        setWidth(targetWidth * t);
        if (t < 1) rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafId);
    } else {
      setWidth(100);
      const t = setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [isNavigating]);

  if (!visible && !isNavigating) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-1 overflow-hidden"
      aria-hidden
      style={{ backgroundColor: "transparent" }}
    >
      <div
        className="h-full transition-all duration-200 ease-out"
        style={{
          width: `${width}%`,
          backgroundColor: "#022019",
        }}
      />
    </div>
  );
}
