import { z } from "zod";

// Common personal email domains to block
const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "mail.com",
  "protonmail.com",
  "proton.me",
  "zoho.com",
  "yandex.com",
  "gmx.com",
  "tutanota.com",
  "fastmail.com",
  "hey.com",
  "me.com",
  "mac.me",
  "live.com",
  "msn.com",
  "yahoo.co.uk",
  "yahoo.co.in",
  "googlemail.com",
];

/**
 * Validates if an email is a work email (not from personal domains)
 */
export function isWorkEmail(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }

  const emailLower = email.toLowerCase().trim();
  const domain = emailLower.split("@")[1];

  if (!domain) {
    return false;
  }

  return !PERSONAL_EMAIL_DOMAINS.includes(domain);
}

/**
 * Zod schema for work email validation
 */
export const workEmailSchema = z
  .string()
  .email({ message: "Please enter a valid email address" })
  .refine(isWorkEmail, {
    message: "Please use your work email address. Personal email domains are not allowed.",
  });

/**
 * Zod schema for password
 */
export const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
  .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
  .regex(/[0-9]/, { message: "Password must contain at least one number" });
