import type { Subscription, SubscriptionStatus } from "@prisma/client";

import { prisma } from "@/server/db";
import { recordAudit } from "@/server/audit/log";
import {
  AI_RECEPTIONIST_PRODUCT_KEY,
  MONTHLY_TALK_TIME_MINUTES_KEY,
} from "./manifest";
import {
  quotaAssignmentSchema,
  serviceStatusActionSchema,
  type QuotaAssignmentInput,
  type ServiceStatusAction,
} from "./validation";

export {
  quotaAssignmentSchema,
  serviceStatusActionSchema,
  type QuotaAssignmentInput,
  type ServiceStatusAction,
};

/**
 * AI Receptionist quota + service provisioning (server only).
 *
 * Ownership boundary:
 *   - Core owns Client, Subscription, RBAC, AuditLog.
 *   - This module owns the AI-specific ENTITLEMENT (monthly talk-time minutes)
 *     and the AI-specific service on/off state.
 *
 * The client's AI Receptionist Subscription is this product's own enrolment
 * record, so the module is allowed to create it on first quota assignment.
 */

export type AiQuotaErrorCode = "NOT_CONFIGURED" | "CLIENT_NOT_FOUND" | "NOT_ENROLLED";

export class AiQuotaError extends Error {
  constructor(readonly code: AiQuotaErrorCode, message: string) {
    super(message);
    this.name = "AiQuotaError";
  }
}

export function aiQuotaErrorStatus(err: unknown): number | null {
  if (!(err instanceof AiQuotaError)) return null;
  switch (err.code) {
    case "CLIENT_NOT_FOUND":
    case "NOT_ENROLLED":
      return 404;
    case "NOT_CONFIGURED":
      return 409;
  }
}

// --- helpers -------------------------------------------------------------

/** First instant of the current UTC calendar month, and of the next. */
export function currentCalendarMonthBounds(now = new Date()): {
  start: Date;
  end: Date;
} {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
  return { start, end };
}

export async function getAiReceptionistProductId(): Promise<string> {
  const product = await prisma.product.findUnique({
    where: { key: AI_RECEPTIONIST_PRODUCT_KEY },
    select: { id: true },
  });
  if (!product) {
    throw new AiQuotaError(
      "NOT_CONFIGURED",
      "The AI Receptionist product is not seeded. Run `npm run db:seed`.",
    );
  }
  return product.id;
}

/** The client's AI Receptionist subscription (latest, if more than one). */
export async function findAiSubscription(
  clientId: string,
  productId: string,
): Promise<
  | (Subscription & {
      entitlements: { key: string; intValue: number | null }[];
    })
  | null
> {
  return prisma.subscription.findFirst({
    where: { clientId, productId },
    orderBy: { createdAt: "desc" },
    include: {
      entitlements: {
        where: { key: MONTHLY_TALK_TIME_MINUTES_KEY },
        select: { key: true, intValue: true },
      },
    },
  });
}

// --- mutations ----------------------------------------------------------

export interface AssignQuotaResult {
  subscriptionId: string;
  minutes: number;
  previousMinutes: number | null;
  createdSubscription: boolean;
}

/**
 * Set (or update) a client's monthly talk-time quota. Creates the client's
 * AI Receptionist subscription on first assignment.
 */
export async function assignMonthlyTalkTime(
  clientId: string,
  input: QuotaAssignmentInput,
  adminUserId: string,
): Promise<AssignQuotaResult> {
  const productId = await getAiReceptionistProductId();

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, clientId: true },
  });
  if (!client) {
    throw new AiQuotaError("CLIENT_NOT_FOUND", "Client not found");
  }

  const existing = await findAiSubscription(clientId, productId);
  const previousMinutes = existing?.entitlements[0]?.intValue ?? null;

  return prisma.$transaction(async (tx) => {
    let subscriptionId = existing?.id;
    let createdSubscription = false;

    if (!subscriptionId) {
      const { start, end } = currentCalendarMonthBounds();
      const sub = await tx.subscription.create({
        data: {
          clientId,
          productId,
          status: "ACTIVE",
          billingPeriodStart: start,
          billingPeriodEnd: end,
        },
        select: { id: true },
      });
      subscriptionId = sub.id;
      createdSubscription = true;

      await recordAudit({
        adminUserId,
        action: "SUBSCRIPTION_CHANGED",
        targetType: "Subscription",
        targetId: subscriptionId,
        metadata: {
          product: AI_RECEPTIONIST_PRODUCT_KEY,
          clientId: client.clientId,
          created: true,
          billingPeriodStart: start.toISOString(),
          billingPeriodEnd: end.toISOString(),
        },
        tx,
      });
    }

    await tx.subscriptionEntitlement.upsert({
      where: {
        subscriptionId_key: {
          subscriptionId,
          key: MONTHLY_TALK_TIME_MINUTES_KEY,
        },
      },
      create: {
        subscriptionId,
        key: MONTHLY_TALK_TIME_MINUTES_KEY,
        intValue: input.minutes,
      },
      update: { intValue: input.minutes },
    });

    await recordAudit({
      adminUserId,
      action: "QUOTA_UPDATED",
      targetType: "Subscription",
      targetId: subscriptionId,
      metadata: {
        product: AI_RECEPTIONIST_PRODUCT_KEY,
        clientId: client.clientId,
        key: MONTHLY_TALK_TIME_MINUTES_KEY,
        minutes: input.minutes,
        previousMinutes,
      },
      tx,
    });

    return {
      subscriptionId,
      minutes: input.minutes,
      previousMinutes,
      createdSubscription,
    };
  });
}

const SERVICE_STATUS_MAP: Record<ServiceStatusAction, SubscriptionStatus> = {
  SUSPEND: "SUSPENDED",
  ACTIVATE: "ACTIVE",
};

/**
 * Turn the AI Receptionist service on/off for a client. Persists to
 * `Subscription.status` — never a UI-only toggle.
 */
export async function setServiceStatus(
  clientId: string,
  action: ServiceStatusAction,
  adminUserId: string,
): Promise<{ subscriptionId: string; status: string }> {
  const productId = await getAiReceptionistProductId();
  const existing = await findAiSubscription(clientId, productId);
  if (!existing) {
    throw new AiQuotaError(
      "NOT_ENROLLED",
      "This client is not enrolled in AI Receptionist. Assign a quota first.",
    );
  }

  const target = SERVICE_STATUS_MAP[action];
  if (existing.status === target) {
    return { subscriptionId: existing.id, status: existing.status };
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.subscription.update({
      where: { id: existing.id },
      data: { status: target },
      select: { id: true, status: true },
    });

    await recordAudit({
      adminUserId,
      action: "SUBSCRIPTION_CHANGED",
      targetType: "Subscription",
      targetId: updated.id,
      metadata: {
        product: AI_RECEPTIONIST_PRODUCT_KEY,
        from: existing.status,
        to: updated.status,
      },
      tx,
    });

    return { subscriptionId: updated.id, status: updated.status };
  });
}
