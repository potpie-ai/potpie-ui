/** @type {import('next').NextConfig} */

/** Remediation FW002 / CWE-319 — only emit on production builds. */
export const HSTS_HEADER_VALUE =
  "max-age=31536000; includeSubDomains; preload";

/** Remediation FW004 / CWE-1021 — DENY ≡ CSP frame-ancestors 'none'. */
export const X_FRAME_OPTIONS_VALUE = "DENY";
export const CSP_FRAME_ANCESTORS = "frame-ancestors 'none'";

/**
 * @param {{ nodeEnv?: string | undefined }} [options]
 * @returns {{ source: string, headers: { key: string, value: string }[] }[]}
 */
export function securityHeaders({ nodeEnv = process.env.NODE_ENV } = {}) {
  /** @type {{ key: string, value: string }[]} */
  const headers = [
    {
      key: "X-Frame-Options",
      value: X_FRAME_OPTIONS_VALUE,
    },
    {
      key: "Content-Security-Policy",
      value: CSP_FRAME_ANCESTORS,
    },
  ];

  if (nodeEnv === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: HSTS_HEADER_VALUE,
    });
  }

  return [
    {
      source: "/:path*",
      headers,
    },
  ];
}

const nextConfig = {
  images: {
    domains: ["avatars.githubusercontent.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  async headers() {
    return securityHeaders();
  },
};

export default nextConfig;
