import { CreditCard, LayoutDashboard, Users, Activity } from "lucide-react";
import type { NavSection } from "@/types";
import { productModules } from "@/modules/registry";

/**
 * Assemble the sidebar navigation.
 *
 * Core sections are static. The "PRODUCTS" section is generated from the
 * module registry, so enabling a new product module automatically adds its
 * navigation without touching this file.
 */
export function buildNavSections(): NavSection[] {
  const sections: NavSection[] = [
    {
      title: null,
      items: [
        { label: "Overview", href: "/admin", icon: LayoutDashboard },
      ],
    },
    {
      title: "SYSTEM",
      items: [
        { label: "Clients", href: "/admin/clients", icon: Users, matchNested: true },
        { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard, matchNested: true },
        { label: "Usage", href: "/admin/usage", icon: Activity, matchNested: true },
      ],
    },
  ];

  const productItems = productModules.flatMap((m) => m.nav);
  if (productItems.length > 0) {
    sections.push({ title: "PRODUCTS", items: productItems });
  }

  return sections;
}
