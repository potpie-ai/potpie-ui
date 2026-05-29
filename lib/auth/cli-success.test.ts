import { describe, expect, it } from "vitest";
import {
  cliSuccessCopy,
  cliSuccessPath,
  normalizeCliAuthProvider,
} from "./cli-success";

describe("cli-success helpers", () => {
  it("normalizes provider query param", () => {
    expect(normalizeCliAuthProvider("github")).toBe("github");
    expect(normalizeCliAuthProvider("potpie")).toBe("potpie");
    expect(normalizeCliAuthProvider(null)).toBe("potpie");
    expect(normalizeCliAuthProvider("other")).toBe("potpie");
  });

  it("builds success path and copy", () => {
    expect(cliSuccessPath("potpie")).toBe("/cli-success?provider=potpie");
    expect(cliSuccessPath("github")).toBe("/cli-success?provider=github");
    expect(cliSuccessCopy("potpie").body).toContain("return to your CLI");
    expect(cliSuccessCopy("github").title).toBe("GitHub connected");
  });
});
