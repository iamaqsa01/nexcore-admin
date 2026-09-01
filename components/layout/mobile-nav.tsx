"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { NavSection } from "@/types";
import { Brand } from "@/components/layout/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";

export interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  sections: NavSection[];
}

export function MobileNav({ open, onClose, sections }: MobileNavProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card shadow-xl">
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Brand />
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close navigation">
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
        <SidebarNav sections={sections} onNavigate={onClose} />
      </div>
    </div>
  );
}
