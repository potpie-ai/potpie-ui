import React from "react";
import { Bomb, Home, LibraryBig } from "lucide-react";
import { Step } from "react-joyride";

export const MenuItems: {
  name: string;
  icon: React.JSX.Element;
  badgeNo?: number;
  link: string;
  title?: string;
  onProjectId?: boolean;
}[] = [
  // {
  //   name: "Home",
  //   icon: <Home className="size-" />,
  //   link: "/",
  // },
];

export const emptyFooter = ["", "/blast-radius", "/endpoints"];

export enum planTypes {
  FREE = "FREE",
  PRO = "PRO",
  ENTERPRISE = "ENTERPRISE",
}
