import { NextResponse } from "next/server";

import { authorizeAdminApi } from "@/server/auth/rbac";
import { canManageAiReceptionist } from "@/modules/ai-receptionist/permissions";
import { serviceStatusActionSchema } from "@/modules/ai-receptionist/validation";
import {
  setServiceStatus,
  aiQuotaErrorStatus,
  AiQuotaError,
} from "@/modules/ai-receptionist/quota";

/**
 * PATCH /api/admin/products/ai-receptionist/clients/[clientId]/status
 *   body: { action: "SUSPEND" | "ACTIVATE" }
 *   -> 200 { subscriptionId, status }
 *
 * The new Subscription.status is derived server-side from `action` and
 * persisted — never a UI-only toggle.
 */

type Ctx = { params: Promise<{ clientId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const gate = await authorizeAdminApi();
  if (!gate.ok) return gate.response;
  if (!canManageAiReceptionist(gate.session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { clientId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = serviceStatusActionSchema.safeParse(body);
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
    const result = await setServiceStatus(
      clientId,
      parsed.data.action,
      gate.session.user.id,
    );
    return NextResponse.json(result);
  } catch (err) {
    const status = aiQuotaErrorStatus(err);
    if (status && err instanceof AiQuotaError) {
      return NextResponse.json({ error: err.message }, { status });
    }
    throw err;
  }
}
