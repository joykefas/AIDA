-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('PDF', 'AUDIO', 'YOUTUBE', 'TEXT');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "LearningStyle" AS ENUM ('DIAGRAMS', 'STORIES', 'ANALOGIES', 'FORMULAS', 'AUDIO');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'WRITTEN');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'SUPPORT', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "displayName" TEXT,
    "birthdate" TIMESTAMP(3) NOT NULL,
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "parentalConsentGiven" BOOLEAN NOT NULL DEFAULT false,
    "learningStyle" "LearningStyle",
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "refreshTokenHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DocType" NOT NULL,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "storageKey" TEXT,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "extractedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT 'General',
    "summary" TEXT NOT NULL DEFAULT '',
    "notes" JSONB NOT NULL DEFAULT '[]',
    "mindMapJson" JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
    "masteryScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "consecutiveLowScores" INTEGER NOT NULL DEFAULT 0,
    "nextReviewDue" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Embedding" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "chunk" TEXT NOT NULL,
    "vector" vector(1536) NOT NULL,

    CONSTRAINT "Embedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userAnswer" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "correct" BOOLEAN,
    "aiFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");

-- CreateIndex
CREATE INDEX "Topic_documentId_idx" ON "Topic"("documentId");

-- CreateIndex
CREATE INDEX "Embedding_topicId_idx" ON "Embedding"("topicId");

-- CreateIndex
CREATE INDEX "QuizQuestion_topicId_idx" ON "QuizQuestion"("topicId");

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_idx" ON "QuizAttempt"("userId");

-- CreateIndex
CREATE INDEX "QuizAttempt_questionId_idx" ON "QuizAttempt"("questionId");

-- CreateIndex
CREATE INDEX "TutorMessage_userId_createdAt_idx" ON "TutorMessage"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorMessage" ADD CONSTRAINT "TutorMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
