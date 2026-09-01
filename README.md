# NexCore Super Admin Panel

Super Admin dashboard for **NexCore**, an AI Voice Receptionist SaaS for clinics.
This repository contains **only** the Super Admin dashboard.

> **Status: Phase 7 — live usage + production polish.** The Overview and
> Usage pages are now fully DB-driven (active/suspended clinics, minutes
> consumed, per-client usage) and refresh themselves every 20s via
> `router.refresh()` (no websockets). Each client shows a labelled + iconed
> usage state (Normal / Near limit / Quota reached / Suspended). Every
> data-backed section has a loading skeleton, empty state, and an error
> boundary with retry. Client bundles verified free of `DATABASE_URL` /
> `AUTH_SECRET` / `ADMIN_SERVICE_SECRET`. See "Roadmap" below.

## Tech stack

| Concern        | Choice                                  |
| -------------- | --------------------------------------- |
| Framework      | Next.js (App Router) + React + TypeScript |
| Styling        | Tailwind CSS v4 with semantic design tokens |
| Icons          | lucide-react                            |
| Database       | PostgreSQL via Prisma ORM               |
| Auth           | Auth.js v5 — Credentials provider, bcrypt hashes, stateless JWT sessions |
| Validation     | Zod                                     |

## Getting started

```bash
npm install
cp .env.example .env        # then fill in DATABASE_URL (Postgres) and AUTH_SECRET
npm run db:generate         # prisma generate
npm run db:migrate          # prisma migrate dev — applies prisma/migrations to your DB
npm run db:seed             # creates the AI_RECEPTIONIST product
npm run admin:create        # creates the first SUPER_ADMIN (prompts for email + password)
npm run dev                 # http://localhost:3000  -> /admin (redirects to /login)
```

Generate `AUTH_SECRET` with `openssl rand -base64 32`.

> If Prisma's engine download makes `npm install` slow on your network, run
> `npm install --ignore-scripts` then `npm run db:generate` separately.

Validation:

```bash
npx prisma validate
npx prisma generate
npm run lint
npm run build
```

### Database scripts

| Script | Purpose |
|---|---|
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Create/apply a dev migration (`prisma migrate dev`) |
| `npm run db:deploy` | Apply committed migrations in CI/prod (`prisma migrate deploy`) |
| `npm run db:seed` | Seed the product catalogue |
| `npm run db:studio` | Open Prisma Studio |
| `npm run admin:create` | Create / reset the first `SUPER_ADMIN` (see Authentication) |

## Architecture

```
NEXCORE CORE
├── Authentication      (auth.ts / auth.config.ts — Auth.js Credentials)
├── RBAC                (server/auth/rbac.ts — requireAuth / requireSuperAdmin)
├── Clients             (Client model         — server/clients, /admin/clients)
├── Products            (Product model + modules/registry.ts)
├── Subscriptions       (Subscription + SubscriptionEntitlement — core-owned)
├── Usage               (CallLog model        — ingestion later phase)
└── Audit Logs          (AuditLog model       — server/audit/log.ts)

PRODUCT MODULES
└── AI Receptionist     (modules/ai-receptionist)
    ├── owns: monthly talk-time entitlement, usage aggregation, service on/off
    └── reuses core: Client, Subscription, RBAC, AuditLog

NEXCORE BACKEND (backend/ — separate Python/FastAPI service)
├── server-to-server only (X-Service-Token shared secret)
├── authorize_ai_receptionist(): client + subscription + kill switch + quota
└── /sessions: FOR UPDATE row-lock + IN_PROGRESS CallLog reservation
```

### Server-to-server integration

The admin panel calls the backend only from server code
(`server/backend/client.ts`) and proxies one read-only check to the browser
via `GET /api/admin/products/ai-receptionist/authorization-check`. The
"Check" button on the AI Receptionist console uses it to preview ALLOW/BLOCK.
`NEXCORE_BACKEND_URL` and `ADMIN_SERVICE_SECRET` are server-only env vars
(no `NEXT_PUBLIC_` prefix); leave them blank to disable the check.

### Ownership boundary

