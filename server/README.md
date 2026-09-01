# `server/`

Server-only code: data-access, service functions, and authorization guards.
Nothing here is imported by client components.

Present now:

```
server/
├── db.ts            # Prisma client singleton — import { prisma } from "@/server/db"
├── auth/
│   └── rbac.ts      # requireAuth(), requireSuperAdmin(), authorizeAdminApi()
├── audit/
│   └── log.ts       # recordAudit() — append-only AuditLog writer
├── clients/
│   └── service.ts   # Client Management: list/get/create/update/setClientStatus (+ audit)
└── backend/
    └── client.ts    # server-to-server client for the Python/FastAPI backend
                     # (reads NEXCORE_BACKEND_URL + ADMIN_SERVICE_SECRET; never
                     #  returns them to callers)
```
