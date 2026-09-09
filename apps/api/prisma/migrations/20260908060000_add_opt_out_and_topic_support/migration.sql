-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailOptOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "cookieConsent" TEXT;

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Topic_documentId_isPrimary_idx" ON "Topic"("documentId", "isPrimary");
