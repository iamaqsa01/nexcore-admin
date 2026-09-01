import { NextResponse } from "next/server";

import { authorizeAdminApi } from "@/server/auth/rbac";

/**
 * Example protected endpoint under /api/admin/*.
 *
 * Middleware already gates this route, but the handler ALSO authorizes
 * independently — never assume the middleware ran.
 *
 *   anonymous        -> 401
 *   non SUPER_ADMIN  -> 403
 *   SUPER_ADMIN      -> 200 { user }
 */
export async function GET() {
  const gate = await authorizeAdminApi();
  if (!gate.ok) return gate.response;

  const { user } = gate.session;
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
