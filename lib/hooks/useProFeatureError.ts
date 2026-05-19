"use client";

import { useState, useCallback } from "react";
import { AxiosError } from "axios";

/**
 * Custom error class for Pro Feature errors (404/500 from workflows backend)
 */
export class ProFeatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProFeatureError";
  }
}

/**
 * Check if an error is a Pro Feature error (404/500/network errors from workflows backend)
 * This checks if the error indicates the backend is not accessible
 */
export function isProFeatureError(error: unknown): boolean {
  if (error instanceof ProFeatureError) {
    return true;
  }

  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const code = error.code;
    
    // Check if it's a workflows backend URL
    const workflowsUrl = process.env.NEXT_PUBLIC_WORKFLOWS_URL;
    if (workflowsUrl && url.includes(workflowsUrl)) {
      // Check if it's a 404 or 500 error (backend exists but endpoint not available)
      if (status === 404 || status === 500) {
        return true;
      }
      
      // Check for network errors (CORS, connection refused, etc.)
      // Network errors don't have a response status, but have error codes
      // These indicate backend is not accessible at all
      if (!error.response && (code === 'ERR_NETWORK' || code === 'ERR_FAILED' || code === 'ECONNREFUSED')) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Helper function to check if an error indicates a pro feature is not available
 * and throw ProFeatureError if matched.
 * Checks for 404/500 status codes and network error codes (ERR_NETWORK, ERR_FAILED, ECONNREFUSED).
 * 
 * @param error - The error object to check
 * @param message - The error message to throw if matched
 * @throws ProFeatureError if the error matches pro feature error conditions
 */
export function throwIfProFeatureError(error: any, message: string): void {
  // Guard against nullish error
  if (!error) {
    return;
  }
  
  // Check for 404/500 status errors (backend exists but endpoint not available)
  if (error?.response?.status === 404 || error?.response?.status === 500) {
    throw new ProFeatureError(message);
  }
  
  // Check for network errors (CORS, connection refused, etc.) - backend not accessible
  if (!error?.response && (error?.code === 'ERR_NETWORK' || error?.code === 'ERR_FAILED' || error?.code === 'ECONNREFUSED')) {
    throw new ProFeatureError(message);
  }
}

/**
 * Hook to handle Pro Feature errors and show the ProFeatureModal
 */
export function useProFeatureError() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleError = useCallback((error: unknown) => {
    if (isProFeatureError(error)) {
      setIsModalOpen(true);
      return true; // Error was handled
    }
    return false; // Error was not a pro feature error
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return {
    isModalOpen,
    setIsModalOpen,
    handleError,
    closeModal,
  };
}
