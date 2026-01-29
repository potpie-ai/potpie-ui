/**
 * Email validation utilities for work email requirements
 * Blocks generic/personal email providers for new signups
 */

import type { UserCredential } from 'firebase/auth';

// Set of blocked email domains (generic/personal email providers)
// Using Set for O(1) lookup performance
export const BLOCKED_DOMAINS = new Set([
  // Google
  'gmail.com',
  'googlemail.com',
  
  // Microsoft
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  
  // Yahoo
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.co.in',
  'yahoo.fr',
  'yahoo.de',
  'yahoo.es',
  'yahoo.it',
  'yahoo.ca',
  'yahoo.com.au',
  'yahoo.com.br',
  'yahoo.com.mx',
  'yahoo.com.sg',
  'ymail.com',
  'rocketmail.com',
  
  // Apple
  'icloud.com',
  'me.com',
  'mac.com',
  
  // Other Popular Providers
  'aol.com',
  'protonmail.com',
  'proton.me',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'yandex.ru',
  'gmx.com',
  'gmx.de',
  'mail.ru',
  'fastmail.com',
  'hushmail.com',
  'tutanota.com',
  'tutanota.de',
  'rediffmail.com',
  'inbox.com',
  
  // Temporary/Disposable Email Services
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'maildrop.cc',
  'throwaway.email',
  'temp-mail.org',
  'getnada.com',
  'minuteinbox.com',
]);

/**
 * Extracts the registrable domain from an email address using public suffix list.
 * Handles multi-part TLDs correctly (e.g., .co.uk, .com.au).
 * 
 * @param email - User's email address
 * @returns The registrable domain in lowercase, or empty string if invalid
 * 
 * @example
 * extractDomain('user@GmAiL.CoM') // returns 'gmail.com'
 * extractDomain('user@eng.company.com') // returns 'company.com'
 * extractDomain('user@gmail.co.uk') // returns 'gmail.co.uk' (not 'co.uk')
 */
export function extractDomain(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }
  
  const parts = email.toLowerCase().trim().split('@');
  if (parts.length !== 2) {
    return '';
  }
  
  const domain = parts[1];
  
  // Use psl library to get the registrable domain (second-level domain)
  // This properly handles multi-part TLDs like .co.uk, .com.au, etc.
  try {
    // Dynamic import to avoid issues if psl is not installed
    const psl = require('psl');
    const parsed = psl.parse(domain);
    // psl.parse returns { domain: 'example.co.uk', subdomain: 'www', ... }
    // We want the registrable domain which is the domain field
    const registrableDomain = parsed.domain;
    // If domain is null or empty, fall back to the original domain
    return registrableDomain || domain;
  } catch (error) {
    // Fallback to simple logic if psl is not available
    // This is less accurate but won't break if the library isn't installed
    const domainParts = domain.split('.');
    if (domainParts.length >= 2) {
      // Take the last two parts (e.g., 'company.com')
      // Note: This will fail for multi-part TLDs like .co.uk
      return domainParts.slice(-2).join('.');
    }
    return domain;
  }
}

/**
 * Checks if an email domain is from a generic/personal email provider
 * 
 * @param email - User's email address
 * @returns True if generic email, false if work email
 * 
 * @example
 * isGenericEmail('user@gmail.com') // returns true
 * isGenericEmail('user@company.com') // returns false
 * isGenericEmail('user@eng.company.com') // returns false (subdomain allowed)
 */
export function isGenericEmail(email: string): boolean {
  if (!email) {
    return false;
  }
  
  const domain = extractDomain(email);
  if (!domain) {
    return false;
  }
  
  return BLOCKED_DOMAINS.has(domain);
}

/**
 * Validates if an email is a work email (not a generic/personal email provider).
 * Returns an object with validation result and error message.
 * 
 * @param email - User's email address
 * @returns Object with isValid (boolean) and errorMessage (string | undefined)
 * 
 * @example
 * validateWorkEmail('user@gmail.com') // returns { isValid: false, errorMessage: '...' }
 * validateWorkEmail('user@company.com') // returns { isValid: true, errorMessage: undefined }
 */
