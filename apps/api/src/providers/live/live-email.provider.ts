import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider } from '../email.provider';

function parseSender(fromStr: string): { name: string; email: string } {
  const match = fromStr.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim() || 'AIDA',
      email: match[2].trim(),
    };
  }
  return {
    name: 'AIDA',
    email: fromStr.trim(),
  };
}

/**
 * Sends transactional email via Brevo (Sendinblue) or Resend HTTP REST API.
 * Brevo supports sending to any address without owning a custom domain.
 */
@Injectable()
export class LiveEmailProvider extends EmailProvider {
  private readonly logger = new Logger(LiveEmailProvider.name);
  private readonly brevoApiKey = process.env.BREVO_API_KEY;
  private readonly resendApiKey = process.env.RESEND_API_KEY;
  private readonly from =
    process.env.EMAIL_FROM ?? 'AIDA <notifications@aida.app>';

  async send(input: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (this.brevoApiKey) {
      return this.sendBrevo(input);
    }
    if (this.resendApiKey) {
      return this.sendResend(input);
    }
    throw new Error(
      'Email provider credentials not configured (set BREVO_API_KEY or RESEND_API_KEY)',
    );
  }

  private async sendBrevo(input: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    const sender = parseSender(this.from);

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': this.brevoApiKey!,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender,
        to: [{ email: input.to }],
        subject: input.subject,
        htmlContent: input.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Brevo email send failed: ${res.status} ${body}`);
      throw new Error(`Email provider error: ${res.status}`);
    }
  }

  private async sendResend(input: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Resend email send failed: ${res.status} ${body}`);
      throw new Error(`Email provider error: ${res.status}`);
    }
  }
}
