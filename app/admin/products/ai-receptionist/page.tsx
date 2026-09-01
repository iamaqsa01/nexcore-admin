import type { Metadata } from "next";
import { Activity, Building2, Gauge, PauseCircle } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatNumber } from "@/lib/utils";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { aiReceptionistManifest } from "@/modules/ai-receptionist/manifest";
import { getAiReceptionistConsoleData } from "@/modules/ai-receptionist/usage";
import { AiReceptionistConsole } from "@/modules/ai-receptionist/components/console";

export const metadata: Metadata = { title: "AI Receptionist" };

// Everything on this page is live DB aggregation for the current billing period.
export const dynamic = "force-dynamic";

export default async function AiReceptionistPage() {
  const { stats, rows } = await getAiReceptionistConsoleData();

  return (
    <div className="space-y-6">
      <PageHeader
        title={aiReceptionistManifest.name}
        description="Monthly talk-time quota and usage per clinic, current billing period."
        actions={
          <div className="flex items-center gap-3">
            <AutoRefresh />
            <Badge tone="info">{aiReceptionistManifest.id}</Badge>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Clinics"
          value={formatNumber(stats.activeClinics)}
          hint="AI Receptionist service active"
          icon={Building2}
        />
        <StatCard
          label="Suspended Clinics"
          value={formatNumber(stats.suspendedClinics)}
          hint="AI Receptionist service suspended"
          icon={PauseCircle}
        />
        <StatCard
          label="Total Minutes Consumed"
          value={formatNumber(stats.totalMinutesConsumed)}
          hint="Sum of call duration this period"
          icon={Activity}
        />
        <StatCard
          label="Total Assigned Minutes"
          value={formatNumber(stats.totalAssignedMinutes)}
          hint="Sum of monthly talk-time limits"
          icon={Gauge}
        />
      </div>

      <AiReceptionistConsole rows={rows} />
    </div>
  );
}
