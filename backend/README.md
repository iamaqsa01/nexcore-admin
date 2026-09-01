# NexCore Backend

Server-to-server authority for **AI Receptionist session authorization and
quota enforcement**. This is **not** the admin panel and **not** the AI voice
runtime — it answers one question for every new session: **ALLOW or BLOCK**.

```
Browser → Next.js Admin Panel → (X-Service-Token) → NexCore Backend → PostgreSQL
```

The database is owned by Prisma (`../prisma/schema.prisma`). This service
reads `Client` / `Subscription` / `SubscriptionEntitlement` and reads+writes
`CallLog`. It never creates tables or runs migrations.

## Layout

```
app/
├── config.py                  settings (env), entitlement/product keys
├── db.py                      lazy async engine + session
├── security.py                require_service_token (constant-time)
├── errors.py                  AuthorizationError + reason codes
├── models.py                  SQLAlchemy Core tables over the Prisma schema
├── auth/                      re-exports the service-token dependency
├── clients/repository.py      get_client (by cuid or "NC-CL-…")
├── subscriptions/repository.py get_ai_receptionist_subscription (+ FOR UPDATE)
├── usage/repository.py        billing window + SUM(durationSeconds)
└── modules/ai_receptionist/
    ├── quota.py               get_quota_minutes, reservation sizing
    ├── authorization.py       authorize_ai_receptionist(client_id, repo)
    ├── repository.py          SQLAlchemy repo + reserve/complete/release
    └── routes.py              POST /authorize, /sessions, /sessions/{id}/complete|release
tests/
```

## Authorization flow

`authorize_ai_receptionist(client_id, repo)` →

| Step | Block response (`detail` = code) |
|---|---|
| client exists? | `404 CLIENT_NOT_FOUND` |
| AI Receptionist subscription exists? | `403 SUBSCRIPTION_INACTIVE` |
| subscription status `ACTIVE`? | `403 SUBSCRIPTION_INACTIVE` |
| client status `ACTIVE`? (kill switch — `SUSPENDED`/`INACTIVE`) | `403 CLIENT_SUSPENDED` |
| `used_seconds < quota_minutes * 60`? | `403 QUOTA_EXCEEDED` |
| otherwise | `200` ALLOW |

Unassigned quota (`intValue` missing) is a hard block, not "unlimited".

## Concurrency

`POST /sessions` runs check-then-reserve inside one transaction that first
takes `SELECT … FOR UPDATE` on the `Subscription` row
(`lock_ai_receptionist_subscription`). Concurrent starts for the same client
serialise on that lock, so two requests cannot both read "under quota" and
both reserve. The reservation is an `IN_PROGRESS` `CallLog` row pre-filled
with an estimated `durationSeconds`; it counts against quota immediately and
is reconciled to the real duration by `…/complete`. Stale reservations (older
than `SESSION_RESERVATION_TTL_SECONDS`) are ignored so a crashed session can
never hold quota forever.

## Run

```bash
cd backend
python -m venv .venv && . .venv/Scripts/activate      # or bin/activate
pip install -e ".[dev]"
cp .env.example .env                                  # set DATABASE_URL + ADMIN_SERVICE_SECRET
uvicorn app.main:app --reload --port 8000
```

## Test

```bash
cd backend
pip install -e ".[dev]"     # or: pip install fastapi httpx sqlalchemy pydantic-settings pytest pytest-asyncio
pytest -q
```

Tests are hermetic — the authorization flow and HTTP layer run against
in-memory fakes, no database required. Live DB integration (real
`FOR UPDATE`) is verified manually against a Postgres instance.