The **core** owns Clients, Subscriptions, RBAC, and the audit trail. A
**product module** owns only its product-specific concerns. AI Receptionist
owns the `monthly_talk_time_minutes` entitlement, usage math over
`CallLog.durationSeconds`, and the per-client service switch — it *reuses* the
core `Subscription` row as its enrolment record rather than defining its own.

### Adding a future product module

1. Create `modules/<name>/manifest.ts` exporting a `ProductModule`
   (`id`, `name`, `basePath`, `nav`) plus `navigation.ts`, `permissions.ts`,
   and server logic (`quota.ts` / `usage.ts` style).
2. Register it in `modules/registry.ts`.
3. Add routes under `app/admin/products/<name>/` and
   `app/api/admin/products/<name>/`.

The core dashboard shell (sidebar, header, routing) requires **no** changes —
the sidebar's "PRODUCTS" section is generated from the registry.

## Folder structure

```
auth.config.ts             Edge-safe Auth.js config: callbacks + authorized() gate
auth.ts                    Full Auth.js instance: Credentials provider (bcrypt + Prisma)
middleware.ts              Edge middleware — protects /admin/* and /api/admin/*
app/                       App Router routes
  layout.tsx               Root layout + no-flash theme script
  page.tsx                 "/" -> redirects to /admin
  not-found.tsx            404
  forbidden/page.tsx       403 page (authenticated non-admins land here)
  login/page.tsx           /login — NexCore Admin Login
  api/
    auth/[...nextauth]/route.ts   Auth.js handlers (signin/callback/signout)
    admin/session/route.ts        example protected API (401 / 403 / 200)
    admin/clients/route.ts        GET list (?q=) + POST create
    admin/clients/[id]/route.ts   GET + PATCH edit + DELETE (soft-deactivate)
    admin/clients/[id]/status/route.ts  PATCH suspend / activate / deactivate
    admin/products/ai-receptionist/clients/[clientId]/quota/route.ts   PUT minutes
    admin/products/ai-receptionist/clients/[clientId]/status/route.ts  PATCH suspend/activate
  admin/
    layout.tsx             Server guard: await requireSuperAdmin() + shell
    loading.tsx            Overview skeleton (stat cards + table)
    error.tsx              Overview error boundary ("Try again")
    page.tsx               /admin — live Overview: 3 stat cards + client usage
    clients/page.tsx       /admin/clients — directory + search
    clients/[id]/page.tsx  client detail (record + linked counts)
    clients/loading.tsx    table skeleton
    clients/error.tsx      error boundary ("Try again")
    subscriptions/page.tsx /admin/subscriptions
    usage/page.tsx         /admin/usage — live client usage table (+ loading/error)
    products/ai-receptionist/page.tsx     stats + client usage table
    products/ai-receptionist/loading.tsx  / error.tsx
components/
  auth/login-form.tsx      Client form: zod validation, loading + error state
  clients/                 Client Management: view, table + row actions,
                           create/edit form dialog, status-confirm dialog
  dashboard/               AutoRefresh (20s router.refresh), ClientUsageTable,
                           UsageStateLegend — shared by Overview + Usage
  layout/                  Shell: sidebar, header, mobile nav, theme toggle, user menu
  ui/                      Reusable primitives: card, button, badge, table, input,
                           dialog, skeleton, stat-card, page-header, empty-state
lib/
  utils.ts                 cn(), formatNumber(), formatDate()
  nav.ts                   buildNavSections() — core + product nav
  validation/client.ts     Zod schemas shared by the form and the API routes
server/
  db.ts                    Prisma client singleton
  auth/rbac.ts             requireAuth(), requireSuperAdmin(), authorizeAdminApi()
  audit/log.ts             recordAudit() — append-only AuditLog writer
  clients/service.ts       Client Management business logic + queries (+ audit)
modules/
  registry.ts              Enabled product modules
  ai-receptionist/
    manifest.ts            Module identity (ProductModule + product/entitlement keys)
    navigation.ts          Sidebar nav contributed to "PRODUCTS"
    permissions.ts         canManageAiReceptionist() — module-owned authz
    validation.ts          Zod schemas (client-safe), shared by dialogs + API
    quota.ts               Server: assign talk-time, service on/off (+ audit)
    usage.ts               Server: current-period usage + dashboard stats
    components/             console (table), quota-dialog, service-status-dialog
prisma/
  schema.prisma            Full data model (7 models, 6 enums)
  seed.ts                  Seeds the AI_RECEPTIONIST product (no users)
  migrations/
    migration_lock.toml
    20260831120000_init/migration.sql
    20260831130000_user_password_hash/migration.sql
scripts/
  create-admin.ts          Secure first-admin bootstrap CLI
types/
  index.ts                 NavItem, NavSection, ProductModule, StatMetric
  next-auth.d.ts           Session/JWT type augmentation (role: UserRole)
.env.example               Environment variable names only
```

