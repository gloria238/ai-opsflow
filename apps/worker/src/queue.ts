import { Queue } from "bullmq";
import { Redis } from "ioredis";

let _connection: Redis | null = null;
let _queue: Queue<{ runId: string }> | null = null;

function getConnection(): Redis {
  if (!_connection) {
    const REDIS_URL = process.env.REDIS_URL;
    if (!REDIS_URL) throw new Error("REDIS_URL environment variable is required");
    _connection = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      tls: {},
    });
  }
  return _connection;
}

function getQueue(): Queue<{ runId: string }> {
  if (!_queue) {
    _queue = new Queue<{ runId: string }>("workflow-runs", {
      connection: getConnection(),
    });
  }
  return _queue;
}

export const connection = new Proxy({} as Redis, {
  get(_, prop) { return (getConnection() as unknown as Record<string | symbol, unknown>)[prop]; },
});
export const workflowQueue = new Proxy({} as Queue<{ runId: string }>, {
  get(_, prop) { return (getQueue() as unknown as Record<string | symbol, unknown>)[prop]; },
});
