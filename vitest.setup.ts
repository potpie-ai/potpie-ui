import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// PotService transitively imports the auth/headers util which boots Firebase.
// We never make real network calls in tests, so stub the headers helper out.
vi.mock("@/app/utils/headers.util", () => ({
  default: () => Promise.resolve({}),
}));

