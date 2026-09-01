"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface SessionUser {
  name: string;
  email: string;
}

function initials(name: string, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function UserMenu({ user }: { user: SessionUser }) {
  const [pending, setPending] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-xs font-medium leading-tight">{user.name}</p>
        <p className="text-xs text-muted-foreground leading-tight">{user.email}</p>
      </div>
      <div
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
        aria-hidden="true"
      >
        {initials(user.name, user.email)}
      </div>
      <Button
        variant="outline"
        size="icon"
        aria-label="Sign out"
        disabled={pending}
        onClick={() => {
          setPending(true);
          void signOut({ callbackUrl: "/login" });
        }}
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
