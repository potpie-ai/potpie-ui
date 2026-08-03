/**
 * Run via: pnpm test:unit
 * (Node >=22; uses --experimental-strip-types for .ts imports)
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluatePassword, passwordSchema } from "./password-policy.ts";
import { getUserFriendlyError } from "../utils/errorMessages.ts";

describe("password policy", () => {
  it("accepts a password that satisfies every requirement", () => {
    assert.equal(passwordSchema.safeParse("ValidPassword1!").success, true);
  });

  it("rejects a password shorter than 15 characters", () => {
    assert.equal(passwordSchema.safeParse("StrongPass123!").success, false);
    assert.equal(passwordSchema.safeParse("Abcdefghijk1!😀").success, false);
  });

  it("rejects each missing character class", () => {
    const invalidPasswords = [
      "securepassphrase1!",
      "SECUREPASSPHRASE1!",
      "SecurePassphrase!!",
      "SecurePassphrase12",
    ];

    for (const password of invalidPasswords) {
      assert.equal(passwordSchema.safeParse(password).success, false);
    }
  });

  it("matches Firebase's supported non-alphanumeric characters", () => {
    assert.equal(passwordSchema.safeParse("SecurePassphrase1-").success, false);
    assert.equal(passwordSchema.safeParse("SecurePassphrase1_").success, true);
  });

  it("reports requirement progress for real-time feedback", () => {
    const weak = evaluatePassword("password");
    const strong = evaluatePassword("ValidPassword1!");

    assert.equal(weak.metRequirementCount, 1);
    assert.equal(weak.strength, "Weak");
    assert.equal(strong.metRequirementCount, 5);
    assert.equal(strong.strength, "Strong");
    assert.equal(strong.isValid, true);
  });

  it("explains the active policy when Firebase rejects a weak password", () => {
    assert.equal(
      getUserFriendlyError({ code: "auth/weak-password" }),
      "Use 15 or more characters with uppercase, lowercase, a number, and a special character.",
    );
  });
});
