import { describe, expect, it } from "vitest";

import { buildVSCodeCallbackUrl } from "@/lib/auth/vscode-callback";

const DEFAULT_BASE = "http://localhost:54333/auth/callback";

describe("buildVSCodeCallbackUrl", () => {
  it("uses the default loopback base when no redirect_uri is given", () => {
    const url = buildVSCodeCallbackUrl("tok");
    expect(url.startsWith(`${DEFAULT_BASE}?`)).toBe(true);
    expect(url).toContain("token=tok");
  });

  it("honours a loopback redirect_uri (e.g. dynamic VS Code port)", () => {
    const url = buildVSCodeCallbackUrl("tok", null, "http://127.0.0.1:5123/auth/callback");
    expect(url.startsWith("http://127.0.0.1:5123/auth/callback?")).toBe(true);
  });

  it("ignores a non-loopback redirect_uri and keeps the token on the default base", () => {
    const url = buildVSCodeCallbackUrl("secret-token", "custom", "https://evil.com/steal");
    expect(url.startsWith(`${DEFAULT_BASE}?`)).toBe(true);
    expect(url).not.toContain("evil.com");
    expect(url).toContain("token=secret-token");
    expect(url).toContain("customToken=custom");
  });

  it("ignores an encoded non-loopback redirect_uri", () => {
    const url = buildVSCodeCallbackUrl("tok", null, "https%3A%2F%2Fevil.com%2Fsteal");
    expect(url.startsWith(`${DEFAULT_BASE}?`)).toBe(true);
    expect(url).not.toContain("evil.com");
  });
});
