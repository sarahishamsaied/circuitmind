/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@circuitmind/circuit-ir"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

module.exports = nextConfig;
