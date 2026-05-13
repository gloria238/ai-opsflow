/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@opsflow/worker"],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
    outputFileTracingIncludes: {
      "/*": ["./node_modules/.pnpm/@prisma+client*/**/.prisma/client/**"],
    },
  },
};
module.exports = nextConfig;
