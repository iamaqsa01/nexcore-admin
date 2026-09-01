import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed = reference data only.
 *
 * The AI Receptionist product row. No users are created here — the first
 * Super Admin is provisioned with `npm run admin:create` (see README), which
 * never stores a hardcoded or committed password.
 */
async function main() {
  const aiReceptionist = await prisma.product.upsert({
    where: { key: "AI_RECEPTIONIST" },
    update: {},
    create: {
      key: "AI_RECEPTIONIST",
      name: "AI Receptionist",
      description:
        "AI voice receptionist that answers, qualifies, and routes clinic calls.",
      status: "ACTIVE",
    },
  });

  console.log(`✓ Product ready: ${aiReceptionist.key} (${aiReceptionist.id})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
