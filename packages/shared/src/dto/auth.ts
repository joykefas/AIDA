import { LearningStyle, UserRole } from "../enums";

export interface RegisterRequest {
  email: string;
  password: string;
  /** ISO date; drives the age-gate — under 13 routes to the parental-consent flow, 13-17 is flagged minor. */
  birthdate: string;
  parentalConsentGiven?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  learningStyle: LearningStyle | null;
  isMinor: boolean;
  role: UserRole;
  createdAt: string;
  emailOptOut?: boolean;
  cookieConsent?: string | null;
}

export interface SetLearningStyleRequest {
  learningStyle: LearningStyle;
}

export interface UpdateProfileRequest {
  displayName?: string;
  learningStyle?: LearningStyle;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface UserDataExport {
  exportedAt: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    birthdate: string;
    isMinor: boolean;
    parentalConsentGiven: boolean;
    learningStyle: LearningStyle | null;
    role: UserRole;
    createdAt: string;
  };
  documents: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    createdAt: string;
    topics: Array<{
      id: string;
      title: string;
      summary: string;
      masteryScore: number;
    }>;
  }>;
  quizAttempts: Array<{
    id: string;
    questionPrompt: string;
    userAnswer: string;
    score: number | null;
    correct: boolean | null;
    aiFeedback: string | null;
    createdAt: string;
  }>;
  tutorMessages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
}
