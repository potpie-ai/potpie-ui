"use client";
import Image from "next/image";
import React from "react";
import Potpie from "@/public/images/potpie-blue.svg";
import { usePathname } from "next/navigation";
import formbricksApp from "@formbricks/js";

const SurveyTrigger = () => {
  const pathname = usePathname();
  if (pathname.split("/").pop() === "newchat" || pathname.startsWith("/chat")) {
    return null;
  }
  return (
    <div
      id="survey-trigger"
      onClick={() => formbricksApp.track("survey-trigger")}
      className="fixed bottom-5 right-5 h-14 w-14 rounded-full bg-white shadow-lg cursor-pointer 
      grid place-items-center transition-transform hover:scale-110"
      title="Take Survey"
    >
      <Image
        src={Potpie}
        alt="Survey"
        width={56}
        height={56}
        className="rounded-full object-cover"
      />
    </div>
  );
};

export default SurveyTrigger;
