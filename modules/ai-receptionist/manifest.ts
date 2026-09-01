import type { ProductModule } from "@/types";
import { aiReceptionistNav } from "./navigation";

/**
 * AI Receptionist — the first NexCore product module.
 *
 * `manifest.ts` is the module's identity card. It is client-safe (no Prisma,
 * no Node APIs) because it is pulled in transitively by the sidebar. Server
 * logic lives in `quota.ts` / `usage.ts`; UI in `components/`.
 *
 * To add a future product: create `modules/<name>/manifest.ts` exporting a
 * `ProductModule`, register it in `modules/registry.ts`, and add routes under
 * `app/admin/products/<name>/`. The core shell requires no changes.
 */

/** Prisma `Product.key` this module is backed by (see `prisma/seed.ts`). */
export const AI_RECEPTIONIST_PRODUCT_KEY = "AI_RECEPTIONIST" as const;

/**
 * `SubscriptionEntitlement.key` used for the monthly talk-time quota. The
 * value is stored in `intValue` as an integer number of minutes.
 */
export const MONTHLY_TALK_TIME_MINUTES_KEY = "monthly_talk_time_minutes" as const;

export interface AiReceptionistManifest extends ProductModule {
  productKey: typeof AI_RECEPTIONIST_PRODUCT_KEY;
  entitlementKeys: {
    monthlyTalkTimeMinutes: typeof MONTHLY_TALK_TIME_MINUTES_KEY;
  };
}

export const aiReceptionistManifest: AiReceptionistManifest = {
  id: "AI_RECEPTIONIST",
  name: "AI Receptionist",
  basePath: "/admin/products/ai-receptionist",
  nav: aiReceptionistNav,
  productKey: AI_RECEPTIONIST_PRODUCT_KEY,
  entitlementKeys: {
    monthlyTalkTimeMinutes: MONTHLY_TALK_TIME_MINUTES_KEY,
  },
};

/** Back-compat alias — the registry consumes the plain `ProductModule` shape. */
export const aiReceptionistModule: ProductModule = aiReceptionistManifest;
