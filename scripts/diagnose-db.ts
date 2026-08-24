import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  console.log("DATABASE_URL:", url ? url.replace(/:[^:@]+@/, ":****@") : "MISSING");

  if (!url) {
    console.error("FAIL: DATABASE_URL not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5000 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    await pool.query("SELECT 1");
    console.log("OK: Database connection");

    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `;
    console.log("Tables:", tables.map((t) => t.tablename).join(", ") || "(none)");

    const userCount = await prisma.user.count();
    console.log("User count:", userCount);

    const userCols = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'User' ORDER BY ordinal_position
    `;
    console.log(
      "User columns:",
      userCols.map((c) => c.column_name).join(", ")
    );

    const hasVerification = userCols.some((c) => c.column_name === "verificationCode");
    if (!hasVerification) {
      console.error("FAIL: User.verificationCode column missing — run: npx prisma migrate deploy");
      process.exit(1);
    }

    console.log("DIAGNOSIS: Database OK");
  } catch (error) {
    console.error("DIAGNOSIS FAIL:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
