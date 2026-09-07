/**
 * Inspect password hash integrity (no secrets printed).
 */
import "dotenv/config";
import { prisma, pingDatabase } from "../src/lib/prisma";

async function main() {
  if (!(await pingDatabase())) {
    console.log("database_connection: FAIL");
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    where: { isGuest: false },
    select: {
      email: true,
      passwordHash: true,
      updatedAt: true,
    },
  });

  for (const u of users) {
    const h = u.passwordHash ?? "";
    const looksBcrypt = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(h);
    console.log(
      JSON.stringify({
        email: u.email,
        hash_len: h.length,
        hash_prefix: h.slice(0, 7),
        looks_valid_bcrypt: looksBcrypt,
        updatedAt: u.updatedAt.toISOString(),
      })
    );
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
