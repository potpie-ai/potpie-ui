import { z } from "zod";

export type PasswordStrength = "Weak" | "Fair" | "Strong";

export type PasswordRequirementId =
  | "length"
  | "uppercase"
  | "lowercase"
  | "number"
  | "special";

export interface PasswordRequirementResult {
  id: PasswordRequirementId;
  label: string;
  isMet: boolean;
}

export interface PasswordEvaluation {
  isValid: boolean;
  metRequirementCount: number;
  requirements: PasswordRequirementResult[];
  strength: PasswordStrength;
}

export const PASSWORD_POLICY_ERROR =
  "Use 15 or more characters with uppercase, lowercase, a number, and a special character.";

const FIREBASE_SPECIAL_CHARACTERS = new Set([
  "^",
  "$",
  "*",
  ".",
  "[",
  "]",
  "{",
  "}",
  "(",
  ")",
  "?",
  '"',
  "!",
  "@",
  "#",
  "%",
  "&",
  "/",
  "\\",
  ",",
  ">",
  "<",
  "'",
  ":",
  ";",
  "|",
  "_",
  "~",
]);

export function evaluatePassword(password: string): PasswordEvaluation {
  const characters = Array.from(password);
  const requirements: PasswordRequirementResult[] = [
    {
      id: "length",
      label: "15+ characters",
      isMet: characters.length >= 15,
    },
    {
      id: "uppercase",
      label: "Uppercase letter",
      isMet: /[A-Z]/.test(password),
    },
    {
      id: "lowercase",
      label: "Lowercase letter",
      isMet: /[a-z]/.test(password),
    },
    {
      id: "number",
      label: "Number",
      isMet: /[0-9]/.test(password),
    },
    {
      id: "special",
      label: "Special character",
      isMet: characters.some((character) =>
        FIREBASE_SPECIAL_CHARACTERS.has(character),
      ),
    },
  ];
  const metRequirementCount = requirements.filter(
    (requirement) => requirement.isMet,
  ).length;
  const strength: PasswordStrength =
    metRequirementCount === requirements.length
      ? "Strong"
      : metRequirementCount >= 3
        ? "Fair"
        : "Weak";

  return {
    isValid: metRequirementCount === requirements.length,
    metRequirementCount,
    requirements,
    strength,
  };
}

export const passwordSchema = z.string().superRefine((password, context) => {
  if (!evaluatePassword(password).isValid) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: PASSWORD_POLICY_ERROR,
    });
  }
});
