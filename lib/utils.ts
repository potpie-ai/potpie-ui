import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const list_system_agents = ["codebase_qna_agent","debugging_agent","unit_test_agent","integration_test_agent","LLD_agent","code_changes_agent"] // Temp: to be remopved after we get the agents type in list api
