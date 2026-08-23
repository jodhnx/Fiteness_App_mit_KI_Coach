/**
 * Migrates legacy progress photos from public/uploads into the private
 * Supabase Storage bucket.
 *
 *   npx tsx scripts/migrate-progress-photos.ts            # dry run (default)
 *   npx tsx scripts/migrate-progress-photos.ts --apply     # perform migration
 *
 * Safety properties:
 *  - Dry run is the default; nothing is written or deleted without --apply.
 *  - Idempotent: the storage key is derived from the photo id, so re-running
 *    overwrites the same object instead of creating duplicates. Rows that are
 *    already migrated no longer carry the /uploads/ prefix and are skipped.
 *  - The local file is only deleted after both the upload and the database
 *    update succeeded.
 *  - Rows whose local file is missing are reported and left untouched.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { access, readFile, unlink } from "fs/promises";
import path from "path";

import {
  buildMigratedProgressPhotoKey,
  contentTypeForKey,
  isLegacyPublicPhoto,
  LEGACY_PUBLIC_PREFIX,
} from "../src/lib/progress-photo-storage";
import {
  isPrivateStorageConfigured,
  uploadPrivateObject,
} from "../src/lib/storage/private-storage";

const APPLY = process.argv.includes("--apply");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

type Summary = {
  migrated: number;
  skippedAlreadyMigrated: number;
  missingFile: number;
  failed: number;
};

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Rejects anything that is not a plain file name directly under /uploads/. */
function safeLegacyBasename(imageUrl: string): string | null {
  const rest = imageUrl.slice(LEGACY_PUBLIC_PREFIX.length);
  if (!rest || rest.includes("/") || rest.includes("\\") || rest.includes("..")) {
    return null;
  }
  return rest;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("FAIL: DATABASE_URL not set");
    process.exit(1);
  }
  // A dry run only reads, so storage credentials are required for --apply only.
  if (APPLY && !isPrivateStorageConfigured()) {
    console.error(
      "FAIL: SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) must be set"
    );
    process.exit(1);
  }

  console.log(APPLY ? "MODE: apply" : "MODE: dry run (use --apply to migrate)");

  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 10000 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const summary: Summary = {
    migrated: 0,
    skippedAlreadyMigrated: 0,
    missingFile: 0,
    failed: 0,
  };

  try {
    const photos = await prisma.progressPhoto.findMany({
      select: { id: true, userId: true, imageUrl: true },
      orderBy: { createdAt: "asc" },
    });
    console.log(`ProgressPhoto rows: ${photos.length}`);

    for (const photo of photos) {
      if (!isLegacyPublicPhoto(photo.imageUrl)) {
        summary.skippedAlreadyMigrated++;
        continue;
      }

      const basename = safeLegacyBasename(photo.imageUrl);
      if (!basename) {
        console.warn(`SKIP ${photo.id}: unerwarteter Pfad "${photo.imageUrl}"`);
        summary.failed++;
        continue;
      }

      const localPath = path.join(UPLOAD_DIR, basename);
      if (!(await fileExists(localPath))) {
        console.warn(
          `MISSING ${photo.id}: ${photo.imageUrl} — Datei nicht vorhanden, DB-Zeile unverändert`
        );
        summary.missingFile++;
        continue;
      }

      const extension = basename.split(".").pop()?.toLowerCase() ?? "jpg";
      const key = buildMigratedProgressPhotoKey(photo.userId, photo.id, extension);

      if (!APPLY) {
        console.log(`WOULD MIGRATE ${photo.id}: ${photo.imageUrl} -> ${key}`);
        summary.migrated++;
        continue;
      }

      try {
        const buffer = await readFile(localPath);
        await uploadPrivateObject(key, buffer, contentTypeForKey(key));

        await prisma.progressPhoto.update({
          where: { id: photo.id },
          data: { imageUrl: key },
        });

        // Only now is removing the local copy safe.
        await unlink(localPath);
        console.log(`MIGRATED ${photo.id}: ${photo.imageUrl} -> ${key}`);
        summary.migrated++;
      } catch (e) {
        console.error(`FAILED ${photo.id}:`, e);
        summary.failed++;
      }
    }

    console.log("\n--- Summary ---");
    console.log(`${APPLY ? "migrated" : "would migrate"}: ${summary.migrated}`);
    console.log(`already migrated (skipped): ${summary.skippedAlreadyMigrated}`);
    console.log(`local file missing: ${summary.missingFile}`);
    console.log(`failed: ${summary.failed}`);
    if (summary.missingFile > 0) {
      console.log(
        "\nHinweis: Für fehlende Dateien wurde nichts geändert und nichts gelöscht."
      );
    }
    if (summary.failed > 0) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
