import type { UserRole } from "@prisma/client";

/**
 * Module-owned authorization.
 *
 * Core RBAC (`server/auth/rbac.ts`) still runs first on every route — it
 * guarantees an authenticated `SUPER_ADMIN`. This layer expresses the
 * AI Receptionist module's own rule on top, so that when more roles exist
 * the module decides which of them may manage its quota / service controls
 * without the core needing to know.
 */

/** Roles allowed to assign quota and toggle the AI Receptionist service. */
export const AI_RECEPTIONIST_MANAGE_ROLES: readonly UserRole[] = ["SUPER_ADMIN"];

export function canManageAiReceptionist(
  role: UserRole | null | undefined,
): boolean {
  return role != null && AI_RECEPTIONIST_MANAGE_ROLES.includes(role);
}
