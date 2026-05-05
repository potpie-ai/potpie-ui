"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PotIngestionRedirect() {
  const params = useParams<{ potId: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/pots/${params.potId}/events`);
  }, [params.potId, router]);
  return null;
}
