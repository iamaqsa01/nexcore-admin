import { prisma } from "@/server/db";
import {
  getAiReceptionistConsoleData,
  type ClientUsageRow,
} from "@/modules/ai-receptionist/usage";

/**
 * Overview dashboard metrics (server only). Core owns the clinic counts
 * (`Client.status`); the minutes-consumed figure is AI Receptionist usage
 * for the current billing period — the only product today.
 */

export interface OverviewMetrics {
  activeClinics: number;
  suspendedClinics: number;
  inactiveClinics: number;
  totalMinutesConsumed: number;
}

export interface OverviewData {
  metrics: OverviewMetrics;
  usageRows: ClientUsageRow[];
}

export async function getOverviewData(): Promise<OverviewData> {
  const [byStatus, ai] = await Promise.all([
    prisma.client.groupBy({ by: ["status"], _count: { _all: true } }),
    getAiReceptionistConsoleData(),
  ]);

  const count = (status: string) =>
    byStatus.find((group) => group.status === status)?._count._all ?? 0;

  return {
    metrics: {
      activeClinics: count("ACTIVE"),
      suspendedClinics: count("SUSPENDED"),
      inactiveClinics: count("INACTIVE"),
      totalMinutesConsumed: ai.stats.totalMinutesConsumed,
    },
    usageRows: ai.rows,
  };
}
