"use client";

import React from "react";
import PotGraphExplorer from "../../components/PotGraphExplorer";
import { usePotContext } from "../PotContext";

export default function PotGraphPage() {
  const { pot } = usePotContext();
  return <PotGraphExplorer potId={pot.id} />;
}
