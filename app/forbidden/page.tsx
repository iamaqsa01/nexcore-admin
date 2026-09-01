import type { Metadata } from "next";
import Link from "next/link";
import { ShieldX } from "lucide-react";

import { auth, signOut } from "@/auth";

export const metadata: Metadata = { title: "403 — Forbidden" };

export default async function ForbiddenPage() {
  const session = await auth();

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 text-center">
      <div className="max-w-md space-y-4">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger/15 text-danger">
          <ShieldX className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-danger">403</p>
        <h1 className="text-2xl font-semibold tracking-tight">Forbidden</h1>
        <p className="text-sm text-muted-foreground">
          {session?.user
            ? "Your account is signed in but does not have Super Admin access to this panel."
            : "You do not have access to this resource."}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          {session?.user ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Go to sign in
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
