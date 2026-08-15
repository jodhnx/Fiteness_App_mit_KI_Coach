CREATE TABLE IF NOT EXISTS "RecipeCatalogFavorite" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecipeCatalogFavorite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RecipeCatalogFavorite_userId_recipeId_key" ON "RecipeCatalogFavorite"("userId", "recipeId");
CREATE INDEX IF NOT EXISTS "RecipeCatalogFavorite_userId_idx" ON "RecipeCatalogFavorite"("userId");
DO $$ BEGIN
  ALTER TABLE "RecipeCatalogFavorite" ADD CONSTRAINT "RecipeCatalogFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
