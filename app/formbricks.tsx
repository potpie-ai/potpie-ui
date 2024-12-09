"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import formbricks from "@formbricks/js";
import { auth } from "@/configs/Firebase-config";

export default function FormbricksProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = auth.currentUser;
  useEffect(() => {
    formbricks.init({
      environmentId: process.env.NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID!,
      apiHost: process.env.NEXT_PUBLIC_FORMBRICKS_API_HOST!,
      userId: user?.uid,
      attributes: {
        user_name: user?.displayName || "",
        user_email: user?.email || "",
      },
    });
  }, []);

  useEffect(() => {
    formbricks?.registerRouteChange();
  }, [pathname, searchParams]);

  return null;
}
