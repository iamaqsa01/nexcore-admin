import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * Edge-safe Auth.js configuration.
 *
 * This file MUST NOT import Prisma, bcrypt, or any Node-only module — it is
 * loaded by `middleware.ts` which runs on the Edge runtime. The real provider
 * (Credentials, with a DB + bcrypt `authorize`) is added in `auth.ts`.
 *
 * The `jwt` / `session` callbacks live here so BOTH the middleware instance
 * and the server instance derive `role` identically from the signed token.
 */

const PROTECTED_PAGE_PREFIXES = ["/admin"];
const PROTECTED_API_PREFIXES = ["/api/admin"];

function hasPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export const authConfig = {
  // No adapter: Credentials requires JWT sessions.
  session: { strategy: "jwt" },
  // Trust the deployment host (Vercel sets this automatically; explicit here so
  // self-hosted / preview deployments behind a proxy also work). Combine with
  // AUTH_URL in production for strict host pinning if desired.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  // Real providers are attached in `auth.ts`. Middleware only needs to decode
  // the existing session token, which requires no provider.
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id ?? token.sub ?? "") as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
    /**
     * Coarse-grained gate run in middleware for every matched request.
     * Fine-grained authorization is ALSO enforced server-side in
     * `requireSuperAdmin()` / route handlers — never rely on this alone.
     */
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;
      const isProtectedPage = hasPrefix(pathname, PROTECTED_PAGE_PREFIXES);
      const isProtectedApi = hasPrefix(pathname, PROTECTED_API_PREFIXES);

      if (!isProtectedPage && !isProtectedApi) return true;

      const user = auth?.user;

      // Anonymous.
      if (!user) {
        if (isProtectedApi) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return false; // -> redirect to `pages.signIn` with ?callbackUrl
      }

      // Authenticated but not a Super Admin.
      if (user.role !== "SUPER_ADMIN") {
        if (isProtectedApi) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.rewrite(new URL("/forbidden", nextUrl), {
          status: 403,
        });
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
