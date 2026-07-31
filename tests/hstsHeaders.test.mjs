import assert from "node:assert/strict";
import test from "node:test";

import {
  CSP_FRAME_ANCESTORS,
  HSTS_HEADER_VALUE,
  X_FRAME_OPTIONS_VALUE,
  securityHeaders,
} from "../next.config.mjs";

test("production builds emit HSTS and anti-framing headers application-wide", async () => {
  const headers = await securityHeaders({ nodeEnv: "production" });

  assert.equal(headers.length, 1);
  assert.equal(headers[0].source, "/:path*");
  assert.deepEqual(headers[0].headers, [
    { key: "X-Frame-Options", value: X_FRAME_OPTIONS_VALUE },
    { key: "Content-Security-Policy", value: CSP_FRAME_ANCESTORS },
    { key: "Strict-Transport-Security", value: HSTS_HEADER_VALUE },
  ]);
  assert.equal(X_FRAME_OPTIONS_VALUE, "DENY");
  assert.equal(CSP_FRAME_ANCESTORS, "frame-ancestors 'self'");
  assert.equal(
    HSTS_HEADER_VALUE,
    "max-age=31536000; includeSubDomains; preload",
  );
});

test("non-production builds still emit anti-framing headers but omit HSTS", async () => {
  const headers = await securityHeaders({ nodeEnv: "development" });

  assert.equal(headers.length, 1);
  assert.deepEqual(headers[0].headers, [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  ]);
  assert.equal(
    headers[0].headers.some((h) => h.key === "Strict-Transport-Security"),
    false,
  );
});
