"use client";
import React, { useState } from "react";
import { useHeader } from "@/contexts/HeaderContext";


const Navbar = () => {
  const { headerTitle } = useHeader();
  return (
    <header className="sticky top-0 flex h-[50px] items-center gap-1 border-b border-b-border bg-muted px-4">
      <h1 className="text-[16px] font-bold">Hundredmarks.ai</h1>
    </header>
  );
};

export default Navbar;
