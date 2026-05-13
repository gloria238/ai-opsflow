/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@opsflow/worker"],
  serverExternalPackages: ["@prisma/client"],
};
module.exports = nextConfig;
