import { ExternalLink } from "lucide-react";

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
import { UsageStateBadge } from "@/modules/ai-receptionist/components/usage-state-badge";
import type { ClientUsageRow } from "@/modules/ai-receptionist/components/types";

const COLUMNS = [
  "Client name",
  "Website",
  "Assigned min",
  "Used min",
  "Remaining min",
  "Usage %",
  "Status",
];

/**
 * Read-only client usage table shared by the Overview and Usage pages.
 * Plain server component — no hooks — so it renders on the server and can
 * also sit inside a client tree.
 */
export function ClientUsageTable({ rows }: { rows: ClientUsageRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {COLUMNS.map((c, i) => (
            <TableHead key={c} className={cn(i >= 2 && i <= 5 && "text-right")}>
              {c}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const state = classifyUsage(row);
          const over = row.usagePercent !== null && row.usagePercent >= 100;
          return (
            <TableRow key={row.clientId}>
              <TableCell className="font-medium">
                {row.name}
                <span className="block font-mono text-xs text-muted-foreground">
                  {row.internalClientId}
                </span>
              </TableCell>
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
              <TableCell className="whitespace-nowrap text-right tabular-nums">
                {row.enrolled ? formatNumber(row.assignedMinutes) : "—"}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right tabular-nums">
                {formatNumber(row.usedMinutes)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right tabular-nums">
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
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function prettyHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
