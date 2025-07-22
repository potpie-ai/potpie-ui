export type NodeGroup = "default" | "github" | "linear" | "flow_control";

export interface NodeColorPalette {
  primary: string;
  secondary: string;
  text: string;
}

export const getNodeColors = (group: NodeGroup): NodeColorPalette => {
  switch (group) {
    case "default":
      return {
        primary: "#4b5563", // text-gray-600
        secondary: "#e5e7eb", // text-gray-200
        text: "#111", // black for contrast
      };
    case "github":
      return {
        primary: "#24292f", // GitHub dark
        secondary: "#666666", // GitHub green
        text: "#fff", // white for contrast
      };
    case "linear":
      return {
        primary: "#5f6ad2", // Linear purple
        secondary: "#b4b9f8", // Linear light purple
        text: "#111", // black for contrast
      };
    case "flow_control":
      return {
        primary: "#2563eb", // blue-600
        secondary: "#dbeafe", // blue-100
        text: "#111", // black for contrast
      };
    default:
      return {
        primary: "#4b5563",
        secondary: "#e5e7eb",
        text: "#111",
      };
  }
};
