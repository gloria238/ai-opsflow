export function getRequestContext(req: Request) {
  const url = new URL(req.url);
  return {
    method: req.method,
    path: url.pathname,
    timestamp: new Date().toISOString(),
  };
}

export function logInfo(ctx: ReturnType<typeof getRequestContext>, message: string, data?: Record<string, unknown>) {
  const entry = { level: "info", ...ctx, message, ...data };
  console.log(JSON.stringify(entry));
}

export function logError(ctx: ReturnType<typeof getRequestContext>, message: string, err?: unknown) {
  const entry = {
    level: "error",
    ...ctx,
    message,
    error: err instanceof Error ? { message: err.message, name: err.name } : String(err ?? "unknown"),
  };
  console.error(JSON.stringify(entry));
}

export function logWarn(ctx: ReturnType<typeof getRequestContext>, message: string, data?: Record<string, unknown>) {
  const entry = { level: "warn", ...ctx, message, ...data };
  console.warn(JSON.stringify(entry));
}
