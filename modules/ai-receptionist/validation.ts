import { z } from "zod";

/**
 * AI Receptionist input validation — client-safe (no Prisma / server imports),
 * so it can be shared by the browser dialogs and the API route handlers.
 */

/**
 * Monthly talk-time limit, in whole minutes. Free-form integer — the
 * 100 / 500 / 1000 / 5000 buttons in the UI are suggestions only and are
 * never enforced here.
 */
export const quotaAssignmentSchema = z.object({
  minutes: z.coerce
    .number({ invalid_type_error: "Enter a number of minutes" })
    .int("Minutes must be a whole number")
    .min(0, "Minutes cannot be negative")
    .max(1_000_000, "That exceeds the supported maximum"),
});

export const serviceStatusActionSchema = z.object({
  action: z.enum(["SUSPEND", "ACTIVATE"], {
    errorMap: () => ({ message: "Unknown service action" }),
  }),
});

export type QuotaAssignmentInput = z.infer<typeof quotaAssignmentSchema>;
export type ServiceStatusAction = z.infer<
  typeof serviceStatusActionSchema
>["action"];
