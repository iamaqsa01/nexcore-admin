import { NextResponse } from "next/server";

import { authorizeAdminApi } from "@/server/auth/rbac";
import { updateClientSchema } from "@/lib/validation/client";
import {
  getClient,
  updateClient,
  setClientStatus,
  clientErrorStatus,
  ClientServiceError,
} from "@/server/clients/service";

/**
 * /api/admin/clients/[id]
 *
 *   GET    -> 200 { client }              (404 if missing)
 *   PATCH  { name, website?, domain? }    -> 200 { client }  (409 domain clash / 422)
 *   DELETE -> 200 { client }              soft-delete: sets status = INACTIVE.
 *            Never a hard delete — Subscription / CallLog / AuditLog history
 *            is preserved (FKs are ON DELETE RESTRICT).
 */

type Ctx = { params: Promise<{ id: string }> };

function serviceErrorResponse(err: unknown) {
  const status = clientErrorStatus(err);
  if (status && err instanceof ClientServiceError) {
    return NextResponse.json(
      { error: err.message, fieldErrors: err.fieldErrors },
      { status },
    );
  }
  return null;
}

export async function GET(_request: Request, ctx: Ctx) {
  const gate = await authorizeAdminApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  try {
    const client = await getClient(id);
    return NextResponse.json({ client });
  } catch (err) {
    const res = serviceErrorResponse(err);
    if (res) return res;
    throw err;
  }
}

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

  const parsed = updateClientSchema.safeParse(body);
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
    const client = await updateClient(id, parsed.data, gate.session.user.id);
    return NextResponse.json({ client });
  } catch (err) {
    const res = serviceErrorResponse(err);
    if (res) return res;
    throw err;
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const gate = await authorizeAdminApi();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  try {
    const client = await setClientStatus(id, "DEACTIVATE", gate.session.user.id);
    return NextResponse.json({ client });
  } catch (err) {
    const res = serviceErrorResponse(err);
    if (res) return res;
    throw err;
  }
}
