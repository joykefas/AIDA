// Deliberately has no "server-only" import, unlike lib/api.ts — this needs
// to be importable from the Client Component error boundary too, so it
// can recognize a 401 that bubbled up from a Server Component's serverFetch.
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
