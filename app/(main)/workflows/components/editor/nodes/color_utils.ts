import { NodeGroup } from "@/services/WorkflowService";

export interface NodeColorPalette {
  primary: string;
  secondary: string;
  text: string;
}

export const getNodeColors = (group: NodeGroup): NodeColorPalette => {
  switch (group) {
    case NodeGroup.DEFAULT:
      return {
        primary: "#4b5563", // text-gray-600
        secondary: "#e5e7eb", // text-gray-200
        text: "#111", // black for contrast
      };
    case NodeGroup.GITHUB:
      return {
        primary: "#24292f", // GitHub dark
        secondary: "#666666", // GitHub green
        text: "#fff", // white for contrast
      };
    case NodeGroup.LINEAR:
      return {
        primary: "#5f6ad2", // Linear purple
        secondary: "#b4b9f8", // Linear light purple
        text: "#111", // black for contrast
      };
  }
};
