import { NextResponse } from "next/server";

import { authorizeAdminApi } from "@/server/auth/rbac";
import { canManageAiReceptionist } from "@/modules/ai-receptionist/permissions";
import { checkAiReceptionistAuthorization } from "@/server/backend/client";

/**
 * GET /api/admin/products/ai-receptionist/authorization-check?clientId=...
 *
 * Browser -> Next.js (this handler) -> server-to-server -> FastAPI backend.
 * The backend URL and service token stay on the server; the browser only
 * ever sees the ALLOW/BLOCK decision.
 */
export async function GET(request: Request) {
  const gate = await authorizeAdminApi();
  if (!gate.ok) return gate.response;
  if (!canManageAiReceptionist(gate.session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clientId = new URL(request.url).searchParams.get("clientId")?.trim();
  if (!clientId) {
    return NextResponse.json(
      { error: "clientId is required" },
      { status: 422 },
    );
  }

  const result = await checkAiReceptionistAuthorization(clientId);

  if (!result.ok) {
    // Backend not configured / unreachable — not the caller's fault.
    return NextResponse.json(
      { configured: result.code !== "BACKEND_NOT_CONFIGURED", ...result },
      { status: 503 },
    );
  }

  return NextResponse.json(result);
}
