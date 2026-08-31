ALTER TABLE "Brand" ADD COLUMN "companyContext" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "IgExamplePost"
  ALTER COLUMN "caption" SET DEFAULT '',
  ADD COLUMN "assetType" TEXT NOT NULL DEFAULT 'style_reference',
  ADD COLUMN "title" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "description" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "notes" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "isPrimaryLogo" BOOLEAN NOT NULL DEFAULT false;
UPDATE "IgExamplePost" SET "caption" = '';
