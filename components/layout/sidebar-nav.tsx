"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavSection } from "@/types";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string, matchNested?: boolean) {
  if (pathname === href) return true;
  return Boolean(matchNested) && pathname.startsWith(`${href}/`);
}

export interface SidebarNavProps {
  sections: NavSection[];
  /** Called after a link is chosen — used to close the mobile drawer. */
  onNavigate?: () => void;
}

export function SidebarNav({ sections, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-6 px-3 py-4" aria-label="Primary">
      {sections.map((section, i) => (
        <div key={section.title ?? `section-${i}`} className="space-y-1">
          {section.title ? (
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
          ) : null}
          {section.items.map((item) => {
            const active = isActive(pathname, item.href, item.matchNested);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
