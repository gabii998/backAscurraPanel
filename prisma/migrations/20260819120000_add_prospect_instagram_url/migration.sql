ALTER TABLE "Prospect" ADD COLUMN "instagramUrl" TEXT NOT NULL DEFAULT '';

UPDATE "Prospect"
SET "instagramUrl" = COALESCE(
  (regexp_match("socialMedia", '(https?://[^,[:space:]]*instagram\.com[^,[:space:]]*)', 'i'))[1],
  ''
)
WHERE "instagramUrl" = '';
