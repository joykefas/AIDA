import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider } from '../email.provider';

@Injectable()
export class MockEmailProvider extends EmailProvider {
  private readonly logger = new Logger(MockEmailProvider.name);

  async send(input: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    await Promise.resolve();
    this.logger.log(`[mock email] to=${input.to} subject="${input.subject}"`);
  }
}
