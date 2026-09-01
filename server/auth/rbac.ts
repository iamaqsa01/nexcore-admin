import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";

import { auth } from "@/auth";

/**
 * Server-side authorization helpers. Import ONLY from server components, server
 * actions, and route handlers. Never expose the result to the client as a
 * trust boundary — the role always comes from the signed session here.
 */

export type AdminSession = Session & {
  user: NonNullable<Session["user"]>;
};

/**
 * Require any authenticated user. Redirects anonymous visitors to /login with
 * a callbackUrl. For use in server components / pages.
 */
export async function requireAuth(): Promise<AdminSession> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session as AdminSession;
}

/**
 * Require an authenticated SUPER_ADMIN. Anonymous -> /login, authenticated
 * non-admin -> /forbidden. For use in server components / pages / layouts.
 */
export async function requireSuperAdmin(): Promise<AdminSession> {
  const session = await requireAuth();
  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/forbidden");
  }
  return session;
}

export type AdminApiResult =
  | { ok: true; session: AdminSession }
  | { ok: false; response: NextResponse };

/**
 * Authorize a request inside an `/api/admin/*` route handler. Returns a
 * discriminated result instead of redirecting, so the handler can return the
 * correct JSON + status code:
 *
 *   const gate = await authorizeAdminApi();
 *   if (!gate.ok) return gate.response;   // 401 or 403
 *   // ...use gate.session
 */
export async function authorizeAdminApi(): Promise<AdminApiResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (session.user.role !== "SUPER_ADMIN") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, session: session as AdminSession };
}
