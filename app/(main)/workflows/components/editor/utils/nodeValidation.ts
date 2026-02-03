import { availableNodes } from "../nodes";
import type { NodeType } from "@/services/WorkflowService";

/**
 * Get all valid node types from the available nodes registry
 * This ensures we have a single source of truth for valid node types
 */
export const getValidNodeTypes = (): Set<string> => {
  return new Set(availableNodes.map((node) => node.type));
};

/**
 * Type guard to check if a string is a valid NodeType
 */
export const isValidNodeType = (type: any): type is NodeType => {
  const validTypes = getValidNodeTypes();
  return typeof type === "string" && validTypes.has(type);
};

/**
 * Get all available node types as an array
 */
export const getValidNodeTypesArray = (): string[] => {
  return Array.from(getValidNodeTypes());
};
