/**
 * Personal email domains that should be rejected for work email validation
 */
const PERSONAL_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.fr',
  'hotmail.com',
  'hotmail.fr',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'protonmail.com',
  'proton.me',
  'aol.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'tutanota.com',
  'fastmail.com',
];

/**
 * Validates if an email is a work email (not a personal email domain)
 * @param email - The email address to validate
 * @returns true if it's a work email, false if it's a personal email
 */
export function isWorkEmail(email: string): boolean {
  if (!email || !email.includes('@')) {
    return false;
  }

  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) {
    return false;
  }

  // Check if domain is in the personal email list
  return !PERSONAL_EMAIL_DOMAINS.includes(domain);
}

/**
 * Validates email format and checks if it's a work email
 * @param email - The email address to validate
 * @returns An object with isValid and errorMessage
 */
export function validateWorkEmail(email: string): { isValid: boolean; errorMessage?: string } {
  if (!email || email.trim() === '') {
    return { isValid: false, errorMessage: 'Email is required' };
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, errorMessage: 'Please enter a valid email address' };
  }

  // Check if it's a work email
  if (!isWorkEmail(email)) {
    return {
      isValid: false,
      errorMessage: 'Please use your work email address. Personal email addresses are not allowed.',
    };
  }

  return { isValid: true };
}

