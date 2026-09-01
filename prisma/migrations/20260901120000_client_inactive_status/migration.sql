-- Phase 4 — Client Management.
-- Additive enum changes only. No table, column, or data changes; existing
-- rows are untouched. Postgres applies `ALTER TYPE ... ADD VALUE` outside a
-- transaction, which Prisma handles automatically.

-- AlterEnum
-- Retired / offboarded clients. Used for safe soft-delete so dependent
-- Subscription / CallLog / AuditLog history is preserved.
ALTER TYPE "ClientStatus" ADD VALUE 'INACTIVE';

-- AlterEnum
-- Emitted when a Super Admin deactivates (soft-deletes) a client.
ALTER TYPE "AuditAction" ADD VALUE 'CLIENT_DEACTIVATED';
