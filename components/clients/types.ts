import type { ClientStatus } from "@prisma/client";

/** Plain, serialisable client shape passed from server components to the
 *  client-side table / dialogs. Mirrors `ClientListItem` in the service. */
export interface ClientRow {
  id: string;
  clientId: string;
  name: string;
  website: string | null;
  domain: string | null;
  status: ClientStatus;
  createdAt: Date;
  updatedAt: Date;
}
