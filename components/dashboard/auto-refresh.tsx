"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Live updates, the simple reliable way: re-run the server component tree on
 * an interval via `router.refresh()`. No websockets, no extra dependency, no
 * client-side data store to keep in sync. Pauses while the tab is hidden.
 */
export function AutoRefresh({
  intervalMs = 20_000,
  label = "Live",
}: {
  intervalMs?: number;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      startTransition(() => {
        router.refresh();
        setUpdatedAt(Date.now());
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
      title={
        updatedAt
          ? `Last refreshed ${new Date(updatedAt).toLocaleTimeString()}`
          : "Auto-refreshing"
      }
    >
      <RefreshCw
        className={cn("h-3 w-3", pending && "animate-spin")}
        aria-hidden="true"
      />
      {label} · {Math.round(intervalMs / 1000)}s
    </span>
  );
}
