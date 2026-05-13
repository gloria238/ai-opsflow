import { prisma } from "@opsflow/db";
import { verifyToken } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export async function GET(request: Request, { params }: { params: { slug: string; id: string } }) {
  const cookieHeader = request.headers.get("cookie") || "";
  const sessionCookie = cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith("session="))
    ?.split("=")[1];

  if (!sessionCookie) return new Response("Unauthorized", { status: 401 });

  const payload = await verifyToken(sessionCookie);
  if (!payload) return new Response("Unauthorized", { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: payload.userId, organization: { slug: params.slug } },
  });
  if (!membership) return new Response("Forbidden", { status: 403 });

  try { requirePermission(membership.role, "view_workflows"); }
  catch { return new Response("Forbidden", { status: 403 }); }

  const organizationId = membership.organizationId;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      async function push() {
        if (closed) return;
        try {
          const runs = await prisma.workflowRun.findMany({
            where: {
              workflowVersion: {
                workflowId: params.id,
                workflow: { organizationId },
              },
            },
            include: { events: { orderBy: { createdAt: "asc" } } },
            orderBy: { createdAt: "desc" },
            take: 50,
          });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(runs)}\n\n`));
        } catch {
          // client will reconnect
        }
        if (!closed) setTimeout(push, 3000);
      }

      request.signal.addEventListener("abort", () => {
        closed = true;
        controller.close();
      });

      push();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
