import { UsageStateBadge } from "@/modules/ai-receptionist/components/usage-state-badge";
import type { UsageState } from "@/modules/ai-receptionist/usage-state";

const STATES: UsageState[] = [
  "NORMAL",
  "NEAR_LIMIT",
  "QUOTA_REACHED",
  "SUSPENDED",
];

/** Compact key for the usage-state column. */
export function UsageStateLegend() {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {STATES.map((state) => (
        <UsageStateBadge key={state} state={state} />
      ))}
    </div>
  );
}
