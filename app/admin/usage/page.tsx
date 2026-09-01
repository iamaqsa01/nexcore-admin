import type { Metadata } from "next";
import { Activity } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { ClientUsageTable } from "@/components/dashboard/client-usage-table";
import { UsageStateLegend } from "@/components/dashboard/usage-state-legend";
import { getAiReceptionistConsoleData } from "@/modules/ai-receptionist/usage";

export const metadata: Metadata = { title: "Usage" };

export const dynamic = "force-dynamic";

export default async function UsagePage() {
  const { rows } = await getAiReceptionistConsoleData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usage"
        description="Live talk-time consumption per clinic for the current billing period."
        actions={<AutoRefresh />}
      />

      <UsageStateLegend />

      {rows.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No usage to show"
          description="Once clients are added and calls are recorded, per-clinic consumption appears here."
        />
      ) : (
        <ClientUsageTable rows={rows} />
      )}
    </div>
  );
}
