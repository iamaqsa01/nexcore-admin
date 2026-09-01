import { NextResponse } from "next/server";

import { authorizeAdminApi } from "@/server/auth/rbac";
import { createClientSchema } from "@/lib/validation/client";
import {
  createClient,
  listClients,
  clientErrorStatus,
  ClientServiceError,
} from "@/server/clients/service";

/**
 * /api/admin/clients
 *
 *   GET  ?q=<search>   -> 200 { clients }
 *   POST { name, website?, domain? } -> 201 { client }
 *
 * Middleware already gates this path, but every handler ALSO authorizes
 * independently via `authorizeAdminApi()` (401 anonymous / 403 non-admin).
 * The internal clientId / status / createdAt are never read from the body.
 */

export async function GET(request: Request) {
  const gate = await authorizeAdminApi();
  if (!gate.ok) return gate.response;

  const q = new URL(request.url).searchParams.get("q") ?? undefined;
  const clients = await listClients({ q });
  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const gate = await authorizeAdminApi();
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createClientSchema.safeParse(body);
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
    const client = await createClient(parsed.data, gate.session.user.id);
    return NextResponse.json({ client }, { status: 201 });
  } catch (err) {
    const status = clientErrorStatus(err);
    if (status && err instanceof ClientServiceError) {
      return NextResponse.json(
        { error: err.message, fieldErrors: err.fieldErrors },
        { status },
      );
    }
    throw err;
  }
}
