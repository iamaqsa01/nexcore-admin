"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  Gauge,
  PhoneCall,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatNumber } from "@/lib/utils";
import { classifyUsage } from "@/modules/ai-receptionist/usage-state";
import { QuotaDialog } from "./quota-dialog";
import { ServiceStatusDialog } from "./service-status-dialog";
import { UsageStateBadge } from "./usage-state-badge";
import type { ClientUsageRow } from "./types";

const COLUMNS = [
  "Client name",
  "Website",
  "Assigned",
  "Used",
  "Remaining",
  "Usage %",
  "Status",
  "",
];

type DialogState =
  | { kind: "none" }
  | { kind: "quota"; row: ClientUsageRow }
  | { kind: "status"; row: ClientUsageRow; action: "SUSPEND" | "ACTIVATE" };

type Notice = { text: string; tone: "success" | "danger" | "muted" };

const NOTICE_STYLES: Record<Notice["tone"], string> = {
  success: "border-success/30 bg-success/10 text-success",
  danger: "border-danger/30 bg-danger/10 text-danger",
  muted: "border-border bg-muted text-muted-foreground",
};

export function AiReceptionistConsole({ rows }: { rows: ClientUsageRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  function afterMutation(message: string) {
    setNotice({ text: message, tone: "success" });
    startTransition(() => router.refresh());
  }

  async function checkEnforcement(row: ClientUsageRow) {
    if (checkingId) return;
    setCheckingId(row.clientId);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/admin/products/ai-receptionist/authorization-check?clientId=${encodeURIComponent(
          row.clientId,
        )}`,
      );
      const body = await res.json().catch(() => ({}));
      if (res.status === 503) {
        setNotice({
          text: `${row.name}: ${body.message ?? "Enforcement backend unavailable."}`,
          tone: "muted",
        });
      } else if (body.ok && body.allowed) {
        setNotice({
          text: `${row.name}: ALLOW — ${formatNumber(
            Math.round(body.remainingSeconds / 60),
          )} min remaining this period.`,
          tone: "success",
        });
      } else if (body.ok && body.allowed === false) {
        setNotice({
          text: `${row.name}: BLOCK — ${body.code}${
            body.message ? ` (${body.message})` : ""
          }`,
          tone: "danger",
        });
      } else {
        setNotice({ text: `${row.name}: check failed.`, tone: "muted" });
      }
    } catch {
      setNotice({ text: `${row.name}: network error.`, tone: "muted" });
    } finally {
      setCheckingId(null);
    }
  }

  const close = () => setDialog({ kind: "none" });

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={PhoneCall}
        title="No clients to show"
        description="Add a client in Client Management, then assign a monthly talk-time limit here to enrol it in AI Receptionist."
      />
    );
  }

  return (
    <div className="space-y-4">
      {notice ? (
        <div
          role="status"
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
            NOTICE_STYLES[notice.tone],
          )}
        >
          {notice.tone === "danger" ? (
            <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {notice.text}
        </div>
      ) : null}

      <div className={cn(isPending && "opacity-60 transition-opacity")}>
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((c, i) => (
                <TableHead
                  key={c || "actions"}
                  className={cn(
                    i >= 2 && i <= 5 && "text-right",
                    i === 7 && "text-right",
                  )}
                >
                  {c || "Actions"}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <UsageRow
                key={row.clientId}
                row={row}
                checking={checkingId === row.clientId}
                onQuota={() => setDialog({ kind: "quota", row })}
                onStatus={(action) =>
                  setDialog({ kind: "status", row, action })
                }
                onCheck={() => checkEnforcement(row)}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <QuotaDialog
        open={dialog.kind === "quota"}
        row={dialog.kind === "quota" ? dialog.row : null}
        onClose={close}
        onSaved={afterMutation}
      />
      <ServiceStatusDialog
        open={dialog.kind === "status"}
        row={dialog.kind === "status" ? dialog.row : null}
        action={dialog.kind === "status" ? dialog.action : "SUSPEND"}
        onClose={close}
        onDone={afterMutation}
      />
    </div>
  );
}

function UsageRow({
  row,
  checking,
  onQuota,
  onStatus,
  onCheck,
}: {
  row: ClientUsageRow;
  checking: boolean;
  onQuota: () => void;
  onStatus: (action: "SUSPEND" | "ACTIVATE") => void;
  onCheck: () => void;
}) {
  const state = classifyUsage(row);
  const over = row.usagePercent !== null && row.usagePercent >= 100;

  return (
    <TableRow>
      <TableCell className="font-medium">{row.name}</TableCell>
      <TableCell>
        {row.website ? (
          <a
            href={row.website}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {prettyHost(row.website)}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {row.enrolled ? formatNumber(row.assignedMinutes) : "—"}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatNumber(row.usedMinutes)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {row.enrolled ? formatNumber(row.remainingMinutes) : "—"}
      </TableCell>
      <TableCell className="text-right">
        {row.usagePercent === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <span
              className={cn(
                "tabular-nums",
                over && "font-medium text-danger",
              )}
            >
              {row.usagePercent}%
            </span>
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <span
                className={cn(
                  "block h-full rounded-full",
                  over ? "bg-danger" : "bg-primary",
                )}
                style={{ width: `${Math.min(row.usagePercent, 100)}%` }}
              />
            </span>
          </div>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <UsageStateBadge state={state} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={onQuota}>
            <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
            {row.enrolled ? "Edit quota" : "Assign quota"}
          </Button>
          {row.enrolled && row.serviceStatus === "ACTIVE" ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger/10 hover:text-danger"
              onClick={() => onStatus("SUSPEND")}
            >
              Suspend
            </Button>
          ) : null}
          {row.enrolled && row.serviceStatus !== "ACTIVE" ? (
            <Button variant="ghost" size="sm" onClick={() => onStatus("ACTIVATE")}>
              Activate
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={onCheck}
            disabled={checking}
            title="Ask the backend whether a new session would be allowed"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {checking ? "Checking…" : "Check"}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function prettyHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
