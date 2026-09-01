import type { ProductModule } from "@/types";
import { aiReceptionistModule } from "./ai-receptionist/manifest";

/**
 * The single place where product modules are enabled for this deployment.
 * Order here is the order they appear under the sidebar "PRODUCTS" section.
 */
export const productModules: ProductModule[] = [aiReceptionistModule];

export function getProductModule(id: string): ProductModule | undefined {
  return productModules.find((m) => m.id === id);
}
