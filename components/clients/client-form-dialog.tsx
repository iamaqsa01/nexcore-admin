"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClientSchema } from "@/lib/validation/client";
import type { ClientRow } from "@/components/clients/types";

type Mode = "create" | "edit";

type FieldErrors = Partial<Record<"name" | "website" | "domain", string>>;

export interface ClientFormDialogProps {
  open: boolean;
  mode: Mode;
  /** Required when `mode === "edit"`. */
  client?: ClientRow | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const EMPTY = { name: "", website: "", domain: "" };

export function ClientFormDialog({
  open,
  mode,
  client,
  onClose,
  onSaved,
}: ClientFormDialogProps) {
  const nameId = useId();
  const websiteId = useId();
  const domainId = useId();

  const [values, setValues] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Reset the form whenever the dialog opens / target changes.
  useEffect(() => {
    if (!open) return;
    setValues(
      mode === "edit" && client
        ? {
            name: client.name,
            website: client.website ?? "",
            domain: client.domain ?? "",
          }
        : EMPTY,
    );
    setFieldErrors({});
    setFormError(null);
    setPending(false);
  }, [open, mode, client]);

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setFormError(null);

    const parsed = createClientSchema.safeParse(values);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        next[key] ??= issue.message;
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    setPending(true);

    const url =
      mode === "create"
        ? "/api/admin/clients"
        : `/api/admin/clients/${client!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (res.ok) {
        onSaved(
          mode === "create" ? "Client created." : "Client details updated.",
        );
        onClose();
        return;
      }

      if (res.status === 401 || res.status === 403) {
        setFormError("Your session has expired. Refresh the page and sign in again.");
      } else if (res.status === 404) {
        setFormError("This client no longer exists.");
      } else if (res.status === 409 || res.status === 422) {
        const body = await res.json().catch(() => ({}));
        const fe = body.fieldErrors as
          | Record<string, string[] | undefined>
          | undefined;
        if (fe) {
          setFieldErrors({
            name: fe.name?.[0],
            website: fe.website?.[0],
            domain: fe.domain?.[0],
          });
        }
        if (!fe || res.status === 409) {
          setFormError(body.error ?? "Please check the highlighted fields.");
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const title = mode === "create" ? "Add client" : "Edit client";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={pending}
      title={title}
      description={
        mode === "create"
          ? "The internal Client ID (NC-CL-…) is generated automatically on the server."
          : `${client?.clientId ?? ""} · created ${
              client ? new Date(client.createdAt).toLocaleDateString() : ""
            }`
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="client-form" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : mode === "create" ? (
              "Create client"
            ) : (
              "Save changes"
            )}
          </Button>
        </>
      }
    >
      <form id="client-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {formError ? (
          <div
            role="alert"
            className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {formError}
          </div>
        ) : null}

        <Field
          id={nameId}
          label="Client name"
          error={fieldErrors.name}
          required
        >
          <Input
            id={nameId}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            disabled={pending}
            aria-invalid={Boolean(fieldErrors.name)}
            autoComplete="off"
            placeholder="Bright Smile Dental"
          />
        </Field>

        <Field id={websiteId} label="Website" error={fieldErrors.website}>
          <Input
            id={websiteId}
            type="url"
            value={values.website}
            onChange={(e) => set("website", e.target.value)}
            disabled={pending}
            aria-invalid={Boolean(fieldErrors.website)}
            autoComplete="off"
            placeholder="https://brightsmile.example.com"
          />
        </Field>

        <Field id={domainId} label="Domain" error={fieldErrors.domain}>
          <Input
            id={domainId}
            value={values.domain}
            onChange={(e) => set("domain", e.target.value)}
            disabled={pending}
            aria-invalid={Boolean(fieldErrors.domain)}
            autoComplete="off"
            placeholder="brightsmile.example.com"
          />
        </Field>
      </form>
    </Dialog>
  );
}

function Field({
  id,
  label,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? null : (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            (optional)
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
