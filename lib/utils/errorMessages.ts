/**
 * Utility functions to convert technical error messages to user-friendly messages
 */

export function getUserFriendlyError(error: any): string {
  // If it's already a user-friendly string, return it
  if (typeof error === 'string') {
    return getUserFriendlyMessage(error);
  }

  // Check for 409 Conflict status (e.g., GitHub account already linked)
  if (error?.response?.status === 409) {
    const errorData = error.response.data;
    // Use the error message from backend, which is user-friendly
    if (errorData?.error) {
      return errorData.error;
    }
    // Fallback to details if error field not available
    if (errorData?.details) {
      return errorData.details;
    }
  }

  // Extract error message from various error object formats
  let errorMessage = '';
  
  // Check for Firebase error code first (e.g., error.code = "auth/invalid-credential")
  if (error?.code) {
    errorMessage = error.code;
  } else if (error?.response?.data?.error) {
    errorMessage = error.response.data.error;
  } else if (error?.response?.data?.message) {
    errorMessage = error.response.data.message;
  } else if (error?.response?.data?.details) {
    // Check details field as fallback
    errorMessage = error.response.data.details;
  } else if (error?.message) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    errorMessage = 'An unexpected error occurred';
  }

  return getUserFriendlyMessage(errorMessage);
}

function getUserFriendlyMessage(message: string): string {
  const lowerMessage = message.toLowerCase();

  // Authentication errors
  if (lowerMessage.includes('email already in use') || lowerMessage.includes('email already exists')) {
    return 'This email is already registered. Please sign in instead.';
  }
  
  if (lowerMessage.includes('email not found') || lowerMessage.includes('user not found')) {
    return 'No account found with this email. Please sign up first.';
  }
  
  if (lowerMessage.includes('invalid email') || lowerMessage.includes('email is invalid')) {
    return 'Please enter a valid email address.';
  }
  
  if (lowerMessage.includes('invalid password') || lowerMessage.includes('wrong password') || lowerMessage.includes('incorrect password')) {
    return 'Incorrect password. Please try again.';
  }
  
  if (lowerMessage.includes('weak password') || lowerMessage.includes('password is too weak')) {
    return 'Password is too weak. Please use a stronger password (at least 6 characters).';
  }

  // SSO/Provider errors
  if (lowerMessage.includes('sso') && lowerMessage.includes('failed')) {
    return 'Single sign-on failed. Please try again or use email and password.';
  }
  
  if (lowerMessage.includes('google sign-in') || lowerMessage.includes('google sso')) {
    if (lowerMessage.includes('cancelled') || lowerMessage.includes('popup closed')) {
      return 'Google sign-in was cancelled. Please try again.';
    }
    return 'Google sign-in failed. Please try again.';
  }
  
  if (lowerMessage.includes('github') && lowerMessage.includes('failed')) {
    return 'GitHub sign-in failed. Please try again.';
  }
  
  if (lowerMessage.includes('provider') && lowerMessage.includes('link')) {
    if (lowerMessage.includes('already linked')) {
      return 'This account is already linked.';
    }
    if (lowerMessage.includes('expired') || lowerMessage.includes('invalid token')) {
      return 'The linking request has expired. Please try linking again.';
    }
    return 'Failed to link account. Please try again.';
  }
  
  // GitHub account already linked to another user
  if (lowerMessage.includes('github account') && lowerMessage.includes('already linked')) {
    return 'This GitHub account is already linked to another account. Please use a different GitHub account or contact support if you believe this is an error.';
  }

  // Network/API errors
  if (lowerMessage.includes('network error') || lowerMessage.includes('failed to fetch')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  
  if (lowerMessage.includes('timeout') || lowerMessage.includes('request timeout')) {
    return 'Request timed out. Please try again.';
  }
  
  if (lowerMessage.includes('cors')) {
    return 'Connection error. Please refresh the page and try again.';
  }

  // Server errors
  if (lowerMessage.includes('500') || lowerMessage.includes('internal server error')) {
    return 'Server error. Please try again in a few moments.';
  }
  
  if (lowerMessage.includes('503') || lowerMessage.includes('service unavailable')) {
    return 'Service temporarily unavailable. Please try again later.';
  }
  
  if (lowerMessage.includes('429') || lowerMessage.includes('too many requests')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Account linking errors
  if (lowerMessage.includes('account already exists') || lowerMessage.includes('user already exists')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  
  if (lowerMessage.includes('email mismatch')) {
    return 'Email addresses do not match. Please use the same email you signed up with.';
  }

  // Firebase errors
  if (lowerMessage.includes('auth/email-already-in-use')) {
    return 'This email is already registered. Please sign in instead.';
  }
  
  if (lowerMessage.includes('auth/user-not-found')) {
    return 'No account found with this email. Please sign up first.';
  }
  
  if (lowerMessage.includes('auth/wrong-password')) {
    return 'Incorrect password. Please try again.';
  }
  
  if (lowerMessage.includes('auth/invalid-credential')) {
    return 'Incorrect email or password. Please check your credentials and try again.';
  }
  
  if (lowerMessage.includes('auth/weak-password')) {
    return 'Password is too weak. Please use a stronger password.';
  }
  
  if (lowerMessage.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  
  if (lowerMessage.includes('auth/too-many-requests')) {
    return 'Too many failed attempts. Please wait a moment and try again.';
  }

  // Generic fallbacks
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
    return 'Please sign in to continue.';
  }
  
  if (lowerMessage.includes('forbidden') || lowerMessage.includes('403')) {
    return 'You do not have permission to perform this action.';
  }
  
  if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    return 'The requested resource was not found.';
  }
  
  if (lowerMessage.includes('bad request') || lowerMessage.includes('400')) {
    return 'Invalid request. Please check your input and try again.';
  }

  // If no match, return a sanitized version of the original message
  // Remove technical details and make it more readable
  let sanitized = message
    .replace(/error:/gi, '')
    .replace(/failed:/gi, '')
    .replace(/exception:/gi, '')
    .replace(/traceback/gi, '')
    .trim();
  
  // Capitalize first letter
  if (sanitized.length > 0) {
    sanitized = sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
  }
  
  // If still too technical, return generic message
  if (sanitized.includes('{') || sanitized.includes('[') || sanitized.length > 200) {
    return 'Something went wrong. Please try again.';
  }
  
  return sanitized || 'An unexpected error occurred. Please try again.';
}

/**
 * Get a user-friendly provider name
 */
export function getUserFriendlyProviderName(providerType: string): string {
  const providerMap: Record<string, string> = {
    'firebase_github': 'GitHub',
    'sso_google': 'Google',
    'sso_azure': 'Azure',
    'sso_okta': 'Okta',
    'sso_saml': 'SSO',
    'firebase_email': 'Email',
  };
  
  return providerMap[providerType] || providerType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

