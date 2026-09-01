import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatNumber } from "@/lib/utils";
import { getClient, ClientServiceError } from "@/server/clients/service";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";

export const metadata: Metadata = { title: "Client details" };
export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let client;
  try {
    client = await getClient(id);
  } catch (err) {
    if (err instanceof ClientServiceError && err.code === "NOT_FOUND") {
      notFound();
    }
    throw err;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to clients
      </Link>

      <PageHeader
        title={client.name}
        description="Client record and linked activity."
        actions={<ClientStatusBadge status={client.status} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Detail label="Internal Client ID">
              <span className="font-mono text-sm">{client.clientId}</span>
            </Detail>
            <Detail label="Status">{client.status}</Detail>
            <Detail label="Website">
              {client.website ? (
                <a
                  href={client.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {client.website}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </Detail>
            <Detail label="Domain">
              {client.domain ?? <span className="text-muted-foreground">—</span>}
            </Detail>
            <Detail label="Created">{formatDate(client.createdAt)}</Detail>
            <Detail label="Last updated">{formatDate(client.updatedAt)}</Detail>
            <Detail label="Subscriptions">
              {formatNumber(client._count.subscriptions)}
            </Detail>
            <Detail label="Call logs">
              {formatNumber(client._count.callLogs)}
            </Detail>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
