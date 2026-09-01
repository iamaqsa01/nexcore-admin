import { NextResponse } from "next/server";

import { authorizeAdminApi } from "@/server/auth/rbac";
import { canManageAiReceptionist } from "@/modules/ai-receptionist/permissions";
import { quotaAssignmentSchema } from "@/modules/ai-receptionist/validation";
import {
  assignMonthlyTalkTime,
  aiQuotaErrorStatus,
  AiQuotaError,
} from "@/modules/ai-receptionist/quota";

/**
 * PUT /api/admin/products/ai-receptionist/clients/[clientId]/quota
 *   body: { minutes: number }
 *   -> 200 { subscriptionId, minutes, previousMinutes, createdSubscription }
 *
 * Core RBAC (`authorizeAdminApi`) runs first (401 / 403); the module then
 * applies its own role rule. `minutes` is the only accepted input.
 */

type Ctx = { params: Promise<{ clientId: string }> };

export async function PUT(request: Request, ctx: Ctx) {
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

  const parsed = quotaAssignmentSchema.safeParse(body);
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
    const result = await assignMonthlyTalkTime(
      clientId,
      parsed.data,
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
