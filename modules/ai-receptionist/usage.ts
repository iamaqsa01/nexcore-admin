import type { SubscriptionStatus } from "@prisma/client";

import { prisma } from "@/server/db";
import { MONTHLY_TALK_TIME_MINUTES_KEY } from "./manifest";
import {
  AiQuotaError,
  currentCalendarMonthBounds,
  getAiReceptionistProductId,
} from "./quota";

/**
 * AI Receptionist usage aggregation (server only).
 *
 * Every number here is derived from the database — `CallLog.durationSeconds`
 * for usage, `SubscriptionEntitlement.intValue` for assigned quota. Nothing
 * is faked or hardcoded.
 */

export type ServiceStatus = SubscriptionStatus | "NOT_ENROLLED";

export interface ClientUsageRow {
  clientId: string;
  /** Internal identifier, e.g. "NC-CL-000001". */
  internalClientId: string;
  name: string;
  website: string | null;
  enrolled: boolean;
  serviceStatus: ServiceStatus;
  assignedMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  /** null when no quota is assigned (division undefined). */
  usagePercent: number | null;
}

export interface DashboardStats {
  activeClinics: number;
  suspendedClinics: number;
  totalMinutesConsumed: number;
  totalAssignedMinutes: number;
}

export interface AiReceptionistConsoleData {
  stats: DashboardStats;
  rows: ClientUsageRow[];
}

/** Consistent display rounding: seconds -> whole minutes. */
export function secondsToDisplayMinutes(seconds: number): number {
  return Math.round(seconds / 60);
}

export function usagePercent(
  usedMinutes: number,
  assignedMinutes: number,
): number | null {
  if (assignedMinutes <= 0) return null;
  return Math.round((usedMinutes / assignedMinutes) * 100);
}

/**
 * Load everything the AI Receptionist console renders: the four dashboard
 * stats and one usage row per non-retired client. All values are for each
 * subscription's CURRENT billing period.
 */
export async function getAiReceptionistConsoleData(): Promise<AiReceptionistConsoleData> {
  const productId = await getAiReceptionistProductId();

  const [clients, subscriptions] = await Promise.all([
    prisma.client.findMany({
      where: { status: { not: "INACTIVE" } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        clientId: true,
        name: true,
        website: true,
      },
    }),
    prisma.subscription.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        clientId: true,
        status: true,
        billingPeriodStart: true,
        billingPeriodEnd: true,
        entitlements: {
          where: { key: MONTHLY_TALK_TIME_MINUTES_KEY },
          select: { intValue: true },
        },
      },
    }),
  ]);

  // One AI Receptionist subscription per client (latest wins).
  const subByClient = new Map<string, (typeof subscriptions)[number]>();
  for (const sub of subscriptions) {
    if (!subByClient.has(sub.clientId)) subByClient.set(sub.clientId, sub);
  }

  // Used seconds per subscription for its own billing window — ONE grouped
  // aggregate query for every subscription, not one query per client. Each
  // OR branch pins both the subscription and its own billing window, so no
  // subscription's calls leak into another's total.
  const activeSubs = [...subByClient.values()];
  const usedSecondsBySub = new Map<string, number>();
  if (activeSubs.length > 0) {
    const grouped = await prisma.callLog.groupBy({
      by: ["subscriptionId"],
      _sum: { durationSeconds: true },
      where: {
        OR: activeSubs.map((sub) => {
          const { start, end } = periodBounds(sub);
          return { subscriptionId: sub.id, startedAt: { gte: start, lt: end } };
        }),
      },
    });
    for (const g of grouped) {
      usedSecondsBySub.set(g.subscriptionId, g._sum.durationSeconds ?? 0);
    }
  }

  let activeClinics = 0;
  let suspendedClinics = 0;
  let totalMinutesConsumed = 0;
  let totalAssignedMinutes = 0;

  const rows: ClientUsageRow[] = clients.map((client) => {
    const sub = subByClient.get(client.id);
    const assignedMinutes = sub?.entitlements[0]?.intValue ?? 0;
    const usedSeconds = sub ? (usedSecondsBySub.get(sub.id) ?? 0) : 0;
    const usedMinutes = secondsToDisplayMinutes(usedSeconds);
    // Never surface a negative balance — overage is conveyed by usagePercent
    // (> 100) and the QUOTA_REACHED state instead.
    const remainingMinutes = Math.max(assignedMinutes - usedMinutes, 0);
    const serviceStatus: ServiceStatus = sub ? sub.status : "NOT_ENROLLED";

    if (sub?.status === "ACTIVE") activeClinics += 1;
    if (sub?.status === "SUSPENDED") suspendedClinics += 1;
    totalMinutesConsumed += usedMinutes;
    totalAssignedMinutes += assignedMinutes;

    return {
      clientId: client.id,
      internalClientId: client.clientId,
      name: client.name,
      website: client.website,
      enrolled: Boolean(sub),
      serviceStatus,
      assignedMinutes,
      usedMinutes,
      remainingMinutes,
      usagePercent: usagePercent(usedMinutes, assignedMinutes),
    };
  });

  return {
    stats: {
      activeClinics,
      suspendedClinics,
      totalMinutesConsumed,
      totalAssignedMinutes,
    },
    rows,
  };
}

/**
 * A subscription's current billing window. Falls back to the current UTC
 * calendar month if the stored period has fully elapsed (defensive — the
 * billing-cycle roll job is a later phase).
 */
function periodBounds(sub: {
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
}): { start: Date; end: Date } {
  const now = Date.now();
  if (sub.billingPeriodEnd.getTime() >= now) {
    return { start: sub.billingPeriodStart, end: sub.billingPeriodEnd };
  }
  return currentCalendarMonthBounds();
}

export { AiQuotaError };
