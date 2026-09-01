"use client";

import { useState, type ReactNode } from "react";
import { buildNavSections } from "@/lib/nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { SessionUser } from "@/components/layout/user-menu";

/**
 * Dashboard shell: persistent sidebar (desktop), slide-over nav (mobile),
 * sticky header, and the scrollable main content region.
 */
export function AdminShell({
  children,
  user,
}: {
  children: ReactNode;
  user: SessionUser;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const sections = buildNavSections();

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar sections={sections} />
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} sections={sections} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenNav={() => setNavOpen(true)} user={user} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
