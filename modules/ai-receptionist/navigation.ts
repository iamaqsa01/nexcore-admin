import { PhoneCall } from "lucide-react";
import type { NavItem } from "@/types";

/**
 * Navigation this module contributes to the sidebar "PRODUCTS" section.
 * Assembled by `lib/nav.ts` via the module registry — the core never names
 * this route directly.
 */
export const aiReceptionistNav: NavItem[] = [
  {
    label: "AI Receptionist",
    href: "/admin/products/ai-receptionist",
    icon: PhoneCall,
    matchNested: true,
  },
];
