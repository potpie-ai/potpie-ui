import { afterEach, describe, expect, it, vi } from "vitest";
import { completeCliAuthentication } from "./cli-callback";
import { isValidCliCallbackUrl } from "./cli-callback-url";

vi.mock("@/configs/Firebase-config", () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue("firebase-id-token"),
    },
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/");
  delete process.env.NEXT_PUBLIC_BASE_URL;
  delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
});

describe("isValidCliCallbackUrl", () => {
  it("accepts http loopback hosts with port", () => {
    expect(isValidCliCallbackUrl("http://localhost:9123")).toBe(true);
    expect(isValidCliCallbackUrl("http://127.0.0.1:9123")).toBe(true);
  });

  it("rejects non-localhost hosts", () => {
    expect(isValidCliCallbackUrl("https://localhost:9123")).toBe(false);
    expect(isValidCliCallbackUrl("http://evil.example:9123")).toBe(false);
  });

  it("rejects empty and malformed URLs", () => {
    expect(isValidCliCallbackUrl(null)).toBe(false);
    expect(isValidCliCallbackUrl("not-a-url")).toBe(false);
  });
});

describe("completeCliAuthentication", () => {
  it("does not POST to the CLI callback without state", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_BASE_URL = "https://api.potpie.example";
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "firebase-key";
    window.history.pushState({}, "", "/sign-in?cli_callback=http://localhost:9123/cb");

    await expect(
      completeCliAuthentication("http://localhost:9123/cb"),
    ).rejects.toThrow("Missing CLI auth state.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("echoes state in the CLI callback body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ customToken: "header.payload.signature" }),
      })
      .mockResolvedValueOnce({
        ok: true,
      });
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_BASE_URL = "https://api.potpie.example";
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "firebase-key";
    window.history.pushState(
      {},
      "",
      "/sign-in?cli_callback=http://127.0.0.1:9123/random-path&state=state-123",
    );

    await expect(
      completeCliAuthentication("http://127.0.0.1:9123/random-path"),
    ).resolves.toBe("header.payload.signature");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const callbackBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(callbackBody).toEqual({
      custom_token: "header.payload.signature",
      firebase_api_key: "firebase-key",
      state: "state-123",
    });
  });
});
