/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@opsflow/worker"],
  serverExternalPackages: ["@prisma/client"],
  experimental: {
    outputFileTracingIncludes: {
      "/*": ["./node_modules/.pnpm/@prisma+client*/**/.prisma/client/**"],
    },
  },
};
module.exports = nextConfig;
