import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

/**
 * Append-only audit trail writer. Import ONLY from server code.
 *
 * Records WHO (adminUserId, from the signed session — never the browser),
 * WHAT (`action`), and WHICH entity (`targetType` / `targetId`). `metadata`
 * is a small JSON diff/context blob and must NEVER contain secrets
 * (passwords, tokens, API keys, connection strings).
 *
 * Pass `tx` to enrol the write in an existing transaction so the audit row
 * and the change it describes commit together.
 */
export async function recordAudit(params: {
  adminUserId: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  metadata?: Prisma.InputJsonValue;
  tx?: Prisma.TransactionClient;
}): Promise<void> {
  const db = params.tx ?? prisma;
  await db.auditLog.create({
    data: {
      adminUserId: params.adminUserId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
    },
  });
}
