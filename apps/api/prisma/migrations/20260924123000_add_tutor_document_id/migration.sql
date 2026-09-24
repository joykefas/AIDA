-- AlterTable TutorMessage
ALTER TABLE "TutorMessage" ADD COLUMN IF NOT EXISTS "documentId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TutorMessage_userId_documentId_createdAt_idx" ON "TutorMessage"("userId", "documentId", "createdAt");
