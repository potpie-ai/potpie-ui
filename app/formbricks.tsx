"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import formbricks from "@formbricks/js";
import { auth } from "@/configs/Firebase-config";
import { isFormbricksEnabled } from "@/lib/utils";

export default function FormbricksProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = auth.currentUser;
  const isEnabled = isFormbricksEnabled();

  useEffect(() => {
    if (!isEnabled) {
      console.log("Formbricks disabled in local development mode");
      return;
    }

    formbricks.init({
      environmentId: process.env.NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID!,
      apiHost: process.env.NEXT_PUBLIC_FORMBRICKS_API_HOST!,
      userId: user?.uid,
      attributes: {
        user_name: user?.displayName || "",
        user_email: user?.email || "",
      },
    });
  }, [isEnabled, user?.uid, user?.displayName, user?.email]);

  useEffect(() => {
    if (!isEnabled) return;
    
    formbricks?.registerRouteChange();
  }, [pathname, searchParams, isEnabled]);

  return null;
}
