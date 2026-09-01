import { AlertTriangle, Ban, Circle, MinusCircle, PauseCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  USAGE_STATE_META,
  type UsageState,
} from "@/modules/ai-receptionist/usage-state";

const ICONS: Record<UsageState, LucideIcon> = {
  NORMAL: Circle,
  NEAR_LIMIT: AlertTriangle,
  QUOTA_REACHED: Ban,
  SUSPENDED: PauseCircle,
  NOT_ENROLLED: MinusCircle,
};

/** Label + icon + tone — readable without relying on colour. */
export function UsageStateBadge({ state }: { state: UsageState }) {
  const meta = USAGE_STATE_META[state];
  const Icon = ICONS[state];
  return (
    <Badge tone={meta.tone} className="gap-1" title={meta.description}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