export function validateWorkEmail(email: string): { isValid: boolean; errorMessage?: string } {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid email address',
    };
  }

  if (isGenericEmail(email)) {
    return {
      isValid: false,
      errorMessage: 'Personal email addresses are not allowed. Please use your work/corporate email to sign up.',
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Checks if a Firebase authentication result indicates a new user signup.
 * 
 * ⚠️ Limitations:
 * - additionalUserInfo.isNewUser only returns true if the current SDK call created the account.
 *   It returns false if the account was created via Admin SDK, console, backend, or another device.
 * - For more reliable detection, consider maintaining a server-side flag in your database.
 * 
 * @param result - Firebase UserCredential from signInWithPopup
 * @returns True if new user, false if existing user
 * 
 * @example
 * const result = await signInWithPopup(auth, provider);
 * if (isNewUser(result)) {
 *   // Handle new user signup
 * }
 */
export function isNewUser(result: UserCredential): boolean {
  // Method 1: additionalUserInfo.isNewUser
  // Note: This only returns true if the current SDK call created the account.
  // It will be false for accounts created via Admin SDK, console, or backend.
  if (result.additionalUserInfo?.isNewUser === true) {
    return true;
  }
  
  // Method 2: Compare creationTime with lastSignInTime metadata
  // If creationTime and lastSignInTime are very close (within ~1 minute),
  // it's likely a new user. This handles cases where additionalUserInfo
  // might not be reliable (e.g., Admin SDK-created accounts).
  if (result.user?.metadata) {
    const creationTime = result.user.metadata.creationTime 
      ? new Date(result.user.metadata.creationTime).getTime() 
      : null;
    const lastSignInTime = result.user.metadata.lastSignInTime 
      ? new Date(result.user.metadata.lastSignInTime).getTime() 
      : null;
    
    if (creationTime) {
      // If lastSignInTime exists and is close to creationTime, likely new user
      // Use ~1 minute window to account for network lag and clock skew
      if (lastSignInTime) {
        const timeDiff = Math.abs(lastSignInTime - creationTime);
        // If creation and last sign-in are within 60 seconds, consider it new
        if (timeDiff < 60000) {
          return true;
        }
      } else {
        // If no lastSignInTime but creationTime is very recent, likely new
        // Check if account was created within last minute
        const now = Date.now();
        const timeDiff = now - creationTime;
        if (timeDiff < 60000) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Deletes a Firebase user account and signs them out.
 * Used when blocking a user due to policy violations.
 * 
 * @param user - Firebase User object
 * @returns Promise<boolean> - true if deletion succeeded, false if deletion failed.
 *         Note: A false return means the account may still exist but the user was signed out.
 *         signOut always runs regardless of deletion outcome.
 */
export async function deleteUserAndSignOut(user: any): Promise<boolean> {
  // Import at function level to avoid circular dependencies
  const { signOut } = await import('firebase/auth');
  const { auth } = await import('@/configs/Firebase-config');
  
  let deletionSucceeded = false;
  
  try {
    // Delete the user account
    await user.delete();
    deletionSucceeded = true;
    if (process.env.NODE_ENV === 'development') {
      console.log('Firebase user account deleted successfully');
    }
  } catch (error: any) {
    // Elevate deletion failure to monitoring-friendly severity
    // Use structured error logging that monitoring tools can capture
    const errorDetails = {
      message: 'Failed to delete Firebase user account',
      error: error?.message || String(error),
      errorCode: error?.code,
      userId: user?.uid,
      email: user?.email,
      stack: error?.stack,
    };
    
    // Log with error severity for monitoring tools to capture
    console.error('[ERROR] User deletion failed:', errorDetails);
    
    // If deletion fails, we still want to sign out
  }
  
  try {
    // Always sign out, even if deletion failed
    await signOut(auth);
    if (process.env.NODE_ENV === 'development') {
      console.log('User signed out successfully');
    }
  } catch (error: any) {
    // Log sign-out errors but don't affect return value
    const errorDetails = {
      message: 'Failed to sign out user',
      error: error?.message || String(error),
      errorCode: error?.code,
      userId: user?.uid,
      email: user?.email,
    };
    console.error('[ERROR] User sign-out failed:', errorDetails);
  }
  
  return deletionSucceeded;
}
