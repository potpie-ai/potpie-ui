"use client";

import React, { createContext, useContext, useState, ReactNode, FC } from 'react';
import { CallBackProps, STATUS, ACTIONS, ORIGIN, EVENTS } from 'react-joyride';

interface TutorialContextProps {
  isTutorialOpen: boolean;
  setTutorialOpen: (isOpen: boolean) => void;
  handleCallback: (data: CallBackProps, setRun: React.Dispatch<React.SetStateAction<boolean>>) => void;
}

const TutorialContext = createContext<TutorialContextProps | undefined>(undefined);

export const TutorialProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);

  const setTutorialOpen = (isOpen: boolean) => {
    setIsTutorialOpen(isOpen);
  };

  const handleCallback = (data: CallBackProps, setRun: React.Dispatch<React.SetStateAction<boolean>>) => {
    const { action, index, origin, status, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      setTutorialOpen(false);
    }
    if (action === ACTIONS.CLOSE && origin === ORIGIN.OVERLAY) {
      setTutorialOpen(false);
      // do something
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
    } else if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      setTutorialOpen(false);
    }
  };

  return (
    <TutorialContext.Provider value={{ isTutorialOpen, setTutorialOpen, handleCallback }}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = (): TutorialContextProps => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};
