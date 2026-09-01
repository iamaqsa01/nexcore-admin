import type { ClientStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const MAP: Record<
  ClientStatus,
  { tone: "success" | "warning" | "neutral"; label: string }
> = {
  ACTIVE: { tone: "success", label: "Active" },
  SUSPENDED: { tone: "warning", label: "Suspended" },
  INACTIVE: { tone: "neutral", label: "Inactive" },
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const { tone, label } = MAP[status] ?? MAP.INACTIVE;
  return <Badge tone={tone}>{label}</Badge>;
}
