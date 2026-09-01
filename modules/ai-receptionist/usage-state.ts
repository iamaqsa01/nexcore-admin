import type { ClientUsageRow } from "./components/types";

/**
 * Usage state for a client, derived from live figures. Client-safe (pure, no
 * imports beyond a type) so it can run in server components and in the
 * browser console alike.
 *
 * States are conveyed with a label + icon everywhere, never colour alone.
 */
export type UsageState =
  | "NORMAL"
  | "NEAR_LIMIT"
  | "QUOTA_REACHED"
  | "SUSPENDED"
  | "NOT_ENROLLED";

/** Percent of quota at which a client is flagged "near limit". */
export const NEAR_LIMIT_PERCENT = 80;

export function classifyUsage(
  row: Pick<
    ClientUsageRow,
    "enrolled" | "serviceStatus" | "usagePercent"
  >,
): UsageState {
  if (!row.enrolled) return "NOT_ENROLLED";
  // Any non-ACTIVE service status means the AI Receptionist is off for this
  // client (SUSPENDED / PAUSED / CANCELLED).
  if (row.serviceStatus !== "ACTIVE") return "SUSPENDED";
  if (row.usagePercent !== null && row.usagePercent >= 100) return "QUOTA_REACHED";
  if (row.usagePercent !== null && row.usagePercent >= NEAR_LIMIT_PERCENT) {
    return "NEAR_LIMIT";
  }
  return "NORMAL";
}

export type UsageStateTone = "success" | "warning" | "danger" | "neutral";

export const USAGE_STATE_META: Record<
  UsageState,
  { label: string; tone: UsageStateTone; description: string }
> = {
  NORMAL: {
    label: "Normal",
    tone: "success",
    description: "Under 80% of the monthly limit",
  },
  NEAR_LIMIT: {
    label: "Near limit",
    tone: "warning",
    description: "80% or more of the monthly limit used",
  },
  QUOTA_REACHED: {
    label: "Quota reached",
    tone: "danger",
    description: "Monthly limit met or exceeded — new sessions are blocked",
  },
  SUSPENDED: {
    label: "Suspended",
    tone: "neutral",
    description: "AI Receptionist service is turned off for this client",
  },
  NOT_ENROLLED: {
    label: "Not enrolled",
    tone: "neutral",
    description: "No monthly talk-time limit assigned yet",
  },
};
