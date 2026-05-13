/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@opsflow/worker"],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};
module.exports = nextConfig;
