import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authConfig } from "@/auth.config";
import { prisma } from "@/server/db";

/**
 * Full Auth.js instance (Node runtime).
 *
 * Adds the Credentials provider whose `authorize` verifies the email/password
 * against the database with bcrypt. Sessions are stateless JWTs; the user's
 * role is copied onto the token at sign-in and is the ONLY source of truth for
 * authorization — a browser can never supply or change it.
 */

const signInSchema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = signInSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) {
          // Hash a throwaway value to keep response time roughly constant
          // whether or not the account exists.
          await bcrypt.compare(password, "$2a$12$" + "x".repeat(53));
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
