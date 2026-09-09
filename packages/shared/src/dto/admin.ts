import { UserRole } from "../enums";

export interface AdminQueueMetrics {
  waiting: number;
  active: number;
  failed: number;
  completed: number;
}

/** Daily AI spend and activity breakdown for the last 7 days. */
export interface AdminDailySpendEntry {
  date: string; // ISO date string e.g. "2026-09-01"
  tokensUsed: number;
  spendUsd: number;
  documentCount: number;
  tutorMessageCount: number;
  quizCount: number;
}

/** Top token-consuming users, used to identify cost outliers. */
export interface AdminUserCostOutlier {
  userId: string;
  userEmail: string;
  estimatedTokens: number;
  estimatedSpendUsd: number;
  documentCount: number;
  messageCount: number;
  quizCount: number;
}

/** Breakdown of total feature-usage counts across the platform. */
export interface AdminFeatureUsage {
  uploads: number;
  tutorChats: number;
  quizzesTaken: number;
  examsTaken: number;
  reviewsCompleted: number;
}

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
  queueMetrics?: AdminQueueMetrics;
  estimatedTokensUsed?: number;
  estimatedSpendUsd?: number;
  /** Per-day spend/volume breakdown for the last 7 calendar days. */
  dailySpend?: AdminDailySpendEntry[];
  /** Top 5 users by estimated AI token consumption. */
  userOutliers?: AdminUserCostOutlier[];
  /** Average seconds between document creation and READY status. */
  averageTimeToReadySeconds?: number;
  /** Platform-wide feature usage counts. */
  featureUsage?: AdminFeatureUsage;
  /** % of spaced-repetition reviews completed on or before their due date. */
  spacedRepetitionAdherenceRate?: number;
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

export interface UpdateAdminUserDto {
  parentalConsentGiven?: boolean;
  isMinor?: boolean;
  role?: UserRole;
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

export interface AdminFlaggedTutorMessage {
  id: string;
  userId: string;
  userEmail: string;
  content: string;
  role: string;
  rating: string | null;
  feedbackText: string | null;
  createdAt: string;
}

export interface AdminIngestionFailure {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  type: string;
  failureReason: string | null;
  createdAt: string;
}

export interface AdminQualityData {
  disputedQuizzes: AdminQualitySampleItem[];
  flaggedTutorMessages: AdminFlaggedTutorMessage[];
  ingestionFailures: AdminIngestionFailure[];
}

export interface AdminAuditLogItem {
  id: string;
  actorId: string;
  action: string;
  targetUserId: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}
