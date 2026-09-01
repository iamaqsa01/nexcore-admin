"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { quotaAssignmentSchema } from "@/modules/ai-receptionist/validation";
import type { ClientUsageRow } from "./types";

/** Suggestions only — the field stays free-form; no packages are enforced. */
const SUGGESTIONS = [100, 500, 1000, 5000];

export interface QuotaDialogProps {
  open: boolean;
  row: ClientUsageRow | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function QuotaDialog({ open, row, onClose, onSaved }: QuotaDialogProps) {
  const inputId = useId();
  const [value, setValue] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValue(row && row.enrolled ? String(row.assignedMinutes) : "");
    setFieldError(null);
    setFormError(null);
    setPending(false);
  }, [open, row]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || !row) return;

    const parsed = quotaAssignmentSchema.safeParse({ minutes: value });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Invalid value");
      return;
    }
    setFieldError(null);
    setFormError(null);
    setPending(true);

    try {
      const res = await fetch(
        `/api/admin/products/ai-receptionist/clients/${row.clientId}/quota`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ minutes: parsed.data.minutes }),
        },
      );

      if (res.ok) {
        onSaved(
          row.enrolled
            ? "Monthly talk-time limit updated."
            : "Client enrolled and monthly talk-time limit set.",
        );
        onClose();
        return;
      }

      const body = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        setFormError("Your session has expired. Refresh and sign in again.");
      } else if (res.status === 404) {
        setFormError("This client no longer exists.");
      } else if (res.status === 409) {
        setFormError(
          body.error ?? "AI Receptionist is not configured on this deployment.",
        );
      } else if (res.status === 422) {
        setFieldError(
          body.fieldErrors?.minutes?.[0] ?? body.error ?? "Invalid value",
        );
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={pending}
      title={row?.enrolled ? "Edit monthly talk-time limit" : "Assign monthly talk-time limit"}
      description={
        row
          ? `${row.name} · ${row.internalClientId}`
          : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="quota-form" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              "Save limit"
            )}
          </Button>
        </>
      }
    >
      <form id="quota-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {formError ? (
          <div
            role="alert"
            className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {formError}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor={inputId} className="text-sm font-medium">
            Monthly talk-time limit
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (minutes)
            </span>
          </label>
          <Input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={pending}
            aria-invalid={Boolean(fieldError)}
            placeholder="e.g. 500"
          />
          {fieldError ? (
            <p className="text-xs text-danger">{fieldError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Whole minutes per billing period. Enter any value.
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SUGGESTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setValue(String(n))}
                disabled={pending}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                {n.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Dialog>
  );
}
