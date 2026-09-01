import type { Metadata } from "next";
import { Activity, Building2, PauseCircle, Users } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber } from "@/lib/utils";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { ClientUsageTable } from "@/components/dashboard/client-usage-table";
import { UsageStateLegend } from "@/components/dashboard/usage-state-legend";
import { getOverviewData } from "@/server/dashboard/metrics";

export const metadata: Metadata = { title: "Overview" };

// Live figures — aggregated per request, never cached.
export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const { metrics, usageRows } = await getOverviewData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Platform-wide health for the NexCore AI Voice Receptionist service."
        actions={<AutoRefresh />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Active Clinics"
          value={formatNumber(metrics.activeClinics)}
          hint="Clients with ACTIVE status"
          icon={Building2}
        />
        <StatCard
          label="Total Suspended Clinics"
          value={formatNumber(metrics.suspendedClinics)}
          hint="Clients suspended by an admin"
          icon={PauseCircle}
        />
        <StatCard
          label="Total Minutes Consumed"
          value={formatNumber(metrics.totalMinutesConsumed)}
          hint="AI Receptionist, current billing period"
          icon={Activity}
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Client usage</h2>
          <UsageStateLegend />
        </div>

        {usageRows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No clients yet"
            description="Add clients in Client Management to see live talk-time usage here."
          />
        ) : (
          <ClientUsageTable rows={usageRows} />
        )}
      </section>
    </div>
  );
}
