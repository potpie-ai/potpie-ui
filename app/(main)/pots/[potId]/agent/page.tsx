"use client";

import React from "react";
import PotAgentSetupPanel from "../../components/PotAgentSetupPanel";
import { usePotContext } from "../PotContext";

export default function PotAgentPage() {
  const { pot } = usePotContext();
  return <PotAgentSetupPanel pot={pot} />;
}
