"use client";

import React from "react";
import PotMembersPanel from "../../components/PotMembersPanel";
import { usePotContext } from "../PotContext";

export default function PotUsersPage() {
  const { pot, isOwner } = usePotContext();
  return <PotMembersPanel potId={pot.id} isOwner={isOwner} />;
}
