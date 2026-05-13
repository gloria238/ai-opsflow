import { prisma } from "@opsflow/db";

export async function logAudit(params: {
  organizationId: string;
  userId: string;
  userName: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({ data: params });
}
