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
      environmentId: "cm4bbt7ge000867dz0fmorrhz",
      apiHost: "https://app.formbricks.com",
      userId: user?.uid,
      attributes: {
        "user_name": user?.displayName || "",
        "user_email": user?.email || "",
      },      
    });
  }, []);

  useEffect(() => {
    formbricks?.registerRouteChange();
  }, [pathname, searchParams]);

  return null;
}
