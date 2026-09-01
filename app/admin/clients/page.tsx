import type { Metadata } from "next";

import { listClients } from "@/server/clients/service";
import { ClientsView } from "@/components/clients/clients-view";

export const metadata: Metadata = { title: "Clients" };

// Always render against live data; results depend on the `q` search param.
export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const clients = await listClients({ q: query });

  return <ClientsView clients={clients} query={query} />;
}
