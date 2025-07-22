import { Workflow } from "@/services/WorkflowService";

// Local storage utilities
const LOCAL_STORAGE_KEY = "workflow_editor_local_state";

interface LocalWorkflowState {
  [workflowId: string]: {
    workflow: Workflow;
    lastModified: number;
    hasUnsavedChanges: boolean;
  };
}

export const loadLocalWorkflowState = (): LocalWorkflowState => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Failed to load local workflow state:", error);
    return {};
  }
};

export const saveLocalWorkflowState = (state: LocalWorkflowState): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save local workflow state:", error);
  }
};

export const getLocalWorkflow = (workflowId: string): Workflow | null => {
  try {
    const localState = loadLocalWorkflowState();
    return localState[workflowId]?.workflow || null;
  } catch (error) {
    console.error("Failed to get local workflow:", error);
    return null;
  }
};

export const saveLocalWorkflow = (
  workflowId: string,
  workflow: Workflow,
  hasUnsavedChanges: boolean = true
): void => {
  try {
    const localState = loadLocalWorkflowState();
    localState[workflowId] = {
      workflow,
      lastModified: Date.now(),
      hasUnsavedChanges,
    };
    saveLocalWorkflowState(localState);
  } catch (error) {
    console.error("Failed to save local workflow:", error);
  }
};

export const clearLocalWorkflow = (workflowId: string): void => {
  try {
    const localState = loadLocalWorkflowState();
    delete localState[workflowId];
    saveLocalWorkflowState(localState);
  } catch (error) {
    console.error("Failed to clear local workflow:", error);
  }
};

export const hasLocalWorkflow = (workflowId: string): boolean => {
  try {
    const localState = loadLocalWorkflowState();
    return !!localState[workflowId];
  } catch (error) {
    console.error("Failed to check local workflow:", error);
    return false;
  }
};

export const getLocalWorkflowInfo = (
  workflowId: string
): { hasUnsavedChanges: boolean; lastModified: number } | null => {
  try {
    const localState = loadLocalWorkflowState();
    const workflowState = localState[workflowId];
    if (!workflowState) return null;

    return {
      hasUnsavedChanges: workflowState.hasUnsavedChanges,
      lastModified: workflowState.lastModified,
    };
  } catch (error) {
    console.error("Failed to get local workflow info:", error);
    return null;
  }
};

export function setWithExpiry(key: string, value: any, ttl: number) {
  const now = new Date();
  const item = {
    value,
    expiry: now.getTime() + ttl,
  };
  localStorage.setItem(key, JSON.stringify(item));
}

export function getWithExpiry(key: string) {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) return null;
  try {
    const item = JSON.parse(itemStr);
    const now = new Date();
    if (now.getTime() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}
