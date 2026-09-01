"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClientUsageRow } from "./types";

type Action = "SUSPEND" | "ACTIVATE";

const COPY: Record<
  Action,
  { title: string; body: string; confirm: string; destructive: boolean; done: string }
> = {
  SUSPEND: {
    title: "Suspend AI Receptionist?",
    body: "This turns the AI Receptionist service off for this client and is saved to the database. Call history and the assigned quota are kept. You can reactivate at any time.",
    confirm: "Suspend service",
    destructive: true,
    done: "AI Receptionist suspended for this client.",
  },
  ACTIVATE: {
    title: "Activate AI Receptionist?",
    body: "This turns the AI Receptionist service back on for this client.",
    confirm: "Activate service",
    destructive: false,
    done: "AI Receptionist activated for this client.",
  },
};

export interface ServiceStatusDialogProps {
  open: boolean;
  row: ClientUsageRow | null;
  action: Action;
  onClose: () => void;
  onDone: (message: string) => void;
}

export function ServiceStatusDialog({
  open,
  row,
  action,
  onClose,
  onDone,
}: ServiceStatusDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[action];

  useEffect(() => {
    if (open) {
      setPending(false);
      setError(null);
    }
  }, [open]);

  async function confirm() {
    if (!row || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/products/ai-receptionist/clients/${row.clientId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      if (res.ok) {
        onDone(copy.done);
        onClose();
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        setError("Your session has expired. Refresh and sign in again.");
      } else if (res.status === 404) {
        setError(body.error ?? "This client is not enrolled in AI Receptionist.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={pending}
      title={copy.title}
      description={row ? `${row.name} · ${row.internalClientId}` : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={confirm}
            disabled={pending}
            className={cn(
              copy.destructive &&
                "bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger",
            )}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Working…
              </>
            ) : (
              copy.confirm
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{copy.body}</p>
        {error ? (
          <div
            role="alert"
            className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {error}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
