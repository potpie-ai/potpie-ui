import React, { forwardRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  ACTIONS,
  BeaconRenderProps,
  CallBackProps,
  EVENTS,
  ORIGIN,
  STATUS,
} from "react-joyride";
import { TooltipRenderProps } from "react-joyride";

import { ArrowLeft, ArrowRight } from "lucide-react";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

interface CustomTooltipProps extends TooltipRenderProps {
  stepsLength: number;
  path: string;
}

const CustomTootltip = ({
  backProps,
  continuous,
  index,
  isLastStep,
  primaryProps,
  skipProps,
  step,
  tooltipProps,
  stepsLength,
  path,
  closeProps,
}: CustomTooltipProps) => {
  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.tagName !== "BUTTON" &&
        continuous
      ) {
        closeProps.onClick(e);
      }
    };
    const floater = document.querySelector(".__floater");
    if (floater && floater.classList.contains("__floater__open")) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [closeProps, continuous]);

  const toggleTutorialStatus = (
    e: React.MouseEvent<HTMLElement, MouseEvent>
  ) => {
    e.stopPropagation();
    if (isLastStep) {
      const watchedTutorials = JSON.parse(
        localStorage.getItem("tutorialWatched") || "[]"
      );
      const index = watchedTutorials.findIndex((item: any) =>
        item.hasOwnProperty(path)
      );
      if (index !== -1) {
        watchedTutorials[index][path] = true;
      } else {
        watchedTutorials.push({ [path]: true });
      }
      localStorage.setItem("tutorialWatched", JSON.stringify(watchedTutorials));
    }
    primaryProps.onClick(e);
  };

  return (
    <Card {...tooltipProps} className="w-80 cursor-pointer z-[400]">
      <CardContent
        className="p-4"
        onClickCapture={(e: any) => toggleTutorialStatus(e)}
      >
        <p className="text-sm font-medium text-secondary ">
          {step.content}
        </p>
      </CardContent>
      <CardFooter className="flex items-center p-4 justify-between">
        {/* <Badge variant="outline" className="py-2 rounded">
          {index + 1} of {stepsLength}
        </Badge> */}{" "}
        <div className=""></div>
        <div className="flex gap-4 justify-self-end ">
          <Button size={"sm"} {...backProps} className="z-10">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClickCapture={(e: any) => toggleTutorialStatus(e)}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export const handleJoyrideCallback = (
  data: CallBackProps,
  setRun: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const { action, index, origin, status, type } = data;
  const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

  if (finishedStatuses.includes(status)) {
    setRun(false);
  }
  if (action === ACTIONS.CLOSE && origin === ORIGIN.OVERLAY) {
    // do something
  }

  if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
  } else if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
    setRun(false);
  }
};


export default CustomTootltip;

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.6; /* Start with slightly lower opacity */
  }

  55% {
    transform: scale(1.6);
    opacity: 0.9; /* Increase opacity during pulsing */
  }
  75%, 100% {
    transform: scale(2);
    opacity: 0; /* Hide the outer circle at the end of the animation */
  }
`;

const BeaconButton = styled.button`
  position: relative;
  background-color: transparent;
  border: 0;
  border-radius: 50%;
  display: inline-block;
  height: 1.5rem;
  width: 1.5rem;

  &::before {
    content: "";
    position: absolute;
    right: 0%;
    top: 7%;
    background-color: rgba(255, 173, 98, 0.6);
    border-radius: 50%;
    height: 1.5rem;
    width: 1.5rem;
    animation: ${pulse} 1s ease-in-out infinite;
    z-index: -1;
  }

  &::after {
    /* Inner dot */
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: #ffad62;
    border-radius: 50%;
    height: 1rem;
    width: 1rem;
  }
  transition: transform 0.5s ease-in-out;
`;

// eslint-disable-next-line react/display-name
export const BeaconComponent = forwardRef<HTMLButtonElement, BeaconRenderProps>(
  (props, ref) => {
    return <BeaconButton ref={ref} {...props} />;
  }
);
