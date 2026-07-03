/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-parse is a Node-only library; keep it external so Next doesn't try to bundle it.
  webpack: (config) => {
    config.externals = [...(config.externals || []), "pdf-parse"];
    return config;
  },
};

module.exports = nextConfig;
