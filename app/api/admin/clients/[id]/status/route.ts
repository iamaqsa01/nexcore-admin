import { NextResponse } from "next/server";

import { authorizeAdminApi } from "@/server/auth/rbac";
import { clientStatusActionSchema } from "@/lib/validation/client";
import {
  setClientStatus,
  clientErrorStatus,
  ClientServiceError,
} from "@/server/clients/service";

/**
 * PATCH /api/admin/clients/[id]/status  { action: "SUSPEND" | "ACTIVATE" | "DEACTIVATE" }
 *   -> 200 { client }
 *
 * The new status is derived server-side from `action`; the browser can never
 * send a raw status value. Persisted to the database (not a UI-only toggle)
 * and written to the audit trail.
 */

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const gate = await authorizeAdminApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = clientStatusActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  try {
    const client = await setClientStatus(
      id,
      parsed.data.action,
      gate.session.user.id,
    );
    return NextResponse.json({ client });
  } catch (err) {
    const status = clientErrorStatus(err);
    if (status && err instanceof ClientServiceError) {
      return NextResponse.json({ error: err.message }, { status });
    }
    throw err;
  }
}
