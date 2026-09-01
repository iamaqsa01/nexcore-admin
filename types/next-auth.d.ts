import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * Augment Auth.js types so `session.user.role` / `session.user.id` are typed
 * everywhere and `role` is the Prisma enum, not a loose string.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}
