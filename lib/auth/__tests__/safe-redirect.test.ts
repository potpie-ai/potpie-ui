import { describe, expect, it } from "vitest";

import { getSafeInternalPath, isLoopbackCallbackUrl } from "@/lib/auth/safe-redirect";

describe("getSafeInternalPath", () => {
  it("allows same-origin relative paths and preserves query + hash", () => {
    expect(getSafeInternalPath("/newchat")).toBe("/newchat");
    expect(getSafeInternalPath("/newchat?repo=x&branch=y")).toBe(
      "/newchat?repo=x&branch=y",
    );
    expect(getSafeInternalPath("/pots/123#section")).toBe("/pots/123#section");
  });

  it("decodes a URL-encoded internal path", () => {
    expect(getSafeInternalPath("%2Fnewchat%3Frepo%3Dx")).toBe("/newchat?repo=x");
  });

  it("rejects absolute external URLs", () => {
    expect(getSafeInternalPath("https://evil.com")).toBe("/");
    expect(getSafeInternalPath("http://evil.com/path")).toBe("/");
    expect(getSafeInternalPath("https%3A%2F%2Fevil.com")).toBe("/");
  });

  it("rejects protocol-relative URLs", () => {
    expect(getSafeInternalPath("//evil.com")).toBe("/");
    expect(getSafeInternalPath("/%2Fevil.com")).toBe("/");
    expect(getSafeInternalPath("%2F%2Fevil.com")).toBe("/");
  });

  it("rejects backslash and control-character tricks", () => {
    expect(getSafeInternalPath("/\\evil.com")).toBe("/");
    expect(getSafeInternalPath("/\\/evil.com")).toBe("/");
    expect(getSafeInternalPath("\thttps://evil.com")).toBe("/");
    expect(getSafeInternalPath("/foo\nhttps://evil.com")).toBe("/");
  });

  it("rejects non-path schemes", () => {
    expect(getSafeInternalPath("javascript:alert(1)")).toBe("/");
    expect(getSafeInternalPath("mailto:a@b.com")).toBe("/");
  });

  it("falls back for empty / nullish input and honours a custom fallback", () => {
    expect(getSafeInternalPath(null)).toBe("/");
    expect(getSafeInternalPath(undefined)).toBe("/");
    expect(getSafeInternalPath("")).toBe("/");
    expect(getSafeInternalPath("https://evil.com", "/newchat")).toBe("/newchat");
  });
});

describe("isLoopbackCallbackUrl", () => {
  it("accepts loopback http(s) callbacks", () => {
    expect(isLoopbackCallbackUrl("http://localhost:54333/auth/callback")).toBe(true);
    expect(isLoopbackCallbackUrl("http://127.0.0.1:0/auth/callback")).toBe(true);
    expect(isLoopbackCallbackUrl("https://localhost:8080/cb")).toBe(true);
    expect(isLoopbackCallbackUrl("http://[::1]:5000/auth/callback")).toBe(true);
  });

  it("rejects non-loopback and non-http targets", () => {
    expect(isLoopbackCallbackUrl("https://evil.com/auth/callback")).toBe(false);
    expect(isLoopbackCallbackUrl("http://localhost.evil.com/cb")).toBe(false);
    expect(isLoopbackCallbackUrl("file:///etc/passwd")).toBe(false);
    expect(isLoopbackCallbackUrl("/auth/callback")).toBe(false);
    expect(isLoopbackCallbackUrl(null)).toBe(false);
    expect(isLoopbackCallbackUrl("")).toBe(false);
  });
});
