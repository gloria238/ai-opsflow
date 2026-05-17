import { config } from "dotenv";
import fs from "fs";
import path from "path";

// Load env from possible locations (don't override existing vars)
const envPaths = [
  path.resolve(__dirname, "../../../../packages/db/.env"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../.env.local"),
  path.resolve(process.cwd(), "packages/db/.env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), ".env.local"),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    config({ path: p, override: false });
  }
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-jwt-secret-minimum-32-chars-long!!";
}

// Force in-memory rate limiter for unit tests (real Redis is slow)
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
