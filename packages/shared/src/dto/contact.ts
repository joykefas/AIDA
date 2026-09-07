export interface CreateContactRequest {
  name: string;
  email: string;
  message: string;
}

export interface ContactSubmissionDto {
  id: string;
  name: string;
  email: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
