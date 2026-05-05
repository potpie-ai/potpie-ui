"use client";

import React from "react";
import { useRouter } from "next/navigation";
import PotService from "@/services/PotService";
import { toast } from "@/components/ui/sonner";
import PotOverview from "../../components/PotOverview";
import PotContextQueryCard from "../../components/PotContextQueryCard";
import { usePotContext } from "../PotContext";

export default function PotOverviewPage() {
  const { pot, isOwner, refetchPots } = usePotContext();
  const router = useRouter();

  const handleArchive = async (potId: string) => {
    try {
      await PotService.patchPot(potId, { archived: true });
      toast.success("Pot archived.");
      refetchPots();
      router.push("/pots");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to archive pot");
    }
  };

  return (
    <div className="space-y-4">
      <PotOverview pot={pot} isOwner={isOwner} onArchive={handleArchive} />
      <PotContextQueryCard potId={pot.id} />
    </div>
  );
}