## Database

Seven models, all foreign keys indexed, enums designed for extension.

| Model | Notes |
|---|---|
| `User` | `role` enum starts with `SUPER_ADMIN` only; add roles later without migration pain. |
| `Client` | `clientId` (e.g. `NC-CL-000001`) is unique and generated by a Postgres sequence (`client_number_seq`) via a `dbgenerated` default — gap-free, no app code. No API keys. |
| `Product` | `key` (`AI_RECEPTIONIST`) is unique. Product carries **no** quota fields. |
| `Subscription` | FK → Client, Product (both `ON DELETE RESTRICT`). Status `ACTIVE / PAUSED / CANCELLED`. |
| `SubscriptionEntitlement` | Flexible key/value quotas per subscription. AI Receptionist uses `key = "monthly_talk_time_minutes"` in `intValue`. Other products define their own keys — nothing hardcoded. |
| `CallLog` | Append-only usage history. `durationSeconds` is the **authoritative integer** usage value — never floating-point minutes. FK `ON DELETE RESTRICT`, never cascade-deleted. |
| `AuditLog` | Append-only. `action` enum covers `CLIENT_CREATED/UPDATED/SUSPENDED/ACTIVATED`, `QUOTA_UPDATED`, `SUBSCRIPTION_CHANGED`. FK → User `ON DELETE RESTRICT` so history survives. |

> The `client_number_seq` sequence lives in the migration, not the Prisma
> schema (Prisma treats the `dbgenerated` default as opaque). A future
> `prisma migrate dev` may report it as drift — this is expected.

## Authentication & RBAC

**Model.** Auth.js v5 with the **Credentials** provider. Passwords are stored
as **bcrypt** hashes (`User.passwordHash`, cost 12) and verified server-side in
`auth.ts`'s `authorize()`. Sessions are **stateless JWTs**; the user's `role`
is copied onto the token at sign-in and is the *only* source of truth for
authorization. A browser never supplies or can alter the role.

**Two enforcement layers (defense in depth):**

1. **Edge middleware** (`middleware.ts` + `authorized()` in `auth.config.ts`)
   matches `/admin/:path*` and `/api/admin/:path*`:
   - anonymous → `307` to `/login?callbackUrl=…` (pages) / `401` JSON (API)
   - authenticated non-admin → `403` (`/forbidden` rewrite for pages, `403`
     JSON for API)
   - `SUPER_ADMIN` → pass
2. **Server-side** — every `/admin` page goes through
   `await requireSuperAdmin()` in `app/admin/layout.tsx`; every `/api/admin/*`
   handler calls `authorizeAdminApi()` and returns its `401`/`403` response.
   These run even if middleware is bypassed. No security decision is made in
   React, hidden UI, or client redirects.

**RBAC utilities** (`server/auth/rbac.ts`, server-only):

| Function | Use | Anonymous | Non-admin |
|---|---|---|---|
| `requireAuth()` | server components / pages | `redirect('/login')` | returns session |
| `requireSuperAdmin()` | server components / pages / layouts | `redirect('/login')` | `redirect('/forbidden')` |
| `authorizeAdminApi()` | route handlers | `{ ok:false, response: 401 }` | `{ ok:false, response: 403 }` |

### First Super Admin — secure bootstrap

```bash
npm run admin:create
```

