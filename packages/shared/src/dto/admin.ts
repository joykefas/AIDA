import { UserRole } from "../enums";

export interface AdminOverviewStats {
  totalUsers: number;
  minorUsers: number;
  totalDocuments: number;
  documentsProcessing: number;
  documentsReady: number;
  documentsFailed: number;
  totalQuizzesTaken: number;
  totalTutorMessages: number;
  activeDisputes: number;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  isMinor: boolean;
  parentalConsentGiven: boolean;
  documentCount: number;
  quizAttemptCount: number;
  createdAt: string;
}

export interface AdminQualitySampleItem {
  id: string;
  userId: string;
  userEmail: string;
  questionPrompt: string;
  userAnswer: string;
  correctAnswer?: string | null;
  score: number | null;
  aiFeedback: string | null;
  isDisputed: boolean;
  disputeReason?: string | null;
  createdAt: string;
}

export interface AdminAuditLogItem {
  id: string;
  actorId: string;
  action: string;
  targetUserId: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}
