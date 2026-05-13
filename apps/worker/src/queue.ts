import { Queue } from "bullmq";
import { Redis } from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) throw new Error("REDIS_URL environment variable is required");

export const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: {},
});

export const workflowQueue = new Queue<{ runId: string }>("workflow-runs", {
  connection,
});
