"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  Plus,
  Search,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatDate } from "@/lib/utils";
import type { ClientStatusAction } from "@/lib/validation/client";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { ClientStatusDialog } from "@/components/clients/client-status-dialog";
import type { ClientRow } from "@/components/clients/types";

const COLUMNS = ["Client name", "Website", "Client ID", "Status", "Created", ""];

type DialogState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; client: ClientRow }
  | { kind: "status"; client: ClientRow; action: ClientStatusAction };

export function ClientsView({
  clients,
  query,
}: {
  clients: ClientRow[];
  query: string;
}) {
  const router = useRouter();
  const [isRouting, startTransition] = useTransition();
  const [search, setSearch] = useState(query);
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const [toast, setToast] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Keep the box in sync if the URL changes elsewhere (e.g. back button).
  useEffect(() => setSearch(query), [query]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function runSearch(value: string) {
    setSearch(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const trimmed = value.trim();
      startTransition(() => {
        router.push(
          trimmed
            ? `/admin/clients?q=${encodeURIComponent(trimmed)}`
            : "/admin/clients",
        );
      });
    }, 300);
  }

  function afterMutation(message: string) {
    setToast(message);
    startTransition(() => router.refresh());
  }

  const closeDialog = () => setDialog({ kind: "none" });
  const hasQuery = query.trim().length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Manage NexCore clinic clients"
        actions={
          <Button onClick={() => setDialog({ kind: "create" })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Client
          </Button>
        }
      />

      {toast ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {toast}
        </div>
      ) : null}

      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(e) => runSearch(e.target.value)}
          placeholder="Search name, Client ID, domain, website…"
          aria-label="Search clients"
          className="pl-9"
        />
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasQuery ? "No clients match your search" : "No clients yet"}
          description={
            hasQuery
              ? "Try a different name, Client ID, domain, or website."
              : "Add your first clinic client to get started."
          }
          action={
            hasQuery ? undefined : (
              <Button onClick={() => setDialog({ kind: "create" })}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Client
              </Button>
            )
          }
        />
      ) : (
        <div className={cn(isRouting && "opacity-60 transition-opacity")}>
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((c, i) => (
                  <TableHead key={c || `col-${i}`} className={i === 5 ? "text-right" : ""}>
                    {c || "Actions"}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    <a
                      href={`/admin/clients/${client.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {client.name}
                    </a>
                    {client.domain ? (
                      <span className="block text-xs text-muted-foreground">
                        {client.domain}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {client.website ? (
                      <a
                        href={client.website}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        {prettyHost(client.website)}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    {client.clientId}
                  </TableCell>
                  <TableCell>
                    <ClientStatusBadge status={client.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(client.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      client={client}
                      onEdit={() => setDialog({ kind: "edit", client })}
                      onStatus={(action) =>
                        setDialog({ kind: "status", client, action })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ClientFormDialog
        open={dialog.kind === "create" || dialog.kind === "edit"}
        mode={dialog.kind === "edit" ? "edit" : "create"}
        client={dialog.kind === "edit" ? dialog.client : null}
        onClose={closeDialog}
        onSaved={afterMutation}
      />

      <ClientStatusDialog
        open={dialog.kind === "status"}
        client={dialog.kind === "status" ? dialog.client : null}
        action={dialog.kind === "status" ? dialog.action : "SUSPEND"}
        onClose={closeDialog}
        onDone={afterMutation}
      />
    </div>
  );
}

function RowActions({
  client,
  onEdit,
  onStatus,
}: {
  client: ClientRow;
  onEdit: () => void;
  onStatus: (action: ClientStatusAction) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="sm" onClick={onEdit}>
        Edit
      </Button>
      {client.status === "ACTIVE" ? (
        <Button variant="ghost" size="sm" onClick={() => onStatus("SUSPEND")}>
          Suspend
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => onStatus("ACTIVATE")}>
          Activate
        </Button>
      )}
      {client.status !== "INACTIVE" ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:bg-danger/10 hover:text-danger"
          onClick={() => onStatus("DEACTIVATE")}
        >
          Deactivate
        </Button>
      ) : null}
    </div>
  );
}

function prettyHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
