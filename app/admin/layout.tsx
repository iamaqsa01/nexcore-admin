import { AdminShell } from "@/components/layout/admin-shell";
import { requireSuperAdmin } from "@/server/auth/rbac";

/**
 * Server-side authorization gate for the entire /admin tree. This runs in
 * addition to the edge middleware — defense in depth. Anonymous -> /login,
 * authenticated non-admin -> /forbidden.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSuperAdmin();

  return (
    <AdminShell
      user={{ name: session.user.name ?? "Super Admin", email: session.user.email ?? "" }}
    >
      {children}
    </AdminShell>
  );
}
