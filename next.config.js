/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  turbopack: {
    root: "/Users/johnkeller/My Mac (Johns-MacBook-Pro.local)/Main/Ai-resell-agent",
  },
};

module.exports = nextConfig;
