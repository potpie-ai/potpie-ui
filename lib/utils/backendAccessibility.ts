import axios from "axios";
import getHeaders from "@/app/utils/headers.util";

/**
 * Check if the workflows backend is accessible
 * Returns true if backend is accessible, false otherwise
 */
export async function isWorkflowsBackendAccessible(): Promise<boolean> {
  const workflowsUrl = process.env.NEXT_PUBLIC_WORKFLOWS_URL;
  
  if (!workflowsUrl) {
    return false;
  }

  try {
    // Make a lightweight request to check if backend is accessible
    // Using a simple endpoint that should exist if backend is running
    const headers = await getHeaders();
    const response = await axios.get(
      `${workflowsUrl}/api/v1/triggers`,
      { 
        headers,
        timeout: 3000, // 3 second timeout
      }
    );
    
    // If we get any response (even 404/500), backend exists
    // We'll check the actual status in the error handlers
    return true;
  } catch (error: any) {
    // Check if it's a network error (backend doesn't exist)
    if (!error.response) {
      // No response = network error = backend not accessible
      return false;
    }
    
    // Check the status code
    const status = error.response?.status;
    // 404/500 errors indicate the backend exists but the feature is not available
    // Treat these as not accessible for pro feature checks
    if (status === 404 || status === 500) {
      return false;
    }
    
    // Other error statuses (like 401, 403) might indicate backend exists
    // but for pro feature checks, we'll be conservative and return false
    return false;
  }
}

/**
 * Check if workflows backend URL indicates it might be accessible
 * This is a synchronous check for immediate UI decisions
 * For accurate check, use isWorkflowsBackendAccessible()
 */
export function isWorkflowsBackendLikelyAccessible(): boolean {
  const workflowsUrl = process.env.NEXT_PUBLIC_WORKFLOWS_URL;
  
  if (!workflowsUrl) {
    return false;
  }

  // If URL is localhost, assume it might be accessible (for local dev)
  // For other URLs, we need to check via API call
  return workflowsUrl.includes('localhost') || workflowsUrl.includes('127.0.0.1');
}
