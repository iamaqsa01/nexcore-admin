import type { LucideIcon } from "lucide-react";

/** A single navigation link rendered in the sidebar. */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match child routes as active (e.g. `/admin/clients/123`). */
  matchNested?: boolean;
}

/** A titled group of navigation links (e.g. "SYSTEM", "PRODUCTS"). */
export interface NavSection {
  /** `null` renders the items without a section heading. */
  title: string | null;
  items: NavItem[];
}

/**
 * Contract every product module must satisfy so it can register itself with
 * the core dashboard without the core needing to know about it ahead of time.
 */
export interface ProductModule {
  /** Stable identifier, e.g. `AI_RECEPTIONIST`. */
  id: string;
  /** Human-readable name shown in the UI. */
  name: string;
  /** Base route for the module, e.g. `/admin/products/ai-receptionist`. */
  basePath: string;
  /** Navigation this module contributes to the sidebar "PRODUCTS" section. */
  nav: NavItem[];
}

/** Shape of a dashboard summary metric card. */
export interface StatMetric {
  label: string;
  value: string | number;
  hint?: string;
}
