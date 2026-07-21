"use client";

import React from "react";
import PotMembersPanel from "../../components/PotMembersPanel";
import { PotPage } from "../../components/kit";
import { usePotContext } from "../PotContext";

export default function PotUsersPage() {
  const { pot, isOwner } = usePotContext();
  return (
    <PotPage width="content">
      <PotMembersPanel potId={pot.id} isOwner={isOwner} />
    </PotPage>
  );
}
