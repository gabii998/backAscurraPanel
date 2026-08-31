ALTER TABLE "IgExamplePost"
  ALTER COLUMN "caption" SET DEFAULT '';
UPDATE "IgExamplePost"
  SET "caption" = '', "styleSummary" = '', "summaryBatchId" = NULL, "summaryError" = '', "summaryStatus" = 'pending'
  WHERE "assetType" = 'style_reference';
ALTER TABLE "IgBatchJob"
  ADD COLUMN "contentAssetIds" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "brandLogoUrl" TEXT NOT NULL DEFAULT '';
