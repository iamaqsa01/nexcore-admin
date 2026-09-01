import { z } from "zod";

/**
 * Client Management validation — the single source of truth shared by the
 * browser form (`components/clients/*`) and the API route handlers
 * (`app/api/admin/clients/*`). Never trust the request body without one of
 * these; the internal `clientId`, `status`, `createdAt`, and `createdBy` are
 * NEVER accepted from input.
 */

/** Treat an empty / whitespace-only string as "field omitted". */
const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

export const clientNameSchema = z
  .string({ required_error: "Client name is required" })
  .trim()
  .min(2, "Client name must be at least 2 characters")
  .max(120, "Client name must be at most 120 characters");

export const websiteSchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .url("Enter a full URL, including https://")
    .max(2048, "Website URL is too long")
    .optional(),
);

export const domainSchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .toLowerCase()
    .max(253, "Domain is too long")
    .regex(
      /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/,
      "Enter a valid domain, e.g. clinic.example.com",
    )
    .optional(),
);

/** Fields a Super Admin may set when creating a client. */
export const createClientSchema = z.object({
  name: clientNameSchema,
  website: websiteSchema,
  domain: domainSchema,
});

/** Editable fields. `clientId` and `createdAt` are intentionally absent. */
export const updateClientSchema = createClientSchema;

export const CLIENT_STATUS_ACTIONS = [
  "SUSPEND",
  "ACTIVATE",
  "DEACTIVATE",
] as const;

export type ClientStatusAction = (typeof CLIENT_STATUS_ACTIONS)[number];

export const clientStatusActionSchema = z.object({
  action: z.enum(CLIENT_STATUS_ACTIONS, {
    errorMap: () => ({ message: "Unknown status action" }),
  }),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
