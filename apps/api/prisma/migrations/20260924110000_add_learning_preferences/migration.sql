-- AlterTable User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "learningPreferences" TEXT[] NOT NULL DEFAULT '{}';

-- AlterTable Topic
ALTER TABLE "Topic" ADD COLUMN IF NOT EXISTS "presentations" JSONB NOT NULL DEFAULT '{}';
