import { describe, expect, it } from "vitest";
import { isValidCliCallbackUrl } from "./cli-callback-url";

describe("isValidCliCallbackUrl", () => {
  it("accepts http://localhost with port", () => {
    expect(isValidCliCallbackUrl("http://localhost:9123")).toBe(true);
  });

  it("rejects non-localhost hosts", () => {
    expect(isValidCliCallbackUrl("http://127.0.0.1:9123")).toBe(false);
    expect(isValidCliCallbackUrl("https://localhost:9123")).toBe(false);
    expect(isValidCliCallbackUrl("http://evil.example:9123")).toBe(false);
  });

  it("rejects empty and malformed URLs", () => {
    expect(isValidCliCallbackUrl(null)).toBe(false);
    expect(isValidCliCallbackUrl("not-a-url")).toBe(false);
  });
});
