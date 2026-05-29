"use client";

import { useSearchParams } from "next/navigation";
import {
  cliSuccessCopy,
  normalizeCliAuthProvider,
} from "@/lib/auth/cli-success";

export default function CliSuccessPage() {
  const searchParams = useSearchParams();
  const provider = normalizeCliAuthProvider(searchParams.get("provider"));
  const { title, body } = cliSuccessCopy(provider);

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-[#022D2C] px-6 font-sans">
      <div className="max-w-md rounded-2xl bg-[#FFF9F5] p-8 text-center shadow-lg">
        <h1 className="text-2xl font-medium text-[#022D2C]">{title}</h1>
        <p className="mt-3 text-base text-[#656969]">{body}</p>
      </div>
    </div>
  );
}
