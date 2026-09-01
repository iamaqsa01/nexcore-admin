/**
 * Server-to-server client for the NexCore Python/FastAPI backend.
 *
 * SERVER ONLY. `NEXCORE_BACKEND_URL` and `ADMIN_SERVICE_SECRET` are read from
 * the server environment here and never leave it — callers get back a small
 * decision object, never the URL or the token. Do not import this from a
 * client component.
 */

const REQUEST_TIMEOUT_MS = 5_000;

export type AiAuthorizationResult =
  | {
      ok: true;
      allowed: true;
      quotaMinutes: number;
      quotaSeconds: number;
      usedSeconds: number;
      remainingSeconds: number;
    }
  | {
      ok: true;
      allowed: false;
      /** Stable code from the backend: CLIENT_NOT_FOUND / SUBSCRIPTION_INACTIVE
       *  / CLIENT_SUSPENDED / QUOTA_EXCEEDED. */
      code: string;
      message: string;
      httpStatus: number;
    }
  | {
      ok: false;
      code: "BACKEND_NOT_CONFIGURED" | "BACKEND_UNREACHABLE";
      message: string;
    };

function backendConfig(): { baseUrl: string; token: string } | null {
  const baseUrl = process.env.NEXCORE_BACKEND_URL?.replace(/\/+$/, "");
  const token = process.env.ADMIN_SERVICE_SECRET;
  if (!baseUrl || !token) return null;
  return { baseUrl, token };
}

/**
 * Ask the backend whether a new AI Receptionist session for `clientId` would
 * be allowed right now. Pure pre-flight check — no reservation is made.
 */
export async function checkAiReceptionistAuthorization(
  clientId: string,
): Promise<AiAuthorizationResult> {
  const config = backendConfig();
  if (!config) {
    return {
      ok: false,
      code: "BACKEND_NOT_CONFIGURED",
      message:
        "Set NEXCORE_BACKEND_URL and ADMIN_SERVICE_SECRET to enable live enforcement checks.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${config.baseUrl}/v1/ai-receptionist/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Token": config.token,
      },
      body: JSON.stringify({ client_id: clientId }),
      cache: "no-store",
      signal: controller.signal,
    });

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (res.ok) {
      return {
        ok: true,
        allowed: true,
        quotaMinutes: Number(body.quota_minutes ?? 0),
        quotaSeconds: Number(body.quota_seconds ?? 0),
        usedSeconds: Number(body.used_seconds ?? 0),
        remainingSeconds: Number(body.remaining_seconds ?? 0),
      };
    }

    return {
      ok: true,
      allowed: false,
      code: String(body.code ?? body.detail ?? "BLOCKED"),
      message: String(body.message ?? "The session would be blocked."),
      httpStatus: res.status,
    };
  } catch {
    return {
      ok: false,
      code: "BACKEND_UNREACHABLE",
      message: "The NexCore backend did not respond.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
