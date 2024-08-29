"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectTrigger, SelectValue } from "@/components/ui/select";
import { Select } from "@radix-ui/react-select";
import { GitBranch, Github } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const Step1 = () => {
  return (
    <div className="text-muted">
      <h1 className="text-xl">Select a repository and branch</h1>
      <Link href={"#"} className="text-accent underline">
        need help?
      </Link>
      <div className=" flex gap-10 mt-7 ml-5">
        <Select>
          <SelectTrigger className="w-[220px] py-2  border-border ">
            <SelectValue
              className=""
              placeholder={
                <div className="flex gap-3 items-center font-semibold ">
                  <Github
                    className="h-4 w-4 text-[#7A7A7A] "
                    strokeWidth={1.5}
                  />
                  netflix-dispatch
                </div>
              }
            />
          </SelectTrigger>
        </Select>
        <Select>
          <SelectTrigger className="w-[220px] py-2  border-border">
            <SelectValue
              className=""
              placeholder={
                <div className="flex gap-3 items-center font-semibold ">
                  <GitBranch
                    className="h-4 w-4 text-[#7A7A7A] "
                    strokeWidth={1.5}
                  />
                  master
                </div>
              }
            />
          </SelectTrigger>
        </Select>
      </div>
    </div>
  );
};

const Step2 = () => {
  const onboardContent = [
    {
      title: "Onboarding expert",
      desc: "Parses your codebase and understands the file structure and intent of every piece of code. Guides you through setup and familiarization with your codebase. Explains key features, conventions, and getting started steps.",
    },
    {
      title: "Review agent",
      desc: "Compares your changes with your default branch and assists in understanding their impact and plan for a safer release",
    },
    {
      title: "Debugging agent",
      desc: "Traces your error through a graph of your codebase and aids in identifying and resolving bugs in your code. Offers strategies for effective debugging and helps optimize troubleshooting processes. ",
    },
    {
      title: "Integration testing agent",
      desc: "Specializes in developing and refining integration tests for your codebase. Helps ensure different components work together correctly.",
    },
  ];
  return (
    <div className="flex flex-col w-full gap-7">
      <h1 className="text-xl">Choose your expert</h1>
      <div className="w-full h-full grid grid-cols-2 ml-5 space-y10 gap-10">
        {onboardContent.map((content, index) => (
          <Card
            key={index}
            className="border-border w-[485px] shadow-sm rounded-2xl"
          >
            <CardHeader className="p-2 px-6">
              <CardTitle className="text-lg flex gap-3 text-muted">
                <Image
                  src={"/images/person.svg"}
                  alt="logo"
                  width={20}
                  height={20}
                />
                <p>{content.title}</p>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm ml-8 text-muted/70 font-semibold">
              {content.desc}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
const NewChat = () => {
  const steps = [
    {
      label: "Step 1",
      content: <Step1 />,
    },
    {
      label: "Step 2",
      content: <Step2 />,
    },
    {
      label: "Step 3",
      content: (
        <div className="flex flex-col ml-4 w-full">
          <p className="font-semibold">All Set! Start chatting.</p>
        </div>
      ),
    },
  ];

  return (
    <div className="relative w-[97%] h-full flex flex-col items-center -mb-12 mt-5  ">
      {steps.map((step, index) => (
        <div key={index} className="flex items-start mb-8 w-full relative">
          {/* Vertical Line */}
          <div
            className={`absolute left-[18px] top-10 h-full border-l-2 border-gray-300 z-0 ${
              index === steps.length - 1 ? "hidden" : "top-10"
            }`}
          ></div>
          {/* Step Circle */}
          <div className="flex items-center justify-center w-10 h-10 bg-border text-border text-white rounded-full z-10">
            {step.label.split(" ")[1]}
          </div>
          {/* Step Text */}
          <div className="flex flex-col ml-4 w-full">{step.content}</div>
        </div>
      ))}
    </div>
  );
};

export default NewChat;
