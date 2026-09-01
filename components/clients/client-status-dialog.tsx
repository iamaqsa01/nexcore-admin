"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClientStatusAction } from "@/lib/validation/client";
import type { ClientRow } from "@/components/clients/types";

export interface ClientStatusDialogProps {
  open: boolean;
  client: ClientRow | null;
  action: ClientStatusAction;
  onClose: () => void;
  onDone: (message: string) => void;
}

const COPY: Record<
  ClientStatusAction,
  {
    title: string;
    body: string;
    confirm: string;
    destructive: boolean;
    done: string;
  }
> = {
  SUSPEND: {
    title: "Suspend client?",
    body: "This will prevent the client's AI Receptionist service from operating once backend enforcement is connected. Historical data is kept and you can reactivate at any time.",
    confirm: "Suspend",
    destructive: true,
    done: "Client suspended.",
  },
  ACTIVATE: {
    title: "Activate client?",
    body: "The client's AI Receptionist service will be allowed to operate again once backend enforcement is connected.",
    confirm: "Activate",
    destructive: false,
    done: "Client activated.",
  },
  DEACTIVATE: {
    title: "Deactivate client?",
    body: "The client is moved to an inactive state and removed from active workflows. Subscriptions, call logs, and audit history are preserved — nothing is deleted. You can reactivate later.",
    confirm: "Deactivate",
    destructive: true,
    done: "Client deactivated.",
  },
};

export function ClientStatusDialog({
  open,
  client,
  action,
  onClose,
  onDone,
}: ClientStatusDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[action];

  async function confirm() {
    if (!client || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        onDone(copy.done);
        onClose();
        return;
      }
      if (res.status === 401 || res.status === 403) {
        setError("Your session has expired. Refresh the page and sign in again.");
      } else if (res.status === 404) {
        setError("This client no longer exists.");
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
      description={client ? `${client.name} · ${client.clientId}` : undefined}
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
