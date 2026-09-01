import type { NavSection } from "@/types";
import { Brand } from "@/components/layout/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function Sidebar({ sections }: { sections: NavSection[] }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Brand />
      </div>
      <SidebarNav sections={sections} />
      <div className="border-t border-border px-5 py-4">
        <p className="text-xs text-muted-foreground">AI Voice Receptionist SaaS</p>
      </div>
    </aside>
  );
}
