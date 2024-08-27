"use client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Step, StepItem, Stepper, useStepper } from "@/components/ui/stepper";
import { GitBranch, Github } from "lucide-react";
import Link from "next/link";

const steps = [
  { label: "Step 1" },
  { label: "Step 2" },
  { label: "Step 3" },
] satisfies StepItem[];

const Step1 = () => {
    return (
      <div className=" flex gap-10 mt-7 ">
        <Select>
          <SelectTrigger className="w-[220px] py-2  border-border ">
            <SelectValue
              className=""
              placeholder={
                <div className="flex gap-3 items-center ">
                  <Github className="h-4 w-4 text-[#7A7A7A] " strokeWidth={1.5} />
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
                <div className="flex gap-3 items-center ">
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
    );
  };

  
export default function NewChat() {
  return (
    <div className="flex w-full flex-col gap-4">
      <Stepper orientation="vertical" initialStep={0} steps={steps}>
        {steps.map((stepProps, index) => {
          return (
            <Step key={stepProps.label} {...stepProps}>
              <div className="h-40 flex p-4 border-none my-4 border text-primary rounded-md">
                <div className="">
                  <h1 className="text-xl">Select a repository and branch</h1>
                  <Link href={"#"} className="text-[#0267FF] underline">
                    need help?
                  </Link>
                  <Step1 />
                </div>
              </div>
              <StepButtons />
            </Step>
          );
        })}
        <FinalStep />
      </Stepper>
    </div>
  );
}

const StepButtons = () => {
  const { nextStep, prevStep, isLastStep, isOptionalStep, isDisabledStep } =
    useStepper();
  return (
    <div className="w-full flex gap-2 mb-4">
      <Button
        disabled={isDisabledStep}
        onClick={prevStep}
        size="sm"
        variant="secondary"
      >
        Prev
      </Button>
      <Button size="sm" onClick={nextStep}>
        {isLastStep ? "Finish" : isOptionalStep ? "Skip" : "Next"}
      </Button>
    </div>
  );
};

const FinalStep = () => {
  const { hasCompletedAllSteps, resetSteps } = useStepper();

  if (!hasCompletedAllSteps) {
    return null;
  }

  return (
    <>
      <div className="h-40 flex items-center justify-center border bg-secondary text-primary rounded-md">
        <h1 className="text-xl">Woohoo! All steps completed! 🎉</h1>
      </div>
      <div className="w-full flex justify-end gap-2">
        <Button size="sm" onClick={resetSteps}>
          Reset
        </Button>
      </div>
    </>
  );
};

