/**
 * Create (or promote) the first NexCore Super Admin — securely.
 *
 *   npm run admin:create
 *
 * Credentials are read from, in order of preference:
 *   1. Environment variables  ADMIN_EMAIL / ADMIN_PASSWORD   (good for CI)
 *   2. Interactive prompt (password input is masked)
 *
 * Nothing is hardcoded, nothing is written to disk, the password is never
 * logged, and only its bcrypt hash is stored. Re-running with the same email
 * resets that admin's password (idempotent bootstrap + recovery tool).
 */
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address");

const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .refine((v) => /[a-z]/.test(v), "Password needs a lowercase letter")
  .refine((v) => /[A-Z]/.test(v), "Password needs an uppercase letter")
  .refine((v) => /[0-9]/.test(v), "Password needs a digit")
  .refine((v) => /[^A-Za-z0-9]/.test(v), "Password needs a symbol");

function ask(question: string, { mask = false } = {}): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });

  if (mask) {
    const asMutable = rl as unknown as { _writeToOutput: (s: string) => void };
    asMutable._writeToOutput = (str: string) => {
      if (str.includes(question)) stdout.write(str);
      else stdout.write("*");
    };
  }

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      if (mask) stdout.write("\n");
      resolve(answer);
    });
  });
}

async function resolveField(
  name: "email" | "password",
  envValue: string | undefined,
  schema: z.ZodType<string>,
  { mask = false } = {},
): Promise<string> {
  if (envValue !== undefined && envValue !== "") {
    const parsed = schema.safeParse(envValue);
    if (!parsed.success) {
      throw new Error(
        `Invalid ${name} from environment: ${parsed.error.issues[0].message}`,
      );
    }
    return parsed.data;
  }

  // Interactive: keep asking until valid.
  for (;;) {
    const raw = await ask(`${name === "email" ? "Admin email" : "Admin password"}: `, {
      mask,
    });
    const parsed = schema.safeParse(raw);
    if (parsed.success) return parsed.data;
    console.error(`  ✗ ${parsed.error.issues[0].message}`);
  }
}

async function main() {
  console.log("NexCore — create Super Admin\n");

  const email = await resolveField("email", process.env.ADMIN_EMAIL, emailSchema);
  const password = await resolveField(
    "password",
    process.env.ADMIN_PASSWORD,
    passwordSchema,
    { mask: true },
  );

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "SUPER_ADMIN" },
    create: {
      email,
      name: process.env.ADMIN_NAME?.trim() || "NexCore Super Admin",
      role: "SUPER_ADMIN",
      passwordHash,
    },
  });

  console.log(`\n✓ Super Admin ready: ${user.email} (${user.id})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
    await prisma.$disconnect();
    process.exit(1);
  });
