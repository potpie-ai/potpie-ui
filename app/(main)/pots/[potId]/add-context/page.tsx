"use client";

import React from "react";
import PotAddContextPanel from "../../components/PotAddContextPanel";
import { usePotContext } from "../PotContext";

export default function PotAddContextPage() {
  const { pot } = usePotContext();
  return <PotAddContextPanel potId={pot.id} />;
}
