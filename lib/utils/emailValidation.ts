/**
 * Email validation utilities for work email requirements
 * Blocks generic/personal email providers for new signups
 */

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
 * Checks if a Firebase authentication result indicates a new user signup
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
export function isNewUser(result: any): boolean {
  // Check multiple possible locations for isNewUser flag
  // Firebase may set this in different places depending on the flow
  
  // Method 1: additionalUserInfo (most common)
  if (result.additionalUserInfo?.isNewUser === true) {
    return true;
  }
  
  // Method 2: _tokenResponse (fallback)
  if (result._tokenResponse?.isNewUser === true) {
    return true;
  }
  
  // Method 3: Check if user was just created by comparing creation time
  // If creation time is very recent (within last few seconds), likely new user
  if (result.user?.metadata?.creationTime) {
    const creationTime = new Date(result.user.metadata.creationTime).getTime();
    const now = Date.now();
    const timeDiff = now - creationTime;
    
    // If account was created within last 5 seconds, consider it new
    // This is a heuristic fallback
    if (timeDiff < 5000) {
      return true;
    }
  }
  
  return false;
}

/**
 * Deletes a Firebase user account and signs them out
 * Used when blocking a user due to policy violations
 * 
 * @param user - Firebase User object
 * @returns Promise that resolves when user is deleted and signed out
 */
export async function deleteUserAndSignOut(user: any): Promise<void> {
  // Import at function level to avoid circular dependencies
  const { signOut } = await import('firebase/auth');
  const { auth } = await import('@/configs/Firebase-config');
  
  try {
    // Delete the user account
    await user.delete();
    if (process.env.NODE_ENV === 'development') {
      console.log('Firebase user account deleted successfully');
    }
  } catch (error: any) {
    // Log error but continue to sign out
    console.error('Error deleting Firebase user:', error);
    // If deletion fails, we still want to sign out
  }
  
  try {
    // Always sign out, even if deletion failed
    await signOut(auth);
    if (process.env.NODE_ENV === 'development') {
      console.log('User signed out successfully');
    }
  } catch (error: any) {
    console.error('Error signing out user:', error);
  }
}
