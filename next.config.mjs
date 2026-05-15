/** @type {import('next').NextConfig} */
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
  // Reagraph's WebGL stack (react-three-fiber / drei) ships ESM and is not
  // marked "use client". Transpiling it lets Next's App Router compile the
  // chain in the client layer with consistent React resolution (it now
  // targets the React 19 that Next 15 vendors — see reagraph >= 4.30 which
  // moved to @react-three/fiber@9).
  transpilePackages: [
    "reagraph",
    "@react-three/fiber",
    "@react-three/drei",
    "@react-spring/three",
    "three",
    "three-stdlib",
  ],
};

export default nextConfig;
