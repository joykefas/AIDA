/**
 * DI token + contract for outbound email (weekly progress reports, etc.).
 * Mock logs to the console; live implementation sends through a real
 * transactional email API once EMAIL_PROVIDER_MODE=live and keys are set.
 */
export abstract class EmailProvider {
  abstract send(input: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void>;
}
