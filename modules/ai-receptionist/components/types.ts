import type { SubscriptionStatus } from "@prisma/client";

/**
 * Plain, serialisable shapes passed from the server page into the client
 * console. Mirrors `ClientUsageRow` / `DashboardStats` in `../usage.ts`
 * (re-declared here so client components never import server code).
 */

export type ServiceStatus = SubscriptionStatus | "NOT_ENROLLED";

export interface ClientUsageRow {
  clientId: string;
  internalClientId: string;
  name: string;
  website: string | null;
  enrolled: boolean;
  serviceStatus: ServiceStatus;
  assignedMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  usagePercent: number | null;
}
