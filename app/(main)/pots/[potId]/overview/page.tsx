"use client";

import React from "react";
import { useRouter } from "next/navigation";
import PotService from "@/services/PotService";
import { toast } from "@/components/ui/sonner";
import { PotPage } from "@/app/(main)/pots/components/kit";
import PotOverview, { PotDangerZone } from "../../components/PotOverview";
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
    <PotPage width="content" className="space-y-8">
      <PotOverview pot={pot} />
      <div className="border-t border-border/60 pt-8">
        <PotContextQueryCard potId={pot.id} />
      </div>
      <PotDangerZone pot={pot} isOwner={isOwner} onArchive={handleArchive} />
    </PotPage>
  );
}