- Reads `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the environment (for CI) **or**
  prompts interactively — the password prompt is **masked**.
- Password policy enforced with zod: ≥ 12 chars, upper + lower + digit + symbol.
- Stores only the bcrypt hash. Nothing is hardcoded, echoed, or written to
  disk. Re-running for the same email resets that admin's password (also serves
  as a recovery tool).
- `.env.example` lists the variable **names only**; real values never enter the
  repo.

### Production notes

- Set a strong `AUTH_SECRET`. `trustHost: true` is set for self-hosted /
  preview deploys; pin `AUTH_URL` in production if you want strict host checks.
- The build prints an Edge-runtime warning from `jose` about
  `CompressionStream` — it is a false positive (Auth.js does not use compressed
  JWTs) and does not affect middleware. Tracked upstream in `next-auth`.

## Design system

- Semantic color tokens defined once in `app/globals.css` for light and dark
  (`--background`, `--card`, `--muted-foreground`, `--primary`, …) and exposed
  as Tailwind utilities via `@theme inline`.
- Dark mode via a `dark` class on `<html>`; a pre-paint inline script reads
  `localStorage` / `prefers-color-scheme` to avoid a flash. `ThemeToggle`
  handles user switching.
- Responsive: sidebar collapses to a slide-over drawer below `lg`.
- Accessible: semantic landmarks, `aria-current` on active nav, focus-visible
  rings, `Escape`/scrim close on the mobile drawer, labelled controls.
- Loading states: `Skeleton`, `StatCardSkeleton`, route-level `loading.tsx`;
  every data-backed route also has an `error.tsx` boundary with a Retry button
  and an `EmptyState` for the no-rows case.
- Live updates: `components/dashboard/auto-refresh.tsx` re-runs the server
  component tree every 20s with `router.refresh()` (pauses while the tab is
  hidden). No websockets, no client data store.
- Usage state is shown as label + icon + tone (never colour alone):
  Normal / Near limit / Quota reached / Suspended.

## Roadmap

- **Phase 1** ✅ — Scaffold, design system, routing shell.
- **Phase 2** ✅ — PostgreSQL data model: Prisma schema, initial migration, seed.
- **Phase 3** ✅ — Auth.js authentication, RBAC utilities, route protection.
- **Phase 4** ✅ — Client Management: `/admin/clients` CRUD (create / edit / suspend / activate / deactivate), server-side search, Zod validation, `AuditLog` writers, soft-delete. Subscriptions, entitlements, and real metrics remain.
- **Phase 5** ✅ — AI Receptionist module: per-clinic monthly talk-time quota (`SubscriptionEntitlement`), current-period usage from `CallLog.durationSeconds`, dashboard stats, and a DB-backed service on/off toggle (`Subscription.status`). Auto-enrols a client (creates its AI Receptionist `Subscription`) on first quota assignment.
- **Phase 6** ✅ — NexCore Python/FastAPI backend (`backend/`): server-to-server session authorization + quota enforcement (client kill switch, subscription status, monthly talk-time quota), `SELECT … FOR UPDATE` + `IN_PROGRESS` `CallLog` reservations for concurrency safety, `X-Service-Token` auth. 32 backend tests. Panel integration via `server/backend/client.ts` + one proxy route.
- **Phase 7** ✅ — Live usage + polish: DB-driven Overview + Usage pages, 20s `router.refresh()` auto-updates, labelled+iconed usage states, loading/empty/error+retry on every data section, client-bundle secret scan (clean).
- **Phase 8+** — AI Receptionist voice runtime integration (real `/sessions` calls + `/complete`), call-flow / phone-number / prompt configuration, audit-log viewer UI.

### Migrations

| Migration | Change |
|---|---|
| `20260901120000_client_inactive_status` | `ClientStatus += INACTIVE`, `AuditAction += CLIENT_DEACTIVATED` |
| `20260901130000_subscription_suspended_status` | `SubscriptionStatus += SUSPENDED` (product service switch) |

Both are additive, enum-only, no data migration. Apply with `npm run db:deploy`
(or `npm run db:migrate` in dev).
#   A d m i n - P l a t f o r m - N e x c o r e  
 