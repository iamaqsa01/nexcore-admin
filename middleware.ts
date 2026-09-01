import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Edge middleware — first line of defense for protected routes.
 *
 * Uses the edge-safe `authConfig` (no Prisma/bcrypt). The `authorized`
 * callback in `auth.config.ts` decides: anonymous -> /login, authenticated
 * non-admin -> 403, SUPER_ADMIN -> pass.
 *
 * This is NOT the only check: server components call `requireSuperAdmin()`
 * and every `/api/admin/*` handler re-authorizes independently.
 */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
