"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu, type SessionUser } from "@/components/layout/user-menu";

export function Header({
  onOpenNav,
  user,
}: {
  onOpenNav: () => void;
  user: SessionUser;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenNav}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      <div className="flex-1" />

      <ThemeToggle />
      <UserMenu user={user} />
    </header>
  );
}
